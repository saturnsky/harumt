export interface ProjectionSpan {
  readonly start: number;
  readonly end: number;
}

export interface ProjectionSourceSpan<Token = unknown> extends ProjectionSpan {
  readonly tokens: readonly Token[];
}

export interface DeterministicProjection {
  readonly kind: "deterministic";
  readonly korean: string;
}

export interface ProjectionCandidate {
  readonly id: string;
  readonly korean?: string;
  readonly evidence?: readonly string[];
  readonly selectors?: readonly ProjectionCandidateSelector[];
}

export interface ProjectionCandidateSelector {
  readonly kind:
    | "head"
    | "head_modifier"
    | "following_token"
    | "following_sequence"
    | "following_predicate"
    | "preceding_token"
    | "preceding_sequence"
    | "following_boundary"
    | "preceding_boundary"
    | "following_noun_phrase";
  readonly window?: number;
  readonly start?: "next" | "any";
  readonly scope?: ProjectionEvidenceScope;
  readonly head?: ProjectionTokenSelector;
  readonly token?: ProjectionTokenSelector;
  readonly sequence?: readonly ProjectionTokenSelector[];
  readonly boundary?: ProjectionBoundarySelector;
  readonly predicate?: ProjectionPredicateSelector;
  readonly modifier?: ProjectionHeadModifierSelector;
}

export type ProjectionEvidenceScope =
  | "same_clause"
  | "cross_weak_punctuation"
  | "adjacent_token";

export const PROJECTION_EVIDENCE_SCOPES = [
  "same_clause",
  "cross_weak_punctuation",
  "adjacent_token"
] as const satisfies readonly ProjectionEvidenceScope[];

export type ProjectionHeadModifierKind =
  | "relative_clause"
  | "no_particle"
  | "content_modifier"
  | "exemplification";

export const PROJECTION_HEAD_MODIFIER_KINDS = [
  "relative_clause",
  "no_particle",
  "content_modifier",
  "exemplification"
] as const satisfies readonly ProjectionHeadModifierKind[];

export interface ProjectionHeadModifierSelector {
  readonly kinds?: readonly ProjectionHeadModifierKind[];
}

export type ProjectionTokenSemanticClass =
  | "animate_referent"
  | "human_collective"
  | "human_referent"
  | "person_count"
  | "quantity_measure"
  | "place_noun"
  | "place_scope_noun"
  | "instrument_noun"
  | "role_noun"
  | "time_argument"
  | "adverb_capable_nominal"
  | "occasion_action_event_noun";

export const PROJECTION_TOKEN_SEMANTIC_CLASSES = [
  "animate_referent",
  "human_collective",
  "human_referent",
  "person_count",
  "quantity_measure",
  "place_noun",
  "place_scope_noun",
  "instrument_noun",
  "role_noun",
  "time_argument",
  "adverb_capable_nominal",
  "occasion_action_event_noun"
] as const satisfies readonly ProjectionTokenSemanticClass[];

export type ProjectionBoundaryClass =
  | "weak_punctuation"
  | "detached_separation";

export const PROJECTION_BOUNDARY_CLASSES = [
  "weak_punctuation",
  "detached_separation"
] as const satisfies readonly ProjectionBoundaryClass[];

export interface ProjectionBoundarySelector {
  readonly classes?: readonly ProjectionBoundaryClass[];
}

export interface ProjectionPredicateSelector {
  readonly voice?: readonly string[];
  readonly connectiveRole?: readonly string[];
  readonly hasNegative?: boolean;
  readonly hasCausative?: boolean;
  readonly hasCausativePassive?: boolean;
  readonly hasRequestTail?: boolean;
  readonly hasBenefactiveTail?: boolean;
  readonly head?: ProjectionTokenSelector;
  readonly sourcePredicateShape?: readonly string[];
  readonly owner?: "layout" | "topic_clause" | "any";
}

export type ProjectionLookupSpec =
  | string
  | readonly string[]
  | {
      readonly sets?: string | readonly string[];
      readonly extras?: readonly string[];
      readonly exclude?: readonly string[];
    };

export interface ProjectionTokenSelector {
  readonly surface?: readonly string[];
  readonly dictionaryForm?: readonly string[];
  readonly lookup?: ProjectionLookupSpec;
  readonly semantic?: readonly ProjectionTokenSemanticClass[];
  readonly pos0?: readonly string[];
  readonly pos1?: readonly string[];
  readonly pos4?: readonly string[];
  readonly pos5?: readonly string[];
}

export interface CandidateSetProjection<Candidate extends ProjectionCandidate = ProjectionCandidate> {
  readonly kind: "candidateSet";
  readonly candidates: readonly Candidate[];
  readonly defaultCandidateId: string;
  readonly warnOnDefault?: boolean;
}

export type PredicateProjectionKind =
  | "attributive_nominalizer"
  | "quoted_nominalizer"
  | "gerund_nominalizer"
  | "host_bearing_likeness"
  | "nominal_head";

export interface ClauseRoleEnvelope<
  Boundary,
  ClauseIR,
  Layout = unknown
> {
  readonly clauseIndex: number;
  readonly tokenSpan: ProjectionSpan;
  readonly contentSpan: ProjectionSpan;
  readonly predicateTokenIdx: number;
  readonly outgoingBoundary: Boundary;
  readonly peerClauses?: readonly ClauseIR[];
  readonly layout?: Layout;
}

export interface PredicateProjectionHost<
  Root,
  Boundary,
  ClauseIR,
  Token = unknown,
  Layout = unknown,
  Grammar = unknown,
  HostWarning = unknown
> extends ClauseRoleEnvelope<Boundary, ClauseIR, Layout> {
  readonly kind: "predicateProjectionHost";
  readonly projection: PredicateProjectionKind;
  readonly root: Root;
  readonly sourceTokens?: readonly Token[];
  readonly commitmentGrammar?: Grammar;
  readonly source: ProjectionSourceSpan<Token>;
  readonly warnings: readonly HostWarning[];
}
