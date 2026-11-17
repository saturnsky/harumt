import type { RenderPlan } from "./render-plan.js";
import type { SourceTokenBoundary, SourceTokenSpan } from "./token.js";
import type { TranslationUnit } from "../pipeline/translation/unit.js";

export type TargetSegmentKind =
  | "lexeme"
  | "particle"
  | "aux"
  | "modal"
  | "connective"
  | "punctuation"
  | "quote"
  | "parenthetical"
  | "annotation"
  | "synthetic"
  | "fallback";

export type ProjectionConfidence = "exact" | "semantic" | "owner" | "fallback";

export interface TargetSegment {
  readonly text: string;
  readonly annotationKeys?: readonly number[];
  readonly sourceSpan: SourceTokenSpan | null;
  readonly boundaryBefore: SourceTokenBoundary | null;
  readonly boundaryAfter: SourceTokenBoundary | null;
  readonly unit: TranslationUnit | null;
  readonly renderedByUnit?: TranslationUnit | null;
  readonly renderPlanKind: RenderPlan["kind"] | string | null;
  readonly kind: TargetSegmentKind;
  readonly attachLeft?: boolean;
  readonly attachRight?: boolean;
  readonly consumedWordBoundaryAfter?: true;
  readonly transparentPause?: true;
  readonly relocatedPunctuation?: true;
  readonly transparentForAllomorph?: boolean;
  readonly allomorphRole?: "source_anchor" | "transparent";
  readonly allomorphSourceSpan?: SourceTokenSpan | null;
  readonly sourceInternalBoundaryTargets?: readonly SourceInternalBoundaryTarget[];
  readonly projectionConfidence: ProjectionConfidence;
}

export interface SourceInternalBoundaryTarget {
  readonly sourceBoundary: SourceTokenBoundary;
  readonly leftTargetText?: string;
  readonly rightTargetText?: string;
  readonly leftSplitTargetText?: string;
  readonly rightSplitTargetText?: string;
}

export interface RenderedTarget {
  readonly text: string;
  readonly segments: readonly TargetSegment[];
}
