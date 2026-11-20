
import { TokenCursor } from "../token-cursor.js";
import type { StructuralRelation, StructuralRelationGraph, StructuralRelationMarkerSpan, BuildStructuralRelationGraphOptions } from "./types.js";
import { tokenSpansOverlap } from "./toka-nominal-listing-run.js";
import { collectTokaNominalListingRelations } from "./toka-nominal-listing-relations.js";
import { collectEmbeddedQuestionAttributiveQuoteRelations, collectKaParallelRelations } from "./ka-parallel-relations.js";
import { collectContiguousRelations, collectDiscontinuousRelations, collectTeAttendantSimultaneousRelations } from "./clause-connective-relations.js";
import { collectTariListingCoordinationRelations } from "./tari-listing-relations.js";
import { collectPurposeClauseCoordinationRelations } from "./purpose-relations.js";
import { buildStructuralRelationNodes } from "./relation-coordinates.js";
import { collectNariParallelRelations, collectImmediateNariSequenceRelations } from "./nari-relations.js";
import { collectPunctuatedAttributiveModifierRelations } from "./punctuated-attributive-relations.js";
import { collectReasonCopulaExplanationRelations } from "./reason-relations.js";
import { collectQuoteStructuralRelationsFromOptions } from "./quote-relation-enrichment.js";

export function buildStructuralRelationGraph(options: BuildStructuralRelationGraphOptions): StructuralRelationGraph {
  const nodes = buildStructuralRelationNodes(options.layout, options.contentMap);
  const rootCursor = new TokenCursor(options.tokens, 0, options.tokens.length);
  const collected = collectContiguousRelations(options, nodes, rootCursor.fork(0, rootCursor.end, 0));
  const discontinuous = collectDiscontinuousRelations(options, nodes, rootCursor.fork(0, rootCursor.end, 0));
  const tariListings = collectTariListingCoordinationRelations(options, nodes);
  const teAttendants = collectTeAttendantSimultaneousRelations(options, nodes);
  const quoteRelations = collectQuoteStructuralRelationsFromOptions(options);
  const kaParallel = collectKaParallelRelations(options, nodes, quoteRelations);
  const embeddedQuestionAttributiveQuotes = collectEmbeddedQuestionAttributiveQuoteRelations(options, kaParallel);
  const nariParallel = collectNariParallelRelations(options, nodes);
  const tokaNominalListings = collectTokaNominalListingRelations(options, quoteRelations);
  const purposeClauseCoordination = collectPurposeClauseCoordinationRelations(options, nodes);
  const immediateNari = collectImmediateNariSequenceRelations(options, nodes, nariParallel);
  const punctuatedAttributives = collectPunctuatedAttributiveModifierRelations(options, nodes, quoteRelations);
  const reasonCopulaExplanations = collectReasonCopulaExplanationRelations(options, nodes);
  const preemptingQuoteOwnerSpans = structuralQuoteOwnerSpans(
    kaParallel,
    embeddedQuestionAttributiveQuotes,
    punctuatedAttributives,
  );
  const remainingQuoteRelations = quoteRelations.flatMap((relation) => {
    const preemptedByTokaListing = kaParallel.some((owner) =>
      owner.kind === "toka_parallel_listing" &&
      relation.markerSpans.some((span) => owner.markerSpans.some((ownerSpan) => tokenSpansOverlap(span, ownerSpan)))
    );
    if (preemptedByTokaListing) {
      return [];
    }
    const preempted = relation.markerSpans.some((span) =>
      preemptingQuoteOwnerSpans.some((ownerSpan) => tokenSpansOverlap(span, ownerSpan))
    );
    if (!preempted) {
      return [relation];
    }
    return relation.quote?.slotKind === "question_content" &&
      (relation.quote.questionBoundaryKind === "bare_ka" || relation.quote.questionBoundaryKind === "nominalized_no_ka")
      ? [{ ...relation, renderEnabledByDefault: false }]
      : [];
  });
  return {
    nodes,
    relations: [...collected.relations, ...discontinuous.relations, ...tariListings, ...teAttendants, ...kaParallel, ...embeddedQuestionAttributiveQuotes, ...nariParallel, ...tokaNominalListings, ...purposeClauseCoordination, ...immediateNari, ...punctuatedAttributives, ...reasonCopulaExplanations, ...remainingQuoteRelations],
    diagnostics: [...collected.diagnostics, ...discontinuous.diagnostics],
  };
}

function structuralQuoteOwnerSpans(
  kaParallelRelations: readonly StructuralRelation[],
  embeddedQuestionRelations: readonly StructuralRelation[],
  punctuatedAttributiveRelations: readonly StructuralRelation[],
): readonly StructuralRelationMarkerSpan[] {
  return [
    ...embeddedQuestionRelations.flatMap((relation) => relation.markerSpans),
    ...punctuatedAttributiveRelations.flatMap((relation) => relation.nominalExemplification === undefined
      ? []
      : [{ ...relation.nominalExemplification.quoteMarkerSpan, surface: "" }]),
    ...kaParallelRelations.flatMap((relation) => [
      ...relation.markerSpans,
      ...(relation.kaParallel?.closure.kind === "attributive_quote"
        ? [relation.kaParallel.closure.markerSpan]
        : []),
    ]),
  ];
}
