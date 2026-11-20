
import type { AnnotatedSegment, AnnotationMetadata, CharPointAnnotationMetadata } from "../../types/annotation.js";
import type { RuntimeHaruToken, SourceTokenBoundary, SourceTokenSpan } from "../../types/token.js";
import type { Warning } from "../../types/warning.js";
import type { TokenTextSpan } from "../source-coordinate.js";
import type { EnclosingDelimiterKind } from "../clause-layout/layout-types.js";

export interface PreparedTranslation {
  readonly sourceText: string;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly pureMeow?: string;
  readonly parentheticalIslands?: readonly ParentheticalIsland[];
  readonly rawTokens?: readonly RuntimeHaruToken[];
  readonly finalizeFlipTokens?: (tokens: RuntimeHaruToken[]) => RuntimeHaruToken[];
  readonly annotationReplay?: {
    readonly segments: readonly AnnotatedSegment[];
    readonly metadata?: ReadonlyMap<number, AnnotationMetadata>;
  };
  readonly preprocessWarnings?: readonly Warning[];
  readonly embeddedTokenSpace?: boolean;
  readonly enclosingDelimiter?: EnclosingDelimiterKind;
}

export interface ParentheticalIsland {
  readonly id: string;
  readonly delimiter: {
    readonly open: string;
    readonly close: string;
  };
  readonly delimiterTextSpan?: {
    readonly open: TokenTextSpan;
    readonly close: TokenTextSpan;
  };
  readonly delimiterAnnotationKeys?: {
    readonly open?: readonly number[];
    readonly close?: readonly number[];
  };
  readonly sourceBoundary: SourceTokenBoundary;
  readonly sourceSpan: SourceTokenSpan;
  readonly proportionalProjection?: ParentheticalProportionalProjection;
  readonly innerPrepared: PreparedTranslation;
  readonly nestingDepth: number;
  readonly rubyAnnotationKey?: number;
  readonly pause?: {
    readonly key: number;
    readonly surface: string;
    readonly point: CharPointAnnotationMetadata;
  };
}

export interface ParentheticalProportionalProjection {
  readonly sourceSpan: SourceTokenSpan;
  readonly sourceOffset: number;
  readonly sourceLength: number;
  readonly sourceSurface: string;
}

