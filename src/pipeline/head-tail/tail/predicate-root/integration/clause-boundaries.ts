import { TokenCursor } from "../../../../token-cursor.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { classifySingleAuxTokenOps } from "../parser.js";
import { predicateQuoteCarrierStartsAt } from "../matchers/predicate-quote.js";
import { elidedDewaNegativeBodyHostAdmitsAt, matchCopula, type ElidedDewaNegativeBodyClosure, type ElidedDewaNegativeBodyClosureKind } from "../matchers/copula.js";
import { copulaConcessiveImperativeEvidenceAt } from "../classifiers/copula-concessive.js";
import { DEARE_CONCESSIVE_CONNECTIVE_SURFACE, focusedNegationShapeAt, isLikenessModalAdnominalTailEnd, isAppearanceModalAdnominalTailEnd, isAffirmativeCopulaSupportVerbToken, isBareMoConcessivePreviousToken, volitionalAttemptMarkerAt, collapsedAspectAuxKind, terminalAssertiveCopulaSpanEndingBefore } from "../classifiers/tokens.js";
import { isBekiRentaiNominalizedFrameEnd, plainNominalizerFrameEndVerdictAt } from "../matchers/nominalizer.js";
import { isPredicateScopeCarrierSuffixStart, matchFocusConnectiveAt } from "../matchers/focus-connective.js";
import { likenessEvaluativeConditionHasConsequentAt, likenessEvaluativeConditionMarkerStartEndingAt, matchScopeBridgeBeforeBasicCopula, quoteMarkerClosesUtteranceAfter } from "../matchers/scope-bridge.js";
import { matchCompositeConnectiveAt, matchQuotedConcessiveConnectiveAt, matchReformulationConnectiveAt, matchRetrospectiveQuoteConnectiveAt, matchQuestionReformulationConnectiveAt, type CompositeConnectiveMatch } from "../matchers/connective.js";
import { matchBoundNominalReasonConnectiveAt } from "../matchers/bound-nominal-connective.js";
import { matchTameConnectiveAt } from "../matchers/tame-connective.js";
import { matchTokoroResultConnectiveAt } from "../matchers/tokoro-result-connective.js";
import { isObligationSpanContaining } from "../matchers/obligation.js";
import { matchLicensesNpModifyingContinuation, matchPredicateProjectionConnectiveAt, matchQuotativeMannerSimileConnectiveAt, matchGotokuMannerSimileConnectiveAt, matchKaNoYouNiMannerSimileConnectiveAt, matchYouNiPredicateProjectionConnectiveAt, matchZeroNiPurposeProjectionConnectiveAt, type YouNiPredicateProjectionConnectiveMatch } from "../matchers/predicate-projection-connective.js";
import { isKamoShirenaiModalStartAtToken } from "../matchers/kamo-modal.js";
import { detectSahenPredicateStart, hasPredicateProjectionClauseContinuation, hasSupportedClauseContinuation, isBareKeijoujiZeroTailPredicateStart, isNominalCopulaHostPos, isSupportedClauseStart, isSupportedConditionalContinuation, isNominalEvidentialRashiiPredicateStart, nounCompoundSuffixRunEnd, terminalOnlyPredicateEndpointClosesBefore } from "./readiness.js";
import { closesUtteranceAs, utteranceClosureAfter, utteranceClosureTokenIdx, type UtteranceClosureEvidence, type UtteranceClosureKind } from "../../../../clause-layout/utterance-closure.js";
import { activeProtoLayout, isClausePunctuationToken, protoLayoutForTokens, skipClausePunctuationForward } from "../../../../clause-layout/index.js";
import { nextClauseNonPunctuationIndex, previousClauseNonPunctuationIndex } from "../../../../clause-layout/navigation.js";
import type { ProtoClauseLayout } from "../../../../clause-layout/proto-layout.js";
import { renyouChuushiClosureGovernedAfter, renyouChuushiClosureLeftAt, isAuxChainRenyouChuushiBoundaryEnd, isCopulaNegativeRenyouBoundaryEnd, isImmediatePredicateTailContinuationAfterRenyou } from "../../../../clause-layout/chuushi-closure.js";
import type { RenyouJunctureEvidence } from "../../../../clause-layout/juncture-verdict.js";
import { SEPARATION_OPENS_BOUNDARY, nextNonSpaceIndex, previousNonSpaceIndex, separatedAs } from "../../../../clause-layout/trivia.js";
import { terminalPunctuationRunQuestionTokenIndex } from "../../../../clause-layout/punctuation.js";
import { activeProtoClosesClauseAtDetachedTerminalNodaAfter, activeProtoClosedPropositionBeforeMarkerAt, activeProtoScopedScanEnd, closesClauseAtDetachedTerminalNodaAfter } from "../../../../clause-layout/proto-state.js";
import { isBaSufficiencyConditionalAt, isPastGoodEvaluationPredicateAt, matchPermissionPredicateAt } from "../../../../semantics/permission-idiom.js";
import { detectSfp, terminalSfpRunConsumedThrough } from "../../../../semantics/grammar-runtime.js";
import { quoteClauseBoundaryFromRelation, quoteConsumedMarkerSpanFromRelation } from "../../../../structural-relation/quote-clause-boundary.js";
import { quoteHostAllowsBareNominalContent } from "../../../../structural-relation/quote-nominal-and-passive.js";
import { quoteStructuralRelationAt } from "../../../../structural-relation/quote.js";
import { quoteHostMatchAfterMarker, quoteHostMatchBlockedByNegativeCondition } from "../../../../quote/host-taxonomy.js";
import { hasYouZeroDirectiveMatrixPredicateAhead, hasYouZeroPressureTail, isNegativePurposeFragmentHostEnd, isYouNiQuoteDirectivePredicateStart } from "../../../../semantics/you-zero-directive.js";
import { youNiQuoteDirectiveProjectionSpanAt } from "../matchers/predicate-projection-connective.js";
import { quoteFocusMarkerStartingAt } from "../../segments/quote-focus.js";
import { nominalFrameTailSurfaceSpecs } from "../../segments/nominal-frame.js";
import { relationConnectiveSpansAt, relationDiscontinuousClosureSpanAfter, tokenMatchesConnectiveKind } from "../../connective-span-scanner.js";
import { toiuAttributiveBoundarySplitAt, toiuAttributiveTailEnd } from "../../../../semantics/marker-roles.js";
import { matchHokaAdditiveConnectiveStart, matchMonoNoConcessiveConnectiveStart, matchNoNiConcessiveConnectiveStart } from "../../../boundary/connective-start.js";
import { isAnimateReferentToken, isPersonToken } from "../../../candidate/semantic-classifiers.js";
import { PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS } from "../../../data/semantic-helper-sets.js";
import { isTameHead, lookupSetMatches } from "../../../../lookup-tables.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import type { ClauseBoundary } from "../commit.js";
import { appearanceModalPlaceAspectHeadIsNounPhraseHead } from "../boundary-semantics.js";
import { classifyTeTailContinuation, isTeConnectiveToken } from "../../postverb-tail-classifier.js";
import { classifyAttributiveHeadKind, isLikenessPlaceAspectAttributiveHead } from "../structural-attributive-head-table.js";
import { predicateSuffixKindForDictionaryForm } from "../derivational-suffix-table.js";
import { connectiveSurfaceAllowsPartialPrefix, connectiveSurfaceRequiresAttachmentEvidence, lookupConnectiveBySurface } from "../connective-surface-lookup.js";
import type { AttributiveBoundaryPayload, ConnectiveKind, TailRoot, TeFormConnectiveRole } from "../grammar.js";
import type { MorphemeDictionary } from "../../../../../dictionary/morpheme.js";
import { aspectResultHostCategory, chainFinalOpHostCategory, firstAuxLayer } from "../inspect.js";
import { clauseStartEvidenceRelationAfter, clauseStartEvidenceSatisfiesRequirement, connectiveAdmitsEllipticFollowerClause, hasEllipticFollowerClauseEvidence, hasRenyouChuushiClauseContinuationAfter, isRefusedUtteranceHeadToken } from "../../../boundary/clause-start.js";
import { copulaFocusContinuationRelationAt } from "../../../boundary/window.js";
import type { ClauseStartEvidenceKind } from "../../../boundary/relation.js";
import { activeProtoUtteranceRange } from "../../../../clause-layout/proto-state.js";
import { caseParticleMarkerRelationForToken, conditionalTailConnectiveRelationForToken, conditionalToConnectiveRelationAt, copulaDeMarkerRelationForToken, copulaNiMarkerRelationForToken, externalNominalizerContinuationRelationAt, nominalLinkMarkerRelationAt, predicateNominalizerRelationForToken, questionContentContinuationAfterKaRelationAt, quotativeDerivedIdiomClaimAt } from "../../../boundary/marker.js";
import { canonicalReformulationMarkerRelationIndex } from "../../../boundary/ka-ownership.js";
import { quoteMarkerContinuationRelationAt, quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { isExternalNominalizerConnectiveKind } from "../../../boundary/relation.js";
import { looksQuestionContentNominalizedAfterKa, looksQuoteQuestionTakingAfter, looksQuestionTakingAfter } from "../../../../quote/embedded-question.js";
import { looksLikePurposeEvaluationNoNi, looksPronominalNoDe, noNiBindingParticleBlocksAdversative } from "../../../boundary/pronominal-no.js";
import { matchQuotedJudgmentPassiveTail } from "../../../../semantics/modality-specs.js";
import { streamVvCompoundPairLacksRegisteredOwnerAt } from "../../../../compounds/compound-verbs.js";
import { postverbAuxiliaryPayloadsForForm } from "../postverb-auxiliary-parser.js";
import { NOMINAL_BITS, POS0, POS01, pos0in, POS1, POS4, POS5A, 意志推量形_, isAssertiveCopulaFamilyPos, 仮定形_, 格助詞, 係助詞, 形状詞, 形容詞0, 形容詞的, 終止形_, 助詞, 助詞_接続助詞, 助動詞 as 助動詞0, 助動詞_タ, 助動詞_ダ, 助動詞_ジャ, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 助動詞_マス, 助動詞_レル, 助動詞語幹, 接続助詞, 接頭辞, 接尾辞, 代名詞, 動詞, 副詞, 副助詞, 未然形_, 名詞, 命令形_, 連体形_, 連体詞, 連用形_, isNaAdjCapableNoun, isVerbPredicateToken, isRenyouInflectedToken, 助詞_終助詞, 助詞_副助詞, 助詞_係助詞, 助詞_格助詞, 助詞_準体助詞, isImperativeInflection, isIndependentWordToken, isRenyouInflection, isLexicalPureNaAdjStem } from "../../../../../types/pos.js";
import { IU_LEXEME_FORMS } from "../../../data/quoted-reporting-sets.js";
import type { IntegrationInput, NonTerminalClauseBoundary } from "./contracts.js";
import { structuralAttributiveAssemblerSuffixPayload, isSoudaYotaiAdverbialModifierBoundaryEnd, isDeclaredProjectionCarrierAdverbialBoundaryEnd, attributiveBoundarySplitAt, adnominalCopulaAttributiveHeadCanBeExternallyOwned, classifyStructuralAttributiveBoundaryPayload, attributiveEventModifierChainHeadIndexAt, isBareQuoteAttributiveCarrierBoundary, isSimpleKeijoujiAdnominalAttributiveSpan, isStandaloneLikenessMarkerAttributiveSpan, attributiveSpanEndsWithAdnominalCopula, predicateModalAttributiveSpan, isProjectingModalFormalNounAttributiveHead, attributiveSpanCarriesObligationIdiom, isMonoAttributiveHead, isBareTteAttributiveNounHead } from "./attributive-boundary.js";
import { explicitQuoteSpanContentTailRelation, inferExternalNominalizerBoundaryAtScanEnd, chuushiClosureEvidenceAt, isSimpleAspectAuxiliaryToken, isSuppressedCompositeBoundary, withQuotedQuestionContext, normalizeTokaListingBoundary, isZeroNominalizedParallelMoMarker, classifySingleTokenBoundary, isFiniteOrCopulaAdversativeGaBoundary } from "./end-boundary-inference.js";
import { isTeFocusAspectBoundary, isExternalNominalizerPredicateContinuation, isDeicticCopulaPredicateStart, nounPhraseHeadSpan } from "./predicate-start-evidence.js";
import { whitespaceJunctureEndsTailChunkAt, pauseJunctureEndsTailChunkAt, spaceSeparatesTailChunkFromFollowingPostverbClause, terminalCopulaSeparatedFromFollowingClause } from "./tail-chunk-scan-end.js";
import { isNominalLikeAttributiveHead, stemTokenEndsWithNoKoto, isKotodashiReasonScopeTail } from "./predicate-evidence.js";

interface AssemblerResumableTailPrefixBoundary {
  readonly end: number;
  readonly boundary: ClauseBoundary;
  readonly auditReason: string;
  readonly terminalProjection?: "attributive";
  readonly attributivePayload?: AttributiveBoundaryPayload;
}

export function assemblerResumableTailPrefixBoundaries(
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

export interface SourceBearingConnectivePrefixBoundary {
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

export function sourceBearingConnectivePrefixBoundaries(
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

export function weakAttachmentSourceBearingBoundaryAtScanEnd(
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

export function tailPartialSuffixCanStayInAssembler(
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

export function isExplicitQuoteSpanContentZeroTailHead(
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

export interface DetectedClauseBoundary {
  readonly splitAt: number;
  readonly boundary: ClauseBoundary;
}

type BoundaryResultCache<T> = WeakMap<ProtoClauseLayout, WeakMap<object, Map<string, T>>>;
const clauseBoundaryCache: BoundaryResultCache<readonly DetectedClauseBoundary[]> = new WeakMap();
const partialBoundaryCache: BoundaryResultCache<ReadonlyMap<number, ClauseBoundary>> = new WeakMap();
const NO_ACTIVE_PROTO = {};

function boundaryResultCacheFor<T>(cache: BoundaryResultCache<T>, layout: ProtoClauseLayout): Map<string, T> {
  let byScope = cache.get(layout);
  if (byScope === undefined) {
    byScope = new WeakMap();
    cache.set(layout, byScope);
  }
  const scope = activeProtoLayout() ?? NO_ACTIVE_PROTO;
  let results = byScope.get(scope);
  if (results === undefined) {
    results = new Map();
    byScope.set(scope, results);
  }
  return results;
}

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
  const layout = protoLayoutForTokens(tokens, lookups);
  const utterance = layout.utteranceRangeOfToken(Math.max(lastBoundaryTokenIdx, 0));
  const closingRun = layout.terminalPunctuationRuns.find((run) => run.span.start === utterance.endExclusive);
  return Math.min(tokens.length, closingRun?.span.endExclusive ?? utterance.endExclusive);
}

interface ClauseBoundaryCollection {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly range: { readonly start: number; readonly end: number };
  readonly lookups: LookupTables;
  readonly layout: ProtoClauseLayout;
  readonly boundaries: Map<number, DetectedClauseBoundary>;
}

export function findClauseBoundaries(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): readonly DetectedClauseBoundary[] {
  const { tokens } = cursor;
  const range = { start: cursor.pos, end: cursor.end };
  const layout = protoLayoutForTokens(tokens, lookups);
  const cacheKey = `${range.start}:${range.end}`;
  const perTokenCache = boundaryResultCacheFor(clauseBoundaryCache, layout);
  const cached = perTokenCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const boundaries = new Map<number, DetectedClauseBoundary>();
  const ctx: ClauseBoundaryCollection = { cursor, tokens, range, lookups, layout, boundaries };
  collectLayoutConnectiveEventBoundaries(ctx);
  collectCaseParticleToConditionalBoundaries(ctx);
  collectAdversativeGaBoundaries(ctx);
  collectConcessiveMoBoundaries(ctx);
  collectCopulaDeMoFocusBoundaries(ctx);
  collectYouNiProjectionBoundaries(ctx);
  collectGotokuSimileBoundaries(ctx);
  collectKaNoYouNiSimileBoundaries(ctx);
  collectZeroNiPurposeProjectionBoundaries(ctx);
  collectPredicateProjectionBoundaries(ctx);
  collectFocusConnectiveBoundaries(ctx);
  collectHokaAdditiveBoundaries(ctx);
  collectMonoNoConcessiveBoundaries(ctx);
  collectNoNiConcessiveBoundaries(ctx);
  collectReformulationBoundaries(ctx);
  collectQuotedConcessiveBoundaries(ctx);
  collectRetrospectiveQuotativeBoundaries(ctx);
  collectQuestionReformulationBoundaries(ctx);
  collectQuestionQuotativeKaToBoundaries(ctx);
  collectQuoteContentMarkerBoundaries(ctx);
  collectBoundNominalReasonBoundaries(ctx);
  collectTameBoundaries(ctx);
  collectTokoroResultBoundaries(ctx);
  collectCompositeConnectiveBoundaries(ctx);
  collectConditionalAuxBoundaries(ctx);

  const result = [...boundaries.values()].sort((a, b) => a.splitAt - b.splitAt);
  perTokenCache.set(cacheKey, result);
  return result;
}

function upsertClauseBoundary(ctx: ClauseBoundaryCollection, boundary: DetectedClauseBoundary): void {
  const { cursor, tokens, range, lookups, boundaries } = ctx;
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
}

function collectLayoutConnectiveEventBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, tokens, range, lookups, layout } = ctx;
  for (const ev of layout.boundaryEventsInRange(range.start + 1, range.end + 1)) {
    if (ev.kind !== "connective") continue;
    const boundaryTokenIdx = ev.splitAt - 1;
    if (isSuppressedSingleTokenBoundary(cursor, boundaryTokenIdx, ev.splitAt)) continue;
    if (isObligationSpanContaining(tokens, ev.splitAt - 1)) continue;
    const closure = chuushiClosureEvidenceAt(tokens, ev.splitAt, lookups);
    if (closure?.right === "detached") continue;
    if (closure?.hostKind === "renyou") {
      upsertClauseBoundary(ctx, { splitAt: ev.splitAt, boundary: { kind: "terminal" } });
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
    upsertClauseBoundary(ctx, { splitAt: ev.splitAt, boundary });
  }
}

function collectCaseParticleToConditionalBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, tokens, range, lookups } = ctx;
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
    upsertClauseBoundary(ctx, {
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
}

function collectAdversativeGaBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
  for (let markerIdx = range.start + 1; markerIdx < range.end; markerIdx += 1) {
    if (!isFiniteOrCopulaAdversativeGaBoundary(tokens, markerIdx, range.start)) {
      continue;
    }
    const splitAt = markerIdx + 1;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsertClauseBoundary(ctx, {
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
}

function collectConcessiveMoBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
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
    upsertClauseBoundary(ctx, {
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
}

function collectCopulaDeMoFocusBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range } = ctx;
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
    upsertClauseBoundary(ctx, {
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
}

function collectYouNiProjectionBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, tokens, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const quotedDirectiveBoundary = youNiQuoteDirectiveProjectionBoundaryAt(cursor, i, lookups);
    if (quotedDirectiveBoundary !== null) {
      upsertClauseBoundary(ctx, {
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
          upsertClauseBoundary(ctx, {
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
      upsertClauseBoundary(ctx, {
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
    upsertClauseBoundary(ctx, {
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
}

function collectGotokuSimileBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const gotoku = matchGotokuMannerSimileConnectiveAt(tokens, i);
    if (gotoku === null) continue;
    const splitAt = i + gotoku.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (nextStart >= range.end) continue;
    if (!hasPredicateProjectionClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsertClauseBoundary(ctx, {
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
}

function collectKaNoYouNiSimileBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const kaNoYouNi = matchKaNoYouNiMannerSimileConnectiveAt(tokens, i, lookups);
    if (kaNoYouNi === null) continue;
    const splitAt = i + kaNoYouNi.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (nextStart >= range.end) continue;
    if (!hasPredicateProjectionClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsertClauseBoundary(ctx, {
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
}

function collectZeroNiPurposeProjectionBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const boundary = zeroNiPurposeProjectionBoundaryAt(cursor, i, lookups);
    if (boundary === null) continue;
    upsertClauseBoundary(ctx, {
      splitAt: i + 1,
      boundary
    });
  }
}

function collectPredicateProjectionBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
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
    upsertClauseBoundary(ctx, {
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
}

function collectFocusConnectiveBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const match = matchFocusConnectiveAt(tokens, i);
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    upsertClauseBoundary(ctx, {
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
}

function collectHokaAdditiveBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, tokens, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const consumed = matchHokaAdditiveConnectiveStart(cursor.fork(i, range.end));
    if (consumed === null) continue;
    const splitAt = i + consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsertClauseBoundary(ctx, {
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
}

function collectMonoNoConcessiveBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, tokens, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const consumed = matchMonoNoConcessiveConnectiveStart(cursor.fork(i, range.end));
    if (consumed === null) continue;
    const splitAt = i + consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsertClauseBoundary(ctx, {
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
}

function collectNoNiConcessiveBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, tokens, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const consumed = matchNoNiConcessiveConnectiveStart(cursor.fork(i, range.end), lookups);
    if (consumed === null) continue;
    const splitAt = i + consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsertClauseBoundary(ctx, {
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
}

function collectReformulationBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
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
    upsertClauseBoundary(ctx, {
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
}

function collectQuotedConcessiveBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const match = matchQuotedConcessiveConnectiveAt(tokens, i, { requireEnd: false });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    if (!hasSupportedClauseContinuation(tokens, skipClausePunctuationForward(tokens, splitAt, range.end), range.end, lookups)) continue;
    upsertClauseBoundary(ctx, {
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
}

function collectRetrospectiveQuotativeBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
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
    upsertClauseBoundary(ctx, {
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
}

function collectQuestionReformulationBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups, boundaries } = ctx;
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
    upsertClauseBoundary(ctx, {
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
}

function collectQuestionQuotativeKaToBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, tokens, range, lookups } = ctx;
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
    upsertClauseBoundary(ctx, {
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
}

function collectQuoteContentMarkerBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, tokens, range, lookups } = ctx;
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
    upsertClauseBoundary(ctx, { splitAt, boundary });
  }
}

function collectBoundNominalReasonBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
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
    upsertClauseBoundary(ctx, {
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
}

function collectTameBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const match = matchTameConnectiveAt(tokens, i, { requireEnd: false, lookups });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsertClauseBoundary(ctx, {
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
}

function collectTokoroResultBoundaries(ctx: ClauseBoundaryCollection): void {
  const { tokens, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const match = matchTokoroResultConnectiveAt(tokens, i, { lookups });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    upsertClauseBoundary(ctx, {
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
}

function collectCompositeConnectiveBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, tokens, range, lookups } = ctx;
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
    upsertClauseBoundary(ctx, {
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
}

function collectConditionalAuxBoundaries(ctx: ClauseBoundaryCollection): void {
  const { cursor, tokens, range, lookups } = ctx;
  for (let i = range.start; i < range.end; i++) {
    const tok = tokens[i];
    if (tok === undefined) continue;
    if (!isJodoshiKateikeiBoundary(tok)) continue;
    const nextStart = skipClausePunctuationForward(tokens, i + 1, range.end);
    if (!isSupportedConditionalContinuation(tokens, nextStart, lookups)) continue;
    if (isObligationSpanContaining(tokens, i)) continue;
    const boundary = classifySingleTokenBoundary(cursor, i, lookups);
    if (boundary.kind === "terminal") continue;
    upsertClauseBoundary(ctx, { splitAt: i + 1, boundary });
  }
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

function renyouJunctureEvidenceAt(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number,
  lookups: LookupTables
): RenyouJunctureEvidence | undefined {
  return protoLayoutForTokens(tokens, lookups).renyouJunctureAt(splitAt);
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

function isSplitTeFocusAspectBoundary(
  tokens: readonly RuntimeHaruToken[],
  boundaryTokenIdx: number,
  splitAt: number
): boolean {
  const boundary = tokens[boundaryTokenIdx];
  const focus = tokens[splitAt];
  return boundary !== undefined && (boundary.pos & POS01) === 助詞_接続助詞 && isTeConnectiveToken(boundary) && focus !== undefined && (focus.pos & POS0) === 助詞 && (focus.surface === "は" || focus.surface === "も") && isSimpleAspectAuxiliaryToken(tokens[splitAt + 1]);
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

export function noQuoteReportingProjectionAllowedAt(
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

function isJodoshiKateikeiBoundary(tok: RuntimeHaruToken): boolean {
  if ((tok.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_)) return true;
  if ((tok.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_)) return true;
  return false;
}

export function classifyAttributiveChunkBoundary(
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

export function bareNominalQuoteBoundary(
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

export function youNiCarrierRenyouChuushiSpaceTerminalAllowed(
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

export function tailFunctionalResidualSuffixCanStayUnresolved(
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

export function tailRootHasSourceBearingPartialPrefix(root: TailRoot): boolean {
  if (root.sfp !== null) {
    return true;
  }
  const layer = firstAuxLayer(root.tail);
  return (layer?.ops.length ?? 0) > 0;
}

function renyouChuushiContinuationReach(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): number {
  const scopedEnd = activeProtoScopedScanEnd(tokens, contentEndIdx, "evidence_window");
  return scopedEnd === null ? contentEndIdx + 1 : Math.min(scopedEnd, tokens.length);
}

export function hasRenyouChuushiContinuation(
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

export function renyouChuushiClosesDetachedUtteranceAt(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  outgoingBoundary: ClauseBoundary,
  lookups: LookupTables
): boolean {
  return outgoingBoundary.kind === "terminal" && renyouChuushiDetachedClosureAt(tokens, contentEndIdx, lookups);
}

export function renyouChuushiDetachedClosureAt(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  lookups: LookupTables
): boolean {
  const closure = chuushiClosureEvidenceAt(tokens, contentEndIdx + 1, lookups);
  return closure?.hostKind === "renyou" && closure.right === "detached";
}

export async function renyouChuushiTerminalAllowedForEnd(input: IntegrationInput, end: number): Promise<boolean> {
  return hasRenyouChuushiContinuationForEnd(input.tokens, end, input.lookups) ||
    await streamVvCompoundPairLacksRegisteredOwnerAt(
      input.tokens,
      end,
      input.dictionary as unknown as MorphemeDictionary
    );
}

export function hasRenyouChuushiContinuationForEnd(
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

interface PartialBoundaryCollection {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly partialCursor: TokenCursor<RuntimeHaruToken>;
  readonly start: number;
  readonly scanEnd: number;
  readonly numeric: NumericTables;
  readonly lookups: LookupTables;
  readonly evidenceLayout: ProtoClauseLayout;
  readonly partialBoundaries: Map<number, ClauseBoundary>;
}

export function legalTailChunkPartialBoundaries(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  scanEnd: number,
  numeric: NumericTables,
  lookups: LookupTables
): ReadonlyMap<number, ClauseBoundary> {
  const { tokens } = cursor;
  const evidenceLayout = protoLayoutForTokens(tokens, lookups);
  const cacheKey = `${start}:${scanEnd}`;
  const perTokenCache = boundaryResultCacheFor(partialBoundaryCache, evidenceLayout);
  const cached = perTokenCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const partialBoundaries = new Map<number, ClauseBoundary>();
  const partialCursor = cursor.fork(start, scanEnd + 1, start);
  const ctx: PartialBoundaryCollection = {
    cursor, tokens, partialCursor, start, scanEnd, numeric, lookups, evidenceLayout, partialBoundaries
  };
  collectLeadingPartialBoundaries(ctx);
  for (let end = start + 1; end <= scanEnd; end += 1) {
    collectConnectivePartialBoundariesAt(ctx, end);
    collectTerminalPartialBoundariesAt(ctx, end);
    collectAttributiveAndQuoteFocusPartialBoundariesAt(ctx, end);
  }
  collectStartTerminalPartialBoundaries(ctx);
  collectQuoteMarkerPartialBoundaries(ctx);
  collectAttributiveEventPartialBoundaries(ctx);
  collectBareKeijoujiAttributivePartialBoundaries(ctx);
  collectExplicitAdnominalNoPartialBoundary(ctx);
  collectClauseBoundaryPartialBoundaries(ctx);
  collectConnectivePrefixPartialBoundaries(ctx);
  overrideDetachedChuushiClosurePartialBoundaries(ctx);
  perTokenCache.set(cacheKey, partialBoundaries);
  return partialBoundaries;
}

function putPartialBoundary(ctx: PartialBoundaryCollection, end: number, normalized: ClauseBoundary): void {
  const { partialBoundaries } = ctx;
  const existing = partialBoundaries.get(end);
  if (existing === undefined || boundarySpanLength(normalized) > boundarySpanLength(existing)) {
    partialBoundaries.set(end, normalized);
  }
}

function openUtteranceClosingSfpFallbackEnd(ctx: PartialBoundaryCollection, markerIdx: number): void {
  const { tokens, start, scanEnd } = ctx;
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
  putPartialBoundary(ctx, sfpIdx, { kind: "terminal" });
}

function setPartialBoundary(ctx: PartialBoundaryCollection, end: number, boundary: ClauseBoundary): void {
  const { cursor, partialCursor, lookups } = ctx;
  const ownedBoundary = normalizeTokaListingBoundary(cursor, boundary, lookups);
  const augmented = withQuotedQuestionContext(cursor, ownedBoundary, lookups);
  const normalized = normalizeClauseBoundarySourceSpan(partialCursor, augmented);
  putPartialBoundary(ctx, end, normalized);
  if (normalized.kind !== "terminal") {
    openUtteranceClosingSfpFallbackEnd(ctx, normalized.tokenSpan.start);
  }
}

function collectLeadingPartialBoundaries(ctx: PartialBoundaryCollection): void {
  const { cursor, tokens, start, scanEnd, numeric, lookups } = ctx;
  const bareNominalQuoteBound = bareNominalQuoteBoundary(cursor, start, numeric, lookups);
  if (bareNominalQuoteBound !== null && bareNominalQuoteBound.tokenSpan.end <= scanEnd) {
    setPartialBoundary(ctx, bareNominalQuoteBound.tokenSpan.end, bareNominalQuoteBound);
  }
  if (isZeroNominalizedParallelMoFrameEnd(tokens, start)) {
    setPartialBoundary(ctx, start, { kind: "terminal" });
  }
}

function collectConnectivePartialBoundariesAt(ctx: PartialBoundaryCollection, end: number): void {
  const { cursor, tokens, partialCursor, start, scanEnd, lookups } = ctx;
  const volitionalPurposeBoundary = volitionalPurposeToBoundaryEndingAt(tokens, start, end, scanEnd, lookups);
  if (volitionalPurposeBoundary !== null) {
    setPartialBoundary(ctx, end, volitionalPurposeBoundary);
  }
  const conditionalNominalBoundary = conditionalBaNominalMainClauseBoundaryEnd(tokens, end, scanEnd);
  if (conditionalNominalBoundary !== null) {
    setPartialBoundary(ctx, end, conditionalNominalBoundary);
  }
  if (isBareTteQuotativeBoundaryEnd(tokens, start, end, scanEnd)) {
    setPartialBoundary(ctx, end, {
      kind: "合成接続",
      connectiveKind: "quotative",
      surface: tokens[end]!.surface,
      tokenIdx: end,
      tokenSpan: { start: end, end }
    });
  }
  if (isCopulaConcessiveImperativeBoundaryEnd(tokens, start, end, scanEnd, lookups)) {
    setPartialBoundary(ctx, end, {
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
    setPartialBoundary(ctx, end, {
      kind: "合成接続",
      connectiveKind: "conditional",
      surface: "では",
      tokenIdx: end,
      tokenSpan: { start: likenessConditionMarkerStart, end }
    });
  }
}

function collectTerminalPartialBoundariesAt(ctx: PartialBoundaryCollection, end: number): void {
  const { tokens, partialCursor, start, scanEnd, lookups, evidenceLayout } = ctx;
  if (isBareQuoteAttributiveCarrierBoundary(tokens, end, end + 1, lookups)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isFunctionalTailBoundaryEnd(partialCursor, start, end, scanEnd, lookups)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isPlainNominalizerParticleBoundaryEnd(tokens, end, scanEnd, lookups)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isPlainNominalizerZeroFollowerFrameEnd(tokens, end, lookups)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (end > start && closesClauseAtDetachedTerminalNodaAfter(evidenceLayout, tokens, end + 1)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isPlainNominalizerParticleFrameEnd(tokens, end + 1, lookups)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isZeroNominalizedParallelMoFrameEnd(tokens, end)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isBekiRentaiNominalizedFrameEnd(tokens, end, lookups)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isAdverbialLikenessBoundaryEnd(tokens, start, end, scanEnd, lookups)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isExemplificationGenitiveBoundaryEnd(tokens, end, scanEnd)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isBareExemplificationBoundaryEnd(tokens, end, scanEnd)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isPredicateScopeCarrierSuffixStart(tokens, end + 1)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (structuralAttributiveAssemblerSuffixPayload(tokens, start, end + 1, lookups) !== null) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (chunkEndsWithAdnominalCopulaAttributiveHead(tokens, start, end, lookups)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isSoudaYotaiAdverbialModifierBoundaryEnd(tokens, end, lookups)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isDeclaredProjectionCarrierAdverbialBoundaryEnd(tokens, start, end, lookups)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
  if (isHazuNominalAttributiveBoundaryEnd(tokens, end)) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
}

function collectAttributiveAndQuoteFocusPartialBoundariesAt(ctx: PartialBoundaryCollection, end: number): void {
  const { tokens, partialCursor, start, scanEnd, lookups } = ctx;
  const unlicensedPermissionBoundary = unlicensedPlainTePermissionAttributiveBoundaryEnd(tokens, start, end);
  if (unlicensedPermissionBoundary !== null) {
    setPartialBoundary(ctx, end, unlicensedPermissionBoundary);
  }
  const quoteFocusBoundary = quoteFocusTailBoundaryAt(partialCursor, end, scanEnd, lookups);
  if (quoteFocusBoundary !== null) {
    setPartialBoundary(ctx, end, quoteFocusBoundary);
  }
}

function collectStartTerminalPartialBoundaries(ctx: PartialBoundaryCollection): void {
  const { tokens, start, lookups } = ctx;
  if (isPredicateScopeCarrierSuffixStart(tokens, start + 1)) {
    setPartialBoundary(ctx, start, { kind: "terminal" });
  }
  if (structuralAttributiveAssemblerSuffixPayload(tokens, start, start + 1, lookups) !== null) {
    setPartialBoundary(ctx, start, { kind: "terminal" });
  }
}

function collectQuoteMarkerPartialBoundaries(ctx: PartialBoundaryCollection): void {
  const { tokens, start, scanEnd, lookups } = ctx;
  for (let markerIdx = start + 1; markerIdx <= scanEnd; markerIdx += 1) {
    if (quoteMarkerRelationAt(tokens, markerIdx, { consumers: ["tail_multi_clause"] }) !== null) {
      openUtteranceClosingSfpFallbackEnd(ctx, markerIdx);
    }
    const projection = matchPredicateProjectionConnectiveAt(tokens, markerIdx, { requireEnd: false, lookups });
    if (projection?.connective === "predicate_projection_quote_attributive") {
      const end = markerIdx + projection.consumed - 1;
      if (end >= start && end <= scanEnd && isNominalLikeAttributiveHead(tokens[end + 1])) {
        setPartialBoundary(ctx, end, { kind: "terminal" });
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
      setPartialBoundary(ctx, end, { kind: "terminal" });
    }
  }
}

function collectAttributiveEventPartialBoundaries(ctx: PartialBoundaryCollection): void {
  const { tokens, start, scanEnd, lookups, evidenceLayout } = ctx;
  const event = evidenceLayout.firstBoundaryEventInRange(start + 1, scanEnd + 2);
  if (event === undefined || event.kind !== "attributive") {
    return;
  }
  const end = event.splitAt - 1;
  if (classifyStructuralAttributiveBoundaryPayload(tokens, start, end, event.splitAt, lookups) !== null) {
    setPartialBoundary(ctx, end, { kind: "terminal" });
  }
}

function collectBareKeijoujiAttributivePartialBoundaries(ctx: PartialBoundaryCollection): void {
  const { tokens, start, scanEnd, lookups, evidenceLayout } = ctx;
  for (const headIdx of evidenceLayout.bareKeijoujiAttributiveHeads.keys()) {
    const end = headIdx - 1;
    if (end >= start && end <= scanEnd && classifyStructuralAttributiveBoundaryPayload(tokens, start, end, headIdx, lookups) !== null) {
      setPartialBoundary(ctx, end, { kind: "terminal" });
    }
  }
}

function collectExplicitAdnominalNoPartialBoundary(ctx: PartialBoundaryCollection): void {
  const { tokens, start, scanEnd, lookups } = ctx;
  const explicitAdnominalNoEnd = start + 1;
  if (
    explicitAdnominalNoEnd <= scanEnd &&
    classifyStructuralAttributiveBoundaryPayload(tokens, start, explicitAdnominalNoEnd, explicitAdnominalNoEnd + 1, lookups)
      ?.explicitAdnominalMarker !== undefined
  ) {
    setPartialBoundary(ctx, explicitAdnominalNoEnd, { kind: "terminal" });
  }
}

function collectClauseBoundaryPartialBoundaries(ctx: PartialBoundaryCollection): void {
  const { tokens, partialCursor, start, scanEnd, lookups } = ctx;
  const boundaryReachEnd = clauseBoundaryDetectionReachEnd(tokens, scanEnd, lookups);
  const boundaries = findClauseBoundaries(partialCursor.fork(start, boundaryReachEnd, start), lookups);
  for (const boundary of boundaries) {
    const end = boundary.splitAt - 1;
    if (end >= start && end <= scanEnd) {
      setPartialBoundary(ctx, end, boundary.boundary);
    }
  }
}

function collectConnectivePrefixPartialBoundaries(ctx: PartialBoundaryCollection): void {
  const { partialCursor, start, scanEnd, lookups } = ctx;
  for (const prefixBoundary of sourceBearingConnectivePrefixBoundaries(partialCursor.fork(start + 1, scanEnd + 1, start + 1), start, scanEnd, lookups)) {
    const suffixStart = prefixBoundary.end + 1;
    if (tailPartialSuffixCanStayInAssembler(partialCursor, suffixStart, scanEnd, prefixBoundary.boundary, lookups)) {
      setPartialBoundary(ctx, prefixBoundary.end, prefixBoundary.boundary);
    }
  }
}

function overrideDetachedChuushiClosurePartialBoundaries(ctx: PartialBoundaryCollection): void {
  const { start, scanEnd, evidenceLayout, partialBoundaries } = ctx;
  for (const closure of evidenceLayout.chuushiClosures.values()) {
    const end = closure.splitAt - 1;
    if (closure.right === "detached" && end > start && end <= scanEnd) {
      partialBoundaries.set(end, { kind: "terminal" });
    }
  }
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

export function renyouChuushiTerminalRoleAt(
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

export function teOkuEvaluationReasonBoundaryAt(
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

export function elidedDewaNegativeBodyAllowedAt(
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

export function isPlainNominalizerParticleFrameEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  return plainNominalizerFrameEndVerdictAt(tokens, end, lookups) === "particle_follower";
}

export function isPlainNominalizerZeroFollowerFrameEnd(
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

export function isZeroNominalizedParallelMoFrameEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number
): boolean {
  return isZeroNominalizedParallelMoMarker(tokens, end + 1);
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

export function chunkEndsWithAdnominalCopulaAttributiveHead(
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

export function adnominalCopulaAttributiveFormPausesAtWeakPunctuation(
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
