import { nextNonSpaceIndex } from "../clause-layout/index.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import { enumerateClausePhrasesAfter, enumerateQuoteInternalClausePhraseStreams, type ClausePhraseItem } from "../clause-layout/phrase-enumeration.js";
import type { StructuralRelation, StructuralRelationMarkerSpan, StructuralTokaNominalListingPayload, BuildStructuralRelationGraphOptions } from "./types.js";
import { tokaNominalListingContinuationAfter, tokaNominalListingMarkersInScope, tokaNominalMarkedRunAt, type TokaNominalPhraseItem, isTokaNominalTrailingParticle } from "./toka-nominal-listing-run.js";
import { spanAnchor } from "./relation-coordinates.js";

export function collectTokaNominalListingRelations(
  options: BuildStructuralRelationGraphOptions,
  quoteRelations: readonly StructuralRelation[],
): readonly StructuralRelation[] {
  const { tokens, layout } = options;
  const outsidePhrases = layout.clauses.flatMap((clause) => [
    ...enumerateClausePhrasesAfter(layout, tokens, clause.start - 1, { scope: "clause" }),
  ]);
  const phraseStreams: readonly {
    readonly phrases: readonly ClausePhraseItem[];
    readonly quoteSpan: readonly [number, number] | null;
  }[] = [
    { phrases: outsidePhrases, quoteSpan: null },
    ...layout.quoteSpans.flatMap((quoteSpan) =>
      enumerateQuoteInternalClausePhraseStreams(layout, tokens, quoteSpan)
        .map((phrases) => ({ phrases, quoteSpan }))
    ),
  ];
  return phraseStreams.flatMap(({ phrases, quoteSpan }) =>
    collectTokaNominalListingRelationsFromPhraseStream(options, quoteRelations, phrases, quoteSpan)
  );
}

function collectTokaNominalListingRelationsFromPhraseStream(
  options: BuildStructuralRelationGraphOptions,
  quoteRelations: readonly StructuralRelation[],
  phrases: readonly ClausePhraseItem[],
  quoteSpan: readonly [number, number] | null,
): readonly StructuralRelation[] {
  const { tokens, layout, lookups } = options;
  const relations: StructuralRelation[] = [];
  for (let phraseIndex = 0; phraseIndex < phrases.length; phraseIndex += 1) {
    const scopePhrase = phrases[phraseIndex];
    if (scopePhrase === undefined) {
      continue;
    }
    const enclosingQuoteSpan = layout.enclosingQuoteSpan(scopePhrase.headIdx);
    const belongsToSelectedQuote = quoteSpan !== null &&
      [...layout.enclosingQuoteSpans(scopePhrase.headIdx)]
        .some(([start, end]) => start === quoteSpan[0] && end === quoteSpan[1]);
    if (
      quoteSpan === null
        ? enclosingQuoteSpan !== undefined
        : enclosingQuoteSpan === undefined || !belongsToSelectedQuote
    ) {
      continue;
    }
    const markers = tokaNominalListingMarkersInScope({
      tokens,
      layout,
      lookups,
      quoteRelations,
      scopeTokenIdx: scopePhrase.headIdx,
      phrases,
    });
    const run = tokaNominalMarkedRunAt({
      phrases,
      phraseIndex,
      tokens,
      layout,
      markers,
      scopeTokenIdx: scopePhrase.headIdx,
    });
    if (run === null) {
      continue;
    }
    const { first, markedItems, separatorSpans, nextPhraseIndex } = run;
    const firstPhrase = first.phrases[0] as ClausePhraseItem;
    const lastMarked = markedItems.at(-1) as TokaNominalPhraseItem;
    const markerSpans = markedItems.map((item) => item.marker.markerSpan);
    if (markedItems.some((item) => item.marker.quoteOwned)) {
      continue;
    }
    const continuation = lastMarked.postMarkerParticleIdx === null
      ? tokaNominalListingContinuationAfter(markers, lastMarked.marker.markerSpan.endExclusive)
      : "none";
    if (continuation === "quote_owned") {
      continue;
    }
    const closure = continuation === "continues" ? "continues" : "closed";
    const trailingParticleSpan = closure === "continues"
      ? null
      : tokaNominalTrailingParticleSpan({
          tokens,
          layout,
          lastMarked,
        });
    const itemAnchors = markedItems.map((item) => spanAnchor({
      start: (item.phrases[0] as ClausePhraseItem).span.start,
      endExclusive: item.marker.markerSpan.start,
      clauseIndex: layout.clauseIndexOfToken(item.markerPhrase.headIdx),
    }));
    const payload: StructuralTokaNominalListingPayload = {
      itemAnchors,
      separatorSpans,
      trailingParticleSpan,
      closure,
    };
    const sourceEnd = trailingParticleSpan?.endExclusive ??
      Math.max(itemAnchors.at(-1)?.span.endExclusive ?? 0, markerSpans.at(-1)?.endExclusive ?? 0);
    relations.push({
      kind: "toka_nominal_listing",
      source: spanAnchor({
        start: itemAnchors[0]?.span.start ?? firstPhrase.span.start,
        endExclusive: sourceEnd,
        clauseIndex: layout.clauseIndexOfToken(firstPhrase.headIdx),
      }),
      target: null,
      markerSpans,
      candidateSuppressibleTokenSpans: [
        ...markerSpans.map((span) => ({
          start: span.start,
          endExclusive: span.endExclusive,
          reason: "relation_marker" as const,
        })),
        ...separatorSpans.map((span) => ({
          start: span.start,
          endExclusive: span.endExclusive,
          reason: "relation_separator" as const,
        })),
        ...(trailingParticleSpan === null ? [] : [{
          start: trailingParticleSpan.start,
          endExclusive: trailingParticleSpan.endExclusive,
          reason: "relation_trailing_particle" as const,
        }]),
      ],
      projection: {
        sourceForm: "listing",
        connectiveKind: "toka_nominal_listing",
        targetSlot: "coordination",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      tokaNominalListing: payload,
      provenance: "structural_relation_owner",
    });
    phraseIndex = nextPhraseIndex - 1;
  }
  return relations;
}

function tokaNominalTrailingParticleSpan(options: {
  readonly tokens: readonly ClauseToken[];
  readonly layout: ClauseLayout;
  readonly lastMarked: TokaNominalPhraseItem;
}): StructuralRelationMarkerSpan | null {
  const { tokens, layout, lastMarked } = options;
  if (lastMarked.followedByTopicTte) {
    return null;
  }
  const particleIdx = lastMarked.postMarkerParticleIdx;
  if (particleIdx === null) {
    return null;
  }
  const particle = tokens[particleIdx];
  if (!isTokaNominalTrailingParticle(particle)) {
    return null;
  }
  if (nextNonSpaceIndex(tokens, particleIdx + 1, lastMarked.markerPhrase.span.endExclusive) !== null) {
    return null;
  }
  const ownerIdx = layout.ownerPredicateOfParticle(particleIdx);
  if (
    ownerIdx === undefined ||
    !layout.argumentRolesOf(ownerIdx).some((assignment) => assignment.particleIdx === particleIdx)
  ) {
    return null;
  }
  return {
    start: particleIdx,
    endExclusive: particleIdx + 1,
    surface: particle?.surface ?? "",
    role: "toka_nominal_listing_trailing_particle",
  };
}
