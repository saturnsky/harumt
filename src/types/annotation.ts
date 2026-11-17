import type { TransparentPauseRunEvidence } from "../pipeline/clause-layout/juncture-verdict.js";

export interface ReplaceAnnotation {
  readonly kind: "replace";
  readonly replaced: string;
}

export interface RangeAnnotation {
  readonly kind: "range";
  readonly open: string;
  readonly close: string;
}

export interface RubyBaseAnnotation {
  readonly kind: "ruby-base";
}

export interface RubyAnnotation {
  readonly kind: "ruby";
}

export interface InterpunctAnnotation {
  readonly kind: "interpunct";
}

export interface TransparentPauseAnnotation {
  readonly kind: "transparent-pause";
  readonly surface: string;
}

export interface RubyEmphAnnotation {
  readonly kind: "ruby-emph";
  readonly bullets: string;
  readonly pairs: readonly { readonly baseKey: number; readonly rubyKey: number }[];
}

export type AnnotationEntry =
  | ReplaceAnnotation
  | RangeAnnotation
  | RubyBaseAnnotation
  | RubyAnnotation
  | InterpunctAnnotation
  | TransparentPauseAnnotation
  | RubyEmphAnnotation;

export interface AnnotatedSegment {
  readonly text: string;
  readonly keys?: readonly number[];
}

export interface AnnotatedText<A extends AnnotationEntry = AnnotationEntry> {
  readonly segments: readonly AnnotatedSegment[];
  readonly table: ReadonlyMap<number, A>;
  readonly metadata?: ReadonlyMap<number, AnnotationMetadata>;
}

export interface CharPointAnnotationMetadata {
  readonly kind: "char-point";
  readonly cleanOffset: number;
  readonly cleanLength: number;
  readonly attach: "left" | "right" | "both";
  readonly restore?: {
    readonly surface: string;
    readonly mode: "boundary" | "proportional";
  };
  readonly materialized?: true;
  readonly transparentPauseRun?: TransparentPauseRunEvidence;
}

export type AnnotationMetadata = CharPointAnnotationMetadata;

export const ANNOTATION_KEY_OOV = -1;
export const ANNOTATION_KEY_USER_DICT = -2;

export interface AnnotatedResult {
  readonly segments: readonly AnnotatedSegment[];
  readonly tableUpdate: AnnotationTableUpdate;
}

export type AnnotationTableAction =
  | { readonly kind: "set"; readonly key: number; readonly entry: AnnotationEntry }
  | { readonly kind: "delete"; readonly key: number }
  | { readonly kind: "setMetadata"; readonly key: number; readonly metadata: AnnotationMetadata }
  | { readonly kind: "deleteMetadata"; readonly key: number };

export type AnnotationTableUpdate = readonly AnnotationTableAction[];
