import { TokenCursor } from "../../../../token-cursor.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { morphSurface } from "../../../../../types/token.js";
import type { MorphemeEntry } from "../../../../../types/dictionary.js";
import { derivationForSense } from "../../../../../dictionary/derivation.js";
import { stemCandidateProvenanceForTranslation } from "../stem-candidate-identity.js";
import type { Warning } from "../../../../../types/warning.js";
import { buildPredicateQuoteCarrierOp } from "../matchers/predicate-quote.js";
import { parseTail, type ParseOutcome, type ParseSuccess } from "../parse-tail.js";
import { lineMemo } from "../../../line-memo.js";
import type { ElidedDewaNegativeBodyClosure } from "../matchers/copula.js";
import type { AdverbialModifierMarker, StemInput } from "../parse-input.js";
import { isNaiOrNuToken, isAdverbialMannerNounHead } from "../classifiers/tokens.js";
import { isBekiRentaiNominalizedFrameEnd } from "../matchers/nominalizer.js";
import { isObligationSpanStartingAtToken, type ElidedColloquialObligationContext } from "../matchers/obligation.js";
import { expandFusedDashiCopulaListingParseSlice, type TailParseSliceInput } from "./parse-slice.js";
import { parseOutgoingBoundaryHint, refineRequestTerminalOutgoingBoundary } from "./boundary-hint.js";
import { detectSahenPredicateStart, nounCompoundSuffixRunEnd } from "./readiness.js";
import { tailRootHasRenyouChuushiTerminal, tailRootHasAdverbialModifierTerminal } from "../fragment-recovery.js";
import { tosuruResultativeMakeYieldsToAttributiveQuoteHead } from "../tosuru-construction-mode.js";
import { findAdverbialModifierPredicate } from "../../../../clause-layout/adverbial-predicate.js";
import { isClausePunctuationToken, utteranceClosedForAttributiveProjection } from "../../../../clause-layout/index.js";
import { nextClauseNonPunctuationIndex } from "../../../../clause-layout/navigation.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { bareAdverbialKeijoujiHostAt, isAdverbialKeijoujiMarkerHostPos } from "../../../../clause-layout/adverbial-host.js";
import { activeProtoLayout, activeProtoUtteranceClosureRunAt } from "../../../../clause-layout/proto-state.js";
import { cachedQuoteBindingForContentRoot, quoteStructuralRelationContainingContentToken, quoteStructuralRelationAt } from "../../../../structural-relation/quote.js";
import { relationConnectiveSpansAt, relationDiscontinuousClosureSpanAfter } from "../../connective-span-scanner.js";
import { PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS } from "../../../data/semantic-helper-sets.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import { commitTail, ownClauseTailIR, type ClauseBoundary, type ClauseTailIR, type CommitContext } from "../commit.js";
import { copulaContinuativeExplanatoryClosureApplies, copulaContinuativeObliqueRecoveryApplies } from "../renderers/continuative-copula.js";
import { renderTail } from "../render-root.js";
import { matchTeTailContinuationAt } from "../../postverb-tail-classifier.js";
import { quoteAttributiveHeadFrameForBoundary } from "../quote-attributive-head-frame.js";
import { DERIVATIONAL_SUFFIX_FAIL_CLOSED_PREFIX, lowerDerivationalSuffixRoot, rootHasReanchoringDerivationalSuffix } from "../derivational-suffix-lowering.js";
import { type AttributiveBoundaryPayload, type AuxLayerNode, type AuxOpNode, type ConnectiveOp, type CopulaOp, type HeadHypothesisCandidate, type HeadHypothesisCarrier, type HeadSourceCapabilityVector, type OpSource, type ParsedTailRoot, type QuoteBoundaryPayload, type SfpNode, type TailNode, type TailRoot, type TailRootBase, type TeFormConnectiveRole, type VerbConjType, retrospectiveQuotativeFlavorForStemMood } from "../grammar.js";
import { hasHardTerminalPunctuationClass } from "../../../boundary/punctuation.js";
import { isKaFamilyQuestionSfpEffect, nounStemInterjectionForCandidate, sourcePredicateShapeForCapabilities, type SourcePredicateShape, mapConjType } from "../grammar.js";
import { convertPunctuation } from "../../../../rendering/punctuation.js";
import { loadSuppletiveNegDict, roleCatNyaCount } from "../../../../../generator/aux-map.js";
import { hydrateAspectSemanticOps } from "../aspect-semantics.js";
import { hydrateBenefactivePayloads } from "../benefactive-hydration.js";
import { auxLayerConsumedSourceSequence, auxOpsInTailNode, chainFinalOpHostCategory, firstAuxLayer, stemSupportsProjectionCategory } from "../inspect.js";
import { conditionalTailConnectiveRelationForToken, dewaScopeBridgeRelationAt } from "../../../boundary/marker.js";
import { cachedCanonicalReformulationMarkerRelationIndex, kaOwnershipKindAt } from "../../../boundary/ka-ownership.js";
import { matchNodaNoKaNegativeConfirmTerminalTail } from "../../../../semantics/terminal-negative-confirm.js";
import { POS0, POS4, POS5A, 意志推量形_, 仮定形_, 形状詞, 形容詞0, 語幹_, 終止形_, 助動詞 as 助動詞0, 助動詞_マス, 助動詞_レル, 代名詞, 動詞, 副詞, 未然形_, 名詞, 命令形_, 連体形_, 連用形_, 부사 } from "../../../../../types/pos.js";
import { createConnectiveOp, createCopulaOp, markConditionalQuoteMarkerContinuationOp } from "../op-builders.js";
import { IU_LEXEME_FORMS } from "../../../data/quoted-reporting-sets.js";
import { structuralAttributiveAssemblerSuffixPayload, derivationalPredicateHeadEnd, isSoudaYotaiAdverbialModifierBoundaryEnd, shouldSuppressFormalToSuruControlForAttributiveHead, renyouCompoundPrenominalAttributiveTerminalAllowed, classifyStructuralAttributiveBoundaryPayload } from "./attributive-boundary.js";
import { normalizeTokaListingBoundary } from "./end-boundary-inference.js";
import { type DetectedClauseBoundary, isZeroNiPurposeProjectionBoundaryEnd, noQuoteReportingProjectionAllowedAt, classifyAttributiveChunkBoundary, youNiCarrierRenyouChuushiSpaceTerminalAllowed, renyouChuushiClosesDetachedUtteranceAt, renyouChuushiTerminalAllowedForEnd, hasRenyouChuushiContinuationForEnd, renyouChuushiTerminalRoleAt, teOkuEvaluationReasonBoundaryAt, elidedDewaNegativeBodyAllowedAt, isPlainNominalizerParticleFrameEnd, isPlainNominalizerZeroFollowerFrameEnd, isZeroNominalizedParallelMoFrameEnd, chunkEndsWithAdnominalCopulaAttributiveHead } from "./clause-boundaries.js";
import { adjectiveAdverbialModifierPredicateReachable, stemTokenEndsWithNoKoto, sourceHasFormalToStateResultCarrier, sourceAdverbialSurfacePostverbKind, isKotodashiReasonScopeTail, isNegationLikeToken } from "./predicate-evidence.js";
import type { IntegrationInput, IntegrationResult, ParseSliceSourceHost } from "./contracts.js";
import { renyouPredicateHeadLacksPredicateSense, adverbHostStartsTailChunk, isNounKamoModalPredicateStart, isNominalDirectConnectivePredicateStart, mentionedHostCarriesCanonicalReformulationMarker } from "./head-admission.js";
import { type TailParserStemSense, type SplitSuppletiveNegativeStem, type ContractedNegativeNStem, type VirtualCompoundStem, type ContractedCausativePassiveStem, type SuppletiveNegationMaterialization, projectKotodakaraReasonScopeStemTranslation, normalizeTailParserStemKorean, rangeHasMonoNoConcessiveConnective, selectTailParserStemSenses, tailParserProjectionOrdinalAllocator, headHypothesisCandidateFromTranslation, candidateHasAdmittedHeadCapability, buildHeadHypothesisCarrier, headSourceCapabilityVector, tailParserStemEntry, tokenHostsInflectingPredicateAuxiliary, tokenOpensPredicateConnectiveHost, stemKindForTailParserSource, adverbialSurfaceCandidateSetCanBridge, confineNominalTargetMarkToAdjectivalSource, stemCandidateFromTranslation, sahenStemProjectionCandidates, sahenPredicateHasFollowingAgentiveAux, stemInputFromCandidate, tailParserStemKindForTranslation, stemTranslationNeedsCommitSelection, stemCandidateNeedsDeferredCommit, suppletiveBaseStemForMaterialization, detectSplitSuppletiveNegativeStem, detectContractedNegativeNStem, detectGaruSyntheticStem, detectNounPhraseHeadStem, detectRentaishiPronominalNoHeadStem, detectDemonstrativePropositionHostStem, propositionHostChainBindsWake, detectVirtualCompoundDictionaryStem, detectNominalRenyouPostverbAuxiliaryStem, detectNominalRenyouMethodYouIdiomStem, detectSahenPotentialDifficultyStem, detectDictionaryBackedLexicalSplitStem, detectContractedGodanCausativePassiveStem } from "./stem-candidates.js";

interface SegmentParseSuccess {
  readonly ok: true;
  readonly irs: readonly ClauseTailIR[];
  readonly parseInfos: readonly ClauseParseInfo[];
}

type SegmentParseResult =
  | SegmentParseSuccess
  | { readonly ok: false; readonly reason: string };

export async function segmentAndParseClauses(
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

export function adverbialModifierChunkEnd(
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

function adverbialModifierTerminalAllowedAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables
): AdverbialModifierMarker | null {
  return adverbialModifierChunkEnd(tokens, start, lookups)?.marker ?? null;
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

export function parseTailChunkOnly(
  input: IntegrationInput,
  start: number,
  end: number,
  outgoingBoundary: ClauseBoundary,
  hostRole: TailChunkHostRole = "clause_predicate"
): Promise<ParseTailChunkResult> {
  const key = `parseTailChunkOnly|${start}|${end}|${JSON.stringify(outgoingBoundary)}|${hostRole}`;
  return lineMemo(input, key, () => parseTailChunkOnlyImpl(input, start, end, outgoingBoundary, hostRole), activeProtoLayout());
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

export function standaloneRenyouFragmentWarningsForParsedChunk(
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

export function missingConditionalMarkerWarningsForRoot(root: TailRoot): readonly Warning[] {
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

export function renderParsedChunk(
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

export function attributiveRewriteRestsOnClosedUtterance(
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

function tailRootHasClauseBoundaryOp(root: TailRootBase): boolean {
  return root.tail.kind === "auxLayer" && root.tail.ops.some((op) =>
    op.kind === "connective" ||
    (op.kind === "copula" && op.variant === "conditional_nara")
  );
}

export function stripTrailingConnectiveForAttributiveHost<Root extends TailRootBase>(root: Root): Root {
  if (root.tail.kind !== "auxLayer") return root;
  const ops = root.tail.ops;
  if (ops.length === 0 || ops[ops.length - 1]?.kind !== "connective") return root;
  return {
    ...root,
    tail: { ...root.tail, ops: ops.slice(0, -1) }
  };
}

export function markTailRootAttributiveTerminal<Root extends TailRootBase>(
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

export function rewriteRootOutgoingBoundaryConnective<Root extends TailRootBase>(
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

export interface ClauseParseInfo<Root extends TailRootBase = TailRoot> {
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

type ParseSingleClauseOptions = {
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
};

interface SingleClauseParseRequest {
  readonly input: IntegrationInput;
  readonly range: { readonly start: number; readonly end: number };
  readonly baseOffset: number;
  readonly options: ParseSingleClauseOptions;
}

interface ClauseStemVariants {
  readonly originalStemToken: RuntimeHaruToken;
  readonly virtualCompoundStem: VirtualCompoundStem | null;
  readonly contractedCausativePassiveStem: ContractedCausativePassiveStem | null;
  readonly contractedNegativeNStem: ContractedNegativeNStem | null;
  readonly splitSuppletiveStem: SplitSuppletiveNegativeStem | null;
}

interface ClauseStemHead {
  readonly stemToken: RuntimeHaruToken;
  readonly stemPos0: number;
  readonly stemKind: "verb" | "adj" | "noun";
  readonly sahenSliceOffset: 0 | 1;
  readonly entry: MorphemeEntry;
}

interface ClauseStemSenseContext {
  readonly baseContextTokens: readonly RuntimeHaruToken[];
  readonly baseContextPos: number;
  readonly contextTokens: readonly RuntimeHaruToken[];
  readonly contextPos: number;
}

interface ClauseHeadHypothesisSource {
  readonly initialHeadHypothesisSource: OpSource;
  readonly headHypothesisCapabilities: HeadSourceCapabilityVector;
  readonly sourceUsesSahenProjection: boolean;
  readonly sourcePredicateShape: SourcePredicateShape;
}

interface ClauseStemSenseCandidates {
  readonly tailSenses: readonly TailParserStemSense[];
  readonly headHypothesisCandidates: readonly HeadHypothesisCandidate[];
  readonly conjForVerb: VerbConjType | undefined;
  readonly usesSahenProjection: boolean;
  readonly adverbialSurfaceBridgeActive: boolean;
}

interface ClauseStemIntake {
  readonly currentWinnerIndex: number | undefined;
  readonly intakeHeadHypothesis: HeadHypothesisCarrier;
}

interface ClauseStemBuild {
  readonly stem: StemInput;
  readonly suppletiveMaterialization: SuppletiveNegationMaterialization | null;
}

interface ClauseParseSlice {
  readonly effectiveSliceOffset: number;
  readonly suppletivePoliteNegative: SuppletiveNegationMaterialization["politeNegative"];
  readonly virtualTailStart: number | null;
  readonly splitTailStart: number | null;
  readonly parseSlice: readonly RuntimeHaruToken[];
}

interface ClauseStemSourceAnchors {
  readonly parseSliceInput: TailParseSliceInput;
  readonly stemSourceOverride: OpSource | undefined;
  readonly prependSource: OpSource | undefined;
  readonly conjugationAnchor: number | undefined;
  readonly semanticAnchors: readonly number[] | undefined;
}

async function parseSingleClause(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number,
  options: ParseSingleClauseOptions = {}
): Promise<ClauseParseResult> {
  const originalStemToken = input.tokens[range.start];
  if (originalStemToken === undefined) {
    return { ok: false, reason: "stem token undefined" };
  }
  const request: SingleClauseParseRequest = { input, range, baseOffset, options };
  const stems = await detectClauseStemVariants(request, originalStemToken);
  const head = await resolveClauseStemHead(request, stems);
  if ("ok" in head) {
    return head;
  }
  const { stemKind, entry } = head;
  const senseContext = clauseStemSenseContext(request, stems);
  const { contextTokens, contextPos } = senseContext;
  const hypothesisSource = clauseHeadHypothesisSource(request, stems, head);
  const { initialHeadHypothesisSource, headHypothesisCapabilities } = hypothesisSource;
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
  const preserved = preserveClauseStemSenseCandidates(request, stems, head, hypothesisSource, senses);
  if ("ok" in preserved) {
    return preserved;
  }
  const intake = admitClauseStemIntake(request, head, hypothesisSource, preserved, senses);
  if ("ok" in intake) {
    return intake;
  }
  const { intakeHeadHypothesis } = intake;
  const stemBuild = buildClauseStemInput(request, stems, head, hypothesisSource, preserved, senses);
  const slice = buildClauseParseSlice(request, stems, head, stemBuild);

  for (const t of senses) {
    if (t.koreanHonorific !== undefined) {
      return {
        ok: false,
        reason: "translation has honorific lemma frame — out of subset",
        headHypothesis: intakeHeadHypothesis
      };
    }
  }
  const anchors = buildClauseStemSourceAnchors(request, stems, head, stemBuild, slice);
  const { headHypothesis, parsed } = parseClauseTail(
    request, head, hypothesisSource, preserved, intake, stemBuild, slice, anchors, senseContext, senses
  );
  if (!parsed.ok) {
    return {
      ok: false,
      reason: `parser: ${parsed.reason}`,
      headHypothesis
    };
  }
  const { virtualCompoundStem } = stems;
  if (virtualCompoundStem?.propositionHost === true && !propositionHostChainBindsWake(parsed.root)) {
    return {
      ok: false,
      reason: "demonstrative proposition host requires a wake operator binding わけ",
      headHypothesis
    };
  }
  const fullContextTokens = options.contextTokens ?? input.tokens;
  const unlicensedRejection = rejectUnlicensedParsedClause(request, parsed, headHypothesis, fullContextTokens);
  if (unlicensedRejection !== null) {
    return unlicensedRejection;
  }
  return finishParsedClause(request, stems, senseContext, slice, anchors, parsed, headHypothesis, fullContextTokens);
}

async function detectClauseStemVariants(request: SingleClauseParseRequest, originalStemToken: RuntimeHaruToken): Promise<ClauseStemVariants> {
  const { input, range, baseOffset, options } = request;
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
  return { originalStemToken, virtualCompoundStem, contractedCausativePassiveStem, contractedNegativeNStem, splitSuppletiveStem };
}

async function resolveClauseStemHead(request: SingleClauseParseRequest, stems: ClauseStemVariants): Promise<ClauseStemHead | ClauseParseResult> {
  const { input, range, options } = request;
  const { originalStemToken, virtualCompoundStem, contractedCausativePassiveStem, contractedNegativeNStem, splitSuppletiveStem } = stems;
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
  return { stemToken, stemPos0, stemKind, sahenSliceOffset, entry };
}

function clauseStemSenseContext(request: SingleClauseParseRequest, stems: ClauseStemVariants): ClauseStemSenseContext {
  const { input, range, options } = request;
  const { virtualCompoundStem, contractedCausativePassiveStem, contractedNegativeNStem, splitSuppletiveStem } = stems;
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
  return { baseContextTokens, baseContextPos, contextTokens, contextPos };
}

function clauseHeadHypothesisSource(request: SingleClauseParseRequest, stems: ClauseStemVariants, head: ClauseStemHead): ClauseHeadHypothesisSource {
  const { range, baseOffset } = request;
  const { virtualCompoundStem } = stems;
  const { stemToken, sahenSliceOffset } = head;
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
  return { initialHeadHypothesisSource, headHypothesisCapabilities, sourceUsesSahenProjection, sourcePredicateShape };
}

function preserveClauseStemSenseCandidates(request: SingleClauseParseRequest, stems: ClauseStemVariants, head: ClauseStemHead, hypothesisSource: ClauseHeadHypothesisSource, senses: readonly TailParserStemSense[]): ClauseStemSenseCandidates | ClauseParseResult {
  const { input, range, options } = request;
  const { virtualCompoundStem } = stems;
  const { stemToken, stemKind, sahenSliceOffset, entry } = head;
  const { initialHeadHypothesisSource, headHypothesisCapabilities, sourceUsesSahenProjection } = hypothesisSource;
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
  for (const [candidateIndex, t] of senses.entries()) {
    const candidateStemKind = tailParserStemKindForTranslation(t, stemKind);
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
  return { tailSenses, headHypothesisCandidates, conjForVerb, usesSahenProjection, adverbialSurfaceBridgeActive };
}

function admitClauseStemIntake(request: SingleClauseParseRequest, head: ClauseStemHead, hypothesisSource: ClauseHeadHypothesisSource, preserved: ClauseStemSenseCandidates, senses: readonly TailParserStemSense[]): ClauseStemIntake | ClauseParseResult {
  const { input, range } = request;
  const { stemToken, stemPos0, stemKind } = head;
  const { initialHeadHypothesisSource, headHypothesisCapabilities } = hypothesisSource;
  const { headHypothesisCandidates } = preserved;
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
  return { currentWinnerIndex, intakeHeadHypothesis };
}

function buildClauseStemInput(request: SingleClauseParseRequest, stems: ClauseStemVariants, head: ClauseStemHead, hypothesisSource: ClauseHeadHypothesisSource, preserved: ClauseStemSenseCandidates, senses: readonly TailParserStemSense[]): ClauseStemBuild {
  const { input, range, options } = request;
  const { virtualCompoundStem, splitSuppletiveStem } = stems;
  const { stemKind, sahenSliceOffset, entry } = head;
  const { sourcePredicateShape } = hypothesisSource;
  const { tailSenses, conjForVerb, usesSahenProjection, adverbialSurfaceBridgeActive } = preserved;
  const trans = tailSenses[0]!;

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
  return { stem, suppletiveMaterialization };
}

function buildClauseParseSlice(request: SingleClauseParseRequest, stems: ClauseStemVariants, head: ClauseStemHead, stemBuild: ClauseStemBuild): ClauseParseSlice {
  const { input, range } = request;
  const { originalStemToken, virtualCompoundStem, contractedCausativePassiveStem, contractedNegativeNStem, splitSuppletiveStem } = stems;
  const { sahenSliceOffset } = head;
  const { suppletiveMaterialization } = stemBuild;
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
  return { effectiveSliceOffset, suppletivePoliteNegative, virtualTailStart, splitTailStart, parseSlice };
}

function buildClauseStemSourceAnchors(request: SingleClauseParseRequest, stems: ClauseStemVariants, head: ClauseStemHead, stemBuild: ClauseStemBuild, slice: ClauseParseSlice): ClauseStemSourceAnchors {
  const { input, range, baseOffset } = request;
  const { originalStemToken, virtualCompoundStem, contractedCausativePassiveStem, contractedNegativeNStem, splitSuppletiveStem } = stems;
  const { sahenSliceOffset } = head;
  const { suppletiveMaterialization } = stemBuild;
  const { effectiveSliceOffset, suppletivePoliteNegative, virtualTailStart, splitTailStart, parseSlice } = slice;
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
  return { parseSliceInput, stemSourceOverride, prependSource, conjugationAnchor, semanticAnchors };
}

function parseClauseTail(request: SingleClauseParseRequest, head: ClauseStemHead, hypothesisSource: ClauseHeadHypothesisSource, preserved: ClauseStemSenseCandidates, intake: ClauseStemIntake, stemBuild: ClauseStemBuild, slice: ClauseParseSlice, anchors: ClauseStemSourceAnchors, senseContext: ClauseStemSenseContext, senses: readonly TailParserStemSense[]): { readonly headHypothesis: HeadHypothesisCarrier; readonly parsed: ParseOutcome } {
  const { input, range, baseOffset, options } = request;
  const { stemKind } = head;
  const { initialHeadHypothesisSource, headHypothesisCapabilities } = hypothesisSource;
  const { headHypothesisCandidates, usesSahenProjection } = preserved;
  const { currentWinnerIndex } = intake;
  const { stem } = stemBuild;
  const { effectiveSliceOffset } = slice;
  const { parseSliceInput, stemSourceOverride, prependSource, conjugationAnchor, semanticAnchors } = anchors;
  const { baseContextTokens } = senseContext;
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
      const relationIndex = cachedCanonicalReformulationMarkerRelationIndex(baseContextTokens, request.input.lookups);
      return relationIndex === null
        ? {}
        : { canonicalReformulationMarkerRelations: relationIndex };
    })(),
    ...(stemSourceOverride !== undefined ? { stemSourceOverride } : {}),
    ...(prependSource !== undefined ? { prependSource } : {}),
    ...(conjugationAnchor !== undefined ? { conjugationAnchor } : {}),
    ...(semanticAnchors !== undefined ? { semanticAnchors } : {})
  });
  return { headHypothesis, parsed };
}

function rejectUnlicensedParsedClause(request: SingleClauseParseRequest, parsed: ParseSuccess, headHypothesis: HeadHypothesisCarrier, fullContextTokens: readonly RuntimeHaruToken[]): ClauseParseResult | null {
  const { range, baseOffset } = request;
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
  return null;
}

function finishParsedClause(request: SingleClauseParseRequest, stems: ClauseStemVariants, senseContext: ClauseStemSenseContext, slice: ClauseParseSlice, anchors: ClauseStemSourceAnchors, parsed: ParseSuccess, headHypothesis: HeadHypothesisCarrier, fullContextTokens: readonly RuntimeHaruToken[]): ClauseParseResult {
  const { input, range, baseOffset } = request;
  const { virtualCompoundStem, splitSuppletiveStem } = stems;
  const { baseContextTokens, baseContextPos } = senseContext;
  const { effectiveSliceOffset } = slice;
  const { parseSliceInput } = anchors;
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

export function findContentRange(tokens: readonly RuntimeHaruToken[]): { readonly start: number; readonly end: number } | null {
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
