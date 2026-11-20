import type { LookupTables } from "../../../lookup-tables.js";
import type { RuleTraceDetailValue } from "../../../../types/pipeline.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { candidateObservabilityTraceValue } from "../../../candidate-observability.js";
import { previousNonSpaceIndex } from "../../../clause-layout/trivia.js";
import { quoteStructuralRelationAt } from "../../../structural-relation/quote.js";
import { quoteStructuralRelationTraceDetail, type QuoteStructuralRelation } from "../../../structural-relation/quote-payload.js";
import { TokenCursor } from "../../../token-cursor.js";
import { TraceEvent, type TraceCollector } from "../../../trace.js";
import type { ClauseBoundary } from "./commit.js";
import type {
  AuxOpNode,
  CandidateHeadProfile,
  HeadHypothesisCarrier,
  HeadTailEvidenceDecision,
  HeadTailEvidenceRealizationChoiceDecision,
  StemCandidate,
  StemNode,
  TailRoot
} from "./grammar.js";
import { firstAuxLayer, isBenefactiveAspectOp } from "./inspect.js";
import type { TailChunkCandidateObservation } from "./integration/contracts.js";


import { POS0, POS4, posToString, 助動詞, 助動詞_ダ, 동사, 명사, 부사, 형용사 } from "../../../../types/pos.js";
export function tailChainTraceDetail(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly root: TailRoot;
  readonly start: number;
  readonly consumed: number;
  readonly predicateTokenIdx: number;
  readonly replacedConsumed: number;
  readonly replacedPlanKind: string | null;
  readonly blocker: string | null;
  readonly headProfileId: string | null;
  readonly outgoingBoundaryKind: string;
  readonly outgoingBoundaryConnective: string | null;
  readonly outgoingBoundarySurface: string | null;
  readonly commitmentCandidateCount?: number | null;
  readonly candidateObservation?: TailChunkCandidateObservation;
}): { readonly [key: string]: RuleTraceDetailValue } {
  const layer = firstAuxLayer(options.root.tail);
  const ops = layer?.ops ?? [];
  const stem = layer?.stem ?? null;
  const commitmentCandidateStatus = options.commitmentCandidateCount === undefined || options.commitmentCandidateCount === null
    ? "not_built"
    : options.commitmentCandidateCount > 0 ? "created" : "none";
  return {
    owner: options.blocker === null ? "predicate_tail" : "tail_parser_blocked",
    chunk_start: options.start,
    consumed: options.consumed,
    token_span: [options.start, options.start + options.consumed - 1],
    predicate_token_idx: options.predicateTokenIdx,
    source_token: tailTraceTokenValue(options.tokens[options.predicateTokenIdx], options.predicateTokenIdx),
    stem_source_tokens: stem === null ? [] : tailStemSourceTraceValues(stem),
    replaced_consumed: options.replacedConsumed,
    replaced_plan: options.replacedPlanKind,
    blocker: options.blocker,
    head_profile: options.headProfileId,
    stem_kind: stem?.kind ?? null,
    admitted_stem_kind: stem === null ? null : tailStemAdmittedKind(stem),
    stem_lemma: stem === null ? null : tailStemTraceLemma(stem),
    stem_candidate_count: stem === null ? 0 : tailStemCandidateCount(stem),
    stem_candidates: stem === null ? [] : tailStemCandidateTraceValues(stem),
    raw_ops: ops.map(tailTraceRawOpLabel),
    operator_roles: ops.map(tailTraceOperatorRole),
    terminal: layer?.terminal ?? null,
    terminal_payload_kind: layer?.terminalPayload?.kind ?? null,
    sfp: options.root.sfp?.surface ?? null,
    quote_binding: options.root.quoteBinding,
    aspect_ops: ops
      .filter((op) => op.kind === "aspect")
      .map((op) => op.kind === "aspect" ? op.aspect : ""),
    modal_ops: ops
      .filter((op) => op.kind === "modal")
      .map((op) => op.kind === "modal" ? `${op.modal}:${tailTraceModalVariant(op)}` : ""),
    outgoing_boundary_kind: options.outgoingBoundaryKind,
    outgoing_boundary_connective: options.outgoingBoundaryConnective,
    outgoing_boundary_surface: options.outgoingBoundarySurface,
    deferred_commitment_candidate_count: options.commitmentCandidateCount ?? null,
    deferred_commitment_candidate_status: commitmentCandidateStatus,
    head_hypothesis: options.root.headHypothesis === undefined
      ? null
      : headHypothesisTraceValue(options.root.headHypothesis),
    head_evidence_decision: options.root.headEvidenceDecision === undefined
      ? null
      : headEvidenceDecisionTraceValue(options.root.headEvidenceDecision),
    ...(options.candidateObservation === undefined
      ? {}
      : { tail_candidate_observation: tailChunkCandidateObservationTraceValue(options.candidateObservation) })
  };
}

export function isQuoteLikeTailBoundary(boundary: ClauseBoundary): boolean {
  return boundary.kind !== "terminal" &&
    (
      boundary.connectiveKind === "quotative" ||
      boundary.connectiveKind === "question_quotative" ||
      boundary.connectiveKind === "cognitive_complement" ||
      boundary.connectiveKind === "wish_complement" ||
      boundary.connectiveKind === "request_complement"
    );
}

export function recordTailChainContentPassTrace(options: {
  readonly trace: TraceCollector;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly root: TailRoot;
  readonly start: number;
  readonly consumed: number;
  readonly predicateTokenIdx: number;
  readonly blocker: string | null;
  readonly outgoingBoundary: ClauseBoundary;
  readonly headProfileId: string | null;
  readonly dispatchTraceDetail: { readonly [key: string]: RuleTraceDetailValue };
  readonly commitmentCandidateCount?: number | null;
  readonly candidateObservation?: TailChunkCandidateObservation;
  readonly lookups: LookupTables;
}): void {
  options.trace.record(new TraceEvent(
    options.start,
    "content_pass",
    options.blocker === null ? "tail_chain" : "tail_parser_blocked",
    true,
    {
      consumed: options.consumed,
      replaced_consumed: options.consumed,
      replaced_plan: null,
      blocker: options.blocker,
      head_profile: options.headProfileId,
      ...options.dispatchTraceDetail
    }
  ));
  options.trace.record(new TraceEvent(
    options.predicateTokenIdx,
    "tail_chain",
    options.blocker === null ? "commitment_owner" : "semantic_readiness_blocked",
    options.blocker === null,
    tailChainTraceDetail({
      tokens: options.tokens,
      root: options.root,
      start: options.start,
      consumed: options.consumed,
      predicateTokenIdx: options.predicateTokenIdx,
      replacedConsumed: options.consumed,
      replacedPlanKind: null,
      blocker: options.blocker,
      outgoingBoundaryKind: options.outgoingBoundary.kind,
      outgoingBoundaryConnective: options.outgoingBoundary.kind === "terminal"
        ? null
        : options.outgoingBoundary.connectiveKind,
      outgoingBoundarySurface: options.outgoingBoundary.kind === "terminal"
        ? null
        : options.outgoingBoundary.surface,
      headProfileId: options.headProfileId,
      ...(options.commitmentCandidateCount === undefined
        ? {}
        : { commitmentCandidateCount: options.commitmentCandidateCount }),
      ...(options.candidateObservation === undefined
        ? {}
        : { candidateObservation: options.candidateObservation })
    })
  ));
  if (options.blocker === null) {
    recordTailParserQuoteRenderingTrace(options.trace, options.tokens, {
      outgoingBoundary: options.outgoingBoundary,
      predicateTokenIdx: options.predicateTokenIdx
    }, options.lookups, options.cursor);
  }
}

export function recordTailParserFailureTrace(options: {
  readonly trace: TraceCollector;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly index: number;
  readonly reason: string;
  readonly dispatchTraceDetail?: { readonly [key: string]: RuleTraceDetailValue };
}): void {
  options.trace.record(new TraceEvent(
    options.index,
    "tail_chain",
    "candidate_not_built",
    false,
    {
      owner: "tail_parser_not_built",
      source_token: tailTraceTokenValue(options.tokens[options.index], options.index),
      reason: options.reason,
      ...(options.dispatchTraceDetail ?? {})
    }
  ));
}

export function tailChunkCandidateObservationTraceValue(
  observation: TailChunkCandidateObservation
): RuleTraceDetailValue {
  return {
    start: observation.start,
    requested_max_end_exclusive: observation.requestedMaxEndExclusive,
    scan_end: observation.scanEnd,
    candidate_count: observation.candidateCount,
    last_reason: observation.lastReason,
    ...(observation.interpretations === undefined
      ? {}
      : {
        interpretations: observation.interpretations.map((candidate) => ({
          owner_key: candidate.ownerKey,
          source: candidate.source,
          evidence_kind: candidate.evidenceKind,
          span: {
            start: candidate.span.start,
            end_exclusive: candidate.span.endExclusive
          },
          specificity: candidate.specificity,
          span_completeness: candidate.spanCompleteness,
          structural_evidence: candidate.structuralEvidence,
          owner_precedence: candidate.ownerPrecedence,
          declaration_order: candidate.declarationOrder,
          eligible: candidate.eligible,
          arbitration_rule: candidate.arbitrationRule,
          arbitration_reason: candidate.arbitrationReason,
          selected: candidate.selected,
          ...(candidate.rejectionReason === undefined ? {} : { rejection_reason: candidate.rejectionReason }),
          ...(candidate.headEvidenceDecision === undefined
            ? {}
            : { head_evidence_decision: headEvidenceDecisionTraceValue(candidate.headEvidenceDecision) })
        }))
      }),
    attempts: observation.attempts.map((attempt) => ({
      end: attempt.end,
      status: attempt.status,
      ...(attempt.boundaryKind === undefined ? {} : { boundary_kind: attempt.boundaryKind }),
      ...(attempt.boundaryConnective === undefined ? {} : { boundary_connective: attempt.boundaryConnective }),
      ...(attempt.reason === undefined ? {} : { reason: attempt.reason }),
      ...(attempt.consumed === undefined ? {} : { consumed: attempt.consumed }),
      ...(attempt.headHypothesis === undefined ? {} : { head_hypothesis: headHypothesisTraceValue(attempt.headHypothesis) })
    }))
  };
}

export function headHypothesisTraceValue(carrier: HeadHypothesisCarrier): RuleTraceDetailValue {
  return {
    source_stem_kind: carrier.sourceStemKind,
    admitted_stem_kind: carrier.admittedStemKind,
    source_tokens: tailSourceTraceValues(carrier.source),
    source_capabilities: headSourceCapabilitiesTraceValue(carrier),
    original_candidate_count: carrier.originalCandidateCount,
    preserved_candidate_count: carrier.preservedCandidateCount,
    admitted_candidate_count: carrier.admittedCandidateCount,
    dropped_candidate_count: carrier.droppedCandidateCount,
    current_winner_index: carrier.currentWinnerIndex ?? null,
    candidates: carrier.candidates.map((candidate) => ({
      index: candidate.index,
      lemma: candidate.lemma,
      dictionary_lemma: candidate.dictionaryLemma ?? null,
      korean_pos: candidate.koreanPos ?? null,
      korean_pos_name: candidate.koreanPos === undefined ? null : posToString(candidate.koreanPos),
      projected_stem_kind: candidate.projectedStemKind ?? null,
      status: candidate.status,
      stage: candidate.stage,
      reason: candidate.reason ?? null,
      preserved_candidate: candidate.preservedCandidate !== undefined,
      preserved_lemma: candidate.preservedCandidate?.lemma ?? null,
      preserved_stem_kind: candidate.preservedCandidate === undefined
        ? null
        : preservedStemCandidateKind(candidate.preservedCandidate, carrier),
      preserved_korean_pos: candidate.preservedCandidate?.koreanPos ?? null,
      preserved_korean_pos_name: candidate.preservedCandidate?.koreanPos === undefined
        ? null
        : posToString(candidate.preservedCandidate.koreanPos),
      head_profile: candidate.headProfile === undefined
        ? null
        : candidateHeadProfileTraceValue(candidate.headProfile),
      irregular: candidate.irregular ?? null,
      priority_group: candidate.priorityGroup ?? null,
      priority_in_group: candidate.priorityInGroup ?? null,
      sense_index: candidate.senseIndex ?? null,
      provenance: candidate.provenance,
      projection_ordinal: candidate.projectionOrdinal,
      preserved_projection_ordinal: candidate.preservedCandidate?.projectionOrdinal ?? null,
      source_format: candidate.sourceFormat ?? null
    }))
  };
}

export function headEvidenceDecisionTraceValue(decision: HeadTailEvidenceDecision): RuleTraceDetailValue {
  return {
    contract_owner: decision.contractOwner ?? null,
    contract_realization_order: decision.contractRealizationOrder ?? null,
    contract_accepts: decision.contractAccepts ?? null,
    candidate_open_set: decision.candidateOpenSet.map((identity) => ({
      provenance: identity.provenance.kind === "dictionary"
        ? {
          kind: identity.provenance.kind,
          entry_id: identity.provenance.entryId,
          sense_index: identity.provenance.senseIndex
        }
        : {
          kind: identity.provenance.kind,
          derivation_id: identity.provenance.derivationId
        },
      projection_ordinal: identity.projectionOrdinal
    })),
    rules: decision.rules.map((rule) => ({
      rule: rule.rule,
      result: rule.result,
      classification: rule.classification,
      effect: rule.effect,
      reason: rule.reason ?? null,
      candidate_indices: rule.candidateIndices ?? []
    })),
    candidates: decision.candidates.map((candidate) => ({
      ...candidateObservabilityTraceValue({
        lemma: candidate.lemma,
        koreanPos: candidate.koreanPos ?? null,
        koreanPosName: candidate.koreanPos === undefined ? null : posToString(candidate.koreanPos),
        priorityGroup: candidate.priorityGroup ?? null,
        priorityInGroup: candidate.priorityInGroup ?? null,
        fallbackGroup: false,
        senseIndex: candidate.senseIndex ?? null,
        projectionOrdinal: candidate.projectionOrdinal,
        projectionOrdinalSource: "runtime_candidate",
        joinSource: candidate.stemCandidateIndexSource ?? null
      }),
      index: candidate.index,
      provenance: candidate.provenance,
      state: candidate.state,
      status_before_decision: candidate.statusBeforeDecision,
      stem_candidate_index: candidate.stemCandidateIndex ?? null,
      stem_candidate_index_source: candidate.stemCandidateIndexSource ?? null,
      stem_commit_status: candidate.stemCommitStatus ?? null,
      stem_commit_reason: candidate.stemCommitReason ?? null,
      projected_stem_kind: candidate.projectedStemKind ?? null,
      prune_reason: candidate.pruneReason ?? null,
      context_reason: candidate.contextReason ?? null,
      exclusion_reason: candidate.exclusionReason ?? null,
      realization_choices: (candidate.realizationChoices ?? []).map(realizationChoiceTraceValue)
    }))
  };
}

function candidateHeadProfileTraceValue(profile: CandidateHeadProfile): RuleTraceDetailValue {
  return {
    capabilities: profile.capabilities.map((capability) => ({
      id: capability.id,
      source: capability.source,
      order_key: {
        priority_group: capability.orderKey.priorityGroup ?? null,
        priority_in_group: capability.orderKey.priorityInGroup ?? null,
        projection_order: capability.orderKey.projectionOrder ?? null
      },
      choices: capability.choices.map((choice) => ({
        category: choice.category,
        projection_kind: choice.projectionKind
      }))
    }))
  };
}

function realizationChoiceTraceValue(choice: HeadTailEvidenceRealizationChoiceDecision): RuleTraceDetailValue {
  return {
    capability_id: choice.capabilityId,
    category: choice.category,
    projection_kind: choice.projectionKind,
    state: choice.state,
    reason: choice.reason ?? null
  };
}

function headSourceCapabilitiesTraceValue(carrier: HeadHypothesisCarrier): RuleTraceDetailValue {
  return {
    nominal_like: carrier.sourceCapabilities.nominalLike,
    i_adjective_predicate: carrier.sourceCapabilities.iAdjectivePredicate,
    verb_predicate: carrier.sourceCapabilities.verbPredicate,
    na_adjective_capable: carrier.sourceCapabilities.naAdjectiveCapable,
    keijou_capable: carrier.sourceCapabilities.keijouCapable,
    na_adjective_capable_noun: carrier.sourceCapabilities.naAdjectiveCapableNoun,
    bare_na_adjective_set: carrier.sourceCapabilities.bareNaAdjectiveSet,
    sahen_verbalization_capable: carrier.sourceCapabilities.sahenVerbalizationCapable,
    adverbial_capable: carrier.sourceCapabilities.adverbialCapable,
    adverb_capable_nominal: carrier.sourceCapabilities.adverbCapableNominal,
    lexical_adverb: carrier.sourceCapabilities.lexicalAdverb,
    inflection_class: carrier.sourceCapabilities.inflectionClass,
    stem_form: carrier.sourceCapabilities.stemForm
  };
}

function preservedStemCandidateKind(
  candidate: StemCandidate,
  carrier: HeadHypothesisCarrier
): "verb" | "adj" | "noun" | "adverb" {
  switch (candidate.koreanPos) {
    case 동사:
      return "verb";
    case 형용사:
      return "adj";
    case 명사:
      return "noun";
    case 부사:
      return "adverb";
    default:
      return carrier.candidates.find((item) => item.preservedCandidate === candidate)?.projectedStemKind ??
        carrier.sourceStemKind;
  }
}

export function recordTailParserQuoteRenderingTrace(
  trace: TraceCollector,
  tokens: readonly RuntimeHaruToken[],
  tailChunk: {
    readonly outgoingBoundary: ClauseBoundary;
    readonly predicateTokenIdx: number;
  },
  lookups: LookupTables,
  cursor: TokenCursor<RuntimeHaruToken>
): void {
  const boundary = tailChunk.outgoingBoundary;
  if (boundary.kind === "terminal" || !isQuoteLikeTailBoundary(boundary)) {
    return;
  }
  const relation = quoteStructuralRelationAt(cursor.fork(boundary.tokenIdx, tokens.length, boundary.tokenIdx), lookups);
  if (relation === undefined) {
    return;
  }
  const koreanClauseForm = tailParserQuoteTraceClauseForm(tokens, relation, boundary);
  const detail = {
    ...quoteStructuralRelationTraceDetail(tokens, relation, {
      contentIdx: tailChunk.predicateTokenIdx,
      ...(koreanClauseForm === null ? {} : { koreanClauseForm })
    }),
    ...(boundary.quoteBoundary?.requestTailKind === undefined || boundary.quoteBoundary.requestTailKind === null
      ? {}
      : { requestTailKind: boundary.quoteBoundary.requestTailKind })
  };
  trace.record(new TraceEvent(
    tailChunk.predicateTokenIdx,
    "quote_rendering",
    "quoted_clause_rendering",
    true,
    detail
  ));
}

function tailParserQuoteTraceClauseForm(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  boundary: ClauseBoundary
): string | null {
  if (boundary.kind === "terminal") {
    return null;
  }
  const form = boundary.quoteBoundary?.koreanClauseForm ?? null;
  if (form !== "다고" || relation.quote.slotKind !== "quoted_content") {
    return form;
  }
  const prevIdx = previousNonSpaceIndex(tokens, boundary.tokenIdx, relation.quote.contentSpan.start);
  const prev = prevIdx === null ? undefined : tokens[prevIdx];
  return prev !== undefined && (prev.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ) ? "이라고" : form;
}

function tailTraceTokenValue(
  token: RuntimeHaruToken | undefined,
  tokenIdx: number | null
): RuleTraceDetailValue {
  if (token === undefined) {
    return {
      token_idx: tokenIdx,
      surface: null,
      dictionary_form: null,
      reading: null,
      pos: null
    };
  }
  return {
    token_idx: tokenIdx,
    surface: token.surface,
    dictionary_form: token.dictionaryForm,
    reading: token.reading,
    pos: posToString(token.pos)
  };
}

function tailStemSourceTraceValues(stem: StemNode): readonly RuleTraceDetailValue[] {
  return tailSourceTraceValues(stem.source);
}

function tailSourceTraceValues(source: HeadHypothesisCarrier["source"]): readonly RuleTraceDetailValue[] {
  return source.tokens.map((token, index) =>
    tailTraceTokenValue(token, source.tokenIndices[index] ?? null)
  );
}

function tailStemAdmittedKind(stem: StemNode): string {
  return stem.kind;
}

function tailStemCandidateCount(stem: StemNode): number {
  return stem.kind === "candidateSet" ? stem.candidates.length : 1;
}

function tailStemCandidateTraceValues(stem: StemNode): readonly RuleTraceDetailValue[] {
  if (stem.kind !== "candidateSet") {
    return [{
      index: 0,
      lemma: stem.lemma,
      admitted_stem_kind: stem.kind,
      korean_pos: null,
      korean_pos_name: null
    }];
  }
  return stem.candidates.map((candidate, index) =>
    tailStemCandidateTraceValue(candidate, index, stem.headHypothesis?.candidates[index]?.headProfile)
  );
}

function tailStemCandidateTraceValue(
  candidate: StemCandidate,
  index: number,
  headProfile: CandidateHeadProfile | undefined
): RuleTraceDetailValue {
  return {
    index,
    lemma: candidate.lemma,
    supported_projection_kinds: candidateHeadProfileProjectionKinds(headProfile),
    supported_realization_categories: candidateHeadProfileCategories(headProfile),
    korean_pos: candidate.koreanPos ?? null,
    korean_pos_name: candidate.koreanPos === undefined ? null : posToString(candidate.koreanPos),
    priority_group: candidate.priorityGroup ?? null,
    priority_in_group: candidate.priorityInGroup ?? null,
    sense_index: candidate.senseIndex ?? null,
    provenance: candidate.provenance,
    projection_ordinal: candidate.projectionOrdinal,
    source_format: candidate.sourceFormat ?? null
  };
}

function candidateHeadProfileProjectionKinds(profile: CandidateHeadProfile | undefined): readonly string[] {
  return [...new Set(
    profile?.capabilities.flatMap((capability) => capability.choices.map((choice) => choice.projectionKind)) ?? []
  )];
}

function candidateHeadProfileCategories(profile: CandidateHeadProfile | undefined): readonly string[] {
  return [...new Set(
    profile?.capabilities.flatMap((capability) => capability.choices.map((choice) => choice.category)) ?? []
  )];
}

function tailStemTraceLemma(stem: StemNode): string {
  if (stem.kind === "candidateSet") {
    return stem.candidates[0]?.lemma ?? "";
  }
  return stem.lemma;
}

function tailTraceRawOpLabel(op: AuxOpNode): string {
  switch (op.kind) {
    case "aspect":
      return `aspect:${op.aspect}`;
    case "modal":
      return `modal:${op.modal}:${tailTraceModalVariant(op)}`;
    case "voice":
      return `voice:${op.voice}`;
    case "idiom":
      return `idiom:${op.idiom}`;
    case "connective":
      return `connective:${op.connective}`;
    case "postverbAuxiliary":
      return `postverbAuxiliary:${op.auxiliary.kind}`;
    case "predicateProjectionCarrier":
      return `predicateProjectionCarrier:${op.carrier}`;
    case "predicateQuoteCarrier":
      return `predicateQuoteCarrier:${op.style}`;
    case "predicateSuffix":
      return `predicateSuffix:${op.suffix}`;
    case "classicalAuxResidue":
      return `classicalAuxResidue:${op.residue}`;
    case "copula":
      return `copula:${op.variant}:${op.polarity}`;
    case "tense":
      return `tense:${op.tense}`;
    case "negation":
      return `negation:${op.chainDepth}`;
    case "polite":
    case "desire":
    case "conjecture":
    case "adjCopulaBridge":
    case "scopeBridge":
      return op.kind;
  }
}

function tailTraceOperatorRole(op: AuxOpNode): string {
  if (op.kind === "aspect") {
    if (isBenefactiveAspectOp(op)) {
      return "benefactive";
    }
    if (op.aspect === "te_hoshii") {
      return "desiderative_request";
    }
    if (op.aspect === "te_kudasai" || op.aspect === "te_kure_tanomu") {
      return "request";
    }
    if (op.aspect === "naide_kudasai") {
      return "prohibition";
    }
    return op.aspect;
  }
  if (op.kind === "desire") {
    return op.form === "tagaru" ? "observed_desire" : "desiderative_request";
  }
  if (op.kind === "modal") {
    return `modal:${op.modal}`;
  }
  return op.kind;
}

function tailTraceModalVariant(op: Extract<AuxOpNode, { readonly kind: "modal" }>): string {
  switch (op.modal) {
    case "wake":
      return op.variant;
    case "hazu":
      return op.polarity;
    case "noda":
      return op.past ? "past" : "plain";
    case "youda":
      return op.form;
    case "souda_hearsay":
      return op.reading;
    case "tsumori":
      return op.variant;
    case "limit_negation":
      return op.focus;
    case "mono":
      return op.reading;
    case "kamo":
    case "rashii":
    case "tokoro":
    case "mai":
      return op.modal;
  }
}
