
import { TokenCursor } from "../../../token-cursor.js";
import { adverbializationActivationMatches } from "../../../lexical-particle-boundary-claims.js";



import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { MorphemeEntry } from "../../../../types/dictionary.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity } from "./stem-candidate-identity.js";
import type { RenderPlan } from "../../../../types/render-plan.js";
import { withNumericStemBaseResolved } from "./numeric-host-base.js";
import { withDerivationalStemBaseResolved } from "./derivational-host-base.js";
import type { PredicateHeadTailChainHostProjection } from "../../lifecycle/head-tail-render-plan.js";
import type { Warning } from "../../../../types/warning.js";
import { parseTail } from "./parse-tail.js";
import {
  tailRootHasMidChainConnective,
} from "./mid-chain-connective-license.js";
import {
  probeProductionDispatch,
  type ProductionMatchContext,
  type ProductionNonAdmissionPolicy,
} from "./production-registry.js";
import { lineMemo } from "../../line-memo.js";
import { isNaiOrNuToken, isAdverbialMannerNounHead, SYNTHETIC_DEICTIC_STEM_REASON_PREFIX } from "./classifiers/tokens.js";
import { fusedNoYouNiKeijoujiAttributiveAt, keijoujiAttributiveMarkerAt } from "./matchers/predicate-projection-connective.js";
import { rangeIndices } from "./integration/parse-slice.js";
import {
  ellipticTailHasOvertLexicalStem,
  isNonExplicitEllipticTailSequenceStart,
  isZeroHeadPropositionTailSequenceStart,
  isZeroHeadUtteranceInitialStart,
  zeroHeadPropositionTailIslandEndExclusive
} from "./integration/zero-head.js";
import { parseOutgoingBoundaryHint } from "./integration/boundary-hint.js";
import { canParseZeroTailPredicateHead, quotedBareKeijoujiHostScanEnd, zeroTailPredicateHeadContestedSlot } from "./integration/readiness.js";
import { tailRootHasRenyouChuushiTerminal } from "./fragment-recovery.js";
import {
  partialTailSuffixUnresolvedWarning,
  tailBoundaryAttachmentWeakPartial,
  tailFunctionalSuffixHandoffPartial,
  tailUnresolvedFunctionalResidualPartial
} from "./suffix-handoff.js";
import { closesUtteranceAs, utteranceClosureAfter, type UtteranceClosureKind } from "../../../clause-layout/utterance-closure.js";
import { activeProtoLayout } from "../../../clause-layout/index.js";
import type { ClauseLayout } from "../../../clause-layout/final-layout.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../clause-layout/trivia.js";
import { quoteHostHandoffKindAt, quoteHostHandoffKindForHost, cachedQuoteBindingForContentRoot, quoteStructuralRelationAt, quoteStructuralRelationIndex, quoteStructuralRelationStartingAt } from "../../../structural-relation/quote.js";
import { quoteClauseBoundaryFromRelation, quoteConsumedMarkerSpanFromRelation } from "../../../structural-relation/quote-clause-boundary.js";
import type { TailChainPartialArtifact } from "../chain.js";
import { isNounToSareruContext } from "../../../predicate-helpers.js";
import type { LookupTables } from "../../../lookup-tables.js";
import type { NumericTables } from "../../../../generator/numeric-lookup.js";
import type { ClauseBoundary, ClauseTailIR } from "./commit.js";
import { boundaryReadinessBlocker, classifyBoundaryReadinessRelation } from "./boundary-semantics.js";
import type { BoundaryReadinessRelation } from "./boundary-semantics.js";
import { teDeContinuationRelationAt } from "../postverb-tail-classifier.js";
import { classifyAttributiveHeadKind } from "./structural-attributive-head-table.js";
import { connectiveSurfaceRequiresFinalPosition } from "./connective-surface-lookup.js";
import type { AttributiveBoundaryPayload, AuxOpNode, ConnectiveKind, HeadHypothesisCarrier, OpSource, ParsedTailRoot, StemCandidateRealization, StemNode, TailNode, TailRoot, TailRootBase } from "./grammar.js";
import { isOpeningPunctuationToken } from "../../boundary/punctuation.js";
import type { ContextGrammar } from "../../../context.js";
import type { PredicateProjectionHost, PredicateProjectionKind } from "../../grammar.js";
import type { HeadProfileDescriptor } from "../../head/profile.js";
import { tailRootIntrinsicAspectReadinessBlocker } from "./aspect-semantics.js";
import { auxOpsInTailNode, firstAuxLayer, stemSupportsProjectionCategory, tailRootClosesWithAttributiveTerminal, tailRootClosesWithOvertNominalizerTerminal, tailRootVoiceOps } from "./inspect.js";
import { dewaScopeBridgeRelationAt, predicateNominalizerRelationForToken } from "../../boundary/marker.js";
import { quoteMarkerRelationAt } from "../../boundary/quote-marker.js";
import {
  candidateRealizationFromDecisionChoices,
  resolveTailEvidenceDecision
} from "./tail-evidence-decision.js";

import { POS0, 助詞, 副詞, 補助記号, 記号, isAttributiveInflection } from "../../../../types/pos.js";
import { IU_LEXEME_FORMS } from "../../data/quoted-reporting-sets.js";
import { classifyZeroHeadAttributiveChunkBoundary, isStructuralAttributivePrefixEnd, canExternalContentOwnAttributiveHead } from "./integration/attributive-boundary.js";
import { type HostBearingExternalNominalizerPredicateFrame, findHostBearingExternalNominalizerPredicateFrame, isBareInterrogativeQuestionComplementStart, isNominalLikenessPredicateStart } from "./integration/predicate-start-evidence.js";
import { inferTailChunkEndBoundary, inferExternalNominalizerBoundaryAtScanEnd, normalizeTokaListingBoundary } from "./integration/end-boundary-inference.js";
import { findTailChunkScanEnd } from "./integration/tail-chunk-scan-end.js";
import { assemblerResumableTailPrefixBoundaries, type SourceBearingConnectivePrefixBoundary, sourceBearingConnectivePrefixBoundaries, weakAttachmentSourceBearingBoundaryAtScanEnd, tailPartialSuffixCanStayInAssembler, isExplicitQuoteSpanContentZeroTailHead, findClauseBoundaries, classifyAttributiveChunkBoundary, tailFunctionalResidualSuffixCanStayUnresolved, tailRootHasSourceBearingPartialPrefix, legalTailChunkPartialBoundaries } from "./integration/clause-boundaries.js";
import { isNominalLikeAttributiveHead } from "./integration/predicate-evidence.js";
import type { IntegrationInput, TailChunkResult, ParsedTailChunk, TailChunkCandidateOptions, TailChunkCandidateCollection, TailChunkCandidateAttemptObservation, TailChunkCandidateObservation } from "./integration/contracts.js";
import { withTailInterpretationEnvelope, attachSingletonTailInterpretationObservation } from "./integration/tail-arbitration.js";
import { zeroTailRenyouChuushiPredicateHeadAdmitted, isPotentialTailChunkStart, bareTteAttributiveStartLacksPredicateSense } from "./integration/head-admission.js";
import { segmentAndParseClauses, adverbialModifierChunkEnd, parseTailChunkOnly, standaloneRenyouFragmentWarningsForParsedChunk, missingConditionalMarkerWarningsForRoot, renderParsedChunk, attributiveRewriteRestsOnClosedUtterance, stripTrailingConnectiveForAttributiveHost, markTailRootAttributiveTerminal, rewriteRootOutgoingBoundaryConnective, type ClauseParseInfo, findContentRange } from "./integration/parse-clause.js";
import { tailParserSenseFrameLocallyPossible } from "./integration/stem-candidates.js";

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

export function bareDemoCandidatePreemptsNegativeScopeTail(
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

interface TailChunkCandidateSearchContext {
  readonly input: IntegrationInput;
  readonly start: number;
  readonly requestedMaxEnd: number;
  readonly scanEnd: number;
  readonly weakAttachmentBoundary: SourceBearingConnectivePrefixBoundary | null;
  readonly legalPartialBoundaries: ReadonlyMap<number, ClauseBoundary>;
  readonly bareRenyouChuushiHeadBoundary: ClauseBoundary | undefined;
}

interface TailChunkCandidateSearchState {
  lastReason: string;
  readonly attempts: TailChunkCandidateAttemptObservation[];
  readonly candidates: ParsedTailChunk[];
}

async function collectTailChunkCandidatesFromParserUncached(
  input: IntegrationInput,
  start: number,
  options: TailChunkCandidateOptions = {}
): Promise<TailChunkCandidateCollection> {
  const startRejection = await rejectTailChunkStart(input, start);
  if (startRejection !== null) {
    return startRejection;
  }
  const requestedMaxEnd = options.maxEndExclusive ?? input.tokens.length;
  const scanEnd = Math.min(
    findTailChunkScanEnd(input.tokens, start, input.numeric, input.lookups),
    requestedMaxEnd - 1
  );
  const scanRangeRejection = await rejectTailChunkScanRange(input, start, scanEnd);
  if (scanRangeRejection !== null) {
    return scanRangeRejection;
  }

  const weakAttachmentBoundary = weakAttachmentSourceBearingBoundaryAtScanEnd(input.cursor, start, scanEnd, input.lookups);
  const legalPartialBoundaries = legalTailChunkPartialBoundaries(input.cursor, start, scanEnd, input.numeric, input.lookups);
  const bareRenyouChuushiHeadBoundary: ClauseBoundary | undefined =
    scanEnd > start && !legalPartialBoundaries.has(start) &&
      (await zeroTailRenyouChuushiPredicateHeadAdmitted(input, start))
      ? { kind: "terminal" }
      : undefined;
  const ctx: TailChunkCandidateSearchContext = {
    input,
    start,
    requestedMaxEnd,
    scanEnd,
    weakAttachmentBoundary,
    legalPartialBoundaries,
    bareRenyouChuushiHeadBoundary
  };
  const state: TailChunkCandidateSearchState = {
    lastReason: "no candidate tried",
    attempts: [],
    candidates: []
  };
  const hostBearingResult = await collectHostBearingExternalPredicateCandidate(ctx, state);
  if (hostBearingResult !== null) {
    return hostBearingResult;
  }
  const generalResult = await collectGeneralTailChunkCandidates(ctx, state);
  if (generalResult !== null) {
    return generalResult;
  }
  const resumableResult = await mergeAssemblerResumableTailPrefixCandidate(ctx, state);
  if (resumableResult !== null) {
    return resumableResult;
  }
  if (state.candidates.length > 0) {
    return finishTailChunkCandidatesWithPartialCandidate(ctx, state);
  }
  return finishTailChunkCandidatesWithPartialCandidateOnly(ctx, state);
}

async function rejectTailChunkStart(
  input: IntegrationInput,
  start: number
): Promise<TailChunkCandidateCollection | null> {
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
  return null;
}

async function rejectTailChunkScanRange(
  input: IntegrationInput,
  start: number,
  scanEnd: number
): Promise<TailChunkCandidateCollection | null> {
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
  return null;
}

function observeTailChunkCandidates(
  ctx: TailChunkCandidateSearchContext,
  state: TailChunkCandidateSearchState,
  candidateCount: number,
  reason: string
): TailChunkCandidateObservation {
  return {
    start: ctx.start,
    requestedMaxEndExclusive: ctx.requestedMaxEnd,
    scanEnd: ctx.scanEnd,
    candidateCount,
    lastReason: reason,
    attempts: [...state.attempts]
  };
}

async function collectHostBearingExternalPredicateCandidate(
  ctx: TailChunkCandidateSearchContext,
  state: TailChunkCandidateSearchState
): Promise<TailChunkCandidateCollection | null> {
  const { input, start, scanEnd, weakAttachmentBoundary } = ctx;
  const hostBearingExternalPredicate = weakAttachmentBoundary === null
    ? await tryParseHostBearingExternalNominalizerPredicateChunk(
      input,
      start,
      scanEnd
    )
    : null;
  if (hostBearingExternalPredicate === null) {
    return null;
  }
  if (hostBearingExternalPredicate.ok) {
    state.attempts.push({
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
      lastReason: state.lastReason,
      observation: observeTailChunkCandidates(ctx, state, 1, state.lastReason)
    })
    : {
      candidates: [],
      lastReason: hostBearingExternalPredicate.reason,
      observation: observeTailChunkCandidates(ctx, state, 0, hostBearingExternalPredicate.reason)
    };
}

async function collectGeneralTailChunkCandidates(
  ctx: TailChunkCandidateSearchContext,
  state: TailChunkCandidateSearchState
): Promise<TailChunkCandidateCollection | null> {
  const { input, start, scanEnd, weakAttachmentBoundary, legalPartialBoundaries, bareRenyouChuushiHeadBoundary } = ctx;
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
      state.attempts.push({ end, status: "no_boundary", reason: "no legal tail boundary at candidate end" });
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
      state.lastReason = reason;
      state.attempts.push({
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
        return { candidates: [], lastReason: state.lastReason, observation: observeTailChunkCandidates(ctx, state, 0, state.lastReason) };
      }
      continue;
    }
    const candidate = materializedCandidate;
    const candidateConsumed = candidate.consumed;
    const candidateEnd = start + candidateConsumed - 1;
    state.attempts.push({
      end: candidateEnd,
      status: "candidate",
      boundaryKind: outgoingBoundary.kind,
      boundaryConnective: outgoingBoundary.kind === "terminal" ? null : outgoingBoundary.connectiveKind,
      consumed: candidateConsumed
    });
    state.candidates.push(candidate);
    if (materialized.kind === "non_admission" && materialized.policy === "preserve") {
      return withTailInterpretationEnvelope(input, start, {
        candidates: [candidate],
        lastReason: state.lastReason,
        observation: observeTailChunkCandidates(ctx, state, 1, state.lastReason)
      });
    }
  }
  return null;
}

async function mergeAssemblerResumableTailPrefixCandidate(
  ctx: TailChunkCandidateSearchContext,
  state: TailChunkCandidateSearchState
): Promise<TailChunkCandidateCollection | null> {
  const { input, start, scanEnd } = ctx;
  const assemblerResumable = await tryBuildAssemblerResumableTailPrefixCandidate(input, start, scanEnd);
  if (assemblerResumable !== null) {
    if (assemblerResumable.kind === "non_admission" && assemblerResumable.policy === "reject") {
      state.lastReason = `production family '${assemblerResumable.familyId}' requested reject`;
      return { candidates: [], lastReason: state.lastReason, observation: observeTailChunkCandidates(ctx, state, 0, state.lastReason) };
    }
    const assemblerResumableChunk = assemblerResumable.kind === "candidate"
      ? assemblerResumable.chunk
      : assemblerResumable.kind === "non_admission" && assemblerResumable.policy === "preserve"
        ? assemblerResumable.chunk
        : undefined;
    if (assemblerResumableChunk !== undefined) {
      if (assemblerResumable.kind === "non_admission" && assemblerResumable.policy === "preserve") {
        state.attempts.unshift({
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
          lastReason: state.lastReason,
          observation: observeTailChunkCandidates(ctx, state, 1, state.lastReason)
        });
      }
      const bestConsumed = state.candidates[0]?.consumed ?? 0;
      if (assemblerResumableChunk.consumed > bestConsumed) {
        state.attempts.unshift({
          end: start + assemblerResumableChunk.consumed - 1,
          status: "partial_candidate",
          boundaryKind: assemblerResumableChunk.outgoingBoundary.kind,
          boundaryConnective: assemblerResumableChunk.outgoingBoundary.kind === "terminal"
            ? null
            : assemblerResumableChunk.outgoingBoundary.connectiveKind,
          reason: assemblerResumableChunk.partial?.decision ?? "assembler_resumable_tail_prefix",
          consumed: assemblerResumableChunk.consumed
        });
        state.candidates.unshift(assemblerResumableChunk);
      }
    }
  }
  return null;
}

async function finishTailChunkCandidatesWithPartialCandidate(
  ctx: TailChunkCandidateSearchContext,
  state: TailChunkCandidateSearchState
): Promise<TailChunkCandidateCollection> {
  const { input, start, scanEnd } = ctx;
  const partial = await tryBuildTailChunkPartialCandidate(input, start, scanEnd);
  if (partial?.kind === "non_admission" && partial.policy === "reject") {
    state.lastReason = `production family '${partial.familyId}' requested reject`;
    return { candidates: [], lastReason: state.lastReason, observation: observeTailChunkCandidates(ctx, state, 0, state.lastReason) };
  }
  const partialChunk = partial?.kind === "candidate"
    ? partial.chunk
    : partial?.kind === "non_admission" && partial.policy === "preserve"
      ? partial.chunk
      : undefined;
  if (partial?.kind === "non_admission" && partial.policy === "preserve") {
    state.attempts.unshift({
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
      lastReason: state.lastReason,
      observation: observeTailChunkCandidates(ctx, state, 1, state.lastReason)
    });
  }
  const bestConsumed = state.candidates[0]?.consumed ?? 0;
  if (partialChunk !== undefined && partialChunk.consumed > bestConsumed) {
    state.attempts.unshift({
      end: start + partialChunk.consumed - 1,
      status: "partial_candidate",
      boundaryKind: partialChunk.outgoingBoundary.kind,
      boundaryConnective: partialChunk.outgoingBoundary.kind === "terminal" ? null : partialChunk.outgoingBoundary.connectiveKind,
      reason: partialChunk.partial?.decision ?? "tail_chunk_partial_candidate",
      consumed: partialChunk.consumed
    });
    state.candidates.unshift(partialChunk);
  }
  const observation = observeTailChunkCandidates(ctx, state, state.candidates.length, state.lastReason);
  return withTailInterpretationEnvelope(input, start, {
    candidates: state.candidates,
    lastReason: state.lastReason,
    observation
  });
}

async function finishTailChunkCandidatesWithPartialCandidateOnly(
  ctx: TailChunkCandidateSearchContext,
  state: TailChunkCandidateSearchState
): Promise<TailChunkCandidateCollection> {
  const { input, start, scanEnd } = ctx;
  const partial = await tryBuildTailChunkPartialCandidate(input, start, scanEnd);
  if (partial?.kind === "non_admission" && partial.policy === "reject") {
    state.lastReason = `production family '${partial.familyId}' requested reject`;
    return { candidates: [], lastReason: state.lastReason, observation: observeTailChunkCandidates(ctx, state, 0, state.lastReason) };
  }
  const partialChunk = partial?.kind === "candidate"
    ? partial.chunk
    : partial?.kind === "non_admission" && partial.policy === "preserve"
      ? partial.chunk
      : undefined;
  if (partial?.kind === "non_admission" && partial.policy === "preserve") {
    state.attempts.unshift({
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
      lastReason: state.lastReason,
      observation: observeTailChunkCandidates(ctx, state, 1, state.lastReason)
    });
  }
  if (partialChunk !== undefined) {
    state.attempts.unshift({
      end: start + partialChunk.consumed - 1,
      status: "partial_candidate",
      boundaryKind: partialChunk.outgoingBoundary.kind,
      boundaryConnective: partialChunk.outgoingBoundary.kind === "terminal" ? null : partialChunk.outgoingBoundary.connectiveKind,
      reason: partialChunk.partial?.decision ?? "tail_chunk_partial_candidate",
      consumed: partialChunk.consumed
    });
    const observation = observeTailChunkCandidates(ctx, state, 1, state.lastReason);
    return withTailInterpretationEnvelope(input, start, {
      candidates: [partialChunk],
      lastReason: state.lastReason,
      observation
    });
  }
  return { candidates: state.candidates, lastReason: state.lastReason, observation: observeTailChunkCandidates(ctx, state, 0, state.lastReason) };
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

export function tailParserShouldYieldToAssemblerQuoteHost(
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

export async function _buildClauseTailIRsForTest(
  input: IntegrationInput
): Promise<readonly ClauseTailIR[] | null> {
  const range = findContentRange(input.tokens);
  if (range === null) return null;
  const boundaries = findClauseBoundaries(input.cursor.fork(range.start, range.end, range.start), input.lookups);
  const seg = await segmentAndParseClauses(input, boundaries);
  return seg.ok ? seg.irs : null;
}

