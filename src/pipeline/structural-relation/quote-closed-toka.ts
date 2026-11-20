import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import { TokenCursor } from "../token-cursor.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { enumerateClausePhrasesAfter, enumerateClausePhrasesBefore, type PhraseEnumerationLayout } from "../clause-layout/phrase-enumeration.js";
import type { ContentMap } from "../particles/index.js";
import { type QuoteHostMatch, quoteHostMatchAfterMarker, quoteHostMatchBlockedByNegativeCondition, quoteHostMatchIsAttributiveIu } from "../quote/host-taxonomy.js";
import { tokaTteCompositeQuoteCandidateAt } from "../head-tail/boundary/quote-marker.js";
import { copulaClosedTokaKaRelationAt, explanatoryCopulaClosedTokaKaRelationAt, closedPropositionTokaKaRelationAt, questionClosedTokaKaRelationAt, type QuestionClosedTokaKaRelation } from "../head-tail/boundary/ka-ownership.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { StructuralQuotePayload } from "./types.js";
import { type QuoteStructuralRelation, makeQuoteStructuralRelation } from "./quote-payload.js";

export function copulaClosedContentAnchorIdx(
  layout: ClauseLayout,
  tokens: readonly RuntimeHaruToken[],
  contentMap: ContentMap,
  nounIdx: number,
  copulaIdx: number,
): number | null {
  if (contentMap.has(nounIdx)) {
    return nounIdx;
  }
  for (const [key, span] of contentMap) {
    if (span.start <= nounIdx && nounIdx < span.start + span.consumed) {
      return key;
    }
  }
  for (const item of enumerateClausePhrasesBefore(layout, tokens, copulaIdx, { scope: "clause" })) {
    if (item.kind !== "nominal") {
      break;
    }
    if (item.span.start <= nounIdx && nounIdx < item.span.endExclusive) {
      return [...contentMap.keys()]
        .filter((key) => key >= item.span.start && key <= nounIdx)
        .sort((left, right) => left - right)
        .at(-1) ?? null;
    }
    break;
  }
  return null;
}

export function collectCopulaClosedTokaQuoteRelations(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly layout: ClauseLayout;
  readonly contentMap: ContentMap;
  readonly lookups: LookupTables;
}): readonly QuoteStructuralRelation[] {
  const relations: QuoteStructuralRelation[] = [];
  for (let kaIdx = 0; kaIdx < options.tokens.length; kaIdx += 1) {
    const closure = copulaClosedTokaKaRelationAt(options.tokens, kaIdx);
    const contentAnchorIdx = closure === null
      ? null
      : copulaClosedContentAnchorIdx(
        options.layout,
        options.tokens,
        options.contentMap,
        closure.nounIdx,
        closure.copulaIdx,
      );
    if (closure === null || contentAnchorIdx === null) {
      continue;
    }
    if (tokaTteCompositeQuoteCandidateAt(options.tokens, closure.markerIdx, {
      consumers: ["quote_content"],
    }) !== null) {
      continue;
    }
    const searchEnd = copulaClosedTokaHostSearchEnd(options.layout, options.tokens, kaIdx);
    if (searchEnd === null) {
      continue;
    }
    const markerCursor = new TokenCursor(options.tokens, closure.markerIdx, options.tokens.length, closure.markerIdx);
    const hostMatch = quoteHostMatchAfterMarker(markerCursor, options.lookups, {
      searchEnd,
      markerSpanEndExclusive: kaIdx + 1,
    });
    if (
      hostMatch === null ||
      quoteHostMatchBlockedByNegativeCondition(markerCursor, hostMatch, options.lookups) ||
      quoteHostMatchIsAttributiveIu(options.tokens, hostMatch)
    ) {
      continue;
    }
    const explicitQuoteSpan = options.layout.enclosingQuoteSpan(closure.markerIdx);
    if (
      explicitQuoteSpan !== undefined &&
      !(explicitQuoteSpan[0] <= hostMatch.hostIdx && hostMatch.hostIdx < explicitQuoteSpan[1])
    ) {
      continue;
    }
    const contentClause = options.layout.clauseOfToken(contentAnchorIdx);
    const contentClauseIndex = options.layout.clauseIndexOfToken(contentAnchorIdx);
    const hostClauseIndex = options.layout.clauseIndexOfPredicate(hostMatch.hostIdx);
    const relation = makeQuoteStructuralRelation({
      tokens: options.tokens,
      lookups: options.lookups,
      slotKind: "quoted_content",
      marker: {
        markerIdx: closure.markerIdx,
        markerSurface: options.tokens
          .slice(closure.markerIdx, kaIdx + 1)
          .map((token) => token.surface)
          .join(""),
        markerSpan: { start: closure.markerIdx, endExclusive: kaIdx + 1 },
        markerBaseSurface: options.tokens[closure.markerIdx]?.surface ?? "と",
      },
      hostMatch,
      contentTokenStart: contentClause?.start ?? contentAnchorIdx,
      contentTokenEnd: closure.markerIdx,
      bridgeKind: null,
      requestSource: null,
    });
    relations.push({
      ...relation,
      source: {
        kind: "span",
        span: relation.quote.contentSpan,
        clauseId: contentClauseIndex === undefined ? null : `clause:${contentClauseIndex}`,
      },
      target: {
        kind: "predicate",
        predicateIdx: hostMatch.hostIdx,
        span: {
          start: hostMatch.supportIdx ?? hostMatch.hostIdx,
          endExclusive: hostMatch.hostIdx + 1,
        },
        clauseId: hostClauseIndex === undefined ? null : `clause:${hostClauseIndex}`,
      },
      renderEnabledByDefault: true,
      quote: {
        ...relation.quote,
        contentPredicateIdx: contentAnchorIdx,
        markerAbsorbedContentCopulaIdx: closure.copulaIdx,
      },
    });
  }
  return relations;
}

export function closedPropositionTokaAtMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables,
): { readonly kaIdx: number; readonly questionEvidence: QuestionClosedTokaKaRelation["evidence"] | null } | null {
  if (tokaTteCompositeQuoteCandidateAt(tokens, markerIdx, { consumers: ["quote_content"] }) !== null) {
    return null;
  }
  const kaIdx = nextNonSpaceIndex(tokens, markerIdx + 1);
  if (kaIdx === null) {
    return null;
  }
  const closure = explanatoryCopulaClosedTokaKaRelationAt(tokens, kaIdx) ??
    closedPropositionTokaKaRelationAt(tokens, kaIdx);
  if (closure !== null) {
    return closure.markerIdx === markerIdx ? { kaIdx, questionEvidence: null } : null;
  }
  const questionClosed = questionClosedTokaKaRelationAt(tokens, kaIdx, lookups);
  return questionClosed?.markerIdx === markerIdx ? { kaIdx, questionEvidence: questionClosed.evidence } : null;
}

export function questionClosedTokaQuotePayload(
  evidence: QuestionClosedTokaKaRelation["evidence"] | null | undefined,
): Pick<StructuralQuotePayload, "markerRealization" | "contentForce"> {
  if (evidence === "question_ka") {
    return { markerRealization: "exemplification" };
  }
  return evidence === undefined || evidence === null ? {} : { contentForce: "question" };
}

export function closedPropositionTokaQuoteHostMatch(
  markerCursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  kaIdx: number,
): QuoteHostMatch | null {
  const proto = activeProtoLayout();
  const searchEnd = proto === null
    ? undefined
    : copulaClosedTokaHostSearchEnd(proto, markerCursor.tokens, kaIdx);
  if (searchEnd === null) {
    return null;
  }
  return quoteHostMatchAfterMarker(markerCursor, lookups, {
    ...(searchEnd === undefined ? {} : { searchEnd }),
    markerSpanEndExclusive: kaIdx + 1,
  });
}

function copulaClosedTokaHostSearchEnd(
  layout: PhraseEnumerationLayout,
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
): number | null {
  for (const item of enumerateClausePhrasesAfter(layout, tokens, kaIdx, { scope: "sentence" })) {
    if (item.kind === "punctuation_weak" || item.kind === "other") {
      continue;
    }
    const hostClause = layout.clauseOfToken(item.span.start);
    return hostClause === undefined ? null : hostClause.end;
  }
  return null;
}
