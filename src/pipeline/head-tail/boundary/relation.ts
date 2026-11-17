import type { ScopeBridgeFocusKind } from "../data/scope-bridge-focus-table.js";

export type { ScopeBridgeFocusKind };
export interface BoundaryRelationSpan {
  readonly start: number;
  readonly endExclusive: number;
}

export type BoundaryRelationStrength =
  | "hard"
  | "weak"
  | "transparent"
  | "readiness";

export type BoundaryRelationConsumer =
  | "clause_layout"
  | "quote_content"
  | "embedded_question"
  | "embedded_question_ka_pair_scan"
  | "embedded_question_predicate_continuation"
  | "embedded_question_question_taking_scan"
  | "tail_multi_clause"
  | "structural_relation_ka_parallel"
  | "structural_relation_tari_listing"
  | "tail_boundary_readiness"
  | "tail_render"
  | "nominal_head"
  | "quote_host_taxonomy"
  | "projection_context"
  | "content_head_dispatch"
  | "content_resolver"
  | "demo_discourse"
  | "dictionary_pattern"
  | "deferred_commitment"
  | "collocation_rescue"
  | "compounds"
  | "pronominal_no_dispatch"
  | "scope_carrier_dispatch"
  | "semantic_carrier_predicate"
  | "nominal_head_parser"
  | "post_aux"
  | "postverb_chain"
  | "particle_head_dispatch"
  | "grammar_runtime"
  | "assembler"
  | "matchers"
  | "simile_semantics"
  | "modality_specs"
  | "modality_rules"
  | "copula_rules"
  | "tail_nominalization_rules"
  | "tail_ka_rules"
  | "pre_entry_rules"
  | "connective_helpers"
  | "terminal_runtime"
  | "semantic_helpers"
  | "wake_semantics"
  | "tokoro_semantics"
  | "numeric_semantics"
  | "to_clause_semantics"
  | "clause_rules"
  | "tail_finalization_rules"
  | "legacy_postaux_shortcuts"
  | "connective_span_scanner"
  | "functional_fallback"
  | "quoted_reporting_passive"
  | "predicate_helpers"
  | "tail_volitional_rules"
  | "colloquial_obligation"
  | "pattern_runtime"
  | "miseru_semantics"
  | "copula_tail_runtime"
  | "token_preprocess";

export type BoundaryRelationKind =
  | "weak_punctuation"
  | "hard_terminal_punctuation"
  | "subtitle_terminal_trailing_punctuation_run"
  | "quote_bridge_punctuation"
  | "embedded_question_bridge_punctuation"
  | "transparent_token"
  | "ka_marker"
  | "ka_continuation"
  | "quote_marker"
  | "quote_marker_continuation"
  | "clause_connective"
  | "composite_connective"
  | "conditional_aux"
  | "copula_de_marker"
  | "copula_ni_marker"
  | "nominalizer"
  | "nominal_link_marker"
  | "case_particle_marker"
  | "topic_focus_marker"
  | "pronominal_no_marker"
  | "scope_bridge_marker"
  | "nominalizer_continuation"
  | "te_de_continuation"
  | "copula_focus_continuation"
  | "copula_honorific_support"
  | "copula_elided_negative_body"
  | "clause_start_evidence"
  | "bridge_argument"
  | "composite_connective_pattern"
  | "parenthetical_span"
  | "opaque_frame";

export interface BoundaryRelationBase {
  readonly kind: BoundaryRelationKind;
  readonly span: BoundaryRelationSpan;
  readonly strength: BoundaryRelationStrength;
  readonly reason: string;
  readonly consumers: readonly BoundaryRelationConsumer[];
}

export interface TokenBoundaryRelationBase extends BoundaryRelationBase {
  readonly surface: string;
}

export interface WeakPunctuationRelation extends TokenBoundaryRelationBase {
  readonly kind: "weak_punctuation";
  readonly strength: "weak";
}

export interface HardTerminalPunctuationRelation extends TokenBoundaryRelationBase {
  readonly kind: "hard_terminal_punctuation";
  readonly strength: "hard";
}

export interface SubtitleTerminalTrailingPunctuationRunRelation extends TokenBoundaryRelationBase {
  readonly kind: "subtitle_terminal_trailing_punctuation_run";
  readonly strength: "readiness";
  readonly role: "subtitle_terminal_trailing";
}

export interface QuoteBridgePunctuationRelation extends TokenBoundaryRelationBase {
  readonly kind: "quote_bridge_punctuation";
  readonly strength: "weak";
}

export interface EmbeddedQuestionBridgePunctuationRelation extends TokenBoundaryRelationBase {
  readonly kind: "embedded_question_bridge_punctuation";
  readonly strength: "weak";
}

export interface TransparentTokenRelation extends TokenBoundaryRelationBase {
  readonly kind: "transparent_token";
  readonly strength: "transparent";
}

export interface KaMarkerRelation extends TokenBoundaryRelationBase {
  readonly kind: "ka_marker";
  readonly strength: "readiness";
  readonly role: "question_particle";
  readonly particleSubtype1: number;
}

export type KaContinuationKind =
  | "question_nominalizer_particle"
  | "question_external_suffix"
  | "question_copula_de"
  | "question_quote_marker"
  | "question_alternative_marker";

export interface KaContinuationRelation extends TokenBoundaryRelationBase {
  readonly kind: "ka_continuation";
  readonly strength: "readiness";
  readonly role: "question_content_continuation";
  readonly kaIdx: number;
  readonly continuationIdx: number;
  readonly continuationSurface: string;
  readonly continuationKind: KaContinuationKind;
  readonly bridgePunctuationSpan?: { readonly start: number; readonly endExclusive: number };
}

export interface QuoteMarkerRelation extends TokenBoundaryRelationBase {
  readonly kind: "quote_marker";
  readonly strength: "readiness";
  readonly role: "quotative_marker";
  readonly canonicalSurface: "と" | "って" | "だって" | "なんて" | "などと" | "とかって" | "とか";
  readonly tokenCount: number;
}

export interface QuoteMarkerContinuationRelation extends BoundaryRelationBase {
  readonly kind: "quote_marker_continuation";
  readonly strength: "readiness";
  readonly role: "toshite_frame";
  readonly markerIdx: number;
  readonly supportIdx: number;
  readonly tailIdx: number;
  readonly markerSurface: "と";
  readonly canonicalSurface: "として";
}

export type ClauseStartEvidenceKind =
  | "direct_predicate"
  | "argument_frame_then_predicate"
  | "transparent_span_then_predicate"
  | "content_prelude_then_predicate";

export interface ClauseStartEvidenceRelation extends BoundaryRelationBase {
  readonly kind: "clause_start_evidence";
  readonly strength: "readiness";
  readonly evidence: ClauseStartEvidenceKind;
  readonly predicateIdx: number;
}

export interface BridgeArgumentRelation extends TokenBoundaryRelationBase {
  readonly kind: "bridge_argument";
  readonly strength: "readiness";
  readonly role: "quote_host_prefix_argument" | "quote_host_search_bridge_argument";
  readonly argumentKind: "subject_topic" | "object" | "other";
  readonly markerIdx?: number;
  readonly hostIdx?: number;
  readonly headIdx?: number;
}

export type PredicateNominalizerRelationKind = "koto" | "no" | "mono" | "tame";

export interface NominalizerRelation extends TokenBoundaryRelationBase {
  readonly kind: "nominalizer";
  readonly strength: "readiness";
  readonly role: "predicate_nominalizer";
  readonly nominalizerKind: PredicateNominalizerRelationKind;
  readonly requirement: "head_anchor" | "strict_particle" | "tail_connective_marker" | "quote_tail_marker" | "terminal_noda_marker" | "postverb_chain_marker";
}

export interface NominalLinkMarkerRelation extends TokenBoundaryRelationBase {
  readonly kind: "nominal_link_marker";
  readonly strength: "readiness";
  readonly role: "adnominal_no_marker";
  readonly linkKind: "genitive" | "adnominal_modifier";
  readonly particleSubtype1: number;
}

export type CaseParticleMarkerSurface =
  | "が"
  | "を"
  | "に"
  | "で"
  | "から"
  | "より"
  | "へ"
  | "と"
  | "の";

export interface CaseParticleMarkerRelation extends TokenBoundaryRelationBase {
  readonly kind: "case_particle_marker";
  readonly strength: "readiness";
  readonly role: "case_particle_marker";
  readonly caseSurface: CaseParticleMarkerSurface;
  readonly particleSubtype1: number;
}

export type TopicFocusMarkerSurface = "は" | "も";

export interface TopicFocusMarkerRelation extends TokenBoundaryRelationBase {
  readonly kind: "topic_focus_marker";
  readonly strength: "readiness";
  readonly role: "topic_focus_marker";
  readonly markerSurface: TopicFocusMarkerSurface;
  readonly focusKind: "topic" | "additive";
  readonly particleSubtype1: number;
}

export type PronominalNoMarkerRequirement =
  | "case_particle_tail"
  | "bare_adnominal_tail"
  | "scope_bridge_tail"
  | "copula_tail";

export interface PronominalNoMarkerRelation extends TokenBoundaryRelationBase {
  readonly kind: "pronominal_no_marker";
  readonly strength: "readiness";
  readonly role: "pronominal_no_marker";
  readonly requirement: PronominalNoMarkerRequirement;
  readonly particleSubtype1: number;
}

export type ScopeBridgeCarrierKind =
  | "focus_dake_de"
  | "pronominal_no_de"
  | "dewa_focus";

export interface ScopeBridgeMarkerRelation extends TokenBoundaryRelationBase {
  readonly kind: "scope_bridge_marker";
  readonly strength: "readiness";
  readonly role: "scope_bridge_marker";
  readonly carrierKind: ScopeBridgeCarrierKind;
  readonly anchorIdx: number;
  readonly markerIdx: number;
  readonly markerSurface: "で";
  readonly markerKind: "particle" | "copula";
  readonly focusParticle?: ScopeBridgeFocusKind;
}

export interface CopulaDeMarkerRelation extends TokenBoundaryRelationBase {
  readonly kind: "copula_de_marker";
  readonly strength: "readiness";
  readonly role: "copula_de_marker";
  readonly auxiliaryFamily: number | null;
  readonly isAssertiveCopulaFamily: boolean;
}

export interface CopulaNiMarkerRelation extends TokenBoundaryRelationBase {
  readonly kind: "copula_ni_marker";
  readonly strength: "readiness";
  readonly role: "copula_ni_marker";
  readonly auxiliaryFamily: number | null;
}

export type ExternalNominalizerConnectiveKind =
  | "external_nominalizer_comparison"
  | "external_nominalizer_concessive"
  | "external_nominalizer_additive"
  | "external_nominalizer_conformity";

export const EXTERNAL_NOMINALIZER_CONNECTIVE_KINDS = [
  "external_nominalizer_comparison",
  "external_nominalizer_concessive",
  "external_nominalizer_additive",
  "external_nominalizer_conformity"
] as const satisfies readonly ExternalNominalizerConnectiveKind[];

const EXTERNAL_NOMINALIZER_CONNECTIVE_KIND_SET: ReadonlySet<string> =
  new Set(EXTERNAL_NOMINALIZER_CONNECTIVE_KINDS);

export function isExternalNominalizerConnectiveKind(
  kind: string | null | undefined
): kind is ExternalNominalizerConnectiveKind {
  return kind !== null && kind !== undefined && EXTERNAL_NOMINALIZER_CONNECTIVE_KIND_SET.has(kind);
}

export interface NominalizerContinuationRelation extends TokenBoundaryRelationBase {
  readonly kind: "nominalizer_continuation";
  readonly strength: "readiness";
  readonly role: "external_nominalizer_continuation";
  readonly nominalizerKind: "no";
  readonly connectiveKind: ExternalNominalizerConnectiveKind;
  readonly nominalizerIdx: number;
  readonly requirement: "tail_connective_marker";
}

export type TeDeContinuationTailKind =
  | "simple_aspect"
  | "benefactive"
  | "request"
  | "prohibition"
  | "forbidden"
  | "desiderative"
  | "miseru"
  | "permission"
  | "evaluation"
  | "degree_intensifier";

export interface TeDeContinuationRelation extends TokenBoundaryRelationBase {
  readonly kind: "te_de_continuation";
  readonly strength: "readiness";
  readonly role: "postverb_operator_tail";
  readonly markerSurface: "て" | "で" | "ては" | "では" | "ても" | "でも" | "てなど" | "でなど";
  readonly focusParticle?: "は" | "も";
  readonly continuationKind: TeDeContinuationTailKind;
  readonly continuationIdx: number;
  readonly continuationConsumed: number;
  readonly requirement: "parser_adjacent_tail" | "layout_nonspace_tail";
}

export interface CopulaFocusContinuationRelation extends TokenBoundaryRelationBase {
  readonly kind: "copula_focus_continuation";
  readonly strength: "readiness";
  readonly role: "copula_de_focus_continuation";
  readonly copulaIdx: number;
  readonly focusIdx: number;
  readonly focusSurface: string;
}

export interface CopulaHonorificSupportRelation extends TokenBoundaryRelationBase {
  readonly kind: "copula_honorific_support";
  readonly strength: "readiness";
  readonly role: "copula_de_honorific_support";
  readonly copulaIdx: number;
  readonly supportIdx: number;
}

export interface CopulaElidedNegativeBodyRelation extends TokenBoundaryRelationBase {
  readonly kind: "copula_elided_negative_body";
  readonly strength: "readiness";
  readonly role: "copula_de_elided_negative_body";
  readonly copulaIdx: number;
  readonly focusIdx: number;
  readonly questionIdx: number;
}

export interface CompositeConnectivePatternRelation extends TokenBoundaryRelationBase {
  readonly kind: "composite_connective_pattern";
  readonly strength: "readiness";
  readonly connectiveKind: string;
  readonly tokenCount: number;
  readonly hostIndex?: number;
}

export type ParentheticalSpanRole =
  | "explicit_quote_span"
  | "parenthetical_span"
  | "bracketed_span";

export interface ParentheticalSpanRelation extends BoundaryRelationBase {
  readonly kind: "parenthetical_span";
  readonly strength: "transparent" | "readiness";
  readonly openingSurface: string;
  readonly closingSurface: string;
  readonly openingIdx: number;
  readonly closingIdx: number;
  readonly role: ParentheticalSpanRole;
}

export interface MarkerBoundaryRelation extends TokenBoundaryRelationBase {
  readonly kind:
    | "clause_connective"
    | "composite_connective"
    | "conditional_aux"
    | "opaque_frame";
  readonly connectiveKind?: string;
}

export type BoundaryRelation =
  | WeakPunctuationRelation
  | HardTerminalPunctuationRelation
  | SubtitleTerminalTrailingPunctuationRunRelation
  | QuoteBridgePunctuationRelation
  | EmbeddedQuestionBridgePunctuationRelation
  | TransparentTokenRelation
  | KaMarkerRelation
  | KaContinuationRelation
  | QuoteMarkerRelation
  | QuoteMarkerContinuationRelation
  | ClauseStartEvidenceRelation
  | BridgeArgumentRelation
  | NominalizerRelation
  | NominalLinkMarkerRelation
  | CaseParticleMarkerRelation
  | TopicFocusMarkerRelation
  | PronominalNoMarkerRelation
  | ScopeBridgeMarkerRelation
  | CopulaDeMarkerRelation
  | CopulaNiMarkerRelation
  | NominalizerContinuationRelation
  | TeDeContinuationRelation
  | CopulaFocusContinuationRelation
  | CopulaHonorificSupportRelation
  | CopulaElidedNegativeBodyRelation
  | CompositeConnectivePatternRelation
  | ParentheticalSpanRelation
  | MarkerBoundaryRelation;

export type LegacyDebtSignal =
  | "tail_parser_blocked"
  | "legacy_tail";

export const LEGACY_DEBT_SIGNALS = [
  "tail_parser_blocked",
  "legacy_tail"
] as const satisfies readonly LegacyDebtSignal[];

export function isLegacyDebtSignal(value: string): value is LegacyDebtSignal {
  return (LEGACY_DEBT_SIGNALS as readonly string[]).includes(value);
}

export function boundaryRelationCannotUseLegacyDebtKind(kind: string): boolean {
  return !isLegacyDebtSignal(kind);
}
