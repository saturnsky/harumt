import type { LexicalAdverbialAffiliation } from "./lexical-adverbial-affiliation.js";
import type { RenyouVerbReadingFacts } from "./renyou-verb-reading.js";
import type { ChuushiClosureEvidence } from "./chuushi-closure.js";
import type { WhitespaceAttributiveReadingLicenseKind, TransparentPauseRunEvidence } from "./juncture-verdict.js";
import type { SeparationEvidence } from "../../types/token.js";

export type BoundaryKind = "punctuation" | "connective" | "attributive";
export type AttributiveStemProjection = "renyou_compound_prenominal";
export type ClauseKind = "main" | "subordinate" | "relative";
export type PredicateSpeechActScope = "matrix" | "quoted_content" | "unresolved";
export type QuoteSpanLabel = "nominal_quote" | "full_quote_island" | "marked_predicate" | "emphasis_or_style" | "malformed_or_nested_unclear" | "unknown";
export type QuoteSpanConfidence = "high" | "medium" | "low";
export type MarkedPredicateKind = "sahen_action_noun" | "verb_or_stem" | "adjective_or_mimetic" | "state_clause" | "nominalized_predicate" | "unknown";
export type ToiuNounShape = "none" | "nominal_like" | "subject_predicate" | "case_predicate" | "predicate_no_case" | "case_no_predicate" | "other";
export type QuoteTailKind = "none" | "to_safe_reporting" | "to_thought" | "to_other" | "toiu_noun" | "wo" | "ga_ha_mo" | "no" | "toshite" | "other_particle" | "other";
export type NominalizingTailKind = "none" | "dake" | "no_ga" | "no_wa" | "koto" | "other";
export type InternalPredicatePosClass = "none" | "verb" | "adjective" | "mimetic_or_adverb" | "nounish" | "mixed";
export type SpanLengthBucket = "1_3" | "4_8" | "9_plus";

export interface ClauseToken {
  surface: string;
  dictionaryForm: string;
  pos: number;
  readonly whitespaceBefore?: SeparationEvidence;
  readonly transparentPauseAfter?: boolean;
  readonly transparentPauseRunAfter?: TransparentPauseRunEvidence;
  readonly sourceOrdinal?: number;
  readonly sourceSpan?: {
    readonly startOrdinal: number;
    readonly endOrdinal: number;
  } | null;
}

export interface LexicalParticleBoundaryClaim {
  readonly headIdx: number;
  readonly particleIdx: number;
  readonly particle: string;
  readonly kind: string;
  readonly followingRequestOrImperative?: boolean;
}

export interface ClauseBoundaryDetectionOptions {
  readonly lexicalParticleBoundaryClaims?: readonly LexicalParticleBoundaryClaim[];
  readonly lexicalRenyouHeadClaims?: LexicalRenyouHeadClaims;
  readonly lexicalNominalHeadClaims?: LexicalNominalHeadClaims;
  readonly lexicalAdverbialAffiliationOverrides?: ReadonlyMap<number, LexicalAdverbialAffiliation>;
  readonly renyouVerbReadings?: RenyouVerbReadingFacts;
  readonly whitespaceAttributiveReadings?: ReadonlyMap<number, WhitespaceAttributiveReadingInput>;
  readonly tokenSpace?: TokenSpaceSourceContext;
}

export interface WhitespaceAttributiveReadingInput {
  readonly leftIdx: number;
  readonly headIdx: number;
  readonly witness: { readonly kind: WhitespaceAttributiveReadingLicenseKind };
}

export interface TokenSpaceSourceContext {
  readonly embeddedTokenSpace?: boolean;
  readonly removedIslandSourceOrdinals?: readonly number[];
  readonly enclosingDelimiter?: EnclosingDelimiterKind;
}

export type EnclosingDelimiterKind = "parenthetical" | "annotation";

export interface LexicalRenyouHeadClaims {
  readonly nonPredicateHeads: ReadonlySet<number>;
  readonly registeredCompoundV1s: ReadonlySet<number>;
  readonly lexicalNounCompoundEnds: ReadonlyMap<number, number>;
}

export interface LexicalNominalHeadClaims {
  adnominalNoRelationSlotAccepts(headIdx: number, hostIdx: number): boolean;
  adnominalHeadBearerSlotAccepts(hostIdx: number, headIdx: number): boolean;
  predicateSenseDeclaredAt(hostIdx: number): boolean;
}

export interface ClauseNominalClosureAnchor {
  readonly span: {
    readonly start: number;
    readonly endExclusive: number;
  };
  readonly headIdx: number;
  readonly modifierPredicateIndices: readonly number[];
}

export interface ClauseNominalHeadAnchor<T extends ClauseToken = ClauseToken> {
  readonly tokenIdx: number;
  readonly sourceToken: T;
  readonly headToken: T;
}

export type PredicateArgumentRole = "subject_topic" | "theme_topic" | "oblique_topic" | "prefixed_focus" | "object" | "other";

export interface PredicateArgumentRoleAssignment {
  readonly particleIdx: number;
  readonly role: PredicateArgumentRole;
}
export class ClauseBoundaryEvent {
  constructor(
    readonly splitAt: number,
    readonly kind: BoundaryKind,
    readonly pairedConcessive?: PairedVolitionalConcessiveEvidence,
    readonly attributiveModifierChainHeadIdx?: number,
    readonly attributiveStemProjection?: "renyou_compound_prenominal",
    readonly chuushiClosure?: ChuushiClosureEvidence
  ) { }
}

export interface PairedVolitionalConcessiveEvidence {
  readonly kind: "paired_volitional_concessive";
  readonly lemma: string;
  readonly positivePredicateIdx: number;
  readonly positiveInflectionIdx: number;
  readonly firstMarkerIdx: number;
  readonly negativePredicateIdx: number;
  readonly negativeInflectionIdx: number;
  readonly negativeAuxIdx: number;
  readonly secondMarkerIdx: number;
}

export type DemoDiscourseLeftBoundaryEvidenceKind =
  | "terminal_question_ka"
  | "question_ka_choice"
  | "speaker_label"
  | "detached_vocative"
  | "pause_traversed_onset";

export interface DemoDiscourseLeftBoundaryEvidence {
  readonly kind: "demo_discourse_left_boundary";
  readonly boundaryKind: DemoDiscourseLeftBoundaryEvidenceKind;
  readonly markerIdx: number;
  readonly connectiveIdx: number;
}

export interface HardTerminalEllipsisRunEvidence {
  readonly kind: "hard_terminal_ellipsis_run";
  readonly span: { readonly start: number; readonly endExclusive: number };
  readonly runOrdinal: number;
}

export interface AnaphoricConjectureSelfQuestionEvidence {
  readonly kind: "anaphoric_conjecture_self_question";
  readonly markerIdx: number;
  readonly punctuationIdx: number;
}

export interface ProjectionEvidenceClause {
  readonly start: number;
  readonly end: number;
  readonly kind: ClauseKind;
  readonly parentIdx: number | null;
}

export interface ProjectionEvidenceLayout {
  clauseIndexOfToken(tokenIdx: number): number;
  clauseOfToken(tokenIdx: number): ProjectionEvidenceClause | undefined;
}

export type TailReachClamp = "clause_end" | "clause_pause" | "utterance_close" | "balanced_span";

export interface TailReachEvidence {
  readonly endExclusive: number;
  readonly clampedBy: TailReachClamp;
}
