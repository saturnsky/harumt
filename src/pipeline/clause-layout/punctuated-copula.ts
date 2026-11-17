import type { RuntimeHaruToken } from "../../types/token.js";
import type { BoundaryKind } from "./index.js";
import type { CopulaPauseBridgeEvidence } from "./punctuation.js";
import { isClauseHardTerminalPunctuationToken } from "./punctuation.js";
import { previousNonSpaceIndex } from "./trivia.js";
import type { BalancedDelimiterSpan } from "./balanced-delimiter.js";
import type { UtteranceInitialPauseEdgeComplementShape } from "../demo-discourse.js";
import { isParentheticalClosingToken } from "../head-tail/boundary/parenthetical.js";

export interface PunctuatedCopulaHostBindingBase {
  readonly hostSpan: { readonly start: number; readonly endExclusive: number };
  readonly contentStart: number;
  readonly hostHeadIdx: number;
  readonly decorationSpan: { readonly start: number; readonly endExclusive: number };
  readonly copulaStart: number;
  readonly chainEndExclusive: number;
  readonly clauseBoundaryKind: BoundaryKind | null;
  readonly clauseIndex: number;
  readonly sourcePredicateShape: UtteranceInitialPauseEdgeComplementShape;
}

type PunctuatedCopulaHostShape = Omit<
  PunctuatedCopulaHostBindingBase,
  "copulaStart" | "chainEndExclusive" | "clauseBoundaryKind" | "clauseIndex" | "sourcePredicateShape"
>;

export type PunctuatedCopulaHostBinding =
  | (PunctuatedCopulaHostBindingBase & { readonly hostKind: "delimited_nominal" })
  | (PunctuatedCopulaHostBindingBase & { readonly hostKind: "paused_nominal" });

export interface PunctuatedCopulaHostLayout {
  clauseIndexOfToken(tokenIdx: number): number;
  clauseOfToken(tokenIdx: number): { readonly terminatedBy: BoundaryKind | null } | undefined;
  tailReachInClause(tokenIdx: number): number;
  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined;
  copulaPauseBridgeAt(copulaStart: number): CopulaPauseBridgeEvidence | undefined;
}

export function punctuatedCopulaHostBinding(
  layout: PunctuatedCopulaHostLayout,
  tokens: readonly RuntimeHaruToken[],
  copulaStart: number
): PunctuatedCopulaHostBinding | null {
  if (layout.clauseOfToken(copulaStart)?.terminatedBy === "attributive") {
    return null;
  }
  const chainEndExclusive = layout.tailReachInClause(copulaStart);
  if (chainEndExclusive <= copulaStart) {
    return null;
  }
  const common = {
    copulaStart,
    chainEndExclusive,
    clauseBoundaryKind: layout.clauseOfToken(copulaStart)?.terminatedBy ?? null,
    clauseIndex: layout.clauseIndexOfToken(copulaStart)
  } as const;
  const delimited = delimitedNominalHost(layout, tokens, copulaStart);
  if (delimited !== null) {
    return foldableHostContent(tokens, delimited)
      ? { hostKind: "delimited_nominal", sourcePredicateShape: "nominal", ...delimited, ...common }
      : null;
  }
  const paused = pausedNominalHost(layout, tokens, copulaStart);
  if (paused === null || !foldableHostContent(tokens, paused)) {
    return null;
  }
  return layout.clauseIndexOfToken(paused.hostHeadIdx) === layout.clauseIndexOfToken(copulaStart)
    ? { hostKind: "paused_nominal", ...paused, ...common }
    : null;
}

function foldableHostContent(
  tokens: readonly RuntimeHaruToken[],
  host: {
    readonly contentStart: number;
    readonly decorationSpan: { readonly start: number; readonly endExclusive: number };
  }
): boolean {
  const start = host.contentStart;
  const endExclusive = host.decorationSpan.start;
  let contentHeadIdx: number | null = null;
  for (let idx = start; idx < endExclusive; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    if (token.stutterPrefixSuppressed !== true && contentHeadIdx === null) {
      contentHeadIdx = idx;
    }
    if (token.stutterPrefix !== undefined && contentHeadIdx !== idx) {
      return false;
    }
  }
  return true;
}

function delimitedNominalHost(
  layout: PunctuatedCopulaHostLayout,
  tokens: readonly RuntimeHaruToken[],
  copulaStart: number
): PunctuatedCopulaHostShape | null {
  const closeIdx = previousNonSpaceIndex(tokens, copulaStart);
  if (closeIdx === null || !isParentheticalClosingToken(tokens[closeIdx])) {
    return null;
  }
  const span = layout.balancedDelimiterSpanEndingAt(closeIdx);
  if (span === undefined || (span.role !== "explicit_quote_span" && span.role !== "bracketed_span")) {
    return null;
  }
  const contentStart = span.openingIdx + 1;
  if (span.closingIdx <= contentStart) {
    return null;
  }
  const hostHeadIdx = previousNonSpaceIndex(tokens, span.closingIdx, contentStart);
  if (hostHeadIdx === null) {
    return null;
  }
  if (isClauseHardTerminalPunctuationToken(tokens[hostHeadIdx])) {
    return null;
  }
  return {
    hostSpan: { start: span.start, endExclusive: span.endExclusive },
    contentStart,
    hostHeadIdx,
    decorationSpan: { start: span.closingIdx, endExclusive: copulaStart }
  };
}

function pausedNominalHost(
  layout: PunctuatedCopulaHostLayout,
  tokens: readonly RuntimeHaruToken[],
  copulaStart: number
): (PunctuatedCopulaHostShape & {
  readonly sourcePredicateShape: UtteranceInitialPauseEdgeComplementShape;
}) | null {
  const bridge = layout.copulaPauseBridgeAt(copulaStart);
  if (bridge === undefined) {
    return null;
  }
  const edge = tokens[bridge.edgeIdx];
  if (edge === undefined) {
    return null;
  }
  if (isParentheticalClosingToken(edge)) {
    return null;
  }
  if (bridge.edgeVerdict.grade === "onset") {
    return null;
  }
  return {
    sourcePredicateShape: bridge.edgeVerdict.grade === "complement"
      ? bridge.edgeVerdict.complementShape
      : "nominal",
    hostSpan: { start: bridge.edgeIdx, endExclusive: bridge.edgeIdx + 1 },
    contentStart: bridge.edgeIdx,
    hostHeadIdx: bridge.edgeIdx,
    decorationSpan: bridge.punctuationSpan
  };
}

