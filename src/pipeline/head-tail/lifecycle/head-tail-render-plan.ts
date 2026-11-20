import type { IrregularType } from "../../../generator/conjugator.js";
import type { MorphemeEntry } from "../../../types/dictionary.js";
import type { ProjectionConfidence, TargetSegmentKind } from "../../../types/projection.js";
import type { SourceTokenSpan } from "../../../types/token.js";
import type { TranslationUnit } from "../../translation/unit.js";
import type { RenderPlan, TeConnectiveBoundaryChoice } from "../../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { NumericStemBase } from "../../../types/numeric-base.js";
import type { Warning } from "../../../types/warning.js";
import type { ClauseLayout } from "../../clause-layout/final-layout.js";
import type { ContextGrammar } from "../../context.js";
import type { ProjectionSpan } from "../grammar.js";
import type { HeadProfileDescriptor } from "../head/profile.js";
import type {
  NominalFrame,
  NominalFrameCommitContext,
  NominalRoot,
  NominalTailChainOwner
} from "../head/adapters/nominal/grammar.js";
import type { ClauseBoundary, ClauseTailIR } from "../tail/predicate-root/commit.js";
import type { DerivationalStemBase, SourcePredicateShape, TailRoot } from "../tail/predicate-root/grammar.js";
import type { HeadTailSourceEnvelope } from "../tail/chain.js";
import type { TailChainPartialArtifact } from "../tail/chain.js";
import type { ClauseRoleEnvelope } from "../grammar.js";

export type HeadTailClauseRole = ClauseRoleEnvelope<ClauseBoundary, ClauseTailIR, ClauseLayout>;

export type NominalHeadTailChainProjection =
  | { readonly kind: "purpose_attributive" }
  | { readonly kind: "particle_stem" };

export interface PredicateHeadTailChainHostTextPart {
  readonly kind: "hostText";
  readonly text: string;
  readonly sourceSpan?: SourceTokenSpan | null;
  readonly segmentKind?: TargetSegmentKind;
  readonly projectionConfidence?: ProjectionConfidence;
  readonly unit?: TranslationUnit | null;
  readonly decoration?: true;
}

export interface PredicateHeadTailChainHostPlanPart {
  readonly kind: "hostPlan";
  readonly plan: RenderPlan;
  readonly sourceSpan?: SourceTokenSpan | null;
  readonly unit?: TranslationUnit | null;
}

export type PredicateHeadTailChainHostSequencePart =
  | PredicateHeadTailChainHostPlanPart
  | PredicateHeadTailChainHostTextPart;

export interface PredicateHeadTailChainHostHeadLexical {
  readonly koreanLemma: string;
  readonly koreanPos: number;
  readonly irregular: IrregularType | null;
  readonly sourceSpan: SourceTokenSpan | null;
}

export type PredicateHeadTailChainHostProjection =
  | { readonly kind: "particle_stem"; readonly base: NominalHeadTailChainPlan }
  | { readonly kind: "particle_surface"; readonly text: string }
  | { readonly kind: "nominal_frame"; readonly base: NominalHeadTailChainPlan }
  | { readonly kind: "numeral"; readonly base: NumericStemBase }
  | {
    readonly kind: "render_plan_sequence";
    readonly parts: readonly PredicateHeadTailChainHostSequencePart[];
    readonly expectedShape: SourcePredicateShape;
    readonly hostSourceShape?: SourcePredicateShape;
    readonly hostHeadLexical?: PredicateHeadTailChainHostHeadLexical;
  }
  | { readonly kind: "derivational_suffix"; readonly base: DerivationalStemBase };

export interface PredicateHeadTailChainRealization {
  readonly kind: "predicate";
  readonly entry?: MorphemeEntry | null;
  readonly root: TailRoot;
  readonly hostProjection?: PredicateHeadTailChainHostProjection;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
  readonly commitmentGrammar?: ContextGrammar;
  readonly partial?: TailChainPartialArtifact;
  readonly quotedKotoTopicContraction?: boolean;
  readonly warnings: readonly Warning[];
}

export interface NominalHeadTailChainRealization {
  readonly kind: "nominal";
  readonly root: NominalRoot;
  readonly frame: NominalFrame;
  readonly markerSpan: ProjectionSpan;
  readonly headMarkerSpan: ProjectionSpan;
  readonly owner: NominalTailChainOwner;
  readonly hostTokenIdx: number;
  readonly markerTokenIdx: number;
  readonly commitContext?: NominalFrameCommitContext;
  readonly projection?: NominalHeadTailChainProjection | null;
}

export type HeadTailChainRealization =
  | PredicateHeadTailChainRealization
  | NominalHeadTailChainRealization;

export interface HeadTailChainRenderPlan extends HeadTailSourceEnvelope {
  kind: "headTailChain";
  headProfile?: HeadProfileDescriptor;
  clauseRole?: HeadTailClauseRole;
  realization: HeadTailChainRealization;
  teConnectiveBoundaryChoice?: TeConnectiveBoundaryChoice | null;
}

export type PredicateHeadTailChainRenderPlan =
  Omit<HeadTailChainRenderPlan, "realization" | "clauseRole"> & {
    realization: PredicateHeadTailChainRealization;
    clauseRole: HeadTailClauseRole;
  };

export type NominalHeadTailChainPlan =
  Omit<HeadTailChainRenderPlan, "realization"> & {
    realization: NominalHeadTailChainRealization;
  };
