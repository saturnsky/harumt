import { isPredicateQuestionContentKaCandidate, looksEmbeddedQuestionKaAdjectivalNounBoundary, looksEmbeddedQuestionKaBoundary, looksEmbeddedQuestionKaExternalSuffixBoundary, looksEmbeddedQuestionKaNominalizedBoundary, looksPredicateChoiceKaClauseBoundary, looksQuestionTakingAfter } from "../quote/embedded-question.js";
import { toiuAttributiveBoundarySplitAt, toiuAttributiveHeadIndex } from "../semantics/marker-roles.js";
import { bareAdverbialKeijoujiHostAt, isAdverbialKeijoujiMarkerHostPos } from "./adverbial-host.js";
import {
  attachedDerivedNominalHeadIndexAt,
  prenominalModifierChainHeadIndex,
  separatedFromPreviousModifierChainElement
} from "./attributive-head.js";
import {
  cachedQuoteStructuralRelationIndex,
  quoteStructuralRelationIndex,
  type QuoteStructuralRelation
} from "../structural-relation/quote.js";
import { matchMonoNoConcessiveConnectiveStart, matchNoNiConcessiveConnectiveStart, isQuotativeToTokensWide } from "../semantics/helpers.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
import { requestOrImperativeExpressionAfter } from "../semantics/request-evidence.js";
import { collectLexicalAdverbialAffiliations, type LexicalAdverbialAffiliation } from "./lexical-adverbial-affiliation.js";
import { isBaSufficiencyConditionalAt } from "../semantics/permission-idiom.js";
import { TokenCursor } from "../token-cursor.js";
import { isCopulaDaDeRenyouToken } from "../matchers.js";
import { useActiveProtoLayout } from "./proto-state.js";
import {
  admittedNominalFrameMarkerEndsAt,
  clauseOpaqueNominalFrameSurfaces,
  kaContinuationNominalFrameSurfaces,
  maxClauseOpaqueNominalFrameSurfaceLength,
  maxKaContinuationNominalFrameSurfaceLength,
  maxNominalFrameSurfaceLength
} from "../head-tail/tail/segments/nominal-frame.js";
import {
  caseParticleMarkerRelationForToken,
  copulaDeHostProvesAdjunctReading,
  isRealizedQuantityPhraseHead,
  copulaDeMarkerRelationForToken,
  adjectivalConcessiveTomoRelationAt,
  copulaElidedNegativeBodyRelationAt,
  dewaScopeBridgeRelationAt,
  kaMarkerRelationForToken,
  copulaNiMarkerRelationForToken,
  nominalLinkMarkerRelationForToken,
  nominalizerReasonConnectiveRelationAt,
  predicateNominalizerRelationForToken,
  quoteHostPrefixArgumentRelationAt,
  quoteHostSearchBridgeArgumentRelationAt,
  registeredClauseConnectiveRelationForToken,
  topicFocusMarkerRelationForToken
} from "../head-tail/boundary/marker.js";
import { quoteMarkerContinuationRelationAt, quoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../head-tail/boundary/quote-marker.js";
import { copulaFocusContinuationRelationAt } from "../head-tail/boundary/window.js";
import { negativeCopulaCorrectionShapeAt, type NegativeCopulaCorrectionEvidence } from "./negative-copula-correction.js";
import type { SeparationKind } from "../../types/token.js";
import type { RenyouVerbReadingFacts } from "./renyou-verb-reading.js";
import { chuushiClosureRight, isChuushiClauseCoordinationPreludeToken, type ChuushiClosureRightInputs, isChuushiNominalRunPredicateAt, isChuushiClosureTopicMarkerToken, isVerbReadingFollowerRunPredicateAt, renyouChuushiClosureEllipticAfter, renyouChuushiClosureGovernedAfter, renyouChuushiClosureLeftAt, teChuushiClosureLeftAt, teUtteranceFinalLeftAt, type ChuushiClosureEvidence } from "./chuushi-closure.js";
import {
  pauseJunctureEvidence,
  renyouJunctureEvidence,
  undecidedRenyouClosureDisposition,
  whitespaceJunctureEvidence,
  isWhitespaceAttributiveReadingLicense,
  type WhitespaceAttributiveReadingLicenseKind,
  type PauseJunctureBoundaryEvidence,
  type PauseJunctureCohesionEvidence,
  type PauseJunctureEvidence,
  type TransparentPauseRunEvidence,
  type RenyouJunctureCohesionEvidence,
  type RenyouJunctureEvidence,
  type WhitespaceAdnominalLicense,
  type WhitespaceJunctureBoundaryEvidence,
  type WhitespaceJunctureCohesionEvidence,
  type WhitespaceJunctureEvidence
} from "./juncture-verdict.js";
import { isSupportedClauseStart } from "../head-tail/tail/predicate-root/integration/readiness.js";
import { directDiscourseChoiceQuestionKaRelationAt, kaNoYouNiSimileRelationAt, kaOwnershipKindAt, terminalQuestionKaRelationAt } from "../head-tail/boundary/ka-ownership.js";
import { tailRootClosesWithAttributiveTerminal, tailRootExplicitAdnominalMarkerIndices } from "../head-tail/tail/predicate-root/inspect.js";
import { isNominalizerFunctionalContinuationToken } from "../head-tail/tail/predicate-root/matchers/nominalizer.js";
import { derivationalSuffixProfileById, derivedNominalPhraseHeadIndexAt } from "../head-tail/tail/predicate-root/derivational-suffix-table.js";
import { renyouNominalHeadAdmissionAt } from "../head-tail/head/adapters/nominal/renyou-nominal-head.js";
import { matchCopula } from "../head-tail/tail/predicate-root/matchers/copula.js";
import { copulaConcessiveConditionEvidenceWithLayout } from "../head-tail/tail/predicate-root/classifiers/copula-concessive.js";
import type { CopulaConcessiveConditionEvidence } from "./copula-concessive.js";
import { hardTerminalPunctuationSurfaceClassForToken, isBoundaryPunctuationCategoryToken, isContentInternalConnectorToken, isHardTerminalPunctuationToken, isTrailingPunctuationToken, isWeakPunctuationToken, subtitleTerminalTrailingPunctuationRunRelationAt } from "../head-tail/boundary/punctuation.js";
import { closesUtteranceForSpeakerDirection, teIisashiSignalsAt, terminalPunctuationRunQuestionIndex, type TeUtteranceActEvidence, type TeUtteranceActLookupSets } from "./speech-act.js";
import {
  connectiveAdmitsEllipticFollowerClause,
  hasEllipticFollowerClauseEvidence,
  isRefusedUtteranceHeadToken,
  type ClauseStartRightStructure
} from "../head-tail/boundary/clause-start.js";
import {
  compositeConnectivePatternRelationAt,
  isHostedConnectiveMarkerAt,
  layoutBoundaryShieldAt,
  relationConnectiveSpansAt,
  relationDiscontinuousClosureSpanAfter
} from "../head-tail/tail/connective-span-scanner.js";
import { isTeConnectiveToken, isTeTailImperativeFormClosureAt, matchTeTailContinuationAt, teDeContinuationRelationAt } from "../head-tail/tail/postverb-tail-classifier.js";
import { findTeEvaluationFollowerIndex } from "../head-tail/tail/postverb-events.js";
import { connectiveSurfaceRequiresFinalPosition, lookupConnectiveBySurface } from "../head-tail/tail/predicate-root/grammar.js";
import { boundNominalReasonCompositeFollowerAdmitted } from "../head-tail/tail/predicate-root/matchers/tame-connective.js";
import { postverbAuxiliaryDeclaresHostAttachForm, postverbAuxiliaryPayloadsForForm } from "../head-tail/tail/predicate-root/postverb-auxiliary-parser.js";
import { isObligationSpanContaining } from "../head-tail/tail/predicate-root/matchers/obligation.js";
import { conjecturalCopulaHonorificSupportSpanStartAt } from "../head-tail/tail/predicate-root/matchers/copula.js";
import { fusedCopulaSupportConnectiveKindOf, fusedCopulaSupportHostSlotAt, isAffirmativeCopulaSupportVerbToken, isClassicalZuIzenkeiToken, isLikenessModalAdnominalTailEnd, isSuruVerbToken, isTariListingParticleToken, volitionalAttemptMarkerAt } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { volitionalLexicalBindingAt, type VolitionalIntentBindingEvidence } from "./volitional-intent-binding.js";
import type { FusedCopulaSupportHostSlot } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { likenessEvaluativeConditionMarkerEndAt } from "../head-tail/tail/predicate-root/matchers/scope-bridge.js";
import { matchNegationEnding } from "../head-tail/tail/predicate-root/matchers/negation-ending.js";
import { methodYouGaNaiIdiomShapeAt } from "../head-tail/tail/predicate-root/matchers/method-you-idiom.js";
import { matchQuotedJudgmentPassiveTail } from "../semantics/modality-specs.js";
import { isStreamVvCompoundPairAt } from "../compounds/compound-verbs.js";
import { tokensShareLemma } from "../../types/token.js";
import type { RuntimeHaruToken, SeparationEvidence } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import {
  collectClauseTerminalPunctuationRunEvidence,
  collectCopulaPauseBridgeEvidence,
  isClauseBoundaryPunctuationToken,
  isClauseDecorativeTerminalPunctuationToken,
  isClauseEvidenceTransparentPunctuation,
  isClauseHardTerminalPunctuationToken,
  isClauseOpeningPunctuationToken,
  isClauseTrailingPunctuationToken,
  isClausePunctuationToken,
  type ClauseTerminalPunctuationRunEvidence,
  type CopulaPauseBridgeEvidence
} from "./punctuation.js";
import {
  nextNonSpaceIndex,
  previousNonSpaceIndex,
  previousTransparentEvidenceIndex,
  isClauseSpaceOrAdverbToken,
  isSourceSeparatedFromPreviousToken,
  isTransparentPauseSeparatedFromPreviousNonSpaceToken,
  AUTHORED_PAUSE_SEPARATIONS,
  DETACHED_SEPARATIONS,
  hasSourceOrdinalGapBeforeToken,
  SEPARATION_OPENS_BOUNDARY,
  isWitnessedChunkBreakBefore,
  separatedAs,
  separationBefore
} from "./trivia.js";
import { copulaHostParticleMarkerSubtype } from "./particle-phrase-copula.js";
import {
  balancedDelimiterSpanEndingAtIn,
  balancedDelimiterSpanOpeningAtIn,
  collectBalancedDelimiterSpans,
  enclosingBalancedSpanIn,
  type BalancedDelimiterSpan
} from "./balanced-delimiter.js";
import {
  closesUtteranceAs,
  runClosesUtteranceAs,
  utteranceClosureAfter,
  utteranceClosureRunAfter,
  type UtteranceClosureEvidence,
  type UtteranceClosureKind,
  type UtteranceClosureRunEvidence,
  type UtteranceClosureRunKind,
  type UtteranceClosureToken
} from "./utterance-closure.js";
import {
  EXPLICIT_CLOSING_FOR_OPENING_QUOTATION,
  EXPLICIT_OPENING_QUOTATION_SURFACES,
  isExplicitQuoteClosingToken
} from "./quote-delimiters.js";
export {
  isExplicitQuoteClosingSurface,
  isExplicitQuoteClosingToken
} from "./quote-delimiters.js";
import { isPureKatakanaSurface, isWavePauseSurface } from "../../utils/char-class.js";
import { quotedJudgmentHeadBeforeMarker } from "./quoted-judgment.js";
import {
  demoDiscourseUtteranceInitialMatchLengthAt,
  isUtteranceBoundaryPunctuationToken,
  tryResolveDemoDiscourseConnective,
  utteranceInitialDetachedEdgeQualifies,
  utteranceInitialPauseEdgeVerdict,
  type UtteranceInitialPauseEdgeVerdict
} from "../demo-discourse.js";
import { isAnimateReferentToken, isPersonToken } from "../head-tail/candidate/semantic-classifiers.js";
import { tokenIsInterrogativeLexeme } from "../quote/embedded-question.js";
import {
  classifyAttributiveHeadKind,
  isInferentialBoundAttributiveHead
} from "../head-tail/tail/predicate-root/structural-attributive-head-table.js";

import {
  NOMINAL_KEIJOU_BITS,
  POS0,
  POS01,
  POS1,
  POS4,
  POS5A,
  POS5B,
  isAdverbCapable,
  isAdverbCapableNominal,
  isNaAdjCapable,
  isNaAdjCapableNoun,
  isAttributiveCapableNominalHostToken,
  isBindingParticleToken,
  isNominalLike,
  isNominalizerParticleToken,
  isNominalScopeParticleToken,
  isCaseParticleToken,
  isLexicalBareNaAdjStem,
  isLexicalPureNaAdjStem,
  isTerminalOrAttributiveFormPredicateToken,
  isLexicalAdverb,
  isMizenInflection,
  isNegativeAuxiliaryPos,
  isProperPersonNameToken,
  isSahenCapableNominal,
  isSubstantiveNounToken,
  isBungoInflectClass,
  isAttributiveInflection,
  isAdnominalGenitiveMarkerToken,
  isCommonNounToken,
  isGeneralRenyouInflectedToken,
  isIAdjectivePredicateToken,
  isParticleToken,
  isNonIndependentVerbToken,
  isPrefixAffixToken,
  isRareruAuxiliaryToken,
  isTerminalOrAttributiveInflection,
  isTerminalParticleToken,
  isVerbPredicateToken,
  isVolitionalInflection,
  isPoliteAuxiliaryPos,
  pos0in,
  PREDICATE_BITS,
  TRIVIA_BITS,
  意志推量形_,
  已然形_,
  仮定形_,
  格助詞,
  感動詞,
  記号,
  形状詞,
  形容詞0,
  終止形_,
  助詞,
  助動詞,
  助動詞_タ,
  助動詞_ダ,
  助動詞_デス,
  助動詞_ヤ,
  助動詞_ナイ,
  助動詞_マス,
  助動詞_ヌ,
  接続詞,
  接続助詞,
  接頭辞,
  接尾辞,
  形容詞的,
  非自立可能,
  代名詞,
  動詞,
  副詞,
  副助詞,
  助詞_副助詞,
  助詞_準体助詞,
  助詞_終助詞,
  補助記号,
  補助記号_括弧開,
  補助記号_括弧閉,
  名詞,
  名詞_固有名詞,
  命令形_,
  連体詞,
  連体形_,
  連用形_,
  連用形_ニ,
  連用形_融合,
  未然形_,
  NOMINAL_BITS,
  INFLECTABLE_BITS,
  INFLECTABLE_AUX_BITS,
  助詞_格助詞, 助詞_係助詞, 助詞_接続助詞, 動詞_非自立可能, 形状詞_助動詞語幹,
  isAuxiliaryStemToken,
  isClauseClosingInflection,
  isClosingCopulaFamilyToken,
  isIndependentWordToken,
  isUtteranceInterjectionToken,
  isConjunctionToken,
  isCounterCapableToken,
  isAttributiveOrHomophonousTerminalInflection,
  isAdnominalOnlyInflection,
} from "../../types/pos.js";
import {
  collectZeroNominalizedParallelMoEvidence,
  pairedVolitionalPredicateShape,
  type PairedVolitionalPredicateShape
} from "./predicate-parallel.js";
import { activeProtoLayout } from "./proto-state.js";
import { collectHostlessInterjectionEvidence, type HostlessInterjectionEvidence } from "./hostless-interjection.js";
import { isAdverbialReachTransparentToken, isAdverbialFocusParticle, isPostposedAdverbialReachTransparentToken } from "./reachability.js";
import {
  tailRootIsNeutralStandaloneCopulaNiAdverbialFragment
} from "../head-tail/tail/predicate-root/inspect.js";
import type { TailRoot } from "../head-tail/tail/predicate-root/grammar.js";
export {
  collectZeroNominalizedParallelMoEvidence,
  zeroNominalizedParallelMoMarkerIndices,
  type ZeroNominalizedParallelMoEvidence
} from "./predicate-parallel.js";
export { activeProtoLayout, useActiveProtoLayout } from "./proto-state.js";
export { isClauseEvidenceTransparentPunctuation, isClausePunctuationToken } from "./punctuation.js";
export type { CopulaPauseBridgeEvidence } from "./punctuation.js";
export { utteranceClosedForAttributiveProjection } from "./utterance-closure.js";
export type { UtteranceClosureRunEvidence, UtteranceClosureRunKind } from "./utterance-closure.js";
export {
  isClauseContentHeadTransparentToken,
  isClauseSpaceOrAdverbToken,
  nextNonSpaceIndex,
  nextTransparentEvidenceIndex,
  previousTransparentEvidenceIndex,
  previousNonSpaceIndex
} from "./trivia.js";

export type BoundaryKind = "punctuation" | "connective" | "attributive";
export type AttributiveStemProjection = "renyou_compound_prenominal";
export type ClauseKind = "main" | "subordinate" | "relative";
export type PredicateSpeechActScope = "matrix" | "quoted_content" | "unresolved";
export type QuoteSpanLabel = "nominal_quote" | "full_quote_island" | "marked_predicate" | "emphasis_or_style" | "malformed_or_nested_unclear" | "unknown";
export type QuoteSpanConfidence = "high" | "medium" | "low";
export type MarkedPredicateKind = "sahen_action_noun" | "verb_or_stem" | "adjective_or_mimetic" | "state_clause" | "nominalized_predicate" | "unknown";
type ToiuNounShape = "none" | "nominal_like" | "subject_predicate" | "case_predicate" | "predicate_no_case" | "case_no_predicate" | "other";
type QuoteTailKind = "none" | "to_safe_reporting" | "to_thought" | "to_other" | "toiu_noun" | "wo" | "ga_ha_mo" | "no" | "toshite" | "other_particle" | "other";
type NominalizingTailKind = "none" | "dake" | "no_ga" | "no_wa" | "koto" | "other";
type InternalPredicatePosClass = "none" | "verb" | "adjective" | "mimetic_or_adverb" | "nounish" | "mixed";
type SpanLengthBucket = "1_3" | "4_8" | "9_plus";

export interface ClauseToken {
  surface: string;
  dictionaryForm: string;
  pos: number;
  readonly whitespaceBefore?: SeparationEvidence;
  readonly transparentPauseAfter?: boolean;
  readonly transparentPauseRunAfter?: TransparentPauseRunEvidence;
  readonly sourceOrdinal?: number;
  readonly sourceSpan?: {
    readonly startOrdinal: number;
    readonly endOrdinal: number;
  } | null;
}

export interface LexicalParticleBoundaryClaim {
  readonly headIdx: number;
  readonly particleIdx: number;
  readonly particle: string;
  readonly kind: string;
  readonly followingRequestOrImperative?: boolean;
}

export interface ClauseBoundaryDetectionOptions {
  readonly lexicalParticleBoundaryClaims?: readonly LexicalParticleBoundaryClaim[];
  readonly lexicalRenyouHeadClaims?: LexicalRenyouHeadClaims;
  readonly lexicalNominalHeadClaims?: LexicalNominalHeadClaims;
  readonly lexicalAdverbialAffiliationOverrides?: ReadonlyMap<number, LexicalAdverbialAffiliation>;
  readonly renyouVerbReadings?: RenyouVerbReadingFacts;
  readonly whitespaceAttributiveReadings?: ReadonlyMap<number, WhitespaceAttributiveReadingInput>;
  readonly tokenSpace?: TokenSpaceSourceContext;
}

export interface WhitespaceAttributiveReadingInput {
  readonly leftIdx: number;
  readonly headIdx: number;
  readonly witness: { readonly kind: WhitespaceAttributiveReadingLicenseKind };
}

export interface TokenSpaceSourceContext {
  readonly embeddedTokenSpace?: boolean;
  readonly removedIslandSourceOrdinals?: readonly number[];
  readonly enclosingDelimiter?: EnclosingDelimiterKind;
}

export type EnclosingDelimiterKind = "parenthetical" | "annotation";

export interface LexicalRenyouHeadClaims {
  readonly nonPredicateHeads: ReadonlySet<number>;
  readonly registeredCompoundV1s: ReadonlySet<number>;
  readonly lexicalNounCompoundEnds: ReadonlyMap<number, number>;
}

export interface LexicalNominalHeadClaims {
  adnominalNoRelationSlotAccepts(headIdx: number, hostIdx: number): boolean;
  adnominalHeadBearerSlotAccepts(hostIdx: number, headIdx: number): boolean;
  predicateSenseDeclaredAt(hostIdx: number): boolean;
}

export interface ClauseNominalClosureAnchor {
  readonly span: {
    readonly start: number;
    readonly endExclusive: number;
  };
  readonly headIdx: number;
  readonly modifierPredicateIndices: readonly number[];
}

export interface ClauseNominalHeadAnchor<T extends ClauseToken = ClauseToken> {
  readonly tokenIdx: number;
  readonly sourceToken: T;
  readonly headToken: T;
}

export type PredicateArgumentRole = "subject_topic" | "theme_topic" | "oblique_topic" | "prefixed_focus" | "object" | "other";

export interface PredicateArgumentRoleAssignment {
  readonly particleIdx: number;
  readonly role: PredicateArgumentRole;
}

export function skipClausePunctuationForward<T extends ClauseToken>(
  tokens: readonly T[],
  start: number,
  endExclusive: number
): number {
  let index = start;
  while (index < endExclusive && isClausePunctuationToken(tokens[index])) {
    index += 1;
  }
  return index;
}

export function nextClauseNonPunctuationIndex<T extends ClauseToken>(
  tokens: readonly T[],
  start: number,
  upperBoundExclusive: number
): number | null {
  let index = start;
  while (index < upperBoundExclusive) {
    const token = tokens[index];
    if (token === undefined) return null;
    if (!isClausePunctuationToken(token)) return index;
    index += 1;
  }
  return null;
}

export function previousClauseNonPunctuationIndex<T extends ClauseToken>(
  tokens: readonly T[],
  start: number,
  lowerBoundInclusive: number
): number | null {
  let index = start;
  while (index >= lowerBoundInclusive) {
    const token = tokens[index];
    if (token === undefined) return null;
    if (!isClausePunctuationToken(token)) return index;
    index -= 1;
  }
  return null;
}

const BOUNDARY_KIND_DECISION_ORDER = [
  "attributive",
  "connective",
  "punctuation"
] as const satisfies readonly BoundaryKind[];

const NOUNISH_POS0_NUM: ReadonlySet<number> = new Set([名詞, 代名詞]);
export function isAttributiveHeadNounishToken(token: ClauseToken | undefined): boolean {
  return token !== undefined &&
    NOUNISH_POS0_NUM.has(token.pos & POS0) &&
    !isAuxiliaryStemToken(token);
}
export interface BareKeijoujiAttributiveEvidence {
  readonly hostClass: "na_adjective" | "predicate_sense_nominal";
  readonly katakanaRun: boolean;
}

function bareKeijoujiDirectAttributiveHostEvidence(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables
): BareKeijoujiAttributiveEvidence | null {
  const token = tokens[index];
  if (
    token === undefined ||
    !isLexicalBareNaAdjStem(token) ||
    isInsideClauseOpaqueNominalFrameSurface(tokens, index)
  ) {
    return null;
  }
  return bareDirectAttributiveHeadEvidence(tokens, index, lookups, "na_adjective", "ordinary_nominal_only");
}

function bareNominalDirectAttributiveHostEvidence(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables,
  claims: LexicalNominalHeadClaims | undefined
): BareKeijoujiAttributiveEvidence | null {
  const token = tokens[index];
  if (
    token === undefined ||
    claims === undefined ||
    !isAttributiveCapableNominalHostToken(token) ||
    isSahenCapableNominal(token) ||
    isAdverbCapableNominal(token) ||
    !claims.predicateSenseDeclaredAt(index) ||
    isInsideClauseOpaqueNominalFrameSurface(tokens, index)
  ) {
    return null;
  }
  return bareDirectAttributiveHeadEvidence(tokens, index, lookups, "predicate_sense_nominal", "any_head_kind");
}

function bareDirectAttributiveHeadEvidence(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables,
  hostClass: BareKeijoujiAttributiveEvidence["hostClass"],
  headKinds: "ordinary_nominal_only" | "any_head_kind"
): BareKeijoujiAttributiveEvidence | null {
  const token = tokens[index]!;
  const head = tokens[index + 1];
  if (
    head === undefined ||
    !isAttributiveHeadNounishToken(head) ||
    !isSubstantiveNounToken(head) ||
    separatedAs(tokens, index + 1, DETACHED_SEPARATIONS) ||
    hasSourceOrdinalGapBeforeToken(tokens, index + 1) ||
    isPostposedVocativeHead(tokens, index + 1, lookups)
  ) {
    return null;
  }
  const headKind = classifyAttributiveHeadKind({
    surface: head.surface,
    dictionaryForm: head.dictionaryForm,
    reading: "",
    dictionaryFormReading: "",
    pos: head.pos,
    dictionaryId: 0,
  });
  if (
    headKinds === "ordinary_nominal_only"
      ? headKind !== "ordinary_nominal"
      : headKind === "reason_or_purpose" || headKind === "likeness" || isInferentialBoundAttributiveHead(head)
  ) {
    return null;
  }
  return {
    hostClass,
    katakanaRun: isPureKatakanaSurface(token.surface) && isPureKatakanaSurface(head.surface)
  };
}

function isPostposedVocativeHead(
  tokens: readonly ClauseToken[],
  idx: number,
  lookups: LookupTables,
  extent: "head" | "noun_phrase" = "head"
): boolean {
  const head = tokens[idx];
  if (head === undefined) {
    return false;
  }
  if (extent === "head") {
    if (!isPersonToken(head, lookups)) {
      return false;
    }
    const cursor = skipTerminalParticleRun(tokens, idx + 1);
    return cursor === null || isClausePunctuationToken(tokens[cursor]);
  }
  if (!pos0in(head.pos, NOMINAL_BITS)) {
    return false;
  }
  const end = vocativeNounPhraseEnd(tokens, idx);
  let headIdx = end;
  while (headIdx > idx && (tokens[headIdx]!.pos & POS0) === 接尾辞 && !isCounterCapableToken(tokens[headIdx]!)) {
    headIdx -= 1;
  }
  const headToken = tokens[headIdx];
  if (headToken === undefined || isCounterCapableToken(headToken) ||
    !(isPersonReferringHeadToken(headToken, lookups) || isPersonReferringHeadToken(tokens[end]!, lookups))) {
    return false;
  }
  const cursor = skipTerminalParticleRun(tokens, end + 1);
  if (cursor === null) {
    return true;
  }
  const edge = tokens[cursor];
  if (!isClausePunctuationToken(edge)) {
    return false;
  }
  return !(edge !== undefined && isWeakPunctuationToken(edge) && nominalCoordinationRunFollows(tokens, cursor + 1, lookups));
}

function nominalCoordinationRunFollows(
  tokens: readonly ClauseToken[],
  start: number,
  lookups: LookupTables
): boolean {
  const lemmas = lookups.NOMINAL_COORDINATION_CONNECTIVE_LEMMAS;
  const isNominalElement = (token: ClauseToken | undefined): boolean =>
    token !== undefined && (pos0in(token.pos, NOMINAL_BITS) || (token.pos & POS0) === 接尾辞 || (token.pos & POS0) === 接頭辞);
  let sawItem = false;
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (isNominalElement(token)) {
      sawItem = true;
      continue;
    }
    if (token !== undefined && sawItem && lemmas.has(token.dictionaryForm) && isNominalElement(tokens[index + 1])) {
      return true;
    }
    return false;
  }
  return false;
}


function vocativeNounPhraseEnd(tokens: readonly ClauseToken[], idx: number): number {
  let end = idx;
  for (;;) {
    const next = tokens[end + 1];
    if (next === undefined || separatedAs(tokens, end + 1, DETACHED_SEPARATIONS)) {
      return end;
    }
    if (isContentInternalConnectorToken(next)) {
      const after = tokens[end + 2];
      if (after !== undefined && (pos0in(after.pos, NOMINAL_BITS) || (after.pos & POS0) === 接尾辞)) {
        end += 2;
        continue;
      }
      return end;
    }
    if (pos0in(next.pos, NOMINAL_BITS) || (next.pos & POS0) === 接尾辞) {
      end += 1;
      continue;
    }
    return end;
  }
}

function chuushiClosureEdgeDetachedKind(
  tokens: readonly ClauseToken[],
  followerIdx: number,
  lookups: LookupTables
): "vocative" | "interjection" | null {
  const follower = tokens[followerIdx];
  if (follower === undefined) {
    return null;
  }
  if (isUtteranceInterjectionToken(follower) && interjectionClosesItsOwnUtterance(tokens, followerIdx)) {
    return "interjection";
  }
  const vocativeIdx = isWeakPunctuationToken(follower) ? nextNonSpaceIndex(tokens, followerIdx + 1) : followerIdx;
  return vocativeIdx !== null && isPostposedVocativeHead(tokens, vocativeIdx, lookups, "noun_phrase") ? "vocative" : null;
}

function chuushiClosureDetachedRightInputs(
  tokens: readonly ClauseToken[],
  followerIdx: number,
  lookups: LookupTables
): Pick<ChuushiClosureRightInputs, "edgeDetachedKind" | "separatedUtteranceHead" | "discourseOnsetHead"> {
  return {
    edgeDetachedKind: chuushiClosureEdgeDetachedKind(tokens, followerIdx, lookups),
    separatedUtteranceHead:
      separatedAs(tokens, followerIdx, CHUUSHI_CLOSURE_UTTERANCE_SEPARATIONS) &&
      chuushiClosureFollowerOpensUtterance(tokens, followerIdx),
    discourseOnsetHead: chuushiClosureFollowerIsDiscourseOnset(tokens, followerIdx, lookups)
  };
}

function interjectionClosesItsOwnUtterance(tokens: readonly ClauseToken[], idx: number): boolean {
  const cursor = skipTerminalParticleRun(tokens, idx + 1);
  if (cursor === null || isClausePunctuationToken(tokens[cursor])) {
    return true;
  }
  return separatedAs(tokens, idx + 1, CHUUSHI_CLOSURE_UTTERANCE_SEPARATIONS);
}

const CHUUSHI_CLOSURE_UTTERANCE_SEPARATIONS: ReadonlySet<SeparationKind> = new Set<SeparationKind>([
  "chunk_break",
  "authored_pause"
]);

function chuushiClosureRightUtteranceShape(
  tokens: readonly ClauseToken[],
  splitAt: number
): { readonly topicIdx?: number; readonly closesAsQuestion: boolean } {
  let markerIdx: number | undefined;
  let topicIdx: number | undefined;
  for (let idx = splitAt; idx < tokens.length; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      break;
    }
    if (isBoundaryPunct(token)) {
      return {
        ...(topicIdx === undefined ? {} : { topicIdx }),
        closesAsQuestion: isClauseHardTerminalPunctuationToken(token) && terminalPunctuationRunQuestionIndex(tokens, idx) !== null
      };
    }
    if (markerIdx === undefined && isChuushiClosureTopicMarkerToken(token)) {
      markerIdx = idx;
    } else if (markerIdx !== undefined && topicIdx === undefined && isIndependentWordToken(token)) {
      topicIdx = markerIdx;
    }
  }
  return { ...(topicIdx === undefined ? {} : { topicIdx }), closesAsQuestion: false };
}

function chuushiClosureFollowerOpensContent(follower: ClauseToken | undefined): boolean {
  return follower !== undefined && isIndependentWordToken(follower) && !isRefusedUtteranceHeadToken(follower);
}

function chuushiClosureFollowerIsDiscourseOnset(tokens: readonly ClauseToken[], followerIdx: number, lookups: LookupTables): boolean {
  const follower = tokens[followerIdx];
  return follower !== undefined &&
    !isChuushiClauseCoordinationPreludeToken(follower as RuntimeHaruToken, lookups) &&
    (isConjunctionToken(follower) || demoDiscourseUtteranceInitialMatchLengthAt(tokens, followerIdx) !== null);
}

function chuushiClosureFollowerOpensUtterance(
  tokens: readonly ClauseToken[],
  followerIdx: number
): boolean {
  return demoDiscourseUtteranceInitialMatchLengthAt(tokens, followerIdx) !== null ||
    chuushiClosureFollowerOpensContent(tokens[followerIdx]);
}

function skipTerminalParticleRun(
  tokens: readonly ClauseToken[],
  startIdx: number,
  limit?: number
): number | null {
  let cursor: number | null = nextNonSpaceIndex(tokens, startIdx, limit);
  while (cursor !== null && isTerminalParticleToken(tokens[cursor]!)) {
    cursor = nextNonSpaceIndex(tokens, cursor + 1, limit);
  }
  return cursor;
}

export function isPostposedVocativeNounPhraseAt(
  tokens: readonly ClauseToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  return isPostposedVocativeHead(tokens, idx, lookups, "noun_phrase");
}

function collectUtteranceClosureRunEvidence(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  lookups: LookupTables
): ReadonlyMap<number, UtteranceClosureRunEvidence> {
  const runs = new Map<number, UtteranceClosureRunEvidence>();
  let index = 0;
  while (index < tokens.length) {
    const run = utteranceClosureRunFrom(tokens, index, lookups);
    if (run === null) {
      index += 1;
      continue;
    }
    if (run.endIdx !== null) {
      const bareNodaOnly = run.sawNodaMarker && !run.sawTerminalCopula && run.terminalParticleCount === 0;
      const kind: UtteranceClosureRunKind =
        !bareNodaOnly
          ? (run.terminalParticleCount > 0 ? "terminal_particle_run" : "terminal_copula_run")
          : clauseCarriesInterrogativeForm(tokens, proto, run.hostIdx, lookups)
            ? "interrogative_noda_run"
            : "formal_noun_dependent";
      runs.set(run.endIdx, {
        kind: "utteranceClosureRun",
        run: kind,
        endIdx: run.endIdx,
        hostIdx: run.hostIdx,
        ...(kind === "terminal_particle_run" && run.terminalParticleStartIdx !== null
          ? { terminalParticleStartIdx: run.terminalParticleStartIdx }
          : {})
      });
    }
    index = Math.max(run.scanNext, index + 1);
  }
  collectPoliteTerminalChainClosureRuns(tokens, proto, lookups, runs);
  return runs;
}

function collectPoliteTerminalChainClosureRuns(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  lookups: LookupTables,
  runs: Map<number, UtteranceClosureRunEvidence>
): void {
  const formulaicHostLemmas = lookups.GRAMMAR_BOUNDARY_POLITE_FORMULAIC_TERMINAL_HOST_LEMMAS;
  let index = 0;
  while (index < tokens.length) {
    if (((tokens[index]?.pos ?? 0) & POS0) !== 助動詞) {
      index += 1;
      continue;
    }
    const chainIndices: number[] = [];
    let cursor: number | null = index;
    while (cursor !== null && ((tokens[cursor]?.pos ?? 0) & POS0) === 助動詞) {
      chainIndices.push(cursor);
      cursor = nextNonSpaceIndex(tokens, cursor + 1);
    }
    const endIdx = cursor ?? tokens.length;
    const hostIdx = previousNonSpaceIndex(tokens, index);
    const chainPos4 = [...chainIndices].reverse().map((idx) => (tokens[idx]?.pos ?? 0) & POS4);
    const lastChainIdx = chainIndices[chainIndices.length - 1]!;
    const closingForm = ((tokens[lastChainIdx]?.pos ?? 0) & POS5A) === 終止形_;
    if (
      closingForm &&
      utteranceBoundarySignalAfter(tokens, proto, lastChainIdx, endIdx) &&
      !runs.has(endIdx) &&
      politeTerminalChainClosesUtterance(chainPos4, tokens[hostIdx ?? -1], formulaicHostLemmas)
    ) {
      runs.set(endIdx, {
        kind: "utteranceClosureRun",
        run: "polite_terminal_chain",
        endIdx,
        hostIdx: hostIdx ?? index
      });
    }
    index = chainIndices[chainIndices.length - 1]! + 1;
  }
}

const POLITE_TERMINAL_CHAIN_CLOSING_KINDS: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "weak_pause"
]);

function utteranceBoundarySignalAfter(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  chainEndIdx: number,
  endIdx: number
): boolean {
  if (endIdx < tokens.length && separatedAs(tokens, endIdx, DETACHED_SEPARATIONS)) {
    return true;
  }
  return runClosesUtteranceAs(
    utteranceClosureRunAfter(proto, tokens, chainEndIdx + 1),
    POLITE_TERMINAL_CHAIN_CLOSING_KINDS
  );
}

export function isPoliteMasuChainTerminalEndAt(tokens: readonly ClauseToken[], lastIdx: number): boolean {
  const last = tokens[lastIdx];
  if (last === undefined || (last.pos & POS0) !== 助動詞 || (last.pos & POS5A) !== 終止形_) {
    return false;
  }
  for (let idx: number | null = lastIdx; idx !== null && ((tokens[idx]?.pos ?? 0) & POS0) === 助動詞; idx = previousNonSpaceIndex(tokens, idx)) {
    if (((tokens[idx]?.pos ?? 0) & POS4) === 助動詞_マス) {
      return true;
    }
  }
  return false;
}

function politeTerminalChainClosesUtterance(
  chainPos4: readonly number[],
  host: ClauseToken | undefined,
  formulaicHostLemmas: ReadonlySet<string>
): boolean {
  if (chainPos4.includes(助動詞_デス)) {
    return true;
  }
  const masuAt = chainPos4.indexOf(助動詞_マス);
  if (masuAt < 0) {
    return false;
  }
  if (chainPos4.slice(0, masuAt).includes(助動詞_ヌ)) {
    return true;
  }
  return host !== undefined && formulaicHostLemmas.has(host.dictionaryForm);
}

function utteranceClosureRunFrom(
  tokens: readonly ClauseToken[],
  startIdx: number,
  lookups: LookupTables
): {
  readonly hostIdx: number;
  readonly endIdx: number | null;
  readonly scanNext: number;
  readonly sawNodaMarker: boolean;
  readonly sawTerminalCopula: boolean;
  readonly terminalParticleCount: number;
  readonly terminalParticleStartIdx: number | null;
} | null {
  const first = tokens[startIdx];
  if (
    first === undefined ||
    (
      !isTerminalNodaMarkerToken(first, startIdx) &&
      !isClosingCopulaBoundaryToken(first) &&
      !isTerminalParticleToken(first)
    )
  ) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, startIdx);
  if (hostIdx === null || !isUtteranceClosingPredicateLeft(tokens[hostIdx])) {
    return null;
  }
  const runIndices: number[] = [];
  let cursor: number | null = startIdx;
  let sawNodaMarker = false;
  if (cursor !== null && isTerminalNodaMarkerToken(tokens[cursor], cursor)) {
    if (isContractedTerminalNodaMarkerToken(tokens[cursor], cursor) && isBungoInflectClass(tokens[hostIdx])) {
      return null;
    }
    sawNodaMarker = true;
    runIndices.push(cursor);
    cursor = nextNonSpaceIndex(tokens, cursor + 1);
  }
  let sawTerminalCopula = false;
  if (cursor !== null && isClosingCopulaBoundaryToken(tokens[cursor])) {
    sawTerminalCopula = true;
    runIndices.push(cursor);
    cursor = nextNonSpaceIndex(tokens, cursor + 1);
  }
  let terminalParticleCount = 0;
  const terminalParticleStartIdx = cursor;
  while (cursor !== null && isTerminalParticleToken(tokens[cursor]!)) {
    terminalParticleCount += 1;
    runIndices.push(cursor);
    cursor = nextNonSpaceIndex(tokens, cursor + 1);
  }
  const lastRunIdx = runIndices[runIndices.length - 1];
  if (lastRunIdx === undefined) {
    return null;
  }
  const scanNext = lastRunIdx + 1;
  if (
    runIndices.some((idx) =>
      kaMarkerRelationForToken(tokens[idx], idx) !== null &&
      !politeTerminalQuestionKaClosesRun(tokens, idx, lookups))
  ) {
    return { hostIdx, endIdx: null, scanNext, sawNodaMarker, sawTerminalCopula, terminalParticleCount, terminalParticleStartIdx: null };
  }
  return {
    hostIdx,
    endIdx: cursor,
    scanNext,
    sawNodaMarker,
    sawTerminalCopula,
    terminalParticleCount,
    terminalParticleStartIdx: terminalParticleCount > 0 ? terminalParticleStartIdx : null
  };
}

function isUtteranceClosingPredicateLeft(token: ClauseToken | undefined): boolean {
  if (isFinitePredicateBoundaryLeft(token)) {
    return true;
  }
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  return (pos0 === 動詞 || pos0 === 形容詞0 || pos0 === 助動詞) && (token.pos & POS5A) === 意志推量形_;
}

function politeTerminalQuestionKaClosesRun(
  tokens: readonly ClauseToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  return terminalQuestionKaRelationAt(tokens, kaIdx, { lookups })?.evidence === "polite_host" &&
    kaOwnershipKindAt(tokens, kaIdx, lookups) === "question";
}

function isTerminalNodaMarkerToken(token: ClauseToken | undefined, index: number): boolean {
  return predicateNominalizerRelationForToken(token, index, {
    requirement: "terminal_noda_marker",
    consumers: ["clause_layout"]
  })?.nominalizerKind === "no";
}

function isContractedTerminalNodaMarkerToken(token: ClauseToken | undefined, index: number): boolean {
  return predicateNominalizerRelationForToken(token, index, {
    requirement: "terminal_noda_marker",
    acceptedSurfaces: ["ん", "ン"],
    consumers: ["clause_layout"]
  })?.nominalizerKind === "no";
}

function isClosingCopulaBoundaryToken(token: ClauseToken | undefined): boolean {
  return token !== undefined && isClosingCopulaFamilyToken(token);
}

function clauseCarriesInterrogativeForm(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  hostIdx: number,
  lookups: LookupTables
): boolean {
  const clause = proto.clauseOfToken(hostIdx);
  const clauseStart = clause?.start ?? 0;
  for (let index = hostIdx; index >= clauseStart; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    const form = token.dictionaryForm || token.surface || "";
    if (
      lookups.INTERROGATIVE_ADVERBIAL_FORMS.has(form) ||
      lookups.INTERROGATIVE_PRONOMINAL_FORMS.has(form) ||
      lookups.INTERROGATIVE_PRENOMINAL_FORMS.has(form) ||
      lookups.INTERROGATIVE_NOMINAL_FORMS.has(form)
    ) {
      return true;
    }
  }
  return false;
}

type DetachedRemainderGovernance =
  | "functional_continuation"
  | "governor_present"
  | "no_governor";

function detachedRemainderGovernance(
  tokens: readonly ClauseToken[],
  splitAt: number,
  lookups: LookupTables
): DetachedRemainderGovernance {
  let limit = tokens.length;
  for (let index = splitAt; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined || isClausePunctuationToken(token)) {
      limit = index;
      break;
    }
  }
  const first = tokens[splitAt];
  if (first !== undefined && isNominalizerFunctionalContinuationToken(first)) {
    return "functional_continuation";
  }
  for (let index = splitAt; index < limit; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (
      pos0in(token.pos, INFLECTABLE_AUX_BITS) ||
      nominalZeroCopulaPredicateAt(tokens, index, limit) ||
      nominalCopulaPredicateAt(tokens, index, limit)
    ) {
      return "governor_present";
    }
  }
  const edgeIdx = detachedRemainderEdgePredicateIndex(tokens, splitAt, limit);
  if (edgeIdx !== null && !isPostposedVocativeHead(tokens, edgeIdx, lookups)) {
    return "governor_present";
  }
  return "no_governor";
}

function detachedRemainderEdgePredicateIndex(
  tokens: readonly ClauseToken[],
  splitAt: number,
  limit: number
): number | null {
  let cursor: number | null = previousNonSpaceIndex(tokens, limit, splitAt);
  while (cursor !== null) {
    const token = tokens[cursor]!;
    if (isNominalLike(token) || isLexicalBareNaAdjStem(token)) {
      return boundParticleRunClosesUtteranceAfter(tokens, cursor, limit) ? cursor : null;
    }
    if (!isTerminalParticleToken(token) && !isNominalScopeParticleToken(token)) {
      return null;
    }
    cursor = previousNonSpaceIndex(tokens, cursor, splitAt);
  }
  return null;
}

function boundParticleRunClosesUtteranceAfter(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  let cursor = skipTerminalParticleRun(tokens, idx + 1, limit);
  while (
    cursor !== null &&
    isNominalScopeParticleToken(tokens[cursor]!) &&
    !isCaseParticleToken(tokens[cursor]!)
  ) {
    cursor = skipTerminalParticleRun(tokens, cursor + 1, limit);
  }
  return cursor === null || isClausePunctuationToken(tokens[cursor]);
}

function detachedRemainderCannotGovernNominalPhrase(
  tokens: readonly ClauseToken[],
  splitAt: number,
  lookups: LookupTables
): boolean {
  const governance = detachedRemainderGovernance(tokens, splitAt, lookups);
  if (governance === "functional_continuation") {
    return false;
  }
  return isPostposedVocativeHead(tokens, splitAt, lookups) || governance === "no_governor";
}

function detachedTerminalNodaClauseClosureSplits(
  tokens: readonly ClauseToken[],
  lookups: LookupTables
): ReadonlySet<number> {
  const splits = new Set<number>();
  for (let index = 1; index < tokens.length; index += 1) {
    const splitAt = detachedTerminalNodaClauseClosureSplitAt(tokens, index, lookups);
    if (splitAt !== null) {
      splits.add(splitAt);
    }
  }
  return splits;
}

export function detachedTerminalNodaClauseClosureSplitAt(
  tokens: readonly ClauseToken[],
  markerIdx: number,
  lookups: LookupTables
): number | null {
  const marker = tokens[markerIdx];
  if (
    predicateNominalizerRelationForToken(marker, markerIdx, {
      requirement: "terminal_noda_marker",
      consumers: ["clause_layout"]
    })?.nominalizerKind !== "no"
  ) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (hostIdx === null || !isFinitePredicateBoundaryLeft(tokens[hostIdx])) {
    return null;
  }
  const runIndices: number[] = [markerIdx];
  for (;;) {
    const nextIdx = nextNonSpaceIndex(tokens, runIndices[runIndices.length - 1]! + 1);
    if (nextIdx === null || !isTerminalParticleToken(tokens[nextIdx]!)) {
      break;
    }
    runIndices.push(nextIdx);
  }
  const bareNodaRun =
    runIndices.length === 1 &&
    !isTerminalParticleToken(marker!) &&
    !isCopulaConditionalBoundaryLeft(tokens[hostIdx]);
  if (runIndices.some((index) => kaMarkerRelationForToken(tokens[index], index) !== null)) {
    return null;
  }
  const splitAt = nextNonSpaceIndex(tokens, runIndices[runIndices.length - 1]! + 1);
  if (splitAt === null || !separatedAs(tokens, splitAt, DETACHED_SEPARATIONS)) {
    return null;
  }
  if (isClausePunctuationToken(tokens[splitAt])) {
    return null;
  }
  if (bareNodaRun && !detachedRemainderCannotGovernNominalPhrase(tokens, splitAt, lookups)) {
    return null;
  }
  return splitAt;
}

function isBareKeijoujiDirectAttributiveHost(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables
): boolean {
  return bareKeijoujiDirectAttributiveHostEvidence(tokens, index, lookups) !== null;
}

function bareKeijoujiAttributiveHeadIndices(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  lexicalNominalHeadClaims: LexicalNominalHeadClaims | undefined
): ReadonlyMap<number, BareKeijoujiAttributiveEvidence> {
  const heads = new Map<number, BareKeijoujiAttributiveEvidence>();
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    const evidence = bareKeijoujiDirectAttributiveHostEvidence(tokens, index, lookups) ??
      bareNominalDirectAttributiveHostEvidence(tokens, index, lookups, lexicalNominalHeadClaims);
    if (evidence !== null) {
      heads.set(index + 1, evidence);
    }
  }
  return heads;
}
const CLAUSE_PUNCT_POS0_NUM: ReadonlySet<number> = new Set([補助記号, 記号]);
const SUBJECT_TOPIC_SURFACE = new Set(["が", "は", "も"]);
const SAFE_REPORTING_LEMMA = new Set([
  "言う", "いう",
  "述べる", "告げる", "話す", "語る", "喋る", "叫ぶ", "囁く", "伝える",
  "書く", "記す", "答える", "応える", "主張する", "報告する", "宣言する"
]);
const THOUGHT_REPORTING_LEMMA = new Set(["思う", "考える", "信じる", "感じる", "予想する", "予測する", "推測する", "想像する", "期待する", "望む", "願う", "祈る"]);
const NAMING_PRONE_LEMMA = new Set(["呼ぶ", "名付ける", "称する", "定義する", "見なす", "扱う", "位置付ける"]);
const CLEAR_DESCRIPTIVE_LEMMA = new Set(["表す", "表現する", "形容する", "見える", "聞こえる", "響く"]);
const SPEECH_CONTENT_HEAD = new Set([
  "話", "言葉", "発言", "意見", "噂", "主張", "報告", "証言", "説明",
  "記録", "記事", "発表", "声明", "申告", "答え", "返事", "質問", "命令",
  "指示", "内容", "情報", "知らせ", "文言", "理由", "定説", "主旨", "訴え",
  "考え", "認識", "判断", "結論"
]);
export class ClauseBoundaryEvent {
  constructor(
    readonly splitAt: number,
    readonly kind: BoundaryKind,
    readonly pairedConcessive?: PairedVolitionalConcessiveEvidence,
    readonly attributiveModifierChainHeadIdx?: number,
    readonly attributiveStemProjection?: "renyou_compound_prenominal",
    readonly chuushiClosure?: ChuushiClosureEvidence
  ) { }
}

export interface PairedVolitionalConcessiveEvidence {
  readonly kind: "paired_volitional_concessive";
  readonly lemma: string;
  readonly positivePredicateIdx: number;
  readonly positiveInflectionIdx: number;
  readonly firstMarkerIdx: number;
  readonly negativePredicateIdx: number;
  readonly negativeInflectionIdx: number;
  readonly negativeAuxIdx: number;
  readonly secondMarkerIdx: number;
}

export type DemoDiscourseLeftBoundaryEvidenceKind =
  | "terminal_question_ka"
  | "question_ka_choice"
  | "speaker_label"
  | "detached_vocative"
  | "pause_traversed_onset";

export interface DemoDiscourseLeftBoundaryEvidence {
  readonly kind: "demo_discourse_left_boundary";
  readonly boundaryKind: DemoDiscourseLeftBoundaryEvidenceKind;
  readonly markerIdx: number;
  readonly connectiveIdx: number;
}

export interface HardTerminalEllipsisRunEvidence {
  readonly kind: "hard_terminal_ellipsis_run";
  readonly span: { readonly start: number; readonly endExclusive: number };
  readonly runOrdinal: number;
}

export interface AnaphoricConjectureSelfQuestionEvidence {
  readonly kind: "anaphoric_conjecture_self_question";
  readonly markerIdx: number;
  readonly punctuationIdx: number;
}

export interface ProjectionEvidenceClause {
  readonly start: number;
  readonly end: number;
  readonly kind: ClauseKind;
  readonly parentIdx: number | null;
}

export interface ProjectionEvidenceLayout {
  clauseIndexOfToken(tokenIdx: number): number;
  clauseOfToken(tokenIdx: number): ProjectionEvidenceClause | undefined;
}

export class QuoteSpanSignals {
  constructor(
    readonly options: {
      hasNamingFrame?: boolean;
      toiuNounShape?: ToiuNounShape;
      hasInternalCaseFrame?: boolean;
      hasInternalSubjectFrame?: boolean;
      hasExplicitQuotativeMarker?: boolean;
      nearbyReportingPredicate?: boolean;
      internalHeadIsSahenCapableNoun?: boolean;
      tailKind?: QuoteTailKind;
      spanLengthBucket?: SpanLengthBucket;
      markedPredicateKind?: MarkedPredicateKind;
    } = {}
  ) { }

  get hasNamingFrame(): boolean { return this.options.hasNamingFrame ?? false; }
  get toiuNounShape(): ToiuNounShape { return this.options.toiuNounShape ?? "none"; }
  get hasInternalCaseFrame(): boolean { return this.options.hasInternalCaseFrame ?? false; }
  get hasInternalSubjectFrame(): boolean { return this.options.hasInternalSubjectFrame ?? false; }
  get hasExplicitQuotativeMarker(): boolean { return this.options.hasExplicitQuotativeMarker ?? false; }
  get nearbyReportingPredicate(): boolean { return this.options.nearbyReportingPredicate ?? false; }
  get internalHeadIsSahenCapableNoun(): boolean { return this.options.internalHeadIsSahenCapableNoun ?? false; }
  get tailKind(): QuoteTailKind { return this.options.tailKind ?? "none"; }
  get spanLengthBucket(): SpanLengthBucket { return this.options.spanLengthBucket ?? "1_3"; }
  get markedPredicateKind(): MarkedPredicateKind { return this.options.markedPredicateKind ?? "unknown"; }
}

export class QuoteSpanInfo {
  constructor(
    readonly span: readonly [number, number],
    readonly label: QuoteSpanLabel,
    readonly confidence: QuoteSpanConfidence,
    readonly signals: QuoteSpanSignals = new QuoteSpanSignals()
  ) { }
}

export class Clause {
  constructor(
    readonly start: number,
    readonly end: number,
    readonly predicates: readonly number[],
    readonly particleIndices: readonly number[],
    readonly particlesByPredicate: readonly (readonly [number, readonly number[]])[],
    readonly parentIdx: number | null,
    readonly kind: ClauseKind,
    readonly terminatedBy: BoundaryKind | null,
    readonly nominalClosureAnchor: ClauseNominalClosureAnchor | null = null,
    readonly leadingNominalAnchor: ClauseNominalClosureAnchor | null = null,
    readonly leadingConnectiveIdx: number | null = null,
    readonly leadingQuoteMarkerIdx: number | null = null,
    readonly argumentRolesByPredicate: readonly (readonly [number, readonly PredicateArgumentRoleAssignment[]])[] = [],
    readonly attributiveHeadBlockedPredicates: readonly number[] = [],
    readonly punctuationBreaks: readonly number[] = [],
    readonly attributiveStemProjection: AttributiveStemProjection | null = null,
  ) { }

  get primaryPredicate(): number | null {
    return this.predicates[0] ?? null;
  }

  particlesOf(predicateIdx: number): readonly number[] {
    return this.particlesByPredicate.find(([idx]) => idx === predicateIdx)?.[1] ?? [];
  }

  argumentRolesOf(predicateIdx: number): readonly PredicateArgumentRoleAssignment[] {
    return this.argumentRolesByPredicate.find(([idx]) => idx === predicateIdx)?.[1] ?? [];
  }

  canBindAttributiveHead(predicateIdx: number): boolean {
    return !this.attributiveHeadBlockedPredicates.includes(predicateIdx);
  }
}

function nominalizedClauseSubjectMarkerAt(
  tokens: readonly ClauseToken[],
  idx: number,
  floor: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isBindingParticleToken(token)) {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, idx, floor);
  if (hostIdx === null) {
    return false;
  }
  const host = tokens[hostIdx]!;
  if (isNominalizerParticleToken(host)) {
    return true;
  }
  if (!isNominalLike(host)) {
    return false;
  }
  const leftIdx = previousNonSpaceIndex(tokens, hostIdx, floor);
  return leftIdx !== null && isFinitePredicateBoundaryLeft(tokens[leftIdx]);
}

function segmentFinalNominalPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || (!isNominalLike(token) && !isLexicalBareNaAdjStem(token))) {
    return false;
  }
  const cursor = skipTerminalParticleRun(tokens, idx + 1, limit);
  return cursor === null || isClausePunctuationToken(tokens[cursor]);
}

function findPrecedingPredicateEvidenceIndex(
  layout: ProjectionEvidenceLayout & { clauseOfToken(tokenIdx: number): { start: number } | undefined },
  tokens: readonly ClauseToken[],
  tokenIdx: number,
  options: { readonly limit?: number; readonly includeAuxiliary?: boolean },
  isEvidence: (token: ClauseToken, index: number) => boolean
): number | null {
  const clause = layout.clauseOfToken(tokenIdx);
  if (clause === undefined) {
    return null;
  }
  const evidenceWindow = clauseProjectionEvidenceWindowForToken(layout, tokens, tokenIdx);
  const start = Math.max(evidenceWindow?.start ?? clause.start, options.limit ?? 0);
  for (let index = tokenIdx - 1; index >= start; index -= 1) {
    const token = tokens[index];
    if (token === undefined || isAbsorbablePunct(token)) {
      continue;
    }
    if (isBoundaryPunct(token)) {
      return null;
    }
    if (isEvidence(token, index)) {
      return index;
    }
    if (segmentFinalNominalPredicateAt(tokens, index, tokenIdx)) {
      return index;
    }
    if (nominalizedClauseSubjectMarkerAt(tokens, index, start)) {
      return null;
    }
    if (!isPostposedAdverbialReachTransparentToken(token)) {
      return null;
    }
  }
  return null;
}

function findFollowingPredicateEvidenceIndex(
  layout: ProjectionEvidenceLayout & { clauseOfToken(tokenIdx: number): { end: number } | undefined },
  tokens: readonly ClauseToken[],
  tokenIdx: number,
  options: { readonly limit?: number; readonly includeAuxiliary?: boolean },
  isEvidence: (token: ClauseToken, index: number) => boolean
): number | null {
  const clause = layout.clauseOfToken(tokenIdx);
  if (clause === undefined) {
    return null;
  }
  const evidenceWindow = clauseProjectionEvidenceWindowForToken(layout, tokens, tokenIdx);
  const end = Math.min(evidenceWindow?.end ?? clause.end, options.limit ?? tokens.length);
  const c = new TokenCursor(tokens, tokenIdx + 1, end);
  while (c.pos < c.end) {
    const token = c.current();
    if (token === undefined || isAbsorbablePunct(token)) {
      c.advance();
      continue;
    }
    if (isBoundaryPunct(token)) {
      return null;
    }
    if (isEvidence(token, c.pos)) {
      return c.pos;
    }
    c.advance();
  }
  return null;
}

function extraClausalRun(tokens: readonly ClauseToken[], start: number, endExclusive: number): boolean {
  for (let index = start; index < endExclusive; index += 1) {
    const pos0 = (tokens[index]?.pos ?? 0) & POS0;
    if (pos0 !== 補助記号 && pos0 !== 記号 && pos0 !== 感動詞) {
      return false;
    }
  }
  return true;
}

export function utteranceRangeOfTokenIn(
  tokenCount: number,
  terminalPunctuationRuns: readonly ClauseTerminalPunctuationRunEvidence[],
  tokenIdx: number
): { readonly start: number; readonly endExclusive: number } {
  let start = 0;
  let endExclusive = tokenCount;
  for (const run of terminalPunctuationRuns) {
    if (run.span.endExclusive <= tokenIdx) {
      start = Math.max(start, run.span.endExclusive);
      continue;
    }
    if (run.span.start > tokenIdx) {
      endExclusive = Math.min(endExclusive, run.span.start);
    }
  }
  return { start, endExclusive };
}

export class ClauseLayout {
  readonly clauseOfPredicateIndex = new Map<number, number>();
  readonly predicateOfParticle = new Map<number, number>();
  private readonly selectedFrameThemeTopicParticlesByPredicate = new Map<number, Set<number>>();
  private readonly quoteHostPrefixParticleOwner = new Map<number, number>();
  private readonly benefactiveRecipientTopicParticleOwner = new Map<number, number>();
  private readonly quoteHostPrefixByPredicate = new Map<number, readonly number[]>();
  private readonly adverbialAdjunctOwner = new Map<number, number>();
  private readonly adverbialAdjunctsByPredicateMap = new Map<number, readonly number[]>();

  constructor(
    readonly clauses: readonly Clause[],
    readonly clauseOfTokenIndex: readonly number[],
    readonly quoteSpans: readonly (readonly [number, number])[] = [],
    readonly quoteSpanInfos: readonly QuoteSpanInfo[] = [],
    readonly quoteHostPrefixParticles: readonly (readonly [number, readonly number[]])[] = [],
    readonly benefactiveRecipientTopicParticles: readonly (readonly [number, readonly number[]])[] = [],
    readonly connectiveRoles = new Map<number, string>(),
    readonly compoundPredicatePairs: ReadonlyMap<number, number> = new Map(),
    readonly adverbialAdjunctsByPredicate: readonly (readonly [number, readonly number[]])[] = [],
    readonly terminalPunctuationRuns: readonly ClauseTerminalPunctuationRunEvidence[] = [],
    private readonly speechActScopesByPredicate: readonly (readonly [number, PredicateSpeechActScope])[] = [],
    readonly copulaPauseBridges: readonly CopulaPauseBridgeEvidence[] = [],
    readonly balancedDelimiterSpans: readonly BalancedDelimiterSpan[] = [],
    private readonly quoteHostByQuotedPredicate: readonly (readonly [number, number])[] = [],
    readonly utteranceClosureRuns: ReadonlyMap<number, UtteranceClosureRunEvidence> =
      new Map<number, UtteranceClosureRunEvidence>(),
    readonly negativeCopulaCorrections: ReadonlyMap<number, NegativeCopulaCorrectionEvidence> =
      new Map<number, NegativeCopulaCorrectionEvidence>(),
    readonly unmarkedMainClauseBoundaries: ReadonlySet<number> = new Set<number>(),
    readonly decorativeTerminalClosures: ReadonlySet<number> = new Set<number>(),
    private readonly quoteHostByMarker: readonly (readonly [number, number])[] = [],
    private readonly quoteAttributiveCarrierHeads: ReadonlyMap<number, number> = new Map<number, number>(),
    readonly chuushiClosures: ReadonlyMap<number, ChuushiClosureEvidence> = new Map<number, ChuushiClosureEvidence>(),
    readonly teUtteranceActs: ReadonlyMap<number, TeUtteranceActEvidence> = new Map<number, TeUtteranceActEvidence>(),
    readonly renyouJunctures: ReadonlyMap<number, RenyouJunctureEvidence> = new Map<number, RenyouJunctureEvidence>(),
    readonly whitespaceJunctures: ReadonlyMap<number, WhitespaceJunctureEvidence> = new Map<number, WhitespaceJunctureEvidence>(),
    readonly pauseJunctures: ReadonlyMap<number, PauseJunctureEvidence> = new Map<number, PauseJunctureEvidence>(),
    readonly lexicalAdverbialAffiliations: ReadonlyMap<number, LexicalAdverbialAffiliation> = new Map<number, LexicalAdverbialAffiliation>(),
    private readonly quoteRelations: readonly QuoteStructuralRelation[] = []
  ) {
    for (const [clauseIndex, clause] of clauses.entries()) {
      for (const predicate of clause.predicates) {
        this.clauseOfPredicateIndex.set(predicate, clauseIndex);
      }
      for (const [predicate, particles] of clause.particlesByPredicate) {
        for (const particle of particles) {
          this.predicateOfParticle.set(particle, predicate);
        }
      }
    }
    for (const [predicate, particles] of quoteHostPrefixParticles) {
      this.quoteHostPrefixByPredicate.set(predicate, particles);
      for (const particle of particles) {
        this.quoteHostPrefixParticleOwner.set(particle, predicate);
      }
    }
    for (const [predicate, particles] of benefactiveRecipientTopicParticles) {
      for (const particle of particles) {
        this.benefactiveRecipientTopicParticleOwner.set(particle, predicate);
      }
    }
    for (const [predicate, adjuncts] of adverbialAdjunctsByPredicate) {
      this.adverbialAdjunctsByPredicateMap.set(predicate, adjuncts);
      for (const adjunct of adjuncts) {
        this.adverbialAdjunctOwner.set(adjunct, predicate);
      }
    }
  }

  clauseIndexOfToken(tokenIdx: number): number {
    return this.clauseOfTokenIndex[tokenIdx] ?? -1;
  }

  utteranceRangeOfToken(tokenIdx: number): { readonly start: number; readonly endExclusive: number } {
    return utteranceRangeOfTokenIn(this.clauseOfTokenIndex.length, this.terminalPunctuationRuns, tokenIdx);
  }

  clauseOfToken(tokenIdx: number): Clause | undefined {
    const index = this.clauseIndexOfToken(tokenIdx);
    return index < 0 ? undefined : this.clauses[index];
  }

  tailReachInClause(tokenIdx: number): number {
    return this.tailReachEvidenceInClause(tokenIdx).endExclusive;
  }

  tailReachEvidenceInClause(tokenIdx: number): TailReachEvidence {
    const clause = this.clauseOfToken(tokenIdx);
    if (clause === undefined) {
      return { endExclusive: tokenIdx, clampedBy: "clause_end" };
    }
    const brk = clause.punctuationBreaks.find((index) => index >= tokenIdx) ?? null;
    const reach = Math.min(brk ?? clause.end, clause.end);
    const span = this.enclosingBalancedSpan(tokenIdx);
    if (span !== undefined && span.contentEndExclusive <= reach) {
      return { endExclusive: span.contentEndExclusive, clampedBy: "balanced_span" };
    }
    if (brk !== null && brk < clause.end) {
      return {
        endExclusive: reach,
        clampedBy: this.terminalPunctuationRunContaining(brk) === undefined
          ? "clause_pause"
          : "utterance_close"
      };
    }
    return { endExclusive: reach, clampedBy: "clause_end" };
  }

  terminalPunctuationRunAfter(contentEndIdx: number): ClauseTerminalPunctuationRunEvidence | undefined {
    return this.terminalPunctuationRuns.find((evidence) => evidence.contentEndIdx === contentEndIdx);
  }

  utteranceClosureRunAt(endIdx: number): UtteranceClosureRunEvidence | undefined {
    return this.utteranceClosureRuns.get(endIdx);
  }

  copulaPauseBridgeAt(copulaStart: number): CopulaPauseBridgeEvidence | undefined {
    return this.copulaPauseBridges.find((evidence) => evidence.copulaStart === copulaStart);
  }

  negativeCopulaCorrectionAt(splitAt: number): NegativeCopulaCorrectionEvidence | undefined {
    return this.negativeCopulaCorrections.get(splitAt);
  }

  chuushiClosureAt(splitAt: number): ChuushiClosureEvidence | undefined {
    return this.chuushiClosures.get(splitAt);
  }

  renyouJunctureAt(splitAt: number): RenyouJunctureEvidence | undefined {
    return this.renyouJunctures.get(splitAt);
  }

  whitespaceJunctureAt(gapIdx: number): WhitespaceJunctureEvidence | undefined {
    return this.whitespaceJunctures.get(gapIdx);
  }

  pauseJunctureAt(gapIdx: number): PauseJunctureEvidence | undefined {
    return this.pauseJunctures.get(gapIdx);
  }

  lexicalAdverbialAffiliationAt(particleIdx: number): LexicalAdverbialAffiliation | undefined {
    return this.lexicalAdverbialAffiliations.get(particleIdx);
  }

  teUtteranceActAt(connectiveIdx: number): TeUtteranceActEvidence | undefined {
    return this.teUtteranceActs.get(connectiveIdx);
  }

  closesAsDetachedUtterance(clause: { readonly end: number; readonly terminatedBy: BoundaryKind | null }): boolean {
    return clause.terminatedBy === "connective" && this.chuushiClosures.get(clause.end)?.right === "detached";
  }

  enclosingBalancedSpan(tokenIdx: number): BalancedDelimiterSpan | undefined {
    return enclosingBalancedSpanIn(this.balancedDelimiterSpans, tokenIdx);
  }

  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined {
    return balancedDelimiterSpanEndingAtIn(this.balancedDelimiterSpans, closingIdx);
  }

  balancedDelimiterSpanOpeningAt(openingIdx: number): BalancedDelimiterSpan | undefined {
    return balancedDelimiterSpanOpeningAtIn(this.balancedDelimiterSpans, openingIdx);
  }

  terminalPunctuationRunContaining(tokenIdx: number): ClauseTerminalPunctuationRunEvidence | undefined {
    return this.terminalPunctuationRuns.find((evidence) => evidence.tokenIndices.includes(tokenIdx));
  }

  unmarkedMainClauseBoundaryAt(splitAt: number): boolean {
    return this.unmarkedMainClauseBoundaries.has(splitAt);
  }

  decorativeTerminalClosureAt(tokenIdx: number): boolean {
    return this.decorativeTerminalClosures.has(tokenIdx);
  }

  utteranceClosureAfter<T extends UtteranceClosureToken>(
    tokens: readonly T[],
    afterIdx: number
  ): UtteranceClosureEvidence {
    return utteranceClosureAfter(this, tokens, afterIdx);
  }

  clauseOfPredicate(predicateIdx: number): Clause | undefined {
    const index = this.clauseOfPredicateIndex.get(predicateIdx);
    return index === undefined ? undefined : this.clauses[index];
  }

  speechActScopeOfPredicate(predicateIdx: number): PredicateSpeechActScope {
    return this.speechActScopesByPredicate.find(([predicate]) => predicate === predicateIdx)?.[1] ?? "unresolved";
  }

  quoteHostOfQuotedPredicate(predicateIdx: number): number | undefined {
    return this.quoteHostByQuotedPredicate.find(([quoted]) => quoted === predicateIdx)?.[1];
  }

  quoteHostOfMarker(markerTokenIdx: number): number | undefined {
    return this.quoteHostByMarker.find(([marker]) => marker === markerTokenIdx)?.[1];
  }

  quoteRelationsOfHost(hostIdx: number): readonly QuoteStructuralRelation[] {
    return this.quoteRelations.filter((relation) => relation.quote.hostMatch.hostIdx === hostIdx);
  }

  quoteAttributiveCarrierHeadOfMarker(markerTokenIdx: number): number | undefined {
    return this.quoteAttributiveCarrierHeads.get(markerTokenIdx);
  }

  compoundHeadOfPredicate(predicateIdx: number): number | undefined {
    return this.compoundPredicatePairs.get(predicateIdx);
  }

  compoundTailOfPredicate(predicateIdx: number): number | undefined {
    for (const [tail, head] of this.compoundPredicatePairs) {
      if (head === predicateIdx) {
        return tail;
      }
    }
    return undefined;
  }

  compoundLeadingEdge(predicateIdx: number): number {
    return this.compoundPredicatePairs.get(predicateIdx) ?? predicateIdx;
  }

  clauseIndexOfPredicate(predicateIdx: number): number | undefined {
    return this.clauseOfPredicateIndex.get(predicateIdx);
  }

  argumentRolesOf(predicateIdx: number): readonly PredicateArgumentRoleAssignment[] {
    const assignments = this.clauseOfPredicate(predicateIdx)?.argumentRolesOf(predicateIdx) ?? [];
    const themeTopics = this.selectedFrameThemeTopicParticlesByPredicate.get(predicateIdx);
    if (themeTopics === undefined || themeTopics.size === 0) {
      return assignments;
    }
    return assignments.map((assignment) =>
      themeTopics.has(assignment.particleIdx)
        ? { particleIdx: assignment.particleIdx, role: "theme_topic" }
        : assignment
    );
  }

  materializeSelectedFrameThemeTopic(predicateIdx: number, particleIdx: number): boolean {
    const assignment = this.clauseOfPredicate(predicateIdx)
      ?.argumentRolesOf(predicateIdx)
      .find((candidate) => candidate.particleIdx === particleIdx);
    if (
      assignment === undefined ||
      assignment.role === "oblique_topic" ||
      assignment.role === "prefixed_focus" ||
      assignment.role === "object"
    ) {
      return false;
    }
    let particles = this.selectedFrameThemeTopicParticlesByPredicate.get(predicateIdx);
    if (particles === undefined) {
      particles = new Set();
      this.selectedFrameThemeTopicParticlesByPredicate.set(predicateIdx, particles);
    }
    particles.add(particleIdx);
    return true;
  }

  canBindAttributiveHead(predicateIdx: number): boolean {
    return this.clauseOfPredicate(predicateIdx)?.canBindAttributiveHead(predicateIdx) ?? false;
  }

  sameClause(a: number, b: number): boolean {
    const left = this.clauseIndexOfToken(a);
    return left >= 0 && left === this.clauseIndexOfToken(b);
  }

  nextPredicateInClauseAfter(tokenIdx: number): number | undefined {
    return this.clauseOfToken(tokenIdx)?.predicates.find((predicate) => predicate > tokenIdx);
  }

  previousPredicateInClause(tokenIdx: number): number | undefined {
    return this.clauseOfToken(tokenIdx)?.predicates.findLast((predicate) =>
      predicate < tokenIdx && this.sameQuoteScope(predicate, tokenIdx));
  }

  predicateOccurrenceBefore(
    tokens: readonly ClauseToken[], contentMap: ReadonlyMap<number, PredicateLike>, tokenIdx: number,
  ): { readonly predicateIdx: number; readonly closureIdx: number } | undefined {
    const predicateIdx = this.previousPredicateInClause(tokenIdx) ?? [...contentMap].findLast(
      ([idx, span]) => idx < tokenIdx && this.sameClause(idx, tokenIdx) && this.sameQuoteScope(idx, tokenIdx) &&
        span.renderPlan?.kind === "headTailChain" && span.renderPlan.realization?.kind === "predicate")?.[0];
    const closureIdx = previousNonSpaceIndex(tokens, tokenIdx, this.clauseOfToken(tokenIdx)?.start ?? tokenIdx);
    return closureIdx !== null && predicateIdx !== undefined && this.sameQuoteScope(closureIdx, tokenIdx) &&
      (pos0in(tokens[closureIdx]?.pos ?? 0, INFLECTABLE_BITS) || ((tokens[closureIdx]?.pos ?? 0) & POS0) === 助動詞)
      ? { predicateIdx, closureIdx } : undefined;
  }

  primaryPredicateOfChildClause(boundaryIdx: number): number | undefined {
    return this.childClauseEndingAt(boundaryIdx)?.predicates
      .find((predicate) => this.sameQuoteScope(predicate, boundaryIdx));
  }

  predicateBeforeNominalClosure(headIdx: number): number | undefined {
    return this.childClauseEndingAt(headIdx)?.predicates
      .findLast((predicate) => this.sameQuoteScope(predicate, headIdx));
  }

  private childClauseEndingAt(boundaryIdx: number): Clause | undefined {
    const parentIdx = this.clauseIndexOfToken(boundaryIdx);
    return this.clauses.find((clause) => clause.parentIdx === parentIdx && clause.end === boundaryIdx);
  }

  ownerPredicateOfParticle(particleIdx: number): number | undefined {
    return this.predicateOfParticle.get(particleIdx) ?? this.benefactiveRecipientTopicParticleOwner.get(particleIdx);
  }

  followingPredicateEvidenceIndexAfter(
    tokens: readonly ClauseToken[],
    tokenIdx: number,
    options: {
      readonly limit?: number;
      readonly includeAuxiliary?: boolean;
    } = {}
  ): number | null {
    return findFollowingPredicateEvidenceIndex(this, tokens, tokenIdx, options, (token, index) =>
      this.clauseOfPredicateIndex.has(index) &&
      (options.includeAuxiliary !== false || (token.pos & POS0) !== 助動詞)
    );
  }

  quoteHostPrefixParticlesOf(predicateIdx: number): readonly number[] {
    return this.quoteHostPrefixByPredicate.get(predicateIdx) ?? [];
  }

  adverbialAdjunctsOf(predicateIdx: number): readonly number[] {
    return this.adverbialAdjunctsByPredicateMap.get(predicateIdx) ?? [];
  }

  predicateOfAdverbialAdjunct(adjunctIdx: number): number | undefined {
    return this.adverbialAdjunctOwner.get(adjunctIdx);
  }

  parentOf(clauseIdx: number): Clause | undefined {
    const parent = this.clauses[clauseIdx]?.parentIdx;
    return parent === undefined || parent === null ? undefined : this.clauses[parent];
  }

  enclosingQuoteSpans(tokenIdx: number): ReadonlySet<readonly [number, number]> {
    return new Set(this.quoteSpans.filter(([start, end]) => start < tokenIdx && tokenIdx < end));
  }

  enclosingQuoteSpan(tokenIdx: number): readonly [number, number] | undefined {
    let best: readonly [number, number] | undefined;
    for (const span of this.quoteSpans) {
      const [start, end] = span;
      if (start < tokenIdx && tokenIdx < end && (best === undefined || end - start < best[1] - best[0])) {
        best = span;
      }
    }
    return best;
  }

  quoteSpanInfoContaining(tokenIdx: number): QuoteSpanInfo | undefined {
    const span = this.enclosingQuoteSpan(tokenIdx);
    if (span === undefined) {
      return undefined;
    }
    return this.quoteSpanInfos.find((info) => sameSpan(info.span, span));
  }

  sameQuoteScope(a: number, b: number): boolean {
    return spanKeySet(this.enclosingQuoteSpans(a)) === spanKeySet(this.enclosingQuoteSpans(b));
  }

  isQuoteTrappedArgument(particleIdx: number, predicateIdx: number): boolean {
    if (this.quoteHostPrefixParticleOwner.get(particleIdx) === predicateIdx) {
      return false;
    }
    const span = this.enclosingQuoteSpan(particleIdx);
    if (span === undefined) {
      return false;
    }
    return !(span[0] <= predicateIdx && predicateIdx <= span[1]);
  }

  isQuoteSealedPredicate(particleIdx: number, predicateIdx: number): boolean {
    const particleSpans = this.enclosingQuoteSpans(particleIdx);
    const predicateSpans = this.enclosingQuoteSpans(predicateIdx);
    if (particleSpans.size >= predicateSpans.size) {
      return false;
    }
    for (const particleSpan of particleSpans) {
      if (![...predicateSpans].some((predicateSpan) => sameSpan(predicateSpan, particleSpan))) {
        return false;
      }
    }
    return true;
  }
}

export interface ClauseProjectionEvidenceWindow {
  readonly start: number;
  readonly end: number;
}

export function clauseProjectionEvidenceWindowForToken<T extends ClauseToken>(
  layout: ProjectionEvidenceLayout,
  tokens: readonly T[],
  tokenIdx: number
): ClauseProjectionEvidenceWindow | undefined {
  const clause = layout.clauseOfToken(tokenIdx);
  if (clause === undefined) {
    return undefined;
  }
  let start = clause.start;
  let end = clause.end;
  const clauseIndex = layout.clauseIndexOfToken(tokenIdx);

  while (start > 0) {
    const currentClauseIndex = layout.clauseIndexOfToken(start);
    const previousClause = layout.clauseOfToken(start - 1);
    if (previousClause === undefined || previousClause.end !== start) {
      break;
    }
    if (previousClause.kind === "relative" && previousClause.parentIdx === currentClauseIndex) {
      start = previousClause.start;
      continue;
    }
    const boundary = lastNonSpaceIndexInRange(tokens, previousClause.start, previousClause.end);
    if (boundary === undefined || !isClauseEvidenceTransparentPunctuation(tokens[boundary]!)) {
      break;
    }
    start = previousClause.start;
  }

  while (end < tokens.length) {
    const boundary = lastNonSpaceIndexInRange(tokens, start, end);
    if (boundary === undefined || !isClauseEvidenceTransparentPunctuation(tokens[boundary]!)) {
      break;
    }
    const nextClause = layout.clauseOfToken(end);
    if (nextClause === undefined || nextClause.start !== end) {
      break;
    }
    end = nextClause.end;
  }
  if (
    clause.kind === "relative" &&
    clause.parentIdx !== null &&
    isInsideKaContinuationNominalFrameSurface(tokens, tokenIdx)
  ) {
    const parentClauseIndex = layout.clauseIndexOfToken(clause.end);
    const parentClause = layout.clauseOfToken(clause.end);
    if (
      parentClause !== undefined &&
      parentClauseIndex === clause.parentIdx &&
      parentClause.start === clause.end &&
      parentClauseIndex === clauseIndex + 1
    ) {
      end = Math.max(end, parentClause.end);
    }
  }

  return { start, end };
}

export interface PauseEdgeArgumentScope {
  readonly start: number;
  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined;
}

export interface PauseEdgeScopeLayout extends ProjectionEvidenceLayout {
  readonly quoteSpans: readonly (readonly [number, number])[];
  enclosingQuoteSpan(tokenIdx: number): readonly [number, number] | undefined;
  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined;
}

export function pauseEdgeArgumentScopeAt<T extends ClauseToken>(
  layout: PauseEdgeScopeLayout,
  tokens: readonly T[],
  edgeIdx: number
): PauseEdgeArgumentScope {
  const window = clauseProjectionEvidenceWindowForToken(layout, tokens, edgeIdx);
  let start = window?.start ?? edgeIdx;
  const enclosing = layout.enclosingQuoteSpan(edgeIdx);
  if (enclosing !== undefined) {
    start = Math.max(start, enclosing[0] + 1);
  }
  for (const [, closeIdx] of layout.quoteSpans) {
    if (closeIdx < edgeIdx) {
      start = Math.max(start, closeIdx + 1);
    }
  }
  return {
    start,
    balancedDelimiterSpanEndingAt: (closingIdx) => layout.balancedDelimiterSpanEndingAt(closingIdx)
  };
}

function isInsideNominalFrameSurface<T extends ClauseToken>(
  tokens: readonly T[],
  tokenIdx: number,
  surfaceSet: ReadonlySet<string>,
  maxSurfaceLength: number
): boolean {
  let leadingSurfaceLength = 0;
  for (let start = tokenIdx; start >= 0; start -= 1) {
    if (start < tokenIdx) {
      leadingSurfaceLength += tokens[start]?.surface.length ?? 0;
    }
    if (leadingSurfaceLength > maxSurfaceLength) {
      break;
    }
    let surface = "";
    for (let end = start; end < tokens.length && surface.length <= maxSurfaceLength; end += 1) {
      const token = tokens[end];
      if (token === undefined) {
        break;
      }
      surface += token.surface;
      if (end >= tokenIdx && surfaceSet.has(surface)) {
        return true;
      }
    }
  }
  return false;
}

function isInsideAnyNominalFrameSurface(
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  lookups: LookupTables,
  layout: ProtoClauseLayout
): boolean {
  const maxLength = maxNominalFrameSurfaceLength();
  let span = 0;
  for (let start = tokenIdx; start >= 0; start -= 1) {
    span += tokens[start]?.surface.length ?? 0;
    if (span > maxLength) {
      break;
    }
    const markerStart = start;
    const admitted = admittedNominalFrameMarkerEndsAt({
      tokens,
      markerStart,
      lookups,
      accept: (spec) =>
        spec.markerVerbOwnsObjectArgument !== true || !accusativeArgumentReachesMarker(tokens, markerStart, layout)
    });
    if (admitted.some((end) => end > tokenIdx)) {
      return true;
    }
  }
  return false;
}

function accusativeArgumentReachesMarker(
  tokens: readonly RuntimeHaruToken[],
  markerStart: number,
  layout: ProtoClauseLayout
): boolean {
  const clause = layout.clauseOfToken(markerStart);
  for (const particleIdx of clause?.particleIndices ?? []) {
    if (particleIdx >= markerStart) {
      continue;
    }
    if (caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
      acceptedSurfaces: ["を"],
      consumers: ["clause_layout"]
    }) === null) {
      continue;
    }
    if (!tokens.slice(particleIdx + 1, markerStart).some((token) => pos0in(token.pos, PREDICATE_BITS))) {
      return true;
    }
  }
  return false;
}

function isInsideKaContinuationNominalFrameSurface<T extends ClauseToken>(
  tokens: readonly T[],
  tokenIdx: number
): boolean {
  const surfaceSet = kaContinuationNominalFrameSurfaces();
  if (surfaceSet.size === 0) return false;
  return isInsideNominalFrameSurface(tokens, tokenIdx, surfaceSet, maxKaContinuationNominalFrameSurfaceLength());
}

function lastNonSpaceIndexInRange<T extends ClauseToken>(
  tokens: readonly T[],
  start: number,
  end: number
): number | undefined {
  const last = Math.min(end, tokens.length) - 1;
  return last >= start ? last : undefined;
}

export type TailReachClamp = "clause_end" | "clause_pause" | "utterance_close" | "balanced_span";

export interface TailReachEvidence {
  readonly endExclusive: number;
  readonly clampedBy: TailReachClamp;
}

export class ProtoClause {
  constructor(
    readonly start: number,
    readonly end: number,
    readonly kind: ClauseKind,
    readonly terminatedBy: BoundaryKind | null,
    readonly particleIndices: readonly number[],
    readonly parentIdx: number | null
  ) { }
}

export class ProtoClauseLayout {
  constructor(
    readonly protoClauses: readonly ProtoClause[],
    readonly quoteSpans: readonly (readonly [number, number])[],
    readonly clauseOfTokenIndex: readonly number[],
    readonly demoDiscourseLeftBoundaries: readonly DemoDiscourseLeftBoundaryEvidence[] = [],
    readonly hardTerminalEllipsisRuns: readonly HardTerminalEllipsisRunEvidence[] = [],
    readonly anaphoricConjectureSelfQuestions: readonly AnaphoricConjectureSelfQuestionEvidence[] = [],
    readonly terminalPunctuationRuns: readonly ClauseTerminalPunctuationRunEvidence[] = [],
    readonly bareKeijoujiAttributiveHeads: ReadonlyMap<number, BareKeijoujiAttributiveEvidence> =
      new Map<number, BareKeijoujiAttributiveEvidence>(),
    readonly renyouCompoundPrenominalHeads: ReadonlySet<number> = new Set<number>(),
    readonly decorativeTerminalClosures: ReadonlySet<number> = new Set<number>(),
    readonly detachedTerminalNodaClosures: ReadonlySet<number> = new Set<number>(),
    readonly utteranceClosureRuns: ReadonlyMap<number, UtteranceClosureRunEvidence> =
      new Map<number, UtteranceClosureRunEvidence>(),
    readonly punctuationBreakIndices: ReadonlySet<number> = new Set<number>(),
    readonly copulaPauseBridges: readonly CopulaPauseBridgeEvidence[] = [],
    readonly balancedDelimiterSpans: readonly BalancedDelimiterSpan[] = [],
    readonly negativeCopulaCorrections: ReadonlyMap<number, NegativeCopulaCorrectionEvidence> =
      new Map<number, NegativeCopulaCorrectionEvidence>(),
    readonly detachedUtteranceOnsetBoundaries: ReadonlyMap<number, DetachedUtteranceOnsetEvidence> =
      new Map<number, DetachedUtteranceOnsetEvidence>(),
    readonly unmarkedMainClauseBoundaries: ReadonlySet<number> = new Set<number>(),
    readonly quoteAttributiveCarrierHeads: ReadonlyMap<number, number> = new Map<number, number>(),
    readonly chuushiClosures: ReadonlyMap<number, ChuushiClosureEvidence> = new Map<number, ChuushiClosureEvidence>(),
    readonly teUtteranceActs: ReadonlyMap<number, TeUtteranceActEvidence> = new Map<number, TeUtteranceActEvidence>(),
    readonly renyouJunctures: ReadonlyMap<number, RenyouJunctureEvidence> = new Map<number, RenyouJunctureEvidence>(),
    readonly whitespaceJunctures: ReadonlyMap<number, WhitespaceJunctureEvidence> = new Map<number, WhitespaceJunctureEvidence>(),
    readonly pauseJunctures: ReadonlyMap<number, PauseJunctureEvidence> = new Map<number, PauseJunctureEvidence>(),
    readonly lexicalAdverbialAffiliations: ReadonlyMap<number, LexicalAdverbialAffiliation> = new Map<number, LexicalAdverbialAffiliation>(),
    readonly hostlessInterjections: ReadonlyMap<number, HostlessInterjectionEvidence> = new Map<number, HostlessInterjectionEvidence>(),
    readonly lexicalNominalHeadClaims: LexicalNominalHeadClaims | null = null,
    readonly volitionalIntentBindings: ReadonlyMap<number, VolitionalIntentBindingEvidence> = new Map<number, VolitionalIntentBindingEvidence>(),
    readonly embeddedTokenSpace: boolean = false,
  ) { }

  volitionalIntentBindingAt(markerIdx: number): VolitionalIntentBindingEvidence | undefined {
    return this.volitionalIntentBindings.get(markerIdx);
  }

  adnominalNoRelationSlotAccepts(headIdx: number, hostIdx: number): boolean {
    return this.lexicalNominalHeadClaims?.adnominalNoRelationSlotAccepts(headIdx, hostIdx) === true;
  }

  adnominalHeadBearerSlotAccepts(hostIdx: number, headIdx: number): boolean {
    return this.lexicalNominalHeadClaims?.adnominalHeadBearerSlotAccepts(hostIdx, headIdx) === true;
  }

  hostlessInterjectionAt(markerIdx: number): HostlessInterjectionEvidence | undefined {
    return this.hostlessInterjections.get(markerIdx);
  }

  lexicalAdverbialAffiliationAt(particleIdx: number): LexicalAdverbialAffiliation | undefined {
    return this.lexicalAdverbialAffiliations.get(particleIdx);
  }

  renyouJunctureAt(splitAt: number): RenyouJunctureEvidence | undefined {
    return this.renyouJunctures.get(splitAt);
  }

  whitespaceJunctureAt(gapIdx: number): WhitespaceJunctureEvidence | undefined {
    return this.whitespaceJunctures.get(gapIdx);
  }

  pauseJunctureAt(gapIdx: number): PauseJunctureEvidence | undefined {
    return this.pauseJunctures.get(gapIdx);
  }

  chuushiClosureAt(splitAt: number): ChuushiClosureEvidence | undefined {
    return this.chuushiClosures.get(splitAt);
  }

  teUtteranceActAt(connectiveIdx: number): TeUtteranceActEvidence | undefined {
    return this.teUtteranceActs.get(connectiveIdx);
  }

  unmarkedMainClauseBoundaryAt(splitAt: number): boolean {
    return this.unmarkedMainClauseBoundaries.has(splitAt);
  }

  decorativeTerminalClosureAt(tokenIdx: number): boolean {
    return this.decorativeTerminalClosures.has(tokenIdx);
  }

  detachedUtteranceOnsetEdgeAt(index: number): number | undefined {
    return this.detachedUtteranceOnsetBoundaries.get(index)?.edgeIdx;
  }

  copulaPauseBridgeAt(copulaStart: number): CopulaPauseBridgeEvidence | undefined {
    return this.copulaPauseBridges.find((evidence) => evidence.copulaStart === copulaStart);
  }

  negativeCopulaCorrectionAt(splitAt: number): NegativeCopulaCorrectionEvidence | undefined {
    return this.negativeCopulaCorrections.get(splitAt);
  }

  enclosingBalancedSpan(tokenIdx: number): BalancedDelimiterSpan | undefined {
    return enclosingBalancedSpanIn(this.balancedDelimiterSpans, tokenIdx);
  }

  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined {
    return balancedDelimiterSpanEndingAtIn(this.balancedDelimiterSpans, closingIdx);
  }

  balancedDelimiterSpanOpeningAt(openingIdx: number): BalancedDelimiterSpan | undefined {
    return balancedDelimiterSpanOpeningAtIn(this.balancedDelimiterSpans, openingIdx);
  }

  tailReachInClause(tokenIdx: number): number {
    return this.tailReachEvidenceInClause(tokenIdx).endExclusive;
  }

  tailReachEvidenceInClause(tokenIdx: number): TailReachEvidence {
    const clause = this.clauseOfToken(tokenIdx);
    if (clause === undefined) {
      return { endExclusive: tokenIdx, clampedBy: "clause_end" };
    }
    let brk: number | null = null;
    for (const index of this.punctuationBreakIndices) {
      if (index >= tokenIdx && index < clause.end && (brk === null || index < brk)) {
        brk = index;
      }
    }
    const span = this.enclosingBalancedSpan(tokenIdx);
    if (span !== undefined && span.contentEndExclusive <= Math.min(brk ?? clause.end, clause.end)) {
      return { endExclusive: span.contentEndExclusive, clampedBy: "balanced_span" };
    }
    if (brk !== null && brk <= clause.end) {
      return {
        endExclusive: brk,
        clampedBy: this.terminalPunctuationRunContaining(brk) === undefined
          ? "clause_pause"
          : "utterance_close"
      };
    }
    return { endExclusive: clause.end, clampedBy: "clause_end" };
  }

  isBareKeijoujiAttributiveHead(tokenIdx: number): boolean {
    return this.bareKeijoujiAttributiveHeads.has(tokenIdx);
  }

  bareKeijoujiAttributiveEvidenceAt(tokenIdx: number): BareKeijoujiAttributiveEvidence | undefined {
    return this.bareKeijoujiAttributiveHeads.get(tokenIdx);
  }

  quoteAttributiveCarrierHeadOfMarker(markerIdx: number): number | undefined {
    return this.quoteAttributiveCarrierHeads.get(markerIdx);
  }

  isRenyouCompoundPrenominalHead(tokenIdx: number): boolean {
    return this.renyouCompoundPrenominalHeads.has(tokenIdx);
  }

  closesClauseAtDetachedTerminalNoda(splitAt: number): boolean {
    return this.detachedTerminalNodaClosures.has(splitAt);
  }

  utteranceClosureRunAt(endIdx: number): UtteranceClosureRunEvidence | undefined {
    return this.utteranceClosureRuns.get(endIdx);
  }

  clauseCarriesInterrogativeFormAt(
    tokens: readonly ClauseToken[],
    hostIdx: number,
    lookups: LookupTables
  ): boolean {
    return clauseCarriesInterrogativeForm(tokens, this, hostIdx, lookups);
  }

  closesUtteranceBefore(endIdx: number): boolean {
    const evidence = this.utteranceClosureRuns.get(endIdx);
    return evidence !== undefined && evidence.run !== "formal_noun_dependent";
  }

  closesUtteranceBeforeGivenFormalNounHead(endIdx: number): boolean {
    return this.utteranceClosureRuns.get(endIdx)?.run === "formal_noun_dependent";
  }

  demoDiscourseLeftBoundaryAt(connectiveIdx: number): DemoDiscourseLeftBoundaryEvidence | undefined {
    return this.demoDiscourseLeftBoundaries.find((evidence) => evidence.connectiveIdx === connectiveIdx);
  }

  demoDiscourseLeftBoundaryKindAt(
    connectiveIdx: number,
    boundaryKind: DemoDiscourseLeftBoundaryEvidenceKind
  ): boolean {
    return this.demoDiscourseLeftBoundaries.some((evidence) =>
      evidence.connectiveIdx === connectiveIdx && evidence.boundaryKind === boundaryKind);
  }

  anaphoricConjectureSelfQuestionAt(markerIdx: number): AnaphoricConjectureSelfQuestionEvidence | undefined {
    return this.anaphoricConjectureSelfQuestions.find((evidence) => evidence.markerIdx === markerIdx);
  }

  terminalPunctuationRunAfter(contentEndIdx: number): ClauseTerminalPunctuationRunEvidence | undefined {
    return this.terminalPunctuationRuns.find((evidence) => evidence.contentEndIdx === contentEndIdx);
  }

  terminalPunctuationRunContaining(tokenIdx: number): ClauseTerminalPunctuationRunEvidence | undefined {
    return this.terminalPunctuationRuns.find((evidence) => evidence.tokenIndices.includes(tokenIdx));
  }

  utteranceClosureAfter<T extends UtteranceClosureToken>(
    tokens: readonly T[],
    afterIdx: number
  ): UtteranceClosureEvidence {
    return utteranceClosureAfter(this, tokens, afterIdx);
  }

  utteranceRangeOfToken(tokenIdx: number): { readonly start: number; readonly endExclusive: number } {
    return utteranceRangeOfTokenIn(this.clauseOfTokenIndex.length, this.terminalPunctuationRuns, tokenIdx);
  }

  clauseContaining(tokenIdx: number): ProtoClause | undefined {
    const index = this.clauseOfTokenIndex[tokenIdx];
    return index === undefined ? undefined : this.protoClauses[index];
  }

  clauseIndexOfToken(tokenIdx: number): number {
    return this.clauseOfTokenIndex[tokenIdx] ?? -1;
  }

  clauseOfToken(tokenIdx: number): ProtoClause | undefined {
    return this.clauseContaining(tokenIdx);
  }

  followingPredicateEvidenceIndexAfter(
    tokens: readonly ClauseToken[],
    tokenIdx: number,
    options: {
      readonly limit?: number;
      readonly includeAuxiliary?: boolean;
    } = {}
  ): number | null {
    return findFollowingPredicateEvidenceIndex(this, tokens, tokenIdx, options, (token) =>
      isClausePredicateEvidenceToken(token, { includeAuxiliary: options.includeAuxiliary ?? true })
    );
  }

  postposedModifiedPredicateIndexBefore(
    tokens: readonly ClauseToken[],
    tokenIdx: number,
    options: {
      readonly limit?: number;
      readonly includeAuxiliary?: boolean;
    } = {}
  ): number | null {
    return findPrecedingPredicateEvidenceIndex(this, tokens, tokenIdx, options, (token) =>
      isClausePredicateEvidenceToken(token, { includeAuxiliary: options.includeAuxiliary ?? true })
    );
  }

  clauseTokensBeforeAreExtraClausal(tokens: readonly ClauseToken[], tokenIdx: number): boolean {
    const clause = this.clauseOfToken(tokenIdx);
    if (clause === undefined) {
      return false;
    }
    return extraClausalRun(tokens, clause.start, tokenIdx);
  }

  utteranceTokensBeforeAreExtraClausal(tokens: readonly ClauseToken[], tokenIdx: number): boolean {
    const utteranceStart = this.utteranceRangeOfToken(tokenIdx).start;
    if (this.embeddedTokenSpace && utteranceStart === 0) {
      return false;
    }
    return extraClausalRun(tokens, utteranceStart, tokenIdx);
  }

  projectionEvidenceWindowForToken(
    tokens: readonly ClauseToken[],
    tokenIdx: number
  ): ClauseProjectionEvidenceWindow | undefined {
    return clauseProjectionEvidenceWindowForToken(this, tokens, tokenIdx);
  }

  connectiveConsequentReachEnd(
    tokens: readonly ClauseToken[],
    tokenIdx: number
  ): number | undefined {
    const window = this.projectionEvidenceWindowForToken(tokens, tokenIdx);
    if (window === undefined) {
      return undefined;
    }
    const span = this.enclosingBalancedSpan(tokenIdx);
    return span === undefined ? window.end : Math.min(window.end, span.contentEndExclusive);
  }

  enclosingQuoteSpan(tokenIdx: number): readonly [number, number] | undefined {
    let best: readonly [number, number] | undefined;
    for (const span of this.quoteSpans) {
      const [start, end] = span;
      if (start < tokenIdx && tokenIdx < end && (best === undefined || end - start < best[1] - best[0])) {
        best = span;
      }
    }
    return best;
  }

  isQuoteTrapped(particleIdx: number, predicateIdx: number): boolean {
    const span = this.enclosingQuoteSpan(particleIdx);
    if (span === undefined) {
      return false;
    }
    return !(span[0] <= predicateIdx && predicateIdx <= span[1]);
  }
}


export function detectQuoteSpans(tokens: readonly ClauseToken[]): readonly (readonly [number, number])[] {
  const stack: { surface: string; index: number }[] = [];
  const spans: [number, number][] = [];
  for (const [index, token] of tokens.entries()) {
    if (EXPLICIT_OPENING_QUOTATION_SURFACES.has(token.surface)) {
      stack.push({ surface: token.surface, index });
      continue;
    }
    const last = stack.at(-1);
    if (last !== undefined && EXPLICIT_CLOSING_FOR_OPENING_QUOTATION.get(last.surface) === token.surface) {
      stack.pop();
      spans.push([last.index, index]);
    }
  }
  return spans;
}

function collectUtteranceOnsetLeftBoundaryEvidence(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  scope: UtteranceOnsetLeftBoundaryScope
): readonly DemoDiscourseLeftBoundaryEvidence[] {
  const evidence: DemoDiscourseLeftBoundaryEvidence[] = [];
  for (let index = 1; index < tokens.length; index += 1) {
    const found = utteranceOnsetLeftBoundaryEvidenceAt(tokens, index, lookups, scope);
    if (found !== null) {
      evidence.push({ kind: "demo_discourse_left_boundary", ...found, connectiveIdx: index });
    }
  }
  return evidence;
}

export interface UtteranceOnsetLeftBoundaryScope {
  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined;
  pauseEdgeArgumentScopeAt(edgeIdx: number): PauseEdgeArgumentScope;
}

export function utteranceOnsetLeftBoundaryScopeFor(
  tokens: readonly ClauseToken[],
  lookups: LookupTables
): UtteranceOnsetLeftBoundaryScope {
  const proto = buildProtoLayout(tokens, lookups);
  return {
    balancedDelimiterSpanEndingAt: (closingIdx) => proto.balancedDelimiterSpanEndingAt(closingIdx),
    pauseEdgeArgumentScopeAt: (edgeIdx) => pauseEdgeArgumentScopeAt(proto, tokens, edgeIdx)
  };
}

export function utteranceOnsetLeftBoundaryEvidenceAt(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables,
  scope: UtteranceOnsetLeftBoundaryScope
): {
  readonly boundaryKind: DemoDiscourseLeftBoundaryEvidenceKind;
  readonly markerIdx: number;
} | null {
  if (index < 1) {
    return null;
  }
  const matchLength = demoDiscourseUtteranceInitialMatchLengthAt(tokens, index);
  if (matchLength === null) {
    return null;
  }
  if (separatedAs(tokens, index, DETACHED_SEPARATIONS)) {
    const label = transcriptionSpeakerLabelRunBefore(tokens, index, lookups);
    if (label !== null && label.chainHasProperNoun) {
      return { boundaryKind: "speaker_label", markerIdx: label.headIdx };
    }
    const vocativeIdx = detachedVocativeHeadBefore(tokens, index, index + matchLength);
    if (vocativeIdx !== null) {
      return { boundaryKind: "detached_vocative", markerIdx: vocativeIdx };
    }
  }
  const closedUtteranceIdx = closedUtteranceQuoteBefore(tokens, index, scope);
  if (closedUtteranceIdx !== null) {
    return { boundaryKind: "pause_traversed_onset", markerIdx: closedUtteranceIdx };
  }
  const pauseEdgeIdx = pauseTraversedUtteranceOnsetEdgeAt(tokens, index, scope);
  return pauseEdgeIdx === null
    ? null
    : { boundaryKind: "pause_traversed_onset", markerIdx: pauseEdgeIdx };
}

export interface DetachedUtteranceOnsetEdge {
  readonly edgeIdx: number;
  readonly gapIdx: number | null;
}

export interface DetachedUtteranceOnsetEvidence {
  readonly queryIdx: number;
  readonly gapIdx: number;
  readonly edgeIdx: number;
}

export function detachedUtteranceOnsetEdgeAt(
  tokens: readonly ClauseToken[],
  index: number
): DetachedUtteranceOnsetEdge | null {
  if (index < 1) {
    return null;
  }
  let cursor = index;
  let gapIdx: number | null = null;
  for (let step = 0; step < tokens.length; step += 1) {
    if (gapIdx === null && separatedAs(tokens, cursor, DETACHED_SEPARATIONS)) {
      gapIdx = cursor;
    }
    const prevIdx = previousNonSpaceIndex(tokens, cursor);
    if (prevIdx === null) {
      return null;
    }
    const prev = tokens[prevIdx];
    if (prev === undefined || isTrailingPunctuationToken(prev)) {
      return null;
    }
    if (isUtteranceBoundaryPunctuationToken(prev)) {
      return { edgeIdx: prevIdx, gapIdx };
    }
    const pos0 = prev.pos & POS0;
    if (pos0 === 補助記号 || pos0 === 記号) {
      cursor = prevIdx;
      continue;
    }
    return gapIdx !== null && utteranceInitialDetachedEdgeQualifies(tokens, prevIdx)
      ? { edgeIdx: prevIdx, gapIdx }
      : null;
  }
  return null;
}

function collectDetachedUtteranceOnsetBoundaries(
  tokens: readonly ClauseToken[]
): ReadonlyMap<number, DetachedUtteranceOnsetEvidence> {
  const boundaries = new Map<number, DetachedUtteranceOnsetEvidence>();
  for (let index = 1; index < tokens.length; index += 1) {
    const isGapCoordinate = separatedAs(tokens, index, DETACHED_SEPARATIONS);
    const isRowCoordinate = demoDiscourseUtteranceInitialMatchLengthAt(tokens, index) !== null;
    if (!isGapCoordinate && !isRowCoordinate) {
      continue;
    }
    const edge = detachedUtteranceOnsetEdgeAt(tokens, index);
    if (edge === null || edge.gapIdx === null) {
      continue;
    }
    boundaries.set(index, {
      queryIdx: index,
      gapIdx: edge.gapIdx,
      edgeIdx: edge.edgeIdx
    });
  }
  return boundaries;
}

function closedUtteranceQuoteBefore(
  tokens: readonly ClauseToken[],
  index: number,
  scope: UtteranceOnsetLeftBoundaryScope
): number | null {
  const closeIdx = previousNonSpaceIndex(tokens, index);
  if (closeIdx === null) {
    return null;
  }
  const span = scope.balancedDelimiterSpanEndingAt(closeIdx);
  if (span === undefined || (span.role !== "explicit_quote_span" && span.role !== "bracketed_span")) {
    return null;
  }
  const contentEndIdx = previousNonSpaceIndex(tokens, span.closingIdx, span.openingIdx + 1);
  return contentEndIdx !== null && isClauseHardTerminalPunctuationToken(tokens[contentEndIdx])
    ? span.closingIdx
    : null;
}

export function copulaComplementLiesBeyondPauseAt(
  layout: PauseEdgeScopeLayout,
  tokens: readonly ClauseToken[],
  index: number
): boolean {
  if (!isCopulaTailContinuationStart(tokens[index]) || utterancePauseOnsetMarkerBefore(tokens, index) === null) {
    return false;
  }
  const scope: UtteranceOnsetLeftBoundaryScope = {
    balancedDelimiterSpanEndingAt: (closingIdx) => layout.balancedDelimiterSpanEndingAt(closingIdx),
    pauseEdgeArgumentScopeAt: (edgeIdx) => pauseEdgeArgumentScopeAt(layout, tokens, edgeIdx)
  };
  return pauseTraversedUtteranceOnsetEdgeAt(tokens, index, scope) === null;
}

function pauseTraversedUtteranceOnsetEdgeAt(
  tokens: readonly ClauseToken[],
  index: number,
  scope: UtteranceOnsetLeftBoundaryScope
): number | null {
  const marker = utterancePauseOnsetMarkerBefore(tokens, index);
  if (marker === null) {
    return null;
  }
  const pauseIdx = marker.markerIdx;
  let cursor = pauseIdx;
  for (let step = 0; step < tokens.length; step += 1) {
    const edgeIdx = previousNonSpaceIndex(tokens, cursor);
    if (edgeIdx === null) {
      return pauseIdx;
    }
    const edge = tokens[edgeIdx];
    if (edge === undefined) {
      return pauseIdx;
    }
    if (isTrailingPunctuationToken(edge)) {
      return null;
    }
    if (isWeakPunctuationToken(edge)) {
      cursor = edgeIdx;
      continue;
    }
    if (isUtteranceBoundaryPunctuationToken(edge)) {
      return edgeIdx;
    }
    if (isBoundaryPunctuationCategoryToken(edge)) {
      cursor = edgeIdx;
      continue;
    }
    if (marker.kind !== "weak_pause" && copulaHostParticleMarkerSubtype(tokens[edgeIdx]) !== null) {
      return null;
    }
    return pauseEdgeVerdictAt(tokens, edgeIdx, scope.pauseEdgeArgumentScopeAt(edgeIdx)).grade === "complement"
      ? null
      : edgeIdx;
  }
  return null;
}

export function pauseEdgeVerdictAt(
  tokens: readonly ClauseToken[],
  edgeIdx: number,
  scope: PauseEdgeArgumentScope
): UtteranceInitialPauseEdgeVerdict {
  return utteranceInitialPauseEdgeVerdict(
    tokens,
    edgeIdx,
    hasOpenSubjectTopicArgumentBefore(tokens, edgeIdx, scope)
  );
}

function hasOpenSubjectTopicArgumentBefore(
  tokens: readonly ClauseToken[],
  edgeIdx: number,
  scope: PauseEdgeArgumentScope
): boolean {
  let verbTraversed = false;
  for (let idx = edgeIdx - 1; idx >= scope.start; idx -= 1) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    if (isClauseEvidenceTransparentPunctuation(token)) {
      continue;
    }
    if (isClausePunctuationToken(token)) {
      return false;
    }
    if (
      (pos0in(token.pos, INFLECTABLE_BITS) || (token.pos & POS0) === 助動詞) &&
      isClauseClosingInflection(token.pos)
    ) {
      return false;
    }
    if (isVerbPredicateToken(token)) {
      verbTraversed = true;
      continue;
    }
    if (
      isSubjectTopicParticle(token) &&
      (!verbTraversed || isTopicMarkerToken(tokens, idx)) &&
      subjectTopicParticleHasContentHost(tokens, idx, scope)
    ) {
      return true;
    }
  }
  return false;
}

function isTopicMarkerToken(tokens: readonly ClauseToken[], idx: number): boolean {
  return topicFocusMarkerRelationForToken(tokens[idx], idx, {
    consumers: ["clause_layout"]
  })?.focusKind === "topic";
}

function subjectTopicParticleHasContentHost(
  tokens: readonly ClauseToken[],
  particleIdx: number,
  scope: PauseEdgeArgumentScope
): boolean {
  const topicMarker = isTopicMarkerToken(tokens, particleIdx);
  for (let idx = particleIdx - 1; idx >= 0; idx -= 1) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    const mention = scope.balancedDelimiterSpanEndingAt(idx);
    if (
      mention !== undefined &&
      (mention.role === "explicit_quote_span" || mention.role === "bracketed_span")
    ) {
      return true;
    }
    if (idx < scope.start) {
      return false;
    }
    const particleSubtype = token.pos & POS01;
    if (particleSubtype === 助詞_係助詞 || particleSubtype === 助詞_副助詞) {
      continue;
    }
    if (particleSubtype === 助詞_格助詞) {
      if (!topicMarker) {
        return false;
      }
      continue;
    }
    if (particleSubtype === 助詞_準体助詞) {
      return true;
    }
    return isNominalLike(token);
  }
  return false;
}

type UtterancePauseOnsetMarkerKind = "weak_pause" | "transparent_pause" | "notation_run";

function utterancePauseOnsetMarkerBefore(
  tokens: readonly ClauseToken[],
  index: number
): { readonly markerIdx: number; readonly kind: UtterancePauseOnsetMarkerKind } | null {
  let cursor = index;
  let traversedNotationRun = false;
  for (let step = 0; step < tokens.length; step += 1) {
    if (isTransparentPauseSeparatedFromPreviousNonSpaceToken(tokens, cursor)) {
      return { markerIdx: cursor, kind: "transparent_pause" };
    }
    const prevIdx = previousNonSpaceIndex(tokens, cursor);
    if (prevIdx === null) {
      return null;
    }
    const prev = tokens[prevIdx];
    if (prev === undefined || isTrailingPunctuationToken(prev)) {
      return null;
    }
    if (isWeakPunctuationToken(prev)) {
      return { markerIdx: prevIdx, kind: "weak_pause" };
    }
    if (isBoundaryPunctuationCategoryToken(prev)) {
      traversedNotationRun = true;
      cursor = prevIdx;
      continue;
    }
    return traversedNotationRun ? { markerIdx: cursor, kind: "notation_run" } : null;
  }
  return null;
}

function isTranscriptionSpeakerLabelMarkerToken(token: ClauseToken, lookups: LookupTables): boolean {
  return (token.pos & POS0) === 補助記号 &&
    lookups.TRANSCRIPTION_SPEAKER_LABEL_MARKER_SURFACES.has(token.surface);
}

function isTranscriptionSpeakerLabelBodyToken(token: ClauseToken): boolean {
  const p0 = token.pos & POS0;
  if (p0 === 名詞 || p0 === 接尾辞 || p0 === 接頭辞 || p0 === 記号) {
    return true;
  }
  const p01 = token.pos & POS01;
  return p01 === 補助記号_括弧開 || p01 === 補助記号_括弧閉;
}

function isPersonReferringHeadToken(token: ClauseToken, lookups: LookupTables): boolean {
  if (isPersonToken(token, lookups)) {
    return true;
  }
  const form = token.dictionaryForm.length > 0 ? token.dictionaryForm : token.surface;
  return Array.from(lookups.TRANSCRIPTION_SPEAKER_LABEL_TITLE_SUFFIXES)
    .some((suffix) => form.endsWith(suffix));
}

interface TranscriptionSpeakerLabelRun {
  readonly headIdx: number;
  readonly chainHasProperNoun: boolean;
}

function transcriptionSpeakerLabelRunBefore(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables
): TranscriptionSpeakerLabelRun | null {
  const headIdx = previousNonSpaceIndex(tokens, index);
  const head = headIdx === null ? undefined : tokens[headIdx];
  if (headIdx === null || head === undefined || !isPersonReferringHeadToken(head, lookups)) {
    return null;
  }
  let sawProperNoun = false;
  for (let cursor = headIdx; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor];
    if (token === undefined) {
      return null;
    }
    if (isTranscriptionSpeakerLabelMarkerToken(token, lookups)) {
      const onset = transcriptionSpeakerLabelOnsetBefore(tokens, cursor, lookups);
      return onset === null
        ? null
        : { headIdx, chainHasProperNoun: sawProperNoun || onset.chainHasProperNoun };
    }
    if (!isTranscriptionSpeakerLabelBodyToken(token) || separatedAs(tokens, cursor, DETACHED_SEPARATIONS)) {
      return null;
    }
    if ((token.pos & POS01) === 名詞_固有名詞) {
      sawProperNoun = true;
    }
  }
  return null;
}

function transcriptionSpeakerLabelOnsetBefore(
  tokens: readonly ClauseToken[],
  markerIdx: number,
  lookups: LookupTables
): { readonly chainHasProperNoun: boolean } | null {
  const beforeIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (beforeIdx === null) {
    return { chainHasProperNoun: false };
  }
  const before = tokens[beforeIdx];
  if (before !== undefined && isClauseHardTerminalPunctuationToken(before)) {
    return { chainHasProperNoun: false };
  }
  if (!separatedAs(tokens, markerIdx, DETACHED_SEPARATIONS)) {
    return null;
  }
  const previousLabel = transcriptionSpeakerLabelRunBefore(tokens, markerIdx, lookups);
  return previousLabel === null ? null : { chainHasProperNoun: previousLabel.chainHasProperNoun };
}

function detachedVocativeHeadBefore(
  tokens: readonly ClauseToken[],
  index: number,
  connectiveEndExclusive: number
): number | null {
  const nameIdx = previousNonSpaceIndex(tokens, index);
  const name = nameIdx === null ? undefined : tokens[nameIdx];
  if (nameIdx === null || name === undefined || !isProperPersonNameToken(name)) {
    return null;
  }
  if (!separatedAs(tokens, nameIdx, DETACHED_SEPARATIONS)) {
    return null;
  }
  const edgeIdx = previousNonSpaceIndex(tokens, nameIdx);
  if (edgeIdx === null || !utteranceInitialDetachedEdgeQualifies(tokens, edgeIdx)) {
    return null;
  }
  return connectiveRightEdgeIsBroken(tokens, connectiveEndExclusive) ? nameIdx : null;
}

function connectiveRightEdgeIsBroken(tokens: readonly ClauseToken[], atIdx: number): boolean {
  const next = tokens[atIdx];
  if (next === undefined) {
    return true;
  }
  return separatedAs(tokens, atIdx, DETACHED_SEPARATIONS) || isUtteranceClosingPunct(next);
}

interface ClauseBoundaryDetectionResult {
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

function decorativeTerminalClosureIndices(
  tokens: readonly ClauseToken[],
  lookups: LookupTables
): ReadonlySet<number> {
  const surfaces = lookups.GRAMMAR_BOUNDARY_DECORATIVE_TERMINAL_SYMBOL_SURFACES;
  const indices = new Set<number>();
  if (surfaces.size === 0) {
    return indices;
  }
  for (const [index, token] of tokens.entries()) {
    if (isClauseDecorativeTerminalPunctuationToken(token, surfaces)) {
      indices.add(index);
    }
  }
  return indices;
}

function detectClauseBoundaryEventsWithEvidence(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  options: ClauseBoundaryDetectionOptions = {}
): ClauseBoundaryDetectionResult {
  const n = tokens.length;
  if (n === 0) {
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
  const upsert = (
    splitAt: number,
    kind: BoundaryKind,
    evidence: { readonly witnessesWhitespaceSplit?: boolean } = {}
  ): void => {
    if (splitAt <= 0 || splitAt >= n || zeroNominalizedParallelMoInteriorSplits.has(splitAt)) {
      return;
    }
    (evidence.witnessesWhitespaceSplit === false ? nonWhitespaceWitnessSplits : whitespaceWitnessSplits)
      .add(splitAt);
    const existing = raw.get(splitAt);
    if (existing === undefined || preferredBoundaryKind(kind, existing) === kind) {
      raw.set(splitAt, kind);
    }
  };

  for (const [index, token] of tokens.entries()) {
    const pos0 = token.pos & POS0;
    const pos1 = token.pos & POS1;

    if (pairedConcessiveByMarker.has(index)) {
      upsert(index + 1, "connective");
      continue;
    }

    if (
      isDiscourseResumptionCopulaConnectiveStart(tokens, index, lookups, clauseCursorAt) &&
      hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
    ) {
      upsert(index, "punctuation");
    }

    if (
      separatedAs(tokens, index, SEPARATION_OPENS_BOUNDARY) &&
      pos0 === 副詞 &&
      lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(token.dictionaryForm || token.surface)
    ) {
      const previous = previousNonSpaceIndex(tokens, index);
      if (previous !== null && isFinitePredicateBoundaryLeft(tokens[previous])) {
        upsert(index, "punctuation");
      }
    }

    if (CLAUSE_PUNCT_POS0_NUM.has(pos0)) {
      if (handledSubtitlePunctuationIndices.has(index)) {
        continue;
      }
      if (isOpeningPunct(token)) {
        continue;
      }
      if (!isBoundaryPunct(token)) {
        continue;
      }
      if (raw.has(index)) {
        continue;
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
          ? ellipsisRunOrdinal++
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
            continue;
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
        upsert(subtitleTrailingRun.span.endExclusive, "punctuation");
        continue;
      }
      const previous = previousNonSpaceIndex(tokens, index);
      if (previous !== null && isAbsorbablePunct(tokens[previous]!)) {
        continue;
      }
      if (
        isClauseEvidenceTransparentPunctuation(token) &&
        isCopulaTeAfterNounBeforePunctuation(tokens, index) &&
        hasFollowingClausePredicateEvidence(clauseCursorAt(nextAfterAbsorbableRun(tokens, index)))
      ) {
        punctuationBreakIndices.add(index);
        upsert(nextAfterAbsorbableRun(tokens, index), "connective");
        continue;
      }
      if (isWeakTailContinuationPunctuation(tokens, index)) {
        continue;
      }
      if (isWeakLexicalParticleAdverbialContinuationPunctuation(clauseCursorAt(index), lookups, options, lexicalAdverbialAffiliations)) {
        continue;
      }
      punctuationBreakIndices.add(index);
      upsert(nextAfterAbsorbableRun(tokens, index), "punctuation");
      continue;
    }
    if (
      isConditionalAuxClauseBoundaryToken(tokens, index) &&
      !isObligationSpanContaining(runtimeTokens, index) &&
      hasFollowingClausePredicateEvidence(clauseCursorAt(index + 1))
    ) {
      upsert(index + 1, "connective");
      continue;
    }
    const shield = layoutBoundaryShieldAt(clauseCursorAt(index));
    const shieldAdmitted = shield === null ||
      lookupConnectiveBySurface(shield.surface) !== "tame_reason" ||
      boundNominalReasonCompositeFollowerAdmitted(runtimeTokens, shield.endExclusive);
    if (shield !== null && shieldAdmitted && hasFollowingClausePredicateEvidence(clauseCursorAt(shield.endExclusive))) {
      upsert(shield.endExclusive, "connective");
      continue;
    }
    const hostedComposite = compositeConnectivePatternRelationAt(clauseCursorAt(index), {
      consumers: ["clause_layout"],
      lookupConnectiveKind: lookupConnectiveBySurface
    });
    if (
      hostedComposite?.hostIndex !== undefined &&
      hasFollowingClausePredicateEvidence(clauseCursorAt(hostedComposite.span.endExclusive)) &&
      hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
    ) {
      upsert(hostedComposite.span.endExclusive, "connective");
      continue;
    }
    const discontinuousListingSplitAt = discontinuousListingBoundarySplitAt(clauseCursorAt(index), lookups);
    if (
      discontinuousListingSplitAt !== null &&
      hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
    ) {
      upsert(discontinuousListingSplitAt, "connective");
      continue;
    }
    if (pos0 === 助詞 && pos1 === 接続助詞) {
      const clauseCursor = clauseCursorAt(index);
      const postverbOperatorTailEnd = postverbOperatorTailSpanAfterTe(tokens, index, n, lookups);
      if (postverbOperatorTailEnd !== null) {
        if (hasSeparatedFinitePredicateBoundary(tokens, postverbOperatorTailEnd)) {
          upsert(postverbOperatorTailEnd, "punctuation");
        }
        continue;
      }
      if (isObligationSpanContaining(runtimeTokens, index)) {
        continue;
      }
      if (isInsideClauseOpaqueNominalFrameSurface(tokens, index)) {
        continue;
      }
      if (isQuoteContentTailMarker(runtimeCursorAt(index), lookups)) {
        continue;
      }
      if (isQuotedJudgmentPassiveTailMarker(clauseCursor)) {
        continue;
      }
      const connectiveKind = lookupConnectiveBySurface(token.surface);
      if (
        connectiveKind !== undefined &&
        connectiveSurfaceRequiresFinalPosition(connectiveKind, token.surface) &&
        !finalOnlyConnectiveHasImmediateClauseContinuation(tokens, index + 1, n, clauseCursorAt)
      ) {
        continue;
      }
      if (isBaSufficiencyConditionalAt(tokens, index)) {
        continue;
      }
      const compositePattern = compositeConnectivePatternRelationAt(clauseCursor, {
        consumers: ["clause_layout"],
        lookupConnectiveKind: lookupConnectiveBySurface
      });
      const connectivePattern = compositePattern !== null &&
        compositePattern.connectiveKind === "tame_reason" &&
        !boundNominalReasonCompositeFollowerAdmitted(runtimeTokens, compositePattern.span.endExclusive)
        ? null
        : compositePattern;
      let connectiveSplitAt = connectivePattern?.span.endExclusive ?? index + 1;
      if (connectivePattern === null && token.surface === "て" && isTeConnectiveToken(token)) {
        const nakuIdx = previousNonSpaceIndex(tokens, index);
        const naku = nakuIdx === null ? undefined : tokens[nakuIdx];
        const nakuIsNegativeRenyou = naku !== undefined &&
          (naku.pos & POS5A) === 連用形_ &&
          (((naku.pos & POS4) === 助動詞_ナイ) ||
            ((naku.pos & POS0) === 形容詞0 && (naku.dictionaryForm === "ない" || naku.dictionaryForm === "無い")));
        const stemIdx = nakuIdx === null ? null : previousNonSpaceIndex(tokens, nakuIdx);
        const stem = stemIdx === null ? undefined : tokens[stemIdx];
        const stemIsCopulaDe = stem !== undefined && ((stem.pos & POS4) === 助動詞_ダ || stem.surface === "じゃ");
        const stemPrevIdx = stemIdx === null ? null : previousNonSpaceIndex(tokens, stemIdx);
        const stemPrev = stemPrevIdx === null ? undefined : tokens[stemPrevIdx];
        const stemIsTeCompound = stem !== undefined && (stem.pos & POS0) === 動詞 &&
          stemPrev !== undefined && isTeConnectiveToken(stemPrev);
        if (nakuIsNegativeRenyou && !stemIsCopulaDe && !stemIsTeCompound) {
          const haIdx = nextNonSpaceIndex(tokens, index + 1, tokens.length);
          const ha = haIdx === null || haIdx === undefined ? undefined : tokens[haIdx];
          if (haIdx !== null && haIdx !== undefined && ha !== undefined && (ha.pos & POS01) === 助詞_係助詞 && ha.surface === "は") {
            connectiveSplitAt = haIdx + 1;
          }
        }
      }
      if (token.surface === "と" && isTerminalQuoteFocusEvenTail(clauseCursorAt(connectiveSplitAt))) {
        continue;
      }
      const condToLeftIdx = previousNonSpaceIndex(tokens, index);
      const condToLeftPos0 = condToLeftIdx !== null ? (tokens[condToLeftIdx]!.pos & POS0) : 0;
      const condToNextIdx = nextNonSpaceIndex(tokens, index + 1);
      const condToNext = condToNextIdx === null ? undefined : tokens[condToNextIdx];
      const condToLeftIsCopula =
        condToLeftIdx !== null && isCopulaConditionalBoundaryLeft(tokens[condToLeftIdx]);
      const condToCopulaNonConditional =
        condToNext !== undefined &&
        (((condToNext.pos & POS0) === 助詞 &&
          (condToNext.surface === "の" || condToNext.surface === "か" || condToNext.surface === "は" ||
            condToNext.surface === "も" || quoteFocusEvenSequenceStartsAt(tokens, condToNextIdx))) ||
          ((condToNext.pos & POS0) === 動詞 &&
            (condToNext.dictionaryForm === "する" || condToNext.surface === "する")));
      const condToCopulaAdmissible =
        condToLeftIsCopula &&
        !condToCopulaNonConditional &&
        !isQuotativeToTokensWide(runtimeCursorAt(index), lookups, { scope: "sentence" });
      const conditionalToConsequent =
        token.surface === "と" &&
        (pos0in(condToLeftPos0, INFLECTABLE_BITS) || condToCopulaAdmissible) &&
        hasFollowingConditionalConsequent(clauseCursorAt(connectiveSplitAt));
      const hasEllipticFollowerAt = (start: number): boolean =>
        hasEllipticFollowerClauseEvidence(
          tokens,
          start,
          n,
          (clauseTokens, idx) => {
            const candidate = clauseTokens[idx];
            return candidate !== undefined && isClausePredicateEvidenceToken(candidate);
          }
        );
      const condBaLeftIdx = token.surface === "ば" ? previousNonSpaceIndex(tokens, index) : null;
      const condBaLeft = condBaLeftIdx === null ? undefined : tokens[condBaLeftIdx];
      const condBaLeftPos5A = (condBaLeft?.pos ?? 0) & POS5A;
      const conditionalBaToConsequent =
        token.surface === "ば" &&
        (
          condBaLeftPos5A === 仮定形_ ||
          condBaLeftPos5A === 已然形_ ||
          isClassicalZuIzenkeiToken(condBaLeft)
        ) &&
        hasEllipticFollowerAt(connectiveSplitAt);
      const ellipticFollower =
        connectiveAdmitsEllipticFollowerClause(connectivePattern?.connectiveKind ?? connectiveKind, lookups) &&
        hasEllipticFollowerAt(connectiveSplitAt);
      const negativeCopulaCorrection = hasEllipticFollowerAt(connectiveSplitAt)
        ? negativeCopulaCorrectionShapeAt(tokens, index, connectiveSplitAt)
        : null;
      const followingPredicate = hasFollowingClausePredicateEvidence(clauseCursorAt(connectiveSplitAt));
      const closureFollowingPredicate = hasFollowingClausePredicateEvidence(
        clauseCursorAt(connectiveSplitAt),
        (openingIdx) => balancedDelimiterSpanOpeningAtIn(balancedDelimiterSpans, openingIdx)
      );
      const constructionGoverned =
        hasFollowingTeEvaluationHeadEvidence(clauseCursor, connectiveSplitAt, lookups) ||
        conditionalToConsequent ||
        conditionalBaToConsequent ||
        ellipticFollower ||
        negativeCopulaCorrection !== null;
      const teClosureLeft = teChuushiClosureLeftAt(tokens, index, connectiveSplitAt);
      const teClosureRightShape = teClosureLeft === null ? null : chuushiClosureRightUtteranceShape(tokens, connectiveSplitAt);
      const teClosureRight = teClosureLeft === null
        ? null
        : chuushiClosureRight({
          governedBy: constructionGoverned ? "construction" : closureFollowingPredicate ? "predicate" : null,
          ...chuushiClosureDetachedRightInputs(tokens, teClosureLeft.followerIdx, lookups),
          ownTopicQuestion: teClosureRightShape?.topicIdx !== undefined && teClosureRightShape.closesAsQuestion,
          elliptic:
            chuushiClosureFollowerOpensContent(tokens[teClosureLeft.followerIdx]) &&
            hasEllipticFollowerClauseEvidence(
              tokens,
              connectiveSplitAt,
              n,
              (clauseTokens, idx) => {
                const candidate = clauseTokens[idx];
                return candidate !== undefined && isClausePredicateEvidenceToken(candidate);
              },
              "independent_word"
            )
        });
      const teConnectiveNextIdx = nextNonSpaceIndex(tokens, index + 1, n);
      if (
        isTeConnectiveToken(token) &&
        connectiveSplitAt === index + 1 &&
        !constructionGoverned &&
        teConnectiveNextIdx !== null &&
        hardTerminalPunctuationSurfaceClassForToken(tokens[teConnectiveNextIdx], teConnectiveNextIdx) !== null
      ) {
        continue;
      }
      if (!followingPredicate && !constructionGoverned && teClosureRight === null) {
        continue;
      }
      if (!hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)) {
        continue;
      }
      if (negativeCopulaCorrection !== null) {
        negativeCopulaCorrections.set(negativeCopulaCorrection.splitAt, negativeCopulaCorrection);
      }
      if (teClosureLeft !== null && teClosureRight !== null) {
        teUtteranceActs.set(teClosureLeft.connectiveIdx, {
          kind: "teUtteranceAct",
          connectiveIdx: teClosureLeft.connectiveIdx,
          predicateIdx: teClosureLeft.predicateIdx,
          position: "closure_left",
          iisashiSignals: []
        });
        chuushiClosureCandidates.set(connectiveSplitAt, {
          kind: "chuushiClosure",
          hostKind: "te",
          connectiveIdx: teClosureLeft.connectiveIdx,
          splitAt: teClosureLeft.splitAt,
          predicateIdx: teClosureLeft.predicateIdx,
          followerIdx: teClosureLeft.followerIdx,
          ...teClosureRight,
          ...(teClosureRightShape?.topicIdx === undefined ? {} : { rightTopicIdx: teClosureRightShape.topicIdx })
        });
      }
      const opensNewBoundary = !followingPredicate && !constructionGoverned;
      upsert(connectiveSplitAt, "connective", opensNewBoundary ? { witnessesWhitespaceSplit: false } : {});
      continue;
    }
    if (pos0 === 助詞 && pos1 === 格助詞 && token.surface === "と") {
      if (isTerminalQuoteFocusEvenTail(clauseCursorAt(index + 1))) {
        continue;
      }
      const quotedConcessivePattern = compositeConnectivePatternRelationAt(clauseCursorAt(index), {
        consumers: ["clause_layout"],
        lookupConnectiveKind: lookupConnectiveBySurface
      });
      if (
        quotedConcessivePattern?.connectiveKind === "quoted_concessive" &&
        hasFollowingClausePredicateEvidence(clauseCursorAt(quotedConcessivePattern.span.endExclusive)) &&
        hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
      ) {
        upsert(quotedConcessivePattern.span.endExclusive, "connective");
        continue;
      }
      const prevIdx = previousNonSpaceIndex(tokens, index);
      const nextIdx = nextNonSpaceIndex(tokens, index + 1);
      const nextTok = nextIdx === null ? undefined : tokens[nextIdx];
      const leftIsVolitionalConcessive = prevIdx !== null && isVolitionalConcessiveBoundaryLeft(tokens, prevIdx);
      const adjectivalConcessiveTomo = adjectivalConcessiveTomoRelationAt(tokens, index, {
        consumers: ["clause_layout"]
      });
      const lexicalBinding = pairedConcessiveByMarker.has(index)
        ? null
        : volitionalLexicalBindingAt(tokens, index, clauseStartSinceLastBoundary(raw, index), lookups);
      if (lexicalBinding !== null) {
        volitionalIntentBindings.set(index, lexicalBinding);
      }
      const volitionalIntentBinding = leftIsVolitionalConcessive &&
        (lexicalBinding !== null || volitionalAttemptMarkerAt(tokens, index) !== null);
      const volitionalAttempt = volitionalIntentBinding;
      const volitionalConcessiveTomoMo =
        leftIsVolitionalConcessive &&
        !volitionalAttempt &&
        nextTok !== undefined &&
        nextTok.surface === "も" &&
        (nextTok.pos & POS0) === 助詞;
      const leftPos0 = prevIdx !== null ? (tokens[prevIdx]!.pos & POS0) : 0;
      const leftIsVerbOrAdjective = pos0in(leftPos0, INFLECTABLE_BITS);
      const leftIsCopula = prevIdx !== null && isCopulaConditionalBoundaryLeft(tokens[prevIdx]);
      const followedByCopulaQuoteFocusEven = leftIsCopula && quoteFocusEvenSequenceStartsAt(tokens, nextIdx);
      const followedByNonConditionalMarker =
        nextTok !== undefined &&
        !volitionalConcessiveTomoMo &&
        adjectivalConcessiveTomo === null &&
        (volitionalIntentBinding ||
          ((nextTok.pos & POS0) === 助詞 && (nextTok.surface === "の" || nextTok.surface === "か" || nextTok.surface === "は" || nextTok.surface === "も" || followedByCopulaQuoteFocusEven)) ||
          isSuruVerbToken(nextTok));
      const concessiveSplitAt = adjectivalConcessiveTomo !== null
        ? adjectivalConcessiveTomo.span.endExclusive
        : volitionalConcessiveTomoMo && nextIdx !== null ? nextIdx + 1 : index + 1;
      const canUseLooseConditionalConsequent =
        !leftIsVolitionalConcessive && adjectivalConcessiveTomo === null && (leftIsVerbOrAdjective || leftIsCopula);
      const followingConsequent = canUseLooseConditionalConsequent
        ? hasFollowingConditionalConsequent(clauseCursorAt(concessiveSplitAt))
        : hasFollowingClausePredicateEvidence(clauseCursorAt(concessiveSplitAt));
      const quoteReadingBlocksConcessiveTo =
        isQuoteContentTailMarker(runtimeCursorAt(index), lookups) ||
        isQuotativeToTokensWide(runtimeCursorAt(index), lookups, { scope: "sentence" });
      if (
        prevIdx !== null &&
        (isFinitePredicateBoundaryLeft(tokens[prevIdx]) || leftIsVolitionalConcessive || adjectivalConcessiveTomo !== null) &&
        !followedByNonConditionalMarker &&
        (adjectivalConcessiveTomo !== null || !quoteReadingBlocksConcessiveTo) &&
        followingConsequent &&
        hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
      ) {
        upsert(concessiveSplitAt, "connective");
      }
      continue;
    }
    const suffixTaggedConcessiveTomo = adjectivalConcessiveTomoRelationAt(tokens, index, {
      consumers: ["clause_layout"]
    });
    if (
      suffixTaggedConcessiveTomo !== null &&
      suffixTaggedConcessiveTomo.span.start === index &&
      hasFollowingClausePredicateEvidence(clauseCursorAt(suffixTaggedConcessiveTomo.span.endExclusive)) &&
      hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
    ) {
      upsert(suffixTaggedConcessiveTomo.span.endExclusive, "connective");
      continue;
    }
    if (
      (isFinitePredicateAdversativeGaBoundary(tokens, index) ||
        isVolitionalConcessiveGaBoundary(tokens, index)) &&
      hasFollowingClausePredicateEvidence(clauseCursorAt(index + 1)) &&
      hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
    ) {
      upsert(index + 1, "connective");
      continue;
    }
    const kaCursor = runtimeCursorAt(index);
    if (anaphoricConjectureSelfQuestionBoundaryAt(tokens, index, lookups)) {
      const punctuationIdx = nextNonSpaceIndex(tokens, index + 1, tokens.length);
      if (punctuationIdx !== null) {
        anaphoricConjectureSelfQuestions.push({
          kind: "anaphoric_conjecture_self_question",
          markerIdx: index,
          punctuationIdx,
        });
      }
      upsert(punctuationIdx === null ? index + 1 : punctuationIdx + 1, "punctuation");
      continue;
    }
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
      upsert(index + 1, "punctuation");
      continue;
    }
    if (
      ownedByExistingKaStructure
    ) {
      if (isLexicalParticleAdverbialBoundaryShield(clauseCursorAt(index), lookups, options, lexicalAdverbialAffiliations)) {
        continue;
      }
      if (kaNoYouNiSimileRelationAt(tokens, index, lookups) !== null) {
        continue;
      }
      upsert(index + 1, "connective");
      continue;
    }
    const monoNoConsumed = matchMonoNoConcessiveConnectiveStart(runtimeCursorAt(index));
    if (monoNoConsumed !== null) {
      const splitAt = index + monoNoConsumed;
      if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
        upsert(splitAt, "connective");
        continue;
      }
    }
    const noNiConsumed = matchNoNiConcessiveConnectiveStart(runtimeCursorAt(index), lookups);
    if (noNiConsumed !== null) {
      const splitAt = index + noNiConsumed;
      if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
        upsert(splitAt, "connective");
        continue;
      }
      let runEnd = splitAt;
      for (;;) {
        const nextIdx = nextNonSpaceIndex(tokens, runEnd);
        if (nextIdx === null || !isTerminalParticleToken(tokens[nextIdx]!)) {
          break;
        }
        runEnd = nextIdx + 1;
      }
      if (detachedRemainderCannotGovernNominalPhrase(tokens, runEnd, lookups)) {
        upsert(runEnd, "connective");
        continue;
      }
    }
    const nodeReasonConsumed = matchNodeReasonConnectiveStart(clauseCursorAt(index), lookups);
    if (nodeReasonConsumed !== null) {
      const splitAt = index + nodeReasonConsumed;
      if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
        upsert(splitAt, "connective");
        continue;
      }
    }
    const likenessConditionEnd = likenessEvaluativeConditionMarkerEndAt(runtimeCursorAt(index));
    if (likenessConditionEnd !== null) {
      const splitAt = likenessConditionEnd;
      if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
        upsert(splitAt, "connective");
        continue;
      }
    }
    if (isPostpositionalClauseConnectiveToken(token)) {
      const splitAt = index + 1;
      if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
        upsert(splitAt, "connective");
        continue;
      }
    }
    const conjecturalCopulaEndpoint = conjecturalCopulaAttributiveEndpointClaimed(runtimeTokens, index);
    const renyouCompoundPrenominalEndpoint =
      isRenyouCompoundPrenominalAttributiveEndpoint(tokens, index) &&
      renyouCompoundPassiveHeadAdmitted(tokens, index, lookups) &&
      !ownsCaseParticleSinceLastBoundary(tokens, index, raw) &&
      !renyouLexicalNounCompoundHeadAdmittedAt(runtimeTokens, index, lookups, options.lexicalRenyouHeadClaims);
    const homophonousTerminalEndpoint =
      !isAttributiveInflection(token.pos) &&
      !conjecturalCopulaEndpoint &&
      !renyouCompoundPrenominalEndpoint &&
      isAttributiveOrHomophonousTerminalInflection(token.pos);
    if (
      isAttributiveInflection(token.pos) ||
      conjecturalCopulaEndpoint ||
      renyouCompoundPrenominalEndpoint ||
      homophonousTerminalEndpoint
    ) {
      if (isInsideClauseOpaqueNominalFrameSurface(tokens, index)) {
        continue;
      }
      if (adjectiveAdverbialModifiedPredicate(tokens, index, adjectiveAdverbialModifierLookupOptions(lookups)) !== null) {
        continue;
      }
      const markerIdx = previousNonSpaceIndex(tokens, index);
      if (markerIdx !== null) {
        const toiuHeadIdx = toiuAttributiveHeadIndex(tokens, markerIdx, n);
        const toiuSplitAt = toiuAttributiveBoundarySplitAt(tokens, markerIdx, n, lookups);
        if (toiuHeadIdx !== null && toiuSplitAt !== null) {
          upsert(toiuSplitAt, "attributive");
          if (raw.get(toiuSplitAt) === "attributive") {
            attributiveModifierChainHeadBySplitAt.set(toiuSplitAt, toiuHeadIdx);
            quoteAttributiveCarrierBySplitAt.set(toiuSplitAt, [markerIdx, toiuHeadIdx]);
          }
          continue;
        }
      }
      const next = nextNonSpaceIndex(tokens, index + 1);
      const likenessOwnedHeadReach = isLikenessModalAdnominalTailEnd(runtimeTokens, index);
      if (!homophonousTerminalEndpoint && next !== null && isAttributiveHeadNounishToken(tokens[next])) {
        const monoNoConsumed = matchMonoNoConcessiveConnectiveStart(runtimeCursorAt(next));
        if (monoNoConsumed !== null) {
          const splitAt = next + monoNoConsumed;
          if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
            upsert(splitAt, "connective");
            continue;
          }
        }
        const noNiConsumed = matchNoNiConcessiveConnectiveStart(runtimeCursorAt(next), lookups);
        if (noNiConsumed !== null) {
          const splitAt = next + noNiConsumed;
          if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
            upsert(splitAt, "connective");
            continue;
          }
        }
        upsert(next, "attributive");
        const fastPathDerivedHeadIdx = attachedDerivedNominalHeadIndexAt(
          tokens,
          next,
          n,
          (hostIdx) => derivedNominalPhraseHeadIndexAt(tokens, hostIdx),
          likenessOwnedHeadReach ? AUTHORED_PAUSE_SEPARATIONS : DETACHED_SEPARATIONS
        );
        if (fastPathDerivedHeadIdx !== null && raw.get(next) === "attributive") {
          attributiveModifierChainHeadBySplitAt.set(next, fastPathDerivedHeadIdx);
        }
        if (renyouCompoundPrenominalEndpoint && raw.get(next) === "attributive") {
          renyouCompoundPrenominalSplits.add(next);
        }
      } else if (
        !homophonousTerminalEndpoint &&
        next !== null &&
        EXPLICIT_OPENING_QUOTATION_SURFACES.has(tokens[next]?.surface ?? "")
      ) {
        const inside = nextNonSpaceIndex(tokens, next + 1);
        if (inside !== null && NOUNISH_POS0_NUM.has((tokens[inside]?.pos ?? 0) & POS0)) {
          const afterInside = nextNonSpaceIndex(tokens, inside + 1);
          if (afterInside !== null && isExplicitQuoteClosingToken(tokens[afterInside]!)) {
            upsert(next, "attributive");
          }
        }
      } else if (
        next !== null &&
        token.transparentPauseAfter !== true &&
        (!homophonousTerminalEndpoint ||
          (!isAttributiveHeadNounishToken(tokens[next]) &&
            (!separatedAs(tokens, next, DETACHED_SEPARATIONS) ||
              governedReadingLicensedGapAt(whitespaceAdnominalLicenses, index, next) !== undefined)))
      ) {
        const modifierChainHeadIdx = attributiveEndpointModifierChainHeadIndex(
          tokens,
          next,
          lookups,
          likenessOwnedHeadReach,
          true,
          governedReadingLicensedGapAt(whitespaceAdnominalLicenses, index, next) ??
            firstAdnominalOnlyFormLicensedGapFrom(whitespaceAdnominalLicenses, next, n),
          undefined,
          governedReadingLicensedGapAt(whitespaceAdnominalLicenses, index, next) === undefined
            ? undefined
            : interrogativeAdverbAt(runtimeTokens, lookups)
        );
        if (modifierChainHeadIdx !== null) {
          upsert(next, "attributive");
          if (raw.get(next) === "attributive") {
            attributiveModifierChainHeadBySplitAt.set(next, modifierChainHeadIdx);
          }
        }
      }
    }
  }
  for (let index = 1; index < n; index += 1) {
    if (isReduplicatedPredicateOnsetAt(tokens, index, lookups, (splitAt) => raw.get(splitAt) === "attributive")) {
      upsert(index, "punctuation", { witnessesWhitespaceSplit: false });
    }
    if (isTerminalOnlyPredicateUnmarkedOnsetAt(tokens, index, clauseCursorAt(index))) {
      upsert(index, "punctuation", { witnessesWhitespaceSplit: false });
    }
  }
  const detachedTerminalNodaClosures = detachedTerminalNodaClauseClosureSplits(tokens, lookups);
  for (const splitAt of detachedTerminalNodaClosures) {
    upsert(splitAt, "punctuation");
  }
  const provisionalEvents = sortedClauseBoundaryEvents(
    raw,
    pairedConcessiveBySplitAt,
    attributiveModifierChainHeadBySplitAt,
    renyouCompoundPrenominalSplits,
    chuushiClosureCandidates
  );
  const provisionalLayout = protoLayoutFromBoundaryEvents(tokens, provisionalEvents, quoteSpans);
  const junctureCohesionSources: JunctureCohesionSources = {
    balancedDelimiterSpans,
    bareKeijoujiAttributiveHeads,
    copulaConcessiveConditions: copulaConcessiveConditionEvidenceWithLayout(runtimeTokens, lookups, provisionalLayout)
  };
  const bridgedPunctuationEnds = new Set(
    questionContentPunctuationBridgeCandidates
      .filter((candidate) => hasQuestionContentContinuationAcrossSubjectTopicBridge(
        runtimeTokens,
        candidate.kaIdx,
        candidate.span.endExclusive,
        provisionalLayout,
        lookups,
      ))
      .map((candidate) => candidate.span.endExclusive),
  );
  const preRenyouEvents = provisionalEvents.filter((event) => !bridgedPunctuationEnds.has(event.splitAt));
  const decorativeTerminalClosures = decorativeTerminalClosureIndices(tokens, lookups);
  const preRenyouLayout = protoLayoutFromBoundaryEvents(tokens, preRenyouEvents, quoteSpans, {
    balancedDelimiterSpans,
    decorativeTerminalClosures
  });
  let renyouClosureAdded = false;
  const eventlessRenyouClosures = new Map<number, ChuushiClosureEvidence>();
  const renyouJunctureScan = collectRenyouChuushiClosures(runtimeTokens, preRenyouLayout, raw, lookups, options.lexicalRenyouHeadClaims, options.renyouVerbReadings);
  for (const closure of renyouJunctureScan.closures.values()) {
    if (closure.boundaryOwner !== undefined) {
      eventlessRenyouClosures.set(closure.splitAt, closure);
      continue;
    }
    if (!raw.has(closure.splitAt)) {
      upsert(closure.splitAt, "connective", { witnessesWhitespaceSplit: false });
    }
    if (raw.get(closure.splitAt) === "connective") {
      chuushiClosureCandidates.set(closure.splitAt, closure);
      renyouClosureAdded = true;
    }
  }
  const events = renyouClosureAdded
    ? sortedClauseBoundaryEvents(
      raw,
      pairedConcessiveBySplitAt,
      attributiveModifierChainHeadBySplitAt,
      renyouCompoundPrenominalSplits,
      chuushiClosureCandidates
    ).filter((event) => !bridgedPunctuationEnds.has(event.splitAt))
    : preRenyouEvents;
  const evidenceLayout = renyouClosureAdded
    ? protoLayoutFromBoundaryEvents(tokens, events, quoteSpans, { balancedDelimiterSpans, decorativeTerminalClosures })
    : preRenyouLayout;
  const onsetScope: UtteranceOnsetLeftBoundaryScope = {
    balancedDelimiterSpanEndingAt: (closingIdx) =>
      balancedDelimiterSpanEndingAtIn(balancedDelimiterSpans, closingIdx),
    pauseEdgeArgumentScopeAt: (edgeIdx) => pauseEdgeArgumentScopeAt(evidenceLayout, tokens, edgeIdx)
  };
  demoDiscourseLeftBoundaries.push(
    ...collectUtteranceOnsetLeftBoundaryEvidence(tokens, lookups, onsetScope)
  );
  const clauseStarts = [0, ...events.map((event) => event.splitAt)];
  const clauseEnds = [...events.map((event) => event.splitAt), n];
  const utteranceClosureRuns = collectUtteranceClosureRunEvidence(tokens, evidenceLayout, lookups);
  const detachedUtteranceOnsetBoundaries = collectDetachedUtteranceOnsetBoundaries(tokens);
  for (const [index] of tokens.entries()) {
    if (teUtteranceActs.has(index)) {
      continue;
    }
    const finalLeft = teUtteranceFinalLeftAt(tokens, index);
    if (finalLeft !== null) {
      teUtteranceActs.set(index, {
        kind: "teUtteranceAct",
        connectiveIdx: finalLeft.connectiveIdx,
        predicateIdx: finalLeft.predicateIdx,
        position: "utterance_final",
        iisashiSignals: teIisashiSignalsAt(tokens, finalLeft, teRequestSets)
      });
    }
  }
  const terminalPunctuationRuns = collectClauseTerminalPunctuationRunEvidence(
    tokens,
    clauseStarts.map((start, index) => ({
      start,
      endExclusive: clauseEnds[index] ?? n
    }))
  );
  return {
    events,
    demoDiscourseLeftBoundaries,
    hardTerminalEllipsisRuns: hardTerminalEllipsisRuns.filter((run) =>
      !bridgedPunctuationEnds.has(run.span.endExclusive)
    ),
    anaphoricConjectureSelfQuestions,
    terminalPunctuationRuns,
    copulaPauseBridges: collectCopulaPauseBridgeEvidence(
      tokens,
      isCopulaTailContinuationStart,
      punctuationBreakIndices,
      (edgeIdx) => pauseEdgeVerdictAt(tokens, edgeIdx, onsetScope.pauseEdgeArgumentScopeAt(edgeIdx))
    ),
    balancedDelimiterSpans,
    bareKeijoujiAttributiveHeads,
    renyouCompoundPrenominalHeads: new Set(
      [...renyouCompoundPrenominalSplits].filter((splitAt) => raw.get(splitAt) === "attributive")
    ),
    quoteAttributiveCarrierHeads: new Map(
      [...quoteAttributiveCarrierBySplitAt]
        .filter(([splitAt]) => events.some((event) => event.splitAt === splitAt && event.kind === "attributive"))
        .map(([, markerAndHead]) => markerAndHead)
    ),
    decorativeTerminalClosures,
    detachedTerminalNodaClosures,
    utteranceClosureRuns,
    punctuationBreakIndices,
    negativeCopulaCorrections,
    chuushiClosures: new Map([
      ...events.flatMap((event) => event.chuushiClosure === undefined ? [] : [[event.splitAt, event.chuushiClosure] as const]),
      ...eventlessRenyouClosures
    ]),
    renyouJunctures: renyouJunctureScan.junctures,
    teUtteranceActs: new Map([...teUtteranceActs].filter(([, act]) =>
      act.position === "utterance_final" ||
      events.some((event) => event.chuushiClosure?.connectiveIdx === act.connectiveIdx))),
    whitespaceChunkBreakWitnesses: whitespaceChunkBreakWitnessesFrom(tokens, {
      events,
      nonWitnessSplits: new Set(
        [...nonWhitespaceWitnessSplits].filter((splitAt) => !whitespaceWitnessSplits.has(splitAt))
      ),
      utteranceOnsets: demoDiscourseLeftBoundaries,
      utteranceClosureRuns,
      detachedTerminalNodaClosures,
      detachedUtteranceOnsetBoundaries
    }),
    detachedUtteranceOnsetBoundaries,
    whitespaceJunctures: collectWhitespaceJunctures(
      tokens,
      runtimeTokens,
      lookups,
      junctureCohesionSources,
      whitespaceAdnominalLicenses
    ),
    pauseJunctureBoundaryEvidence,
    pauseJunctures: collectPauseJunctures(tokens, runtimeTokens, lookups, junctureCohesionSources),
    lexicalAdverbialAffiliations,
    volitionalIntentBindings,
  };
}

function renyouClosureBoundaryOwner(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  splitAt: number,
  raw: ReadonlyMap<number, BoundaryKind>,
  cohesion: readonly RenyouJunctureCohesionEvidence[]
): NonNullable<ChuushiClosureEvidence["boundaryOwner"]> | null {
  let punctuationEnd = splitAt;
  while (punctuationEnd < tokens.length && isClausePunctuationToken(tokens[punctuationEnd])) {
    punctuationEnd += 1;
  }
  if (punctuationEnd > splitAt && raw.get(punctuationEnd) === "punctuation") return "pause_punctuation";
  for (const kind of ["lexical_compound", "lexical_head", "nominal_frame"] as const) {
    if (cohesion.some((evidence) => evidence.kind === kind)) return kind;
  }
  if (isAdjectivalRenyouToken(tokens[idx])) return "adjectival_renyou";
  return null;
}

function renyouJunctureCohesionEvidence(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  left: { readonly splitAt: number; readonly followerIdx: number; readonly lexicalCompoundCandidate: boolean },
  raw: ReadonlyMap<number, BoundaryKind>,
  claims: LexicalRenyouHeadClaims | undefined,
  lookups: LookupTables,
  layout: ProtoClauseLayout
): readonly RenyouJunctureCohesionEvidence[] {
  const evidence: RenyouJunctureCohesionEvidence[] = [];
  if (raw.get(left.splitAt) === "attributive") evidence.push({ kind: "attributive_endpoint" });
  if (isHostedConnectiveMarkerAt(tokens, left.followerIdx)) {
    evidence.push({ kind: "hosted_connective", markerIdx: left.followerIdx });
  }
  if (left.lexicalCompoundCandidate && claims?.registeredCompoundV1s.has(idx) === true) {
    evidence.push({ kind: "lexical_compound" });
  }
  if (claims?.nonPredicateHeads.has(idx) === true) evidence.push({ kind: "lexical_head" });
  if (isInsideAnyNominalFrameSurface(tokens, idx, lookups, layout)) evidence.push({ kind: "nominal_frame" });
  evidence.push(...renyouNominalHeadCohesion(tokens, idx, lookups, claims));
  return evidence;
}

function renyouNominalHeadCohesion(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables,
  claims: LexicalRenyouHeadClaims | undefined
): readonly RenyouJunctureCohesionEvidence[] {
  const admission = renyouNominalHeadAdmissionAt(tokens, idx, lookups, {
    lexicalNounCompoundEnd: claims?.lexicalNounCompoundEnds.get(idx) ?? null
  });
  if (admission === null) return [];
  switch (admission.kind) {
    case "derivational_suffix":
    case "noun_compound_suffix":
      return [{ kind: "nominal_suffix_head", suffixIdx: admission.suffixIdx }];
    case "honorific_prefix_compound":
      return [{ kind: "nominal_compound_head", spanEnd: admission.hostIdx }];
    case "lexical_noun_compound":
      return [{ kind: "nominal_compound_head", spanEnd: admission.nounEnd }];
    case "honorific_prefix":
    case "bare_case_particle":
      return [];
  }
}

function renyouLexicalNounCompoundHeadAdmittedAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables,
  claims: LexicalRenyouHeadClaims | undefined
): boolean {
  const nounEnd = claims?.lexicalNounCompoundEnds.get(idx);
  return nounEnd !== undefined &&
    renyouNominalHeadAdmissionAt(tokens, idx, lookups, { lexicalNounCompoundEnd: nounEnd })?.kind === "lexical_noun_compound";
}

function isAdjectivalRenyouToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    ((token.pos & POS0) === 形容詞0 || (token.pos & (POS0 | POS1)) === (接尾辞 | 形容詞的));
}

function collectRenyouChuushiClosures(
  tokens: readonly RuntimeHaruToken[],
  layout: ProtoClauseLayout,
  raw: ReadonlyMap<number, BoundaryKind>,
  lookups: LookupTables,
  claims: LexicalRenyouHeadClaims | undefined,
  renyouVerbReadings: RenyouVerbReadingFacts | undefined
): {
  readonly closures: ReadonlyMap<number, ChuushiClosureEvidence>;
  readonly junctures: ReadonlyMap<number, RenyouJunctureEvidence>;
} {
  const closures = new Map<number, ChuushiClosureEvidence>();
  const junctures = new Map<number, RenyouJunctureEvidence>();
  const isPredicateStart = (candidateTokens: readonly RuntimeHaruToken[], idx: number): boolean =>
    isSupportedClauseStart(candidateTokens, idx, lookups);
  const rightStructure: ClauseStartRightStructure<RuntimeHaruToken> = {
    isClauseCoordinationPreludeAt: (candidateTokens, index) =>
      isChuushiClauseCoordinationPreludeToken(candidateTokens[index], lookups),
    isNominalRunPredicateAt: (candidateTokens, start, predicateIdx) =>
      isChuushiNominalRunPredicateAt(candidateTokens, start, predicateIdx, lookups),
    adnominalHeadStartAfterPredicate: (predicateIdx) => {
      const clause = layout.clauseOfToken(predicateIdx);
      return clause !== undefined && raw.get(clause.end) === "attributive" ? clause.end : null;
    }
  };
  for (let idx = 0; idx < tokens.length; idx += 1) {
    const left = renyouChuushiClosureLeftAt(tokens, idx, lookups);
    if (left === null) {
      const cohesion = renyouNominalHeadCohesion(tokens, idx, lookups, claims);
      if (cohesion.length > 0) {
        junctures.set(idx + 1, renyouJunctureEvidence({
          hostIdx: idx,
          splitAt: idx + 1,
          followerIdx: idx + 1,
          boundary: [],
          cohesion
        }));
      }
      continue;
    }
    const cohesion = renyouJunctureCohesionEvidence(tokens, idx, left, raw, claims, lookups, layout);
    const reach = Math.min(layout.projectionEvidenceWindowForToken(tokens, idx)?.end ?? idx + 1, tokens.length);
    const isFrameInternalPauseAt = (candidateTokens: readonly RuntimeHaruToken[], index: number): boolean => {
      const token = candidateTokens[index];
      return index > idx && index < reach && token !== undefined && isClauseEvidenceTransparentPunctuation(token);
    };
    const verbReadingHost = renyouVerbReadings?.has(idx) === true;
    const frameStructure: ClauseStartRightStructure<RuntimeHaruToken> = {
      ...rightStructure,
      ...(verbReadingHost
        ? {
          nominalRunHostPrecedesAdnominalTransit: true,
          isNominalRunPredicateAt: (candidateTokens: readonly RuntimeHaruToken[], start: number, predicateIdx: number) =>
            isVerbReadingFollowerRunPredicateAt(candidateTokens, start, predicateIdx, lookups, (index) =>
              isFrameInternalPauseAt(candidateTokens, index)),
          isAdjunctProvenNominalAt: (candidateTokens: readonly RuntimeHaruToken[], index: number) =>
            copulaDeHostProvesAdjunctReading(candidateTokens, index),
          opaqueNominalSpanEndAt: (_candidateTokens: readonly RuntimeHaruToken[], index: number) =>
            layout.balancedDelimiterSpanOpeningAt(index)?.endExclusive ?? null,
          isMeasurePhraseHeadAt: (candidateTokens: readonly RuntimeHaruToken[], index: number) =>
            isRealizedQuantityPhraseHead(candidateTokens, index)
        }
        : {}),
      isFrameInternalPauseAt
    };
    const governed = renyouChuushiClosureGovernedAfter(tokens, idx, reach, isPredicateStart, lookups, frameStructure);
    const rightShape = chuushiClosureRightUtteranceShape(tokens, left.splitAt);
    const detachedInputs = chuushiClosureDetachedRightInputs(tokens, left.followerIdx, lookups);
    const predicateVisible = hasFollowingClausePredicateEvidence(
      new TokenCursor<ClauseToken>(tokens, left.splitAt, tokens.length),
      (openingIdx) => layout.balancedDelimiterSpanOpeningAt(openingIdx)
    );
    const onsetEvidence = detachedInputs.separatedUtteranceHead || detachedInputs.discourseOnsetHead;
    const predicateGoverns = governed || (predicateVisible && onsetEvidence);
    const closureRight = chuushiClosureRight({
      governedBy: predicateGoverns ? "predicate" : null,
      ...detachedInputs,
      ownTopicQuestion: rightShape.topicIdx !== undefined && rightShape.closesAsQuestion,
      elliptic: !governed && renyouChuushiClosureEllipticAfter(tokens, left.followerIdx, layout, {
        isPredicateStart,
        lookups,
        reach,
        rightStructure: frameStructure,
        markedFragment: {
          splitAt: left.splitAt,
          reach,
          isPredicateEvidenceAt: (candidateTokens, index) => {
            const candidate = candidateTokens[index];
            return (candidate !== undefined && isClausePredicateEvidenceToken(candidate)) ||
              isPredicateStart(candidateTokens, index);
          }
        }
      })
    });
    const right = closureRight?.right ?? null;
    const juncture = renyouJunctureEvidence({
      hostIdx: idx,
      splitAt: left.splitAt,
      followerIdx: left.followerIdx,
      boundary: right === null ? [] : [{ kind: "chuushi_closure", right }],
      cohesion
    });
    if (juncture.verdict !== null) {
      junctures.set(left.splitAt, juncture);
    }
    if (
      right === null ||
      juncture.verdict === "cohesion" ||
      (juncture.verdict === "undecided" && undecidedRenyouClosureDisposition(cohesion) === "suppress")
    ) {
      continue;
    }
    const boundaryOwner = renyouClosureBoundaryOwner(tokens, idx, left.splitAt, raw, cohesion);
    closures.set(left.splitAt, {
      kind: "chuushiClosure",
      hostKind: "renyou",
      connectiveIdx: left.connectiveIdx,
      splitAt: left.splitAt,
      predicateIdx: left.predicateIdx,
      followerIdx: left.followerIdx,
      ...closureRight!,
      ...(boundaryOwner === null ? {} : { boundaryOwner })
    });
  }
  return { closures, junctures };
}

interface WhitespaceChunkBreakInputs {
  readonly events: readonly ClauseBoundaryEvent[];
  readonly nonWitnessSplits: ReadonlySet<number>;
  readonly utteranceOnsets: readonly DemoDiscourseLeftBoundaryEvidence[];
  readonly utteranceClosureRuns: ReadonlyMap<number, UtteranceClosureRunEvidence>;
  readonly detachedTerminalNodaClosures: ReadonlySet<number>;
  readonly detachedUtteranceOnsetBoundaries: ReadonlyMap<number, DetachedUtteranceOnsetEvidence>;
}

function whitespaceChunkBreakWitnessesFrom(
  tokens: readonly ClauseToken[],
  inputs: WhitespaceChunkBreakInputs
): ReadonlyMap<number, readonly WhitespaceJunctureBoundaryEvidence[]> {
  const witnesses = new Map<number, WhitespaceJunctureBoundaryEvidence[]>();
  const add = (index: number, witness: WhitespaceJunctureBoundaryEvidence): void => {
    const token = tokens[index];
    const runOrdinal = token?.whitespaceBefore?.runOrdinal;
    if (runOrdinal === undefined || token === undefined) {
      return;
    }
    const p0 = token.pos & POS0;
    if ((p0 === 助詞 || p0 === 助動詞) &&
      demoDiscourseUtteranceInitialMatchLengthAt(tokens, index) === null) {
      return;
    }
    const registered = witnesses.get(runOrdinal);
    if (registered === undefined) {
      witnesses.set(runOrdinal, [witness]);
    } else if (!registered.some((existing) => sameWhitespaceJunctureWitness(existing, witness))) {
      registered.push(witness);
    }
  };
  for (const event of inputs.events) {
    if (inputs.nonWitnessSplits.has(event.splitAt)) {
      continue;
    }
    add(event.splitAt, { kind: "boundary_event", event: event.kind });
  }
  for (const onset of inputs.utteranceOnsets) {
    add(onset.connectiveIdx, { kind: "utterance_onset" });
  }
  for (const splitAt of inputs.detachedTerminalNodaClosures) {
    add(splitAt, { kind: "detached_noda_closure" });
  }
  for (const onset of inputs.detachedUtteranceOnsetBoundaries.values()) {
    add(onset.gapIdx, { kind: "detached_utterance_onset" });
  }
  for (let index = 1; index < tokens.length; index += 1) {
    if (tokens[index]?.whitespaceBefore === undefined) {
      continue;
    }
    const closureRun = inputs.utteranceClosureRuns.get(index);
    if (closureRun !== undefined) {
      add(index, { kind: "utterance_closure_run", run: closureRun.run });
      continue;
    }
    if (hasSeparatedFinitePredicateBoundary(tokens, index)) {
      add(index, { kind: "separated_finite" });
    }
    if (hasImperativeClosureBeforeGap(tokens, index)) {
      add(index, { kind: "imperative_closure" });
    }
  }
  return witnesses;
}

function sameWhitespaceJunctureWitness(
  left: WhitespaceJunctureBoundaryEvidence,
  right: WhitespaceJunctureBoundaryEvidence
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "boundary_event" && right.kind === "boundary_event") {
    return left.event === right.event;
  }
  if (left.kind === "utterance_closure_run" && right.kind === "utterance_closure_run") {
    return left.run === right.run;
  }
  return true;
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

function attributiveEndpointModifierChainHeadIndex(
  tokens: readonly ClauseToken[],
  next: number,
  lookups: LookupTables,
  likenessOwnedHeadReach: boolean,
  boundaryEventOnset: boolean,
  permeableGapIdx?: number,
  nominalUnitHeadIndexAt?: (idx: number) => number | null,
  isPredicateBoundAdverbAt?: (idx: number) => boolean
): number | null {
  const admitsUnmarkedAdnominalHost = likenessOwnedHeadReach || boundaryEventOnset;
  return prenominalModifierChainHeadIndex(tokens, next, tokens.length, {
    auxiliaryStem: "opaque",
    separationRefused: likenessOwnedHeadReach
      ? AUTHORED_PAUSE_SEPARATIONS
      : DETACHED_SEPARATIONS,
    reach: likenessOwnedHeadReach ? "likeness_owned_phrase" : "adnominal_stack",
    ...(admitsUnmarkedAdnominalHost
      ? { isUnmarkedAdnominalHostAt: (hostIdx: number) => isBareKeijoujiDirectAttributiveHost(tokens, hostIdx, lookups) }
      : {}),
    derivedNominalHeadIndexAt: (hostIdx) => derivedNominalPhraseHeadIndexAt(tokens, hostIdx),
    ...(permeableGapIdx === undefined ? {} : { permeableGapIdx }),
    ...(nominalUnitHeadIndexAt === undefined ? {} : { nominalUnitHeadIndexAt }),
    ...(isPredicateBoundAdverbAt === undefined ? {} : { isPredicateBoundAdverbAt })
  });
}

export function genitiveNominalContinuationHeadIndex(
  tokens: readonly ClauseToken[],
  next: number,
  lookups: LookupTables
): number | null {
  return attributiveEndpointModifierChainHeadIndex(tokens, next, lookups, false, false);
}

function interrogativeAdverbAt(tokens: readonly RuntimeHaruToken[], lookups: LookupTables): (idx: number) => boolean {
  return (idx) => {
    const token = tokens[idx];
    return token !== undefined && tokenIsInterrogativeLexeme(token, lookups);
  };
}

function collectWhitespaceJunctures(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  cohesionSources: JunctureCohesionSources,
  adnominalLicenses: ReadonlyMap<number, WhitespaceAdnominalLicense>
): ReadonlyMap<number, WhitespaceJunctureEvidence> {
  const junctures = new Map<number, WhitespaceJunctureEvidence>();
  for (let gapIdx = 1; gapIdx < tokens.length; gapIdx += 1) {
    const separation = tokens[gapIdx]?.whitespaceBefore;
    const witnesses = separation?.chunkBreakWitnesses;
    if (!isWitnessedChunkBreakBefore(tokens, gapIdx) || separation?.runOrdinal === undefined || witnesses === undefined) {
      continue;
    }
    const adnominalLicense = adnominalLicenses.get(gapIdx);
    const attributiveEvent = witnesses.some((witness) =>
      witness.kind === "boundary_event" && witness.event === "attributive");
    junctures.set(gapIdx, whitespaceJunctureEvidence({
      gapIdx,
      runOrdinal: separation.runOrdinal,
      boundary: witnesses.filter((witness) =>
        !(witness.kind === "boundary_event" && witness.event === "attributive")),
      cohesion: [
        ...(attributiveEvent ? [{ kind: "attributive_event" as const }] : []),
        ...whitespaceJunctureCohesionAt(tokens, runtimeTokens, gapIdx, lookups, cohesionSources)
      ],
      ...(adnominalLicense === undefined ? {} : { adnominalLicense })
    }));
  }
  return junctures;
}

function collectWhitespaceAdnominalLicenses(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  nominalUnits: JunctureNominalUnitSources,
  attributiveReadings: ReadonlyMap<number, WhitespaceAttributiveReadingInput> | undefined
): ReadonlyMap<number, WhitespaceAdnominalLicense> {
  const licenses = new Map<number, WhitespaceAdnominalLicense>();
  for (let gapIdx = 1; gapIdx < tokens.length; gapIdx += 1) {
    if (!isWitnessedChunkBreakBefore(tokens, gapIdx)) {
      continue;
    }
    const leftIdx = previousNonSpaceIndex(tokens, gapIdx);
    const left = leftIdx === null ? undefined : tokens[leftIdx];
    if (leftIdx === null || left === undefined) {
      continue;
    }
    const adnominalOnly = isAdnominalOnlyInflection(left.pos);
    const reading = adnominalOnly ? undefined : attributiveReadings?.get(gapIdx);
    if (!adnominalOnly && reading?.leftIdx !== leftIdx) {
      continue;
    }
    const headIdx = gapPermeableAttributiveHeadReach(
      tokens, runtimeTokens, leftIdx, gapIdx, lookups, nominalUnits,
      adnominalOnly ? undefined : interrogativeAdverbAt(runtimeTokens, lookups)
    );
    if (headIdx === null) {
      continue;
    }
    if (adnominalOnly) {
      licenses.set(gapIdx, { kind: "adnominal_only_form", headIdx });
    } else if (reading?.headIdx === headIdx) {
      licenses.set(gapIdx, { kind: reading.witness.kind, headIdx, leftIdx });
    }
  }
  return licenses;
}

function governedReadingLicensedGapAt(
  licenses: ReadonlyMap<number, WhitespaceAdnominalLicense>,
  endpointIdx: number,
  next: number
): number | undefined {
  const license = licenses.get(next);
  return isWhitespaceAttributiveReadingLicense(license) && license.leftIdx === endpointIdx ? next : undefined;
}

function firstAdnominalOnlyFormLicensedGapFrom(
  licenses: ReadonlyMap<number, WhitespaceAdnominalLicense>,
  from: number,
  end: number
): number | undefined {
  let first: number | undefined;
  for (const [gapIdx, license] of licenses) {
    if (license.kind === "adnominal_only_form" && gapIdx >= from && gapIdx < end && (first === undefined || gapIdx < first)) {
      first = gapIdx;
    }
  }
  return first;
}

interface JunctureCohesionSources extends JunctureNominalUnitSources {
  readonly copulaConcessiveConditions: ReadonlyMap<number, CopulaConcessiveConditionEvidence>;
}

interface JunctureNominalUnitSources {
  readonly balancedDelimiterSpans: readonly BalancedDelimiterSpan[];
  readonly bareKeijoujiAttributiveHeads: ReadonlyMap<number, BareKeijoujiAttributiveEvidence>;
}

function whitespaceJunctureNominalUnitHeadAt(
  tokens: readonly ClauseToken[],
  idx: number,
  units: JunctureNominalUnitSources
): number | null {
  const span = balancedDelimiterSpanOpeningAtIn(units.balancedDelimiterSpans, idx);
  if (span !== undefined) {
    const inside = nextNonSpaceIndex(tokens, idx + 1);
    return inside !== null && isAttributiveHeadNounishToken(tokens[inside]) &&
      nextNonSpaceIndex(tokens, inside + 1) === span.closingIdx
      ? inside
      : null;
  }
  return units.bareKeijoujiAttributiveHeads.get(idx + 1)?.katakanaRun === true ? idx + 1 : null;
}

function whitespaceJunctureCohesionAt(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  gapIdx: number,
  lookups: LookupTables,
  cohesionSources: JunctureCohesionSources
): readonly WhitespaceJunctureCohesionEvidence[] {
  const leftIdx = previousNonSpaceIndex(tokens, gapIdx);
  const left = leftIdx === null ? undefined : tokens[leftIdx];
  const right = tokens[gapIdx];
  if (leftIdx === null || left === undefined || right === undefined) {
    return [];
  }
  if (isJunctureBoundFollowerToken(right)) {
    return [{ kind: "bound_follower" }];
  }
  if (kaOwnershipKindAt(runtimeTokens, leftIdx, lookups) === "kadouka") {
    return [{ kind: "kadouka_complement" }];
  }
  return hostedJunctureCohesionAt(tokens, runtimeTokens, leftIdx, gapIdx, lookups, cohesionSources);
}

function hostedJunctureCohesionAt(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  leftIdx: number,
  gapIdx: number,
  lookups: LookupTables,
  cohesionSources: JunctureCohesionSources
): readonly (WhitespaceJunctureCohesionEvidence & PauseJunctureCohesionEvidence)[] {
  if (cohesionSources.copulaConcessiveConditions.has(leftIdx - 1)) {
    return [{ kind: "copula_concessive_condition" }];
  }
  for (const copulaIdx of [leftIdx, leftIdx - 1]) {
    const copula = copulaIdx >= 0 ? matchCopula(runtimeTokens, copulaIdx, lookups) : null;
    if (copula !== null && copulaIdx + copula.consumed > gapIdx) {
      return [{ kind: "copula_chain" }];
    }
  }
  const headIdx = gapPermeableAttributiveHeadReach(tokens, runtimeTokens, leftIdx, gapIdx, lookups, cohesionSources);
  return headIdx === null ? [] : [{ kind: "attributive_head_reach", headIdx }];
}

function isJunctureBoundFollowerToken(right: ClauseToken): boolean {
  const rightPos0 = right.pos & POS0;
  return rightPos0 === 助詞 || rightPos0 === 助動詞 || isAuxiliaryStemToken(right);
}

function gapPermeableAttributiveHeadReach(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  leftIdx: number,
  gapIdx: number,
  lookups: LookupTables,
  nominalUnits: JunctureNominalUnitSources,
  isPredicateBoundAdverbAt?: (idx: number) => boolean
): number | null {
  const left = tokens[leftIdx];
  if (
    left === undefined ||
    (!isAttributiveOrHomophonousTerminalInflection(left.pos) &&
      !isConjecturalCopulaAttributiveEndpoint(runtimeTokens, leftIdx))
  ) {
    return null;
  }
  return attributiveEndpointModifierChainHeadIndex(
    tokens,
    gapIdx,
    lookups,
    isLikenessModalAdnominalTailEnd(runtimeTokens, leftIdx),
    false,
    gapIdx,
    (idx) => whitespaceJunctureNominalUnitHeadAt(tokens, idx, nominalUnits),
    isPredicateBoundAdverbAt
  );
}

function collectPauseJunctures(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  cohesionSources: JunctureCohesionSources
): ReadonlyMap<number, PauseJunctureEvidence> {
  const junctures = new Map<number, PauseJunctureEvidence>();
  for (let gapIdx = 1; gapIdx < tokens.length; gapIdx += 1) {
    const run = tokens[gapIdx - 1]?.transparentPauseRunAfter;
    const right = tokens[gapIdx];
    if (run === undefined || right === undefined) {
      continue;
    }
    const cohesion: readonly PauseJunctureCohesionEvidence[] = isJunctureBoundFollowerToken(right)
      ? [{ kind: "bound_follower" }]
      : hostedJunctureCohesionAt(tokens, runtimeTokens, gapIdx - 1, gapIdx, lookups, cohesionSources);
    junctures.set(gapIdx, pauseJunctureEvidence({
      gapIdx,
      runOrdinal: run.ellipsisRunOrdinal,
      boundary: run.boundaryEvidence,
      cohesion
    }));
  }
  return junctures;
}

function sortedClauseBoundaryEvents(
  raw: ReadonlyMap<number, BoundaryKind>,
  pairedConcessiveBySplitAt: ReadonlyMap<number, PairedVolitionalConcessiveEvidence> = new Map(),
  attributiveModifierChainHeadBySplitAt: ReadonlyMap<number, number> = new Map(),
  renyouCompoundPrenominalSplits: ReadonlySet<number> = new Set(),
  chuushiClosureBySplitAt: ReadonlyMap<number, ChuushiClosureEvidence> = new Map()
): readonly ClauseBoundaryEvent[] {
  return [...raw.entries()]
    .sort(([left], [right]) => left - right)
    .map(([splitAt, kind]) => new ClauseBoundaryEvent(
      splitAt,
      kind,
      pairedConcessiveBySplitAt.get(splitAt),
      kind === "attributive" ? attributiveModifierChainHeadBySplitAt.get(splitAt) : undefined,
      kind === "attributive" && renyouCompoundPrenominalSplits.has(splitAt)
        ? "renyou_compound_prenominal"
        : undefined,
      kind === "connective" ? chuushiClosureBySplitAt.get(splitAt) : undefined
    ));
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

function finalOnlyConnectiveHasImmediateClauseContinuation(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
  cursorAt: (index: number) => TokenCursor<ClauseToken>
): boolean {
  const marker = tokens[start - 1];
  let next = nextNonSpaceIndex(tokens, start, endExclusive);
  if (next === null) return false;
  const first = tokens[next];
  if (first === undefined || isClauseOpeningPunctuationToken(first)) return false;
  if (isClausePunctuationToken(first)) {
    if (first.surface !== "、" && first.surface !== ",") return false;
    next = nextNonSpaceIndex(tokens, next + 1, endExclusive);
    if (next === null) return false;
  }
  const follower = tokens[next];
  if (follower === undefined || (follower.pos & POS0) === 助詞) return false;
  if (
    marker?.sourceOrdinal !== undefined &&
    follower.sourceOrdinal !== undefined &&
    follower.sourceOrdinal - marker.sourceOrdinal > 2
  ) {
    return false;
  }
  return hasFollowingClausePredicateEvidence(cursorAt(next));
}

const CONDITIONAL_BOUNDARY_FUSED_HOST_SLOTS: ReadonlySet<FusedCopulaSupportHostSlot> =
  new Set<FusedCopulaSupportHostSlot>(["copula_host", "none"]);

export function isConditionalAuxClauseBoundaryToken(
  tokens: readonly ClauseToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  if (
    fusedCopulaSupportConnectiveKindOf(token) !== null &&
    CONDITIONAL_BOUNDARY_FUSED_HOST_SLOTS.has(fusedCopulaSupportHostSlotAt(tokens, index))
  ) {
    return true;
  }
  if (token.surface === "なけりゃ" && (token.pos & POS5A) === 仮定形_) {
    return (
      ((token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ)) ||
      ((token.pos & POS0) === 形容詞0 && (token.dictionaryForm === "ない" || token.dictionaryForm === "無い"))
    );
  }
  if ((token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_タ | 仮定形_)) {
    return true;
  }
  return false;
}

function isDiscourseResumptionCopulaConnectiveStart(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables,
  cursorAt: (position: number) => TokenCursor<ClauseToken>
): boolean {
  const token = tokens[index];
  if (
    token === undefined ||
    !separatedAs(tokens, index, SEPARATION_OPENS_BOUNDARY) ||
    (token.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 助動詞_ダ | 終止形_)
  ) {
    return false;
  }
  const connectiveIdx = nextNonSpaceIndex(tokens, index + 1);
  const connective = connectiveIdx === null ? undefined : tokens[connectiveIdx];
  if (
    connective === undefined ||
    connectiveIdx === null ||
    (connective.pos & POS01) !== (助詞 | 接続助詞) ||
    !lookups.GRAMMAR_BOUNDARY_DISCOURSE_RESUMPTION_CONNECTIVE_SURFACES.has(connective.surface)
  ) {
    return false;
  }
  const composite = compositeConnectivePatternRelationAt(cursorAt(connectiveIdx), {
    consumers: ["clause_layout"],
    lookupConnectiveKind: lookupConnectiveBySurface
  });
  if (composite?.connectiveKind === "quoted_concessive") {
    return false;
  }
  const leftIdx = previousNonSpaceIndex(tokens, index);
  const left = leftIdx === null ? undefined : tokens[leftIdx];
  if (left === undefined) {
    return false;
  }
  const leftPos0 = left.pos & POS0;
  if (leftPos0 !== 動詞 && leftPos0 !== 形容詞0 && leftPos0 !== 助動詞) {
    return false;
  }
  const leftForm = left.pos & POS5A;
  return leftForm === 終止形_ || leftForm === 意志推量形_;
}

export function isConditionalCopulaClauseBoundaryToken(token: ClauseToken): boolean {
  return (token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 仮定形_);
}

function isFinitePredicateAdversativeGaBoundary(
  tokens: readonly ClauseToken[],
  markerIdx: number
): boolean {
  const marker = tokens[markerIdx];
  if (
    marker === undefined || marker.surface !== "が" || (marker.pos & POS01) !== 助詞_格助詞
  ) {
    return false;
  }
  const left = previousNonSpaceIndex(tokens, markerIdx);
  if (left === null) {
    return false;
  }
  return isFinitePredicateBoundaryLeft(tokens[left]);
}

function isVolitionalConcessiveGaBoundary(
  tokens: readonly ClauseToken[],
  markerIdx: number
): boolean {
  const marker = tokens[markerIdx];
  if (
    marker === undefined || marker.surface !== "が" || (marker.pos & POS01) !== 助詞_格助詞
  ) {
    return false;
  }
  const leftIdx = previousNonSpaceIndex(tokens, markerIdx);
  const left = leftIdx === null ? undefined : tokens[leftIdx];
  if (left === undefined) {
    return false;
  }
  const leftPos0 = left.pos & POS0;
  if (leftPos0 !== 動詞 && leftPos0 !== 形容詞0) {
    return false;
  }
  return (left.pos & POS5A) === 意志推量形_;
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

export function reduplicatedPredicatePairClass(
  previous: ClauseToken,
  token: ClauseToken
): "pure_na_adj" | "inflected_predicate" | null {
  if (!tokensShareLemma(token, previous)) {
    return null;
  }
  if (isLexicalPureNaAdjStem(token) && isLexicalPureNaAdjStem(previous)) {
    return "pure_na_adj";
  }
  if (
    isTerminalOrAttributiveFormPredicateToken(previous) &&
    isTerminalOrAttributiveFormPredicateToken(token) &&
    previous.surface === token.surface
  ) {
    return "inflected_predicate";
  }
  return null;
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

export function isFinitePredicateBoundaryLeft(token: ClauseToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 終止形_ || form === 連体形_;
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

function hasQuestionContentContinuationAcrossSubjectTopicBridge(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  continuationStart: number,
  layout: ProtoClauseLayout,
  lookups: LookupTables,
): boolean {
  if (!isPredicateQuestionContentKaCandidate(
    new TokenCursor(tokens, kaIdx, tokens.length, kaIdx),
    lookups,
  )) {
    return false;
  }
  const bridgeArgument = subjectTopicBridgeArgumentSpanAt(tokens, continuationStart, layout);
  if (bridgeArgument === null) {
    return false;
  }
  return looksQuestionTakingAfter(
    new TokenCursor(tokens, bridgeArgument.span.endExclusive, tokens.length, bridgeArgument.span.endExclusive),
    lookups,
    { scope: "sentence", hostCapability: "content" },
  );
}

function subjectTopicBridgeArgumentSpanAt(
  tokens: readonly RuntimeHaruToken[],
  continuationStart: number,
  layout: ProtoClauseLayout,
): NonNullable<ReturnType<typeof quoteHostSearchBridgeArgumentRelationAt>> | null {
  const clauseIndex = layout.clauseIndexOfToken(continuationStart);
  if (clauseIndex < 0) {
    return null;
  }
  const clause = layout.protoClauses[clauseIndex];
  if (clause === undefined) {
    return null;
  }
  const anchor = clause.kind === "relative"
    ? finalLeadingNominalAnchorForRelativeChain(tokens, layout, clauseIndex)
    : leadingNominalAnchorForRange(tokens, continuationStart, clause.end, {
      requirePrenominalModifier: false,
      allowArgumentParticleBoundary: true,
    });
  if (anchor === null) {
    return null;
  }
  const markerIdx = nextNonSpaceIndex(tokens, anchor.span.endExclusive);
  if (markerIdx === null) {
    return null;
  }
  const bridgeArgument = quoteHostSearchBridgeArgumentRelationAt(tokens, markerIdx, {
    headIdx: anchor.headIdx,
    consumers: ["clause_layout"],
  });
  return bridgeArgument?.argumentKind === "subject_topic"
    ? {
      ...bridgeArgument,
      span: { start: anchor.span.start, endExclusive: bridgeArgument.span.endExclusive },
    }
    : null;
}

function finalLeadingNominalAnchorForRelativeChain(
  tokens: readonly ClauseToken[],
  layout: ProtoClauseLayout,
  clauseIndex: number,
): ClauseNominalClosureAnchor | null {
  const firstClause = layout.protoClauses[clauseIndex];
  if (firstClause === undefined || firstClause.kind !== "relative") {
    return null;
  }
  const visited = new Set<number>();
  let currentClause = firstClause;
  let currentClauseIndex = clauseIndex;
  while (currentClause.kind === "relative") {
    if (visited.has(currentClauseIndex)) {
      return null;
    }
    visited.add(currentClauseIndex);
    const parentClauseIndex = currentClause.parentIdx;
    if (parentClauseIndex === null) {
      return null;
    }
    const parentClause = layout.protoClauses[parentClauseIndex];
    if (
      parentClause === undefined ||
      currentClause.end !== parentClause.start ||
      layout.clauseIndexOfToken(parentClause.start) !== parentClauseIndex
    ) {
      return null;
    }
    const parentAnchor = leadingNominalAnchorForRange(tokens, parentClause.start, parentClause.end, {
      requirePrenominalModifier: false,
      allowArgumentParticleBoundary: true,
    });
    if (parentAnchor === null) {
      return null;
    }
    if (parentClause.kind !== "relative") {
      return {
        span: {
          start: firstClause.start,
          endExclusive: parentAnchor.span.endExclusive,
        },
        headIdx: parentAnchor.headIdx,
        modifierPredicateIndices: parentAnchor.modifierPredicateIndices,
      };
    }
    currentClause = parentClause;
    currentClauseIndex = parentClauseIndex;
  }
  return null;
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

export function isUtteranceClosingPunct(token: ClauseToken): boolean {
  return isClauseHardTerminalPunctuationToken(token) || isClauseTrailingPunctuationToken(token);
}

function isCopulaConditionalBoundaryLeft(token: ClauseToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos4 = token.pos & POS4;
  if ((token.pos & POS0) !== 助動詞 || (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス)) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 終止形_ || form === 連体形_;
}

function quoteFocusEvenSequenceEndAt(tokens: readonly ClauseToken[], index: number | null): number | null {
  if (index === null) {
    return null;
  }
  const bridge = dewaScopeBridgeRelationAt(tokens, index, { consumers: ["clause_layout"] });
  return bridge === null || bridge.focusParticle !== "mo" ? null : bridge.span.endExclusive;
}

function quoteFocusEvenSequenceStartsAt(tokens: readonly ClauseToken[], index: number | null): boolean {
  return quoteFocusEvenSequenceEndAt(tokens, index) !== null;
}

function isVolitionalConcessiveBoundaryLeft(tokens: readonly ClauseToken[], idx: number): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞) {
    return false;
  }
  if ((token.pos & POS5A) !== 意志推量形_) {
    return false;
  }
  const pos4 = token.pos & POS4;
  if (pos4 === 助動詞_マス || pos4 === 助動詞_デス) {
    return false;
  }
  const before = tokens[idx - 1];
  if (before !== undefined) {
    const beforeIsTeAux = (before.pos & POS01) === 助詞_接続助詞 && (before.surface === "て" || before.surface === "で");
    if (beforeIsTeAux) {
      return false;
    }
  }
  return true;
}

function collectPairedVolitionalConcessiveEvidence(
  tokens: readonly ClauseToken[]
): readonly PairedVolitionalConcessiveEvidence[] {
  const evidence: PairedVolitionalConcessiveEvidence[] = [];
  for (let firstMarkerIdx = 1; firstMarkerIdx < tokens.length; firstMarkerIdx += 1) {
    if (tokens[firstMarkerIdx]?.surface !== "と") continue;
    const positive = positiveVolitionalPredicateBefore(tokens, firstMarkerIdx);
    const negative = negativeVolitionalPredicateAfter(tokens, firstMarkerIdx);
    if (positive === null || negative === null || positive.lemma !== negative.lemma) continue;

    const negativeAuxIdx = nextNonSpaceIndex(tokens, negative.inflectionIdx + 1, tokens.length);
    const negativeAux = negativeAuxIdx === null ? undefined : tokens[negativeAuxIdx];
    if (
      negativeAuxIdx === null ||
      negativeAux === undefined ||
      !isNegativeAuxiliaryPos(negativeAux.pos) ||
      !isVolitionalInflection(negativeAux.pos)
    ) continue;

    const secondMarkerIdx = nextNonSpaceIndex(tokens, negativeAuxIdx + 1, tokens.length);
    if (secondMarkerIdx === null || tokens[secondMarkerIdx]?.surface !== "と") continue;
    evidence.push({
      kind: "paired_volitional_concessive",
      lemma: positive.lemma,
      positivePredicateIdx: positive.predicateIdx,
      positiveInflectionIdx: positive.inflectionIdx,
      firstMarkerIdx,
      negativePredicateIdx: negative.predicateIdx,
      negativeInflectionIdx: negative.inflectionIdx,
      negativeAuxIdx,
      secondMarkerIdx,
    });
  }
  return evidence;
}

function positiveVolitionalPredicateBefore(
  tokens: readonly ClauseToken[],
  markerIdx: number
): PairedVolitionalPredicateShape | null {
  const inflectionIdx = previousNonSpaceIndex(tokens, markerIdx);
  const inflection = inflectionIdx === null ? undefined : tokens[inflectionIdx];
  if (
    inflectionIdx === null ||
    inflection === undefined ||
    !isVerbPredicateToken(inflection) ||
    !isVolitionalInflection(inflection.pos)
  ) {
    return null;
  }
  return pairedVolitionalPredicateShape(tokens, inflectionIdx, inflection);
}

function negativeVolitionalPredicateAfter(
  tokens: readonly ClauseToken[],
  markerIdx: number
): PairedVolitionalPredicateShape | null {
  const startIdx = nextNonSpaceIndex(tokens, markerIdx + 1, tokens.length);
  const start = startIdx === null ? undefined : tokens[startIdx];
  if (startIdx === null || start === undefined) {
    return null;
  }
  if (isVerbPredicateToken(start) && isMizenInflection(start.pos)) {
    return pairedVolitionalPredicateShape(tokens, startIdx, start);
  }
  if (!isSahenCapableNominal(start)) {
    return null;
  }
  const inflectionIdx = nextNonSpaceIndex(tokens, startIdx + 1, tokens.length);
  const inflection = inflectionIdx === null ? undefined : tokens[inflectionIdx];
  if (
    inflectionIdx === null ||
    inflection === undefined ||
    !isVerbPredicateToken(inflection) ||
    !isMizenInflection(inflection.pos) ||
    (inflection.dictionaryForm || inflection.surface) !== "する"
  ) {
    return null;
  }
  return {
    lemma: `${start.dictionaryForm || start.surface}+する`,
    predicateIdx: startIdx,
    inflectionIdx,
  };
}

function conjecturalCopulaSupportSpanStart(
  tokens: readonly RuntimeHaruToken[],
  index: number
): number | null {
  const token = tokens[index];
  if (token === undefined) {
    return null;
  }
  if (isAffirmativeCopulaSupportVerbToken(token) && isVolitionalInflection(token.pos)) {
    const markerIdx = previousNonSpaceIndex(tokens, index);
    if (
      markerIdx !== null &&
      copulaDeMarkerRelationForToken(tokens[markerIdx], markerIdx, { consumers: ["copula_rules"] }) !== null
    ) {
      return markerIdx;
    }
  }
  return conjecturalCopulaHonorificSupportSpanStartAt(tokens, index);
}

function isConjecturalCopulaAttributiveEndpoint(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const markerIdx = conjecturalCopulaSupportSpanStart(tokens, index);
  if (markerIdx === null) {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, markerIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (host === undefined) {
    return false;
  }
  return isTerminalOrAttributiveInflection(host.pos) ||
    pos0in(host.pos, NOMINAL_BITS) ||
    (isNaAdjCapable(host) && !isAuxiliaryStemToken(host));
}

export function conjecturalCopulaAttributiveEndpointClaimed(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined || isAttributiveInflection(token.pos)) {
    return false;
  }
  if (!isConjecturalCopulaAttributiveEndpoint(tokens, index)) {
    return false;
  }
  const followerIdx = nextNonSpaceIndex(tokens, index + 1);
  return followerIdx !== null && !separatedAs(tokens, followerIdx, DETACHED_SEPARATIONS);
}

export function isRenyouCompoundPrenominalAttributiveEndpoint(
  tokens: readonly ClauseToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined || !isGeneralRenyouInflectedToken(token)) {
    return false;
  }
  const verbIdx = isRareruAuxiliaryToken(token) ? index - 1 : index;
  const verb = tokens[verbIdx];
  if (
    verb === undefined ||
    !isVerbPredicateToken(verb) ||
    isNonIndependentVerbToken(verb) ||
    (verbIdx !== index && separationBefore(tokens, index) !== null)
  ) {
    return false;
  }
  const headIdx = index + 1;
  const head = tokens[headIdx];
  if (
    head === undefined ||
    !isCommonNounToken(head) ||
    separationBefore(tokens, headIdx) !== null ||
    hasSourceOrdinalGapBeforeToken(tokens, headIdx)
  ) {
    return false;
  }
  const prefixIdx = previousNonSpaceIndex(tokens, verbIdx);
  const prefix = prefixIdx === null ? undefined : tokens[prefixIdx];
  return prefix === undefined || !isPrefixAffixToken(prefix);
}

function renyouCompoundPassiveHeadAdmitted(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables
): boolean {
  const token = tokens[index];
  if (token === undefined || !isRareruAuxiliaryToken(token)) {
    return true;
  }
  const head = tokens[index + 1];
  return head !== undefined && isAnimateReferentToken(head, lookups);
}

function ownsCaseParticleSinceLastBoundary(
  tokens: readonly ClauseToken[],
  verbIdx: number,
  boundaries: ReadonlyMap<number, BoundaryKind>
): boolean {
  let clauseStart = 0;
  for (const splitAt of boundaries.keys()) {
    if (splitAt <= verbIdx) {
      clauseStart = Math.max(clauseStart, splitAt);
    }
  }
  for (let idx = clauseStart; idx < verbIdx; idx += 1) {
    const token = tokens[idx];
    if (token !== undefined && isCaseParticleToken(token) && !isAdnominalGenitiveMarkerToken(token)) {
      return true;
    }
  }
  return false;
}

function isInsideClauseOpaqueNominalFrameSurface<T extends ClauseToken>(
  tokens: readonly T[],
  tokenIdx: number
): boolean {
  const surfaceSet = clauseOpaqueNominalFrameSurfaces();
  if (surfaceSet.size === 0) return false;
  return isInsideNominalFrameSurface(tokens, tokenIdx, surfaceSet, maxClauseOpaqueNominalFrameSurfaceLength());
}

export function buildProtoLayout(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  options: ClauseBoundaryDetectionOptions = {}
): ProtoClauseLayout {
  const n = tokens.length;
  if (n === 0) {
    return new ProtoClauseLayout([], [], [], [], [], []);
  }
  const quoteSpans = detectQuoteSpans(tokens);
  const detection = detectClauseBoundaryEventsWithEvidence(tokens, lookups, options);
  return protoLayoutFromBoundaryEvents(tokens, detection.events, quoteSpans, {
    demoDiscourseLeftBoundaries: detection.demoDiscourseLeftBoundaries,
    hardTerminalEllipsisRuns: detection.hardTerminalEllipsisRuns,
    anaphoricConjectureSelfQuestions: detection.anaphoricConjectureSelfQuestions,
    terminalPunctuationRuns: detection.terminalPunctuationRuns,
    bareKeijoujiAttributiveHeads: detection.bareKeijoujiAttributiveHeads,
    renyouCompoundPrenominalHeads: detection.renyouCompoundPrenominalHeads,
    quoteAttributiveCarrierHeads: detection.quoteAttributiveCarrierHeads,
    decorativeTerminalClosures: detection.decorativeTerminalClosures,
    detachedTerminalNodaClosures: detection.detachedTerminalNodaClosures,
    utteranceClosureRuns: detection.utteranceClosureRuns,
    punctuationBreakIndices: detection.punctuationBreakIndices,
    copulaPauseBridges: detection.copulaPauseBridges,
    balancedDelimiterSpans: detection.balancedDelimiterSpans,
    negativeCopulaCorrections: detection.negativeCopulaCorrections,
    detachedUtteranceOnsetBoundaries: detection.detachedUtteranceOnsetBoundaries,
    chuushiClosures: detection.chuushiClosures,
    renyouJunctures: detection.renyouJunctures,
    teUtteranceActs: detection.teUtteranceActs,
    whitespaceJunctures: detection.whitespaceJunctures,
    pauseJunctures: detection.pauseJunctures,
    lexicalAdverbialAffiliations: detection.lexicalAdverbialAffiliations,
    volitionalIntentBindings: detection.volitionalIntentBindings,
    hostlessInterjections: collectHostlessInterjectionEvidence(tokens, {
      utteranceRangeOf: (tokenIdx) => utteranceRangeOfTokenIn(n, detection.terminalPunctuationRuns, tokenIdx),
      embeddedTokenSpace: options.tokenSpace?.embeddedTokenSpace === true,
      enclosedByParenthetical: options.tokenSpace?.enclosingDelimiter === "parenthetical",
      hasRemovedContentIsland: (options.tokenSpace?.removedIslandSourceOrdinals ?? []).length > 0,
      hasRemovedIslandBetween: (afterIdx, beforeIdx) =>
        removedIslandBetween(tokens, options.tokenSpace?.removedIslandSourceOrdinals ?? [], afterIdx, beforeIdx)
    }),
    ...(options.lexicalNominalHeadClaims === undefined ? {} : { lexicalNominalHeadClaims: options.lexicalNominalHeadClaims }),
    embeddedTokenSpace: options.tokenSpace?.embeddedTokenSpace === true,
  });
}

function removedIslandBetween(
  tokens: readonly ClauseToken[],
  islandOrdinals: readonly number[],
  afterIdx: number,
  beforeIdx: number
): boolean {
  if (islandOrdinals.length === 0) {
    return false;
  }
  const after = tokens[afterIdx];
  const afterEnd = after?.sourceSpan?.endOrdinal ?? (after?.sourceOrdinal === undefined ? undefined : after.sourceOrdinal + 1);
  if (afterEnd === undefined) {
    return false;
  }
  const before = tokens[beforeIdx];
  const beforeStart = before === undefined
    ? Number.POSITIVE_INFINITY
    : before.sourceSpan?.startOrdinal ?? before.sourceOrdinal ?? Number.POSITIVE_INFINITY;
  return islandOrdinals.some((ordinal) => ordinal >= afterEnd && ordinal < beforeStart);
}

function protoLayoutFromBoundaryEvents(
  tokens: readonly ClauseToken[],
  events: readonly ClauseBoundaryEvent[],
  quoteSpans: readonly (readonly [number, number])[],
  evidence: {
    readonly demoDiscourseLeftBoundaries?: readonly DemoDiscourseLeftBoundaryEvidence[];
    readonly hardTerminalEllipsisRuns?: readonly HardTerminalEllipsisRunEvidence[];
    readonly anaphoricConjectureSelfQuestions?: readonly AnaphoricConjectureSelfQuestionEvidence[];
    readonly terminalPunctuationRuns?: readonly ClauseTerminalPunctuationRunEvidence[];
    readonly bareKeijoujiAttributiveHeads?: ReadonlyMap<number, BareKeijoujiAttributiveEvidence>;
    readonly renyouCompoundPrenominalHeads?: ReadonlySet<number>;
    readonly quoteAttributiveCarrierHeads?: ReadonlyMap<number, number>;
    readonly decorativeTerminalClosures?: ReadonlySet<number>;
    readonly detachedTerminalNodaClosures?: ReadonlySet<number>;
    readonly utteranceClosureRuns?: ReadonlyMap<number, UtteranceClosureRunEvidence>;
    readonly punctuationBreakIndices?: ReadonlySet<number>;
    readonly copulaPauseBridges?: readonly CopulaPauseBridgeEvidence[];
    readonly balancedDelimiterSpans?: readonly BalancedDelimiterSpan[];
    readonly negativeCopulaCorrections?: ReadonlyMap<number, NegativeCopulaCorrectionEvidence>;
    readonly detachedUtteranceOnsetBoundaries?: ReadonlyMap<number, DetachedUtteranceOnsetEvidence>;
    readonly chuushiClosures?: ReadonlyMap<number, ChuushiClosureEvidence>;
    readonly teUtteranceActs?: ReadonlyMap<number, TeUtteranceActEvidence>;
    readonly renyouJunctures?: ReadonlyMap<number, RenyouJunctureEvidence>;
    readonly whitespaceJunctures?: ReadonlyMap<number, WhitespaceJunctureEvidence>;
    readonly pauseJunctures?: ReadonlyMap<number, PauseJunctureEvidence>;
    readonly lexicalAdverbialAffiliations?: ReadonlyMap<number, LexicalAdverbialAffiliation>;
    readonly hostlessInterjections?: ReadonlyMap<number, HostlessInterjectionEvidence>;
    readonly lexicalNominalHeadClaims?: LexicalNominalHeadClaims;
    readonly volitionalIntentBindings?: ReadonlyMap<number, VolitionalIntentBindingEvidence>;
    readonly embeddedTokenSpace?: boolean;
  } = {},
): ProtoClauseLayout {
  const n = tokens.length;
  const starts = [0, ...events.map((event) => event.splitAt)];
  const ends = [...events.map((event) => event.splitAt), n];
  if (!starts.every((start, index) => start < (ends[index] ?? n))) {
    throw new Error("empty clause detected (dedup invariant broken)");
  }
  const eventByEnd = new Map(events.map((event) => [event.splitAt, event.kind] as const));

  const clauses = starts.map((start, index) => {
    const end = ends[index] ?? n;
    let terminatedBy = eventByEnd.get(end) ?? null;
    const last = lastNonSpaceIndex(tokens, start, end);
    if (terminatedBy === null && last !== null && (isBoundaryPunct(tokens[last]!) || isTrailingPunct(tokens[last]!))) {
      terminatedBy = "punctuation";
    }
    const kind: ClauseKind = terminatedBy === "attributive" ? "relative" : terminatedBy === "connective" ? "subordinate" : "main";
    const parentIdx = kind === "relative" && index + 1 < starts.length ? index + 1 : null;
    const particles = indicesInRange(start, end).filter((idx) => isPredicateArgumentParticle(tokens[idx]!));
    return new ProtoClause(start, end, kind, terminatedBy, particles, parentIdx);
  });

  const clauseOfToken = Array.from({ length: n }, () => 0);
  clauses.forEach((clause, clauseIndex) => {
    for (let index = clause.start; index < clause.end; index += 1) {
      clauseOfToken[index] = clauseIndex;
    }
  });
  const unmarkedMainClauseBoundaries = new Set<number>();
  for (const clause of clauses) {
    if (clause.kind !== "main" || clause.terminatedBy !== "punctuation" || clause.end >= n) {
      continue;
    }
    const last = lastNonSpaceIndex(tokens, clause.start, clause.end);
    const lastToken = last === null ? undefined : tokens[last];
    if (lastToken !== undefined && !isBoundaryPunct(lastToken) && !isTrailingPunct(lastToken)) {
      unmarkedMainClauseBoundaries.add(clause.end);
    }
  }
  return new ProtoClauseLayout(
    clauses,
    quoteSpans,
    clauseOfToken,
    evidence.demoDiscourseLeftBoundaries ?? [],
    evidence.hardTerminalEllipsisRuns ?? [],
    evidence.anaphoricConjectureSelfQuestions ?? [],
    evidence.terminalPunctuationRuns ?? [],
    evidence.bareKeijoujiAttributiveHeads ?? new Map<number, BareKeijoujiAttributiveEvidence>(),
    evidence.renyouCompoundPrenominalHeads ?? new Set<number>(),
    evidence.decorativeTerminalClosures ?? new Set<number>(),
    evidence.detachedTerminalNodaClosures ?? new Set<number>(),
    evidence.utteranceClosureRuns ?? new Map<number, UtteranceClosureRunEvidence>(),
    evidence.punctuationBreakIndices ?? new Set<number>(),
    evidence.copulaPauseBridges ?? [],
    evidence.balancedDelimiterSpans ?? [],
    evidence.negativeCopulaCorrections ?? new Map<number, NegativeCopulaCorrectionEvidence>(),
    evidence.detachedUtteranceOnsetBoundaries ?? new Map<number, DetachedUtteranceOnsetEvidence>(),
    unmarkedMainClauseBoundaries,
    evidence.quoteAttributiveCarrierHeads ?? new Map<number, number>(),
    evidence.chuushiClosures ?? new Map<number, ChuushiClosureEvidence>(),
    evidence.teUtteranceActs ?? new Map<number, TeUtteranceActEvidence>(),
    evidence.renyouJunctures ?? new Map<number, RenyouJunctureEvidence>(),
    evidence.whitespaceJunctures ?? new Map<number, WhitespaceJunctureEvidence>(),
    evidence.pauseJunctures ?? new Map<number, PauseJunctureEvidence>(),
    evidence.lexicalAdverbialAffiliations ?? new Map<number, LexicalAdverbialAffiliation>(),
    evidence.hostlessInterjections ?? new Map<number, HostlessInterjectionEvidence>(),
    evidence.lexicalNominalHeadClaims ?? null,
    evidence.volitionalIntentBindings ?? new Map<number, VolitionalIntentBindingEvidence>(),
    evidence.embeddedTokenSpace === true,
  );
}

function nominalClosureAnchorForProtoClause(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  clauseIndex: number
): ClauseNominalClosureAnchor | null {
  const protoClause = proto.protoClauses[clauseIndex];
  if (protoClause === undefined) {
    return null;
  }
  if (protoClause.kind === "relative") {
    if (protoClause.parentIdx === null || protoClause.parentIdx !== clauseIndex + 1) {
      return null;
    }
    const parentClause = proto.protoClauses[protoClause.parentIdx];
    if (parentClause === undefined || protoClause.end !== parentClause.start) {
      return null;
    }
    const parentAnchor = nominalClosureAnchorForRange(tokens, parentClause.start, parentClause.end, {
      requirePrenominalModifier: false,
    });
    if (parentAnchor === null) {
      return null;
    }
    return {
      span: {
        start: protoClause.start,
        endExclusive: parentAnchor.span.endExclusive,
      },
      headIdx: parentAnchor.headIdx,
      modifierPredicateIndices: parentAnchor.modifierPredicateIndices,
    };
  }
  return nominalClosureAnchorForRange(tokens, protoClause.start, protoClause.end, {
    requirePrenominalModifier: true,
  });
}

export function punctuatedAttributiveTargetAnchor(
  tokens: readonly ClauseToken[],
  clauses: readonly PunctuatedAttributiveTargetClause[],
  targetClauseIndex: number,
  reach: PunctuatedAttributiveTargetReach = "salient_nominal"
): ClauseNominalClosureAnchor | null {
  if (reach === "source_required_head") {
    return sourceRequiredHeadTargetAnchor(tokens, clauses, targetClauseIndex);
  }
  const targetClause = clauses[targetClauseIndex];
  if (targetClause === undefined) {
    return null;
  }
  const relativeTarget = targetClause.kind === "relative";
  const modifierPredicateIndices: number[] = [];
  let currentIdx = targetClauseIndex;
  for (let step = 0; step < clauses.length; step += 1) {
    const current = clauses[currentIdx];
    if (current === undefined) {
      return null;
    }
    const targetStep = currentIdx === targetClauseIndex;
    const linkedParent = adjacentRelativeParentClause(tokens, clauses, currentIdx);
    const closureAnchor = targetStep && relativeTarget
      ? (linkedParent === null
        ? null
        : nominalClosureAnchorForRange(tokens, linkedParent.start, linkedParent.end, {
          requirePrenominalModifier: false,
        }))
      : nominalClosureAnchorForRange(tokens, current.start, current.end, {
        requirePrenominalModifier: targetStep,
      });
    const anchor = closureAnchor ??
      leadingNominalAnchorForRange(tokens, current.start, current.end, {
        requirePrenominalModifier: targetStep,
        allowArgumentParticleBoundary: relativeTarget,
      });
    if (anchor !== null) {
      return {
        span: { start: targetClause.start, endExclusive: anchor.span.endExclusive },
        headIdx: anchor.headIdx,
        modifierPredicateIndices: [...modifierPredicateIndices, ...anchor.modifierPredicateIndices],
      };
    }
    if (linkedParent === null) {
      return null;
    }
    if (
      !targetStep &&
      (current.particleIndices.length > 0 || current.adverbialAdjunctIndices.length > 0)
    ) {
      return null;
    }
    const modifierPredicate = current.predicates.at(-1);
    if (modifierPredicate !== undefined) {
      modifierPredicateIndices.push(modifierPredicate);
    }
    currentIdx += 1;
  }
  return null;
}

export type PunctuatedAttributiveTargetReach = "salient_nominal" | "source_required_head";

function sourceRequiredHeadTargetAnchor(
  tokens: readonly ClauseToken[],
  clauses: readonly PunctuatedAttributiveTargetClause[],
  targetClauseIndex: number
): ClauseNominalClosureAnchor | null {
  const targetClause = clauses[targetClauseIndex];
  if (targetClause === undefined) {
    return null;
  }
  const withTargetStart = (anchor: ClauseNominalClosureAnchor, modifiers: readonly number[]): ClauseNominalClosureAnchor => ({
    span: { start: targetClause.start, endExclusive: anchor.span.endExclusive },
    headIdx: anchor.headIdx,
    modifierPredicateIndices: [...modifiers, ...anchor.modifierPredicateIndices],
  });
  if (targetClause.kind !== "relative") {
    const anchor = sourceRequiredHeadNominalAnchorForRange(tokens, targetClause.start, targetClause.end);
    return anchor === null ? null : withTargetStart(anchor, []);
  }
  const modifierPredicateIndices: number[] = [];
  let currentIdx = targetClauseIndex;
  for (let step = 0; step < clauses.length; step += 1) {
    const current = clauses[currentIdx];
    const parent = adjacentRelativeParentClause(tokens, clauses, currentIdx);
    if (current === undefined || parent === null) {
      return null;
    }
    const modifierPredicate = current.predicates.at(-1);
    if (modifierPredicate !== undefined) {
      modifierPredicateIndices.push(modifierPredicate);
    }
    const anchor = sourceRequiredHeadNominalAnchorForRange(tokens, parent.start, parent.end);
    if (anchor !== null) {
      return withTargetStart(anchor, modifierPredicateIndices);
    }
    if (parent.kind !== "relative" || parent.particleIndices.length > 0 || parent.adverbialAdjunctIndices.length > 0) {
      return null;
    }
    currentIdx += 1;
  }
  return null;
}

function sourceRequiredHeadNominalAnchorForRange(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): ClauseNominalClosureAnchor | null {
  const first = nominalBodyStartIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  for (let idx = first; idx < endExclusive; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      return null;
    }
    const headIdx = isNounishToken(token)
      ? nominalSuffixRunEnd(tokens, idx, endExclusive)
      : derivedNominalPhraseHeadIndexAt(tokens, idx);
    if (headIdx === null || headIdx >= endExclusive) {
      continue;
    }
    const prefix = nominalClosurePrefixClassification(tokens, first, idx, endExclusive, {
      sourceRequiredHead: true,
    });
    if (!prefix.ok) {
      return null;
    }
    if (!sourceRequiredHeadNominalPhraseClosesAt(tokens, headIdx + 1, endExclusive)) {
      continue;
    }
    return {
      span: { start: first, endExclusive: headIdx + 1 },
      headIdx,
      modifierPredicateIndices: prefix.modifierPredicateIndices,
    };
  }
  return null;
}

function nominalSuffixRunEnd(tokens: readonly ClauseToken[], idx: number, endExclusive: number): number {
  let end = idx;
  while (end + 1 < endExclusive) {
    const next = tokens[end + 1];
    if (next === undefined || (next.pos & POS0) !== 接尾辞 || !isNominalLike(next) ||
      separatedAs(tokens, end + 1, DETACHED_SEPARATIONS)) {
      break;
    }
    end += 1;
  }
  return end;
}

function sourceRequiredHeadNominalPhraseClosesAt(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): boolean {
  const index = nextNonSpaceIndex(tokens, start, endExclusive);
  if (index === null) {
    return true;
  }
  const token = tokens[index];
  if (token === undefined || isClausePunctuationToken(token)) {
    return true;
  }
  if ((token.pos & POS0) === 助詞) {
    if (isNominalLinkToken(token, index) || isNominalClosureListSeparator(token)) {
      return false;
    }
    if (isCaseParticleAdnominalLinkAt(tokens, index)) {
      return false;
    }
    const pos01 = token.pos & POS01;
    return pos01 === 助詞_格助詞 || pos01 === 助詞_係助詞 || pos01 === 助詞_副助詞;
  }
  return (token.pos & POS0) === 助動詞 &&
    (token.dictionaryForm === "だ" || token.dictionaryForm === "です");
}

function isCaseParticleAdnominalLinkAt(tokens: readonly ClauseToken[], index: number): boolean {
  const token = tokens[index];
  const next = tokens[index + 1];
  return token !== undefined && next !== undefined &&
    (token.pos & POS01) === 助詞_格助詞 && isNominalLinkToken(next, index + 1);
}

export interface PunctuatedAttributiveTargetClause {
  readonly start: number;
  readonly end: number;
  readonly kind: ClauseKind;
  readonly parentIdx: number | null;
  readonly predicates: readonly number[];
  readonly particleIndices: readonly number[];
  readonly adverbialAdjunctIndices: readonly number[];
}

function adjacentRelativeParentClause(
  tokens: readonly ClauseToken[],
  clauses: readonly PunctuatedAttributiveTargetClause[],
  clauseIndex: number
): PunctuatedAttributiveTargetClause | null {
  const current = clauses[clauseIndex];
  if (current === undefined || current.kind !== "relative") {
    return null;
  }
  if (current.parentIdx === null || current.parentIdx !== clauseIndex + 1) {
    return null;
  }
  const parent = clauses[current.parentIdx];
  if (parent === undefined || current.end !== parent.start) {
    return null;
  }
  return separatedAs(tokens, parent.start, DETACHED_SEPARATIONS) ? null : parent;
}

function leadingNominalAnchorForProtoClause(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  clauseIndex: number,
  predicates: readonly number[]
): ClauseNominalClosureAnchor | null {
  const protoClause = proto.protoClauses[clauseIndex];
  if (protoClause === undefined) {
    return null;
  }
  if (protoClause.kind === "relative") {
    if (protoClause.parentIdx === null || protoClause.parentIdx !== clauseIndex + 1) {
      return null;
    }
    const ownAnchor = leadingNominalAnchorForRange(tokens, protoClause.start, protoClause.end, {
      requirePrenominalModifier: true,
      allowArgumentParticleBoundary: true,
    });
    if (ownAnchor !== null) {
      return ownAnchor;
    }
    const parentClause = proto.protoClauses[protoClause.parentIdx];
    if (parentClause === undefined || protoClause.end !== parentClause.start) {
      return null;
    }
    const parentAnchor = leadingNominalAnchorForRange(tokens, parentClause.start, parentClause.end, {
      requirePrenominalModifier: false,
      allowArgumentParticleBoundary: true,
    });
    if (parentAnchor === null) {
      return null;
    }
    return {
      span: {
        start: protoClause.start,
        endExclusive: parentAnchor.span.endExclusive,
      },
      headIdx: parentAnchor.headIdx,
      modifierPredicateIndices: [predicates.at(-1), ...parentAnchor.modifierPredicateIndices]
        .filter((idx): idx is number => idx !== undefined),
    };
  }
  return leadingNominalAnchorForRange(tokens, protoClause.start, protoClause.end, {
    requirePrenominalModifier: true,
    allowArgumentParticleBoundary: false,
  });
}

function nominalClosureAnchorForRange(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
  options: { readonly requirePrenominalModifier: boolean }
): ClauseNominalClosureAnchor | null {
  const first = nominalBodyStartIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  const head = nominalClosureHeadIndex(tokens, first, endExclusive);
  if (head === null) {
    return null;
  }
  if (!nominalClosureSuffixIsTerminal(tokens, head + 1, endExclusive)) {
    return null;
  }
  const prefix = nominalClosurePrefixClassification(tokens, first, head, endExclusive);
  if (!prefix.ok) {
    return null;
  }
  if (options.requirePrenominalModifier && !prefix.hasPrenominalModifier) {
    return null;
  }
  return {
    span: { start: first, endExclusive: head + 1 },
    headIdx: head,
    modifierPredicateIndices: prefix.modifierPredicateIndices,
  };
}

function leadingNominalAnchorForRange(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
  options: {
    readonly requirePrenominalModifier: boolean;
    readonly allowArgumentParticleBoundary: boolean;
    readonly allowMatchedNominalQuoteBoundary?: boolean;
  }
): ClauseNominalClosureAnchor | null {
  const first = nominalBodyStartIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  let best: ClauseNominalClosureAnchor | null = null;
  const c = new TokenCursor(tokens, first, endExclusive);
  while (c.pos < c.end) {
    const token = c.current();
    if (token === undefined) {
      c.advance();
      continue;
    }
    if (!isNounishToken(token)) {
      c.advance();
      continue;
    }
    const prefix = nominalClosurePrefixClassification(tokens, first, c.pos, endExclusive, {
      ...(options.allowMatchedNominalQuoteBoundary === undefined
        ? {}
        : { allowMatchedNominalQuoteBoundary: options.allowMatchedNominalQuoteBoundary })
    });
    if (!prefix.ok) {
      return best;
    }
    if (options.requirePrenominalModifier && !prefix.hasPrenominalModifier) {
      c.advance();
      continue;
    }
    if (!hasLeadingNominalBoundaryAfterHead(tokens, c.pos + 1, endExclusive, options)) {
      c.advance();
      continue;
    }
    best = {
      span: { start: first, endExclusive: c.pos + 1 },
      headIdx: c.pos,
      modifierPredicateIndices: prefix.modifierPredicateIndices,
    };
    c.advance();
  }
  return best;
}

export function leadingNominalHeadAfterToken(
  layout: ProjectionEvidenceLayout,
  tokens: readonly ClauseToken[],
  anchorIdx: number
): number | null {
  return leadingNominalHeadAfterTokenWithOptions(layout, tokens, anchorIdx, {});
}

function leadingNominalHeadAfterTokenWithOptions(
  layout: ProjectionEvidenceLayout,
  tokens: readonly ClauseToken[],
  anchorIdx: number,
  options: { readonly allowMatchedNominalQuoteBoundary?: boolean }
): number | null {
  const clause = layout.clauseOfToken(anchorIdx);
  if (clause === undefined) {
    return null;
  }
  const start = nextNonSpaceIndex(tokens, anchorIdx + 1, clause.end);
  if (start === null) {
    return null;
  }
  if (
    isClausePunctuationToken(tokens[start]) &&
    options.allowMatchedNominalQuoteBoundary !== true
  ) {
    return null;
  }
  if (clause.kind === "relative" && clause.parentIdx !== null) {
    const parent = layout.clauseOfToken(clause.end);
    if (
      parent === undefined ||
      parent.start !== clause.end ||
      layout.clauseIndexOfToken(parent.start) !== clause.parentIdx
    ) {
      return null;
    }
    if (
      isClausePunctuationToken(tokens[start]) &&
      !detectQuoteSpans(tokens).some(([openingIdx, closingIdx]) =>
        openingIdx === start && closingIdx < parent.end
      )
    ) {
      return null;
    }
    const parentAnchor = leadingNominalAnchorForRange(tokens, parent.start, parent.end, {
      requirePrenominalModifier: false,
      allowArgumentParticleBoundary: true,
      ...(options.allowMatchedNominalQuoteBoundary === undefined
        ? {}
        : { allowMatchedNominalQuoteBoundary: options.allowMatchedNominalQuoteBoundary })
    });
    return parentAnchor?.headIdx ?? null;
  }
  if (
    isClausePunctuationToken(tokens[start]) &&
    !detectQuoteSpans(tokens).some(([openingIdx, closingIdx]) =>
      openingIdx === start && closingIdx < clause.end
    )
  ) {
    return null;
  }
  return leadingNominalAnchorForRange(tokens, start, clause.end, {
    requirePrenominalModifier: false,
    allowArgumentParticleBoundary: true,
    ...(options.allowMatchedNominalQuoteBoundary === undefined
      ? {}
      : { allowMatchedNominalQuoteBoundary: options.allowMatchedNominalQuoteBoundary })
  })?.headIdx ?? null;
}

export type PrenominalMarkerHeadReachArm = "direct" | "modifier_chain" | "quoted_nominal" | "relative_clause";

export interface PrenominalMarkerHeadReach {
  readonly headIdx: number;
  readonly arm: PrenominalMarkerHeadReachArm;
}

export interface PrenominalMarkerHeadReachLayout extends ProjectionEvidenceLayout {
  balancedDelimiterSpanOpeningAt(openingIdx: number): BalancedDelimiterSpan | undefined;
}

export function prenominalMarkerHeadReachAfterToken<
  T extends ClauseToken & {
    readonly splitA?: readonly T[];
    readonly splitB?: readonly T[];
  }
>(
  layout: PrenominalMarkerHeadReachLayout,
  tokens: readonly T[],
  markerIdx: number,
  lookups: LookupTables
): PrenominalMarkerHeadReach | null {
  const marker = tokens[markerIdx];
  if (marker === undefined || !isAdnominalGenitiveMarkerToken(marker)) {
    return null;
  }
  const clause = layout.clauseOfToken(markerIdx);
  if (clause === undefined) {
    return null;
  }
  const start = markerIdx + 1;
  if (start >= tokens.length) {
    return null;
  }
  if (EXPLICIT_OPENING_QUOTATION_SURFACES.has(tokens[start]?.surface ?? "")) {
    if (separatedFromPreviousModifierChainElement(tokens, start, DETACHED_SEPARATIONS)) {
      return null;
    }
    const anchor = leadingQuoteAttributiveNominalHeadAnchorAfterToken(layout, tokens, markerIdx);
    if (anchor === null) {
      return null;
    }
    const span = layout.balancedDelimiterSpanOpeningAt(start);
    if (span === undefined || anchor.tokenIdx <= span.openingIdx || anchor.tokenIdx >= span.closingIdx) {
      return null;
    }
    return { headIdx: anchor.tokenIdx, arm: "quoted_nominal" };
  }
  const headIdx = adnominalStackHeadIndexFrom(layout, tokens, start, clause);
  if (headIdx === null) {
    return null;
  }
  return { headIdx, arm: headIdx === start ? "direct" : "modifier_chain" };
}

function pureKeijoujiNoMarkerHeadReach<
  T extends ClauseToken & {
    readonly splitA?: readonly T[];
    readonly splitB?: readonly T[];
  }
>(
  layout: PrenominalMarkerHeadReachLayout,
  tokens: readonly T[],
  markerIdx: number,
  lookups: LookupTables
): PrenominalMarkerHeadReach | null {
  const marker = tokens[markerIdx];
  const clause = layout.clauseOfToken(markerIdx);
  const start = markerIdx + 1;
  if (
    marker === undefined ||
    !isAdnominalGenitiveMarkerToken(marker) ||
    clause === undefined ||
    start >= tokens.length ||
    separatedFromPreviousModifierChainElement(tokens, start, DETACHED_SEPARATIONS)
  ) {
    return null;
  }
  const isUnmarkedAdnominalHostAt = (hostIdx: number): boolean => isBareKeijoujiDirectAttributiveHost(tokens, hostIdx, lookups);
  const chainHeadIdx = adnominalStackHeadIndexFrom(layout, tokens, start, clause, isUnmarkedAdnominalHostAt);
  if (chainHeadIdx !== null) {
    return { headIdx: chainHeadIdx, arm: chainHeadIdx === start ? "direct" : "modifier_chain" };
  }
  if (clause.kind !== "relative" || clause.end <= start) {
    return null;
  }
  const parent = layout.clauseOfToken(clause.end);
  if (parent === undefined || parent.start !== clause.end) {
    return null;
  }
  const headIdx = adnominalStackHeadIndexFrom(layout, tokens, clause.end, parent, isUnmarkedAdnominalHostAt);
  return headIdx === null ? null : { headIdx, arm: "relative_clause" };
}

function adnominalStackHeadIndexFrom<
  T extends ClauseToken & {
    readonly splitA?: readonly T[];
    readonly splitB?: readonly T[];
  }
>(
  layout: PrenominalMarkerHeadReachLayout,
  tokens: readonly T[],
  start: number,
  clause: ProjectionEvidenceClause,
  isUnmarkedAdnominalHostAt?: (idx: number) => boolean
): number | null {
  let reachEnd = clause.end;
  let scope: ProjectionEvidenceClause | undefined = clause;
  while (scope !== undefined && scope.kind === "relative") {
    const parent = layout.clauseOfToken(scope.end);
    if (parent === undefined || parent.start !== scope.end) {
      break;
    }
    reachEnd = parent.end;
    scope = parent;
  }
  return prenominalModifierChainHeadIndex(tokens, start, reachEnd, {
    auxiliaryStem: "opaque",
    separationRefused: DETACHED_SEPARATIONS,
    reach: "adnominal_stack",
    derivedNominalHeadIndexAt: (hostIdx) => derivedNominalPhraseHeadIndexAt(tokens, hostIdx),
    ...(isUnmarkedAdnominalHostAt === undefined ? {} : { isUnmarkedAdnominalHostAt })
  });
}

export type ExplicitAdnominalNoHostClass = "pure_keijoushi" | "keijoushi_capable_noun" | "attributive_capable_nominal";

export interface ExplicitAdnominalNoLayout extends PrenominalMarkerHeadReachLayout {
  adnominalNoRelationSlotAccepts(headIdx: number, hostIdx: number): boolean;
  adnominalHeadBearerSlotAccepts(hostIdx: number, headIdx: number): boolean;
}

export interface ExplicitAdnominalNoAttributiveEvidence {
  readonly hostIdx: number;
  readonly markerIdx: number;
  readonly headIdx: number;
  readonly arm: PrenominalMarkerHeadReachArm;
  readonly hostClass: ExplicitAdnominalNoHostClass;
}

export function explicitAdnominalNoAttributiveEvidence(
  layout: ExplicitAdnominalNoLayout,
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables
): ExplicitAdnominalNoAttributiveEvidence | null {
  const hostIdx = markerIdx - 1;
  const host = tokens[hostIdx];
  if (host === undefined) {
    return null;
  }
  const hostClass: ExplicitAdnominalNoHostClass | null = isLexicalPureNaAdjStem(host)
    ? "pure_keijoushi"
    : isNaAdjCapableNoun(host)
      ? "keijoushi_capable_noun"
      : isAttributiveCapableNominalHostToken(host) ? "attributive_capable_nominal" : null;
  if (
    hostClass === null ||
    separatedAs(tokens, markerIdx, DETACHED_SEPARATIONS) ||
    hasSourceOrdinalGapBeforeToken(tokens, markerIdx) ||
    compositeConnectivePatternRelationAt(new TokenCursor(tokens, markerIdx, tokens.length, markerIdx)) !== null
  ) {
    return null;
  }
  const nounHost = hostClass !== "pure_keijoushi";
  const capabilityHost = nounHost && lookups.NO_ATTRIBUTIVE_CAPABLE_HOSTS.has(host.dictionaryForm);
  if (nounHost && !capabilityHost && hostClass !== "keijoushi_capable_noun") {
    return null;
  }
  const reach = prenominalMarkerHeadReachAfterToken(layout, tokens, markerIdx, lookups) ??
    (nounHost ? null : pureKeijoujiNoMarkerHeadReach(layout, tokens, markerIdx, lookups));
  if (reach === null) {
    return null;
  }
  if (
    nounHost &&
    (
      reach.arm !== "direct" ||
      admittedNominalFrameMarkerEndsAt({ tokens, markerStart: markerIdx, lookups, layout }).length > 0 ||
      layout.adnominalNoRelationSlotAccepts(reach.headIdx, hostIdx) ||
      (!capabilityHost && !layout.adnominalHeadBearerSlotAccepts(hostIdx, reach.headIdx))
    )
  ) {
    return null;
  }
  return { hostIdx, markerIdx, headIdx: reach.headIdx, arm: reach.arm, hostClass };
}

export function leadingQuoteAttributiveNominalHeadAnchorAfterToken<
  T extends ClauseToken & {
    readonly splitA?: readonly T[];
    readonly splitB?: readonly T[];
  }
>(
  layout: ProjectionEvidenceLayout,
  tokens: readonly T[],
  anchorIdx: number
): ClauseNominalHeadAnchor<T> | null {
  const tokenIdx = leadingNominalHeadAfterTokenWithOptions(layout, tokens, anchorIdx, {
    allowMatchedNominalQuoteBoundary: true
  });
  if (tokenIdx === null) {
    return null;
  }
  const sourceToken = tokens[tokenIdx];
  if (sourceToken === undefined) {
    return null;
  }
  const split = sourceToken.splitB ?? sourceToken.splitA;
  const morphologicalHead = split?.at(-1);
  const headToken = morphologicalHead !== undefined && isNounishToken(morphologicalHead)
    ? morphologicalHead
    : sourceToken;
  return { tokenIdx, sourceToken, headToken };
}

function leadingConnectiveIndexForRange(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): number | null {
  const first = nextNonSpaceIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  const token = tokens[first];
  return token !== undefined && isLeadingClauseConnectiveToken(token) ? first : null;
}

function leadingQuoteMarkerIndexForRange(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): number | null {
  const first = nextNonSpaceIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  return quoteMarkerRelationAt(tokens, first, { consumers: ["clause_layout"] }) !== null ? first : null;
}

function nominalBodyStartIndex(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): number | null {
  const first = nextNonSpaceIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  const token = tokens[first];
  if (token !== undefined && isLeadingClauseConnectiveToken(token)) {
    return nextNonSpaceIndex(tokens, first + 1, endExclusive);
  }
  return first;
}

function nominalClosureHeadIndex(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): number | null {
  let index = previousNonSpaceIndex(tokens, endExclusive, start);
  while (index !== null && isNominalClosureTerminalToken(tokens, index, start)) {
    index = previousNonSpaceIndex(tokens, index, start);
  }
  const token = index === null ? undefined : tokens[index];
  return token !== undefined && isNounishToken(token) ? index : null;
}

function nominalClosureSuffixIsTerminal(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): boolean {
  const c = new TokenCursor(tokens, start, endExclusive);
  while (c.pos < c.end) {
    const token = c.current();
    if (token === undefined || isClausePunctuationToken(token)) {
      c.advance();
      continue;
    }
    if (!isNominalClosureTerminalToken(tokens, c.pos, start)) {
      return false;
    }
    c.advance();
  }
  return true;
}

function hasLeadingNominalBoundaryAfterHead(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
  options: {
    readonly allowArgumentParticleBoundary: boolean;
    readonly allowMatchedNominalQuoteBoundary?: boolean;
  },
): boolean {
  let index = nextNonSpaceIndex(tokens, start, endExclusive);
  if (
    options.allowMatchedNominalQuoteBoundary === true &&
    index !== null &&
    detectQuoteSpans(tokens).some(([, closingIdx]) => closingIdx === index)
  ) {
    index = nextNonSpaceIndex(tokens, index + 1, endExclusive);
  }
  if (index === null) {
    return true;
  }
  const token = tokens[index];
  if (token === undefined) {
    return true;
  }
  if (isClausePunctuationToken(token)) {
    return true;
  }
  if (!isLeadingNominalContinuationParticle(tokens, index, options)) {
    return false;
  }
  return true;
}

type NominalClosurePrefixClassification =
  | { readonly ok: true; readonly hasPrenominalModifier: boolean; readonly modifierPredicateIndices: readonly number[] }
  | { readonly ok: false };

function nominalClosurePrefixClassification(
  tokens: readonly ClauseToken[],
  start: number,
  head: number,
  endExclusive: number,
  options: {
    readonly allowMatchedNominalQuoteBoundary?: boolean;
    readonly sourceRequiredHead?: boolean;
  } = {},
): NominalClosurePrefixClassification {
  let hasPrenominalModifier = false;
  const modifierPredicateIndices: number[] = [];
  const hasPredicateModifier = rangeHasPrenominalPredicateModifier(tokens, start, head);
  const c = new TokenCursor(tokens, start, head);
  while (c.pos < c.end) {
    const token = c.current();
    if (token === undefined) {
      c.advance();
      continue;
    }
    if (hasPredicateModifier && isPredicateArgumentParticle(token)) {
      c.advance();
      continue;
    }
    if (isNominalLinkToken(token, c.pos)) {
      hasPrenominalModifier = true;
      c.advance();
      continue;
    }
    if (isAdnominalCopulaAux(token)) {
      hasPrenominalModifier = true;
      c.advance();
      continue;
    }
    if (isNominalClosureListSeparator(token)) {
      c.advance();
      continue;
    }
    if (
      options.sourceRequiredHead === true &&
      (((token.pos & POS0) === 接尾辞 && isNominalLike(token)) || isCaseParticleAdnominalLinkAt(tokens, c.pos))
    ) {
      c.advance();
      continue;
    }
    if (
      options.allowMatchedNominalQuoteBoundary === true &&
      isMatchedNominalQuoteBoundary(tokens, c.pos, start, head, endExclusive)
    ) {
      hasPrenominalModifier = true;
      c.advance();
      continue;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 接頭辞 || pos0 === 連体詞 || pos0 === 形容詞0 || pos0 === 形状詞) {
      hasPrenominalModifier = true;
      c.advance();
      continue;
    }
    if (isPrenominalPredicateModifierToken(tokens, c.pos, head)) {
      hasPrenominalModifier = true;
      modifierPredicateIndices.push(c.pos);
      c.advance();
      continue;
    }
    if (isInternalPredicateConnectiveToken(token)) {
      c.advance();
      continue;
    }
    if (pos0in(pos0, NOMINAL_BITS)) {
      c.advance();
      continue;
    }
    return { ok: false };
  }
  return { ok: true, hasPrenominalModifier, modifierPredicateIndices };
}

function isMatchedNominalQuoteBoundary(
  tokens: readonly ClauseToken[],
  tokenIdx: number,
  prefixStart: number,
  headIdx: number,
  endExclusive: number,
): boolean {
  return detectQuoteSpans(tokens).some(([spanStart, spanEnd]) =>
    spanStart >= prefixStart &&
    spanStart < headIdx &&
    spanEnd < endExclusive &&
    (tokenIdx === spanStart || (tokenIdx === spanEnd && spanEnd < headIdx))
  );
}

function rangeHasPrenominalPredicateModifier(
  tokens: readonly ClauseToken[],
  start: number,
  head: number,
): boolean {
  for (let index = start; index < head; index += 1) {
    if (isPrenominalPredicateModifierToken(tokens, index, head)) {
      return true;
    }
  }
  return false;
}

function isNominalClosureListSeparator(token: ClauseToken): boolean {
  if ((token.pos & POS0) === 補助記号 && (token.surface === "・" || token.surface === "、")) {
    return true;
  }
  return (token.pos & POS0) === 助詞 && token.surface === "や";
}

function isLeadingClauseConnectiveToken(token: ClauseToken): boolean {
  return (token.pos & POS0) === 接続詞;
}

function isNominalLinkToken(token: ClauseToken, index: number): boolean {
  return nominalLinkMarkerRelationForToken(token, index, { consumers: ["clause_layout"] }) !== null;
}

function isNominalClosureTerminalToken(
  tokens: readonly ClauseToken[],
  index: number,
  lowerBoundInclusive: number,
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  if (pos0in(token.pos, 1 << 補助記号)) {
    return true;
  }
  if (isNominalClosureTerminalParticle(token)) {
    return true;
  }
  if (isNominalClosureTerminalAux(token)) {
    return true;
  }
  if (
    (token.pos & POS01) === 動詞_非自立可能 && (token.dictionaryForm === "ある" || token.dictionaryForm === "有る")
  ) {
    const previous = previousNonSpaceIndex(tokens, index, lowerBoundInclusive);
    const previousToken = previous === null ? undefined : tokens[previous];
    return previousToken !== undefined && (previousToken.pos & POS0) === 助動詞 &&
      (previousToken.dictionaryForm === "だ" || previousToken.dictionaryForm === "です");
  }
  return false;
}

function isNominalClosureTerminalParticle(token: ClauseToken): boolean {
  return (token.pos & POS0) === 助詞 && (token.surface === "は" || token.surface === "も" || token.surface === "が" || token.surface === "を");
}

function isLeadingNominalContinuationParticle(
  tokens: readonly ClauseToken[],
  index: number,
  options: { readonly allowArgumentParticleBoundary: boolean },
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  if (isNominalLinkToken(token, index)) {
    return false;
  }
  if (options.allowArgumentParticleBoundary && (token.pos & POS0) === 助詞 && token.surface === "を") {
    return true;
  }
  return (token.pos & POS0) === 助詞 && (token.surface === "が" || token.surface === "は" || token.surface === "も");
}

function isNominalClosureTerminalAux(token: ClauseToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const dictionaryForm = token.dictionaryForm || token.surface;
  return dictionaryForm === "だ" ||
    dictionaryForm === "です" ||
    dictionaryForm === "た" ||
    dictionaryForm === "ます";
}

function isPrenominalPredicateModifierToken(
  tokens: readonly ClauseToken[],
  index: number,
  head: number,
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 動詞) {
    return isShuushiOrRentaiToken(token) || isDirectRenyouNominalModifierToken(tokens, index, head);
  }
  if (pos0 === 形容詞0) {
    return isShuushiOrRentaiToken(token);
  }
  return false;
}

function isInternalPredicateConnectiveToken(token: ClauseToken): boolean {
  return (token.pos & POS0) === 動詞 && isRenyouModifierToken(token);
}

function isAdnominalCopulaAux(token: ClauseToken): boolean {
  return (token.pos & (POS0 | POS5A)) === (助動詞 | 連体形_) && (token.dictionaryForm === "だ" || token.dictionaryForm === "です");
}

function isShuushiOrRentaiToken(token: ClauseToken): boolean {
  const conj5A = token.pos & POS5A;
  return conj5A === 終止形_ || conj5A === 連体形_;
}

function isRenyouModifierToken(token: ClauseToken): boolean {
  return (token.pos & POS5A) === 連用形_;
}

function isDirectRenyouNominalModifierToken(
  tokens: readonly ClauseToken[],
  index: number,
  head: number,
): boolean {
  const token = tokens[index];
  if (token === undefined || !isRenyouModifierToken(token)) {
    return false;
  }
  const next = nextNonSpaceIndex(tokens, index + 1, head + 1);
  return next === head;
}


export function buildClauseLayoutFromProto(
  proto: ProtoClauseLayout,
  tokens: readonly ClauseToken[],
  contentMap: ReadonlyMap<number, PredicateLike> | { readonly [index: number]: PredicateLike },
  lookups: LookupTables,
  options: {
    readonly consumedLexicalParticleIndices?: ReadonlySet<number> | readonly number[];
    readonly requireCachedQuoteRelations?: boolean;
  } = {}
): ClauseLayout {
  return useActiveProtoLayout(proto, () =>
    buildClauseLayoutInProtoScope(proto, tokens, contentMap, lookups, options));
}

function buildClauseLayoutInProtoScope(
  proto: ProtoClauseLayout,
  tokens: readonly ClauseToken[],
  contentMap: ReadonlyMap<number, PredicateLike> | { readonly [index: number]: PredicateLike },
  lookups: LookupTables,
  options: {
    readonly consumedLexicalParticleIndices?: ReadonlySet<number> | readonly number[];
    readonly requireCachedQuoteRelations?: boolean;
  }
): ClauseLayout {
  if (proto.protoClauses.length === 0) {
    return new ClauseLayout([], []);
  }
  const contentEntries = sortedContentEntries(contentMap);
  const contentEntriesByClause = proto.protoClauses.map((protoClause) =>
    contentEntries.filter(([idx]) => protoClause.start <= idx && idx < protoClause.end)
  );
  const quoteSpanInfos = classifyQuoteSpans(tokens, contentEntries, proto.quoteSpans);
  const quoteRelations = quoteStructuralRelationsForLayout(
    tokens,
    proto,
    lookups,
    options.requireCachedQuoteRelations === true
  );
  const quoteHostPrefixParticles = quoteHostPrefixParticlesByPredicate(tokens, proto, quoteRelations);
  const benefactiveRecipientTopicParticles = benefactiveRecipientTopicParticlesByPredicate(tokens, proto, contentEntriesByClause);
  const quoteHostPrefixOwner = new Map<number, number>();
  for (const [predicate, particles] of quoteHostPrefixParticles) {
    for (const particle of particles) {
      quoteHostPrefixOwner.set(particle, predicate);
    }
  }
  const quoteArgumentCandidacy = new QuoteArgumentCandidacyVerdict(
    quoteRelations,
    quoteHostPrefixOwner
  );
  const benefactiveRecipientTopicOwner = new Map<number, number>();
  for (const [predicate, particles] of benefactiveRecipientTopicParticles) {
    for (const particle of particles) {
      benefactiveRecipientTopicOwner.set(particle, predicate);
    }
  }
  const adverbialAdjuncts = adverbialAdjunctsByPredicate(tokens, proto, contentEntries, lookups);
  const consumedLexicalParticles = consumedLexicalParticleIndices(tokens, contentEntries, options.consumedLexicalParticleIndices);
  const clauses = proto.protoClauses.map((protoClause, clauseIndex) => {
    const clauseContentEntries = contentEntriesByClause[clauseIndex] ?? [];
    const predicates = clauseContentEntries
      .filter(([idx, span]) =>
        sourceContextMayBePredicateAt(tokens, idx, span, { limit: protoClause.end }) &&
        !isAdverbialKeijoujiPredicateLike(tokens, idx, proto, clauseIndex, contentEntries, lookups) &&
        rentaiDegreeAdverbialModifiedPredicate(tokens, idx, adjectiveAdverbialModifierLookupOptions(lookups)) === null
      )
      .map(([idx]) => idx);
    const particleMap = new Map(predicates.map((predicate) => [predicate, [] as number[]]));
    const particleIndices = protoClause.particleIndices.filter((particle) => !consumedLexicalParticles.has(particle));
    for (const particle of particleIndices) {
      let owner = quoteHostPrefixOwner.get(particle);
      if (owner === undefined || !particleMap.has(owner)) {
        owner = predicates.find((predicate) =>
          predicate > particle &&
          !proto.isQuoteTrapped(particle, predicate) &&
          quoteArgumentCandidacy.allows(particle, predicate)
        );
      }
      if (owner !== undefined) {
        particleMap.get(owner)?.push(particle);
      }
    }
    for (const [particle, owner] of benefactiveRecipientTopicOwner) {
      if (particleMap.has(owner) && protoClause.start <= particle && particle < protoClause.end) {
        particleMap.get(owner)?.push(particle);
      }
    }
    const perPredicate = predicates.map((predicate) => {
      const particles = [...new Set(particleMap.get(predicate) ?? [])].sort((left, right) => left - right);
      return [predicate, particles] as const;
    });
    const argumentRolesByPredicate = predicateArgumentRolesForClause(
      tokens,
      proto,
      protoClause,
      predicates,
      perPredicate,
      clauseContentEntries,
      quoteArgumentCandidacy,
    );
    return new Clause(
      protoClause.start,
      protoClause.end,
      predicates,
      particleIndices,
      perPredicate,
      protoClause.parentIdx,
      protoClause.kind,
      protoClause.terminatedBy,
      nominalClosureAnchorForProtoClause(tokens, proto, clauseIndex),
      leadingNominalAnchorForProtoClause(tokens, proto, clauseIndex, predicates),
      leadingConnectiveIndexForRange(tokens, protoClause.start, protoClause.end),
      leadingQuoteMarkerIndexForRange(tokens, protoClause.start, protoClause.end),
      argumentRolesByPredicate,
      clauseContentEntries
        .filter(([, span]) => predicateLikeHasPredicateQuoteCarrier(span))
        .map(([predicate]) => predicate),
      protoClausePunctuationBreaks(proto, protoClause),
      protoClause.terminatedBy === "attributive" && proto.isRenyouCompoundPrenominalHead(protoClause.end)
        ? "renyou_compound_prenominal"
        : null,
    );
  });
  const quotedSpeechActSpans = [
    ...proto.quoteSpans.map(([start, endExclusive]) => ({ start, endExclusive })),
    ...quoteRelations.map((relation) => relation.quote.contentSpan),
  ];
  const speechActScopes = clauses.flatMap((clause) => clause.predicates.map((predicateIdx) => [
    predicateIdx,
    quotedSpeechActSpans.some(({ start, endExclusive }) => start <= predicateIdx && predicateIdx < endExclusive) ||
      contentEntries.some(([idx, span]) => idx === predicateIdx && predicateLikeHasPredicateQuoteCarrier(span, true))
      ? "quoted_content"
      : contentEntries.some(([idx, span]) => idx === predicateIdx &&
        tokens.slice(idx, idx + (span.consumed ?? 1)).some((token) => token.transparentPauseAfter === true))
        ? "matrix"
        : clause.kind !== "main" || clause.predicates.at(-1) === predicateIdx && (
          proto.terminalPunctuationRuns.some((run) => clause.start <= run.contentEndIdx && run.contentEndIdx < clause.end &&
            quoteMarkerRelationAt(tokens, run.contentEndIdx, { consumers: ["clause_layout"] }) !== null) ||
          clause.end === tokens.length && quoteMarkerRelationAt(tokens,
            previousNonSpaceIndex(tokens, clause.end, clause.start) ?? -1, { consumers: ["clause_layout"] }) !== null)
        ? "unresolved"
        : "matrix",
  ] as const));
  const quoteHostByQuotedPredicate = clauses.flatMap((clause) => clause.predicates.flatMap((predicateIdx) => {
    const relation = quoteRelations.find(({ quote }) =>
      quote.contentSpan.start <= predicateIdx && predicateIdx < quote.contentSpan.endExclusive
    );
    const hostIdx = relation?.quote.hostMatch.hostIdx;
    return hostIdx === undefined ? [] : [[predicateIdx, hostIdx] as const];
  }));
  const quoteHostByMarker = quoteRelations.flatMap(({ quote }) => {
    const positions: (readonly [number, number])[] = [];
    for (let idx = quote.markerSpan.start; idx < quote.markerSpan.endExclusive; idx += 1) {
      positions.push([idx, quote.hostMatch.hostIdx] as const);
    }
    return positions;
  });
  return new ClauseLayout(
    clauses,
    proto.clauseOfTokenIndex,
    proto.quoteSpans,
    quoteSpanInfos,
    quoteHostPrefixParticles,
    benefactiveRecipientTopicParticles,
    initialConnectiveRoles(tokens, clauses),
    compoundPredicatePairsForClauses(tokens, clauses),
    adverbialAdjuncts,
    proto.terminalPunctuationRuns,
    speechActScopes,
    proto.copulaPauseBridges,
    proto.balancedDelimiterSpans,
    quoteHostByQuotedPredicate,
    proto.utteranceClosureRuns,
    proto.negativeCopulaCorrections,
    proto.unmarkedMainClauseBoundaries,
    proto.decorativeTerminalClosures,
    quoteHostByMarker,
    proto.quoteAttributiveCarrierHeads,
    proto.chuushiClosures,
    new Map([...proto.teUtteranceActs].map(([idx, act]) => {
      const quote = quoteRelations.find(({ quote: candidate }) =>
        candidate.contentSpan.start <= act.connectiveIdx && act.connectiveIdx < candidate.contentSpan.endExclusive)?.quote;
      const closesQuotedUtterance = quote !== undefined &&
        tokens.slice(act.connectiveIdx + 1, quote.contentSpan.endExclusive)
          .every((token) => isBoundaryPunct(token) || isTrailingPunct(token) || isTerminalParticleToken(token));
      return [idx, {
        ...act,
        ...(closesQuotedUtterance ? { position: "utterance_final" as const } : {}),
        scope: quote === undefined ? "matrix" as const : "quoted_content" as const
      }];
    })),
    proto.renyouJunctures,
    proto.whitespaceJunctures,
    proto.pauseJunctures,
    proto.lexicalAdverbialAffiliations,
    quoteRelations,
  );
}

function protoClausePunctuationBreaks(
  proto: ProtoClauseLayout,
  clause: { readonly start: number; readonly end: number }
): readonly number[] {
  const breaks: number[] = [];
  for (const idx of proto.punctuationBreakIndices) {
    if (idx >= clause.start && idx < clause.end) {
      breaks.push(idx);
    }
  }
  return breaks.sort((left, right) => left - right);
}

function initialConnectiveRoles(tokens: readonly ClauseToken[], clauses: readonly Clause[]): Map<number, string> {
  return new Map(clauses.flatMap((clause) => clause.predicates.flatMap((predicate) => {
    const token = tokens[nextNonSpaceIndex(tokens, predicate + 1) ?? -1];
    return token !== undefined && isCopulaDaDeRenyouToken(token) ? [[predicate, "adverbial"] as const] : [];
  })));
}

function predicateArgumentRolesForClause(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  clause: ProtoClause,
  predicates: readonly number[],
  particlesByPredicate: readonly (readonly [number, readonly number[]])[],
  contentEntries: readonly (readonly [number, PredicateLike])[],
  quoteArgumentCandidacy: QuoteArgumentCandidacyVerdict,
): readonly (readonly [number, readonly PredicateArgumentRoleAssignment[]])[] {
  const roles = new Map(predicates.map((predicate) => [predicate, [] as PredicateArgumentRoleAssignment[]]));
  for (const [predicate, particleIndices] of particlesByPredicate) {
    for (const particleIdx of particleIndices) {
      const relation = quoteHostSearchBridgeArgumentRelationAt(tokens, particleIdx, {
        consumers: ["clause_layout"],
      });
      if (relation !== null) {
        roles.get(predicate)?.push({ particleIdx, role: relation.argumentKind });
      }
    }
  }
  const topics: Array<{ particleIdx: number; predicate: number; hasOwnedObliqueCase: boolean; hasPrefixedFocus: boolean }> = [];
  for (let particleIdx = clause.start; particleIdx < clause.end; particleIdx += 1) {
    if (particleIdx === clause.start && isTeConnectiveToken(tokens[particleIdx - 1])) {
      continue;
    }
    if (topicFocusMarkerRelationForToken(tokens[particleIdx], particleIdx, { consumers: ["clause_layout"] }) === null) {
      continue;
    }
    const candidates = predicates.filter((candidate) =>
      candidate > particleIdx &&
      quoteArgumentCandidacy.allows(particleIdx, candidate)
    );
    const hasOwnedObliqueCase = topicHasOwnedCaseParticle(tokens, particleIdx, clause.particleIndices);
    const hasPrefixedFocus = ((tokens[previousNonSpaceIndex(tokens, particleIdx) ?? -1]?.pos ?? 0) & (POS0 | POS1)) === (助詞 | 副助詞);
    const predicate = !hasOwnedObliqueCase && !hasPrefixedFocus
      ? candidates.find((candidate) => contentEntries.find(([idx]) => idx === candidate)?.[1].renderPlan?.kind !== "attributive") ?? candidates[0]
      : candidates[0];
    if (predicate === undefined || proto.isQuoteTrapped(particleIdx, predicate)) {
      continue;
    }
    topics.push({
      particleIdx,
      predicate,
      hasOwnedObliqueCase,
      hasPrefixedFocus,
    });
  }
  for (const { particleIdx, predicate, hasOwnedObliqueCase, hasPrefixedFocus } of topics) {
    const assignments = roles.get(predicate);
    if (assignments === undefined || assignments.some((assignment) => assignment.particleIdx === particleIdx)) {
      continue;
    }
    const predicateParticles = particlesByPredicate.find(([candidate]) => candidate === predicate)?.[1] ?? [];
    const hasExplicitGaSubject = predicateParticles.some((idx) => tokens[idx]?.surface === "が");
    const pureTopics = topics.filter((topic) => topic.predicate === predicate && !topic.hasOwnedObliqueCase && !topic.hasPrefixedFocus);
    const role: PredicateArgumentRole =
      hasOwnedObliqueCase
        ? "oblique_topic"
        : hasPrefixedFocus
          ? "prefixed_focus"
        : clause.kind === "relative" && hasExplicitGaSubject
          ? "theme_topic"
          : hasExplicitGaSubject
            ? "other"
            : pureTopics.length > 1
              ? "other"
              : "subject_topic";
    assignments.push({ particleIdx, role });
  }
  for (const { particleIdx, predicate: embeddedPredicate } of topics) {
    for (const matrixPredicate of predicates) {
      if (
        matrixPredicate <= embeddedPredicate ||
        !quoteArgumentCandidacy.allows(particleIdx, matrixPredicate) ||
        !predicateOwnsQuotedNominalSubject(tokens, matrixPredicate, particlesByPredicate)
      ) continue;
      const assignments = roles.get(matrixPredicate);
      if (assignments !== undefined && !assignments.some((assignment) => assignment.particleIdx === particleIdx)) {
        assignments.push({ particleIdx, role: "other" });
      }
    }
  }
  return [...roles.entries()].map(([predicate, assignments]) => [
    predicate,
    assignments.sort((left, right) => left.particleIdx - right.particleIdx),
  ] as const);
}

function topicHasOwnedCaseParticle(
  tokens: readonly ClauseToken[],
  topicParticleIdx: number,
  predicateParticles: readonly number[],
): boolean {
  const ownedParticles = new Set(predicateParticles);
  let index = previousNonSpaceIndex(tokens, topicParticleIdx);
  while (index !== null) {
    const token = tokens[index];
    if (token === undefined) return false;
    if (ownedParticles.has(index)) {
      return caseParticleMarkerRelationForToken(token, index, {
        consumers: ["clause_layout"],
      }) !== null;
    }
    if ((token.pos & POS0) !== 助詞 || (token.pos & POS1) !== 副助詞) {
      return false;
    }
    index = previousNonSpaceIndex(tokens, index);
  }
  return false;
}

function predicateOwnsQuotedNominalSubject(
  tokens: readonly ClauseToken[],
  predicate: number,
  particlesByPredicate: readonly (readonly [number, readonly number[]])[],
): boolean {
  const particleIndices = particlesByPredicate.find(([candidate]) => candidate === predicate)?.[1] ?? [];
  return particleIndices.some((particleIdx) => {
    if (!SUBJECT_TOPIC_SURFACE.has(tokens[particleIdx]?.surface ?? "")) return false;
    const headIdx = previousNonSpaceIndex(tokens, particleIdx);
    if (headIdx === null || tokens[headIdx] === undefined || !isNounishToken(tokens[headIdx]!)) return false;
    const nominalLinkIdx = previousNonSpaceIndex(tokens, headIdx);
    if (
      nominalLinkIdx === null ||
      nominalLinkMarkerRelationForToken(tokens[nominalLinkIdx], nominalLinkIdx, { consumers: ["clause_layout"] }) === null
    ) return false;
    const quoteMarkerIdx = previousNonSpaceIndex(tokens, nominalLinkIdx);
    return quoteMarkerIdx !== null &&
      quoteMarkerRelationAt(tokens, quoteMarkerIdx, { consumers: ["clause_layout"] }) !== null;
  });
}

function predicateLikeHasPredicateQuoteCarrier(span: PredicateLike, embeddedSpeechActOnly = false): boolean {
  const plan = span.renderPlan;
  if (plan?.kind !== "headTailChain" || plan.realization?.kind !== "predicate") return false;
  const root = plan.realization.root;
  if (typeof root !== "object" || root === null) return false;
  return tailShapeHasPredicateQuoteCarrier((root as { readonly tail?: unknown }).tail, embeddedSpeechActOnly);
}

function tailShapeHasPredicateQuoteCarrier(value: unknown, embeddedSpeechActOnly = false): boolean {
  if (typeof value !== "object" || value === null) return false;
  const node = value as {
    readonly kind?: unknown;
    readonly ops?: readonly unknown[];
    readonly inner?: unknown;
    readonly outer?: unknown;
  };
  if (node.kind === "connective") {
    return tailShapeHasPredicateQuoteCarrier(node.inner, embeddedSpeechActOnly) ||
      tailShapeHasPredicateQuoteCarrier(node.outer, embeddedSpeechActOnly);
  }
  return Array.isArray(node.ops) && node.ops.some((op) =>
    typeof op === "object" && op !== null &&
    (op as { readonly kind?: unknown }).kind === "predicateQuoteCarrier" &&
    (!embeddedSpeechActOnly || (op as { readonly style?: unknown }).style !== "suru_attributive")
  );
}

function compoundPredicatePairsForClauses(
  tokens: readonly ClauseToken[],
  clauses: readonly Clause[]
): ReadonlyMap<number, number> {
  const pairs = new Map<number, number>();
  for (const clause of clauses) {
    for (let i = 0; i + 1 < clause.predicates.length; i += 1) {
      const head = clause.predicates[i];
      const tail = clause.predicates[i + 1];
      if (head === undefined || tail === undefined || tail !== head + 1) {
        continue;
      }
      if (!isStreamVvCompoundPairAt(tokens, head)) {
        continue;
      }
      pairs.set(tail, head);
    }
  }
  return pairs;
}


export function buildClauseLayout(
  tokens: readonly ClauseToken[],
  contentMap: ReadonlyMap<number, PredicateLike> | { readonly [index: number]: PredicateLike },
  lookups: LookupTables
): ClauseLayout {
  return buildClauseLayoutFromProto(buildProtoLayout(tokens, lookups), tokens, contentMap, lookups);
}

function quoteStructuralRelationsForLayout(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  lookups: LookupTables,
  requireCached: boolean
): readonly QuoteStructuralRelation[] {
  if (tokens.length === 0) {
    return [];
  }
  const runtimeTokens = clauseTokensAsRuntime(tokens);
  const cursor = new TokenCursor(runtimeTokens, 0, tokens.length);
  return useActiveProtoLayout(proto, () => {
    const cached = cachedQuoteStructuralRelationIndex(runtimeTokens);
    if (cached !== undefined) {
      return Array.from(cached.winners());
    }
    if (requireCached) {
      throw new Error("ClauseLayout requires the canonical cached quote relation index");
    }
    return Array.from(quoteStructuralRelationIndex(cursor, lookups).winners());
  });
}

class QuoteArgumentCandidacyVerdict {
  constructor(
    private readonly relations: readonly QuoteStructuralRelation[],
    private readonly hostPrefixOwner: ReadonlyMap<number, number>
  ) {}

  allows(particleIdx: number, predicateIdx: number): boolean {
    if (this.hostPrefixOwner.get(particleIdx) === predicateIdx) {
      return true;
    }
    return this.relations.every((relation) => {
      const { contentSpan } = relation.quote;
      const particleInContent =
        contentSpan.start <= particleIdx &&
        particleIdx < contentSpan.endExclusive;
      if (!particleInContent) {
        return true;
      }
      return contentSpan.start <= predicateIdx && predicateIdx < contentSpan.endExclusive;
    });
  }
}

function quoteHostPrefixParticlesByPredicate(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  relations: readonly QuoteStructuralRelation[]
): readonly (readonly [number, readonly number[]])[] {
  const byPredicate = new Map<number, number[]>();
  for (const relation of relations) {
    if (relation.quote.slotKind !== "question_content" || relation.quote.hostMatch.kind !== "question") {
      continue;
    }
    const hostIdx = relation.quote.hostMatch.hostIdx;
    const protoClause = proto.clauseContaining(hostIdx);
    if (protoClause === undefined) {
      continue;
    }
    for (const particleIdx of protoClause.particleIndices) {
      if (particleIdx >= relation.quote.markerIdx) {
        continue;
      }
      const bridgeArgument = quoteHostPrefixArgumentRelationAt(tokens, particleIdx, {
        markerIdx: relation.quote.markerIdx,
        hostIdx,
        consumers: ["clause_layout", "quote_content"]
      });
      if (bridgeArgument === null) {
        continue;
      }
      const particles = byPredicate.get(hostIdx) ?? [];
      particles.push(particleIdx);
      byPredicate.set(hostIdx, particles);
    }
  }
  return Array.from(byPredicate.entries())
    .sort(([left], [right]) => left - right)
    .map(([predicate, particles]) => [predicate, uniqueInOrder(particles)] as const);
}

function benefactiveRecipientTopicParticlesByPredicate(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  contentEntriesByClause: readonly (readonly (readonly [number, PredicateLike])[])[]
): readonly (readonly [number, readonly number[]])[] {
  const byPredicate = new Map<number, number[]>();
  for (const [clauseIndex, protoClause] of proto.protoClauses.entries()) {
    const contentEntries = contentEntriesByClause[clauseIndex] ?? [];
    for (const [predicateIdx, span] of contentEntries) {
      const benefactive = span.benefactive ?? null;
      if (benefactive === null) {
        continue;
      }
      const particleIdx = benefactive.recipientParticleIdx ?? benefactive.recipient_particle_idx ?? null;
      if (particleIdx === null || particleIdx < protoClause.start || particleIdx >= protoClause.end) {
        continue;
      }
      const particle = tokens[particleIdx];
      if (particle?.surface !== "は" && particle?.surface !== "も") {
        continue;
      }
      const particles = byPredicate.get(predicateIdx) ?? [];
      particles.push(particleIdx);
      byPredicate.set(predicateIdx, particles);
    }
  }
  return Array.from(byPredicate.entries())
    .sort(([left], [right]) => left - right)
    .map(([predicate, particles]) => [predicate, uniqueInOrder(particles)] as const);
}

function uniqueInOrder(values: readonly number[]): readonly number[] {
  return Array.from(new Set(values));
}

export function clauseSentenceOrdinals(
  layout: ClauseLayout,
  tokens: readonly ClauseToken[]
): readonly number[] {
  const ordinals: number[] = [];
  let sentence = 0;
  for (const clause of layout.clauses) {
    ordinals.push(sentence);
    let idx = clause.end - 1;
    while (idx >= clause.start) {
      const token = tokens[idx];
      if (token === undefined || isClauseTrailingPunctuationToken(token)) {
        idx -= 1;
        continue;
      }
      break;
    }
    if (idx >= clause.start && isClauseHardTerminalPunctuationToken(tokens[idx])) {
      sentence += 1;
    }
  }
  return ordinals;
}


export interface PredicateLike {
  koreanPos?: number;
  unitType?: string;
  consumed?: number;
  particleRole?: string | null;
  renderPlan?: {
    readonly kind?: string;
    readonly adverbial?: string;
    readonly clauseRole?: object;
    readonly realization?: {
      readonly kind?: string;
      readonly root?: unknown;
      readonly hostProjection?: { readonly kind?: string };
    };
  } | null;
  benefactive?: {
    readonly recipientParticleIdx?: number | null;
    readonly recipient_particle_idx?: number | null;
  } | null;
  entry?: {
    readonly senses?: readonly {
      readonly koreanPos?: number;
    }[];
  } | null;
  candidates?: readonly {
    readonly koreanPos?: number;
  }[];
}

function consumedLexicalParticleIndices(
  tokens: readonly ClauseToken[],
  contentEntries: readonly (readonly [number, PredicateLike])[],
  explicitConsumed: ReadonlySet<number> | readonly number[] | undefined
): Set<number> {
  const consumed = new Set(explicitConsumed ?? []);
  for (const [start, span] of contentEntries) {
    const plan = span.renderPlan;
    if (plan?.kind === "headTailChain" && plan.realization?.kind === "predicate") {
      const root = plan.realization.root;
      if (typeof root === "object" && root !== null) {
        for (const markerIdx of tailRootExplicitAdnominalMarkerIndices(root as TailRoot)) {
          consumed.add(markerIdx);
        }
      }
    }
    if (span.renderPlan?.kind !== "lexicalParticleAdverbial" && span.particleRole !== "adverbializer") {
      continue;
    }
    const end = start + Math.max(1, span.consumed ?? 1);
    for (let index = start + 1; index < end; index += 1) {
      const token = tokens[index];
      if (token !== undefined && (token.pos & POS0) === 助詞) {
        consumed.add(index);
      }
    }
  }
  return consumed;
}

export function sourceContextMayBePredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  span: PredicateLike,
  options: { readonly limit?: number } = {}
): boolean {
  if (span.renderPlan?.adverbial !== undefined && span.renderPlan.adverbial !== null) {
    return false;
  }
  const plan = span.renderPlan;
  if (plan?.kind === "headTailChain" && plan.realization?.kind === "nominal") {
    const root = plan.realization.root;
    if (
      typeof root === "object" && root !== null &&
      (root as { readonly kind?: unknown }).kind === "renyouNominalHead" &&
      !renyouNominalHeadKeepsVerbalValency(root as { readonly evidence?: { readonly kind?: unknown; readonly profileId?: unknown } })
    ) {
      return false;
    }
  }
  if (plan?.kind === "headTailChain" && plan.realization?.kind === "nominal" && plan.clauseRole !== undefined) {
    const root = plan.realization.root;
    if (typeof root === "object" && root !== null && (root as { readonly kind?: unknown }).kind === "hostBearingLikeness") {
      return true;
    }
  }
  if (numericCopulaPredicatePlanSpan(span)) {
    return true;
  }
  const limit = options.limit ?? tokens.length;
  if (methodYouIdiomRecoveredNominalHostPredicate(tokens, idx, span, limit)) {
    return true;
  }
  return sourceTokenMayBePredicateAt(tokens, sourcePredicateAnchorIndexForSpan(tokens, idx, span, limit), limit);
}

function renyouNominalHeadKeepsVerbalValency(
  root: { readonly evidence?: { readonly kind?: unknown; readonly profileId?: unknown } }
): boolean {
  const evidence = root.evidence;
  return evidence?.kind === "derivational_suffix" &&
    typeof evidence.profileId === "string" &&
    derivationalSuffixProfileById(evidence.profileId)?.sourceVerbalValency === true;
}

function numericCopulaPredicatePlanSpan(span: PredicateLike): boolean {
  const plan = span.renderPlan;
  if (
    plan?.kind !== "headTailChain" ||
    plan.realization?.kind !== "predicate" ||
    plan.clauseRole === undefined ||
    plan.realization.hostProjection?.kind !== "numeral"
  ) {
    return false;
  }
  const root = plan.realization.root;
  return typeof root === "object" && root !== null &&
    !tailRootClosesWithAttributiveTerminal(root as TailRoot);
}

function sourcePredicateAnchorIndexForSpan(
  tokens: readonly ClauseToken[],
  idx: number,
  span: PredicateLike,
  limit: number
): number {
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 接頭辞) {
    return idx;
  }
  const consumedLimit = Math.min(limit, idx + Math.max(1, span.consumed ?? 2));
  const localHead = nextNonSpaceIndex(tokens, idx + 1, consumedLimit);
  if (localHead !== null) {
    return localHead;
  }
  const followingHead = nextNonSpaceIndex(tokens, idx + 1, limit);
  return followingHead ?? idx;
}

function sourceTokenMayBePredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || idx >= limit) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 動詞) {
    const previous = previousNonSpaceIndex(tokens, idx);
    if (
      previous !== null &&
      sourceSahenPotentialDifficultyPredicateAt(tokens, previous, limit)
    ) {
      return false;
    }
    if (sourceTokenIsTeDeRequestTail(tokens, idx)) {
      return false;
    }
    return true;
  }
  if (pos0 === 形容詞0) {
    return sourceAdjectiveTokenMayBePredicateAt(tokens, idx, limit);
  }
  if (pos0 === 名詞 || pos0 === 形状詞) {
    return isVerbalizedSahenPredicate(tokens, idx) ||
      sourceSahenPotentialDifficultyPredicateAt(tokens, idx, limit) ||
      nominalCopulaPredicateAt(tokens, idx, limit) ||
      naAttributivePredicateAt(tokens, idx, limit) ||
      nominalEmbeddedQuestionPredicateAt(tokens, idx, limit) ||
      nominalZeroCopulaPredicateAt(tokens, idx, limit);
  }
  return false;
}

function methodYouIdiomRecoveredNominalHostPredicate(
  tokens: readonly ClauseToken[],
  idx: number,
  span: PredicateLike,
  limit: number
): boolean {
  if (span.renderPlan?.kind !== "headTailChain") {
    return false;
  }
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 名詞) {
    return false;
  }
  const youIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  return youIdx !== null &&
    methodYouGaNaiIdiomShapeAt(tokens as readonly RuntimeHaruToken[], youIdx) !== null;
}

function sourceSahenPotentialDifficultyPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isSahenCapableNominal(token)) {
    return false;
  }
  const potentialIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  const potential = potentialIdx === null ? undefined : tokens[potentialIdx];
  const difficultyIdx = potentialIdx === null
    ? null
    : nextNonSpaceIndex(tokens, potentialIdx + 1, limit);
  const difficulty = difficultyIdx === null ? undefined : tokens[difficultyIdx];
  if (potential === undefined || difficulty === undefined) {
    return false;
  }
  const potentialPayload = postverbAuxiliaryPayloadsForForm(potential.dictionaryForm)
    .some((payload) => payload.kind === "potential" &&
      payload.followingAuxiliaryKind === "difficulty" &&
      postverbAuxiliaryDeclaresHostAttachForm(payload, "sahen_stem"));
  const difficultyPayload = postverbAuxiliaryPayloadsForForm(difficulty.dictionaryForm)
    .some((payload) => payload.kind === "difficulty");
  return potentialPayload && difficultyPayload;
}

function sourceTokenIsTeDeRequestTail(
  tokens: readonly ClauseToken[],
  idx: number
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  const markerIdx = previousNonSpaceIndex(tokens, idx);
  const marker = markerIdx === null ? undefined : tokens[markerIdx];
  if (
    marker === undefined ||
    (marker.pos & POS01) !== 助詞_接続助詞 ||
    (marker.surface !== "て" && marker.surface !== "で")
  ) {
    return false;
  }
  const lemma = token.dictionaryForm || token.surface;
  if (lemma === "くださる" || lemma === "下さる" || lemma === "くれる" || lemma === "呉れる") {
    return (token.pos & POS5A) === 命令形_;
  }
  return token.surface === "ちょうだい" || lemma === "ちょうだい" || lemma === "頂戴";
}

function sourceAdjectiveTokenMayBePredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 形容詞0) {
    return false;
  }
  const isNonJiritsu = (token.pos & POS01) === (形容詞0 | 非自立可能);
  const isNegationNai = isNonJiritsu &&
    (token.dictionaryForm === "ない" || token.dictionaryForm === "無い");
  if (isNegationNai) {
    if (sourceNegativeAdjectiveIsCopulaTail(tokens, idx)) return false;
    return true;
  }
  if ((token.pos & POS5A) !== 連用形_) {
    return true;
  }
  return adjectiveRenyouFollowerEstablishesPredicateAt(tokens, idx, limit, isNonJiritsu);
}

function adjectiveRenyouFollowerEstablishesPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number,
  isNonJiritsu: boolean
): boolean {
  const nextIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (isPastTaToken(next) || isTeConnectiveToken(next)) {
    return true;
  }
  if (
    nextIdx !== null &&
    adjectivalConcessiveTomoRelationAt(tokens, nextIdx, { consumers: ["clause_layout"] }) !== null
  ) {
    return true;
  }
  if (isTariListingParticleToken(next)) {
    return true;
  }
  if (sourceAdjectiveRenyouArimasenPredicateAt(tokens, idx, limit)) {
    return true;
  }
  if (
    !isDependentAdjectiveOnTeHost(tokens, idx, isNonJiritsu) &&
    next !== undefined &&
    (next.pos & POS01) === (形容詞0 | 非自立可能) &&
    (next.dictionaryForm === "ない" || next.dictionaryForm === "無い")
  ) {
    return true;
  }
  return next !== undefined &&
    (next.pos & POS0) === 動詞 &&
    (next.dictionaryForm === "なる" ||
      next.dictionaryForm === "なれる" ||
      next.dictionaryForm === "成る" ||
      next.dictionaryForm === "する");
}

function isDependentAdjectiveOnTeHost(
  tokens: readonly ClauseToken[],
  idx: number,
  isNonJiritsu: boolean
): boolean {
  if (!isNonJiritsu) {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, idx);
  return hostIdx !== null && isTeConnectiveToken(tokens[hostIdx]);
}

function sourceNegativeAdjectiveIsCopulaTail(
  tokens: readonly ClauseToken[],
  idx: number
): boolean {
  const focusIdx = previousNonSpaceIndex(tokens, idx);
  if (focusIdx === null) return false;
  const focus = tokens[focusIdx];
  if (focus?.surface === "じゃ" && (focus.pos & POS4) === 助動詞_ダ) return true;
  if (focus?.surface === "では" || focus?.surface === "でも") return true;
  if (focus?.surface !== "は" && focus?.surface !== "も") return false;
  const copulaIdx = previousNonSpaceIndex(tokens, focusIdx);
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  if (copula?.surface !== "で") return false;
  const hostIdx = previousNonSpaceIndex(tokens, copulaIdx!);
  const hostPos0 = hostIdx === null ? null : ((tokens[hostIdx]?.pos ?? 0) & POS0);
  return hostPos0 === 名詞 || hostPos0 === 代名詞 || hostPos0 === 形状詞;
}

function sourceAdjectiveRenyouArimasenPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const aruIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  const aru = aruIdx === null ? undefined : tokens[aruIdx];
  if (
    aruIdx === null ||
    aru === undefined ||
    (aru.pos & POS01) !== 動詞_非自立可能 ||
    (aru.dictionaryForm !== "ある" && aru.dictionaryForm !== "有る")
  ) {
    return false;
  }
  const match = matchNegationEnding(tokens as readonly RuntimeHaruToken[], aruIdx);
  return match !== null && aruIdx + match.consumed <= limit;
}

function naAttributivePredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isNaAdjCapable(token)) {
    return false;
  }
  const naIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  if (naIdx === null) {
    return false;
  }
  const na = tokens[naIdx];
  if (
    na === undefined ||
    na.surface !== "な" ||
    (na.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 助動詞_ダ | 連体形_)
  ) {
    return false;
  }
  const headIdx = nextNonSpaceIndex(tokens, naIdx + 1, limit);
  const head = headIdx === null ? undefined : tokens[headIdx];
  if (head === undefined) {
    return false;
  }
  const headPos0 = head.pos & POS0;
  if (pos0in(headPos0, NOMINAL_BITS) || headPos0 === 代名詞) {
    return true;
  }
  return false;
}

function nominalEmbeddedQuestionPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isNaAdjCapable(token)) {
    return false;
  }
  const kaIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  if (kaIdx === null) {
    return false;
  }
  const ka = tokens[kaIdx];
  if (kaMarkerRelationForToken(ka, kaIdx, ["clause_layout"]) === null) {
    return false;
  }
  return nextNonSpaceIndex(tokens, kaIdx + 1, limit) === null;
}

function nominalZeroCopulaPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isNaAdjCapable(token)) {
    return false;
  }
  let cursor = nextNonSpaceIndex(tokens, idx + 1, limit);
  while (cursor !== null && (tokens[cursor]!.pos & POS0) === 接尾辞) {
    cursor = nextNonSpaceIndex(tokens, cursor + 1, limit);
  }
  return cursor === null || sourcePredicateBoundaryStartsAt(tokens, cursor, limit);
}

function sourcePredicateBoundaryStartsAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return true;
  }
  if (isClausePunctuationToken(token)) {
    return true;
  }
  if ((token.pos & POS01) === 助詞_終助詞) {
    const after = nextNonSpaceIndex(tokens, idx + 1, limit);
    if (after === null) {
      return true;
    }
    const afterToken = tokens[after];
    return afterToken === undefined || isClausePunctuationToken(afterToken);
  }
  return false;
}

function adverbialKeijoujiModifiedPredicate(
  tokens: readonly ClauseToken[],
  idx: number,
  proto: ProtoClauseLayout,
  clauseIndex: number,
  contentEntries: readonly (readonly [number, PredicateLike])[],
  lookups: LookupTables,
  allowCrossClause: boolean
): number | null {
  const protoClause = proto.protoClauses[clauseIndex];
  if (protoClause === undefined) {
    return null;
  }
  const token = tokens[idx];
  if (token === undefined) {
    return null;
  }
  let hostEndIdx: number;
  if (bareAdverbialKeijoujiHostAt(tokens, idx, lookups.ADVERBIAL_MODIFIER_BARE_KEIJOUJI_HOSTS)) {
    hostEndIdx = idx;
  } else {
    const auxIdx = nextNonSpaceIndex(tokens, idx + 1);
    if (auxIdx === null) {
      return null;
    }
    const aux = tokens[auxIdx];
    if (
      !isAdverbialKeijoujiMarkerHostPos(token) || aux === undefined || (aux.pos & (POS0 | POS5A)) !== (助動詞 | 連用形_) || aux.dictionaryForm !== "だ" || aux.surface !== "に"
    ) {
      return null;
    }
    hostEndIdx = auxIdx;
  }
  const adverbialSpan = contentEntries.find(([candidateIdx]) => candidateIdx === idx)?.[1];
  if (
    adverbialSpan !== undefined &&
    predicateLikeHasStandaloneCopulaNiTerminalSfp(adverbialSpan)
  ) {
    return null;
  }
  const inClausePredicate = contentEntries.find(([candidateIdx, span]) =>
    candidateIdx > hostEndIdx &&
    candidateIdx < protoClause.end &&
    (sourceContextMayBePredicateAt(tokens, candidateIdx, span, { limit: protoClause.end }) ||
      isVerbalizedSahenPredicate(tokens, candidateIdx) ||
      nominalCopulaPredicateAt(tokens, candidateIdx, protoClause.end))
  );
  if (inClausePredicate !== undefined) {
    return inClausePredicate[0];
  }
  if (!allowCrossClause || protoClause.terminatedBy !== "punctuation") {
    return null;
  }
  for (
    let cursor = nextNonSpaceIndex(tokens, hostEndIdx + 1, protoClause.end);
    cursor !== null;
    cursor = nextNonSpaceIndex(tokens, cursor + 1, protoClause.end)
  ) {
    const between = tokens[cursor];
    if (between === undefined) {
      break;
    }
    if ((between.pos & POS01) === 形状詞_助動詞語幹) {
      return null;
    }
  }
  const nextClause = proto.protoClauses[clauseIndex + 1];
  if (nextClause === undefined) {
    return null;
  }
  const crossClausePredicate = contentEntries.find(([candidateIdx, span]) =>
    candidateIdx >= nextClause.start &&
    candidateIdx < nextClause.end &&
    (sourceContextMayBePredicateAt(tokens, candidateIdx, span, { limit: nextClause.end }) ||
      isVerbalizedSahenPredicate(tokens, candidateIdx) ||
      nominalCopulaPredicateAt(tokens, candidateIdx, nextClause.end))
  );
  return crossClausePredicate?.[0] ?? null;
}

function predicateLikeHasStandaloneCopulaNiTerminalSfp(span: PredicateLike): boolean {
  const plan = span.renderPlan;
  if (plan === null || plan === undefined) {
    return false;
  }
  if (plan.kind !== "headTailChain" || plan.realization?.kind !== "predicate") {
    return false;
  }
  const root = plan.realization.root;
  return typeof root === "object" &&
    root !== null &&
    "tail" in root &&
    "sfp" in root &&
    "quoteBinding" in root &&
    tailRootIsNeutralStandaloneCopulaNiAdverbialFragment(root as TailRoot);
}

function isVerbalizedSahenPredicate(tokens: readonly ClauseToken[], idx: number): boolean {
  const token = tokens[idx];
  if (token === undefined || !isSahenCapableNominal(token)) {
    return false;
  }
  const suIdx = nextNonSpaceIndex(tokens, idx + 1);
  return suIdx !== null && (tokens[suIdx]?.dictionaryForm === "する");
}

function isPastTaToken(token: { readonly pos: number; readonly dictionaryForm?: string; readonly surface?: string } | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 助動詞) {
    return false;
  }
  const isTaAux = (token.pos & POS4) === 助動詞_タ ||
    token.dictionaryForm === "た" ||
    token.surface === "た";
  if (!isTaAux) {
    return false;
  }
  const pos5a = token.pos & POS5A;
  return pos5a === 終止形_ || pos5a === 連体形_;
}

function isCopulaPredicateClose(token: { readonly pos: number }): boolean {
  const pos4 = token.pos & POS4;
  if (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス) {
    return false;
  }
  return (token.pos & POS5A) !== 連用形_;
}

function nominalPredicateClosedByCopula<
  T extends { readonly pos: number; readonly surface: string; readonly dictionaryForm?: string }
>(
  tokens: readonly T[],
  idx: number,
  limit: number
): boolean {
  let cursor = nextNonSpaceIndex(tokens, idx + 1, limit);
  while (cursor !== null && (tokens[cursor]!.pos & POS0) === 接尾辞) {
    cursor = nextNonSpaceIndex(tokens, cursor + 1, limit);
  }
  if (cursor === null) {
    return false;
  }
  const close = tokens[cursor];
  if (close === undefined) {
    return false;
  }
  if (isCopulaPredicateClose(close)) {
    return true;
  }
  if ((close.pos & (POS4 | POS5A | POS5B)) === (助動詞_ダ | 連用形_融合)) {
    const negIdx = nextNonSpaceIndex(tokens, cursor + 1, limit);
    const negTok = negIdx !== null ? tokens[negIdx] : undefined;
    if (
      negTok !== undefined &&
      (negTok.pos & POS0) === 形容詞0 &&
      negTok.dictionaryForm === "ない"
    ) {
      return true;
    }
  }
  if (
    close.surface === "で" &&
    (close.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_)
  ) {
    return true;
  }
  if (
    close.surface === "に" &&
    (close.pos & (POS4 | POS5A | POS5B)) === (助動詞_ダ | 連用形_ニ)
  ) {
    const carrierIdx = nextNonSpaceIndex(tokens, cursor + 1, limit);
    const carrier = carrierIdx !== null ? tokens[carrierIdx] : undefined;
    if (
      carrier !== undefined &&
      (carrier.pos & POS01) === 動詞_非自立可能 &&
      (carrier.dictionaryForm === "なる" || carrier.dictionaryForm === "なれる" || carrier.dictionaryForm === "する")
    ) {
      return true;
    }
  }
  if (
    (close.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_)
  ) {
    const listingIdx = nextNonSpaceIndex(tokens, cursor + 1, limit);
    const listing = listingIdx !== null ? tokens[listingIdx] : undefined;
    if (isTariListingParticleToken(listing)) {
      return true;
    }
  }
  const closePos4 = close.pos & POS4;
  if (
    (closePos4 === 助動詞_ダ || closePos4 === 助動詞_デス) &&
    (close.pos & POS5A) === 連用形_
  ) {
    const taIdx = nextNonSpaceIndex(tokens, cursor + 1, limit);
    return taIdx !== null && isPastTaToken(tokens[taIdx]);
  }
  if (close.surface === "で" && (close.pos & POS01) === 助詞_格助詞) {
    let negCursor = nextNonSpaceIndex(tokens, cursor + 1, limit);
    if (negCursor !== null && (tokens[negCursor]!.pos & POS01) === 助詞_係助詞) {
      negCursor = nextNonSpaceIndex(tokens, negCursor + 1, limit);
    }
    const negTok = negCursor !== null ? tokens[negCursor] : undefined;
    if (
      negTok !== undefined &&
      (negTok.pos & POS0) === 形容詞0 &&
      negTok.dictionaryForm === "ない"
    ) {
      return true;
    }
    if (copulaElidedNegativeBodyRelationAt(tokens, cursor, { consumers: ["clause_layout"] }) !== null) {
      return true;
    }
  }
  return false;
}

function nominalCopulaPredicateAt<
  T extends { readonly pos: number; readonly surface: string; readonly dictionaryForm?: string }
>(
  tokens: readonly T[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 名詞 && pos0 !== 形状詞) {
    return false;
  }
  return nominalPredicateClosedByCopula(tokens, idx, limit);
}

export interface AdverbialModifierPredicateToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

export function findAdverbialModifierPredicate(
  tokens: readonly AdverbialModifierPredicateToken[],
  niIdx: number,
  opts?: {
    readonly allowLightVerbPredicate?: boolean;
    readonly deicticProPredicates?: ReadonlySet<string>;
  }
): number | null {
  const clause = activeProtoLayout()?.clauseOfToken(niIdx);
  const limit = clause?.end ?? tokens.length;
  let idx = nextNonSpaceIndex(tokens, niIdx + 1, limit);
  let traversedTransparent = false;
  while (idx !== null && idx < limit) {
    const token = tokens[idx];
    if (token === undefined) {
      return null;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 動詞) {
      if ((token.pos & POS01) !== 動詞_非自立可能) {
        return idx;
      }
      const nonJiritsuDf = token.dictionaryForm;
      if (nonJiritsuDf === "できる" || nonJiritsuDf === "出来る") {
        return idx;
      }
      if (nonJiritsuDf === "ある" || nonJiritsuDf === "有る") {
        const aruAuxIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
        const aruAux = aruAuxIdx !== null ? tokens[aruAuxIdx] : undefined;
        const negated =
          aruAux !== undefined &&
          (((aruAux.pos & (POS4 | POS5A)) === (助動詞_マス | 未然形_)) ||
            (aruAux.pos & POS4) === 助動詞_ヌ);
        return negated ? null : idx;
      }
      if (nonJiritsuDf === "なる" || nonJiritsuDf === "成る" || nonJiritsuDf === "なれる") {
        return traversedTransparent ? idx : null;
      }
      if (nonJiritsuDf === "する") {
        return traversedTransparent || opts?.allowLightVerbPredicate === true ? idx : null;
      }
      return idx;
    }
    if (pos0 === 形容詞0) {
      const isNonJiritsu = (token.pos & POS01) === (形容詞0 | 非自立可能);
      const isNegationNai = isNonJiritsu &&
        (token.dictionaryForm === "ない" || token.dictionaryForm === "無い");
      if (!isNegationNai) {
        if ((token.pos & POS5A) !== 連用形_) {
          return idx;
        }
        if ((token.pos & POS5A) === 連用形_) {
          const nextIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
          const nextTok = nextIdx !== null ? tokens[nextIdx] : undefined;
          if (nextTok !== undefined && isPastTaToken(nextTok)) {
            return idx;
          }
          if (
            !isNonJiritsu &&
            nextTok !== undefined &&
            (nextTok.pos & POS01) === (形容詞0 | 非自立可能) &&
            nextTok.dictionaryForm === "ない"
          ) {
            return idx;
          }
          if (
            nextIdx !== null &&
            nextTok !== undefined &&
            (nextTok.pos & POS0) === 動詞 &&
            (nextTok.dictionaryForm === "なる" ||
              nextTok.dictionaryForm === "なれる" ||
              nextTok.dictionaryForm === "成る" ||
              nextTok.dictionaryForm === "する")
          ) {
            traversedTransparent = true;
            idx = nextIdx;
            continue;
          }
          const coAdjunctPredicate = adjectiveAdverbialModifiedPredicate(
            tokens,
            idx,
            opts?.deicticProPredicates === undefined ? undefined : { deicticProPredicates: opts.deicticProPredicates }
          );
          if (coAdjunctPredicate !== null) {
            return coAdjunctPredicate;
          }
        }
      }
    }
    if (pos0 === 名詞 || pos0 === 形状詞) {
      if (pos0 === 名詞 && isSahenCapableNominal(token)) {
        const suIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
        if (suIdx !== null && tokens[suIdx]?.dictionaryForm === "する") {
          return idx;
        }
      }
      if (nominalPredicateClosedByCopula(tokens, idx, limit)) {
        return idx;
      }
    }
    if (pos0 === 副詞 && opts?.deicticProPredicates?.has(token.dictionaryForm || token.surface) === true) {
      const afterIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
      const after = afterIdx !== null ? tokens[afterIdx] : undefined;
      const afterClosesPredicate =
        after === undefined ||
        (after.pos & POS0) === 補助記号 ||
        (after.pos & POS01) === 助詞_終助詞 ||
        (after.pos & POS4) === 助動詞_ダ ||
        (after.pos & POS4) === 助動詞_デス;
      if (afterClosesPredicate) {
        return idx;
      }
    }
    const isIndefinitePronounKa =
      (token.pos & POS1) === 副助詞 &&
      token.surface === "か" &&
      (() => {
        const prevIdx = previousNonSpaceIndex(tokens, idx);
        return prevIdx !== null && ((tokens[prevIdx]?.pos ?? 0) & POS0) === 代名詞;
      })();
    if (
      isClauseSpaceOrAdverbToken(token) ||
      isAdverbialReachTransparentToken(token) ||
      isAdverbialFocusParticle(token) ||
      isIndefinitePronounKa
    ) {
      traversedTransparent = true;
      idx = nextNonSpaceIndex(tokens, idx + 1, limit);
      continue;
    }
    return null;
  }
  return null;
}

export function adjectiveAdverbialModifiedPredicate(
  tokens: readonly ClauseToken[],
  idx: number,
  opts?: {
    readonly deicticProPredicates?: ReadonlySet<string>;
    readonly rentaiDegreeHosts?: ReadonlySet<string>;
  }
): number | null {
  const token = tokens[idx];
  if (token === undefined || !isIAdjectivePredicateToken(token)) {
    return null;
  }
  const clause = activeProtoLayout()?.clauseOfToken(idx);
  const limit = clause?.end ?? tokens.length;
  if (isTerminalOrAttributiveFormPredicateToken(token)) {
    return rentaiDegreeAdverbialModifiedPredicate(tokens, idx, opts);
  }
  if (!isGeneralRenyouInflectedToken(token)) {
    return null;
  }
  const isNonJiritsu = (token.pos & POS01) === (形容詞0 | 非自立可能);
  if (adjectiveRenyouFollowerEstablishesPredicateAt(tokens, idx, limit, isNonJiritsu)) {
    return null;
  }
  const nextIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (next === undefined || isParticleToken(next)) {
    return null;
  }
  return findAdverbialModifierPredicate(
    tokens,
    idx,
    opts?.deicticProPredicates === undefined ? undefined : { deicticProPredicates: opts.deicticProPredicates }
  );
}

export function adjectiveAdverbialModifierLookupOptions(lookups: LookupTables): {
  readonly deicticProPredicates: ReadonlySet<string>;
  readonly rentaiDegreeHosts: ReadonlySet<string>;
} {
  return {
    deicticProPredicates: lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS,
    rentaiDegreeHosts: lookups.ADVERBIAL_MODIFIER_RENTAI_DEGREE_ADJECTIVE_HOSTS
  };
}

export function rentaiDegreeAdverbialModifiedPredicate(
  tokens: readonly ClauseToken[],
  idx: number,
  opts?: { readonly rentaiDegreeHosts?: ReadonlySet<string> }
): number | null {
  const token = tokens[idx];
  if (token === undefined || !isIAdjectivePredicateToken(token) || !isTerminalOrAttributiveFormPredicateToken(token)) {
    return null;
  }
  const limit = activeProtoLayout()?.clauseOfToken(idx)?.end ?? tokens.length;
  return rentaiDegreeAdjectiveModifiedPredicate(tokens, idx, limit, opts?.rentaiDegreeHosts);
}

function rentaiDegreeAdjectiveModifiedPredicate(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number,
  hosts: ReadonlySet<string> | undefined
): number | null {
  const token = tokens[idx];
  if (token === undefined || hosts?.has(token.dictionaryForm || token.surface) !== true) {
    return null;
  }
  const nextIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (nextIdx === null || next === undefined) {
    return null;
  }
  if (!isIAdjectivePredicateToken(next) && !isNaAdjCapable(next)) {
    return null;
  }
  if (isAuxiliaryStemToken(next)) {
    return null;
  }
  if (reduplicatedPredicatePairClass(token, next) !== null) {
    return null;
  }
  return sourceTokenMayBePredicateAt(tokens, nextIdx, limit) ? nextIdx : null;
}

function isAdverbialKeijoujiPredicateLike(
  tokens: readonly ClauseToken[],
  idx: number,
  proto: ProtoClauseLayout,
  clauseIndex: number,
  contentEntries: readonly (readonly [number, PredicateLike])[],
  lookups: LookupTables
): boolean {
  return adverbialKeijoujiModifiedPredicate(tokens, idx, proto, clauseIndex, contentEntries, lookups, false) !== null;
}

function adverbialAdjunctsByPredicate(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  contentEntries: readonly (readonly [number, PredicateLike])[],
  lookups: LookupTables
): readonly (readonly [number, readonly number[]])[] {
  const byPredicate = new Map<number, number[]>();
  proto.protoClauses.forEach((protoClause, clauseIndex) => {
    for (let idx = protoClause.start; idx < protoClause.end; idx += 1) {
      const predicateIdx =
        adverbialKeijoujiModifiedPredicate(tokens, idx, proto, clauseIndex, contentEntries, lookups, true) ??
        adjectiveAdverbialAdjunctPredicateEntry(tokens, idx, contentEntries, lookups);
      if (predicateIdx === null) {
        continue;
      }
      const adjuncts = byPredicate.get(predicateIdx) ?? [];
      adjuncts.push(idx);
      byPredicate.set(predicateIdx, adjuncts);
    }
  });
  return Array.from(byPredicate.entries())
    .sort(([left], [right]) => left - right)
    .map(([predicate, adjuncts]) => [predicate, uniqueInOrder(adjuncts)] as const);
}

function adjectiveAdverbialAdjunctPredicateEntry(
  tokens: readonly ClauseToken[],
  idx: number,
  contentEntries: readonly (readonly [number, PredicateLike])[],
  lookups: LookupTables
): number | null {
  const predicateTokenIdx = adjectiveAdverbialModifiedPredicate(
    tokens,
    idx,
    adjectiveAdverbialModifierLookupOptions(lookups)
  );
  if (predicateTokenIdx === null) {
    return null;
  }
  const covering = contentEntries.find(([start, span]) =>
    start > idx && start <= predicateTokenIdx && predicateTokenIdx < start + Math.max(1, span.consumed ?? 1)
  );
  return covering?.[0] ?? null;
}

function classifyQuoteSpans(
  tokens: readonly ClauseToken[],
  contentEntries: readonly (readonly [number, PredicateLike])[],
  quoteSpans: readonly (readonly [number, number])[]
): readonly QuoteSpanInfo[] {
  return quoteSpans.map((span) => classifyQuoteSpan(tokens, contentEntries, span));
}

function classifyQuoteSpan(
  tokens: readonly ClauseToken[],
  contentEntries: readonly (readonly [number, PredicateLike])[],
  span: readonly [number, number]
): QuoteSpanInfo {
  const [start, end] = span;
  const innerIndices = quoteInnerTokenIndices(tokens, start, end);
  let predicateCount = 0;
  for (const [idx, contentSpan] of contentEntries) {
    if (start < idx && idx < end && sourceContextMayBePredicateAt(tokens, idx, contentSpan, { limit: end })) {
      predicateCount += 1;
    }
  }
  const hasInternalCaseFrame = predicateCount >= 1 && innerIndices.some((idx) => isCaseParticle(tokens[idx]!));
  const hasInternalSubjectFrame = predicateCount >= 1 && innerIndices.some((idx) => isSubjectTopicParticle(tokens[idx]!));
  const internalShape = quoteInternalShape(tokens, innerIndices, predicateCount);
  const internalHead = quoteInternalHead(tokens, innerIndices);
  const internalHeadIsSahenCapableNoun = internalHead !== undefined && isSahenCapableNominal(internalHead);
  const internalPredicatePosClass = quoteInternalPredicatePosClass(tokens, innerIndices, predicateCount);
  const [tailKind] = tailAfterQuote(tokens, end);
  const nominalizingTailKind = nominalizingTailAfterQuote(tokens, end);
  const hasNominalizingTail = nominalizingTailKind !== "none";
  const [hasPrecedingObjectWo, precedingObjectNounish] = precedingObjectWoContext(tokens, start);
  const hasDescriptive = hasDescriptiveFrame(tokens, end);
  const toiuHead = toiuNounHead(tokens, end);
  const toiuNounShape = tailKind === "toiu_noun" ? internalShape : "none";
  const hasNonToiuNamingFrame = hasNonToiuNamingFrameAfterQuote(tokens, end);
  const hasNamingFrame = hasNonToiuNamingFrame || tailKind === "toiu_noun";
  const hasExplicitQuotativeMarker = tailKind === "to_safe_reporting" || tailKind === "to_thought" || tailKind === "to_other" || tailKind === "toiu_noun";
  const nearbyReportingPredicate = hasNearbyReportingPredicate(tokens, end);
  const spanLengthBucketValue = spanLengthBucket(innerIndices.length);

  let label: QuoteSpanLabel = "unknown";
  let confidence: QuoteSpanConfidence = "low";
  let markedPredicateKind: MarkedPredicateKind = "unknown";

  if (hasNonToiuNamingFrame) {
    label = "nominal_quote";
    confidence = "high";
  } else if (tailKind === "toiu_noun") {
    if (toiuNounShape === "nominal_like") {
      label = "nominal_quote";
      confidence = "high";
    } else if (toiuNounShape === "subject_predicate" && toiuHead !== undefined && SPEECH_CONTENT_HEAD.has(toiuHead.dictionaryForm || toiuHead.surface)) {
      label = "full_quote_island";
      confidence = "medium";
    }
  } else if (tailKind === "to_safe_reporting") {
    label = "full_quote_island";
    confidence = hasInternalSubjectFrame ? "high" : "medium";
  } else if (tailKind === "to_thought") {
    label = "full_quote_island";
    confidence = "medium";
  } else if (hasSahenSuruFrame(tokens, end, internalHeadIsSahenCapableNoun)) {
    label = "marked_predicate";
    confidence = "medium";
    markedPredicateKind = "sahen_action_noun";
  } else if (hasNominalizingTail && predicateCount >= 1) {
    label = "marked_predicate";
    confidence = "medium";
    markedPredicateKind = "nominalized_predicate";
  } else if (
    hasPrecedingObjectWo &&
    precedingObjectNounish &&
    internalPredicatePosClass === "verb"
  ) {
    label = "marked_predicate";
    confidence = "medium";
    markedPredicateKind = "verb_or_stem";
  } else if ((internalPredicatePosClass === "adjective" || internalPredicatePosClass === "mimetic_or_adverb") && hasDescriptive) {
    label = "marked_predicate";
    confidence = "medium";
    markedPredicateKind = "adjective_or_mimetic";
  } else if (tailKind === "wo" || tailKind === "ga_ha_mo" || tailKind === "no" || tailKind === "toshite" || tailKind === "other_particle") {
    label = "nominal_quote";
    confidence = "medium";
  } else if (
    hasInternalSubjectFrame &&
    tailKind !== "none" &&
    (hasExplicitQuotativeMarker || (toiuHead !== undefined && SPEECH_CONTENT_HEAD.has(toiuHead.dictionaryForm || toiuHead.surface)))
  ) {
    label = "full_quote_island";
    confidence = "medium";
  }

  return new QuoteSpanInfo(
    span,
    label,
    confidence,
    new QuoteSpanSignals({
      hasNamingFrame,
      toiuNounShape,
      hasInternalCaseFrame,
      hasInternalSubjectFrame,
      hasExplicitQuotativeMarker,
      nearbyReportingPredicate,
      internalHeadIsSahenCapableNoun,
      tailKind,
      spanLengthBucket: spanLengthBucketValue,
      markedPredicateKind
    })
  );
}

function sortedContentEntries(contentMap: ReadonlyMap<number, PredicateLike> | { readonly [index: number]: PredicateLike }): readonly (readonly [number, PredicateLike])[] {
  if (contentMap instanceof Map) {
    return [...contentMap.entries()].sort(([left], [right]) => left - right);
  }
  return Object.entries(contentMap)
    .map(([idx, span]) => [Number(idx), span] as const)
    .sort(([left], [right]) => left - right);
}

function indicesInRange(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start) }, (_, offset) => start + offset);
}

function preferredBoundaryKind(left: BoundaryKind, right: BoundaryKind): BoundaryKind {
  for (const kind of BOUNDARY_KIND_DECISION_ORDER) {
    if (left === kind || right === kind) {
      return kind;
    }
  }
  return left;
}

function isPredicateArgumentParticle(token: ClauseToken): boolean {
  if ((token.pos & POS0) !== 助詞) {
    return false;
  }
  if ((token.pos & POS1) === 格助詞) {
    return true;
  }
  return token.surface === "まで" && (token.pos & POS1) === 副助詞;
}

function isOpeningPunct(token: ClauseToken): boolean {
  return isClauseOpeningPunctuationToken(token);
}

function clauseTokensAsRuntime(tokens: readonly ClauseToken[]): readonly RuntimeHaruToken[] {
  if (tokens.every(isRuntimeClauseToken)) {
    return tokens;
  }
  return tokens.map((token) => ({
    ...token,
    reading: "",
    dictionaryFormReading: "",
    dictionaryId: 0,
  }));
}

function isRuntimeClauseToken(token: ClauseToken): token is RuntimeHaruToken {
  const candidate = token as Partial<RuntimeHaruToken>;
  return (
    typeof candidate.reading === "string" &&
    typeof candidate.dictionaryFormReading === "string" &&
    typeof candidate.dictionaryId === "number"
  );
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

function isCopulaTailContinuationStart(token: ClauseToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 助動詞) {
    return false;
  }
  return token.dictionaryForm === "だ" || token.dictionaryForm === "です" || (token.pos & POS4) === 助動詞_ダ;
}

function postverbOperatorTailSpanAfterTe(tokens: readonly ClauseToken[], idx: number, n: number, lookups: LookupTables): number | null {
  const relation = teDeContinuationRelationAt(tokens, idx, {
    requirement: "layout_nonspace_tail",
    consumers: ["clause_layout"],
    lookups
  });
  if (relation === null) {
    return null;
  }
  const continuation = matchTeTailContinuationAt(tokens, relation.continuationIdx, lookups, {
    ...(relation.focusParticle === undefined ? {} : { focusParticle: relation.focusParticle })
  });
  if (continuation === null || relation.span.endExclusive > n) {
    return null;
  }
  return relation.span.endExclusive;
}

function matchNodeReasonConnectiveStart(
  cursor: TokenCursor<ClauseToken>,
  lookups: LookupTables
): number | null {
  const { tokens, pos: index } = cursor;
  const prev = tokens[index - 1];
  const relation = nominalizerReasonConnectiveRelationAt(tokens, index, {
    consumers: ["clause_layout"]
  });
  if (relation === null || relation.span.endExclusive > cursor.end || lookupConnectiveBySurface("ので") !== "reason") {
    return null;
  }
  const afterNext = tokens[relation.span.endExclusive];
  if (copulaFocusContinuationRelationAt(tokens, relation.span.endExclusive, {
    consumer: "clause_layout",
    lowerBoundInclusive: index,
    lookups
  }) !== null) {
    return null;
  }
  if (cursor.lookahead(relation.span.endExclusive - cursor.pos, isNodeDeNegativeQuestionFrame)) {
    return null;
  }
  if (isBareAdjectivalPronominalNoDeFrame(prev, afterNext)) {
    return null;
  }
  return relation.span.endExclusive - index;
}

function isNodeDeNegativeQuestionFrame(cursor: TokenCursor<ClauseToken>): boolean {
  const { tokens, pos: naiIdx } = cursor;
  const nai = tokens[naiIdx];
  if (
    nai === undefined ||
    (nai.pos & POS0) !== 形容詞0 ||
    (nai.dictionaryForm !== "ない" && nai.dictionaryForm !== "無い")
  ) {
    return false;
  }
  const next = nextNonSpaceIndex(tokens, naiIdx + 1);
  return next !== null &&
    next < cursor.end &&
    kaMarkerRelationForToken(tokens[next], next, ["clause_layout"]) !== null;
}

function isBareAdjectivalPronominalNoDeFrame(
  prev: ClauseToken | undefined,
  afterNoDe: ClauseToken | undefined
): boolean {
  if (
    prev === undefined || afterNoDe === undefined || (prev.pos & (POS0 | POS5A)) !== (形容詞0 | 連体形_)
  ) {
    return false;
  }
  return pos0in(afterNoDe.pos, (1 << 形容詞0) | (1 << 形状詞));
}

function isPostpositionalClauseConnectiveToken(token: ClauseToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 助詞 || (token.pos & POS1) === 接続助詞 || token.surface === "も") {
    return false;
  }
  return lookupConnectiveBySurface(token.surface) === "concession";
}

function isQuoteContentTailMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const { tokens: runtimeTokens, pos: index } = cursor;
  if (
    quoteMarkerRelationAt(runtimeTokens, index, { consumers: ["clause_layout"] }) === null &&
    tokaTteCompositeQuoteCandidateAt(runtimeTokens, index, { consumers: ["clause_layout"] }) === null
  ) {
    return false;
  }
  const relation = quoteStructuralRelationIndex(cursor, lookups, {
    allowBuildProtoForTariAdverbialEvidence: false
  }).winnerAtOwnedPosition(index);
  return relation !== undefined;
}

function isQuotedJudgmentPassiveTailMarker(
  cursor: TokenCursor<ClauseToken>
): boolean {
  const { tokens, pos: index } = cursor;
  if (quoteMarkerRelationAt(tokens, index, { consumers: ["clause_layout"] }) === null) {
    return false;
  }
  const head = quotedJudgmentHeadBeforeMarker(tokens, index, isBoundaryPunct);
  return matchQuotedJudgmentPassiveTail(cursor, {
    hasCopulaBeforeMarker: head.hasCopula,
    nominalHead: head.nominalHead
  }) !== null;
}

function hasFollowingClausePredicateEvidence(
  cursor: TokenCursor<ClauseToken>,
  balancedSpanOpeningAt?: (openingIdx: number) => BalancedDelimiterSpan | undefined
): boolean {
  const { tokens } = cursor;
  for (let index = cursor.pos; index < cursor.end; index += 1) {
    const span = balancedSpanOpeningAt?.(index);
    if (span !== undefined) {
      index = span.endExclusive - 1;
      continue;
    }
    const token = tokens[index];
    if (token === undefined || isAbsorbablePunct(token)) {
      continue;
    }
    if (isBoundaryPunct(token)) {
      return false;
    }
    if (isClausePredicateEvidenceToken(token)) {
      return true;
    }
  }
  return false;
}

export function hasSeparatedFinitePredicateBoundary(
  tokens: readonly ClauseToken[],
  splitAt: number,
): boolean {
  if (!separatedAs(tokens, splitAt, SEPARATION_OPENS_BOUNDARY)) {
    return false;
  }
  return finitePredicateClosesBeforeFollowingClause(tokens, splitAt - 1, splitAt);
}

function finitePredicateClosesBeforeFollowingClause(
  tokens: readonly ClauseToken[],
  leftIdx: number,
  followingIdx: number,
): boolean {
  const following = tokens[followingIdx];
  if (following === undefined) {
    return false;
  }
  const tailForm = (tokens[leftIdx]?.pos ?? 0) & POS5A;
  return (
    tailForm === 終止形_ ||
    (tailForm === 命令形_ && !isConditionalBaParticle(following)) ||
    isTeTailImperativeFormClosureAt(tokens, leftIdx)
  ) &&
    hasFollowingClausePredicateEvidence(new TokenCursor(tokens, followingIdx, tokens.length));
}

function hasImperativeClosureBeforeGap(
  tokens: readonly ClauseToken[],
  splitAt: number,
): boolean {
  const following = tokens[splitAt];
  if (following === undefined || !separatedAs(tokens, splitAt, SEPARATION_OPENS_BOUNDARY)) {
    return false;
  }
  return ((tokens[splitAt - 1]?.pos ?? 0) & POS5A) === 命令形_ && !isConditionalBaParticle(following);
}

function isConditionalBaParticle(token: ClauseToken): boolean {
  return (token.pos & POS0) === 助詞 && token.surface === "ば";
}

function hasFollowingConditionalConsequent(cursor: TokenCursor<ClauseToken>): boolean {
  const { tokens } = cursor;
  for (let index = cursor.pos; index < cursor.end; index += 1) {
    const token = tokens[index];
    if (token === undefined || isAbsorbablePunct(token)) {
      continue;
    }
    if (isBoundaryPunct(token)) {
      return false;
    }
    return true;
  }
  return false;
}

function isTerminalQuoteFocusEvenTail(cursor: TokenCursor<ClauseToken>): boolean {
  const { tokens } = cursor;
  const focusEnd = quoteFocusEvenSequenceEndAt(tokens, cursor.pos);
  if (focusEnd === null) {
    return false;
  }
  for (let index = focusEnd; index < cursor.end; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isHardTerminalPunctuationToken(token)) {
      return true;
    }
    if (isAbsorbablePunct(token)) {
      continue;
    }
    return false;
  }
  return true;
}

function discontinuousListingBoundarySplitAt(
  cursor: TokenCursor<ClauseToken>,
  lookups: LookupTables
): number | null {
  const matches = relationConnectiveSpansAt(cursor);
  for (const match of matches) {
    if (match.relationPolicy !== "listing_example" || match.markerPolicy !== "discontinuous") {
      continue;
    }
    const closure = relationDiscontinuousClosureSpanAfter(
      cursor.fork(match.endExclusive, cursor.end, match.endExclusive),
      match
    );
    if (closure === null) {
      continue;
    }
    const next = nextNonSpaceIndex(cursor.tokens, closure.endExclusive, cursor.end);
    const nextToken = next === null ? undefined : cursor.tokens[next];
    if (nextToken === undefined || isClausePunctuationToken(nextToken)) {
      continue;
    }
    if ((nextToken.pos & POS0) === 動詞 && lookups.SPEECH_VERBS.has(nextToken.dictionaryForm || nextToken.surface)) {
      continue;
    }
    if (!hasFollowingClausePredicateEvidence(cursor.fork(closure.endExclusive, cursor.end, closure.endExclusive))) {
      continue;
    }
    return closure.endExclusive;
  }
  return null;
}

function hasFollowingTeEvaluationHeadEvidence(
  cursor: TokenCursor<ClauseToken>,
  splitAt: number,
  lookups: LookupTables
): boolean {
  const { tokens, pos: markerIdx } = cursor;
  if (!isTeConnectiveAfterBenefactiveTail(tokens, markerIdx, lookups)) {
    return false;
  }
  return findTeEvaluationFollowerIndex(tokens, splitAt, cursor.end, lookups) !== undefined;
}

function isTeConnectiveAfterBenefactiveTail(
  tokens: readonly ClauseToken[],
  markerIdx: number,
  lookups: LookupTables
): boolean {
  if (!isTeConnectiveToken(tokens[markerIdx])) {
    return false;
  }
  const tailIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (tailIdx === null) {
    return false;
  }
  const previousConnector = previousNonSpaceIndex(tokens, tailIdx);
  if (previousConnector === null || !isTeConnectiveToken(tokens[previousConnector])) {
    return false;
  }
  const continuation = matchTeTailContinuationAt(tokens, tailIdx, lookups);
  if (continuation === null || continuation.kind !== "benefactive") {
    return false;
  }
  return nextNonSpaceIndex(tokens, tailIdx + continuation.consumed) === markerIdx;
}

export function isClausePredicateEvidenceToken(
  token: ClauseToken,
  options: { readonly includeAuxiliary?: boolean } = {}
): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 動詞 || pos0 === 形容詞0 || (options.includeAuxiliary !== false && pos0 === 助動詞);
}

function clauseStartSinceLastBoundary(boundaries: ReadonlyMap<number, BoundaryKind>, idx: number): number {
  let clauseStart = 0;
  for (const splitAt of boundaries.keys()) {
    if (splitAt <= idx) {
      clauseStart = Math.max(clauseStart, splitAt);
    }
  }
  return clauseStart;
}

function hasPrecedingContentSinceLastBoundary(
  tokens: readonly ClauseToken[],
  connIdx: number,
  boundaries: ReadonlyMap<number, BoundaryKind>,
  lookups: LookupTables
): boolean {
  let clauseStart = 0;
  for (const splitAt of boundaries.keys()) {
    if (splitAt <= connIdx) {
      clauseStart = Math.max(clauseStart, splitAt);
    }
  }
  const CONTENT_POS0_BITS = (1 << 名詞) | (1 << 代名詞) | (1 << 動詞) | (1 << 形容詞0) | (1 << 形状詞) | (1 << 感動詞) | (1 << 接頭辞);
  for (let i = clauseStart; i < connIdx; i += 1) {
    const pos0 = (tokens[i]?.pos ?? 0) & POS0;
    if (pos0in(pos0, CONTENT_POS0_BITS)) {
      return true;
    }
    if (isDeicticCopulaPredicateContentAt(tokens, i, connIdx, lookups)) {
      return true;
    }
  }
  return false;
}

function isDeicticCopulaPredicateContentAt(
  tokens: readonly ClauseToken[],
  index: number,
  endExclusive: number,
  lookups: LookupTables
): boolean {
  const adverb = tokens[index];
  if (adverb === undefined || !isLexicalAdverb(adverb)) {
    return false;
  }
  if (!lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(adverb.dictionaryForm || adverb.surface)) {
    return false;
  }
  const copulaIdx = nextNonSpaceIndex(tokens, index + 1, endExclusive);
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  if (copula === undefined || (copula.pos & POS0) !== 助動詞) {
    return false;
  }
  const family = copula.pos & POS4;
  if (family !== 助動詞_ダ && family !== 助動詞_デス) {
    return false;
  }
  const form = copula.pos & POS5A;
  return form === 終止形_ || form === 連用形_;
}

function isBoundaryPunct(token: ClauseToken): boolean {
  return isClauseBoundaryPunctuationToken(token);
}

function isAbsorbablePunct(token: ClauseToken): boolean {
  return CLAUSE_PUNCT_POS0_NUM.has(token.pos & POS0) && (isBoundaryPunct(token) || isTrailingPunct(token));
}

function isTrailingPunct(token: ClauseToken): boolean {
  return isClauseTrailingPunctuationToken(token);
}

function lastNonSpaceIndex(tokens: readonly ClauseToken[], start: number, end: number): number | null {
  return previousNonSpaceIndex(tokens, end, start);
}

function nextAfterAbsorbableRun(tokens: readonly ClauseToken[], start: number): number {
  let lastAbsorbable = start - 1;
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (isAbsorbablePunct(token)) {
      lastAbsorbable = index;
      continue;
    }
    break;
  }
  return lastAbsorbable + 1;
}

function spanKeySet(spans: ReadonlySet<readonly [number, number]>): string {
  return [...spans].map(([start, end]) => `${start}:${end}`).sort().join("|");
}

function sameSpan(left: readonly [number, number], right: readonly [number, number]): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function quoteInnerTokenIndices(tokens: readonly ClauseToken[], start: number, end: number): readonly number[] {
  return indicesInRange(start + 1, end);
}

function isContentToken(token: ClauseToken): boolean {
  return !pos0in(token.pos, TRIVIA_BITS);
}

function quoteInternalShape(tokens: readonly ClauseToken[], innerIndices: readonly number[], predicateCount: number): ToiuNounShape {
  const caseCount = innerIndices.filter((idx) => isCaseParticle(tokens[idx]!)).length;
  const subjectCount = innerIndices.filter((idx) => isSubjectTopicParticle(tokens[idx]!)).length;
  if (predicateCount === 0 && caseCount === 0) {
    return "nominal_like";
  }
  if (predicateCount >= 1 && subjectCount >= 1) {
    return "subject_predicate";
  }
  if (predicateCount >= 1 && caseCount >= 1) {
    return "case_predicate";
  }
  if (predicateCount >= 1) {
    return "predicate_no_case";
  }
  if (caseCount >= 1) {
    return "case_no_predicate";
  }
  return "other";
}

function quoteInternalHead(tokens: readonly ClauseToken[], innerIndices: readonly number[]): ClauseToken | undefined {
  for (let offset = innerIndices.length - 1; offset >= 0; offset -= 1) {
    const token = tokens[innerIndices[offset] as number];
    if (token !== undefined && isNounishToken(token)) {
      return token;
    }
  }
  return undefined;
}

function quoteInternalPredicatePosClass(tokens: readonly ClauseToken[], innerIndices: readonly number[], predicateCount: number): InternalPredicatePosClass {
  const contentIndices = innerIndices.filter((idx) => {
    const token = tokens[idx];
    return token !== undefined && isContentToken(token);
  });
  if (contentIndices.length === 0) {
    return "none";
  }
  if (predicateCount >= 1 && contentIndices.some((idx) => isCaseParticle(tokens[idx]!))) {
    return "mixed";
  }
  const pos0Values = new Set(contentIndices.map((idx) => (tokens[idx]?.pos ?? 0) & POS0));
  if (pos0Values.has(動詞)) {
    return "verb";
  }
  if (pos0Values.has(形容詞0) || pos0Values.has(形状詞)) {
    return "adjective";
  }
  if (pos0Values.has(副詞)) {
    return "mimetic_or_adverb";
  }
  if (contentIndices.every((idx) => isNounishToken(tokens[idx]!))) {
    return "nounish";
  }
  return "mixed";
}

function precedingObjectWoContext(tokens: readonly ClauseToken[], start: number, maxContentTokens = 3): readonly [boolean, boolean] {
  let idx = start - 1;
  let seen = 0;
  while (idx >= 0 && seen < maxContentTokens) {
    const token = tokens[idx];
    if (token === undefined || !isContentToken(token)) {
      idx -= 1;
      continue;
    }
    seen += 1;
    if (caseParticleMarkerRelationForToken(token, idx, {
      acceptedSurfaces: ["を"],
      consumers: ["clause_layout"]
    }) !== null) {
      const objectIdx = previousContentIndex(tokens, idx - 1);
      return [true, objectIdx !== undefined && isNounishToken(tokens[objectIdx]!)];
    }
    idx -= 1;
  }
  return [false, false];
}

function previousContentIndex(tokens: readonly ClauseToken[], start: number): number | undefined {
  for (let idx = start; idx >= 0; idx -= 1) {
    const token = tokens[idx];
    if (token !== undefined && isContentToken(token)) {
      return idx;
    }
  }
  return undefined;
}

function isCaseParticle(token: ClauseToken): boolean {
  return (token.pos & POS1) === 格助詞;
}

function isSubjectTopicParticle(token: ClauseToken): boolean {
  return (token.pos & POS0) === 助詞 && SUBJECT_TOPIC_SURFACE.has(token.surface);
}

function isNounishToken(token: ClauseToken): boolean {
  return NOUNISH_POS0_NUM.has(token.pos & POS0);
}

function consumeQuotativeMarker(tokens: readonly ClauseToken[], start: number): readonly [string | null, number | null] {
  const idx = nextNonSpaceIndex(tokens, start);
  if (idx === null) {
    return [null, null];
  }
  const relation = quoteMarkerRelationAt(tokens, idx, { consumers: ["clause_layout"] });
  if (relation !== null) {
    return [relation.canonicalSurface, relation.span.endExclusive];
  }
  return [null, null];
}

function tailAfterQuote(tokens: readonly ClauseToken[], end: number): readonly [QuoteTailKind, number | null] {
  const idx = nextNonSpaceIndex(tokens, end + 1);
  if (idx === null) {
    return ["none", null];
  }
  const token = tokens[idx]!;
  const bridgeArgument = quoteHostSearchBridgeArgumentRelationAt(tokens, idx, {
    consumers: ["clause_layout"]
  });
  if (bridgeArgument?.argumentKind === "object") {
    return ["wo", idx];
  }
  if (bridgeArgument?.argumentKind === "subject_topic") {
    return ["ga_ha_mo", idx];
  }
  if (
    predicateNominalizerRelationForToken(token, idx, {
      requirement: "quote_tail_marker",
      consumers: ["clause_layout"]
    })?.nominalizerKind === "no"
  ) {
    return ["no", idx];
  }

  if (quoteMarkerContinuationRelationAt(tokens, idx, { consumers: ["clause_layout"] }) !== null) {
    return ["toshite", idx];
  }

  const [marker, afterMarker] = consumeQuotativeMarker(tokens, end + 1);
  if (marker !== null && afterMarker !== null) {
    const nextIdx = nextNonSpaceIndex(tokens, afterMarker);
    if (nextIdx === null) {
      return ["to_other", idx];
    }
    const nextLemma = tokens[nextIdx]!.dictionaryForm || tokens[nextIdx]!.surface;
    if (
      IU_LEXEME_FORMS.has(nextLemma) &&
      toiuAttributiveHeadIndex(tokens, end + 1, tokens.length) !== null
    ) {
      return ["toiu_noun", idx];
    }
    if (SAFE_REPORTING_LEMMA.has(nextLemma)) {
      return ["to_safe_reporting", idx];
    }
    if (THOUGHT_REPORTING_LEMMA.has(nextLemma)) {
      return ["to_thought", idx];
    }
    return ["to_other", idx];
  }

  if ((token.pos & POS0) === 助詞) {
    return ["other_particle", idx];
  }
  return ["other", idx];
}

function nominalizingTailAfterQuote(tokens: readonly ClauseToken[], end: number): NominalizingTailKind {
  const idx = nextNonSpaceIndex(tokens, end + 1);
  if (idx === null) {
    return "none";
  }
  const token = tokens[idx]!;
  if (token.surface === "だけ") {
    return "dake";
  }
  if ((token.dictionaryForm || token.surface) === "こと") {
    return "koto";
  }
  if (
    predicateNominalizerRelationForToken(token, idx, {
      requirement: "quote_tail_marker",
      consumers: ["clause_layout"]
    })?.nominalizerKind === "no"
  ) {
    const nextIdx = nextNonSpaceIndex(tokens, idx + 1);
    if (nextIdx === null) {
      return "none";
    }
    const nextSurface = tokens[nextIdx]?.surface;
    if (nextSurface === "が") {
      return "no_ga";
    }
    if (nextSurface === "は") {
      return "no_wa";
    }
  }
  return "none";
}

function toiuNounHead(tokens: readonly ClauseToken[], end: number): ClauseToken | undefined {
  const [, afterMarker] = consumeQuotativeMarker(tokens, end + 1);
  if (afterMarker === null) {
    return undefined;
  }
  const iuIdx = nextNonSpaceIndex(tokens, afterMarker);
  if (iuIdx === null || !IU_LEXEME_FORMS.has(tokens[iuIdx]!.dictionaryForm || tokens[iuIdx]!.surface)) {
    return undefined;
  }
  const headIdx = toiuAttributiveHeadIndex(tokens, end + 1, tokens.length);
  if (headIdx === null || !isNounishToken(tokens[headIdx]!)) {
    return undefined;
  }
  return tokens[headIdx];
}

function hasNonToiuNamingFrameAfterQuote(tokens: readonly ClauseToken[], end: number): boolean {
  const markerIdx = nextNonSpaceIndex(tokens, end + 1);
  const continuation = markerIdx === null
    ? null
    : quoteMarkerContinuationRelationAt(tokens, markerIdx, { consumers: ["clause_layout"] });
  if (continuation !== null) {
    const afterContinuationIdx = nextNonSpaceIndex(tokens, continuation.span.endExclusive);
    if (
      afterContinuationIdx !== null &&
      NAMING_PRONE_LEMMA.has((tokens[afterContinuationIdx]!.dictionaryForm || tokens[afterContinuationIdx]!.surface))
    ) {
      return true;
    }
  }

  const [, afterMarker] = consumeQuotativeMarker(tokens, end + 1);
  if (afterMarker === null) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, afterMarker);
  if (nextIdx === null) {
    return false;
  }
  const nextLemma = tokens[nextIdx]!.dictionaryForm || tokens[nextIdx]!.surface;
  return NAMING_PRONE_LEMMA.has(nextLemma);
}

function hasSahenSuruFrame(tokens: readonly ClauseToken[], end: number, internalHeadIsSahenCapableNoun: boolean): boolean {
  if (!internalHeadIsSahenCapableNoun) {
    return false;
  }
  let idx = nextNonSpaceIndex(tokens, end + 1);
  if (idx === null) {
    return false;
  }
  const objectFrame = quoteHostSearchBridgeArgumentRelationAt(tokens, idx, {
    consumers: ["clause_layout"]
  });
  if (objectFrame?.argumentKind === "object") {
    idx = nextNonSpaceIndex(tokens, idx + 1);
    if (idx === null) {
      return false;
    }
  }
  return (tokens[idx]!.dictionaryForm || tokens[idx]!.surface) === "する";
}

function hasDescriptiveFrame(tokens: readonly ClauseToken[], end: number): boolean {
  const [marker, afterMarker] = consumeQuotativeMarker(tokens, end + 1);
  if (marker === null || afterMarker === null) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, afterMarker);
  return nextIdx !== null && CLEAR_DESCRIPTIVE_LEMMA.has(tokens[nextIdx]!.dictionaryForm || tokens[nextIdx]!.surface);
}

function hasNearbyReportingPredicate(tokens: readonly ClauseToken[], end: number, maxContentTokens = 5): boolean {
  let idx = end + 1;
  let seen = 0;
  while (idx < tokens.length && seen < maxContentTokens) {
    const token = tokens[idx];
    if (token !== undefined && isContentToken(token)) {
      seen += 1;
      const lemma = token.dictionaryForm || token.surface;
      if (SAFE_REPORTING_LEMMA.has(lemma) || THOUGHT_REPORTING_LEMMA.has(lemma)) {
        return true;
      }
    }
    idx += 1;
  }
  return false;
}

function spanLengthBucket(length: number): SpanLengthBucket {
  if (length <= 3) {
    return "1_3";
  }
  if (length <= 8) {
    return "4_8";
  }
  return "9_plus";
}
