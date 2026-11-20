import { TokenCursor } from "../../../../token-cursor.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { MorphemeEntry } from "../../../../../types/dictionary.js";
import type { NumericBasePayload } from "../../../../../types/numeric-base.js";
import { tryNumeral } from "../../../../semantics/numeric.js";
import { isCopulaSupportChainStartAt } from "../../../../semantics/copula-tail-runtime.js";
import { methodYouGaNaiIdiomShapeAt } from "../matchers/method-you-idiom.js";
import { BARE_KAMO_EVIDENCE_SCOPE, wakeExplanatoryCopulaConjecture, wakeExplanatoryCopulaPolite } from "../matchers/modal-tail.js";
import { adnominalCopulaTailFollows, matchCopula } from "../matchers/copula.js";
import { matchNegationEnding } from "../matchers/negation-ending.js";
import { matchNiChigaiNaiProjectionCarrierAt, matchNiKimatteIruProjectionCarrierAt } from "../matchers/projection-carrier.js";
import { matchScopeBridge } from "../matchers/scope-bridge.js";
import { matchCompositeConnectiveAt, matchQuotedConcessiveConnectiveAt } from "../matchers/connective.js";
import { matchYouNiPredicateProjectionConnectiveAt } from "../matchers/predicate-projection-connective.js";
import { isKamoShirenaiModalStartAtToken, type BareKamoAdmissionContext } from "../matchers/kamo-modal.js";
import { detectSahenPredicateStart, isBareKeijoujiZeroTailPredicateStart, isNominalCopulaHostPos, isNounCopulaPredicateStart, isRentaishiPronominalNoPredicateStart, isDemonstrativePropositionWakeHostStart, isNominalEvidentialRashiiPredicateStart, nounCompoundSuffixRunEnd } from "./readiness.js";
import { isTosuruResultativeMakeForm } from "../tosuru-construction-mode.js";
import { activeProtoLayout, isClausePunctuationToken } from "../../../../clause-layout/index.js";
import { sourceContextMayBePredicateAt } from "../../../../clause-layout/predicate-shape.js";
import { renyouHeadBunsetsuContinuesInto } from "../../../../clause-layout/chuushi-closure.js";
import { previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { quoteStructuralRelationAt } from "../../../../structural-relation/quote.js";
import { quoteFocusLimitNegationTailStartingAt } from "../../segments/quote-focus.js";
import { classifyDatteMarkerAt, toiuAttributiveBoundarySplitAt, toiuAttributiveHeadIndex, toiuAttributiveTailEnd } from "../../../../semantics/marker-roles.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import type { ClauseBoundary } from "../commit.js";
import { appearancePerceptionProjectionForToken, appearancePerceptionReadingForToken } from "../appearance-perception-carrier-table.js";
import { classifyAttributiveHeadKind, isQuotedTopicFormalNounHead } from "../structural-attributive-head-table.js";
import { isDerivedNominalPhraseHead } from "../derivational-suffix-table.js";
import { lookupConnectiveBySurface } from "../connective-surface-lookup.js";
import type { PostverbAuxiliaryPayload } from "../grammar.js";
import { hasRealContentAfterIndex, isHardTerminalPunctuationToken, isNonTerminalClauseBreakPunctuationToken } from "../../../boundary/punctuation.js";
import type { MorphemeDictionary } from "../../../../../dictionary/morpheme.js";
import { caseParticleMarkerRelationForToken, copulaNiMarkerRelationForToken, kaMarkerRelationAt, quotativeDerivedIdiomClaimAt, topicFocusMarkerRelationAt } from "../../../boundary/marker.js";
import { cachedCanonicalReformulationMarkerRelationIndex, speakerAcknowledgmentKaClosureIndexAt } from "../../../boundary/ka-ownership.js";
import { datteQuoteMarkerRelationAt, quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { clauseContainsInterrogativeBeforeKa, clauseContainsLexicalizedInterrogativeBefore, clauseContainsPredicateChoiceKaBefore } from "../../../../quote/embedded-question.js";
import { isStreamVvCompoundPairAt, streamVvCompoundPairLacksRegisteredOwnerAt } from "../../../../compounds/compound-verbs.js";
import { isPostverbAuxiliaryActivationAccepted, isPostverbAuxiliaryToken, postverbAuxiliaryDeclaresHostAttachForm, postverbAuxiliaryPayloadsForForm } from "../postverb-auxiliary-parser.js";
import { POS0, POS01, pos0in, POS1, POS2, POS4, POS5, POS5A, 形状詞可能, 形容詞0, 助詞, 助動詞 as 助動詞0, 助動詞_ダ, 助動詞語幹, 代名詞, 動詞, 非自立可能, 副詞, 名詞, 連体形_, 連体詞, 連用形_, 連用形_一般, isBareNaAdjSet, isLexicalAdverb, isNaAdjCapableNoun, PREDICATE_BITS, 助詞_終助詞, isPrefixAffixToken } from "../../../../../types/pos.js";
import { IU_LEXEME_FORMS, isSayVerbToken } from "../../../data/quoted-reporting-sets.js";
import { renyouCompoundPrenominalAttributiveTerminalAllowed, adnominalCopulaAttributiveHeadCanBeExternallyOwned, explicitAdnominalNoAttributiveEvidenceAt, isBareQuoteAttributiveCarrierBoundary, isNominalAdnominalCopulaHostSpan, attributiveSpanEndsWithAdnominalCopula } from "./attributive-boundary.js";
import { isDeicticCopulaPredicateStart, isAdverbCopulaPredicateStart, isDetachedCopulaSupportVerbStart, type NounPhraseHeadSpan, nounPhraseHeadSpan, numeralResolutionContext, type NumericHostSpanReservation, isQuestionComplementHostPos, isQuestionComplementPredicateStart, isNominalQuestionTerminalStart, isNominalLikenessPredicateStart, numericBasePlanFrom } from "./predicate-start-evidence.js";
import { bareNominalQuoteBoundary, hasRenyouChuushiContinuation, renyouChuushiDetachedClosureAt, adnominalCopulaAttributiveFormPausesAtWeakPunctuation } from "./clause-boundaries.js";
import { adjectiveAdverbialModifierPredicateReachable, isNominalLikeAttributiveHead, entryHasPredicateStemTranslation, sourceAllowsPredicateCopulaHostCandidates, sourceHasFormalToStateResultCarrier, sourceHasAdverbialSurfacePostverbCarrier, isNegationLikeToken } from "./predicate-evidence.js";
import type { IntegrationInput, TailParserSourceStemKind, ParseSliceSourceHost } from "./contracts.js";

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

export async function renyouPredicateHeadLacksPredicateSense(
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

export async function zeroTailRenyouChuushiPredicateHeadAdmitted(
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

export function isPotentialTailChunkStart(
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

export function adverbHostStartsTailChunk(
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

export function adverbHostCarriesCanonicalReformulationMarker(
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

export function isKeijoujiKanouYouNiProjectionStart(
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

export function directNounAttachingPostverbAuxiliaries(dictionaryForm: string | undefined): readonly PostverbAuxiliaryPayload[] {
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

export function isNominalRenyouMethodYouIdiomStart(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const noun = tokens[idx];
  return noun !== undefined &&
    (noun.pos & POS0) === 名詞 &&
    methodYouGaNaiIdiomShapeAt(tokens, idx + 1) !== null;
}

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

export function isAdverbialKamoModalPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  const token = tokens[idx];
  return token !== undefined &&
    (token.pos & POS0) === 副詞 &&
    isKamoShirenaiModalStartAtToken(tokens, idx + 1, bareKamoAdmissionContextAt(tokens, idx + 1, lookups));
}

export function isAdverbialConjecturePredicateStart(
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

export function isNounKamoModalPredicateStart(
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

export async function bareTteAttributiveStartLacksPredicateSense(
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

export function isNominalDirectConnectivePredicateStart(
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

export function mentionedHostCarriesCanonicalReformulationMarker(
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
  const relation = cachedCanonicalReformulationMarkerRelationIndex(tokens, lookups)?.relationAtQuoteMarker(markerIdx);
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

export function isStandaloneNumeralHeadSpan(span: NounPhraseHeadSpan, idx: number): boolean {
  return span.numeral !== null && span.suffixStart === idx + 1 && span.endExclusive === idx + 1;
}

export function contextResolvedNounPhraseNumeral(
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

export function isBareNominalQuoteContentNounPhrase(
  boundary: ClauseBoundary | undefined,
  nounPhraseEndIdx: number
): boolean {
  return boundary !== undefined &&
    boundary.kind !== "terminal" &&
    boundary.connectiveKind === "quotative" &&
    "tokenSpan" in boundary &&
    boundary.tokenSpan.start === nounPhraseEndIdx;
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

function isQuotativeDerivedIdiomHostStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number
): boolean {
  const token = cursor.tokens[start];
  return token !== undefined &&
    isQuestionComplementHostPos(token.pos & POS0) &&
    quotativeDerivedIdiomClaimAt(cursor.tokens, start + 1, { consumers: ["tail_multi_clause"] }) !== null;
}

export function nominalTerminalQuestionClaimsHeadAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups: LookupTables
): boolean {
  return isNominalQuestionTerminalStart(cursor, start, numeric, lookups);
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

export function isSplitSuppletiveNegativeSurfaceStart(
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
