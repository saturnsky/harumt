import type { MorphemeDictionary } from "../../../dictionary/morpheme.js";
import { derivationForSense } from "../../../dictionary/derivation.js";
import { extractFeatures as auxExtractFeatures } from "../../../generator/aux-map.js";
import { conjugate, type IrregularType } from "../../../generator/conjugator.js";
import { respectKoreanPredicateLemma } from "../../../generator/honorific.js";
import type { NumericTables } from "../../../generator/numeric-lookup.js";
import type { MorphemeEntry, MorphemeSense } from "../../../types/dictionary.js";
import { renderPlanStartsWithShortNegation, type RenderPlan } from "../../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { Warning } from "../../../types/warning.js";
import type { BenefactiveContext, RenderPlanPolicy, RuleTraceDetailValue } from "../../../types/pipeline.js";
import { contentResultKoreanPos, type ContentResult } from "../../content-types.js";
import type { TranslationCandidate } from "../../../types/pipeline.js";
import type { CommitmentCandidate } from "../../commitment/types.js";
import { translationCandidateProjectionOrdinals } from "../../candidate-runtime.js";
import type { LookupTables } from "../../lookup-tables.js";
import { collectAuxTokens } from "../../matchers.js";
import { TokenCursor } from "../../token-cursor.js";
import { isSahenBoundVerbAfterSahen } from "../../predicate-helpers.js";
import { quoteContentEndsWithConditionalBeforeThoughtHost } from "../../structural-relation/quote-content-endings.js";
import { quoteContentEndsWithReasonCopulaBeforeQuoteMarker } from "../../structural-relation/quote-reason-copula.js";
import { quoteClauseBoundaryFromRelation, quoteConsumedMarkerSpanFromRelation, quoteStructuralRelationHostIsAttributiveIu } from "../../structural-relation/quote-clause-boundary.js";
import { quoteRelationOwnsMarkerRealization } from "../../structural-relation/quote-payload.js";
import { quoteStructuralRelationAt, quoteStructuralRelationContainingContentToken, quoteStructuralRelationIndex } from "../../structural-relation/quote.js";
import { nextNonSpaceIndex } from "../../clause-layout/trivia.js";
import { realizeRenderPlan } from "../../rendering/render-plan.js";
import { setForcePassiveRenderPlan } from "../../rendering/render-plan-rewrite.js";
import { UnitType, type TranslationUnitProvenance } from "../../translation/unit.js";
import { isHardTerminalPunctuationToken, isTrailingPunctuationToken, isWeakPunctuationToken } from "../boundary/punctuation.js";
import { quoteMarkerRelationAt } from "../boundary/quote-marker.js";
import type { ClauseBoundary } from "../tail/predicate-root/commit.js";
import {
  contextGrammarFromContentHeadMetadata,
  tailRootCommitmentCandidates,
  tailRootPredicateKoreanPos
} from "../tail/predicate-root/commitment-bridge.js";
import type {
  AttributiveBoundaryPayload,
  AuxLayerNode,
  AuxOpNode,
  BenefactiveAspectOp,
  ConnectiveOp,
  ImperativeTerminalPayload,
  HeadHypothesisCarrier,
  PoliteOp,
  QuoteBoundaryKoreanClauseForm,
  RequestAspectOp,
  RequestQuoteTailKind,
  SfpNode,
  StemCandidate,
  StemMood,
  StemNode,
  TailRoot,
  TenseOp,
  VerbConjType,
  VoiceKind,
  VoiceReadingCandidate
} from "../tail/predicate-root/grammar.js";
import { isKaFamilyQuestionSfpEffect } from "../tail/predicate-root/grammar.js";
import { isHonorificNasaruImperativeToken, isTeConnectiveToken, teDeContinuationRelationAt } from "../tail/postverb-tail-classifier.js";
import { isExternalTokoroScopeChunk } from "../tail/predicate-root/boundary-semantics.js";
import { classifyAttributiveHeadKind } from "../tail/predicate-root/structural-attributive-head-table.js";
import {
  hydrateTailChainRootWithHeadMetadata,
  tailChainPreviousSahenNounAbsorptionStart
} from "../tail/predicate-root/head-hydration.js";
import {
  assertUniqueStemCandidateIdentities,
  findStemCandidateByTranslationIdentity,
  invariantStemCandidateStructuralPatch,
  stemCandidateIdentitiesEqual,
  stemCandidateIdentity,
  stemCandidatePatchFromTranslationCandidate,
  stemCandidateProvenanceForTranslation,
  stemCandidateStructuralPatch,
  translationCandidateIdentity
} from "../tail/predicate-root/stem-candidate-identity.js";
import type { ContentHeadHydrationMetadata, ContentHeadMetadata } from "./content-head-metadata.js";
import { auxOpsHaveCausativePassiveSequence, firstAuxLayer, tailNodeHasCausativePassiveSequence, tailRootHasRequestTail, tailRootStemIsVerbalSuffixDerivation } from "../tail/predicate-root/inspect.js";
import { buildTailChainRenderPlan, tailParserSemanticReadinessBlocker, tryParseEllipticPropositionModalTailChunk, tryParseEllipticPropositionQuoteTailChunk } from "../tail/predicate-root/integration.js";
import { elidedColloquialObligationContextAtBoundary } from "../tail/predicate-root/integration/parse-clause.js";
import type { IntegrationInput, TailChunkIntakeVerdict, TailChunkResult } from "../tail/predicate-root/integration/contracts.js";
import { classifyStructuralAttributiveBoundaryPayload } from "../tail/predicate-root/integration/attributive-boundary.js";
import { clauseBoundaryAtSplit, isZeroNiPurposeProjectionBoundaryEnd, volitionalPurposeToBoundaryEndingAt } from "../tail/predicate-root/integration/clause-boundaries.js";
import { parseOutgoingBoundaryHint } from "../tail/predicate-root/integration/boundary-hint.js";
import {
  matchPredicateProjectionConnectiveAt,
  youNiQuoteDirectiveFollowerAt,
  youNiQuoteDirectiveProjectionSpanAt
} from "../tail/predicate-root/matchers/predicate-projection-connective.js";
import {
  singleRareruReading,
  tailRootBenefactiveContext,
  tailRootRareruReadings,
  tailRootSpanVoice,
  tailRootVoiceOpen
} from "../tail/predicate-root/span-metadata.js";
import {
  classifyTailSpanProvenance,
  tailFallbackSpanProvenance
} from "../tail/predicate-root/span-provenance.js";

import { isQuoteLikeTailBoundary } from "../tail/predicate-root/trace.js";

import {
  is五段,
  is上一段,
  is下一段,
  POS0,
  POS01,
  POS1,
  POS4,
  POS5A,
  カ行変格,
  サ行変格,
  感動詞,
  形容詞0,
  形状詞,
  助詞,
  助詞_終助詞,
  助動詞,
  助動詞_タ,
  助動詞_ダ,
  助動詞_デス,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_マス,
  助動詞_レル,
  接続詞,
  接頭辞,
  代名詞,
  動詞,
  非自立可能,
  副詞,
  名詞,
  命令形_,
  未然形_,
  連体詞,
  連体形_,
  連用形_,
  동사,
  형용사,
  isAdverbCapableNominal, isImperativeInflection, isRareruAuxiliaryToken, isVerbPredicateToken, isVerbalDerivationalSuffixToken, pos0in, INFLECTABLE_AUX_BITS,
} from "../../../types/pos.js";
import { buildRequestAspectOp, createConnectiveOp, createDesireOp, createPoliteOp, createPredicateQuoteCarrierOp, createTenseOp, buildVoiceOp } from "../tail/predicate-root/op-builders.js";
import { buildParserBenefactiveAspectOp } from "../tail/predicate-root/matchers/te-aspect.js";
import { inflectionStemMood } from "../tail/predicate-root/parse-stem.js";
import { parseTailContinuation, type TailContinuation } from "../tail/predicate-root/parse-tail.js";
import { predicateQuoteCarrierSpanEnd } from "../tail/predicate-root/matchers/predicate-quote.js";
import {
  honorificFormulaicHostAt,
  isHonorificPrefix,
  isHonorificRequestRenyouVerb,
  isPrecollapsedHonorificSahenHost,
  isSahenRequestNoun,
  opSourceFromIndices,
  previousNonSpaceIndex,
  type HonorificFormulaicHost,
  type HonorificFormulaicHostKind
} from "./honorific-formulaic-host.js";
import { activeProtoLayout } from "../../clause-layout/proto-state.js";
import { copulaChainOutgoingBoundary } from "./particle-phrase-copula.js";
import { connectiveCompositeTokenCountAt } from "../../semantics/copula-tail-runtime.js";
import { isTerminalYoSfpSurface } from "../../semantics/sfp-surface.js";
import {
  candidateSetCandidates,
  candidateSetSize,
  commitmentLaneCandidateSet,
  type SourceCandidateSet
} from "../../source-candidate-set.js";
import { stagedCommitmentCandidateSet } from "../../commitment/span-evidence.js";
import {
  HONORIFIC_FORMULAIC_HUMBLE_ARM_IDS,
  honorificFormulaicArmForms,
  honorificFormulaicArmRow,
  type HonorificFormulaicArmRow
} from "../data/honorific-formulaic-arm-table.js";
export interface TailChainAssemblyDescriptor {
  readonly consumed: number;
  readonly korean: "";
  readonly koreanPos: ContentHeadMetadata["koreanPos"];
  readonly entry: MorphemeEntry | null;
  readonly unitType: UnitType.CONTENT;
  readonly attachLeft: boolean;
  readonly provenance: Extract<TranslationUnitProvenance, "predicate_tail">;
  readonly renderPlan: RenderPlan;
  readonly renderPlanPolicy: RenderPlanPolicy;
  readonly voice: ContentHeadMetadata["voice"];
  readonly rareruReadings: ContentHeadMetadata["rareruReadings"];
  readonly nareruReadings: ContentHeadMetadata["nareruReadings"];
  readonly dekiruReadings: ContentHeadMetadata["dekiruReadings"];
  readonly hasNegative: boolean;
  readonly hasCausative: boolean;
  readonly hasCausativePassive: boolean;
  readonly hasRequestTail: boolean;
  readonly hasBenefactiveTail: boolean;
  readonly isKeijoujiVerbPredicate: boolean;
  readonly benefactive: BenefactiveContext | null;
  readonly connectiveRole: string | null;
  readonly sourceCandidates: SourceCandidateSet<CommitmentCandidate> | null;
  readonly warnings: readonly Warning[];
}

export interface TailParserFallbackAssemblyDescriptor {
  readonly consumed: number;
  readonly korean: string;
  readonly koreanPos: ContentHeadMetadata["koreanPos"];
  readonly entry: MorphemeEntry | null;
  readonly unitType: UnitType.CONTENT;
  readonly attachLeft: boolean;
  readonly provenance: TranslationUnitProvenance;
  readonly provenanceReason: string | null;
  readonly renderPlan: RenderPlan | null;
  readonly voice: ContentResult["voice"];
  readonly rareruReadings: ContentResult["rareruReadings"];
  readonly nareruReadings: ContentResult["nareruReadings"];
  readonly dekiruReadings: ContentResult["dekiruReadings"];
  readonly hasNegative: boolean;
  readonly hasCausative: boolean;
  readonly hasCausativePassive: boolean;
  readonly hasRequestTail: boolean;
  readonly hasBenefactiveTail: boolean;
  readonly isKeijoujiVerbPredicate: boolean;
  readonly benefactive: BenefactiveContext | null;
  readonly sourceCandidates: SourceCandidateSet<CommitmentCandidate> | null;
  readonly warnings: readonly Warning[];
  readonly renderPlanPolicy: ContentResult["renderPlanPolicy"];

}

export interface PredicateRootTailAssemblyPlanSource {
  readonly root: TailRoot;
  readonly sourceSpan: {
    readonly start: number;
    readonly endExclusive: number;
  };
}

export type ContentHeadTailAssemblyBridgeResult =
  | {
    readonly kind: "blocked";
    readonly root: TailRoot;
    readonly readinessBlocker: string;
  }
  | {
    readonly kind: "ready";
    readonly root: TailRoot;
    readonly spanStart: number;
    readonly descriptor: TailChainAssemblyDescriptor;
  };

export interface TailOwnerCandidatePayloadSourceResult {
  readonly start: number;
  readonly descriptor: TailChainAssemblyDescriptor;
}

export interface HonorificRequestQuoteTailDescriptorResult {
  readonly descriptor: TailChainAssemblyDescriptor;
  readonly traceDetail: { readonly [key: string]: RuleTraceDetailValue };
}

export interface HonorificFormulaicTailDescriptorResult {
  readonly descriptor: TailChainAssemblyDescriptor;
  readonly traceDetail: { readonly [key: string]: RuleTraceDetailValue };
}

export interface FormulaicApologyPredicateDescriptorResult {
  readonly descriptor: TailChainAssemblyDescriptor;
  readonly traceDetail: { readonly [key: string]: RuleTraceDetailValue };
}

export interface EllipticPropositionQuoteTailDescriptorResult {
  readonly descriptor: TailChainAssemblyDescriptor;
  readonly traceDetail: { readonly [key: string]: RuleTraceDetailValue };
}

export interface EllipticPropositionModalTailDescriptorResult {
  readonly descriptor: TailChainAssemblyDescriptor;
  readonly traceDetail: { readonly [key: string]: RuleTraceDetailValue };
}

export async function buildContentHeadTailAssemblyBridge(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly tailChunk: Extract<TailChunkResult, { readonly ok: true }>;
  readonly selectedTailPlan?: PredicateRootTailAssemblyPlanSource | null;
  readonly headResult: ContentHeadMetadata;
  readonly dictionary: MorphemeDictionary;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly isKeijoujiVerbObjectHost: (token: RuntimeHaruToken | undefined) => boolean;
}): Promise<ContentHeadTailAssemblyBridgeResult> {
  const selectedRoot = options.selectedTailPlan?.root ?? null;
  const rootSource = tailRootHasCandidateSet(options.tailChunk.root) && selectedRoot !== null && !tailRootHasCandidateSet(selectedRoot)
    ? options.tailChunk.root
    : selectedRoot ?? options.tailChunk.root;
  const hydratedRoot = await hydrateTailRootForAssembly(
    rootSource,
    options.headResult,
    options.tokens,
    options.cursor,
    options.tailChunk.predicateTokenIdx,
    options.dictionary,
    options.lookups,
    options.numeric
  );
  const readinessBlocker = tailChainReadinessBlocker({
    tokens: options.tokens,
    cursor: options.cursor,
    index: options.index,
    tailChunk: options.tailChunk,
    root: hydratedRoot,
    headResult: options.headResult,
    lookups: options.lookups,
    numeric: options.numeric
  });
  if (readinessBlocker !== null) {
    return {
      kind: "blocked",
      root: hydratedRoot,
      readinessBlocker
    };
  }
  const previousSahenNounIdx = tailChainPreviousSahenNounAbsorptionStart(
    hydratedRoot,
    options.tailChunk.predicateTokenIdx
  );
  const spanStart = previousSahenNounIdx ?? options.index;
  const selectedTailConsumed = options.selectedTailPlan?.sourceSpan.start === options.index
    ? options.selectedTailPlan.sourceSpan.endExclusive - options.index
    : options.tailChunk.consumed;
  const spanConsumed = selectedTailConsumed + (options.index - spanStart);
  const renderPlanPolicy = renderPlanPolicyForStructuralRelationAwaitingTail({
    tokens: options.tokens,
    cursor: options.cursor,
    index: options.index,
    tailChunk: options.tailChunk,
    lookups: options.lookups
  });
  const descriptor = await buildTailChainAssemblyDescriptor({
    tokens: options.tokens,
    cursor: options.cursor,
    index: spanStart,
    tailChunk: options.tailChunk,
    headResult: options.headResult,
    dictionary: options.dictionary,
    root: hydratedRoot,
    consumed: spanConsumed,
    lookups: options.lookups,
    numeric: options.numeric,
    isKeijoujiVerbObjectHost: options.isKeijoujiVerbObjectHost,
    renderPlanPolicy
  });
  return {
    kind: "ready",
    root: hydratedRoot,
    spanStart,
    descriptor
  };
}

export async function buildTailOwnerCandidatePayloadSource(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly tailChunk: Extract<TailChunkResult, { readonly ok: true }>;
  readonly dictionary: MorphemeDictionary;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly resolveHeadMetadata: (start: number, end: number) => ContentHeadMetadata | Promise<ContentHeadMetadata>;
  readonly isKeijoujiVerbObjectHost: (token: RuntimeHaruToken | undefined) => boolean;
}): Promise<TailOwnerCandidatePayloadSourceResult | null> {
  const headResult = await options.resolveHeadMetadata(options.index, options.tokens.length);
  const hydratedRoot = await hydrateTailRootForAssembly(
    options.tailChunk.root,
    headResult,
    options.tokens,
    options.cursor,
    options.tailChunk.predicateTokenIdx,
    options.dictionary,
    options.lookups,
    options.numeric
  );
  const previousSahenNounIdx = tailChainPreviousSahenNounAbsorptionStart(
    hydratedRoot,
    options.tailChunk.predicateTokenIdx
  );
  const start = previousSahenNounIdx ?? options.index;
  const descriptor = await buildTailChainAssemblyDescriptor({
    tokens: options.tokens,
    cursor: options.cursor,
    index: start,
    tailChunk: options.tailChunk,
    headResult,
    dictionary: options.dictionary,
    root: hydratedRoot,
    consumed: options.tailChunk.consumed + (options.index - start),
    lookups: options.lookups,
    numeric: options.numeric,
    isKeijoujiVerbObjectHost: options.isKeijoujiVerbObjectHost
  });
  return { start, descriptor };
}

async function buildEllipticPropositionTailDescriptorCore(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly dictionary: MorphemeDictionary;
  readonly previewFormal: boolean;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly isKeijoujiVerbObjectHost: (token: RuntimeHaruToken | undefined) => boolean;
  readonly parseTailChunk: (
    input: IntegrationInput,
    index: number
  ) => Promise<TailChunkResult>;
  readonly extractBoundary: (tailChunk: Extract<TailChunkResult, { readonly ok: true }>) => ClauseBoundary;
}): Promise<{ descriptor: TailChainAssemblyDescriptor; traceDetail: { readonly [key: string]: RuleTraceDetailValue } } | null> {
  const tailChunk = await options.parseTailChunk({
    tokens: options.tokens,
    cursor: options.cursor,
    dictionary: options.dictionary,
    formal: options.previewFormal,
    lookups: options.lookups,
    numeric: options.numeric
  }, options.index);
  if (!tailChunk.ok) {
    return null;
  }
  const descriptor = await buildTailChainAssemblyDescriptor({
    tokens: options.tokens,
    cursor: options.cursor,
    index: options.index,
    tailChunk,
    headResult: syntheticDeicticDescriptorHeadMetadata(tailChunk.consumed),
    dictionary: options.dictionary,
    root: tailChunk.root,
    consumed: tailChunk.consumed,
    lookups: options.lookups,
    numeric: options.numeric,
    isKeijoujiVerbObjectHost: options.isKeijoujiVerbObjectHost
  });
  const boundary = options.extractBoundary(tailChunk);
  return {
    descriptor,
    traceDetail: {
      consumed: tailChunk.consumed,
      predicate_token_idx: tailChunk.predicateTokenIdx,
      boundary_surface: boundary.kind === "terminal" ? null : boundary.surface,
      boundary_kind: boundary.kind === "terminal" ? "terminal" : boundary.connectiveKind
    }
  };
}

export async function buildEllipticPropositionQuoteTailDescriptor(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly dictionary: MorphemeDictionary;
  readonly previewFormal: boolean;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly isKeijoujiVerbObjectHost: (token: RuntimeHaruToken | undefined) => boolean;
}): Promise<EllipticPropositionQuoteTailDescriptorResult | null> {
  return buildEllipticPropositionTailDescriptorCore({
    ...options,
    parseTailChunk: tryParseEllipticPropositionQuoteTailChunk,
    extractBoundary: (tailChunk) => tailChunk.outgoingBoundary
  });
}

export async function buildEllipticPropositionModalTailDescriptor(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly dictionary: MorphemeDictionary;
  readonly previewFormal: boolean;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly isKeijoujiVerbObjectHost: (token: RuntimeHaruToken | undefined) => boolean;
}): Promise<EllipticPropositionModalTailDescriptorResult | null> {
  return buildEllipticPropositionTailDescriptorCore({
    ...options,
    parseTailChunk: tryParseEllipticPropositionModalTailChunk,
    extractBoundary: () => ({ kind: "terminal" })
  });
}

function syntheticDeicticDescriptorHeadMetadata(consumed: number): ContentHeadMetadata {
  return {
    entry: null,
    sourceCandidates: null,
    consumed,
    koreanPos: 형용사,
    voice: "active",
    rareruReadings: new Set(),
    nareruReadings: new Set(),
    dekiruReadings: new Set(),
    hasNegative: false,
    hasCausative: false,
    hasCausativePassive: false,
    hasRequestTail: false,
    hasBenefactiveTail: false,
    connectiveRole: null,
    benefactive: {},
    warnings: []
  };
}

export async function buildHonorificRequestQuoteTailDescriptor(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly dictionary: MorphemeDictionary;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly resolveHeadMetadata: (start: number, end: number) => ContentHeadHydrationMetadata | Promise<ContentHeadHydrationMetadata>;
  readonly isKeijoujiVerbObjectHost: (token: RuntimeHaruToken | undefined) => boolean;
}): Promise<HonorificRequestQuoteTailDescriptorResult | null> {
  const n = options.tokens.length;
  const first = options.tokens[options.index];
  if (first === undefined) {
    return null;
  }
  const hasHonorificPrefix = isHonorificPrefix(first);
  const headIdx = hasHonorificPrefix
    ? (nextNonSpaceIndex(options.tokens, options.index + 1, n) ?? n)
    : options.index;
  const head = options.tokens[headIdx];
  if (head === undefined) {
    return null;
  }
  const headKind = isSahenRequestNoun(head)
    ? "sahen_noun"
    : hasHonorificPrefix && isHonorificRequestRenyouVerb(head)
      ? "renyou_verb"
      : null;
  if (headKind === null) {
    return null;
  }
  const requestIdx = nextNonSpaceIndex(options.tokens, headIdx + 1, n) ?? n;
  const requestToken = options.tokens[requestIdx];
  if (requestToken === undefined || !isBareKudasaiRequestToken(requestToken)) {
    return null;
  }
  const quoteIdx = nextNonSpaceIndex(options.tokens, requestIdx + 1, n) ?? n;
  const quoteMarker = quoteMarkerRelationAt(options.tokens, quoteIdx, { consumers: ["assembler"] });
  const quoteCursor = options.cursor.fork(quoteIdx, n, quoteIdx);
  const quoteRelation = quoteStructuralRelationAt(quoteCursor, options.lookups);
  const requestTailKind = quoteRelation?.quote.request?.tailKind ?? null;
  if (quoteMarker === null || quoteRelation === undefined || requestTailKind === null) return null;
  const attributiveCarrierIdx = quoteRelation.quote.slotKind === "request_content" &&
    quoteStructuralRelationHostIsAttributiveIu(options.tokens, quoteRelation) &&
    quoteRelation.quote.hostMatch.hostIdx === quoteMarker.span.endExclusive
    ? quoteRelation.quote.hostMatch.hostIdx
    : null;
  const headMetadata = await options.resolveHeadMetadata(headIdx, n);
  const stem = honorificRequestQuoteStemFromHeadMetadata(
    headMetadata,
    head,
    headKind,
    options.tokens,
    headIdx
  );
  if (stem === null) {
    return null;
  }
  const quoteTokenSpan = {
    start: quoteMarker.span.start,
    end: attributiveCarrierIdx ?? quoteMarker.span.endExclusive - 1
  };
  const koreanClauseForm = requestKoreanClauseFormForTailKind(requestTailKind);
  const spanConsumed = quoteTokenSpan.end - options.index + 1;
  if (spanConsumed <= 0) {
    return null;
  }
  const requestOp = sahenRequestAspectOp(options.tokens, requestIdx);
  const boundary: ClauseBoundary = attributiveCarrierIdx === null
    ? {
      kind: "接続助詞",
      connectiveKind: "request_complement",
      surface: quoteMarker.surface,
      tokenIdx: quoteIdx,
      tokenSpan: quoteTokenSpan,
      quoteBoundary: {
        koreanClauseForm,
        requestTailKind
      }
    }
    : { kind: "terminal" };
  const quoteCarrierToken = attributiveCarrierIdx === null ? undefined : options.tokens[attributiveCarrierIdx];
  const quoteOp = attributiveCarrierIdx === null
    ? createConnectiveOp({

      connective: "request_complement" as const,
      surface: quoteMarker.surface,
      quoteBoundary: {
        koreanClauseForm,
        requestTailKind
      },
      source: opSourceFromRange(options.tokens, quoteTokenSpan.start, quoteTokenSpan.end)
    })
    : createPredicateQuoteCarrierOp({

      style: "compact_toiu" as const,
      surface: `${quoteMarker.surface}${quoteCarrierToken?.surface ?? ""}`,
      source: opSourceFromRange(options.tokens, quoteTokenSpan.start, quoteTokenSpan.end)
    });
  const root: TailRoot = {
    tail: {
      kind: "auxLayer",
      stem,
      ops: [requestOp, quoteOp],
      terminal: null
    },
    sfp: null,
    quoteBinding: "unbound"
  };
  const tailChunk: Extract<TailChunkResult, { readonly ok: true }> = {
    ok: true,
    consumed: spanConsumed,
    root,
    predicateTokenIdx: headIdx,
    outgoingBoundary: boundary
  };
  const descriptorHeadMetadata: ContentHeadMetadata = {
    ...headMetadata,
    consumed: spanConsumed,
    koreanPos: 동사,
    voice: "active",
    rareruReadings: new Set(),
    nareruReadings: new Set(),
    dekiruReadings: new Set(),
    hasNegative: false,
    hasCausative: false,
    hasCausativePassive: false,
    hasRequestTail: true,
    hasBenefactiveTail: true,
    connectiveRole: attributiveCarrierIdx === null ? "request_complement" : null,
    benefactive: {},
    warnings: []
  };
  const descriptor = await buildTailChainAssemblyDescriptor({
    tokens: options.tokens,
    cursor: options.cursor,
    index: options.index,
    tailChunk,
    headResult: descriptorHeadMetadata,
    dictionary: options.dictionary,
    root,
    consumed: spanConsumed,
    lookups: options.lookups,
    numeric: options.numeric,
    isKeijoujiVerbObjectHost: options.isKeijoujiVerbObjectHost
  });
  return {
    descriptor,
    traceDetail: {
      consumed: spanConsumed,
      head_surface: head.surface,
      head_kind: headKind,
      request_surface: requestToken.surface,
      quote_surface: quoteMarker.surface,
      ...(quoteCarrierToken === undefined ? {} : { quote_carrier_surface: quoteCarrierToken.surface }),
      request_tail_kind: requestTailKind
    }
  };
}

export async function buildHonorificFormulaicTailDescriptor(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly dictionary: MorphemeDictionary;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly resolveHeadMetadata: (start: number, end: number) => ContentHeadHydrationMetadata | Promise<ContentHeadHydrationMetadata>;
  readonly isKeijoujiVerbObjectHost: (token: RuntimeHaruToken | undefined) => boolean;
}): Promise<HonorificFormulaicTailDescriptorResult | null> {
  const match = matchHonorificFormulaicConstruction(options.tokens, options.cursor, options.index, options.lookups);
  if (match === null) {
    return null;
  }
  const baseHeadMetadata = await options.resolveHeadMetadata(match.headIdx, match.headEnd);
  const headMetadata = await formulaicHeadMetadataForMatch(match, baseHeadMetadata, options.dictionary);
  if (headMetadata === null) {
    return null;
  }
  const stem = formulaicStemFromHeadMetadata(
    headMetadata,
    match.head,
    match.headKind,
    options.tokens,
    match.headIdx,
    match.stemTransform,
    options.lookups
  );
  if (stem === null) {
    return null;
  }
  const root: TailRoot = {
    tail: {
      kind: "auxLayer",
      stem: match.stemMood === undefined ? stem : { ...stem, stemMood: match.stemMood },
      ops: match.ops,
      terminal: match.terminal,
      ...(match.terminalPayload === undefined ? {} : { terminalPayload: match.terminalPayload })
    },
    sfp: match.sfp,
    quoteBinding: "unbound"
  };
  const tailChunk: Extract<TailChunkResult, { readonly ok: true }> = {
    ok: true,
    consumed: match.consumed,
    root,
    predicateTokenIdx: match.headIdx,
    outgoingBoundary: match.boundary
  };
  const descriptorHeadMetadata: ContentHeadMetadata = {
    ...headMetadata,
    consumed: match.consumed,
    koreanPos: 동사,
    voice: "active",
    rareruReadings: new Set(),
    nareruReadings: new Set(),
    dekiruReadings: new Set(),
    hasNegative: formulaicOpsHaveNegation(match.ops),
    hasCausative: formulaicOpsHaveVoice(match.ops, "causative") ||
      formulaicOpsHaveVoice(match.ops, "causative_passive"),
    hasCausativePassive: auxOpsHaveCausativePassiveSequence(match.ops),
    hasRequestTail: match.kind === "request_kudasai",
    hasBenefactiveTail: match.kind === "benefactive_kudasaru" ||
      match.kind === "benefactive_itadaku" ||
      match.kind === "benefactive_itadakeru" ||
      match.kind === "request_negau",
    connectiveRole: formulaicOpsConnectiveRole(match.ops),
    benefactive: {},
    warnings: []
  };
  const descriptor = await buildTailChainAssemblyDescriptor({
    tokens: options.tokens,
    cursor: options.cursor,
    index: options.index,
    tailChunk,
    headResult: descriptorHeadMetadata,
    dictionary: options.dictionary,
    root,
    consumed: match.consumed,
    lookups: options.lookups,
    numeric: options.numeric,
    isKeijoujiVerbObjectHost: options.isKeijoujiVerbObjectHost
  });
  return {
    descriptor,
    traceDetail: {
      kind: match.kind,
      consumed: match.consumed,
      head_surface: match.head.surface,
      head_kind: match.headKind,
      tail_surface: match.tailSurface
    }
  };
}

export async function buildFormulaicApologyPredicateDescriptor(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly dictionary: MorphemeDictionary;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly isKeijoujiVerbObjectHost: (token: RuntimeHaruToken | undefined) => boolean;
}): Promise<FormulaicApologyPredicateDescriptorResult | null> {
  const match = matchFormulaicApologyPredicate(options.tokens, options.index);
  if (match === null) {
    return null;
  }
  const koreanLemma = match.kind === "sumimasen_polite" ? "죄송하다" : "미안하다";
  const stem: StemNode = {
    kind: "adj",
    lemma: koreanLemma,
    irregular: "여",
    source: opSourceFromIndices(options.tokens, match.stemSourceIndices),
    conjugationAnchor: 0,
    semanticAnchors: [0],
    commitment: "resolved_sense",
    sourcePredicateShape: match.kind === "gomen_plain" ? "nominal" : "verb"
  };
  const root: TailRoot = {
    tail: {
      kind: "auxLayer",
      stem,
      ops: match.ops,
      terminal: null
    },
    sfp: match.sfp,
    quoteBinding: "unbound"
  };
  const tailChunk: Extract<TailChunkResult, { readonly ok: true }> = {
    ok: true,
    consumed: match.consumed,
    root,
    predicateTokenIdx: match.headIdx,
    outgoingBoundary: { kind: "terminal" }
  };
  const descriptorHeadMetadata: ContentHeadMetadata = {
    entry: null,
    sourceCandidates: null,
    consumed: match.consumed,
    koreanPos: 형용사,
    voice: "active",
    rareruReadings: new Set(),
    nareruReadings: new Set(),
    dekiruReadings: new Set(),
    hasNegative: false,
    hasCausative: false,
    hasCausativePassive: false,
    hasRequestTail: false,
    hasBenefactiveTail: false,
    connectiveRole: match.boundary.kind === "terminal" ? null : match.boundary.connectiveKind,
    benefactive: {},
    warnings: []
  };
  const descriptor = await buildTailChainAssemblyDescriptor({
    tokens: options.tokens,
    cursor: options.cursor,
    index: options.index,
    tailChunk,
    headResult: descriptorHeadMetadata,
    dictionary: options.dictionary,
    root,
    consumed: match.consumed,
    lookups: options.lookups,
    numeric: options.numeric,
    isKeijoujiVerbObjectHost: options.isKeijoujiVerbObjectHost
  });
  return {
    descriptor,
    traceDetail: {
      kind: match.kind,
      consumed: match.consumed,
      head_surface: options.tokens[match.headIdx]?.surface ?? "",
      tail_surface: options.tokens.slice(match.headIdx, options.index + match.consumed).map((token) => token.surface).join("")
    }
  };
}

function formulaicOpsHaveNegation(ops: readonly AuxOpNode[]): boolean {
  return ops.some((op) =>
    op.kind === "negation" ||
    (op.kind === "copula" && op.polarity === "negative")
  );
}

function formulaicOpsHaveVoice(ops: readonly AuxOpNode[], voice: VoiceKind): boolean {
  return ops.some((op) => op.kind === "voice" && op.voice === voice);
}

async function formulaicHeadMetadataForMatch(
  match: HonorificFormulaicConstructionMatch,
  baseMetadata: ContentHeadHydrationMetadata,
  dictionary: MorphemeDictionary
): Promise<ContentHeadHydrationMetadata | null> {
  if (match.headKind !== "nominalized_renyou_verb") {
    return baseMetadata;
  }
  const entry = await lookupNominalizedRenyouVerbEntry(dictionary, match.head);
  if (entry === undefined) {
    return null;
  }
  return {
    entry,
    sourceCandidates: null
  };
}

async function lookupNominalizedRenyouVerbEntry(
  dictionary: MorphemeDictionary,
  token: RuntimeHaruToken
): Promise<MorphemeEntry | undefined> {
  const renyouForms = ["連用形-一般", "連用形-撥音便", "連用形-促音便", "連用形-イ音便"];
  for (const conjugationForm of renyouForms) {
    const entry = await dictionary.lookupSurface(token.surface, token.reading, ["動詞", "一般", "*", "*"], {
      conjugationForm
    });
    if (entry !== undefined && ((entry.pos as number) & POS0) === 動詞) {
      return entry;
    }
  }
  return undefined;
}

export async function buildTailChainAssemblyDescriptor(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly tailChunk: Extract<TailChunkResult, { readonly ok: true }>;
  readonly headResult: ContentHeadMetadata;
  readonly dictionary: MorphemeDictionary;
  readonly root?: TailRoot;
  readonly consumed?: number;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly isKeijoujiVerbObjectHost: (token: RuntimeHaruToken | undefined) => boolean;
  readonly renderPlanPolicy?: RenderPlanPolicy;
}): Promise<TailChainAssemblyDescriptor> {
  const rootSource = options.root ?? options.tailChunk.root;
  const root = await hydrateTailRootForAssembly(
    rootSource,
    options.headResult,
    options.tokens,
    options.cursor,
    options.tailChunk.predicateTokenIdx,
    options.dictionary,
    options.lookups,
    options.numeric
  );
  const consumed = options.consumed ?? options.tailChunk.consumed;
  const voiceReadings = tailRootRareruReadings(root, options.headResult.rareruReadings);
  const commitmentGrammar = contextGrammarFromContentHeadMetadata(options.headResult);
  const voiceReading = singleRareruReading(voiceReadings);
  const plan = buildTailChainRenderPlan({
    tokens: options.tokens,
    index: options.index,
    tailChunk: options.tailChunk,
    root,
    lookups: options.lookups,
    consumed,
    commitmentGrammar: voiceReading === null ? commitmentGrammar : { ...commitmentGrammar, voice: voiceReading },
    entry: options.headResult.entry
  });
  const koreanPos = tailRootPredicateKoreanPos(root, options.headResult.koreanPos);
  const voiceOpen = tailRootVoiceOpen({
    root,
    fallbackVoice: options.headResult.voice,
    readings: voiceReadings,
    tokens: options.tokens,
    index: options.index,
    lookups: options.lookups
  });
  const tailVoice = tailRootSpanVoice(root, options.headResult.voice, voiceReadings);
  const tailHasRequest = tailRootHasRequestTail(root);
  const tailBenefactive = tailRootBenefactiveContext(root);
  const sourceCandidates = stagedCommitmentCandidateSet(
    tailRootCommitmentCandidates(root, options.headResult.entry),
    { sharedConsumed: consumed }
  );
  return {
    consumed,
    korean: "",
    koreanPos,
    entry: options.headResult.entry,
    unitType: UnitType.CONTENT,
    attachLeft: isSahenBoundVerbAfterSahen(options.tokens, options.index) && !renderPlanStartsWithShortNegation(plan),
    provenance: "predicate_tail",
    renderPlan: plan,
    renderPlanPolicy: options.renderPlanPolicy ?? "normal",
    voice: voiceOpen ? null : tailVoice,
    rareruReadings: voiceReadings,
    nareruReadings: options.headResult.nareruReadings,
    dekiruReadings: options.headResult.dekiruReadings,
    hasNegative: options.headResult.hasNegative,
    hasCausative: options.headResult.hasCausative,
    hasCausativePassive: options.headResult.hasCausativePassive || tailNodeHasCausativePassiveSequence(root.tail),
    hasRequestTail: tailHasRequest || options.headResult.hasRequestTail,
    hasBenefactiveTail: tailHasRequest || tailBenefactive !== undefined || options.headResult.hasBenefactiveTail,
    isKeijoujiVerbPredicate:
      !isQuoteLikeTailBoundary(options.tailChunk.outgoingBoundary) &&
      koreanPos === 동사 &&
      firstAuxLayer(root.tail)?.stem.kind !== "noun" &&
      !tailRootStemIsVerbalSuffixDerivation(root) &&
      options.isKeijoujiVerbObjectHost(options.tokens[options.index]),
    benefactive: tailBenefactive ?? options.headResult.benefactive,
    connectiveRole: options.headResult.connectiveRole,
    sourceCandidates,
    warnings: tailChainHeadResultWarnings(options.headResult.warnings, options.tokens, options.index, consumed)
  };
}

async function hydrateTailRootForAssembly(
  root: TailRoot,
  headResult: ContentHeadMetadata,
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  predicateTokenIdx: number,
  dictionary: MorphemeDictionary,
  lookups: LookupTables,
  numeric: NumericTables
): Promise<TailRoot> {
  return await hydrateTailChainRootWithHeadMetadata(
    expandTailRootCandidatesFromHeadMetadata(root, headResult),
    headResult,
    tokens,
    cursor,
    predicateTokenIdx,
    dictionary,
    lookups,
    numeric
  );
}

function expandTailRootCandidatesFromHeadMetadata(
  root: TailRoot,
  headResult: ContentHeadMetadata
): TailRoot {
  const hypothesisReplacement = expandTailNodeCandidatesFromHeadHypothesis(root.tail, root.headHypothesis);
  const rootWithPreservedCandidates = hypothesisReplacement.changed
    ? { ...root, tail: hypothesisReplacement.node }
    : root;
  if (candidateSetSize(commitmentLaneCandidateSet(headResult.sourceCandidates)) === 0) {
    return rootWithPreservedCandidates;
  }
  const replacement = expandTailNodeCandidatesFromHeadMetadata(rootWithPreservedCandidates.tail, headResult);
  return replacement.changed ? { ...rootWithPreservedCandidates, tail: replacement.node } : rootWithPreservedCandidates;
}

function tailRootHasCandidateSet(root: TailRoot): boolean {
  return tailNodeHasCandidateSet(root.tail);
}

function tailNodeHasCandidateSet(node: TailRoot["tail"]): boolean {
  if (node.kind === "connective") {
    return tailNodeHasCandidateSet(node.inner) || tailNodeHasCandidateSet(node.outer);
  }
  return node.stem.kind === "candidateSet";
}

function expandTailNodeCandidatesFromHeadHypothesis(
  node: TailRoot["tail"],
  headHypothesis: HeadHypothesisCarrier | undefined
): { readonly node: TailRoot["tail"]; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = expandTailNodeCandidatesFromHeadHypothesis(node.inner, headHypothesis);
    const outer = expandTailNodeCandidatesFromHeadHypothesis(node.outer, headHypothesis);
    if (!inner.changed && !outer.changed) {
      return { node, changed: false };
    }
    return {
      node: {
        ...node,
        inner: inner.node as Extract<TailRoot["tail"], { readonly kind: "auxLayer" }>,
        outer: outer.node
      },
      changed: true
    };
  }
  if (node.stem.kind !== "candidateSet") {
    return { node, changed: false };
  }
  const selectedHeadHypothesis = broaderHeadHypothesis(node.stem.headHypothesis, headHypothesis);
  const candidates = preservedStemCandidatesFromHeadHypothesis(
    selectedHeadHypothesis,
    node.stem.candidates.length
  );
  if (candidates === null) {
    return { node, changed: false };
  }
  const nextStem = selectedHeadHypothesis === undefined || selectedHeadHypothesis === node.stem.headHypothesis
    ? { ...node.stem, candidates }
    : { ...node.stem, candidates, headHypothesis: selectedHeadHypothesis };
  return {
    node: {
      ...node,
      stem: nextStem
    },
    changed: true
  };
}

function broaderHeadHypothesis(
  local: HeadHypothesisCarrier | undefined,
  inherited: HeadHypothesisCarrier | undefined
): HeadHypothesisCarrier | undefined {
  if (local === undefined) {
    return inherited;
  }
  if (inherited === undefined) {
    return local;
  }
  return inherited.preservedCandidateCount > local.preservedCandidateCount ? inherited : local;
}

function preservedStemCandidatesFromHeadHypothesis(
  headHypothesis: HeadHypothesisCarrier | undefined,
  currentCandidateCount: number
): readonly StemCandidate[] | null {
  if (headHypothesis === undefined) {
    return null;
  }
  const candidates = headHypothesis.candidates.flatMap((candidate) =>
    candidate.status === "admitted" && candidate.preservedCandidate !== undefined
      ? [candidate.preservedCandidate]
      : []
  );
  return candidates.length > currentCandidateCount ? candidates : null;
}

function expandTailNodeCandidatesFromHeadMetadata(
  node: TailRoot["tail"],
  headResult: ContentHeadMetadata
): { readonly node: TailRoot["tail"]; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = expandTailNodeCandidatesFromHeadMetadata(node.inner, headResult);
    const outer = expandTailNodeCandidatesFromHeadMetadata(node.outer, headResult);
    if (!inner.changed && !outer.changed) {
      return { node, changed: false };
    }
    return {
      node: {
        ...node,
        inner: inner.node as Extract<TailRoot["tail"], { readonly kind: "auxLayer" }>,
        outer: outer.node
      },
      changed: true
    };
  }
  if (node.stem.kind !== "candidateSet") {
    return { node, changed: false };
  }
  const sourceStem = node.stem;
  const headCandidates = candidateSetCandidates(headResult.sourceCandidates);
  const hydratedSourceCandidates = sourceStem.candidates.map((sourceCandidate) => {
    const contentCandidate = headCandidates.find((candidate) =>
      stemCandidateIdentitiesEqual(stemCandidateIdentity(sourceCandidate), translationCandidateIdentity(candidate))
    );
    const verdict = contentCandidate?.sourceVerbalPredicateVerdict ?? null;
    return verdict === null || sourceCandidate.sourceVerbalPredicateVerdict === verdict
      ? sourceCandidate
      : { ...sourceCandidate, sourceVerbalPredicateVerdict: verdict };
  });
  const metadataChanged = hydratedSourceCandidates.some((candidate, index) =>
    candidate !== sourceStem.candidates[index]
  );
  if (sourceStem.candidates.length >= headCandidates.length) {
    return metadataChanged
      ? {
          node: {
            ...node,
            stem: { ...sourceStem, candidates: hydratedSourceCandidates }
          },
          changed: true
        }
      : { node, changed: false };
  }
  const allowedKoreanPos = new Set(sourceStem.candidates.map(candidate => candidate.koreanPos ?? null));
  const hasConcreteAllowedKoreanPos = !allowedKoreanPos.has(null);
  const candidates = headCandidates
    .map(candidate => stemCandidateFromHeadCandidate(candidate, sourceStem))
    .filter((candidate): candidate is StemCandidate =>
      candidate !== null &&
      (sourceStem.headHypothesis === undefined || sourceStem.headHypothesis.candidates.some((hypothesis) =>
        stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), {
          provenance: hypothesis.provenance,
          projectionOrdinal: hypothesis.projectionOrdinal
        })
      )) &&
      (!hasConcreteAllowedKoreanPos || allowedKoreanPos.has(candidate.koreanPos ?? null))
    );
  if (candidates.length <= sourceStem.candidates.length) {
    return metadataChanged
      ? {
          node: {
            ...node,
            stem: { ...sourceStem, candidates: hydratedSourceCandidates }
          },
          changed: true
        }
      : { node, changed: false };
  }
  assertUniqueStemCandidateIdentities(candidates);
  return {
    node: {
      ...node,
      stem: {
        ...node.stem,
        candidates
      }
    },
    changed: true
  };
}

function stemCandidateFromHeadCandidate(
  candidate: TranslationCandidate,
  sourceStem: Extract<StemNode, { readonly kind: "candidateSet" }>
): StemCandidate | null {
  if (candidate.koreanLemma.length === 0) {
    return null;
  }
  const translation = candidate.translation;
  const structuralCandidate = findStemCandidateByTranslationIdentity(sourceStem.candidates, candidate);
  const structuralPatch = structuralCandidate === null
    ? invariantStemCandidateStructuralPatch(sourceStem.candidates)
    : stemCandidateStructuralPatch(structuralCandidate);
  return {
    ...stemCandidatePatchFromTranslationCandidate(candidate),
    ...structuralPatch,
    lemma: candidate.koreanLemma,
    irregular: candidate.irregular ?? null,
    koreanPos: candidate.koreanPos,
    projectionOrdinal: candidate.projectionOrdinal,
    ...(translation.connectiveRole === undefined ? {} : { connectiveRole: translation.connectiveRole }),
    ...translationSenseMetadata(translation)
  };
}

function tailChainHeadResultWarnings(
  warnings: readonly Warning[],
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number
): readonly Warning[] {
  const end = start + consumed;
  return warnings.filter((warning) => {
    if (!isShadowUnsupportedHeadResultWarning(warning)) {
      return true;
    }
    const span = warning.span;
    if (span === undefined) {
      return true;
    }
    const sameOwnedSpan = span.start === start && (
      span.end === end ||
      (span.end === end + 1 && isHardTerminalPunctuationToken(tokens[end]))
    );
    const prefixOwnedByTailChain = warning.opKind === "postverb_operator_chain_removed" &&
      span.start === start &&
      span.end <= end;
    return !sameOwnedSpan && !prefixOwnedByTailChain;
  });
}

function isShadowUnsupportedHeadResultWarning(warning: Warning): boolean {
  return warning.type === "unsupported_grammar" && (
    warning.opKind === "legacy_post_aux_rule_removed" ||
    warning.opKind === "pattern_surface_owner_removed" ||
    warning.opKind === "postverb_operator_chain_removed"
  );
}

export function buildTailParserFallbackAssemblyDescriptor(options: {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly result: ContentResult;
  readonly reason: string;
  readonly mode: "readiness_blocker" | "parse_failure" | "contested_claim_yield";
  readonly predicateIntake?: TailChunkIntakeVerdict;
  readonly realizedKorean: string;
  readonly cacheKorean: boolean;
  readonly lookups: LookupTables;
  readonly isKeijoujiVerbObjectHost: (token: RuntimeHaruToken | undefined) => boolean;
}): TailParserFallbackAssemblyDescriptor {
  const { tokens, pos: index } = options.cursor;
  const baseProvenance = options.mode !== "parse_failure"
    ? classifyTailSpanProvenance({
      tokens,
      cursor: options.cursor,
      start: index,
      consumed: options.result.consumed,
      renderPlan: options.result.renderPlan,
      reason: options.reason,
      contentResult: options.result,
      mode: options.mode,
      lookups: options.lookups
    })
    : tailFallbackSpanProvenance(
      tokens,
      options.cursor,
      index,
      options.result.consumed,
      options.result.renderPlan,
      options.reason,
      options.lookups,
      options.result,
      options.predicateIntake
    );
  const hasUnsupportedGrammarWarning = options.result.warnings.some((warning) => warning.type === "unsupported_grammar");
  const provenance = hasUnsupportedGrammarWarning ? "assembler" : baseProvenance;
  const auxCursor = options.cursor.fork(index + 1, options.cursor.end, index + 1);
  const auxTokens = collectAuxTokens(auxCursor);
  const voiceOpen = (
    tailParserFallbackVoiceOpenCandidate(tokens[index], auxTokens, options.result.voice === "passive", options.lookups) &&
    options.result.renderPlan !== null &&
    setForcePassiveRenderPlan(options.result.renderPlan, true) !== undefined
  );
  return {
    consumed: options.result.consumed,
    korean: options.cacheKorean ? options.realizedKorean : "",
    koreanPos: contentResultKoreanPos(options.result),
    entry: options.result.entry,
    unitType: UnitType.CONTENT,
    attachLeft: isSahenBoundVerbAfterSahen(tokens, index) && !renderPlanStartsWithShortNegation(options.result.renderPlan),
    provenance,
    provenanceReason: options.mode !== "parse_failure"
      ? provenance === "tail_parser_blocked" ? options.reason : null
      : provenance === "assembler" ? null : options.reason,
    renderPlan: options.result.renderPlan,
    voice: voiceOpen ? null : options.result.voice,
    rareruReadings: options.result.rareruReadings,
    nareruReadings: options.result.nareruReadings,
    dekiruReadings: options.result.dekiruReadings,
    hasNegative: options.result.hasNegative,
    hasCausative: options.result.hasCausative,
    hasCausativePassive: options.result.hasCausativePassive,
    hasRequestTail: options.result.hasRequestTail,
    hasBenefactiveTail: options.result.hasBenefactiveTail,
    isKeijoujiVerbPredicate:
      contentResultKoreanPos(options.result) === 동사 &&
      options.isKeijoujiVerbObjectHost(tokens[index]),
    benefactive: options.result.benefactive,
    sourceCandidates: options.result.sourceCandidates,
    warnings: options.result.warnings,
    renderPlanPolicy: options.result.renderPlanPolicy
  };
}

export function buildTailParserFailureFallbackProvenance(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly consumed: number;
  readonly renderPlan: RenderPlan | null | undefined;
  readonly reason: string;
  readonly lookups: LookupTables;
}): {
  readonly provenance: TranslationUnitProvenance;
  readonly provenanceReason: string | null;
} {
  const provenance = tailFallbackSpanProvenance(
    options.tokens,
    options.cursor,
    options.index,
    options.consumed,
    options.renderPlan,
    options.reason,
    options.lookups
  );
  return {
    provenance,
    provenanceReason: provenance === "assembler" ? null : options.reason
  };
}

export function tailChainRenderBlocker(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly index: number;
  readonly tailChunk: Extract<TailChunkResult, { readonly ok: true }>;
  readonly root: TailRoot;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}): string | null {
  const plan = buildTailChainRenderPlan({
    tokens: options.tokens,
    index: options.index,
    tailChunk: options.tailChunk,
    root: options.root,
    lookups: options.lookups
  });
  for (const formal of [false, true] as const) {
    try {
      realizeRenderPlan(plan, { formal, lookups: options.lookups, numeric: options.numeric });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `hydrated tail render failed (${formal ? "formal" : "casual"}): ${message}`;
    }
  }
  return null;
}

export function tailChainReadinessBlocker(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly tailChunk: Extract<TailChunkResult, { readonly ok: true }>;
  readonly root: TailRoot;
  readonly headResult: ContentHeadMetadata;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}): string | null {
  const semanticReadinessBlocker = tailParserSemanticReadinessBlocker({
    tailChunk: options.tailChunk,
    root: options.root,
    cursor: options.cursor,
    start: options.index,
    headConsumed: options.headResult.consumed,
    lookups: options.lookups
  });
  if (semanticReadinessBlocker !== null) {
    return semanticReadinessBlocker;
  }
  return null;
}

function renderPlanPolicyForStructuralRelationAwaitingTail(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly index: number;
  readonly tailChunk: Extract<TailChunkResult, { readonly ok: true }>;
  readonly lookups: LookupTables;
}): RenderPlanPolicy {
  const boundary = options.tailChunk.outgoingBoundary;
  if (
    boundary.kind === "terminal" ||
    boundary.connectiveKind !== "quotative" ||
    boundary.tokenIdx < options.index
  ) {
    return "normal";
  }
  const relation = quoteStructuralRelationAt(
    options.cursor.fork(boundary.tokenIdx, options.tokens.length, boundary.tokenIdx),
    options.lookups
  );
  if (
    relation === undefined ||
    relation.kind !== "quoted_content" ||
    relation.quote.slotKind !== "quoted_content" ||
    relation.quote.contentSpan.endExclusive !== relation.quote.markerIdx
  ) {
    return "normal";
  }
  return (
    quoteContentEndsWithConditionalBeforeThoughtHost(
      options.tokens,
      relation.quote.contentSpan,
      relation.quote.markerIdx,
      relation.quote.hostMatch
    ) ||
    quoteContentEndsWithReasonCopulaBeforeQuoteMarker(
      options.tokens,
      relation.quote.contentSpan,
      relation.quote.markerIdx
    )
  )
    ? "awaiting_structural_relation"
    : "normal";
}

function tailParserFallbackVoiceOpenCandidate(
  token: RuntimeHaruToken | undefined,
  auxTokens: Parameters<typeof auxExtractFeatures>[0],
  isPassive: boolean,
  lookups: LookupTables
): boolean {
  if (token === undefined || isPassive || (token.pos & POS0) !== 動詞 || auxTokens.length === 0) {
    return false;
  }
  if (!auxTokens.some((aux) => (aux.pos & POS4) === 助動詞_レル)) {
    return false;
  }
  const verbConjType4 = token.pos & POS4;
  if (is五段(verbConjType4) || verbConjType4 === サ行変格) {
    return false;
  }
  if (lookups.RARERU_PASSIVE_PREFERRED.has(token.dictionaryForm)) {
    return false;
  }
  const featureOptions: {
    lookups: LookupTables;
    jpDictForm?: string;
    verbConjType4?: number;
    forcePassive?: boolean;
  } = {
    lookups,
    jpDictForm: token.dictionaryForm,
    forcePassive: false
  };
  if (verbConjType4 !== 0) {
    featureOptions.verbConjType4 = verbConjType4;
  }
  const features = auxExtractFeatures(auxTokens, featureOptions);
  return features.potential === true && features.passive !== true;
}

type HonorificFormulaicStemTransform = "none" | "respect" | "humble_light_verb";
type FormulaicApologyPredicateKind = "sumimasen_polite" | "sumanai_plain" | "gomen_plain";
type HonorificFormulaicKind =
  | "imperative_nasai"
  | "request_kudasai"
  | "benefactive_kudasaru"
  | "honorific_nasaru"
  | "benefactive_itadaku"
  | "benefactive_itadakeru"
  | "request_negau"
  | "honorific_naru"
  | "humble_light_verb";

interface HonorificFormulaicConstructionMatch {
  readonly kind: HonorificFormulaicKind;
  readonly consumed: number;
  readonly headIdx: number;
  readonly headEnd: number;
  readonly head: RuntimeHaruToken;
  readonly headKind: HonorificFormulaicHostKind;
  readonly stemTransform: HonorificFormulaicStemTransform;
  readonly stemMood?: StemMood;
  readonly ops: readonly AuxOpNode[];
  readonly terminal: AuxLayerNode["terminal"];
  readonly terminalPayload?: AuxLayerNode["terminalPayload"];
  readonly sfp: SfpNode | null;
  readonly boundary: ClauseBoundary;
  readonly tailSurface: string;
}

interface FormulaicApologyPredicateMatch {
  readonly kind: FormulaicApologyPredicateKind;
  readonly consumed: number;
  readonly headIdx: number;
  readonly stemSourceIndices: readonly number[];
  readonly ops: readonly (ConnectiveOp | PoliteOp | TenseOp)[];
  readonly boundary: ClauseBoundary;
  readonly sfp: SfpNode | null;
}

function matchFormulaicApologyPredicate(
  tokens: readonly RuntimeHaruToken[],
  index: number
): FormulaicApologyPredicateMatch | null {
  const head = tokens[index];
  if (head === undefined) {
    return null;
  }
  const gomen = matchFormulaicGomenApology(tokens, index, head);
  if (gomen !== null) {
    return gomen;
  }
  if (!isSumuApologyStemToken(head) || formulaicApologyHasNonApologyLeftEvidence(tokens, index)) {
    return null;
  }
  const polite = matchFormulaicSumimasenApology(tokens, index, head);
  if (polite !== null) {
    return polite;
  }
  return matchFormulaicSumanaiApology(tokens, index, head);
}

function matchFormulaicSumimasenApology(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  head: RuntimeHaruToken
): FormulaicApologyPredicateMatch | null {
  if ((head.pos & POS5A) !== 連用形_) {
    return null;
  }
  const masuIdx = nextNonSpaceIndex(tokens, index + 1, tokens.length) ?? tokens.length;
  const masu = tokens[masuIdx];
  if (!isPoliteAuxToken(masu) || masu.surface !== "ませ") {
    return null;
  }
  const negativeIdx = nextNonSpaceIndex(tokens, masuIdx + 1, tokens.length) ?? tokens.length;
  const negative = tokens[negativeIdx];
  if (!isNuNegativeAuxToken(negative)) {
    return null;
  }
  const ops: Array<ConnectiveOp | PoliteOp | TenseOp> = [
    createPoliteOp({  source: opSourceFromIndices(tokens, [masuIdx]) })
  ];
  let endExclusive = negativeIdx + 1;
  const deshita = collectDeshitaPast(tokens, endExclusive);
  if (deshita !== null) {
    ops.push(deshita.op);
    endExclusive = deshita.endExclusive;
  }
  const sfp = collectFormulaicApologySfp(tokens, endExclusive);
  endExclusive = sfp.endExclusive;
  const connective = collectFormulaicAdversativeConnective(tokens, endExclusive, {
    allowCopulaAdversative: false
  });
  if (connective !== null) {
    ops.push(connective.op);
    endExclusive = connective.endExclusive;
  } else if (!formulaicApologyCanClose(tokens, endExclusive, { allowSoftContinuation: true })) {
    return null;
  }
  return {
    kind: "sumimasen_polite",
    consumed: endExclusive - index,
    headIdx: index,
    stemSourceIndices: [index, negativeIdx],
    ops: formulaicApologyOpsForMatch(ops, connective !== null),
    boundary: connective?.boundary ?? { kind: "terminal" },
    sfp: sfp.sfp
  };
}

function matchFormulaicSumanaiApology(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  head: RuntimeHaruToken
): FormulaicApologyPredicateMatch | null {
  if ((head.pos & POS5A) !== 未然形_) {
    return null;
  }
  const negativeIdx = nextNonSpaceIndex(tokens, index + 1, tokens.length) ?? tokens.length;
  const negative = tokens[negativeIdx];
  const isNaiNegative = isNaiNegativeAuxToken(negative);
  const isNuNegative = isNuNegativeAuxToken(negative);
  if (!isNaiNegative && !isNuNegative) {
    return null;
  }
  const ops: Array<ConnectiveOp | PoliteOp | TenseOp> = [];
  let endExclusive = negativeIdx + 1;
  const pastIdx = nextNonSpaceIndex(tokens, endExclusive, tokens.length) ?? tokens.length;
  if (isNaiNegative && (negative.pos & POS5A) === 連用形_ && isPastAuxToken(tokens[pastIdx])) {
    ops.push(createTenseOp({

      source: opSourceFromRange(tokens, negativeIdx, pastIdx),
      tense: "past"
    }));
    endExclusive = pastIdx + 1;
  }
  const desuIdx = nextNonSpaceIndex(tokens, endExclusive, tokens.length) ?? tokens.length;
  const desu = tokens[desuIdx];
  if (ops.length === 0 && isDesuAuxToken(desu)) {
    ops.push(createPoliteOp({  source: opSourceFromIndices(tokens, [desuIdx]) }));
    endExclusive = desuIdx + 1;
  }
  const sfp = collectFormulaicApologySfp(tokens, endExclusive);
  endExclusive = sfp.endExclusive;
  const connective = collectFormulaicAdversativeConnective(tokens, endExclusive, {
    allowCopulaAdversative: false
  });
  if (connective !== null) {
    ops.push(connective.op);
    endExclusive = connective.endExclusive;
  } else if (!formulaicApologyCanClose(tokens, endExclusive, { allowSoftContinuation: true })) {
    return null;
  }
  return {
    kind: "sumanai_plain",
    consumed: endExclusive - index,
    headIdx: index,
    stemSourceIndices: [index, negativeIdx],
    ops: formulaicApologyOpsForMatch(ops, connective !== null),
    boundary: connective?.boundary ?? { kind: "terminal" },
    sfp: sfp.sfp
  };
}

function matchFormulaicGomenApology(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  head: RuntimeHaruToken
): FormulaicApologyPredicateMatch | null {
  if (!isGomenApologyToken(head)) {
    return null;
  }
  const sfp = collectFormulaicApologySfp(tokens, index + 1);
  let endExclusive = sfp.endExclusive;
  const allowSoftContinuation = isHiraganaGomenApologyToken(head);
  const connective = collectFormulaicAdversativeConnective(tokens, endExclusive, {
    allowCopulaAdversative: allowSoftContinuation
  });
  if (connective !== null) {
    endExclusive = connective.endExclusive;
  } else if (!formulaicApologyCanClose(tokens, endExclusive, { allowSoftContinuation })) {
    return null;
  }
  return {
    kind: "gomen_plain",
    consumed: endExclusive - index,
    headIdx: index,
    stemSourceIndices: [index],
    ops: connective === null ? [] : [connective.op],
    boundary: connective?.boundary ?? { kind: "terminal" },
    sfp: sfp.sfp
  };
}

function formulaicApologyOpsForMatch(
  ops: readonly (ConnectiveOp | PoliteOp | TenseOp)[],
  hasConnective: boolean
): readonly (ConnectiveOp | PoliteOp | TenseOp)[] {
  if (!hasConnective) {
    return ops;
  }
  return ops.filter((op) => op.kind !== "polite");
}

function formulaicOpsConnectiveRole(
  ops: HonorificFormulaicConstructionMatch["ops"]
): string | null {
  return ops.some((op) => op.kind === "connective" && op.connective === "te_form") ? "te_form" : null;
}

function matchHonorificFormulaicConstruction(
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number,
  lookups: LookupTables
): HonorificFormulaicConstructionMatch | null {
  const n = tokens.length;
  const host = honorificFormulaicHostAt(tokens, index);
  if (host === null) {
    return null;
  }
  const tailIdx = nextNonSpaceIndex(tokens, host.causative?.endExclusive ?? host.headEnd, n) ?? n;
  const tail = tokens[tailIdx];
  if (tail === undefined) {
    return null;
  }
  return withFormulaicCausativeHostVoice(
    host,
    matchHonorificFormulaicArm(tokens, cursor, index, host, tailIdx, tail, lookups)
  );
}

function matchHonorificFormulaicArm(
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number,
  host: HonorificFormulaicHost,
  tailIdx: number,
  tail: RuntimeHaruToken,
  lookups: LookupTables
): HonorificFormulaicConstructionMatch | null {
  const nasai = matchNasaiImperative(tokens, index, host, tailIdx, tail);
  if (nasai !== null) {
    return nasai;
  }
  if (!host.requiresHonorificClosure) {
    return null;
  }
  const request = matchKudasaiRequest(tokens, index, host, tailIdx, tail);
  if (request !== null) {
    return request;
  }
  const kudasaru = matchKudasaruBenefactive(tokens, cursor, index, host, tailIdx, tail, lookups);
  if (kudasaru !== null) {
    return kudasaru;
  }
  const nasaru = matchNasaruHonorific(tokens, cursor, index, host, tailIdx, tail, lookups);
  if (nasaru !== null) {
    return nasaru;
  }
  const benefactive = matchItadakuBenefactive(tokens, cursor, index, host, tailIdx, tail, lookups);
  if (benefactive !== null) {
    return benefactive;
  }
  const honorific = matchNaruHonorific(tokens, cursor, index, host, tailIdx, tail, lookups);
  if (honorific !== null) {
    return honorific;
  }
  const humble = matchHumbleLightVerb(tokens, cursor, index, host, tailIdx, tail, lookups);
  if (humble !== null) {
    return humble;
  }
  if (host.headKind !== "renyou_verb") {
    return null;
  }
  const accusative = formulaicAccusativeBridgedTail(tokens, tailIdx, tail);
  if (accusative === null) {
    return null;
  }
  const bridgedBenefactive = matchItadakuBenefactive(
    tokens, cursor, index, host, accusative.tailIdx, accusative.tail, lookups
  );
  if (bridgedBenefactive !== null) {
    return bridgedBenefactive;
  }
  return matchHumbleLightVerb(tokens, cursor, index, host, accusative.tailIdx, accusative.tail, lookups);
}

function formulaicAccusativeBridgedTail(
  tokens: readonly RuntimeHaruToken[],
  tailIdx: number,
  tail: RuntimeHaruToken
): { readonly tailIdx: number; readonly tail: RuntimeHaruToken } | null {
  if (tail.surface !== "を" || (tail.pos & POS0) !== 助詞) {
    return null;
  }
  const bridgedIdx = nextNonSpaceIndex(tokens, tailIdx + 1, tokens.length) ?? tokens.length;
  const bridged = tokens[bridgedIdx];
  if (bridged === undefined) {
    return null;
  }
  return formulaicHumbleLightVerbArm(bridged) !== null || benefactiveAspectForItadakuToken(bridged) !== null
    ? { tailIdx: bridgedIdx, tail: bridged }
    : null;
}

function withFormulaicCausativeHostVoice(
  host: HonorificFormulaicHost,
  match: HonorificFormulaicConstructionMatch | null
): HonorificFormulaicConstructionMatch | null {
  if (match === null || host.causative === null) {
    return match;
  }
  return { ...match, ops: [host.causative.op, ...match.ops] };
}

function matchNasaiImperative(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  host: HonorificFormulaicHost,
  tailIdx: number,
  tail: RuntimeHaruToken
): HonorificFormulaicConstructionMatch | null {
  if (isNasaiImperativeToken(tail) && host.headKind === "renyou_verb") {
    const sfp = collectFormulaicTailSfp(tokens, tailIdx + 1);
    return {
      kind: "imperative_nasai",
      consumed: sfp.endExclusive - index,
      headIdx: host.headIdx,
      headEnd: host.headEnd,
      head: host.head,
      headKind: host.headKind,
      stemTransform: "none",
      ops: [],
      terminal: "imperative",
      terminalPayload: nasaiImperativeTerminalPayload(tokens, tailIdx, tailIdx + 1),
      sfp: sfp.sfp,
      boundary: { kind: "terminal" },
      tailSurface: tokens.slice(tailIdx, sfp.endExclusive).map((token) => token.surface).join("")
    };
  }
  const renyouNasaiPolite = matchNasaiMaseImperative(tokens, tailIdx);
  if (renyouNasaiPolite !== null && host.headKind === "renyou_verb") {
    const sfp = collectFormulaicTailSfp(tokens, renyouNasaiPolite.endExclusive);
    return {
      kind: "imperative_nasai",
      consumed: sfp.endExclusive - index,
      headIdx: host.headIdx,
      headEnd: host.headEnd,
      head: host.head,
      headKind: host.headKind,
      stemTransform: "none",
      ops: renyouNasaiPolite.ops,
      terminal: "imperative",
      terminalPayload: nasaiImperativeTerminalPayload(tokens, tailIdx, renyouNasaiPolite.endExclusive),
      sfp: sfp.sfp,
      boundary: { kind: "terminal" },
      tailSurface: tokens.slice(tailIdx, sfp.endExclusive).map((token) => token.surface).join("")
    };
  }

  if (host.headKind !== "sahen_noun") {
    return null;
  }
  const suru = tail;
  const nasaiIdx = nextNonSpaceIndex(tokens, tailIdx + 1, tokens.length) ?? tokens.length;
  const nasai = tokens[nasaiIdx];
  if (!isSuruLightVerbToken(suru) || nasai === undefined) {
    return null;
  }
  if (isNasaiImperativeToken(nasai)) {
    const sfp = collectFormulaicTailSfp(tokens, nasaiIdx + 1);
    return {
      kind: "imperative_nasai",
      consumed: sfp.endExclusive - index,
      headIdx: host.headIdx,
      headEnd: host.headEnd,
      head: host.head,
      headKind: host.headKind,
      stemTransform: "none",
      ops: [],
      terminal: "imperative",
      terminalPayload: nasaiImperativeTerminalPayload(tokens, tailIdx, nasaiIdx + 1),
      sfp: sfp.sfp,
      boundary: { kind: "terminal" },
      tailSurface: tokens.slice(tailIdx, sfp.endExclusive).map((token) => token.surface).join("")
    };
  }
  const sahenNasaiPolite = matchNasaiMaseImperative(tokens, nasaiIdx);
  if (sahenNasaiPolite === null) {
    return null;
  }
  const sfp = collectFormulaicTailSfp(tokens, sahenNasaiPolite.endExclusive);
  return {
    kind: "imperative_nasai",
    consumed: sfp.endExclusive - index,
    headIdx: host.headIdx,
    headEnd: host.headEnd,
    head: host.head,
    headKind: host.headKind,
    stemTransform: "none",
    ops: sahenNasaiPolite.ops,
    terminal: "imperative",
    terminalPayload: nasaiImperativeTerminalPayload(tokens, tailIdx, sahenNasaiPolite.endExclusive),
    sfp: sfp.sfp,
    boundary: { kind: "terminal" },
    tailSurface: tokens.slice(tailIdx, sfp.endExclusive).map((token) => token.surface).join("")
  };
}

function nasaiImperativeTerminalPayload(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): ImperativeTerminalPayload {
  return {
    kind: "imperative",
    source: opSourceFromRange(tokens, start, endExclusive - 1),
    sourceForm: "nasai",
    sourceNuance: "directive_polite"
  };
}

function matchNasaiMaseImperative(
  tokens: readonly RuntimeHaruToken[],
  nasaiIdx: number
): { readonly ops: readonly PoliteOp[]; readonly endExclusive: number } | null {
  const nasai = tokens[nasaiIdx];
  if (!isNasaiRenyouToken(nasai)) {
    return null;
  }
  const maseIdx = nextNonSpaceIndex(tokens, nasaiIdx + 1, tokens.length) ?? tokens.length;
  const mase = tokens[maseIdx];
  if (!isPoliteImperativeMaseToken(mase)) {
    return null;
  }
  return {
    ops: [createPoliteOp({  source: opSourceFromIndices(tokens, [maseIdx]) })],
    endExclusive: maseIdx + 1
  };
}

function matchKudasaiRequest(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  host: HonorificFormulaicHost,
  tailIdx: number,
  tail: RuntimeHaruToken
): HonorificFormulaicConstructionMatch | null {
  const ops: Array<RequestAspectOp | PoliteOp> = [sahenRequestAspectOp(tokens, tailIdx)];
  let endExclusive: number;
  if (isBareKudasaiRequestToken(tail)) {
    endExclusive = tailIdx + 1;
  } else {
    const politeImperative = matchKudasaiMaseRequest(tokens, tailIdx);
    if (politeImperative === null) {
      return null;
    }
    ops.push(...politeImperative.ops);
    endExclusive = politeImperative.endExclusive;
  }
  const sfp = collectFormulaicTailSfp(tokens, endExclusive);
  return {
    kind: "request_kudasai",
    consumed: sfp.endExclusive - index,
    headIdx: host.headIdx,
    headEnd: host.headEnd,
    head: host.head,
    headKind: host.headKind,
    stemTransform: "none",
    ops,
    terminal: null,
    sfp: sfp.sfp,
    boundary: { kind: "terminal" },
    tailSurface: tokens.slice(tailIdx, sfp.endExclusive).map((token) => token.surface).join("")
  };
}

function matchKudasaiMaseRequest(
  tokens: readonly RuntimeHaruToken[],
  kudasaiIdx: number
): { readonly ops: readonly PoliteOp[]; readonly endExclusive: number } | null {
  const kudasai = tokens[kudasaiIdx];
  if (!isKudasaiRenyouRequestToken(kudasai)) {
    return null;
  }
  const maseIdx = nextNonSpaceIndex(tokens, kudasaiIdx + 1, tokens.length) ?? tokens.length;
  const mase = tokens[maseIdx];
  if (!isPoliteImperativeMaseToken(mase)) {
    return null;
  }
  return {
    ops: [createPoliteOp({  source: opSourceFromIndices(tokens, [maseIdx]) })],
    endExclusive: maseIdx + 1
  };
}

function matchKudasaruBenefactive(
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number,
  host: HonorificFormulaicHost,
  tailIdx: number,
  tail: RuntimeHaruToken,
  lookups: LookupTables
): HonorificFormulaicConstructionMatch | null {
  if (host.headKind !== "renyou_verb" || !isNonImperativeArmVerbToken(tail, "benefactive_kudasaru")) {
    return null;
  }
  const continuation = formulaicTailContinuationFrom(tokens, cursor, host, tailIdx, tailIdx + 1, lookups);
  if (continuation === null) {
    return null;
  }
  const attributive = formulaicAttributiveTerminal(tokens, index, continuation, host.headKind, lookups);
  if (attributive === null) {
    return null;
  }
  return {
    kind: "benefactive_kudasaru",
    consumed: continuation.endExclusive - index,
    headIdx: host.headIdx,
    headEnd: host.headEnd,
    head: host.head,
    headKind: host.headKind,
    stemTransform: "none",
    ops: [benefactiveAspectOp(tokens, tailIdx, "te_kudasaru"), ...continuation.ops],
    terminal: attributive === undefined ? continuation.terminal : "attributive",
    ...(attributive !== undefined
      ? { terminalPayload: attributive }
      : continuation.terminalPayload === undefined ? {} : { terminalPayload: continuation.terminalPayload }),
    sfp: continuation.sfp,
    boundary: formulaicContinuationBoundary(tokens, continuation.ops, continuation.endExclusive),
    tailSurface: tokens.slice(tailIdx, continuation.endExclusive).map((token) => token.surface).join("")
  };
}

function matchNasaruHonorific(
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number,
  host: HonorificFormulaicHost,
  tailIdx: number,
  tail: RuntimeHaruToken,
  lookups: LookupTables
): HonorificFormulaicConstructionMatch | null {
  if (host.headKind !== "renyou_verb" || !isNonImperativeArmVerbToken(tail, "honorific_nasaru")) {
    return null;
  }
  const continuation = formulaicTailContinuationFrom(tokens, cursor, host, tailIdx, tailIdx + 1, lookups);
  if (continuation === null) {
    return null;
  }
  const attributive = formulaicAttributiveTerminal(tokens, index, continuation, host.headKind, lookups);
  if (attributive === null) {
    return null;
  }
  return {
    kind: "honorific_nasaru",
    consumed: continuation.endExclusive - index,
    headIdx: host.headIdx,
    headEnd: host.headEnd,
    head: host.head,
    headKind: host.headKind,
    stemTransform: "respect",
    ops: [...continuation.ops],
    terminal: attributive === undefined ? continuation.terminal : "attributive",
    ...(attributive !== undefined
      ? { terminalPayload: attributive }
      : continuation.terminalPayload === undefined ? {} : { terminalPayload: continuation.terminalPayload }),
    sfp: continuation.sfp,
    boundary: formulaicContinuationBoundary(tokens, continuation.ops, continuation.endExclusive),
    tailSurface: tokens.slice(tailIdx, continuation.endExclusive).map((token) => token.surface).join("")
  };
}

function formulaicTailContinuationFrom(
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  host: HonorificFormulaicHost,
  hostIdx: number,
  cursorStart: number,
  lookups: LookupTables,
  hostStemMood?: StemMood
): TailContinuation | null {
  const clauseReach = formulaicBoundNominalTailReach(
    tokens,
    host.headKind,
    cursorStart,
    activeProtoLayout()?.tailReachEvidenceInClause(cursorStart) ??
      { endExclusive: tokens.length, clampedBy: "clause_end" as const },
    lookups
  );
  const quoted = quoteStructuralRelationContainingContentToken(cursor, hostIdx, lookups);
  const contentReach = quoted === undefined
    ? clauseReach.endExclusive
    : Math.min(clauseReach.endExclusive, quoted.quote.contentSpan.endExclusive);
  const markerReach = Math.min(contentReach, quoteMarkerReachFrom(cursor, lookups, cursorStart, contentReach));
  const carrierReach = formulaicQuoteCarrierReach(tokens, markerReach, clauseReach.endExclusive, lookups);
  const consumedMarker = carrierReach > markerReach
    ? null
    : quoteConsumedMarkerReachAt(cursor, lookups, cursorStart, markerReach, clauseReach.endExclusive);
  const reach = consumedMarker?.endExclusive ?? carrierReach;
  const outgoingBoundary: ClauseBoundary | null = consumedMarker !== null
    ? consumedMarker.boundary
    : reach === clauseReach.endExclusive && clauseReach.clampedBy === "clause_end"
      ? clauseBoundaryAtSplit(cursor.fork(hostIdx, tokens.length, hostIdx), reach, lookups)
      : null;
  if (formulaicCoreClosesBeforeNominalHead(tokens, cursorStart, host.headKind, lookups)) {
    return { ops: [], sfp: null, terminal: null, endExclusive: cursorStart };
  }
  const purposeMarkerIdx = formulaicZeroNiPurposeMarkerIdx(
    tokens, cursor, cursorStart, Math.max(reach, cursorStart), lookups
  );
  const volitionalPurposeBoundary = purposeMarkerIdx === null
    ? formulaicVolitionalPurposeBoundary(tokens, hostIdx, cursorStart, Math.max(reach, cursorStart), lookups)
    : null;
  const effectiveReach = purposeMarkerIdx !== null
    ? purposeMarkerIdx + 1
    : volitionalPurposeBoundary !== null
      ? volitionalPurposeBoundary.tokenSpan.end + 1
      : Math.max(reach, cursorStart);
  const continuationOutgoingBoundary: ClauseBoundary | null = volitionalPurposeBoundary ?? outgoingBoundary;
  const continuation = parseTailContinuation({
    tokens,
    hostIdx,
    semanticHostIdx: host.headIdx,
    ...(purposeMarkerIdx === null ? {} : { allowZeroNiPurposeTerminal: true }),
    ...(continuationOutgoingBoundary === null || continuationOutgoingBoundary.kind === "terminal"
      ? {}
      : {
        allowElidedColloquialObligation: elidedColloquialObligationContextAtBoundary(continuationOutgoingBoundary),
        ...(() => {
          const hint = parseOutgoingBoundaryHint(continuationOutgoingBoundary);
          return hint === undefined ? {} : { outgoingBoundaryHint: hint };
        })()
      }),
    cursorStart,
    reachEndExclusive: effectiveReach,
    clauseContinuesAfterReach: clauseReach.clampedBy === "clause_pause" &&
      reach === clauseReach.endExclusive,
    stem: {
      kind: "verb",
      lemma: "",
      irregular: null,
      sourcePredicateShape: "verb",
      ...stemMoodOption(hostStemMood)
    },
    lookups
  });
  if (continuation === null) {
    return null;
  }
  if (
    continuation.sfp === null &&
    formulaicSpanConsumesBoundNominal(tokens, cursorStart, continuation.endExclusive) &&
    predicateQuoteCarrierSpanEnd(tokens, continuation.endExclusive, lookups) !== null
  ) {
    return null;
  }
  return withoutMidClauseTrailingConnective(continuation, tokens, effectiveReach);
}

function formulaicSpanConsumesBoundNominal(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): boolean {
  for (let idx = start; idx < endExclusive; idx += 1) {
    const token = tokens[idx];
    if (token !== undefined && classifyAttributiveHeadKind(token) === "scope_or_bound") {
      return true;
    }
  }
  return false;
}

function formulaicQuoteCarrierReach(
  tokens: readonly RuntimeHaruToken[],
  markerReach: number,
  clauseReachEnd: number,
  lookups: LookupTables
): number {
  const carrierEnd = predicateQuoteCarrierSpanEnd(tokens, markerReach, lookups);
  return carrierEnd === null ? markerReach : Math.min(clauseReachEnd, Math.max(markerReach, carrierEnd));
}

function formulaicVolitionalPurposeBoundary(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number,
  cursorStart: number,
  reachEndExclusive: number,
  lookups: LookupTables
): Extract<ClauseBoundary, { readonly tokenSpan: unknown }> | null {
  for (let end = cursorStart; end < reachEndExclusive; end += 1) {
    const boundary = volitionalPurposeToBoundaryEndingAt(tokens, hostIdx, end, reachEndExclusive - 1, lookups);
    if (boundary !== null && boundary.kind !== "terminal") {
      return boundary;
    }
  }
  return null;
}

function formulaicZeroNiPurposeMarkerIdx(
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  cursorStart: number,
  reachEndExclusive: number,
  lookups: LookupTables
): number | null {
  for (let idx = cursorStart; idx < reachEndExclusive; idx += 1) {
    const token = tokens[idx];
    if (token === undefined || (token.surface !== "よう" && token.surface !== "様")) {
      continue;
    }
    if (isZeroNiPurposeProjectionBoundaryEnd(cursor.fork(idx, reachEndExclusive, idx), idx, lookups)) {
      return idx;
    }
  }
  return null;
}

function formulaicBoundNominalTailReach(
  tokens: readonly RuntimeHaruToken[],
  hostKind: HonorificFormulaicHostKind,
  cursorStart: number,
  clauseReach: { readonly endExclusive: number; readonly clampedBy: string },
  lookups: LookupTables
): { readonly endExclusive: number; readonly clampedBy: string } {
  const ueDeEnd = formulaicUeDeProjectionEnd(tokens, cursorStart, clauseReach, lookups);
  if (ueDeEnd !== null) {
    return ueDeEnd === clauseReach.endExclusive ? clauseReach : { endExclusive: ueDeEnd, clampedBy: clauseReach.clampedBy };
  }
  if (hostKind !== "renyou_verb" || clauseReach.clampedBy !== "clause_end") {
    return clauseReach;
  }
  const headIdx = nextNonSpaceIndex(tokens, clauseReach.endExclusive, tokens.length);
  const head = headIdx === null ? undefined : tokens[headIdx];
  if (headIdx === null || head === undefined || classifyAttributiveHeadKind(head) !== "scope_or_bound") {
    return clauseReach;
  }
  const extended = activeProtoLayout()?.tailReachEvidenceInClause(headIdx);
  return extended === undefined || extended.endExclusive <= clauseReach.endExclusive
    ? clauseReach
    : extended;
}

function formulaicUeDeProjectionEnd(
  tokens: readonly RuntimeHaruToken[],
  cursorStart: number,
  clauseReach: { readonly endExclusive: number; readonly clampedBy: string },
  lookups: LookupTables
): number | null {
  const headIdx = formulaicCoreEndsAttributive(tokens, cursorStart)
    ? nextNonSpaceIndex(tokens, cursorStart, tokens.length)
    : clauseReach.clampedBy === "clause_end"
      ? nextNonSpaceIndex(tokens, clauseReach.endExclusive, tokens.length)
      : null;
  if (headIdx === null) {
    return null;
  }
  const match = matchPredicateProjectionConnectiveAt(tokens, headIdx, { requireEnd: false, lookups });
  if (match === null || match.connective !== "predicate_projection_ue_de") {
    return null;
  }
  const markerEnd = headIdx + match.consumed;
  const evidence = activeProtoLayout()?.tailReachEvidenceInClause(headIdx);
  return evidence !== undefined && markerEnd <= evidence.endExclusive ? markerEnd : null;
}

function formulaicCoreEndsAttributive(tokens: readonly RuntimeHaruToken[], cursorStart: number): boolean {
  const coreEndIdx = previousNonSpaceIndex(tokens, cursorStart);
  const coreEnd = coreEndIdx === null ? undefined : tokens[coreEndIdx];
  return coreEnd !== undefined && (coreEnd.pos & POS5A) === 連体形_;
}

function formulaicCoreClosesBeforeNominalHead(
  tokens: readonly RuntimeHaruToken[],
  cursorStart: number,
  hostKind: HonorificFormulaicHostKind,
  lookups: LookupTables
): boolean {
  if (!formulaicCoreEndsAttributive(tokens, cursorStart)) {
    return false;
  }
  const headIdx = nextNonSpaceIndex(tokens, cursorStart, tokens.length) ?? tokens.length;
  const head = tokens[headIdx];
  const pos0 = head?.pos === undefined ? 0 : head.pos & POS0;
  if (pos0 !== 名詞 && pos0 !== 代名詞) {
    return false;
  }
  if (hostKind === "renyou_verb" && head !== undefined && classifyAttributiveHeadKind(head) === "scope_or_bound") {
    return false;
  }
  if (formulaicUeDeProjectionEnd(tokens, cursorStart, { endExclusive: tokens.length, clampedBy: "clause_end" }, lookups) !== null) {
    return false;
  }
  return true;
}

function withoutMidClauseTrailingConnective(
  continuation: TailContinuation,
  tokens: readonly RuntimeHaruToken[],
  reachEndExclusive: number
): TailContinuation {
  const last = continuation.ops.at(-1);
  if (last === undefined || last.kind !== "connective") {
    return continuation;
  }
  const residueIdx = nextNonSpaceIndex(tokens, continuation.endExclusive, reachEndExclusive);
  if (residueIdx === null || residueIdx >= reachEndExclusive) {
    return continuation;
  }
  const connectiveStart = last.source.tokenIndices[0];
  if (connectiveStart === undefined) {
    return continuation;
  }
  return {
    ...continuation,
    ops: continuation.ops.slice(0, -1),
    endExclusive: connectiveStart
  };
}

function quoteMarkerReachFrom(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  cursorStart: number,
  limit: number
): number {
  let reach = limit;
  for (const relation of quoteStructuralRelationIndex(cursor, lookups).winners()) {
    const markerIdx = relation.quote.markerIdx;
    if (quoteRelationOwnsMarkerRealization(relation) && markerIdx >= cursorStart && markerIdx < reach) {
      reach = markerIdx;
    }
  }
  return reach;
}

function quoteConsumedMarkerReachAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  cursorStart: number,
  markerIdx: number,
  clauseReachEnd: number
): { readonly endExclusive: number; readonly boundary: ClauseBoundary } | null {
  const tokens = cursor.tokens;
  for (const relation of quoteStructuralRelationIndex(cursor, lookups).winners()) {
    const options = { lowerBoundInclusive: cursorStart };
    const span = quoteConsumedMarkerSpanFromRelation(tokens, relation, lookups, options);
    const boundary = quoteClauseBoundaryFromRelation(tokens, relation, lookups, options);
    if (
      span === null ||
      boundary === null ||
      boundary.kind === "terminal" ||
      span.start !== markerIdx ||
      span.endExclusive > clauseReachEnd ||
      quoteStructuralRelationHostIsAttributiveIu(tokens, relation) ||
      quoteMarkerOwnedByYouNiDirectiveProjection(tokens, cursorStart, markerIdx, span.endExclusive, lookups)
    ) {
      continue;
    }
    return { endExclusive: span.endExclusive, boundary };
  }
  return null;
}

function formulaicContinuationBoundary(
  tokens: readonly RuntimeHaruToken[],
  ops: readonly AuxOpNode[],
  endExclusive: number
): ClauseBoundary {
  if (ops.at(-1)?.kind !== "connective") {
    return copulaChainOutgoingBoundary(ops, null);
  }
  const contentEndIdx = endExclusive - 1;
  const closesUtterance = activeProtoLayout()?.terminalPunctuationRunAfter(contentEndIdx) !== undefined ||
    nextNonSpaceIndex(tokens, endExclusive, tokens.length) === null;
  return copulaChainOutgoingBoundary(ops, closesUtterance ? null : "connective");
}

function matchItadakuBenefactive(
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number,
  host: HonorificFormulaicHost,
  tailIdx: number,
  tail: RuntimeHaruToken,
  lookups: LookupTables
): HonorificFormulaicConstructionMatch | null {
  const arm = formulaicBenefactiveRequestArm(tail);
  if (arm === null) {
    return null;
  }
  const aspect = arm.aspect;
  const continuation = formulaicTailContinuationFrom(tokens, cursor, host, tailIdx, tailIdx + 1, lookups);
  if (continuation === null) {
    return null;
  }
  const wishLayerOps: AuxOpNode[] = arm.wishLayer && continuation.ops[0]?.kind !== "desire"
    ? [createDesireOp({ source: opSourceFromIndices(tokens, [tailIdx]) })]
    : [];
  const ops: AuxOpNode[] = [benefactiveAspectOp(tokens, tailIdx, aspect), ...wishLayerOps, ...continuation.ops];
  const attributive = formulaicAttributiveTerminal(tokens, index, continuation, host.headKind, lookups);
  if (attributive === null) {
    return null;
  }
  const sfp = formulaicRequestQuestionSfp(
    continuation.sfp,
    aspect === "te_itadakeru" && !formulaicOpsHavePast(continuation.ops)
  );
  return {
    kind: arm.kind,
    consumed: continuation.endExclusive - index,
    headIdx: host.headIdx,
    headEnd: host.headEnd,
    head: host.head,
    headKind: host.headKind,
    stemTransform: "none",
    ops,
    terminal: attributive === undefined ? continuation.terminal : "attributive",
    ...(attributive !== undefined
      ? { terminalPayload: attributive }
      : continuation.terminalPayload === undefined ? {} : { terminalPayload: continuation.terminalPayload }),
    sfp,
    boundary: formulaicContinuationBoundary(tokens, continuation.ops, continuation.endExclusive),
    tailSurface: tokens.slice(tailIdx, continuation.endExclusive).map((token) => token.surface).join("")
  };
}

function formulaicAttributiveTerminal(
  tokens: readonly RuntimeHaruToken[],
  spanStartIdx: number,
  continuation: { readonly endExclusive: number; readonly sfp: SfpNode | null },
  hostKind: HonorificFormulaicHostKind,
  lookups: LookupTables
): AttributiveBoundaryPayload | null | undefined {
  const endExclusive = continuation.endExclusive;
  if (!formulaicSpanClosesAdnominally(tokens, endExclusive, continuation.sfp)) {
    return undefined;
  }
  const headIdx = nextNonSpaceIndex(tokens, endExclusive, tokens.length) ?? tokens.length;
  const head = tokens[headIdx];
  if (head !== undefined && classifyAttributiveHeadKind(head) === "scope_or_bound") {
    if (hostKind !== "renyou_verb") {
      return null;
    }
    if (isExternalTokoroScopeChunk(tokens, headIdx, lookups)) {
      return null;
    }
  }
  const payload = classifyStructuralAttributiveBoundaryPayload(
    tokens,
    spanStartIdx,
    endExclusive - 1,
    endExclusive,
    lookups
  );
  if (payload !== null) {
    return payload;
  }
  return formulaicAttributiveHeadFollows(tokens, endExclusive, continuation.sfp) ? null : undefined;
}

function formulaicAttributiveHeadFollows(
  tokens: readonly RuntimeHaruToken[],
  tailEndExclusive: number,
  sfp: SfpNode | null
): boolean {
  if (!formulaicSpanClosesAdnominally(tokens, tailEndExclusive, sfp)) {
    return false;
  }
  const headIdx = nextNonSpaceIndex(tokens, tailEndExclusive, tokens.length) ?? tokens.length;
  const head = tokens[headIdx];
  const pos0 = head?.pos === undefined ? 0 : head.pos & POS0;
  return pos0 === 名詞 || pos0 === 代名詞;
}

function formulaicRequestQuestionSfp(sfp: SfpNode | null, requestGrounds: boolean): SfpNode | null {
  if (sfp === null || !requestGrounds || sfp.questionRole !== undefined) {
    return sfp;
  }
  return isKaFamilyQuestionSfpEffect(sfp.effect) || sfp.effect === "kana"
    ? { ...sfp, questionRole: "request" }
    : sfp;
}

function matchNaruHonorific(
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number,
  host: HonorificFormulaicHost,
  tailIdx: number,
  tail: RuntimeHaruToken,
  lookups: LookupTables
): HonorificFormulaicConstructionMatch | null {
  if (tail.surface !== "に" || (tail.pos & POS0) !== 助詞) {
    return null;
  }
  const naruIdx = nextNonSpaceIndex(tokens, tailIdx + 1, tokens.length) ?? tokens.length;
  const naru = tokens[naruIdx];
  if (!isNaruAuxiliaryToken(naru)) {
    return null;
  }
  const doubleHonorificIdx = nextNonSpaceIndex(tokens, naruIdx + 1, tokens.length) ?? tokens.length;
  const doubleHonorific = tokens[doubleHonorificIdx];
  const continuationStart = doubleHonorific !== undefined && isRareruAuxiliaryToken(doubleHonorific)
    ? doubleHonorificIdx + 1
    : naruIdx + 1;
  const continuationHostIdx = continuationStart === naruIdx + 1 ? naruIdx : doubleHonorificIdx;
  const continuation = formulaicTailContinuationFrom(tokens, cursor, host, continuationHostIdx, continuationStart, lookups);
  if (continuation === null) {
    return null;
  }
  const attributive = formulaicAttributiveTerminal(tokens, index, continuation, host.headKind, lookups);
  if (attributive === null) {
    return null;
  }
  const ops: AuxOpNode[] = [...continuation.ops];
  return {
    kind: "honorific_naru",
    consumed: continuation.endExclusive - index,
    headIdx: host.headIdx,
    headEnd: host.headEnd,
    head: host.head,
    headKind: host.headKind,
    stemTransform: "respect",
    ops,
    terminal: attributive === undefined ? continuation.terminal : "attributive",
    ...(attributive !== undefined
      ? { terminalPayload: attributive }
      : continuation.terminalPayload === undefined ? {} : { terminalPayload: continuation.terminalPayload }),
    sfp: continuation.sfp,
    boundary: formulaicContinuationBoundary(tokens, continuation.ops, continuation.endExclusive),
    tailSurface: tokens.slice(tailIdx, continuation.endExclusive).map((token) => token.surface).join("")
  };
}

function matchHumbleLightVerb(
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number,
  host: HonorificFormulaicHost,
  tailIdx: number,
  tail: RuntimeHaruToken,
  lookups: LookupTables
): HonorificFormulaicConstructionMatch | null {
  const humbleArm = formulaicHumbleLightVerbArm(tail);
  if (humbleArm === null) {
    return null;
  }
  const ops: AuxOpNode[] = [];
  let endExclusive = tailIdx + 1;
  const voiceIdx = nextNonSpaceIndex(tokens, endExclusive, tokens.length) ?? tokens.length;
  const voiceToken = tokens[voiceIdx];
  const voicePreserved = voiceToken !== undefined &&
    isRareruAuxiliaryToken(voiceToken) &&
    (host.headKind === "sahen_noun" || host.headKind === "renyou_verb");
  if (voicePreserved) {
    const lightVerbConj4 = tail.pos & POS4;
    const potentialOpen = !is五段(lightVerbConj4) && lightVerbConj4 !== サ行変格;
    const humbleMarked = humbleArm.stemTransform === "humble_light_verb";
    const voiceCandidates: VoiceReadingCandidate[] = ["passive"];
    if (potentialOpen) {
      voiceCandidates.push("potential");
    }
    if (!humbleMarked) {
      voiceCandidates.push("honorific");
    }
    ops.push(buildVoiceOp(
      opSourceFromIndices(tokens, [voiceIdx]),
      "passive",
      voiceCandidates,
      ...(humbleMarked ? [] : [{ honorificFormulaicConstruction: true as const }])
    ));
    endExclusive = voiceIdx + 1;
  } else if (voiceToken !== undefined && isRareruAuxiliaryToken(voiceToken)) {
    return null;
  }
  const supportStemMood = voicePreserved ? undefined : inflectionStemMood(tail);
  let sfp: SfpNode | null = null;
  let terminal: AuxLayerNode["terminal"] = null;
  let terminalPayload: AuxLayerNode["terminalPayload"] | undefined;
  let boundary: ClauseBoundary = { kind: "terminal" };
  const teIdx = nextNonSpaceIndex(tokens, endExclusive, tokens.length) ?? tokens.length;
  const teOpensContinuation = isTeConnectiveToken(tokens[teIdx]) &&
    teDeContinuationRelationAt(tokens, teIdx, {
      requirement: "layout_nonspace_tail",
      consumers: ["tail_boundary_readiness"],
      lookups
    }) !== null;
  let closedByConnective: boolean;
  const teContinuation = teOpensContinuation
    ? formulaicTailContinuationFrom(tokens, cursor, host, voicePreserved ? endExclusive - 1 : tailIdx, endExclusive, lookups, supportStemMood)
    : null;
  const teHandoffFailed = teOpensContinuation && (
    teContinuation === null ||
    teContinuation.endExclusive <= teIdx ||
    (!formulaicContinuationClosedByQuoteBoundary(teContinuation.ops) &&
      formulaicResidueContinuesPredicate(tokens, teContinuation.endExclusive)) ||
    (teContinuation.sfp === null &&
      predicateQuoteCarrierSpanEnd(tokens, teContinuation.endExclusive, lookups) !== null)
  );
  if (isTeConnectiveToken(tokens[teIdx]) && (!teOpensContinuation || teHandoffFailed)) {
    ops.push(teFormConnectiveOp(tokens, teIdx));
    endExclusive = teIdx + 1;
    closedByConnective = true;
  } else {
    const continuationHostIdx = voicePreserved ? endExclusive - 1 : tailIdx;
    const continuation = teContinuation ??
      formulaicTailContinuationFrom(tokens, cursor, host, continuationHostIdx, endExclusive, lookups, supportStemMood);
    if (continuation === null) {
      return null;
    }
    ops.push(...continuation.ops);
    endExclusive = continuation.endExclusive;
    sfp = humbleTerminalSofteningSfp(continuation.sfp, continuation.ops, host);
    terminal = continuation.terminal;
    terminalPayload = continuation.terminalPayload;
    boundary = formulaicContinuationBoundary(tokens, continuation.ops, continuation.endExclusive);
    closedByConnective = continuation.ops.at(-1)?.kind === "connective";
    const attributive = formulaicAttributiveTerminal(
      tokens,
      index,
      { ...continuation, sfp, endExclusive },
      host.headKind,
      lookups
    );
    if (attributive === null) {
      return null;
    }
    if (attributive !== undefined) {
      terminal = "attributive";
      terminalPayload = attributive;
    }
    if (terminal === "attributive") {
      for (let idx = 0; idx < ops.length; idx += 1) {
        const op = ops[idx];
        if (op?.kind === "voice" && op.honorificFormulaicConstruction === true) {
          ops[idx] = buildVoiceOp(op.source, op.voice, op.candidates);
        }
      }
    }
  }
  if (
    !closedByConnective &&
    (voicePreserved || (host.headKind === "sahen_noun" && (tail.pos & POS5A) === 連用形_)) &&
    formulaicResidueContinuesPredicate(tokens, endExclusive)
  ) {
    return null;
  }
  return {
    kind: "humble_light_verb",
    consumed: endExclusive - index,
    headIdx: host.headIdx,
    headEnd: host.headEnd,
    head: host.head,
    headKind: host.headKind,
    stemTransform: host.causative === null ? humbleArm.stemTransform ?? "none" : "none",
    ...stemMoodOption(supportStemMood),
    ops,
    terminal,
    ...(terminalPayload === undefined ? {} : { terminalPayload }),
    sfp,
    boundary,
    tailSurface: tokens.slice(tailIdx, endExclusive).map((token) => token.surface).join("")
  };
}

function humbleTerminalSofteningSfp(
  sfp: SfpNode | null,
  ops: readonly AuxOpNode[],
  host: HonorificFormulaicHost
): SfpNode | null {
  if (sfp === null || sfp.effect !== "ne") {
    return sfp;
  }
  if (isPrecollapsedHonorificSahenHost(host.head)) {
    return { ...sfp, effect: null };
  }
  return ops.some((op) => op.kind === "polite") && ops.every((op) => op.kind === "polite")
    ? { ...sfp, effect: null }
    : sfp;
}

function formulaicOpsHavePast(ops: readonly AuxOpNode[]): boolean {
  return ops.some((op) =>
    (op.kind === "tense" && op.tense === "past") ||
    (op.kind === "negation" && op.chainPast)
  );
}

function quoteMarkerOwnedByYouNiDirectiveProjection(
  tokens: readonly RuntimeHaruToken[],
  cursorStart: number,
  markerIdx: number,
  markerEndExclusive: number,
  lookups: LookupTables
): boolean {
  for (let youIdx = cursorStart; youIdx < markerIdx; youIdx += 1) {
    const span = youNiQuoteDirectiveProjectionSpanAt(tokens, youIdx, lookups);
    if (
      span !== null &&
      span.markerEndExclusive === markerEndExclusive &&
      youNiQuoteDirectiveFollowerAt(tokens, span.markerEndExclusive, lookups)
    ) {
      return true;
    }
  }
  return false;
}

function formulaicContinuationClosedByQuoteBoundary(ops: readonly AuxOpNode[]): boolean {
  const last = ops.at(-1);
  return last !== undefined && last.kind === "connective" && last.quoteBoundary !== undefined;
}

function formulaicResidueContinuesPredicate(
  tokens: readonly RuntimeHaruToken[],
  endExclusive: number
): boolean {
  const idx = nextNonSpaceIndex(tokens, endExclusive, tokens.length) ?? tokens.length;
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  return pos0in(token.pos, INFLECTABLE_AUX_BITS) || isVerbalDerivationalSuffixToken(token);
}

function stemMoodOption(stemMood: StemMood | undefined): { readonly stemMood?: StemMood } {
  return stemMood === undefined ? {} : { stemMood };
}

function formulaicHumbleLightVerbArm(token: RuntimeHaruToken): HonorificFormulaicArmRow | null {
  if ((token.pos & POS0) !== 動詞) {
    return null;
  }
  for (const arm of HONORIFIC_FORMULAIC_HUMBLE_ARM_IDS) {
    const row = honorificFormulaicArmRow(arm);
    if (tokenMatchesArmForms(token, row.forms)) {
      return row;
    }
  }
  return null;
}

function collectDeshitaPast(
  tokens: readonly RuntimeHaruToken[],
  start: number
): { readonly op: TenseOp; readonly endExclusive: number } | null {
  const desuIdx = nextNonSpaceIndex(tokens, start, tokens.length) ?? tokens.length;
  const desu = tokens[desuIdx];
  if (!isDesuAuxToken(desu)) {
    return null;
  }
  const pastIdx = nextNonSpaceIndex(tokens, desuIdx + 1, tokens.length) ?? tokens.length;
  if (!isPastAuxToken(tokens[pastIdx])) {
    return null;
  }
  return {
    op: createTenseOp({

      source: opSourceFromRange(tokens, desuIdx, pastIdx),
      tense: "past"
    }),
    endExclusive: pastIdx + 1
  };
}

function collectFormulaicApologySfp(
  tokens: readonly RuntimeHaruToken[],
  start: number
): { readonly sfp: SfpNode | null; readonly endExclusive: number } {
  const sfpIdx = nextNonSpaceIndex(tokens, start, tokens.length) ?? tokens.length;
  const token = tokens[sfpIdx];
  if (token !== undefined && token.surface === "か" && (token.pos & POS01) === 助詞_終助詞) {
    return {
      sfp: {
        effect: "ka",
        surface: token.surface,
        consumed: 1,
        repeatCount: 1,
        source: opSourceFromIndices(tokens, [sfpIdx])
      },
      endExclusive: sfpIdx + 1
    };
  }
  if (token !== undefined && token.surface === "な" && (token.pos & POS01) === 助詞_終助詞) {
    return {
      sfp: {
        effect: "na_excl",
        surface: token.surface,
        consumed: 1,
        repeatCount: 1,
        source: opSourceFromIndices(tokens, [sfpIdx])
      },
      endExclusive: sfpIdx + 1
    };
  }
  if (token !== undefined && token.surface === "ね" && (token.pos & POS01) === 助詞_終助詞) {
    return {
      sfp: {
        effect: null,
        surface: token.surface,
        consumed: 1,
        repeatCount: 1,
        source: opSourceFromIndices(tokens, [sfpIdx])
      },
      endExclusive: sfpIdx + 1
    };
  }
  if (
    token !== undefined &&
    isTerminalYoSfpSurface(token)
  ) {
    return {
      sfp: {
        effect: null,
        surface: token.surface,
        consumed: 1,
        repeatCount: 1,
        source: opSourceFromIndices(tokens, [sfpIdx])
      },
      endExclusive: sfpIdx + 1
    };
  }
  return { sfp: null, endExclusive: start };
}

function collectFormulaicTailSfp(
  tokens: readonly RuntimeHaruToken[],
  start: number
): { readonly sfp: SfpNode | null; readonly endExclusive: number } {
  const sfpIdx = nextNonSpaceIndex(tokens, start, tokens.length) ?? tokens.length;
  const token = tokens[sfpIdx];
  if (token !== undefined && token.surface === "な" && (token.pos & POS01) === 助詞_終助詞) {
    return {
      sfp: {
        effect: "na_excl",
        surface: token.surface,
        consumed: 1,
        repeatCount: 1,
        source: opSourceFromIndices(tokens, [sfpIdx])
      },
      endExclusive: sfpIdx + 1
    };
  }
  if (token !== undefined && token.surface === "ね" && (token.pos & POS01) === 助詞_終助詞) {
    return {
      sfp: {
        effect: null,
        surface: token.surface,
        consumed: 1,
        repeatCount: 1,
        source: opSourceFromIndices(tokens, [sfpIdx])
      },
      endExclusive: sfpIdx + 1
    };
  }
  if (
    token !== undefined &&
    isTerminalYoSfpSurface(token)
  ) {
    return {
      sfp: {
        effect: null,
        surface: token.surface,
        consumed: 1,
        repeatCount: 1,
        source: opSourceFromIndices(tokens, [sfpIdx])
      },
      endExclusive: sfpIdx + 1
    };
  }
  return { sfp: null, endExclusive: start };
}

interface FormulaicAdversativeConnectiveMatch {
  readonly op: ConnectiveOp;
  readonly boundary: ClauseBoundary;
  readonly endExclusive: number;
}

const FORMULAIC_ADVERSATIVE_SURFACES = new Set(["が", "けど", "けども", "けれど", "けれども"]);

function collectFormulaicAdversativeConnective(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  options: { readonly allowCopulaAdversative: boolean }
): FormulaicAdversativeConnectiveMatch | null {
  const markerIdx = nextNonSpaceIndex(tokens, start, tokens.length) ?? tokens.length;
  const marker = tokens[markerIdx];
  if (isFormulaicAdversativeMarker(marker)) {
    const endIdx = markerIdx + connectiveCompositeTokenCountAt(tokens, markerIdx, tokens.length) - 1;
    return formulaicAdversativeConnectiveMatch(tokens, markerIdx, endIdx, "接続助詞");
  }
  if (!options.allowCopulaAdversative || !isFormulaicCopulaToken(marker)) {
    return null;
  }
  const afterCopulaIdx = nextNonSpaceIndex(tokens, markerIdx + 1, tokens.length) ?? tokens.length;
  const afterCopula = tokens[afterCopulaIdx];
  if (!isFormulaicAdversativeMarker(afterCopula)) {
    return null;
  }
  return formulaicAdversativeConnectiveMatch(tokens, markerIdx, afterCopulaIdx, "合成接続");
}

function formulaicSpanClosesAdnominally(
  tokens: readonly RuntimeHaruToken[],
  tailEndExclusive: number,
  sfp: SfpNode | null
): boolean {
  if (sfp !== null) {
    return false;
  }
  const finalIdx = previousNonSpaceIndex(tokens, tailEndExclusive);
  const finalToken = tokens[finalIdx ?? -1];
  return finalToken !== undefined && (finalToken.pos & POS5A) === 連体形_;
}

function formulaicAdversativeConnectiveMatch(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  endIdx: number,
  kind: "接続助詞" | "合成接続"
): FormulaicAdversativeConnectiveMatch | null {
  if (!formulaicApologyCanClose(tokens, endIdx + 1, { allowSoftContinuation: true })) {
    return null;
  }
  const surface = tokens.slice(startIdx, endIdx + 1).map((token) => token.surface).join("");
  const connectiveSurface = kind === "接続助詞" ? surface : (tokens[endIdx]?.surface ?? surface);
  return {
    op: createConnectiveOp({

      connective: "adversative",
      surface: connectiveSurface,
      source: opSourceFromRange(tokens, startIdx, endIdx)
    }),
    boundary: {
      kind,
      connectiveKind: "adversative",
      surface,
      tokenIdx: endIdx,
      tokenSpan: { start: startIdx, end: endIdx }
    },
    endExclusive: endIdx + 1
  };
}

function formulaicApologyCanClose(
  tokens: readonly RuntimeHaruToken[],
  afterIdx: number,
  options: { readonly allowSoftContinuation?: boolean } = {}
): boolean {
  const nextIdx = nextNonSpaceIndex(tokens, afterIdx, tokens.length) ?? tokens.length;
  const next = tokens[nextIdx];
  if (next === undefined ||
    isHardTerminalPunctuationToken(next) ||
    isTrailingPunctuationToken(next) ||
    isWeakPunctuationToken(next)) {
    return true;
  }
  return options.allowSoftContinuation === true &&
    formulaicApologySoftContinuationStartsAt(tokens, nextIdx);
}

function formulaicApologySoftContinuationStartsAt(
  tokens: readonly RuntimeHaruToken[],
  nextIdx: number
): boolean {
  const token = tokens[nextIdx];
  if (token === undefined || isFormulaicApologyBlockedSoftContinuationToken(token)) {
    return false;
  }
  const pos0 = token.pos & POS0;
  return pos0 === 副詞 ||
    pos0 === 動詞 ||
    pos0 === 形容詞0 ||
    pos0 === 形状詞 ||
    pos0 === 名詞 ||
    pos0 === 代名詞 ||
    pos0 === 感動詞 ||
    pos0 === 接続詞 ||
    pos0 === 接頭辞 ||
    pos0 === 連体詞;
}

function isFormulaicApologyBlockedSoftContinuationToken(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.surface;
  return form === "なさる" ||
    form === "くださる" ||
    token.surface === "なさい" ||
    token.surface === "ください" ||
    token.surface === "下さい";
}

function isFormulaicAdversativeMarker(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    (token.pos & POS0) === 助詞 &&
    FORMULAIC_ADVERSATIVE_SURFACES.has(token.surface);
}

function isFormulaicCopulaToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    (
      (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ) ||
      (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_デス)
    );
}

function formulaicApologyHasNonApologyLeftEvidence(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, index);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  if (prev === undefined) {
    return false;
  }
  if (prev.surface === "じゃ" || prev.surface === "ぢゃ") {
    return true;
  }
  if (prev.surface === "で") {
    const beforeIdx = previousNonSpaceIndex(tokens, prevIdx);
    return tokens[beforeIdx ?? -1]?.surface === "だけ";
  }
  if (prev.surface === "が") {
    return true;
  }
  if (prev.surface === "は") {
    const beforeIdx = previousNonSpaceIndex(tokens, prevIdx);
    const before = tokens[beforeIdx ?? -1];
    if (before === undefined) {
      return false;
    }
    if (before.surface === "に") {
      return false;
    }
    if (isAdverbCapableNominal(before)) {
      return false;
    }
    return true;
  }
  return false;
}

function isSumuApologyStemToken(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 動詞) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return form === "すむ" || form === "済む";
}

function isGomenApologyToken(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.surface;
  return form === "ごめん" || form === "御免" || token.surface === "ごめん" || token.surface === "御免";
}

function isHiraganaGomenApologyToken(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.surface;
  return form === "ごめん" || token.surface === "ごめん";
}

function isNuNegativeAuxToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヌ) &&
    ((token.dictionaryForm || token.surface) === "ぬ" || token.surface === "ん");
}

function isNaiNegativeAuxToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) &&
    (token.dictionaryForm || token.surface) === "ない";
}

function isDesuAuxToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_デス) &&
    (token.dictionaryForm || token.surface) === "です";
}

function benefactiveAspectForItadakuToken(token: RuntimeHaruToken): BenefactiveAspectOp["aspect"] | null {
  if (tokenMatchesArmForms(token, honorificFormulaicArmForms("benefactive_itadakeru"))) {
    return "te_itadakeru";
  }
  if (tokenMatchesArmForms(token, honorificFormulaicArmForms("benefactive_itadaku"))) {
    return "te_itadaku";
  }
  return null;
}

function formulaicBenefactiveRequestArm(token: RuntimeHaruToken): {
  readonly aspect: BenefactiveAspectOp["aspect"];
  readonly kind: HonorificFormulaicKind;
  readonly wishLayer: boolean;
} | null {
  const itadaku = benefactiveAspectForItadakuToken(token);
  if (itadaku !== null) {
    return {
      aspect: itadaku,
      kind: itadaku === "te_itadakeru" ? "benefactive_itadakeru" : "benefactive_itadaku",
      wishLayer: false
    };
  }
  if (tokenMatchesArmForms(token, honorificFormulaicArmForms("request_negaeru"))) {
    return { aspect: "te_itadakeru", kind: "request_negau", wishLayer: false };
  }
  if (tokenMatchesArmForms(token, honorificFormulaicArmForms("request_negau"))) {
    return { aspect: "te_itadaku", kind: "request_negau", wishLayer: true };
  }
  return null;
}

function benefactiveAspectOp(
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  aspect: BenefactiveAspectOp["aspect"]
): BenefactiveAspectOp {
  return buildParserBenefactiveAspectOp(opSourceFromIndices(tokens, [tokenIdx]), aspect);
}

function teFormConnectiveOp(tokens: readonly RuntimeHaruToken[], teIdx: number): ConnectiveOp {
  return createConnectiveOp({

    connective: "te_form",
    surface: tokens[teIdx]?.surface ?? "て",
    source: opSourceFromIndices(tokens, [teIdx])
  });
}

function tokenMatchesArmForms(token: RuntimeHaruToken, forms: ReadonlySet<string>): boolean {
  return forms.has(token.dictionaryForm || token.surface) || forms.has(token.surface);
}

function isBareKudasaiRequestToken(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS5A)) === (動詞 | 命令形_) &&
    tokenMatchesArmForms(token, honorificFormulaicArmForms("benefactive_kudasaru"));
}

function isKudasaiRenyouRequestToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined) {
    return false;
  }
  return (token.pos & (POS0 | POS5A)) === (動詞 | 連用形_) &&
    tokenMatchesArmForms(token, honorificFormulaicArmForms("benefactive_kudasaru"));
}

function isNasaiImperativeToken(token: RuntimeHaruToken): boolean {
  return isHonorificNasaruImperativeToken(token);
}

function isNonImperativeArmVerbToken(
  token: RuntimeHaruToken,
  arm: "benefactive_kudasaru" | "honorific_nasaru"
): boolean {
  return isVerbPredicateToken(token) &&
    !isImperativeInflection(token.pos) &&
    tokenMatchesArmForms(token, honorificFormulaicArmForms(arm));
}

function isNasaiRenyouToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined) {
    return false;
  }
  return (token.pos & (POS0 | POS5A)) === (動詞 | 連用形_) &&
    tokenMatchesArmForms(token, honorificFormulaicArmForms("honorific_nasaru"));
}

function isPoliteImperativeMaseToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    (token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_マス | 命令形_) &&
    token.surface === "ませ";
}

function isSuruLightVerbToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 動詞 &&
    tokenMatchesArmForms(token, honorificFormulaicArmForms("humble_suru"));
}

function isNaruAuxiliaryToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  return tokenMatchesArmForms(token, honorificFormulaicArmForms("honorific_naru")) &&
    (token.pos & POS1) === 非自立可能;
}

function isPoliteAuxToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined && (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_マス);
}

function isPastAuxToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined && (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_タ);
}

function sahenPredicateLemmaFromNounKorean(korean: string): string {
  const normalized = korean.trim();
  if (normalized.endsWith("하다")) {
    return normalized;
  }
  return `${normalized}하다`;
}

type HonorificRequestHeadKind = "sahen_noun" | "renyou_verb" | "nominalized_renyou_verb";

function formulaicStemFromHeadMetadata(
  result: ContentHeadHydrationMetadata,
  head: RuntimeHaruToken,
  headKind: HonorificFormulaicHostKind,
  tokens: readonly RuntimeHaruToken[],
  headIdx: number,
  transform: HonorificFormulaicStemTransform,
  lookups: LookupTables
): StemNode | null {
  const source = opSourceFromIndices(tokens, [headIdx]);
  const candidates = formulaicStemCandidatesFromHeadMetadata(result, head, headKind, transform, lookups);
  if (candidates.length === 0) {
    return null;
  }
  return {
    kind: "candidateSet",
    candidates,
    source,
    conjugationAnchor: 0,
    semanticAnchors: [0],
    sourcePredicateShape: headKind === "sahen_noun" ? "sahen_verbalization" : "verb",
    ...(headKind === "sahen_noun" ? { shortNegationPolicy: "sahen_split" as const } : {})
  };
}

function formulaicStemCandidatesFromHeadMetadata(
  result: ContentHeadHydrationMetadata,
  head: RuntimeHaruToken,
  headKind: HonorificFormulaicHostKind,
  transform: HonorificFormulaicStemTransform,
  lookups: LookupTables
): readonly StemCandidate[] {
  if (headKind === "lexical_respect_verb") {
    return lexicalRespectHostStemCandidates(head);
  }
  const requestHeadKind: HonorificRequestHeadKind = headKind;
  const candidates = honorificRequestQuoteStemCandidatesFromHeadMetadata(result, head, requestHeadKind)
    .map((candidate) => transformFormulaicStemCandidate(candidate, headKind, transform, lookups))
    .filter((candidate): candidate is StemCandidate => candidate !== null);
  assertUniqueStemCandidateIdentities(candidates);
  return candidates;
}

function lexicalRespectHostStemCandidates(head: RuntimeHaruToken): readonly StemCandidate[] {
  const form = head.dictionaryForm || head.surface;
  if (form !== "ご覧") {
    return [];
  }
  return [{
    provenance: { kind: "derivation", derivationId: "formulaic:lexical_respect:goran" },
    lemma: "보시다",
    irregular: null,
    conj: verbConjTypeForToken(head),
    koreanPos: 동사,
    projectionOrdinal: 0,
    derivation: { id: "formulaic:lexical_respect:goran" }
  }];
}

function transformFormulaicStemCandidate(
  candidate: StemCandidate,
  headKind: HonorificFormulaicHostKind,
  transform: HonorificFormulaicStemTransform,
  lookups: LookupTables
): StemCandidate | null {
  if (transform === "none") {
    return candidate;
  }
  if (candidate.koreanPos !== 동사 || !candidate.lemma.endsWith("다")) {
    return null;
  }
  if (transform === "respect") {
    const lemma = respectKoreanPredicateLemma(
      candidate.lemma,
      candidate.irregular,
      lookups.KOREAN_HONORIFIC_PREDICATE_LEMMAS,
      lookups.KOREAN_REALIZED_HONORIFIC_PREDICATE_LEMMAS
    );
    return lemma === null ? null : { ...candidate, lemma, irregular: null };
  }
  if (headKind === "sahen_noun") {
    const noun = candidate.lemma.endsWith("하다")
      ? candidate.lemma.slice(0, -"하다".length)
      : null;
    if (noun !== null && lookups.HUMBLE_DRIDA_SAHEN_NOUNS.has(noun)) {
      return { ...candidate, lemma: `${noun}드리다`, irregular: null };
    }
    return candidate;
  }
  if (headKind === "renyou_verb" || headKind === "nominalized_renyou_verb") {
    const lemma = humbleLightVerbPredicateLemma(candidate.lemma, candidate.irregular);
    return lemma === null ? null : { ...candidate, lemma, irregular: null };
  }
  return candidate;
}

function humbleLightVerbPredicateLemma(
  lemma: string,
  irregular: IrregularType | null
): string | null {
  if (!lemma.endsWith("다")) {
    return null;
  }
  if (lemma.endsWith("주다")) {
    return `${lemma.slice(0, -"주다".length)}드리다`;
  }
  return `${conjugate(lemma, irregular, "아/어")} 드리다`;
}

function honorificRequestQuoteStemFromHeadMetadata(
  result: ContentHeadHydrationMetadata,
  head: RuntimeHaruToken,
  headKind: HonorificRequestHeadKind,
  tokens: readonly RuntimeHaruToken[],
  headIdx: number
): StemNode | null {
  const source = opSourceFromIndices(tokens, [headIdx]);
  const candidates = honorificRequestQuoteStemCandidatesFromHeadMetadata(result, head, headKind);
  if (candidates.length > 0) {
    assertUniqueStemCandidateIdentities(candidates);
    return {
      kind: "candidateSet",
      candidates,
      source,
      conjugationAnchor: 0,
      semanticAnchors: [0],
      sourcePredicateShape: headKind === "sahen_noun" ? "sahen_verbalization" : "verb",
      ...(headKind === "sahen_noun" ? { shortNegationPolicy: "sahen_split" as const } : {})
    };
  }

  return null;
}

function honorificRequestQuoteStemCandidatesFromHeadMetadata(
  result: ContentHeadHydrationMetadata,
  head: RuntimeHaruToken,
  headKind: HonorificRequestHeadKind
): readonly StemCandidate[] {
  const candidates = candidateSetCandidates(commitmentLaneCandidateSet(result.sourceCandidates))
    .map(candidate => honorificRequestQuoteStemCandidateFromContentCandidate(candidate, head, headKind))
    .filter((candidate): candidate is StemCandidate => candidate !== null);
  if (candidates.length > 0) {
    return candidates;
  }
  const entry = result.entry;
  if (entry === null || entry === undefined) {
    return [];
  }
  const senses = entry.senses ?? [];
  const projectionOrdinals = translationCandidateProjectionOrdinals(entry, senses);
  return senses
    .map((translation, index) => honorificRequestQuoteStemCandidateFromTranslation(
      translation,
      entry,
      projectionOrdinals[index]!,
      head,
      headKind
    ))
    .filter((candidate): candidate is StemCandidate => candidate !== null);
}

function honorificRequestQuoteStemCandidateFromContentCandidate(
  candidate: TranslationCandidate,
  head: RuntimeHaruToken,
  headKind: HonorificRequestHeadKind
): StemCandidate | null {
  if (headKind === "sahen_noun") {
    return {
      ...stemCandidatePatchFromTranslationCandidate(candidate),
      lemma: sahenPredicateLemmaFromNounKorean(candidate.koreanLemma),
      irregular: "여",
      conj: "sahen",
      koreanPos: 동사,
      shortNegationPolicy: "sahen_split"
    };
  }
  if (candidate.koreanPos !== 동사 || !candidate.koreanLemma.endsWith("다")) {
    return null;
  }
  return {
    ...stemCandidatePatchFromTranslationCandidate(candidate),
    lemma: candidate.koreanLemma,
    irregular: candidate.irregular ?? null,
    conj: verbConjTypeForToken(head),
    koreanPos: 동사
  };
}

function honorificRequestQuoteStemCandidateFromTranslation(
  translation: MorphemeSense,
  entry: MorphemeEntry,
  projectionOrdinal: number,
  head: RuntimeHaruToken,
  headKind: HonorificRequestHeadKind
): StemCandidate | null {
  if (headKind === "sahen_noun") {
    return {
      ...stemCandidateMetadataFromTranslation(translation, entry, projectionOrdinal),
      lemma: sahenPredicateLemmaFromNounKorean(translation.korean),
      irregular: "여",
      conj: "sahen",
      koreanPos: 동사,
      shortNegationPolicy: "sahen_split"
    };
  }
  const koreanPos = translation.koreanPos ?? 동사;
  if (koreanPos !== 동사 || !translation.korean.endsWith("다")) {
    return null;
  }
  return {
    ...stemCandidateMetadataFromTranslation(translation, entry, projectionOrdinal),
    lemma: translation.korean,
    irregular: translation.irregular ?? null,
    conj: verbConjTypeForToken(head),
    koreanPos
  };
}

function translationSenseMetadata(translation: MorphemeSense): Partial<StemCandidate> {
  return {
    ...(translation.casePreferences === undefined ? {} : { casePreferences: translation.casePreferences }),
    ...(translation.caseRealization === undefined ? {} : { caseRealization: translation.caseRealization }),
    ...(translation.slotRealization === undefined ? {} : { slotRealization: translation.slotRealization }),
    ...(translation.senseFrame === undefined ? {} : { senseFrame: translation.senseFrame }),
    ...(translation.senseFrames === undefined ? {} : { senseFrames: translation.senseFrames }),
    ...(translation.senseCaseRealization === undefined ? {} : { senseCaseRealization: translation.senseCaseRealization }),
    ...(translation.senseSlotRealization === undefined ? {} : { senseSlotRealization: translation.senseSlotRealization }),
    ...(translation.priorityGroup === undefined ? {} : { priorityGroup: translation.priorityGroup }),
    ...(translation.priorityInGroup === undefined ? {} : { priorityInGroup: translation.priorityInGroup }),
    ...(translation.senseIndex === undefined ? {} : { senseIndex: translation.senseIndex }),
    ...(translation.sourceFormat === undefined ? {} : { sourceFormat: translation.sourceFormat }),
    ...(translation.dropFirstNegativeAux === true ? { dropFirstNegativeAux: true as const } : {}),
    ...(translation.dropFirstPassiveAux === true ? { dropFirstPassiveAux: true as const } : {}),
    ...(translation.dropFirstCausativeAux === true ? { dropFirstCausativeAux: true as const } : {}),
    ...(translation.teIruResultative === true ? { teIruResultative: true as const } : {}),
    ...(translation.teIruDropAux === true ? { teIruDropAux: true as const } : {}),
    ...(translation.teIruContractToPast === true ? { teIruContractToPast: true as const } : {}),
    ...(translation.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: translation.shortNegationPolicy }),
    ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
    ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix })
  };
}

function stemCandidateMetadataFromTranslation(
  translation: MorphemeSense,
  entry: MorphemeEntry,
  projectionOrdinal: number
): Pick<StemCandidate, "provenance" | "projectionOrdinal"> & Partial<StemCandidate> {
  const derivation = derivationForSense(translation, entry);
  return {
    provenance: stemCandidateProvenanceForTranslation(translation, derivation),
    projectionOrdinal,
    derivation,
    ...(translation.connectiveRole === undefined || translation.connectiveRole === null
      ? {}
      : { connectiveRole: translation.connectiveRole }),
    ...translationSenseMetadata(translation)
  };
}

function verbConjTypeForToken(token: RuntimeHaruToken): VerbConjType {
  const conj4 = token.pos & POS4;
  if (is五段(conj4)) return "godan";
  if (is上一段(conj4) || is下一段(conj4)) return "ichidan";
  if (conj4 === サ行変格) return "sahen";
  if (conj4 === カ行変格) return "kahen";
  return "irregular";
}

function requestKoreanClauseFormForTailKind(requestTailKind: RequestQuoteTailKind): QuoteBoundaryKoreanClauseForm {
  return requestTailKind === "iu_passive" ? "달라는 말을" : "달라고";
}

function sahenRequestAspectOp(
  tokens: readonly RuntimeHaruToken[],
  requestIdx: number
): RequestAspectOp {
  return buildRequestAspectOp(opSourceFromIndices(tokens, [requestIdx]), "te_kudasai");
}

function opSourceFromRange(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endInclusive: number
): { readonly tokens: readonly RuntimeHaruToken[]; readonly tokenIndices: readonly number[] } {
  const sourceTokens: RuntimeHaruToken[] = [];
  const tokenIndices: number[] = [];
  for (let idx = start; idx <= endInclusive; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    sourceTokens.push(token);
    tokenIndices.push(idx);
  }
  return { tokens: sourceTokens, tokenIndices };
}

