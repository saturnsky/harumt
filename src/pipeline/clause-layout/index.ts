
import type { LookupTables } from "../lookup-tables.js";
export {
  isExplicitQuoteClosingSurface,
  isExplicitQuoteClosingToken
} from "./quote-delimiters.js";
import { collectHostlessInterjectionEvidence } from "./hostless-interjection.js";
import type { ClauseToken, ClauseBoundaryDetectionOptions } from "./layout-types.js";
import { utteranceRangeOfTokenIn, pauseEdgeArgumentScopeAt } from "./navigation.js";
import type { UtteranceOnsetLeftBoundaryScope } from "./utterance-boundaries.js";
import { ProtoClauseLayout, protoLayoutFromBoundaryEvents } from "./proto-layout.js";
import { detectQuoteSpans } from "./quote-delimiters.js";
import { detectClauseBoundaryEventsWithEvidence } from "./boundary-detection.js";
import { activeProtoLayout, useActiveProtoLayout } from "./proto-state.js";
export { activeProtoLayout, useActiveProtoLayout } from "./proto-state.js";
export { isClauseEvidenceTransparentPunctuation, isClausePunctuationToken, skipClausePunctuationForward } from "./punctuation.js";
export { utteranceClosedForAttributiveProjection } from "./utterance-closure.js";
export type { UtteranceClosureRunEvidence, UtteranceClosureRunKind } from "./utterance-closure.js";
export {
  isClauseContentHeadTransparentToken,
  isClauseSpaceOrAdverbToken,
  nextNonSpaceIndex,
  nextTransparentEvidenceIndex,
  previousTransparentEvidenceIndex,
  previousNonSpaceIndex
} from "./trivia.js";

export function utteranceOnsetLeftBoundaryScopeFor(
  tokens: readonly ClauseToken[],
  lookups: LookupTables
): UtteranceOnsetLeftBoundaryScope {
  const proto = buildProtoLayout(tokens, lookups);
  return {
    balancedDelimiterSpanEndingAt: (closingIdx) => proto.balancedDelimiterSpanEndingAt(closingIdx),
    pauseEdgeArgumentScopeAt: (edgeIdx) => pauseEdgeArgumentScopeAt(proto, tokens, edgeIdx)
  };
}

export function buildProtoLayout(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  options: ClauseBoundaryDetectionOptions = {}
): ProtoClauseLayout {
  const n = tokens.length;
  if (n === 0) {
    return new ProtoClauseLayout(tokens, [], [], [], [], [], []);
  }
  const quoteSpans = detectQuoteSpans(tokens);
  const detection = detectClauseBoundaryEventsWithEvidence(tokens, lookups, options);
  return protoLayoutFromBoundaryEvents(tokens, detection.events, quoteSpans, {
    demoDiscourseLeftBoundaries: detection.demoDiscourseLeftBoundaries,
    hardTerminalEllipsisRuns: detection.hardTerminalEllipsisRuns,
    anaphoricConjectureSelfQuestions: detection.anaphoricConjectureSelfQuestions,
    terminalPunctuationRuns: detection.terminalPunctuationRuns,
    bareKeijoujiAttributiveHeads: detection.bareKeijoujiAttributiveHeads,
    renyouCompoundPrenominalHeads: detection.renyouCompoundPrenominalHeads,
    quoteAttributiveCarrierHeads: detection.quoteAttributiveCarrierHeads,
    decorativeTerminalClosures: detection.decorativeTerminalClosures,
    detachedTerminalNodaClosures: detection.detachedTerminalNodaClosures,
    utteranceClosureRuns: detection.utteranceClosureRuns,
    punctuationBreakIndices: detection.punctuationBreakIndices,
    copulaPauseBridges: detection.copulaPauseBridges,
    balancedDelimiterSpans: detection.balancedDelimiterSpans,
    negativeCopulaCorrections: detection.negativeCopulaCorrections,
    detachedUtteranceOnsetBoundaries: detection.detachedUtteranceOnsetBoundaries,
    chuushiClosures: detection.chuushiClosures,
    renyouJunctures: detection.renyouJunctures,
    teUtteranceActs: detection.teUtteranceActs,
    whitespaceJunctures: detection.whitespaceJunctures,
    pauseJunctures: detection.pauseJunctures,
    lexicalAdverbialAffiliations: detection.lexicalAdverbialAffiliations,
    volitionalIntentBindings: detection.volitionalIntentBindings,
    hostlessInterjections: collectHostlessInterjectionEvidence(tokens, {
      utteranceRangeOf: (tokenIdx) => utteranceRangeOfTokenIn(n, detection.terminalPunctuationRuns, tokenIdx),
      embeddedTokenSpace: options.tokenSpace?.embeddedTokenSpace === true,
      enclosedByParenthetical: options.tokenSpace?.enclosingDelimiter === "parenthetical",
      hasRemovedContentIsland: (options.tokenSpace?.removedIslandSourceOrdinals ?? []).length > 0,
      hasRemovedIslandBetween: (afterIdx, beforeIdx) =>
        removedIslandBetween(tokens, options.tokenSpace?.removedIslandSourceOrdinals ?? [], afterIdx, beforeIdx)
    }),
    ...(options.lexicalNominalHeadClaims === undefined ? {} : { lexicalNominalHeadClaims: options.lexicalNominalHeadClaims }),
    embeddedTokenSpace: options.tokenSpace?.embeddedTokenSpace === true,
  });
}

const defaultProtoLayouts = new WeakMap<readonly ClauseToken[], WeakMap<LookupTables, ProtoClauseLayout>>();

export function protoLayoutForTokens(tokens: readonly ClauseToken[], lookups: LookupTables): ProtoClauseLayout {
  const active = activeProtoLayout();
  if (active !== null && active.tokens === tokens) {
    return active;
  }
  let byLookups = defaultProtoLayouts.get(tokens);
  if (byLookups === undefined) {
    byLookups = new WeakMap();
    defaultProtoLayouts.set(tokens, byLookups);
  }
  const cached = byLookups.get(lookups);
  if (cached !== undefined) {
    return cached;
  }
  const proto = useActiveProtoLayout(null, () => buildProtoLayout(tokens, lookups));
  byLookups.set(lookups, proto);
  return proto;
}

function removedIslandBetween(
  tokens: readonly ClauseToken[],
  islandOrdinals: readonly number[],
  afterIdx: number,
  beforeIdx: number
): boolean {
  if (islandOrdinals.length === 0) {
    return false;
  }
  const after = tokens[afterIdx];
  const afterEnd = after?.sourceSpan?.endOrdinal ?? (after?.sourceOrdinal === undefined ? undefined : after.sourceOrdinal + 1);
  if (afterEnd === undefined) {
    return false;
  }
  const before = tokens[beforeIdx];
  const beforeStart = before === undefined
    ? Number.POSITIVE_INFINITY
    : before.sourceSpan?.startOrdinal ?? before.sourceOrdinal ?? Number.POSITIVE_INFINITY;
  return islandOrdinals.some((ordinal) => ordinal >= afterEnd && ordinal < beforeStart);
}
