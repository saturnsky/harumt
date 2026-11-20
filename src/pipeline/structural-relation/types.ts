import type { RenderPlan } from "../../types/render-plan.js";
import type { QuoteBoundaryFocusParticle, RequestQuoteTailKind, SfpNode } from "../head-tail/tail/predicate-root/grammar.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import type { LookupTables } from "../lookup-tables.js";
import type { ContentMap } from "../particles/index.js";

export type StructuralRelationRegister = "casual" | "formal";

export type ClauseProjectionForm =
  | "terminal"
  | "connective"
  | "adversative"
  | "reason"
  | "attributive"
  | "nominalized"
  | "listing"
  | "purpose_attributive"
  | "correlative_degree";

export type StructuralRelationConfidence = "strict" | "probable" | "weak";

export type StructuralRelationTargetSlot =
  | "clause_prefix"
  | "noun_modifier"
  | "coordination"
  | "sentence_suffix";

export type StructuralRelationTargetKind = "clause" | "noun_phrase";

export type StructuralRelationSource = "structural_relation_owner";

export type StructuralRelationLayoutBoundaryPolicy = "normal" | "shield_span" | "no_split_inside";

export type ConnectiveStructuralRelationKind =
  | "concession"
  | "correlative_degree"
  | "listing_example"
  | "purpose_modifier"
  | "reason"
  | "simultaneous_progression";
export const CONNECTIVE_STRUCTURAL_RELATION_KIND_VALUES = [
  "concession",
  "correlative_degree",
  "listing_example",
  "purpose_modifier",
  "reason",
  "simultaneous_progression"
] as const satisfies readonly ConnectiveStructuralRelationKind[];

export type ClauseRenderHandleOwner =
  | "head_tail"
  | "assembler"
  | "functional_fallback";

export interface StructuralRelationTokenSpan {
  readonly start: number;
  readonly endExclusive: number;
}

export type StructuralAnchor =
  | {
      readonly kind: "clause";
      readonly clauseId: string;
      readonly span: StructuralRelationTokenSpan;
      readonly predicateIdx: number | null;
    }
  | {
      readonly kind: "predicate";
      readonly predicateIdx: number;
      readonly clauseId: string | null;
      readonly span: StructuralRelationTokenSpan;
    }
  | {
      readonly kind: "span";
      readonly span: StructuralRelationTokenSpan;
      readonly clauseId: string | null;
    }
  | {
      readonly kind: "noun_phrase";
      readonly span: StructuralRelationTokenSpan;
      readonly headIdx: number | null;
    };

export interface StructuralRelationNode {
  readonly id: string;
  readonly span: StructuralRelationTokenSpan;
  readonly kind: "main" | "subordinate" | "relative";
  readonly predicateIndex: number | null;
  readonly renderHandle: ClauseRenderHandle | null;
  readonly contentSpanId: string | null;
}

export interface StructuralRelationMarkerSpan extends StructuralRelationTokenSpan {
  readonly surface: string;
  readonly role?: string;
}

export interface StructuralRelationTargetSpan extends StructuralRelationTokenSpan {
  readonly kind: StructuralRelationTargetKind;
}

export interface StructuralRelationSuppressibleTokenSpan extends StructuralRelationTokenSpan {
  readonly reason: string;
}

export interface ClauseProjectionRequest {
  readonly sourceForm: ClauseProjectionForm;
  readonly connectiveKind?: string;
  readonly targetSlot?: StructuralRelationTargetSlot;
}

export interface ClauseProjectionContext {
  readonly register: StructuralRelationRegister;
}

export interface ClauseProjectionFragment {
  readonly text: string;
  readonly registerScope: "current_register";
}

export type ClauseProjectionResult =
  | { readonly ok: true; readonly fragment: ClauseProjectionFragment }
  | { readonly ok: false; readonly reason: string };

export interface ClauseRenderHandle {
  readonly sourceSpan: StructuralRelationTokenSpan;
  readonly owner: ClauseRenderHandleOwner;
  readonly renderPlan: RenderPlan | null;
  renderAs(
    request: ClauseProjectionRequest,
    context: ClauseProjectionContext,
  ): ClauseProjectionResult;
}

export type StructuralQuoteContentSlotKind = "wish_content" | "quoted_content" | "question_content" | "request_content";
export const STRUCTURAL_QUOTE_CONTENT_SLOT_KIND_VALUES = [
  "wish_content",
  "quoted_content",
  "question_content",
  "request_content"
] as const satisfies readonly StructuralQuoteContentSlotKind[];
export type StructuralQuoteBridgeKind = "punctuation" | "time_adverb_punctuation";

export interface StructuralQuoteHostPayload {
  readonly kind: string;
  readonly hostForm: string;
  readonly hostIdx: number;
  readonly supportIdx: number | null;
  readonly requestReportingRole?: "speech";
}

export interface StructuralQuoteMarkerPayload {
  readonly markerIdx: number;
  readonly markerSurface: string;
  readonly markerSpan: StructuralRelationTokenSpan;
  readonly markerBaseSurface: string;
}

export interface StructuralQuoteRequestPayload {
  readonly kind: "benefactive_request" | "directive_request";
  readonly politenessEvidence: { readonly polite: boolean; readonly honorific: boolean } | null;
  readonly tailKind: RequestQuoteTailKind | null;
}

export interface StructuralQuotePayload extends StructuralQuoteMarkerPayload {
  readonly questionBoundarySpan: StructuralRelationTokenSpan | null;
  readonly focusParticle?: QuoteBoundaryFocusParticle;
  readonly contentSpan: StructuralRelationTokenSpan;
  readonly explicitQuotation?: boolean;
  readonly hostPredicateIdx: number;
  readonly hostTokenIdx: number;
  readonly hostMatch: StructuralQuoteHostPayload;
  readonly slotKind: StructuralQuoteContentSlotKind;
  readonly markerRealization?: "exemplification";
  readonly contentForce?: "question";
  readonly questionBoundaryKind?: string;
  readonly request?: StructuralQuoteRequestPayload;
  readonly bridgeKind: StructuralQuoteBridgeKind | null;
  readonly terminalSfp?: SfpNode | null;
  readonly terminalSfpMarkerBridgeSpan?: StructuralRelationTokenSpan | null;
  readonly contentPredicateIdx?: number | null;
  readonly contentPredicateAnchorKind?: "zero_copula_nominal" | "interrogative_head";
  readonly markerAbsorbedContentCopulaIdx?: number;
  readonly conditionalContent?: {
    readonly tokenIdx: number;
    readonly subtype: "affirmative_wish" | "conditional";
  };
}

export type StructuralTariListingClosure =
  | { readonly kind: "explicit_predicate"; readonly predicateIdx: number }
  | { readonly kind: "following_clause"; readonly clauseId: string }
  | {
    readonly kind: "attributive_quote";
    readonly markerSpan: StructuralRelationMarkerSpan;
    readonly headIdx: number;
  }
  | { readonly kind: "sentence_fragment" };

export interface StructuralTariListingItem {
  readonly source: StructuralAnchor;
  readonly markerSpan: StructuralRelationMarkerSpan;
}

export interface StructuralTariListingPayload {
  readonly itemAnchors: readonly StructuralTariListingItem[];
  readonly markerSpans: readonly StructuralRelationMarkerSpan[];
  readonly separatorSpans: readonly StructuralRelationMarkerSpan[];
  readonly itemIndex: number;
  readonly closure: StructuralTariListingClosure;
}

export type StructuralKaParallelItemKind =
  | "bare_nominal"
  | "na_adjectival_nominal"
  | "predicate_question"
  | "nominalized_question"
  | "negative_alternative";

export type StructuralKaParallelTerminalPunctuation = "question" | "exclamation" | "period" | null;
export type StructuralKaParallelTerminalPunctuationTrait = "question" | "exclamation";
export type StructuralKaParallelTerminalPunctuationUnit = "question" | "exclamation" | "period";

export type StructuralKaParallelClosure =
  | { readonly kind: "question_taking_host"; readonly predicateIdx: number }
  | {
    readonly kind: "attributive_quote";
    readonly markerSpan: StructuralRelationMarkerSpan;
    readonly headIdx: number;
    readonly realization: "light_koto" | "appositive" | "pronominal_no";
    readonly particleSpan?: StructuralRelationMarkerSpan;
    readonly particleSurface?: "が" | "は" | "を" | "に" | "で" | "も" | "と";
  }
  | { readonly kind: "terminal_fragment" };

export interface StructuralKaParallelItem {
  readonly source: StructuralAnchor;
  readonly markerSpan: StructuralRelationMarkerSpan;
  readonly itemKind: StructuralKaParallelItemKind;
  readonly predicateIdx: number | null;
  readonly predicateCategory: "nominal" | "predicate";
}

export interface StructuralKaParallelPayload {
  readonly itemAnchors: readonly StructuralKaParallelItem[];
  readonly markerSpans: readonly StructuralRelationMarkerSpan[];
  readonly separatorSpans: readonly StructuralRelationMarkerSpan[];
  readonly itemKind: StructuralKaParallelItemKind;
  readonly terminalPunctuation: StructuralKaParallelTerminalPunctuation;
  readonly terminalPunctuationTraits: readonly StructuralKaParallelTerminalPunctuationTrait[];
  readonly terminalPunctuationRun: readonly StructuralKaParallelTerminalPunctuationUnit[];
  readonly closure: StructuralKaParallelClosure;
  readonly hasDiscourseChoiceSeparator: boolean;
  readonly matrixQuestionItems: boolean;
  readonly terminalOwnerBoundary?: "matrix_terminal_question" | "question_reformulation";
}

export interface StructuralEmbeddedQuestionAttributiveQuotePayload {
  readonly item: StructuralKaParallelItem;
  readonly closure: Extract<StructuralKaParallelClosure, { readonly kind: "attributive_quote" }>;
}

export type StructuralNariParallelItemKind = "nominal" | "predicate";

export interface StructuralNariParallelItem {
  readonly source: StructuralAnchor;
  readonly markerSpan: StructuralRelationMarkerSpan;
  readonly itemKind: StructuralNariParallelItemKind;
  readonly predicateIdx: number | null;
}

export interface StructuralNariParallelPayload {
  readonly itemAnchors: readonly StructuralNariParallelItem[];
  readonly markerSpans: readonly StructuralRelationMarkerSpan[];
  readonly separatorSpans: readonly StructuralRelationMarkerSpan[];
  readonly itemKind: StructuralNariParallelItemKind;
  readonly trailingParticleSpan?: StructuralRelationMarkerSpan | null;
}

export interface StructuralTokaNominalListingPayload {
  readonly itemAnchors: readonly StructuralAnchor[];
  readonly separatorSpans: readonly StructuralRelationMarkerSpan[];
  readonly trailingParticleSpan: StructuralRelationMarkerSpan | null;
  readonly closure: "closed" | "continues";
}

export interface StructuralPurposeClauseCoordinationPayload {
  readonly sourcePredicateIdx: number;
  readonly purposeMarkerSpan: StructuralRelationMarkerSpan;
  readonly coordinationMarkerSpan: StructuralRelationMarkerSpan;
  readonly targetPurposeMarkerSpan: StructuralRelationMarkerSpan;
}

export type StructuralSourcePredicateOperatorKind =
  | "potential_koto_ga_dekiru"
  | "sahen_causative"
  | "sahen_te_connective";

export interface StructuralSourcePredicateOperatorPayload {
  readonly operatorKind: StructuralSourcePredicateOperatorKind;
  readonly sourcePredicateIdx: number;
  readonly supportIdx: number | null;
  readonly operatorIdx: number;
}

export type StructuralReasonCopulaSfpEffect = "ne" | "na_excl" | "jan" | "yone_confirm" | "explanatory";

export interface StructuralReasonCopulaSfp {
  readonly effect: StructuralReasonCopulaSfpEffect | null;
  readonly surface: string;
}

export interface StructuralReasonCopulaPayload {
  readonly negative: boolean;
  readonly polite: boolean;
  readonly past: boolean;
  readonly connective: boolean;
  readonly additiveMo: boolean;
  readonly conditionalNara: boolean;
  readonly conjecture: { readonly polite: boolean } | null;
  readonly sfp: StructuralReasonCopulaSfp | null;
}

export type StructuralRelationKind =
  | ConnectiveStructuralRelationKind
  | StructuralQuoteContentSlotKind
  | "embedded_question_attributive_quote"
  | "immediate_sequence"
  | "ka_parallel_choice"
  | "ka_parallel_question_content"
  | "nari_parallel_choice"
  | "toka_nominal_listing"
  | "punctuated_attributive_modifier"
  | "purpose_clause_coordination"
  | "reason_copula_explanation"
  | "source_predicate_operator"
  | "tari_listing_coordination"
  | "te_attendant_simultaneous"
  | "toka_parallel_listing"
  | "stative_hold_sequence";
export const STRUCTURAL_RELATION_KIND_VALUES = [
  ...CONNECTIVE_STRUCTURAL_RELATION_KIND_VALUES,
  ...STRUCTURAL_QUOTE_CONTENT_SLOT_KIND_VALUES,
  "embedded_question_attributive_quote",
  "immediate_sequence",
  "ka_parallel_choice",
  "ka_parallel_question_content",
  "nari_parallel_choice",
  "toka_nominal_listing",
  "punctuated_attributive_modifier",
  "purpose_clause_coordination",
  "reason_copula_explanation",
  "source_predicate_operator",
  "tari_listing_coordination",
  "te_attendant_simultaneous",
  "toka_parallel_listing",
  "stative_hold_sequence"
] as const satisfies readonly StructuralRelationKind[];

type _StructuralRelationInventoryExhaustive<Universe, Members extends Universe> =
  [Universe] extends [Members] ? true : never;

const _connectiveStructuralRelationKindCoverage: _StructuralRelationInventoryExhaustive<
  ConnectiveStructuralRelationKind,
  (typeof CONNECTIVE_STRUCTURAL_RELATION_KIND_VALUES)[number]
> = true;
const _structuralQuoteContentSlotKindCoverage: _StructuralRelationInventoryExhaustive<
  StructuralQuoteContentSlotKind,
  (typeof STRUCTURAL_QUOTE_CONTENT_SLOT_KIND_VALUES)[number]
> = true;
const _structuralRelationKindCoverage: _StructuralRelationInventoryExhaustive<
  StructuralRelationKind,
  (typeof STRUCTURAL_RELATION_KIND_VALUES)[number]
> = true;

export interface StructuralNominalExemplificationPayload {
  readonly contentSpan: StructuralRelationTokenSpan;
  readonly quoteMarkerSpan: StructuralRelationTokenSpan;
  readonly hostIdx: number;
  readonly exemplificationMarkerSpan: StructuralRelationTokenSpan | null;
}

export interface StructuralRelation {
  readonly kind: StructuralRelationKind;
  readonly source: StructuralAnchor;
  readonly target: StructuralAnchor | null;
  readonly markerSpans: readonly StructuralRelationMarkerSpan[];
  readonly candidateSuppressibleTokenSpans?: readonly StructuralRelationSuppressibleTokenSpan[];
  readonly projection: ClauseProjectionRequest;
  readonly confidence: StructuralRelationConfidence;
  readonly layoutBoundaryPolicy?: StructuralRelationLayoutBoundaryPolicy;
  readonly renderEnabledByDefault?: boolean;
  readonly quote?: StructuralQuotePayload;
  readonly tariListing?: StructuralTariListingPayload;
  readonly kaParallel?: StructuralKaParallelPayload;
  readonly embeddedQuestionAttributiveQuote?: StructuralEmbeddedQuestionAttributiveQuotePayload;
  readonly nariParallel?: StructuralNariParallelPayload;
  readonly tokaNominalListing?: StructuralTokaNominalListingPayload;
  readonly purposeClauseCoordination?: StructuralPurposeClauseCoordinationPayload;
  readonly sourcePredicateOperator?: StructuralSourcePredicateOperatorPayload;
  readonly reasonCopula?: StructuralReasonCopulaPayload;
  readonly nominalExemplification?: StructuralNominalExemplificationPayload;
  readonly provenance: StructuralRelationSource;
}

export interface StructuralRelationGraph {
  readonly nodes: readonly StructuralRelationNode[];
  readonly relations: readonly StructuralRelation[];
  readonly diagnostics: readonly StructuralRelationDiagnostic[];
}

export type StructuralRelationDiagnosticName =
  | "structural_relation_degraded"
  | "layout_blocker"
  | "relation_conflict"
  | "projection_unavailable";

export type StructuralRelationDiagnosticSeverity = "info" | "warning" | "error";

export interface StructuralRelationDiagnostic {
  readonly name: StructuralRelationDiagnosticName;
  readonly severity: StructuralRelationDiagnosticSeverity;
  readonly message: string;
  readonly relationKind?: string;
  readonly confidence?: StructuralRelationConfidence;
  readonly layoutBoundaryPolicy?: StructuralRelationLayoutBoundaryPolicy;
  readonly clauseId?: string;
  readonly span?: StructuralRelationTokenSpan;
  readonly markerSpans?: readonly StructuralRelationMarkerSpan[];
}

export interface BuildStructuralRelationGraphOptions {
  readonly tokens: readonly ClauseToken[];
  readonly layout: ClauseLayout;
  readonly contentMap: ContentMap;
  readonly lookups: LookupTables;
}
