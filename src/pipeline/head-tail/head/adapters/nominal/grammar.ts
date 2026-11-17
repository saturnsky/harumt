import type { IrregularType } from "../../../../../generator/conjugator.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { Warning } from "../../../../../types/warning.js";
import type { ClauseLayout, ProjectionEvidenceLayout } from "../../../../clause-layout/index.js";
import type { ContextGrammar } from "../../../../context.js";
import type {
  CandidateSetProjection,
  DeterministicProjection,
  PredicateProjectionHost,
  ProjectionCandidate,
  ProjectionCandidateSelector,
  ProjectionSourceSpan,
  ProjectionTokenSelector
} from "../../../grammar.js";
import type { ClauseBoundary, ClauseTailIR } from "../../../tail/predicate-root/commit.js";
import type { AuxOpNode, TailRoot, YoudaForm, YoudaTerminal } from "../../../tail/predicate-root/grammar.js";
import type { ParticleKey } from "../../../../../generator/particles.js";
import type { MorphemeEntry } from "../../../../../types/dictionary.js";
import { 명사, 조사, 형용사, 구 } from "../../../../../types/pos.js";

export type NominalFrameKind =
  | "about"
  | "regarding"
  | "toward"
  | "standpoint"
  | "by_or_depending"
  | "evidential_source"
  | "according_to"
  | "as_role"
  | "domain"
  | "scope_range"
  | "comparative_standard"
  | "addition"
  | "basis"
  | "substitution"
  | "degree_extent"
  | "alternative_choice"
  | "extreme_topic"
  | "situated_topic"
  | "procedure_sequence"
  | "parallel_activity"
  | "purpose_reason"
  | "cause_benefit"
  | "manner_reference"
  | "category_member"
  | "nominal_modifier"
  | "apposition"
  | "definition_topic"
  | "identity_exclusion"
  | "lexical_particle"
  | "host_bearing_likeness"
  | "productive_adjectival_suffix"
  | "renyou_nominal_head"
  | "occasion";

export type NominalFrameFocus = "は" | "も" | "の" | "に" | null;
export type NominalFrameOwnerMode = "marker_adapter" | "phrase_owner";

export const NOMINAL_FRAME_KINDS = [
  "about",
  "regarding",
  "toward",
  "standpoint",
  "by_or_depending",
  "evidential_source",
  "according_to",
  "as_role",
  "domain",
  "scope_range",
  "comparative_standard",
  "addition",
  "basis",
  "substitution",
  "degree_extent",
  "alternative_choice",
  "extreme_topic",
  "situated_topic",
  "procedure_sequence",
  "parallel_activity",
  "purpose_reason",
  "cause_benefit",
  "manner_reference",
  "category_member",
  "nominal_modifier",
  "apposition",
  "definition_topic",
  "identity_exclusion",
  "lexical_particle",
  "host_bearing_likeness",
  "productive_adjectival_suffix",
  "renyou_nominal_head",
  "occasion"
] as const satisfies readonly NominalFrameKind[];

export const NOMINAL_FRAME_FOCUS_VALUES = ["は", "も", "の", "に", null] as const satisfies readonly NominalFrameFocus[];
export const NOMINAL_FRAME_OWNER_MODE_VALUES = ["marker_adapter", "phrase_owner"] as const satisfies readonly NominalFrameOwnerMode[];

export type NominalSourceSpan = ProjectionSourceSpan<RuntimeHaruToken>;

export type NominalHeadAllomorphHintSource =
  | "assembler_previous_unit"
  | "test_fixture";

export interface NominalHeadAllomorphHint {
  readonly korean: string;
  readonly source: NominalHeadAllomorphHintSource;
  readonly canonicalKorean?: string;
  readonly koreanPos?: number;
}

export interface NominalHeadLexicalForms {
  readonly kaForm?: string;
}

export interface NominalHead {
  readonly kind: "token";
  readonly tokenIndex: number;
  readonly token: RuntimeHaruToken;
  readonly selectorToken?: RuntimeHaruToken;
  readonly source?: NominalSourceSpan;
  readonly allomorphHint?: NominalHeadAllomorphHint | null;
  readonly lexicalForms?: NominalHeadLexicalForms;
}

export type DeterministicNominalProjection = DeterministicProjection & {
  readonly particleStem?: string;
};

export interface ParticleNominalProjection {
  readonly kind: "particle";
  readonly particleKey: ParticleKey;
  readonly suffix?: string;
}

export interface NegativeCopulaPredicateNominalProjection {
  readonly kind: "negativeCopulaPredicate";
  readonly prefix: string;
  readonly polite: boolean;
  readonly past: boolean;
}

export interface HostSuffixNominalProjection {
  readonly kind: "hostSuffix";
  readonly suffix: string;
}

export interface HeadLexicalFormNominalProjection {
  readonly kind: "headLexicalForm";
  readonly field: keyof NominalHeadLexicalForms;
  readonly fallback: "host_bare";
}

export type CandidateNominalProjectionValue =
  | DeterministicNominalProjection
  | ParticleNominalProjection
  | NegativeCopulaPredicateNominalProjection
  | HostSuffixNominalProjection;

export interface CandidateNominalProjectionCandidate extends ProjectionCandidate {
  readonly korean?: string;
  readonly particleStem?: string;
  readonly projection?: CandidateNominalProjectionValue;
  readonly requiresNominalHost?: boolean;
}

export interface CandidateNominalProjection extends CandidateSetProjection<CandidateNominalProjectionCandidate> {
  readonly quotedClauseHostDefaultCandidateId?: string;
}

export type NominalFrameProjection =
  | DeterministicNominalProjection
  | CandidateNominalProjection
  | ParticleNominalProjection
  | NegativeCopulaPredicateNominalProjection
  | HostSuffixNominalProjection
  | HeadLexicalFormNominalProjection;

export interface NominalFrame {
  readonly kind: "nominalFrame";
  readonly id: string;
  readonly frameKind: NominalFrameKind;
  readonly markerSurface: string;
  readonly projection: NominalFrameProjection;
  readonly outputPos?: KoreanNominalBase["koreanPos"];
  readonly focus: NominalFrameFocus;
  readonly ownerMode?: NominalFrameOwnerMode;
  readonly ownerArbitration?: NominalFrameOwnerArbitrationPolicy;
  readonly predicatePreference?: NominalFramePredicatePreference;
  readonly requiresFollowingContent?: boolean;
  readonly attachLeft?: boolean;
  readonly source: NominalSourceSpan;
}

export interface NominalFrameOwnerArbitrationPolicy {
  readonly predicateNominalNoLexicalParticle?: boolean;
  readonly whIndefiniteKaOwnership?: boolean;
  readonly uncertainCauseKaOwnership?: boolean;
  readonly ownsKaMarker?: boolean;
  readonly demoNegativeTail?: boolean;
  readonly standpointPerspectiveTail?: boolean;
  readonly externalNominalizerPredicate?: boolean;
  readonly transparentPauseDiscourseBoundary?: boolean;
  readonly boundNominalReasonContinuation?: boolean;
  readonly markerVerbOwnsObjectArgument?: boolean;
  readonly ownedPredicateChainContinuation?: {
    readonly rejectSourceSurfaces?: readonly string[];
    readonly rejectPrecedingSurfaces?: readonly string[];
    readonly rejectPrecedingWindow?: number;
  };
}

export interface NominalFramePredicatePreference {
  readonly kind: "stem_candidate";
  readonly predicate?: ProjectionTokenSelector;
  readonly candidateKorean: readonly string[];
  readonly reason?: string;
}

export interface NominalPhraseNode {
  readonly kind: "nominalPhrase";
  readonly head: NominalHead;
  readonly frames: readonly NominalFrame[];
  readonly source: NominalSourceSpan;
}

export type PredicateNominalProjectionHost = PredicateProjectionHost<
  TailRoot,
  ClauseBoundary,
  ClauseTailIR,
  RuntimeHaruToken,
  ClauseLayout,
  ContextGrammar,
  Warning
>;

export interface PredicateNominalHostNode {
  readonly kind: "predicateNominalHost";
  readonly host: PredicateNominalProjectionHost;
  readonly nominalizer: {
    readonly kind: "no" | "koto" | "mono" | "tame" | "quote";
    readonly surface: string;
    readonly source: NominalSourceSpan;
  };
  readonly frames: readonly NominalFrame[];
  readonly source: NominalSourceSpan;
}

export interface NominalHostLikenessProjection {
  readonly kind: "nominalHostLikenessProjection";
  readonly form: YoudaForm;
  readonly terminal: YoudaTerminal;
  readonly source: NominalSourceSpan;
}

export interface NominalHostLikenessContinuationProjection {
  readonly kind: "nominalHostLikenessContinuationProjection";
  readonly ops: readonly AuxOpNode[];
  readonly predicateHost?: PredicateNominalProjectionHost;
  readonly nominalizedAttributive?: true;
  readonly boundary: ClauseBoundary;
  readonly source: NominalSourceSpan;
  readonly warnings: readonly Warning[];
}

export interface NominalHostLikenessQuoteFocusLimitNegationProjection {
  readonly kind: "nominalHostLikenessQuoteFocusLimitNegationProjection";
  readonly form: YoudaForm;
  readonly focusSurface: "は" | "も";
  readonly polite: boolean;
  readonly past: boolean;
  readonly source: NominalSourceSpan;
  readonly warnings: readonly Warning[];
}

export type HostBearingLikenessModal =
  | NominalHostLikenessProjection
  | NominalHostLikenessContinuationProjection
  | NominalHostLikenessQuoteFocusLimitNegationProjection;

export interface HostBearingLikenessFrame {
  readonly kind: "hostBearingLikenessFrame";
  readonly host: NominalPhraseNode;
  readonly modal: HostBearingLikenessModal;
  readonly source: NominalSourceSpan;
}

export interface HostBearingLikenessNode {
  readonly kind: "hostBearingLikeness";
  readonly frame: HostBearingLikenessFrame;
  readonly source: NominalSourceSpan;
}

export type ProductiveAdjectivalSuffixKind = "rashii_typicality" | "ppoi_trait";

export type ProductiveAdjectivalSuffixProjection =
  | {
    readonly kind: "tailRoot";
    readonly root: TailRoot;
  }
  | {
    readonly kind: "adverbial";
    readonly fragment?: boolean;
  }
  | {
    readonly kind: "nominalized";
    readonly nominalizer: {
      readonly surface: string;
      readonly source: NominalSourceSpan;
    };
  };

export interface ProductiveAdjectivalSuffixFrame {
  readonly kind: "productiveAdjectivalSuffixFrame";
  readonly host: NominalPhraseNode;
  readonly suffix: {
    readonly kind: ProductiveAdjectivalSuffixKind;
    readonly surface: string;
    readonly source: NominalSourceSpan;
    readonly koreanLemma: string;
    readonly koreanPos: typeof 형용사;
    readonly irregular: IrregularType | null;
  };
  readonly projection: ProductiveAdjectivalSuffixProjection;
  readonly source: NominalSourceSpan;
}

export interface ProductiveAdjectivalSuffixNode {
  readonly kind: "productiveAdjectivalSuffix";
  readonly frame: ProductiveAdjectivalSuffixFrame;
  readonly source: NominalSourceSpan;
}

export type RenyouNominalHeadEvidence =
  | {
    readonly kind: "derivational_suffix";
    readonly profileId: string;
    readonly suffix: NominalSourceSpan;
  }
  | {
    readonly kind: "noun_compound_suffix";
    readonly profileId: string;
    readonly suffix: NominalSourceSpan;
  }
  | {
    readonly kind: "honorific_prefix";
    readonly prefix: NominalSourceSpan;
  }
  | {
    readonly kind: "honorific_prefix_compound";
    readonly prefix: NominalSourceSpan;
    readonly follower: NominalSourceSpan;
  }
  | {
    readonly kind: "lexical_noun_compound";
    readonly noun: NominalSourceSpan;
  }
  | {
    readonly kind: "bare_case_particle";
    readonly follower: NominalSourceSpan;
  };

export interface RenyouNominalHeadNode {
  readonly kind: "renyouNominalHead";
  readonly host: PredicateNominalProjectionHost;
  readonly evidence: RenyouNominalHeadEvidence;
  readonly lexicalNoun: MorphemeEntry | null;
  readonly source: NominalSourceSpan;
}

export type NominalFrameRoot = NominalPhraseNode | PredicateNominalHostNode;

export type NominalRoot =
  | NominalPhraseNode
  | PredicateNominalHostNode
  | HostBearingLikenessNode
  | ProductiveAdjectivalSuffixNode
  | RenyouNominalHeadNode;

export interface KoreanNominalBase {
  readonly text: string;
  readonly koreanPos: typeof 명사 | typeof 조사 | typeof 구;
}

export interface NominalFrameMatrixKey {
  readonly particle: string;
  readonly verbLemma: string;
  readonly trailingParticle: string;
  readonly fusedVariants?: readonly string[];
}


export type JaHostForm = "taigen" | "rentai" | "shushi" | "renyo" | "adverb";
export const JA_HOST_FORMS = ["taigen", "rentai", "shushi", "renyo", "adverb"] as const satisfies readonly JaHostForm[];

export type TailAttachmentCoercion = "explicit_no" | "explicit_koto" | "synthetic_koto" | "none";
export const TAIL_ATTACHMENT_COERCIONS = ["explicit_no", "explicit_koto", "synthetic_koto", "none"] as const satisfies readonly TailAttachmentCoercion[];

export type TailAttachmentTePolicy = "required" | "optional" | "forbidden";
export const TAIL_ATTACHMENT_TE_POLICIES = ["required", "optional", "forbidden"] as const satisfies readonly TailAttachmentTePolicy[];

export interface TailAttachmentPredicateMatch {
  readonly particle?: string;
  readonly verbLemmas?: readonly string[];
  readonly verbSurfaces?: readonly string[];
  readonly tokenSurfaces?: readonly string[];
  readonly fusedSurfaces?: readonly string[];
  readonly matchBy?: "surface_and_lemma" | "lemma";
  readonly te?: TailAttachmentTePolicy;
  readonly focusAfterTe?: readonly ("は" | "も")[];
}

export type TailAttachmentHostRealization =
  | { readonly kind: "identity"; readonly korean?: string }
  | {
    readonly kind: "predicate_projection";
    readonly coercion: TailAttachmentCoercion;
    readonly connective: string;
    readonly match?: TailAttachmentPredicateMatch;
    readonly nominalClaim?: "arbitrate" | "reject";
    readonly projection?: string;
    readonly suffix?: string;
    readonly korean?: string;
  }
  | { readonly kind: "adverbial"; readonly fallback?: "predicate_adverbialize" }
  | { readonly kind: "reject" };

export type TailAttachmentHostClass = "nominal" | "predicate" | "adverb";
export const TAIL_ATTACHMENT_HOST_CLASSES = ["nominal", "predicate", "adverb"] as const satisfies readonly TailAttachmentHostClass[];

export interface TailAttachmentContract {
  readonly accepts: readonly JaHostForm[];
  readonly hostRealizations: Partial<Record<TailAttachmentHostClass, TailAttachmentHostRealization>>;
}

export interface TailAttachmentDeclaration {
  readonly id: string;
  readonly surface: string;
  readonly attach: TailAttachmentContract;
  readonly description?: string;
}

export interface NominalFrameConsumeFollowingRule {
  readonly head: ProjectionTokenSelector;
  readonly surfaces: readonly string[];
  readonly maxTokens: number;
}

export type NominalFrameConsumeFollowing = readonly NominalFrameConsumeFollowingRule[];

export interface NominalFrameSpec {
  readonly id: string;
  readonly kind: NominalFrameKind;
  readonly surface: string;
  readonly projection: NominalFrameProjection;
  readonly outputPos?: KoreanNominalBase["koreanPos"];
  readonly head?: ProjectionTokenSelector;
  readonly markerTokens?: readonly ProjectionTokenSelector[];
  readonly match?: readonly ProjectionCandidateSelector[];
  readonly reject?: readonly ProjectionCandidateSelector[];
  readonly requiresFollowingContent?: boolean;
  readonly consumeFollowing?: NominalFrameConsumeFollowing;
  readonly ownerMode?: NominalFrameOwnerMode;
  readonly ownerArbitration?: NominalFrameOwnerArbitrationPolicy;
  readonly predicatePreference?: NominalFramePredicatePreference;
  readonly attachLeft?: boolean;
  readonly matrixKey?: NominalFrameMatrixKey;
  readonly attach?: TailAttachmentContract;
  readonly attachFamily?: string;
  readonly focus: NominalFrameFocus;
  readonly description?: string;
}

export interface NominalFrameParse {
  readonly root: NominalFrameRoot;
  readonly frame: NominalFrame;
  readonly consumed: number;
  readonly nextIndex: number;
}

export type NominalTailChainOwner =
  | {
    readonly kind: "marker_adapter";
    readonly provenance: "assembler";
  }
  | {
    readonly kind: "phrase_owner";
    readonly provenance: "nominal_head";
  };

export interface NominalFrameCommitContext {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly nextIndex: number;
  readonly layout?: ProjectionEvidenceLayout;
  readonly followingPredicate?: NominalFramePredicateCommitContext;
}

export interface NominalFramePredicateCommitContext {
  readonly tokenIndex: number;
  readonly voice?: string | null;
  readonly connectiveRole?: string | null;
  readonly hasNegative?: boolean;
  readonly hasCausative?: boolean;
  readonly hasCausativePassive?: boolean;
  readonly hasRequestTail?: boolean;
  readonly hasBenefactiveTail?: boolean;
  readonly provenance?: string | null;
  readonly renderPlanKind?: string | null;
  readonly sourcePredicateShape?: string | null;
  readonly topicClause?: NominalFramePredicateCommitContext;
}
