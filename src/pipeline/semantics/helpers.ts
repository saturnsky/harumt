
export {
  META_LINGUISTIC_QUOTATIVE_HEADS,
  MONO_NO_ADVERSATIVE_ADVERBS,
  MONO_NO_ADVERSATIVE_HEAD_NOUNS,
  MONO_NO_GENITIVE_HEAD_NOUNS,
  PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS
} from "../head-tail/data/semantic-helper-sets.js";
export {
  hokaBareNounContinuationLooksAdditive,
  looksLikeAdversativeMonoNo,
  matchHokaAdditiveConnectiveStart,
  matchMonoNoConcessiveConnectiveStart,
  matchNegativeTailStart,
  matchNoNiConcessiveConnectiveStart,
  shouldSuppressConnMonoNo
} from "../head-tail/boundary/connective-start.js";
export {
  looksLikePurposeEvaluationNoNi,
  looksPronominalNoDe,
  looksPronominalNoNi,
  looksPronominalNoNiResult
} from "../head-tail/boundary/pronominal-no.js";

export {
  BORROW_PERMISSIVE_CONNECTIVE_ROLES,
  PredicateArgument,
  PredicateArgumentView,
  TOPIC_FOCUS_ARGUMENT_PARTICLES,
  argumentNounLookupForms,
  argumentNounLookupMatches,
  getArgumentNounBeforeParticle,
  getReferentForms,
  getReferentIndexBeforeParticle,
  getReferentTokenBeforeParticle,
  hasModifierBeforeTokiHead,
  isAnimateReferentBeforeNi,
  isAnimateReferentToken,
  isHumanCollectiveToken,
  isHumanReferentToken,
  isKaraIttePerspectiveTail,
  isKaraMitePerspectiveTail,
  isNumericTimeComponent,
  isObliqueCaseChain,
  isPersonByContext,
  isPersonCountBeforeDe,
  isPersonCountToken,
  isPersonToken,
  isPlaceNoun,
  isPlaceScopeNoun,
  isPluralSuffixToken,
  isPredicateArgumentParticle,
  isProperPersonToken,
  isQuantityMeasureToken,
  isQuantityPeriodPhraseBeforeNo,
  isQuotationContext,
  isQuotedJudgmentPassiveQuotationContext,
  isQuotativeToTokens,
  isQuotativeToTokensWide,
  isRoleNoun,
  isTemporalArgumentToken,
  isTemporalConditionHeadNiContext,
  isTemporalExpressionToken,
  isTimeExpressionBeforeKara,
  isTimeExpressionBeforeParticle,
  nextVerbDictForm,
  nounArgumentModifierEvidence,
  numericCounterArgumentToken,
  precedingIsIdiomNoun,
  scansToSpeechPredicate,
  tokenInSemanticCategories
} from "../head-tail/candidate/semantic-classifiers.js";
export type { SemanticClauseSpan } from "../head-tail/candidate/semantic-classifiers.js";
