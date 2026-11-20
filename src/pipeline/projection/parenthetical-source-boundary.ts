
import type { RuntimeHaruToken, SourceTokenBoundary, SourceTokenSpan } from "../../types/token.js";
import { codepointLength } from "../source-coordinate.js";
import type { ParentheticalProportionalProjection } from "./prepared-translation.js";
import type { TokenTextSpan } from "../source-coordinate.js";
import type { RawParentheticalIsland } from "./raw-parenthetical-split.js";

export function sourceBoundaryForRawParenthetical(
  outerOffset: number,
  tokens: readonly RuntimeHaruToken[],
  tokenTextSpans: readonly (TokenTextSpan | null)[]
): SourceTokenBoundary {
  let previous: RuntimeHaruToken | undefined;
  let next: RuntimeHaruToken | undefined;
  let containing: RuntimeHaruToken | undefined;
  for (let index = 0; index < tokens.length; index += 1) {
    const span = tokenTextSpans[index];
    const token = tokens[index];
    if (span === undefined || span === null || token === undefined) {
      continue;
    }
    if (span.end <= outerOffset) {
      previous = token;
      continue;
    }
    if (span.start >= outerOffset) {
      next = token;
      break;
    }
    containing = token;
    break;
  }
  const previousSpan = previous?.sourceSpan ?? null;
  const nextSpan = next?.sourceSpan ?? null;
  const containingSpan = containing?.sourceSpan ?? null;
  const containingInternalBoundary = containing === undefined
    ? null
    : sourceCompoundBoundaryForRawOffset(containing, outerOffset);
  if (containingInternalBoundary !== null) {
    return containingInternalBoundary;
  }
  if (previousSpan === null && nextSpan === null && containingSpan !== null) {
    return sourceBoundaryAfterSourceSpan(containingSpan);
  }
  return sourceBoundaryBetweenSourceSpans(previousSpan, nextSpan);
}

export function sourceBoundaryBetweenSourceSpans(
  previousSpan: SourceTokenSpan | null,
  nextSpan: SourceTokenSpan | null
): SourceTokenBoundary {
  if (previousSpan !== null && nextSpan !== null) {
    const afterOrdinal = nextSpan.startOrdinal >= previousSpan.endOrdinal
      ? nextSpan.startOrdinal
      : previousSpan.endOrdinal;
    return {
      beforeOrdinal: previousSpan.endOrdinal - 1,
      afterOrdinal
    };
  }
  if (previousSpan !== null) {
    return {
      beforeOrdinal: previousSpan.endOrdinal - 1,
      afterOrdinal: previousSpan.endOrdinal
    };
  }
  if (nextSpan !== null) {
    return {
      beforeOrdinal: nextSpan.startOrdinal > 0 ? nextSpan.startOrdinal - 1 : null,
      afterOrdinal: nextSpan.startOrdinal
    };
  }
  return { beforeOrdinal: null, afterOrdinal: null };
}

export function proportionalProjectionForRawParenthetical(
  island: RawParentheticalIsland,
  tokens: readonly RuntimeHaruToken[],
  tokenTextSpans: readonly (TokenTextSpan | null)[]
): { readonly proportionalProjection: ParentheticalProportionalProjection } | null {
  for (let index = 0; index < tokens.length; index += 1) {
    const span = tokenTextSpans[index];
    const token = tokens[index];
    const sourceSpan = token?.sourceSpan ?? null;
    if (
      token === undefined ||
      span === undefined ||
      span === null ||
      sourceSpan === null ||
      island.outerOffset <= span.start ||
      island.outerOffset >= span.end
    ) {
      continue;
    }
    const projection = proportionalProjectionForTokenInternalOffset(
      token,
      island.outerOffset - span.start
    );
    if (projection === null) {
      return null;
    }
    return { proportionalProjection: projection };
  }
  return null;
}

export function proportionalProjectionForTokenInternalOffset(
  token: RuntimeHaruToken,
  sourceOffset: number
): ParentheticalProportionalProjection | null {
  const sourceSpan = token.sourceSpan ?? null;
  if (sourceSpan === null) {
    return null;
  }
  const sourceLength = codepointLength(token.surface);
  if (sourceOffset <= 0 || sourceOffset >= sourceLength) {
    return null;
  }
  return {
    sourceSpan,
    sourceOffset,
    sourceLength,
    sourceSurface: token.surface
  };
}

function sourceCompoundBoundaryForRawOffset(
  token: RuntimeHaruToken,
  rawOffset: number
): SourceTokenBoundary | null {
  for (const boundary of token.sourceCompoundProjectionBoundaries ?? []) {
    if (boundary.rawOffset === rawOffset) {
      return boundary.sourceBoundary;
    }
  }
  return null;
}

export function sourceBoundaryBeforeSourceSpan(span: SourceTokenSpan): SourceTokenBoundary {
  return {
    beforeOrdinal: span.startOrdinal > 0 ? span.startOrdinal - 1 : null,
    afterOrdinal: span.startOrdinal
  };
}

export function sourceBoundaryAfterSourceSpan(span: SourceTokenSpan): SourceTokenBoundary {
  return {
    beforeOrdinal: span.endOrdinal - 1,
    afterOrdinal: span.endOrdinal
  };
}
