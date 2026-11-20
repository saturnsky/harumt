
import {
  type RuntimeHaruToken,
  shiftRuntimeTokenSourceIdentity,
  shiftSourceBoundary,
  shiftSourceSpan
} from "../../types/token.js";
import { isBoundaryPunctuationCategoryToken } from "../head-tail/boundary/punctuation.js";
import { parentheticalDelimiterTargetSegmentKind } from "./parenthetical-target-insertion.js";
import type { ParentheticalIsland, PreparedTranslation } from "./prepared-translation.js";

export function preparedSourceWidth(prepared: PreparedTranslation): number {
  let maxOrdinal = 0;
  for (const token of prepared.tokens) {
    if (token.sourceSpan !== undefined && token.sourceSpan !== null) {
      maxOrdinal = Math.max(maxOrdinal, token.sourceSpan.endOrdinal);
    } else if (token.sourceOrdinal !== undefined) {
      maxOrdinal = Math.max(maxOrdinal, token.sourceOrdinal + 1);
    }
  }
  for (const island of prepared.parentheticalIslands ?? []) {
    maxOrdinal = Math.max(maxOrdinal, island.sourceSpan.endOrdinal);
  }
  return maxOrdinal;
}

export function preparedHasNonPunctuationContent(prepared: PreparedTranslation): boolean {
  return prepared.tokens.some((token) => !isBoundaryPunctuationCategoryToken(token)) ||
    (prepared.parentheticalIslands ?? []).some((island) =>
      island.pause === undefined && preparedHasNonPunctuationContent(island.innerPrepared));
}

export function withEmbeddedTokenSpace(prepared: PreparedTranslation, embedded: boolean): PreparedTranslation {
  if (!embedded) {
    return prepared;
  }
  return {
    ...prepared,
    embeddedTokenSpace: true,
    ...(prepared.parentheticalIslands === undefined ? {} : {
      parentheticalIslands: prepared.parentheticalIslands.map((island) => ({
        ...island,
        innerPrepared: withEmbeddedTokenSpace(island.innerPrepared, true)
      }))
    })
  };
}

export function withEnclosingDelimiter(prepared: PreparedTranslation, openingSurface: string): PreparedTranslation {
  return { ...prepared, enclosingDelimiter: parentheticalDelimiterTargetSegmentKind(openingSurface) };
}

export function shiftPreparedSourceIdentity(prepared: PreparedTranslation, ordinalOffset: number): PreparedTranslation {
  if (ordinalOffset === 0) {
    return prepared;
  }
  return {
    ...prepared,
    tokens: prepared.tokens.map((token) => shiftRuntimeTokenSourceIdentity(token, ordinalOffset)),
    ...(prepared.rawTokens === undefined ? {} : {
      rawTokens: prepared.rawTokens.map((token) => shiftRuntimeTokenSourceIdentity(token, ordinalOffset))
    }),
    ...(prepared.finalizeFlipTokens === undefined ? {} : {
      finalizeFlipTokens: (tokens: RuntimeHaruToken[]) => prepared.finalizeFlipTokens!(
        tokens.map((token) => shiftRuntimeTokenSourceIdentity(token, -ordinalOffset))
      ).map((token) => shiftRuntimeTokenSourceIdentity(token, ordinalOffset))
    }),
    ...(prepared.parentheticalIslands === undefined ? {} : {
      parentheticalIslands: prepared.parentheticalIslands.map((island) => shiftParentheticalIslandSourceIdentity(island, ordinalOffset))
    })
  };
}

function shiftParentheticalIslandSourceIdentity(island: ParentheticalIsland, ordinalOffset: number): ParentheticalIsland {
  return {
    ...island,
    sourceBoundary: shiftSourceBoundary(island.sourceBoundary, ordinalOffset),
    sourceSpan: shiftSourceSpan(island.sourceSpan, ordinalOffset)!,
    innerPrepared: shiftPreparedSourceIdentity(island.innerPrepared, ordinalOffset)
  };
}
