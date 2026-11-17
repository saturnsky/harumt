import { clauseProjectionEvidenceWindowForToken, nextNonSpaceIndex, previousNonSpaceIndex, punctuatedAttributiveTargetAnchor, utteranceClosedForAttributiveProjection, type Clause, type ClauseLayout, type ClauseNominalClosureAnchor, type ClauseToken, type PunctuatedAttributiveTargetClause, type UtteranceClosureRunEvidence } from "../clause-layout/index.js";
import { isClauseEvidenceTransparentPunctuation, isClauseHardTerminalPunctuationToken, isClauseOpeningPunctuationToken, isClausePunctuationToken } from "../clause-layout/punctuation.js";
import {
  hostedConnectiveMarkerAt,
  relationDiscontinuousClosureSpanAfter,
  relationConnectiveSpansAt,
  type RelationConnectiveSpanMatch,
} from "../head-tail/tail/connective-span-scanner.js";
import { TokenCursor } from "../token-cursor.js";
import { matchCopulaNegation } from "../rules/copula.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM } from "../head-tail/tail/te-tail-continuation-table.js";
import { isQuestionParticleKaToken } from "../head-tail/boundary/marker.js";
import {
  copulaClosedNominalPredicateBeforeMarkerAt,
  copulaClosedTokaKaRelationAt,
  type CopulaClosedTokaKaRelation,
  directDiscourseChoiceQuestionKaRelationAt,
  isCopularTokaKaMarker,
  isKaDouKaMarker,
  isTokaListingKaMarker,
  kaOwnershipKindAt,
  previousTokenIsBasicCopula,
  previousTokenIsCopulaQuestionHost,
  terminalQuestionKaRelationAt,
} from "../head-tail/boundary/ka-ownership.js";
import { isStructuralKaParallelMarkerAt } from "./ka-parallel-ownership.js";
import {
  enumerateClausePhrasesAfter,
  enumerateClausePhrasesBefore,
  enumerateQuoteInternalClausePhraseStreams,
  type ClausePhraseItem,
} from "../clause-layout/phrase-enumeration.js";
import { isNominalizedConjectureMatrixQuestionPlan } from "./ka-parallel-plan.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { isSayVerbToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { looksQuestionTakingAfterViaLayout } from "../quote/question-taking-enumeration.js";
import {
  hardTerminalPunctuationSurfaceClassForToken,
  isBoundaryPunctuationCategoryToken,
  isHardTerminalPunctuationToken
} from "../head-tail/boundary/punctuation.js";
import { pronominalNoParticleContinuationForToken } from "../pronominal-no-dispatch.js";
import { TYPIFICATION_QUOTATIVE_HEADS } from "../head-tail/data/semantic-helper-sets.js";
import { IU_LEXEME_FORMS, NOMINAL_EXEMPLIFICATION_QUOTE_MARKERS } from "../head-tail/data/quoted-reporting-sets.js";
import { tokenMatchesConnectiveKind } from "../head-tail/tail/connective-span-scanner.js";
import type { LookupTables } from "../lookup-tables.js";
import { isTameHead } from "../lookup-tables.js";
import { precedingTokenOpensStrictReason } from "../reason-source-evidence.js";
import type { ContentMap } from "../particles/index.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { isClauseClosingInflection, isIndependentWordToken, isNaAdjCapableNoun, isNominalLike, POS01, 助詞_接続助詞, 助詞_係助詞, 助詞_副助詞, 助詞_格助詞, 助詞_終助詞, 助詞_準体助詞, 명사, 대명사, 수사 } from "../../types/pos.js";
import { isVerbLemma } from "../matchers.js";
import { isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../types/render-plan.js";
import { attributiveModifierPlanSourceFacts } from "../rendering/render-plan.js";
import { tryResolveDemoDiscourseConnective } from "../demo-discourse.js";
import { layoutBlocker, projectionUnavailable, structuralRelationDegraded } from "./diagnostics.js";
import { collectBareKaQuestionContentRelations, collectCopulaClosedTokaQuoteRelations, collectQuoteStructuralRelations, copulaClosedContentAnchorIdx, quoteRelationWithRequestSourceEvidence, terminalSfpQuoteMarkerBridgeSpan } from "./quote.js";
import { quoteHostMatchIsAttributiveIu } from "../quote/host-taxonomy.js";
import { tailRootClosesWithBareKeijoujiAttributive, tailRootClosesWithCopulaAttributive, tailRootQuoteRequestSourceEvidence } from "../head-tail/tail/predicate-root/inspect.js";
import { detectSfpWithNode } from "../semantics/grammar-runtime.js";
import type { SfpEffect } from "../head-tail/tail/predicate-root/grammar.js";
import type {
  StructuralAnchor,
  StructuralRelationNode,
  ClauseProjectionForm,
  StructuralRelation,
  StructuralRelationDiagnostic,
  StructuralRelationGraph,
  StructuralRelationMarkerSpan,
  StructuralKaParallelClosure,
  StructuralKaParallelItem,
  StructuralKaParallelItemKind,
  StructuralKaParallelTerminalPunctuation,
  StructuralKaParallelTerminalPunctuationUnit,
  StructuralNariParallelItem,
  StructuralNariParallelItemKind,
  StructuralTokaNominalListingPayload,
  StructuralTariListingClosure,
  StructuralTariListingItem,
  StructuralPurposeClauseCoordinationPayload,
  StructuralQuotePayload,
  StructuralRelationTargetSpan,
  StructuralRelationTokenSpan,
  StructuralReasonCopulaPayload,
  StructuralNominalExemplificationPayload,
  StructuralReasonCopulaSfp,
  StructuralReasonCopulaSfpEffect,
} from "./types.js";
import {
  tokaNominalListingContinuationAfter,
  tokaNominalListingMarkersInScope,
  tokaNominalMarkedRunAt,
  type TokaNominalPhraseItem,
} from "./toka-nominal-listing-run.js";

import {
  POS0,
  pos0in,
  POS1,
  POS4,
  POS5A,
  形状詞,
  形容詞0,
  助詞,
  助動詞,
  代名詞,
  動詞,
  副助詞,
  接尾辞,
  接続助詞,
  補助記号,
  名詞,
  連体形_,
  連体詞,
  非自立可能,
  終止形_,
  連用形_,
  助動詞_タ,
  助動詞_ダ,
  助動詞_デス,
  助動詞_ヌ,
  助動詞_マス,
  意志推量形_,
  형용사,
  PREDICATE_AUX_BITS,
  PUNCTUATION_BITS,
  NOMINAL_BITS,
  stemFormName,
  conjectureCopulaPoliteness,
  isConditionalInflection,
  isPoliteCopulaPos,
  isPastAuxConditionalForm,
  isPastAuxiliaryPos,
  isReasonCopulaNegativeShellAuxiliary,
  isVolitionalInflection,
} from "../../types/pos.js";
export interface BuildStructuralRelationGraphOptions {
  readonly tokens: readonly ClauseToken[];
  readonly layout: ClauseLayout;
  readonly contentMap: ContentMap;
  readonly lookups: LookupTables;
}

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

function collectTokaNominalListingRelations(
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

function isTokaNominalTrailingParticle(token: ClauseToken | undefined): boolean {
  return token !== undefined &&
    ((token.pos & POS01) === 助詞_格助詞 || (token.pos & POS01) === 助詞_係助詞);
}

function isTokaNominalTopicTte(token: ClauseToken | undefined): boolean {
  return token?.surface === "って" && (token.pos & POS01) === 助詞_副助詞;
}

function tokenSpansOverlap(
  left: { readonly start: number; readonly endExclusive: number },
  right: { readonly start: number; readonly endExclusive: number },
): boolean {
  return left.start < right.endExclusive && right.start < left.endExclusive;
}

function collectEmbeddedQuestionAttributiveQuoteRelations(
  options: BuildStructuralRelationGraphOptions,
  kaParallelRelations: readonly StructuralRelation[],
): readonly StructuralRelation[] {
  const { tokens, layout } = options;
  const parallelMarkerStarts = new Set(kaParallelRelations.flatMap((relation) =>
    relation.kaParallel?.markerSpans.map((span) => span.start) ?? []
  ));
  const relations: StructuralRelation[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const marker = kaParallelMarkerAt(tokens, layout, index, options.lookups);
    if (
      marker === null ||
      !marker.nominalized ||
      parallelMarkerStarts.has(marker.markerSpan.start)
    ) continue;
    const itemStart = parallelItemStartBeforeMarker(tokens, layout, marker.markerSpan.start);
    if (itemStart === null || itemStart >= marker.markerSpan.start) continue;
    const itemClause = layout.clauses[marker.clauseIndex];
    if (
      itemClause !== undefined &&
      spanHasMarkerExternalBoundarySymbol(tokens, itemClause.start, itemStart)
    ) continue;
    if (hasHardSentenceBoundaryBetween(tokens, itemStart, marker.markerSpan.start)) continue;
    if (spanHasMarkerExternalBoundarySymbol(tokens, itemStart, marker.markerSpan.start)) continue;
    const itemKind = kaParallelItemKind(
      new TokenCursor(tokens, itemStart, marker.markerSpan.start),
      options,
      marker,
    );
    if (itemKind === null || itemKind === "bare_nominal") continue;
    const closureResult = kaParallelClosureAfter(
      new TokenCursor(tokens, marker.markerSpan.endExclusive, tokens.length),
      options,
    );
    if (closureResult.closure.kind !== "attributive_quote") continue;
    const closure = closureResult.closure;
    const item: StructuralKaParallelItem = {
      source: spanAnchor({
        start: itemStart,
        endExclusive: marker.markerSpan.start,
        clauseIndex: marker.clauseIndex,
      }),
      markerSpan: marker.markerSpan,
      itemKind,
      predicateIdx: kaParallelPredicateIndex(options, itemStart, marker.markerSpan.start),
      predicateCategory: "predicate",
    };
    relations.push({
      kind: "embedded_question_attributive_quote",
      source: spanAnchor({
        start: itemStart,
        endExclusive: marker.markerSpan.endExclusive,
        clauseIndex: marker.clauseIndex,
      }),
      target: {
        kind: "noun_phrase",
        span: tokenSpan(closure.headIdx, closure.headIdx + 1),
        headIdx: closure.headIdx,
      },
      markerSpans: [marker.markerSpan, closure.markerSpan, ...(closure.particleSpan === undefined ? [] : [closure.particleSpan])],
      candidateSuppressibleTokenSpans: [
        { start: marker.markerSpan.start, endExclusive: marker.markerSpan.endExclusive, reason: "question_content_marker" },
        { start: closure.markerSpan.start, endExclusive: closure.markerSpan.endExclusive, reason: "attributive_quote_marker" },
        ...(closure.particleSpan === undefined ? [] : [{
          start: closure.particleSpan.start,
          endExclusive: closure.particleSpan.endExclusive,
          reason: "pronominal_no_particle"
        }]),
      ],
      projection: {
        sourceForm: "nominalized",
        connectiveKind: "embedded_question_attributive_quote",
        targetSlot: "noun_modifier",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      embeddedQuestionAttributiveQuote: { item, closure },
      provenance: "structural_relation_owner",
    });
  }
  return relations;
}

function spanHasMarkerExternalBoundarySymbol(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): boolean {
  for (let index = start; index < endExclusive; index += 1) {
    const token = tokens[index];
    if (
      token !== undefined &&
      (isClausePunctuationToken(token) || pos0in(token.pos & POS0, PUNCTUATION_BITS)) &&
      !isClauseOpeningPunctuationToken(token) &&
      !isClauseEvidenceTransparentPunctuation(token)
    ) {
      return true;
    }
  }
  return false;
}

function collectContiguousRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  cursor: TokenCursor<ClauseToken>,
): {
  readonly relations: readonly StructuralRelation[];
  readonly diagnostics: readonly StructuralRelationDiagnostic[];
} {
  const relations: StructuralRelation[] = [];
  const diagnostics: StructuralRelationDiagnostic[] = [];
  const { tokens, layout } = options;
  while (cursor.pos < tokens.length) {
    const index = cursor.pos;
    const matches = relationConnectiveSpansAt(cursor);
    const nounModifierMatch = matches.find((candidate) => candidate.targetSlot === "noun_modifier");
    if (nounModifierMatch !== undefined) {
      if (shouldDeferContiguousForPurposeModifier(options, index, nounModifierMatch)) {
        cursor.advance(nounModifierMatch.tokenCount);
        continue;
      }
    }
    const match = matches.find((candidate) => candidate.markerPolicy !== "discontinuous" && candidate.targetSlot !== "noun_modifier") ?? null;
    if (match === null) {
      cursor.advance();
      continue;
    }
    const markerSpan = markerSpanFromMatch(index, match);
    const sourceClauseIndex = layout.clauseIndexOfToken(index);
    const markerEndClauseIndex = layout.clauseIndexOfToken(match.endExclusive - 1);
    if (sourceClauseIndex < 0 || markerEndClauseIndex < 0 || sourceClauseIndex !== markerEndClauseIndex) {
      diagnostics.push(layoutBlocker({
        message: `ClauseLayout splits relation marker ${match.surface}`,
        relationKind: match.relationPolicy,
        confidence: "strict",
        ...layoutBoundaryDiagnosticPayload(match),
        span: markerSpan,
        markerSpans: [markerSpan],
      }));
      cursor.advance(match.endExclusive - cursor.pos);
      continue;
    }
    const sourceClause = layout.clauses[sourceClauseIndex];
    const targetClauseIndex = nextClauseIndex(layout, sourceClauseIndex);
    const targetClause = targetClauseIndex === null ? undefined : layout.clauses[targetClauseIndex];
    if (sourceClause === undefined || targetClauseIndex === null || targetClause === undefined) {
      diagnostics.push(structuralRelationDegraded({
        message: `relation marker ${match.surface} has no target clause`,
        relationKind: match.relationPolicy,
        confidence: "weak",
        ...layoutBoundaryDiagnosticPayload(match),
        ...(sourceClauseIndex < 0 ? {} : { clauseId: structuralRelationNodeId(sourceClauseIndex) }),
        span: markerSpan,
        markerSpans: [markerSpan],
      }));
      cursor.advance(match.endExclusive - cursor.pos);
      continue;
    }
    if (match.relationPolicy === "reason" && !hasStrictReasonEvidence(tokens, sourceClause, markerSpan.start, match.endExclusive, options.contentMap)) {
      diagnostics.push(structuralRelationDegraded({
        message: `reason marker ${match.surface} lacks strict reason evidence`,
        relationKind: match.relationPolicy,
        confidence: "weak",
        ...layoutBoundaryDiagnosticPayload(match),
        clauseId: structuralRelationNodeId(sourceClauseIndex),
        span: markerSpan,
        markerSpans: [markerSpan],
      }));
      cursor.advance(match.endExclusive - cursor.pos);
      continue;
    }
    const projection = match.projection;
    if (projection === undefined) {
      diagnostics.push(projectionUnavailable({
        message: `relation marker ${match.surface} has no projection metadata`,
        relationKind: match.relationPolicy,
        confidence: "strict",
        ...layoutBoundaryDiagnosticPayload(match),
        clauseId: structuralRelationNodeId(sourceClauseIndex),
        span: markerSpan,
        markerSpans: [markerSpan],
      }));
      cursor.advance(match.endExclusive - cursor.pos);
      continue;
    }
    relations.push({
      kind: match.relationPolicy,
      source: clauseAnchor(nodes, sourceClauseIndex),
      target: clauseAnchor(nodes, targetClauseIndex),
      markerSpans: [markerSpan],
      candidateSuppressibleTokenSpans: [{
        start: markerSpan.start,
        endExclusive: markerSpan.endExclusive,
        reason: "relation_marker",
      }],
      projection: projectionRequest(projection, match),
      confidence: "strict",
      ...layoutBoundaryRelationPayload(match),
      ...renderEnabledRelationPayload(match),
      provenance: "structural_relation_owner",
    });
    cursor.advance(match.endExclusive - cursor.pos);
  }
  return { relations, diagnostics };
}

function collectDiscontinuousRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  cursor: TokenCursor<ClauseToken>,
): {
  readonly relations: readonly StructuralRelation[];
  readonly diagnostics: readonly StructuralRelationDiagnostic[];
} {
  const relations: StructuralRelation[] = [];
  const diagnostics: StructuralRelationDiagnostic[] = [];
  const { tokens } = options;
  while (cursor.pos < tokens.length) {
    const index = cursor.pos;
    const matches = relationConnectiveSpansAt(cursor);
    let consumed = 1;
    for (const match of matches) {
      if (match.relationPolicy === "listing_example" && match.markerPolicy === "discontinuous") {
        const result = collectListingExampleRelation(options, nodes, index, match);
        pushCollectResult(result, relations, diagnostics);
        consumed = Math.max(consumed, match.tokenCount);
        continue;
      }
      if (match.relationPolicy === "correlative_degree" && match.markerPolicy === "discontinuous" && match.markerRole === "conditional_marker") {
        const result = collectCorrelativeDegreeRelation(options, nodes, index, match);
        pushCollectResult(result, relations, diagnostics);
        consumed = Math.max(consumed, match.tokenCount);
        continue;
      }
      if (match.relationPolicy === "purpose_modifier" && match.targetSlot === "noun_modifier") {
        if (hasNounModifierTarget(options, index, match)) {
          const result = collectPurposeModifierRelation(options, nodes, index, match);
          pushCollectResult(result, relations, diagnostics);
        }
        consumed = Math.max(consumed, match.tokenCount);
      }
    }
    cursor.advance(consumed);
  }
  return { relations, diagnostics };
}

interface TariListingItemEvidence {
  readonly markerIdx: number;
  readonly predicateIdx: number;
  readonly clauseIndex: number;
  readonly source: StructuralAnchor;
  readonly markerSpan: StructuralRelationMarkerSpan;
}

interface TariListingGroupEvidence {
  readonly items: readonly TariListingItemEvidence[];
  readonly separatorSpans: readonly StructuralRelationMarkerSpan[];
  readonly closure: StructuralTariListingClosure;
  readonly target: StructuralAnchor | null;
}

interface PurposeClauseCoordinationEvidence {
  readonly tameIdx: number;
  readonly coordinationIdx: number;
  readonly sourcePredicateIdx: number;
  readonly sourceClauseIndex: number;
  readonly targetTameIdx: number;
  readonly targetClauseIndex: number;
}

function collectTariListingCoordinationRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
): readonly StructuralRelation[] {
  const groups = collectTariListingGroups(options, nodes);
  return groups.flatMap((group) => {
    const itemAnchors: readonly StructuralTariListingItem[] = group.items.map((item) => ({
      source: item.source,
      markerSpan: item.markerSpan,
    }));
    const markerSpans = group.items.map((item) => item.markerSpan);
    return group.items.map((item, itemIndex): StructuralRelation => ({
      kind: "tari_listing_coordination",
      source: item.source,
      target: group.target,
      markerSpans: [item.markerSpan],
      candidateSuppressibleTokenSpans: [{
        start: item.markerSpan.start,
        endExclusive: item.markerSpan.endExclusive,
        reason: "relation_marker",
      }],
      projection: {
        sourceForm: "listing",
        connectiveKind: "alternative",
        targetSlot: "coordination",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      tariListing: {
        itemAnchors,
        markerSpans,
        separatorSpans: group.separatorSpans,
        itemIndex,
        closure: group.closure,
      },
      provenance: "structural_relation_owner",
    }));
  });
}

function collectTariListingGroups(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
): readonly TariListingGroupEvidence[] {
  const items = collectTariListingItems(options, nodes);
  if (items.length === 0) {
    return [];
  }
  const groups: TariListingGroupEvidence[] = [];
  let pending: TariListingItemEvidence[] = [];
  for (const item of items) {
    const previous = pending[pending.length - 1] ?? null;
    if (previous !== null && !tariItemsCanBelongToSameGroup(options, previous, item)) {
      pushTariListingGroup(options, nodes, pending, groups);
      pending = [];
    }
    pending.push(item);
  }
  pushTariListingGroup(options, nodes, pending, groups);
  return groups;
}

function collectTeAttendantSimultaneousRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const { tokens, layout, contentMap } = options;
  for (let clauseIndex = 0; clauseIndex < layout.clauses.length - 1; clauseIndex += 1) {
    const sourceClause = layout.clauses[clauseIndex];
    const targetClauseIndex = nextClauseIndex(layout, clauseIndex);
    const targetClause = targetClauseIndex === null ? undefined : layout.clauses[targetClauseIndex];
    if (sourceClause === undefined || targetClauseIndex === null || targetClause === undefined) {
      continue;
    }
    if (sourceClause.terminatedBy !== "connective") {
      continue;
    }
    const sourcePredicate = sourceClause.predicates[sourceClause.predicates.length - 1] ?? null;
    if (sourcePredicate === null) {
      continue;
    }
    const span = contentMap.get(sourcePredicate);
    if (span?.teConnectiveClassificationState?.committed?.surfaceRole !== "manner") {
      continue;
    }
    const markerSpan = teConnectiveMarkerSpanForCommittedSpan(tokens, sourcePredicate, span.consumed);
    if (markerSpan === null) {
      continue;
    }
    relations.push({
      kind: "te_attendant_simultaneous",
      source: predicateAnchor(sourcePredicate, clauseIndex),
      target: clauseAnchor(nodes, targetClauseIndex),
      markerSpans: [markerSpan],
      candidateSuppressibleTokenSpans: [{
        start: markerSpan.start,
        endExclusive: markerSpan.endExclusive,
        reason: "relation_marker",
      }],
      projection: {
        sourceForm: "connective",
        connectiveKind: "simultaneous",
        targetSlot: "clause_prefix",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      provenance: "structural_relation_owner",
    });
  }
  return relations;
}

function teConnectiveMarkerSpanForCommittedSpan(
  tokens: readonly ClauseToken[],
  predicateIdx: number,
  consumed: number | undefined,
): StructuralRelationMarkerSpan | null {
  const endExclusive = consumed === undefined ? predicateIdx + 1 : predicateIdx + consumed;
  const c = new TokenCursor(tokens, predicateIdx + 1, Math.min(tokens.length, endExclusive));
  while (c.current()) {
    const token = c.current()!;
    if ((token.pos & POS01) === 助詞_接続助詞 && (token.surface === "て" || token.surface === "で")) {
      return {
        start: c.pos,
        endExclusive: c.pos + 1,
        surface: token.surface,
        role: "te_attendant_marker",
      };
    }
    c.advance();
  }
  return null;
}

function collectTariListingItems(
  options: BuildStructuralRelationGraphOptions,
  _nodes: readonly StructuralRelationNode[],
): readonly TariListingItemEvidence[] {
  const { tokens, layout, contentMap } = options;
  const items: TariListingItemEvidence[] = [];
  const c = new TokenCursor(tokens, 0, tokens.length);
  while (c.current()) {
    const token = c.current()!;
    if (!isTariListingMarkerToken(token) || isTariListingExampleMarker(tokens, c.pos)) {
      c.advance();
      continue;
    }
    const clauseIndex = layout.clauseIndexOfToken(c.pos);
    const clause = clauseIndex < 0 ? undefined : layout.clauses[clauseIndex];
    if (clause === undefined) {
      c.advance();
      continue;
    }
    const predicateIdx = tariListingItemPredicateIndex(contentMap, clause, c.pos);
    if (predicateIdx === null) {
      c.advance();
      continue;
    }
    const markerSpan = tariListingMarkerSpan(tokens, c.pos);
    items.push({
      markerIdx: c.pos,
      predicateIdx,
      clauseIndex,
      source: predicateAnchor(predicateIdx, clauseIndex),
      markerSpan,
    });
    c.advance();
  }
  return items;
}

function tariListingMarkerSpan(tokens: readonly ClauseToken[], markerIdx: number): StructuralRelationMarkerSpan {
  const marker = tokens[markerIdx];
  const focusIdx = nextNonSpaceIndex(tokens, markerIdx + 1);
  const focus = focusIdx === null ? undefined : tokens[focusIdx];
  if (
    marker !== undefined && focusIdx === markerIdx + 1 && focus !== undefined && focus.surface === "は" && (focus.pos & POS01) === 助詞_係助詞
  ) {
    return {
      start: markerIdx,
      endExclusive: focusIdx + 1,
      surface: `${marker.surface}${focus.surface}`,
      role: "listing_tail_focus",
    };
  }
  return {
    start: markerIdx,
    endExclusive: markerIdx + 1,
    surface: marker?.surface ?? "",
    role: "listing_tail",
  };
}

function collectPurposeClauseCoordinationRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  for (let index = 0; index < options.tokens.length; index += 1) {
    const evidence = purposeClauseCoordinationEvidenceAt(options, index);
    if (evidence === null) {
      continue;
    }
    const purposeMarkerSpan: StructuralRelationMarkerSpan = {
      start: evidence.tameIdx,
      endExclusive: evidence.tameIdx + 1,
      surface: options.tokens[evidence.tameIdx]?.surface ?? "ため",
      role: "purpose_marker",
    };
    const coordinationMarkerSpan: StructuralRelationMarkerSpan = {
      start: evidence.coordinationIdx,
      endExclusive: evidence.coordinationIdx + 1,
      surface: options.tokens[evidence.coordinationIdx]?.surface ?? "と",
      role: "purpose_coordination_marker",
    };
    const targetPurposeMarkerSpan: StructuralRelationMarkerSpan = {
      start: evidence.targetTameIdx,
      endExclusive: purposeTameMarkerEndExclusive(options.tokens, evidence.targetTameIdx),
      surface: markerSurface(options.tokens, evidence.targetTameIdx, purposeTameMarkerEndExclusive(options.tokens, evidence.targetTameIdx)),
      role: "target_purpose_marker",
    };
    const payload: StructuralPurposeClauseCoordinationPayload = {
      sourcePredicateIdx: evidence.sourcePredicateIdx,
      purposeMarkerSpan,
      coordinationMarkerSpan,
      targetPurposeMarkerSpan,
    };
    relations.push({
      kind: "purpose_clause_coordination",
      source: predicateAnchor(evidence.sourcePredicateIdx, evidence.sourceClauseIndex),
      target: clauseAnchor(nodes, evidence.targetClauseIndex),
      markerSpans: [purposeMarkerSpan, coordinationMarkerSpan, targetPurposeMarkerSpan],
      candidateSuppressibleTokenSpans: [
        { start: purposeMarkerSpan.start, endExclusive: purposeMarkerSpan.endExclusive, reason: "relation_marker" },
        { start: coordinationMarkerSpan.start, endExclusive: coordinationMarkerSpan.endExclusive, reason: "relation_marker" },
      ],
      projection: {
        sourceForm: "connective",
        connectiveKind: "tame_purpose",
        targetSlot: "coordination",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      purposeClauseCoordination: payload,
      provenance: "structural_relation_owner",
    });
  }
  return relations;
}

function purposeClauseCoordinationEvidenceAt(
  options: BuildStructuralRelationGraphOptions,
  tameIdx: number,
): PurposeClauseCoordinationEvidence | null {
  const { tokens, layout } = options;
  if (!isTameHead(tokens[tameIdx])) {
    return null;
  }
  const coordinationIdx = nextNonSpaceIndex(tokens, tameIdx + 1);
  const coordination = coordinationIdx === null ? undefined : tokens[coordinationIdx];
  if (
    coordinationIdx === null ||
    coordination === undefined ||
    (coordination.pos & POS0) !== 助詞 ||
    coordination.surface !== "と"
  ) {
    return null;
  }
  const sourcePredicate = purposeSourcePredicateBeforeTame(options, tameIdx, 0);
  if (
    sourcePredicate === null ||
    !hasPurposeClauseCoordinationSourceEvidence(options, sourcePredicate, tameIdx)
  ) {
    return null;
  }
  const targetTameIdx = followingPurposeTameMarkerIndex(options, coordinationIdx + 1);
  if (targetTameIdx === null) {
    return null;
  }
  const targetPredicate = purposeSourcePredicateBeforeTame(options, targetTameIdx, coordinationIdx + 1);
  if (
    targetPredicate === null ||
    !hasPurposeClauseCoordinationSourceEvidence(options, targetPredicate, targetTameIdx)
  ) {
    return null;
  }
  if (!layout.sameQuoteScope(tameIdx, targetTameIdx)) {
    return null;
  }
  return {
    tameIdx,
    coordinationIdx,
    sourcePredicateIdx: sourcePredicate.predicateIdx,
    sourceClauseIndex: sourcePredicate.clauseIndex,
    targetTameIdx,
    targetClauseIndex: targetPredicate.clauseIndex,
  };
}

function purposeSourcePredicateBeforeTame(
  options: BuildStructuralRelationGraphOptions,
  tameIdx: number,
  lowerBoundInclusive: number,
): { readonly predicateIdx: number; readonly clauseIndex: number } | null {
  const { layout, contentMap } = options;
  const predicateIdx = layout.primaryPredicateOfChildClause(tameIdx)
    ?? layout.previousPredicateInClause(tameIdx);
  if (predicateIdx === undefined || predicateIdx < lowerBoundInclusive || !contentMap.has(predicateIdx)) {
    return null;
  }
  const clauseIndex = layout.clauseIndexOfPredicate(predicateIdx);
  return clauseIndex === undefined ? null : { predicateIdx, clauseIndex };
}

function hasPurposeClauseCoordinationSourceEvidence(
  options: BuildStructuralRelationGraphOptions,
  source: { readonly predicateIdx: number; readonly clauseIndex: number },
  tameIdx: number,
): boolean {
  const clause = options.layout.clauses[source.clauseIndex];
  if (clause === undefined || !options.contentMap.has(source.predicateIdx)) {
    return false;
  }
  if (hasStrictReasonEvidence(options.tokens, clause, tameIdx, purposeTameMarkerEndExclusive(options.tokens, tameIdx), options.contentMap)) {
    return false;
  }
  const last = previousContentTokenIndex(options.tokens, tameIdx - 1, clause.start);
  const finalPredicate = last === null ? undefined : options.tokens[last];
  return finalPredicate !== undefined && (finalPredicate.pos & (POS0 | POS5A)) === (動詞 | 連体形_);
}

function followingPurposeTameMarkerIndex(
  options: BuildStructuralRelationGraphOptions,
  start: number,
): number | null {
  const { tokens } = options;
  const c = new TokenCursor(tokens, start, tokens.length);
  while (c.current()) {
    const token = c.current()!;
    if (isHardTerminalPunctuationToken(token)) {
      return null;
    }
    if (isClauseEvidenceTransparentPunctuation(token)) {
      c.advance();
      continue;
    }
    if (!isTameHead(token)) {
      c.advance();
      continue;
    }
    const next = nextNonSpaceIndex(tokens, c.pos + 1);
    const nextToken = next === null ? undefined : tokens[next];
    if (
      next === null ||
      (nextToken !== undefined &&
        (nextToken.pos & POS0) === 助詞 &&
        (nextToken.surface === "に" || nextToken.surface === "と"))
    ) {
      return c.pos;
    }
    c.advance();
  }
  return null;
}

function purposeTameMarkerEndExclusive(tokens: readonly ClauseToken[], tameIdx: number): number {
  const next = nextNonSpaceIndex(tokens, tameIdx + 1);
  const nextToken = next === null ? undefined : tokens[next];
  if (
    next !== null &&
    nextToken !== undefined &&
    (nextToken.pos & POS0) === 助詞 &&
    nextToken.surface === "に"
  ) {
    return next + 1;
  }
  return tameIdx + 1;
}

function pushTariListingGroup(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  pending: readonly TariListingItemEvidence[],
  groups: TariListingGroupEvidence[],
): void {
  if (pending.length === 0) {
    return;
  }
  const closure = tariListingClosureForGroup(options, nodes, pending);
  if (pending.length < 2 && !singleTariClosureShouldProjectAsListing(options, closure.closure)) {
    return;
  }
  groups.push({
    items: [...pending],
    separatorSpans: tariListingSeparatorSpans(options.tokens, pending),
    closure: closure.closure,
    target: closure.target,
  });
}

function singleTariClosureShouldProjectAsListing(
  options: BuildStructuralRelationGraphOptions,
  closure: StructuralTariListingClosure,
): boolean {
  if (closure.kind !== "explicit_predicate") {
    return false;
  }
  const span = options.contentMap.get(closure.predicateIdx);
  if (span?.hasNegative === true) {
    return true;
  }
  const plan = span?.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return false;
  }
  return plan.realization.root.tail.ops.some((op) => op.kind === "negation");
}

function isTariListingMarkerToken(token: ClauseToken): boolean {
  return (token.pos & POS01) === 助詞_副助詞 && (token.surface === "たり" || token.surface === "だり");
}

function isTariListingExampleMarker(tokens: readonly ClauseToken[], markerIdx: number): boolean {
  const next = nextNonSpaceIndex(tokens, markerIdx + 1);
  const token = next === null ? undefined : tokens[next];
  return token !== undefined && token.surface === "と" && (token.pos & POS0) === 助詞;
}

function tariListingItemPredicateIndex(
  contentMap: ContentMap,
  clause: Clause,
  markerIdx: number,
): number | null {
  for (let index = clause.predicates.length - 1; index >= 0; index -= 1) {
    const predicateIdx = clause.predicates[index];
    if (predicateIdx !== undefined && predicateIdx < markerIdx && contentMap.has(predicateIdx)) {
      return predicateIdx;
    }
  }
  return null;
}

function tariItemsCanBelongToSameGroup(
  options: BuildStructuralRelationGraphOptions,
  previous: TariListingItemEvidence,
  next: TariListingItemEvidence,
): boolean {
  if (next.markerIdx <= previous.markerIdx || next.clauseIndex < previous.clauseIndex) {
    return false;
  }
  for (let clauseIdx = previous.clauseIndex + 1; clauseIdx < next.clauseIndex; clauseIdx += 1) {
    const between = options.layout.clauses[clauseIdx];
    if (between === undefined || between.terminatedBy !== "connective" || options.layout.chuushiClosureAt(between.end)?.right !== "governed") {
      return false;
    }
  }
  if (hasHardSentenceBoundaryBetween(options.tokens, previous.markerSpan.endExclusive, next.markerIdx)) {
    return false;
  }
  if (!options.layout.sameQuoteScope(previous.markerIdx, next.markerIdx)) {
    return false;
  }
  return true;
}

function hasHardSentenceBoundaryBetween(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): boolean {
  for (let index = start; index < endExclusive; index += 1) {
    const token = tokens[index];
    if (token !== undefined && isHardTerminalPunctuationToken(token)) {
      return true;
    }
  }
  return false;
}

function tariListingClosureForGroup(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  items: readonly TariListingItemEvidence[],
): {
  readonly closure: StructuralTariListingClosure;
  readonly target: StructuralAnchor | null;
} {
  const last = items[items.length - 1];
  if (last === undefined) {
    return {
      closure: { kind: "sentence_fragment" },
      target: null,
    };
  }
  const closurePredicateIdx = nextNonSpaceIndex(options.tokens, last.markerSpan.endExclusive);
  const closurePredicate = closurePredicateIdx === null ? undefined : options.tokens[closurePredicateIdx];
  if (
    closurePredicateIdx !== null &&
    closurePredicate !== undefined &&
    isTariClosurePredicate(closurePredicate) &&
    options.layout.sameQuoteScope(last.markerIdx, closurePredicateIdx)
  ) {
    const closureClauseIndex = options.layout.clauseIndexOfToken(closurePredicateIdx);
    return {
      closure: {
        kind: "explicit_predicate",
        predicateIdx: closurePredicateIdx,
      },
      target: predicateAnchor(closurePredicateIdx, closureClauseIndex),
    };
  }
  if (closurePredicateIdx !== null) {
    const quote = quoteMarkerRelationAt(options.tokens, closurePredicateIdx, {
      consumers: ["structural_relation_tari_listing"]
    });
    const sayIdx = quote?.canonicalSurface === "と"
      ? nextNonSpaceIndex(options.tokens, quote.span.endExclusive)
      : null;
    const say = sayIdx === null ? undefined : options.tokens[sayIdx];
    const headIdx = sayIdx === null ? null : nextNonSpaceIndex(options.tokens, sayIdx + 1, options.tokens.length);
    const head = headIdx === null ? undefined : options.tokens[headIdx];
    if (
      quote?.canonicalSurface === "と" &&
      sayIdx !== null &&
      say !== undefined &&
      isSayVerbToken(say) &&
      stemFormName(say.pos)?.startsWith("連体形") === true &&
      headIdx !== null &&
      head !== undefined &&
      pos0in(head.pos, NOMINAL_BITS) &&
      options.layout.sameQuoteScope(last.markerIdx, headIdx)
    ) {
      return {
        closure: {
          kind: "attributive_quote",
          markerSpan: {
            start: quote.span.start,
            endExclusive: sayIdx + 1,
            surface: `${quote.surface}${say.surface}`,
            role: "attributive_quote_marker"
          },
          headIdx
        },
        target: {
          kind: "noun_phrase",
          span: tokenSpan(headIdx, headIdx + 1),
          headIdx
        }
      };
    }
  }
  const followingClauseIndex = nextClauseIndex(options.layout, last.clauseIndex);
  const followingClause = followingClauseIndex === null ? undefined : options.layout.clauses[followingClauseIndex];
  if (followingClauseIndex !== null && followingClause !== undefined) {
    const targetEvidenceIdx = followingClause.primaryPredicate ?? followingClause.start;
    if (!options.layout.sameQuoteScope(last.markerIdx, targetEvidenceIdx)) {
      return {
        closure: { kind: "sentence_fragment" },
        target: null,
      };
    }
    return {
      closure: {
        kind: "following_clause",
        clauseId: structuralRelationNodeId(followingClauseIndex),
      },
      target: clauseAnchor(nodes, followingClauseIndex),
    };
  }
  return {
    closure: { kind: "sentence_fragment" },
    target: null,
  };
}

function isTariClosurePredicate(token: ClauseToken): boolean {
  return isVerbLemma(token, "する", "為る");
}

function tariListingSeparatorSpans(
  tokens: readonly ClauseToken[],
  items: readonly TariListingItemEvidence[],
): readonly StructuralRelationMarkerSpan[] {
  const spans: StructuralRelationMarkerSpan[] = [];
  for (let itemIndex = 0; itemIndex < items.length - 1; itemIndex += 1) {
    const previous = items[itemIndex];
    const next = items[itemIndex + 1];
    if (previous === undefined || next === undefined) {
      continue;
    }
    for (let tokenIndex = previous.markerSpan.endExclusive; tokenIndex < next.source.span.start; tokenIndex += 1) {
      const token = tokens[tokenIndex];
      if (token === undefined || !isClauseEvidenceTransparentPunctuation(token)) {
        continue;
      }
      spans.push({
        start: tokenIndex,
        endExclusive: tokenIndex + 1,
        surface: token.surface,
        role: "listing_separator",
      });
    }
  }
  return spans;
}

interface KaParallelMarkerEvidence {
  readonly kaIdx: number;
  readonly markerSpan: StructuralRelationMarkerSpan;
  readonly clauseIndex: number;
  readonly nominalized: boolean;
}

function collectKaParallelRelations(
  options: BuildStructuralRelationGraphOptions,
  _nodes: readonly StructuralRelationNode[],
  quoteRelations: readonly StructuralRelation[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const consumedMarkers = new Set<number>();
  const { tokens, layout } = options;
  const c = new TokenCursor(tokens, 0, tokens.length);
  while (c.current()) {
    if (consumedMarkers.has(c.pos)) {
      c.advance();
      continue;
    }
    const firstMarker = kaParallelMarkerAt(tokens, layout, c.pos, options.lookups);
    if (firstMarker === null) {
      c.advance();
      continue;
    }
    const firstStart = parallelItemStartBeforeMarker(tokens, layout, firstMarker.markerSpan.start);
    if (firstStart === null || firstStart >= firstMarker.markerSpan.start) {
      c.advance();
      continue;
    }
    const markers: KaParallelMarkerEvidence[] = [firstMarker];
    const itemStarts: number[] = [firstStart];
    let currentMarker = firstMarker;

    while (true) {
      if (quotativeToFollowsKaMarker(tokens, currentMarker)) {
        break;
      }
      const nextStart = nextParallelItemStart(c.fork(currentMarker.markerSpan.endExclusive));
      if (nextStart === null) {
        break;
      }
      const nextMarker = nextKaParallelMarker(c.fork(nextStart), layout, options.lookups);
      if (nextMarker === null || nextMarker.kaIdx <= currentMarker.kaIdx) {
        break;
      }
      if (hasHardSentenceBoundaryBetween(tokens, currentMarker.markerSpan.endExclusive, nextMarker.kaIdx)) {
        break;
      }
      if (hasTokaListingKaBetween(tokens, currentMarker.markerSpan.endExclusive, nextMarker.kaIdx)) {
        break;
      }
      if (!layout.sameQuoteScope(firstMarker.kaIdx, nextMarker.kaIdx)) {
        break;
      }
      if (nextStart >= nextMarker.markerSpan.start) {
        break;
      }
      markers.push(nextMarker);
      itemStarts.push(nextStart);
      currentMarker = nextMarker;
    }
    const soloClosure = markers.length === 1
      ? soloCopulaClosedTokaListingClosure(c, tokens, layout, firstMarker, quoteRelations)
      : null;
    const soloCopularTokaListing = soloClosure !== null;
    if (markers.length < 2 && !soloCopularTokaListing) {
      c.advance();
      continue;
    }
    if (soloClosure !== null) {
      itemStarts[0] = soloCopulaClosedTokaItemStart(layout, tokens, firstMarker, soloClosure);
    }
    const copularTokaShape = markers.map((marker) =>
      isCopularTokaKaMarker(tokens, marker.kaIdx)
    );
    if (copularTokaShape.some(Boolean) && !copularTokaShape.every(Boolean)) {
      c.advance();
      continue;
    }
    const copularTokaListing = copularTokaShape.every(Boolean);
    const lastMarker = markers[markers.length - 1] as KaParallelMarkerEvidence;
    if (!soloCopularTokaListing && hasTokaListingKaBetween(tokens, lastMarker.markerSpan.endExclusive, Math.min(tokens.length, lastMarker.markerSpan.endExclusive + 3))) {
      c.advance();
      continue;
    }
    const terminal = kaParallelTerminalPunctuationAfter(tokens, lastMarker.markerSpan.endExclusive);
    const terminalSpan = terminal.span;
    const sourceEnd = terminalSpan?.endExclusive ?? lastMarker.markerSpan.endExclusive;
    const rawItemKinds = markers.map((marker, markerIndex) => kaParallelItemKind(
      c.fork(itemStarts[markerIndex] as number, marker.markerSpan.start),
      options,
      marker,
    ));
    if (rawItemKinds.some((kind) => kind === null)) {
      c.advance();
      continue;
    }
    const itemKinds = rawItemKinds as readonly StructuralKaParallelItemKind[];
    const commonKind = soloCopularTokaListing
      ? itemKinds[0] ?? null
      : kaParallelCommonItemKind(itemKinds);
    if (commonKind === null) {
      c.advance();
      continue;
    }
    const separatorSpans = markers.slice(0, -1).flatMap((marker, markerIndex) => parallelSeparatorSpans(
      c.fork(marker.markerSpan.endExclusive, itemStarts[markerIndex + 1] as number),
      "ka_parallel_separator",
    ));
    const hasDiscourseChoiceSeparator = itemStarts.slice(1).some((itemStart) =>
      tryResolveDemoDiscourseConnective(c.fork(itemStart, tokens.length, itemStart), options.lookups) !== null
    );
    const lastPredicateIdx = kaParallelPredicateIndex(
      options,
      itemStarts.at(-1) as number,
      lastMarker.markerSpan.start,
    );
    const precedingMarkerIndexes = new Set(markers.slice(0, -1).map((marker) => marker.kaIdx));
    const precedingQuestionContentConsumedBeforeFinalPredicate = lastPredicateIdx !== null && quoteRelations.some((relation) =>
      relation.quote?.slotKind === "question_content" &&
      precedingMarkerIndexes.has(relation.quote.markerIdx) &&
      relation.quote.hostPredicateIdx < lastPredicateIdx
    );
    const matrixQuestionTakingHost = lastPredicateIdx !== null &&
      !hasDiscourseChoiceSeparator &&
      quoteRelations.some((relation) =>
        relation.quote?.slotKind === "question_content" &&
        relation.quote.hostPredicateIdx === lastPredicateIdx &&
        precedingMarkerIndexes.has(relation.quote.markerIdx)
      );
    const mixesNominalizedAndPredicateItems =
      itemKinds.includes("nominalized_question") && itemKinds.includes("predicate_question");
    const terminalNominalizedConjecture = lastPredicateIdx !== null &&
      isNominalizedConjectureMatrixQuestionPlan(options.contentMap.get(lastPredicateIdx)?.renderPlan ?? null);
    if (
      mixesNominalizedAndPredicateItems &&
      !matrixQuestionTakingHost &&
      !precedingQuestionContentConsumedBeforeFinalPredicate &&
      !terminalNominalizedConjecture
    ) {
      c.advance();
      continue;
    }
    const closure = kaParallelClosureAfter(c.fork(lastMarker.markerSpan.endExclusive), options);
    const itemAnchors: readonly StructuralKaParallelItem[] = markers.map((marker, markerIndex) => {
      const itemKind = itemKinds[markerIndex] as StructuralKaParallelItemKind;
      const item: Omit<StructuralKaParallelItem, "predicateCategory"> = {
        source: spanAnchor({
        start: itemStarts[markerIndex] as number,
        endExclusive: marker.markerSpan.start,
        clauseIndex: marker.clauseIndex,
        }),
        markerSpan: marker.markerSpan,
        itemKind,
        predicateIdx: kaParallelPredicateIndex(options, itemStarts[markerIndex] as number, marker.markerSpan.start),
      };
      return {
        ...item,
        predicateCategory: tokaParallelItemPredicateCategory(options, item),
      };
    });
    const terminalPlanEvidence = lastPredicateIdx === null
      ? null
      : predicatePlanTerminalKaEvidence(options.contentMap.get(lastPredicateIdx)?.renderPlan ?? null, lastMarker.kaIdx);
    const terminalRelation = terminalQuestionKaRelationAt(tokens, lastMarker.kaIdx, { lookups: options.lookups });
    const terminalOwnerBoundary = !hasDiscourseChoiceSeparator && (
      matrixQuestionTakingHost ||
      precedingQuestionContentConsumedBeforeFinalPredicate ||
      (terminalPlanEvidence === "polite_sfp" && terminalRelation?.evidence !== "volitional_host") ||
      terminalPlanEvidence === "polite_question_quotative"
    );
    const questionReformulationOwnsLastItem = terminalPlanEvidence === "question_reformulation";
    const uniformPredicateQuestions = itemAnchors.every((item) =>
      item.predicateIdx !== null && (
        item.itemKind === "predicate_question" ||
        item.itemKind === "nominalized_question" ||
        item.itemKind === "negative_alternative"
      )
    ) && new Set(itemAnchors.map((item) => kaParallelItemPredicateCategory(options, item))).size <= 1;
    const matrixQuestionItems = !uniformPredicateQuestions &&
      itemAnchors.every((item) => item.itemKind === "predicate_question") &&
      separatorSpans.length === 0 &&
      terminal.traits.length > 0;
    const allItemsHaveCopulaQuestionHosts = markers.every((marker) =>
      previousTokenIsCopulaQuestionHost(tokens, marker.kaIdx)
    );
    const allItemsAreDirectDiscourseQuestions = markers.every((marker) =>
      directDiscourseChoiceQuestionKaRelationAt(tokens, marker.kaIdx, options.lookups) !== null
    );
    if (
      terminalSpan !== null &&
      allItemsHaveCopulaQuestionHosts &&
      !matrixQuestionTakingHost
    ) {
      c.advance();
      continue;
    }
    if (
      terminalSpan !== null &&
      hasDiscourseChoiceSeparator &&
      allItemsAreDirectDiscourseQuestions
    ) {
      c.advance();
      continue;
    }
    const markerSpans = markers.map((marker) => marker.markerSpan);
    const suppressibleSpans = [
      ...markerSpans.map((span) => ({ start: span.start, endExclusive: span.endExclusive, reason: "relation_marker" })),
      ...separatorSpans.map((span) => ({ start: span.start, endExclusive: span.endExclusive, reason: "relation_separator" })),
      ...(terminalSpan === null ? [] : [{ start: terminalSpan.start, endExclusive: terminalSpan.endExclusive, reason: "relation_terminal_punctuation" }]),
    ];
    const relationKind = copularTokaListing
      ? "toka_parallel_listing"
      : commonKind === "bare_nominal" ? "ka_parallel_choice" : "ka_parallel_question_content";
    relations.push({
      kind: relationKind,
      source: spanAnchor({
        start: itemStarts[0] ?? firstStart,
        endExclusive: sourceEnd,
        clauseIndex: firstMarker.clauseIndex,
      }),
      target: closure.target,
      markerSpans,
      candidateSuppressibleTokenSpans: suppressibleSpans,
      projection: {
        sourceForm: commonKind === "bare_nominal" ? "nominalized" : "listing",
        connectiveKind: relationKind,
        targetSlot: "coordination",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      kaParallel: {
        itemAnchors,
        markerSpans,
        separatorSpans,
        itemKind: commonKind,
        terminalPunctuation: terminal.kind,
        terminalPunctuationTraits: terminal.traits,
        terminalPunctuationRun: terminal.run,
        closure: closure.closure,
        hasDiscourseChoiceSeparator,
        matrixQuestionItems,
        ...(
          terminalOwnerBoundary
            ? { terminalOwnerBoundary: "matrix_terminal_question" as const }
            : questionReformulationOwnsLastItem
              ? { terminalOwnerBoundary: "question_reformulation" as const }
              : {}
        ),
      },
      provenance: "structural_relation_owner",
    });
    for (const marker of markers) {
      consumedMarkers.add(marker.kaIdx);
    }
    c.advance();
  }
  return relations;
}

function kaParallelMarkerAt(
  tokens: readonly ClauseToken[],
  layout: ClauseLayout,
  index: number,
  lookups: LookupTables,
): KaParallelMarkerEvidence | null {
  const copularTokaListing = isCopularTokaKaMarker(tokens, index);
  if (
    (!isStructuralKaParallelMarkerAt(tokens, index, lookups) && !copularTokaListing) ||
    (isTokaListingKaMarker(tokens, index) && !copularTokaListing)
  ) {
    return null;
  }
  const nominalizerIdx = previousNonSpaceIndex(tokens, index);
  const nominalizer = nominalizerIdx === null ? undefined : tokens[nominalizerIdx];
  const quoteMarkerIdx = nominalizerIdx !== null &&
    nominalizer?.surface === "と" &&
    previousTokenIsBasicCopula(tokens, nominalizerIdx)
    ? nominalizerIdx
    : null;
  const nominalized = nominalizerIdx !== null &&
    nominalizer !== undefined &&
    (nominalizer.surface === "の" || nominalizer.surface === "ん") &&
    !isKaDouKaMarker(tokens, nominalizerIdx);
  const markerStart = nominalized
    ? nominalizerIdx
    : quoteMarkerIdx ?? index;
  const clauseIndex = layout.clauseIndexOfToken(index);
  return {
    kaIdx: index,
    markerSpan: {
      start: markerStart,
      endExclusive: index + 1,
      surface: markerSurface(tokens, markerStart, index + 1),
      role: nominalized ? "nominalized_question_marker" : quoteMarkerIdx === null ? "ka_parallel_marker" : "quoted_ka_parallel_marker",
    },
    clauseIndex,
    nominalized,
  };
}

function quotativeToFollowsKaMarker(
  tokens: readonly ClauseToken[],
  marker: KaParallelMarkerEvidence,
): boolean {
  for (let index = marker.markerSpan.endExclusive; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    if ((token.pos & POS01) === 助詞_終助詞) {
      continue;
    }
    if ((token.pos & POS01) === 助詞_格助詞 && token.surface === "と") {
      return true;
    }
    return (token.pos & POS01) === 助詞_副助詞 && token.surface === "って";
  }
  return false;
}

function hasTokaListingKaBetween(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): boolean {
  for (let index = start; index < endExclusive; index += 1) {
    if (isQuestionParticleKaToken(tokens[index]) && isTokaListingKaMarker(tokens, index)) {
      return true;
    }
  }
  return false;
}

function soloCopulaClosedTokaListingClosure(
  cursor: TokenCursor<ClauseToken>,
  tokens: readonly ClauseToken[],
  layout: ClauseLayout,
  marker: KaParallelMarkerEvidence,
  quoteRelations: readonly StructuralRelation[],
): CopulaClosedTokaKaRelation | null {
  const closure = copulaClosedTokaKaRelationAt(tokens, marker.kaIdx);
  if (closure === null || closure.sfpSpan.start !== closure.sfpSpan.endExclusive) {
    return null;
  }
  if (quoteRelations.some((relation) => relation.markerSpans.some(
    (span) => tokenSpansOverlap(span, marker.markerSpan)
  ))) {
    return null;
  }
  return tokaListingContinuesAfterMarker(cursor.fork(marker.markerSpan.endExclusive), layout, marker.kaIdx)
    ? closure
    : null;
}

const TOKA_LISTING_ITEM_PHRASE_KINDS: ReadonlySet<string> = new Set([
  "nominal",
  "predicate",
  "predicate_evidence",
]);

function tokaListingContinuesAfterMarker(
  cursor: TokenCursor<ClauseToken>,
  layout: ClauseLayout,
  markerKaIdx: number,
): boolean {
  for (const item of enumerateClausePhrasesAfter(layout, cursor.tokens, markerKaIdx, { scope: "sentence" })) {
    if (item.kind === "punctuation_weak" || item.kind === "adverbial") {
      continue;
    }
    return TOKA_LISTING_ITEM_PHRASE_KINDS.has(item.kind) &&
      layout.sameQuoteScope(markerKaIdx, item.headIdx);
  }
  return false;
}

function soloCopulaClosedTokaItemStart(
  layout: ClauseLayout,
  tokens: readonly ClauseToken[],
  marker: KaParallelMarkerEvidence,
  closure: CopulaClosedTokaKaRelation,
): number {
  for (const item of enumerateClausePhrasesBefore(layout, tokens, marker.markerSpan.start, { scope: "clause" })) {
    if (item.span.endExclusive <= closure.nounIdx) {
      break;
    }
    if (item.kind === "nominal" && item.span.start <= closure.nounIdx) {
      return item.span.start;
    }
  }
  return closure.nounIdx;
}

function nextParallelItemStart(
  cursor: TokenCursor<ClauseToken>,
): number | null {
  const c = cursor.fork();
  while (c.current()) {
    const token = c.current()!;
    if (isClauseEvidenceTransparentPunctuation(token)) {
      c.advance();
      continue;
    }
    return c.pos;
  }
  return null;
}

function nextKaParallelMarker(
  cursor: TokenCursor<ClauseToken>,
  layout: ClauseLayout,
  lookups: LookupTables,
): KaParallelMarkerEvidence | null {
  const c = cursor.fork();
  while (c.current()) {
    const token = c.current()!;
    if (isHardTerminalPunctuationToken(token)) {
      return null;
    }
    const marker = kaParallelMarkerAt(c.tokens, layout, c.pos, lookups);
    if (marker !== null) {
      return marker;
    }
    c.advance();
  }
  return null;
}

function parallelItemStartBeforeMarker(
  tokens: readonly ClauseToken[],
  layout: ClauseLayout,
  markerStart: number,
): number | null {
  const clauseIndex = layout.clauseIndexOfToken(markerStart);
  const clause = clauseIndex < 0 ? undefined : layout.clauses[clauseIndex];
  let start = clause?.start ?? 0;
  for (let index = markerStart - 1; index >= start; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isClauseEvidenceTransparentPunctuation(token)) {
      start = index + 1;
      break;
    }
  }
  return nextParallelItemStart(new TokenCursor(tokens, start, markerStart));
}

function kaParallelItemKind(
  itemCursor: TokenCursor<ClauseToken>,
  options: BuildStructuralRelationGraphOptions,
  marker: KaParallelMarkerEvidence,
): StructuralKaParallelItemKind | null {
  if (marker.nominalized) {
    return "nominalized_question";
  }
  if (spanIsKaParallelNegativeAlternative(itemCursor)) {
    return "negative_alternative";
  }
  if (spanHasPredicateLikeToken(itemCursor, options.contentMap)) {
    return "predicate_question";
  }
  if (spanHeadIsNaAdjCapableNoun(itemCursor.tokens, itemCursor.pos, itemCursor.end)) {
    return "na_adjectival_nominal";
  }
  return spanHeadIsNominalish(itemCursor.tokens, itemCursor.pos, itemCursor.end)
    ? "bare_nominal"
    : null;
}

function spanHeadIsNominalish(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): boolean {
  for (let index = endExclusive - 1; index >= start; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    return pos0in(token.pos, (1 << 名詞) | (1 << 代名詞) | (1 << 形状詞) | (1 << 接尾辞));
  }
  return false;
}

function clauseScopedScanEnd(layout: ClauseLayout, scanStart: number, fallbackEnd: number): number {
  const clauseEnd = layout.clauseOfToken(scanStart)?.end;
  return clauseEnd === undefined ? fallbackEnd : Math.min(fallbackEnd, clauseEnd);
}

function spanHeadIsNaAdjCapableNoun(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): boolean {
  for (let index = endExclusive - 1; index >= start; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    return isNaAdjCapableNoun(token);
  }
  return false;
}

function kaParallelCommonItemKind(
  itemKinds: readonly StructuralKaParallelItemKind[],
): StructuralKaParallelItemKind | null {
  if (itemKinds.length < 2) {
    return null;
  }
  if (itemKinds.every((kind) => kind === "bare_nominal" || kind === "na_adjectival_nominal")) {
    return "bare_nominal";
  }
  if (itemKinds.some((kind) => kind === "bare_nominal")) {
    return null;
  }
  if (itemKinds.some((kind) => kind === "na_adjectival_nominal")) {
    const others = itemKinds.filter((kind) => kind !== "na_adjectival_nominal");
    return others.every((kind) =>
      kind === "predicate_question" || kind === "nominalized_question"
    )
      ? "predicate_question"
      : null;
  }
  if (itemKinds.every((kind) => kind === "nominalized_question")) {
    return "nominalized_question";
  }
  return "predicate_question";
}

function spanIsKaParallelNegativeAlternative(
  cursor: TokenCursor<ClauseToken>,
): boolean {
  let contentToken: ClauseToken | null = null;
  const c = cursor.fork();
  while (c.current()) {
    const token = c.current()!;
    if (contentToken !== null) {
      return false;
    }
    contentToken = token;
    c.advance();
  }
  return contentToken?.surface === "否";
}

function kaParallelPredicateIndex(
  options: BuildStructuralRelationGraphOptions,
  start: number,
  endExclusive: number,
): number | null {
  for (let index = endExclusive - 1; index >= start; index -= 1) {
    const plan = options.contentMap.get(index)?.renderPlan ?? null;
    if (isKaParallelPredicateEvidencePlan(plan)) {
      return index;
    }
    if (options.contentMap.has(index) && isParallelPredicateToken(options.tokens[index])) {
      return index;
    }
  }
  return null;
}

function kaParallelItemPredicateCategory(
  options: BuildStructuralRelationGraphOptions,
  item: StructuralKaParallelItem,
): string {
  if (item.itemKind === "nominalized_question") {
    return "predicate";
  }
  const plan = item.predicateIdx === null
    ? null
    : options.contentMap.get(item.predicateIdx)?.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return item.itemKind;
  }
  return plan.realization.root.tail.stem.sourcePredicateShape ?? item.itemKind;
}

function tokaParallelItemPredicateCategory(
  options: BuildStructuralRelationGraphOptions,
  item: Omit<StructuralKaParallelItem, "predicateCategory">,
): StructuralKaParallelItem["predicateCategory"] {
  const plan = item.predicateIdx === null
    ? [...options.contentMap.entries()]
      .filter(([tokenIdx]) => item.source.span.start <= tokenIdx && tokenIdx < item.source.span.endExclusive)
      .sort(([left], [right]) => left - right)
      .at(-1)?.[1].renderPlan ?? null
    : options.contentMap.get(item.predicateIdx)?.renderPlan ?? null;
  if (plan?.kind === "lemma") {
    return plan.koreanPos === 명사 || plan.koreanPos === 대명사 || plan.koreanPos === 수사
      ? "nominal"
      : "predicate";
  }
  if (isPredicateHeadTailChainRenderPlan(plan) && plan.realization.root.tail.kind === "auxLayer") {
    return plan.realization.root.tail.stem.kind === "noun" ? "nominal" : "predicate";
  }
  return item.itemKind === "bare_nominal" ? "nominal" : "predicate";
}

function predicatePlanTerminalKaEvidence(
  plan: RenderPlan | null,
  kaIdx: number,
): "plain_sfp" | "polite_sfp" | "question_quotative" | "polite_question_quotative" | "question_reformulation" | null {
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return null;
  }
  const tail = plan.realization.root.tail;
  const polite = tail.kind === "auxLayer" && tail.ops.some((op) =>
    op.kind === "polite" || (op.kind === "copula" && op.polite)
  );
  const sfp = plan.realization.root.sfp;
  if (sfp !== null && sfp.source.tokenIndices.includes(kaIdx)) {
    return polite ? "polite_sfp" : "plain_sfp";
  }
  if (tail.kind !== "auxLayer") {
    return null;
  }
  if (tail.ops.some((op) =>
    op.kind === "connective" &&
    op.connective === "question_reformulation" &&
    op.source.tokenIndices.includes(kaIdx)
  )) {
    return "question_reformulation";
  }
  const questionQuotative = tail.ops.some((op) =>
    op.kind === "connective" &&
    op.connective === "question_quotative" &&
    op.source.tokenIndices.includes(kaIdx)
  );
  if (!questionQuotative) {
    return null;
  }
  return polite
    ? "polite_question_quotative"
    : "question_quotative";
}

function spanHasPredicateLikeToken(
  cursor: TokenCursor<ClauseToken>,
  contentMap: ContentMap | null,
): boolean {
  const c = cursor.fork();
  while (c.current()) {
    const token = c.current()!;
    if (isParallelPredicateToken(token)) {
      return true;
    }
    const plan = contentMap?.get(c.pos)?.renderPlan ?? null;
    if (isKaParallelPredicateEvidencePlan(plan)) {
      return true;
    }
    c.advance();
  }
  return false;
}

function isKaParallelPredicateEvidencePlan(plan: RenderPlan | null): boolean {
  return isPredicateHeadTailChainRenderPlan(plan) &&
    !tailRootClosesWithBareKeijoujiAttributive(plan.realization.root);
}

function isParallelPredicateToken(token: ClauseToken | undefined): boolean {
  const pos0 = (token?.pos ?? 0) & POS0;
  return pos0in(pos0, PREDICATE_AUX_BITS);
}

function kaParallelClosureAfter(
  parentCursor: TokenCursor<ClauseToken>,
  options: BuildStructuralRelationGraphOptions,
): {
  readonly closure: StructuralKaParallelClosure;
  readonly target: StructuralAnchor | null;
} {
  const closureStart = nextNonSpaceIndex(parentCursor.tokens, parentCursor.pos, parentCursor.end);
  if (closureStart === null) {
    return { closure: { kind: "terminal_fragment" }, target: null };
  }
  const scanEnd = clauseScopedScanEnd(options.layout, closureStart, parentCursor.end);
  const quote = quoteMarkerRelationAt(parentCursor.tokens, closureStart, {
    consumers: ["structural_relation_ka_parallel"]
  });
  if (quote?.canonicalSurface === "と") {
    const sayIdx = quote.span.endExclusive;
    const say = parentCursor.tokens[sayIdx];
    const headIdx = nextContentTokenIndex(parentCursor.tokens, sayIdx + 1, parentCursor.end);
    const head = headIdx === null ? undefined : parentCursor.tokens[headIdx];
    const pronominalNo = head !== undefined && (head.pos & POS01) === 助詞_準体助詞;
    const particleIdx = pronominalNo && headIdx !== null
      ? nextNonSpaceIndex(parentCursor.tokens, headIdx + 1, parentCursor.end)
      : null;
    const pronominalParticle = particleIdx === null
      ? null
      : pronominalNoParticleContinuationForToken(parentCursor.tokens[particleIdx], particleIdx);
    if (
      say !== undefined &&
      isSayVerbToken(say) &&
      stemFormName(say.pos)?.startsWith("連体形") === true &&
      headIdx !== null &&
      head !== undefined &&
      (pos0in(head.pos, NOMINAL_BITS) || pronominalNo)
    ) {
      return {
        closure: {
          kind: "attributive_quote",
          markerSpan: {
            start: quote.span.start,
            endExclusive: pronominalNo ? headIdx + 1 : sayIdx + 1,
            surface: `${quote.surface}${say.surface}${pronominalNo ? head.surface : ""}`
          },
          headIdx,
          realization: pronominalNo
            ? "pronominal_no"
            : (head.dictionaryForm || head.surface) === "こと" ? "light_koto" : "appositive",
          ...(pronominalParticle === null || particleIdx === null ? {} : {
            particleSpan: {
              start: particleIdx,
              endExclusive: particleIdx + 1,
              surface: pronominalParticle.surface,
              role: "pronominal_no_particle"
            },
            particleSurface: pronominalParticle.surface
          })
        },
        target: null
      };
    }
  }
  if (looksQuestionTakingAfterViaLayout(options.layout, parentCursor.tokens, closureStart, scanEnd, options.lookups)) {
    const hostIdx = nextContentTokenIndex(options.tokens, closureStart, scanEnd);
    if (hostIdx !== null) {
      return {
        closure: { kind: "question_taking_host", predicateIdx: hostIdx },
        target: predicateAnchor(hostIdx, options.layout.clauseIndexOfToken(hostIdx)),
      };
    }
  }
  return {
    closure: { kind: "terminal_fragment" },
    target: null,
  };
}

function kaParallelTerminalPunctuationAfter(
  tokens: readonly ClauseToken[],
  markerEndExclusive: number,
): {
  readonly kind: StructuralKaParallelTerminalPunctuation;
  readonly span: StructuralRelationMarkerSpan | null;
  readonly traits: readonly ("question" | "exclamation")[];
  readonly run: readonly StructuralKaParallelTerminalPunctuationUnit[];
} {
  const next = nextNonSpaceIndex(tokens, markerEndExclusive, tokens.length);
  if (next === null) {
    return { kind: null, span: null, traits: [], run: [] };
  }
  let endExclusive = next;
  let hasQuestion = false;
  let hasExclamation = false;
  let hasPeriod = false;
  const run: StructuralKaParallelTerminalPunctuationUnit[] = [];
  let cursor: number | null = next;
  while (cursor !== null) {
    const token = tokens[cursor];
    if (token === undefined) break;
    const surfaceClass = hardTerminalPunctuationSurfaceClassForToken(token, cursor, ["structural_relation_ka_parallel"]);
    if (surfaceClass === "question") {
      hasQuestion = true;
      run.push("question");
    } else if (surfaceClass === "exclamation") {
      hasExclamation = true;
      run.push("exclamation");
    } else if (surfaceClass === "japanese_period" || surfaceClass === "ascii_period") {
      hasPeriod = true;
      run.push("period");
    } else break;
    endExclusive = cursor + 1;
    cursor = nextNonSpaceIndex(tokens, endExclusive, tokens.length);
  }
  if (endExclusive === next) return { kind: null, span: null, traits: [], run: [] };
  const traits = [
    ...(hasQuestion ? ["question" as const] : []),
    ...(hasExclamation ? ["exclamation" as const] : []),
  ];
  const kind: StructuralKaParallelTerminalPunctuation = hasExclamation
    ? "exclamation"
    : hasQuestion
      ? "question"
      : hasPeriod
        ? "period"
        : null;
  return {
    kind,
    span: {
      start: next,
      endExclusive,
      surface: tokens.slice(next, endExclusive).map((token) => token.surface).join(""),
      role: "terminal_punctuation"
    },
    traits,
    run,
  };
}

function parallelSeparatorSpans(
  cursor: TokenCursor<ClauseToken>,
  role: string,
): readonly StructuralRelationMarkerSpan[] {
  const spans: StructuralRelationMarkerSpan[] = [];
  const c = cursor.fork();
  while (c.current()) {
    const token = c.current()!;
    if (isClauseEvidenceTransparentPunctuation(token)) {
      spans.push({
        start: c.pos,
        endExclusive: c.pos + 1,
        surface: token.surface,
        role,
      });
    }
    c.advance();
  }
  return spans;
}

interface NariParallelMarkerEvidence {
  readonly nariIdx: number;
  readonly markerSpan: StructuralRelationMarkerSpan;
  readonly clauseIndex: number;
}

function collectNariParallelRelations(
  options: BuildStructuralRelationGraphOptions,
  _nodes: readonly StructuralRelationNode[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const consumedMarkers = new Set<number>();
  const { tokens, layout } = options;
  const c = new TokenCursor(tokens, 0, tokens.length);
  while (c.current()) {
    if (consumedMarkers.has(c.pos)) {
      c.advance();
      continue;
    }
    const firstMarker = nariParallelMarkerAt(tokens, layout, c.pos);
    if (firstMarker === null) {
      c.advance();
      continue;
    }
    const firstStart = parallelItemStartBeforeMarker(tokens, layout, firstMarker.markerSpan.start);
    if (firstStart === null || firstStart >= firstMarker.markerSpan.start) {
      c.advance();
      continue;
    }
    const markers: NariParallelMarkerEvidence[] = [firstMarker];
    const itemStarts: number[] = [firstStart];
    let currentMarker = firstMarker;

    while (true) {
      const nextStart = nextParallelItemStart(c.fork(currentMarker.markerSpan.endExclusive));
      if (nextStart === null) {
        break;
      }
      const nextMarker = nextNariParallelMarker(c.fork(nextStart), layout);
      if (nextMarker === null || nextMarker.nariIdx <= currentMarker.nariIdx) {
        break;
      }
      if (hasHardSentenceBoundaryBetween(tokens, currentMarker.markerSpan.endExclusive, nextMarker.nariIdx)) {
        break;
      }
      if (!layout.sameQuoteScope(firstMarker.nariIdx, nextMarker.nariIdx)) {
        break;
      }
      if (nextStart >= nextMarker.markerSpan.start) {
        break;
      }
      markers.push(nextMarker);
      itemStarts.push(nextStart);
      currentMarker = nextMarker;
    }
    if (markers.length < 2) {
      c.advance();
      continue;
    }
    const itemKinds = markers.map((marker, markerIndex) => nariParallelItemKind(
      c.fork(itemStarts[markerIndex] as number, marker.markerSpan.start),
      options.contentMap,
    ));
    const wildcardFlags = markers.map((marker, markerIndex) => isWildcardPronounNariItem(
      tokens,
      itemStarts[markerIndex] as number,
      marker.markerSpan.start,
    ));
    const commonKind = nariParallelCommonItemKind(itemKinds, wildcardFlags);
    if (commonKind === null) {
      c.advance();
      continue;
    }
    const lastMarker = markers[markers.length - 1] as NariParallelMarkerEvidence;
    const trailingParticleSpan = nariParallelTrailingParticleSpan(tokens, lastMarker.markerSpan.endExclusive);
    const sourceEnd = trailingParticleSpan?.endExclusive ?? lastMarker.markerSpan.endExclusive;
    const itemAnchors: readonly StructuralNariParallelItem[] = markers.map((marker, markerIndex) => ({
      source: spanAnchor({
        start: itemStarts[markerIndex] as number,
        endExclusive: marker.markerSpan.start,
        clauseIndex: marker.clauseIndex,
      }),
      markerSpan: marker.markerSpan,
      itemKind: itemKinds[markerIndex] as StructuralNariParallelItemKind,
      predicateIdx: nariParallelPredicateIndex(options, itemStarts[markerIndex] as number, marker.markerSpan.start),
    }));
    const separatorSpans = markers.slice(0, -1).flatMap((marker, markerIndex) => parallelSeparatorSpans(
      c.fork(marker.markerSpan.endExclusive, itemStarts[markerIndex + 1] as number),
      "nari_parallel_separator",
    ));
    const markerSpans = markers.map((marker) => marker.markerSpan);
    const suppressibleSpans = [
      ...markerSpans.map((span) => ({ start: span.start, endExclusive: span.endExclusive, reason: "relation_marker" })),
      ...separatorSpans.map((span) => ({ start: span.start, endExclusive: span.endExclusive, reason: "relation_separator" })),
      ...(trailingParticleSpan === null ? [] : [{
        start: trailingParticleSpan.start,
        endExclusive: trailingParticleSpan.endExclusive,
        reason: "relation_trailing_particle",
      }]),
    ];
    relations.push({
      kind: "nari_parallel_choice",
      source: spanAnchor({
        start: firstStart,
        endExclusive: sourceEnd,
        clauseIndex: firstMarker.clauseIndex,
      }),
      target: null,
      markerSpans,
      candidateSuppressibleTokenSpans: suppressibleSpans,
      projection: {
        sourceForm: "listing",
        connectiveKind: "nari_parallel_choice",
        targetSlot: "coordination",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      nariParallel: {
        itemAnchors,
        markerSpans,
        separatorSpans,
        itemKind: commonKind,
        trailingParticleSpan,
      },
      provenance: "structural_relation_owner",
    });
    for (const marker of markers) {
      consumedMarkers.add(marker.nariIdx);
    }
    c.advance();
  }
  return relations;
}

function nariParallelMarkerAt(
  tokens: readonly ClauseToken[],
  layout: ClauseLayout,
  index: number,
): NariParallelMarkerEvidence | null {
  const token = tokens[index];
  if (!isNariParallelMarkerToken(token)) {
    return null;
  }
  const clauseIndex = layout.clauseIndexOfToken(index);
  return {
    nariIdx: index,
    markerSpan: {
      start: index,
      endExclusive: index + 1,
      surface: token.surface,
      role: "nari_parallel_marker",
    },
    clauseIndex,
  };
}

function isNariParallelMarkerToken(token: ClauseToken | undefined): token is ClauseToken {
  if (token === undefined || token.surface !== "なり") {
    return false;
  }
  const pos0 = token.pos & POS0;
  const pos1 = token.pos & POS1;
  return (pos0 === 助詞 && (pos1 === 副助詞 || pos1 === 接続助詞)) || pos0 === 接尾辞;
}

function nextNariParallelMarker(
  cursor: TokenCursor<ClauseToken>,
  layout: ClauseLayout,
): NariParallelMarkerEvidence | null {
  const c = cursor.fork();
  while (c.current()) {
    const token = c.current()!;
    if (isHardTerminalPunctuationToken(token)) {
      return null;
    }
    const marker = nariParallelMarkerAt(c.tokens, layout, c.pos);
    if (marker !== null) {
      return marker;
    }
    c.advance();
  }
  return null;
}

function nariParallelItemKind(
  itemCursor: TokenCursor<ClauseToken>,
  contentMap: ContentMap | null,
): StructuralNariParallelItemKind {
  return spanHasPredicateLikeToken(itemCursor, contentMap) ? "predicate" : "nominal";
}

function nariParallelCommonItemKind(
  itemKinds: readonly StructuralNariParallelItemKind[],
  wildcardFlags: readonly boolean[],
): StructuralNariParallelItemKind | null {
  const first = itemKinds[0] ?? null;
  if (first === null) {
    return null;
  }
  if (itemKinds.every((kind) => kind === first)) {
    return first;
  }
  const mixedAcceptable = itemKinds.every((kind, index) =>
    kind === "predicate" || wildcardFlags[index] === true
  ) && itemKinds.some((kind) => kind === "predicate");
  return mixedAcceptable ? "predicate" : null;
}

function isWildcardPronounNariItem(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): boolean {
  let sole: ClauseToken | null = null;
  for (let index = start; index < endExclusive; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (sole !== null) {
      return false;
    }
    sole = token;
  }
  return sole !== null &&
    (sole.pos & POS0) === 代名詞 &&
    ["何", "なん", "なに"].includes(sole.surface);
}

function nariParallelPredicateIndex(
  options: BuildStructuralRelationGraphOptions,
  start: number,
  endExclusive: number,
): number | null {
  for (let index = endExclusive - 1; index >= start; index -= 1) {
    if (options.contentMap.has(index) && isParallelPredicateToken(options.tokens[index])) {
      return index;
    }
  }
  return null;
}

function nariParallelTrailingParticleSpan(
  tokens: readonly ClauseToken[],
  markerEndExclusive: number,
): StructuralRelationMarkerSpan | null {
  const index = nextNonSpaceIndex(tokens, markerEndExclusive, tokens.length);
  const token = index === null ? undefined : tokens[index];
  if (index === null || token === undefined || (token.pos & POS01) !== 助詞_格助詞) {
    return null;
  }
  return {
    start: index,
    endExclusive: index + 1,
    surface: token.surface,
    role: "nari_parallel_trailing_particle",
  };
}

function collectImmediateNariSequenceRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  nariParallelRelations: readonly StructuralRelation[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const { tokens, layout, contentMap } = options;
  const pairedMarkerStarts = nariParallelMarkerStarts(nariParallelRelations);
  const c = new TokenCursor(tokens, 0, tokens.length);
  while (c.current()) {
    const hosted = immediateSequenceHostedMarkerAt(tokens, c.pos);
    const marker = immediateNariSequenceMarkerAt(tokens, c.pos) ??
      stativeHoldNariMarkerAt(tokens, c.pos) ??
      hosted?.marker ??
      null;
    if (marker === null || pairedMarkerStarts.has(marker.start)) {
      c.advance();
      continue;
    }
    const sourceClauseIndex = layout.clauseIndexOfToken(c.pos);
    const sourceClause = sourceClauseIndex < 0 ? undefined : layout.clauses[sourceClauseIndex];
    if (sourceClause === undefined) {
      c.advance();
      continue;
    }
    const sourcePredicate = immediateNariSourcePredicate(contentMap, sourceClause, c.pos);
    if (
      sourcePredicate === null ||
      (hosted !== null && !sourcePredicateContentEndsWithHost(contentMap, sourcePredicate, hosted.hostIndex))
    ) {
      c.advance();
      continue;
    }
    const target = immediateNariTargetAnchor(options, nodes, marker.endExclusive);
    if (target === null) {
      c.advance();
      continue;
    }
    const stativeHold = marker.role === "stative_hold_marker";
    relations.push({
      kind: stativeHold ? "stative_hold_sequence" : "immediate_sequence",
      source: predicateAnchor(sourcePredicate, sourceClauseIndex),
      target,
      markerSpans: [marker],
      candidateSuppressibleTokenSpans: [{
        start: marker.start,
        endExclusive: marker.endExclusive,
        reason: "relation_marker",
      }],
      projection: {
        sourceForm: "connective",
        connectiveKind: stativeHold ? "stative_hold" : "sequence_immediate",
        targetSlot: "clause_prefix",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      provenance: "structural_relation_owner",
    });
    c.advance();
  }
  return relations;
}

function nariParallelMarkerStarts(relations: readonly StructuralRelation[]): ReadonlySet<number> {
  const starts = new Set<number>();
  for (const relation of relations) {
    if (relation.kind !== "nari_parallel_choice") {
      continue;
    }
    for (const marker of relation.markerSpans) {
      if (marker.role === "nari_parallel_marker") {
        starts.add(marker.start);
      }
    }
  }
  return starts;
}

function immediateNariSequenceMarkerAt(
  tokens: readonly ClauseToken[],
  index: number,
): StructuralRelationMarkerSpan | null {
  const token = tokens[index];
  if (
    token === undefined || token.surface !== "なり" || (token.pos & POS01) !== 助詞_接続助詞
  ) {
    return null;
  }
  const previous = previousNonSpaceIndex(tokens, index, 0);
  const previousToken = previous === null ? undefined : tokens[previous];
  if (
    previousToken === undefined ||
    (previousToken.pos & POS0) !== 動詞 ||
    ((previousToken.pos & POS5A) !== 終止形_ && (previousToken.pos & POS5A) !== 連体形_)
  ) {
    return null;
  }
  return {
    start: index,
    endExclusive: index + 1,
    surface: token.surface,
    role: "immediate_sequence_marker",
  };
}

function immediateSequenceHostedMarkerAt(
  tokens: readonly ClauseToken[],
  index: number,
): { readonly marker: StructuralRelationMarkerSpan; readonly hostIndex: number } | null {
  const hosted = hostedConnectiveMarkerAt(tokens, index, "sequence_immediate");
  if (hosted === null) {
    return null;
  }
  return {
    marker: {
      start: index,
      endExclusive: index + 1,
      surface: hosted.surface,
      role: "immediate_sequence_marker",
    },
    hostIndex: hosted.hostIndex,
  };
}

function sourcePredicateContentEndsWithHost(
  contentMap: ContentMap,
  sourcePredicate: number,
  hostIndex: number,
): boolean {
  const span = contentMap.get(sourcePredicate);
  return span !== undefined && span.start <= hostIndex && span.start + span.consumed - 1 === hostIndex;
}

function stativeHoldNariMarkerAt(
  tokens: readonly ClauseToken[],
  index: number,
): StructuralRelationMarkerSpan | null {
  const token = tokens[index];
  if (
    token === undefined || token.surface !== "なり" || (token.pos & POS01) !== 助詞_副助詞
  ) {
    return null;
  }
  const previous = previousNonSpaceIndex(tokens, index, 0);
  const previousToken = previous === null ? undefined : tokens[previous];
  if (previousToken === undefined || (previousToken.pos & POS4) !== 助動詞_タ) {
    return null;
  }
  return {
    start: index,
    endExclusive: index + 1,
    surface: token.surface,
    role: "stative_hold_marker",
  };
}

function immediateNariSourcePredicate(
  contentMap: ContentMap,
  sourceClause: Clause,
  markerIdx: number,
): number | null {
  for (let index = sourceClause.predicates.length - 1; index >= 0; index -= 1) {
    const predicateIdx = sourceClause.predicates[index];
    if (predicateIdx !== undefined && predicateIdx < markerIdx && contentMap.has(predicateIdx)) {
      return predicateIdx;
    }
  }
  return null;
}

function immediateNariTargetAnchor(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  start: number,
): StructuralAnchor | null {
  const { tokens, layout } = options;
  const targetTokenIdx = nextContentTokenIndex(tokens, start, tokens.length);
  if (targetTokenIdx === null) {
    return null;
  }
  const targetClauseIndex = layout.clauseIndexOfToken(targetTokenIdx);
  if (targetClauseIndex < 0) {
    return null;
  }
  const targetClause = layout.clauses[targetClauseIndex];
  if (targetClause === undefined) {
    return null;
  }
  if (targetClause.start >= start) {
    return clauseAnchor(nodes, targetClauseIndex);
  }
  const predicateIdx = targetClause.predicates.find((candidate) => candidate >= targetTokenIdx) ?? null;
  return predicateIdx === null
    ? clauseAnchor(nodes, targetClauseIndex)
    : predicateAnchor(predicateIdx, targetClauseIndex);
}

function markerSurface(tokens: readonly ClauseToken[], start: number, endExclusive: number): string {
  return tokens.slice(start, endExclusive).map((token) => token.surface).join("");
}

function punctuatedAttributiveTargetClauses(
  layout: ClauseLayout
): readonly PunctuatedAttributiveTargetClause[] {
  return layout.clauses.map((clause) => ({
    start: clause.start,
    end: clause.end,
    kind: clause.kind,
    parentIdx: clause.parentIdx,
    predicates: clause.predicates,
    particleIndices: clause.particleIndices,
    adverbialAdjunctIndices: clause.predicates.flatMap((predicateIdx) =>
      [...layout.adverbialAdjunctsOf(predicateIdx)]
    ),
  }));
}

function collectPunctuatedAttributiveModifierRelations(
  options: BuildStructuralRelationGraphOptions,
  _nodes: readonly StructuralRelationNode[],
  quoteRelations: readonly StructuralRelation[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const { tokens, layout, contentMap, lookups } = options;
  for (let clauseIndex = 0; clauseIndex < layout.clauses.length - 1; clauseIndex += 1) {
    const sourceClause = layout.clauses[clauseIndex];
    const targetClause = layout.clauses[clauseIndex + 1];
    if (sourceClause === undefined || targetClause === undefined) {
      continue;
    }
    if (sourceClause.end !== targetClause.start || sourceClause.terminatedBy !== "punctuation") {
      continue;
    }
    const markerSpan = punctuationMarkerSpanAtClauseEnd(tokens, sourceClause);
    if (markerSpan === null) {
      continue;
    }
    const sourcePredicate = punctuatedAttributiveSourcePredicate(contentMap, sourceClause, markerSpan.start);
    if (sourcePredicate === null || !contentMap.has(sourcePredicate)) {
      continue;
    }
    if (!sourceClauseCanProjectPunctuatedAttributive(
      tokens,
      sourceClause,
      sourcePredicate,
      markerSpan.start,
      contentMap.get(sourcePredicate)?.renderPlan ?? null,
      {
        closureRun: layout.utteranceClosureRunAt(markerSpan.start) ?? null,
        sfpEffect: renderPlanTerminalSfp(contentMap.get(sourcePredicate)?.renderPlan ?? null)?.effect ?? null,
        closingEffects: lookups.SFP_UTTERANCE_CLOSING_EFFECTS
      }
    )) {
      continue;
    }
    if (targetClause.leadingConnectiveIdx !== null || targetClause.leadingQuoteMarkerIdx !== null) {
      continue;
    }
    const exemplification = nominalExemplificationCarrierEvidence(options, quoteRelations, sourceClause, sourcePredicate, markerSpan);
    const target = punctuatedAttributiveTargetAnchor(
      tokens,
      punctuatedAttributiveTargetClauses(layout),
      clauseIndex + 1,
      exemplification === null ? "salient_nominal" : "source_required_head"
    );
    if (target === null) {
      continue;
    }
    relations.push({
      kind: "punctuated_attributive_modifier",
      source: predicateAnchor(sourcePredicate, clauseIndex),
      target: nounPhraseAnchor(target),
      markerSpans: [markerSpan],
      ...(exemplification === null ? {} : {
        candidateSuppressibleTokenSpans: [
          { ...exemplification.quoteMarkerSpan, reason: "relation_marker" },
          ...(exemplification.exemplificationMarkerSpan === null
            ? []
            : [{ ...exemplification.exemplificationMarkerSpan, reason: "relation_marker" }]),
        ],
        nominalExemplification: exemplification,
      }),
      projection: {
        sourceForm: "attributive",
        targetSlot: "noun_modifier",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      provenance: "structural_relation_owner",
    });
  }
  return relations;
}

function nominalExemplificationCarrierEvidence(
  options: BuildStructuralRelationGraphOptions,
  quoteRelations: readonly StructuralRelation[],
  sourceClause: Clause,
  sourcePredicate: number,
  pauseMarkerSpan: StructuralRelationMarkerSpan,
): StructuralNominalExemplificationPayload | null {
  const { tokens, layout } = options;
  const quote = quoteRelations.find((relation) =>
    relation.quote !== undefined && relation.quote.hostMatch.hostIdx === sourcePredicate
  )?.quote;
  if (
    quote === undefined ||
    !IU_LEXEME_FORMS.has(quote.hostMatch.hostForm) ||
    !NOMINAL_EXEMPLIFICATION_QUOTE_MARKERS.has(quote.markerBaseSurface)
  ) {
    return null;
  }
  const ownsEventArgument = layout.argumentRolesOf(sourcePredicate).some(({ particleIdx }) =>
    !(quote.markerSpan.start <= particleIdx && particleIdx < quote.markerSpan.endExclusive) &&
    !(quote.contentSpan.start <= particleIdx && particleIdx < quote.contentSpan.endExclusive)
  );
  if (ownsEventArgument || layout.adverbialAdjunctsOf(sourcePredicate).length > 0) {
    return null;
  }
  const pastIdx = nextNonSpaceIndex(tokens, sourcePredicate + 1, sourceClause.end);
  const pastToken = pastIdx === null ? undefined : tokens[pastIdx];
  if (
    pastIdx === null || pastToken === undefined || !isPastAuxiliaryPos(pastToken.pos) ||
    nextNonSpaceIndex(tokens, pastIdx + 1, sourceClause.end) !== pauseMarkerSpan.start
  ) {
    return null;
  }
  let lastIdx = quote.contentSpan.endExclusive - 1;
  while (lastIdx >= quote.contentSpan.start) {
    const token = tokens[lastIdx];
    const closesQuote = layout.quoteSpans.some(([opening, closingIdx]) =>
      closingIdx === lastIdx && opening >= quote.contentSpan.start
    );
    if (
      token === undefined ||
      !(closesQuote || (
        (token.pos & POS0) === 補助記号 &&
        !isClauseHardTerminalPunctuationToken(token) &&
        !isClauseOpeningPunctuationToken(token)
      ))
    ) {
      break;
    }
    lastIdx -= 1;
  }
  const lastToken = tokens[lastIdx];
  if (lastToken === undefined || lastIdx < quote.contentSpan.start) {
    return null;
  }
  const exemplificationMarker = tokenMatchesConnectiveKind(lastToken, "exemplification") ? lastIdx : null;
  const headIdx = exemplificationMarker === null ? lastIdx : lastIdx - 1;
  const headToken = tokens[headIdx];
  if (
    headToken === undefined ||
    headIdx < quote.contentSpan.start ||
    !isNominalLike(headToken) ||
    layout.clauses.some((clause) => clause.predicates.includes(headIdx))
  ) {
    return null;
  }
  return {
    contentSpan: { start: quote.contentSpan.start, endExclusive: quote.contentSpan.endExclusive },
    quoteMarkerSpan: { start: quote.markerSpan.start, endExclusive: quote.markerSpan.endExclusive },
    hostIdx: quote.hostMatch.hostIdx,
    exemplificationMarkerSpan: exemplificationMarker === null
      ? null
      : { start: exemplificationMarker, endExclusive: exemplificationMarker + 1 },
  };
}

type CollectResult =
  | { readonly kind: "relation"; readonly relation: StructuralRelation }
  | { readonly kind: "diagnostic"; readonly diagnostic: StructuralRelationDiagnostic }
  | { readonly kind: "none" };

function pushCollectResult(
  result: CollectResult,
  relations: StructuralRelation[],
  diagnostics: StructuralRelationDiagnostic[],
): void {
  if (result.kind === "relation") {
    relations.push(result.relation);
    return;
  }
  if (result.kind === "diagnostic") {
    diagnostics.push(result.diagnostic);
  }
}

function collectListingExampleRelation(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): CollectResult {
  const { tokens, layout } = options;
  const sourceClauseIndex = layout.clauseIndexOfToken(markerStart);
  const sourceClause = sourceClauseIndex < 0 ? undefined : layout.clauses[sourceClauseIndex];
  if (sourceClause === undefined) {
    return degraded(match, markerStart, "listing marker has no source clause");
  }
  const closure = relationDiscontinuousClosureSpanAfter(new TokenCursor(tokens, match.endExclusive, sourceClause.end), match);
  if (closure === null) {
    return degraded(match, markerStart, "listing marker has no closure と");
  }
  if (!listingClosureCanCloseBeforeClauseBoundary(tokens, closure.endExclusive, sourceClause.end, options.lookups)) {
    return degraded(match, markerStart, "listing closure と is not a clause-final example marker");
  }
  const targetClauseIndex = nextClauseIndex(layout, sourceClauseIndex);
  const targetClause = targetClauseIndex === null ? undefined : layout.clauses[targetClauseIndex];
  if (targetClauseIndex === null || targetClause === undefined) {
    return degraded(match, markerStart, "listing relation has no target clause");
  }
  const markerSpan = markerSpanFromMatch(markerStart, match, match.markerRole ?? "listing_tail");
  const closureSpan: StructuralRelationMarkerSpan = {
    start: closure.start,
    endExclusive: closure.endExclusive,
    surface: closure.surface,
    role: closure.role ?? "closure_marker",
  };
  const clauseSource = clauseAnchor(nodes, sourceClauseIndex);
  const markerHostPredicate = layout.previousPredicateInClause(markerStart);
  return {
    kind: "relation",
    relation: {
      kind: match.relationPolicy,
      source: clauseSource.kind === "clause" && markerHostPredicate !== undefined
        ? { ...clauseSource, predicateIdx: markerHostPredicate }
        : clauseSource,
      target: clauseAnchor(nodes, targetClauseIndex),
      markerSpans: [markerSpan, closureSpan],
      candidateSuppressibleTokenSpans: [
        { start: markerSpan.start, endExclusive: markerSpan.endExclusive, reason: "relation_marker" },
        { start: closureSpan.start, endExclusive: closureSpan.endExclusive, reason: "relation_marker" },
      ],
      projection: projectionRequest(match.projection ?? "listing", match),
      confidence: "strict",
      ...layoutBoundaryRelationPayload(match),
      ...renderEnabledRelationPayload(match),
      provenance: "structural_relation_owner",
    },
  };
}

function collectCorrelativeDegreeRelation(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): CollectResult {
  const { tokens, layout, contentMap } = options;
  const searchEnd = correlativeSearchEnd(tokens, match.endExclusive);
  const degree = findCorrelativeDegreeMarker(tokens, match.endExclusive, searchEnd);
  if (degree === null) {
    return degraded(match, markerStart, "correlative marker has no degree marker");
  }
  const sourceClauseIndex = layout.clauseIndexOfToken(markerStart);
  const degreeClauseIndex = layout.clauseIndexOfToken(degree.start);
  const targetIndex = nextContentTokenIndex(tokens, degree.endExclusive, tokens.length);
  const targetClauseIndex = targetIndex === null ? null : layout.clauseIndexOfToken(targetIndex);
  if (sourceClauseIndex < 0 || degreeClauseIndex < 0 || targetClauseIndex === null || targetClauseIndex < 0) {
    return degraded(match, markerStart, "correlative relation has no target clause");
  }
  const targetClause = layout.clauses[targetClauseIndex];
  if (targetClause === undefined) {
    return degraded(match, markerStart, "correlative relation target clause missing");
  }
  const leftPredicate = layout.predicateOccurrenceBefore(tokens, contentMap, markerStart);
  const rightPredicate = layout.predicateOccurrenceBefore(tokens, contentMap, degree.start);
  const confidence = correlativeConfidence(tokens, leftPredicate, rightPredicate);
  if (confidence === "weak") {
    return {
      kind: "diagnostic",
      diagnostic: structuralRelationDegraded({
        message: "correlative degree markers lack strict predicate compatibility",
        relationKind: match.relationPolicy,
        confidence,
        ...layoutBoundaryDiagnosticPayload(match),
        clauseId: structuralRelationNodeId(sourceClauseIndex),
        span: markerSpanFromMatch(markerStart, match, match.markerRole ?? "conditional_marker"),
        markerSpans: [
          markerSpanFromMatch(markerStart, match, match.markerRole ?? "conditional_marker"),
          degree.markerSpan,
        ],
      }),
    };
  }
  const markerSpan = markerSpanFromMatch(markerStart, match, match.markerRole ?? "conditional_marker");
  return {
    kind: "relation",
    relation: {
      kind: match.relationPolicy,
      source: clauseAnchor(nodes, sourceClauseIndex),
      target: spanAnchor({
        start: degree.endExclusive,
        endExclusive: targetClause.end,
        clauseIndex: targetClauseIndex,
      }),
      markerSpans: [markerSpan, degree.markerSpan],
      candidateSuppressibleTokenSpans: [
        { start: markerSpan.start, endExclusive: markerSpan.endExclusive, reason: "relation_marker" },
        { start: degree.markerSpan.start, endExclusive: degree.markerSpan.endExclusive, reason: "relation_marker" },
      ],
      projection: projectionRequest(match.projection ?? "correlative_degree", match),
      confidence,
      ...layoutBoundaryRelationPayload(match),
      ...renderEnabledRelationPayload(match),
      provenance: "structural_relation_owner",
    },
  };
}

function collectPurposeModifierRelation(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): CollectResult {
  const evidence = purposeModifierEvidence(options, markerStart, match);
  if (!evidence.ok) {
    return degraded(match, markerStart, evidence.reason);
  }
  const markerSpan = markerSpanFromMatch(markerStart, match, "purpose_marker");
  return {
    kind: "relation",
    relation: {
      kind: match.relationPolicy,
      source: clauseAnchor(nodes, evidence.sourceClauseIndex),
      target: targetSpanAnchor(evidence.targetSpan),
      markerSpans: [markerSpan],
      candidateSuppressibleTokenSpans: [{
        start: markerSpan.start,
        endExclusive: markerSpan.endExclusive,
        reason: "relation_marker",
      }],
      projection: projectionRequest(match.projection ?? "purpose_attributive", match),
      confidence: "strict",
      ...layoutBoundaryRelationPayload(match),
      ...renderEnabledRelationPayload(match),
      provenance: "structural_relation_owner",
    },
  };
}

type PurposeModifierEvidence =
  | {
    readonly ok: true;
    readonly sourcePredicate: number;
    readonly sourceClauseIndex: number;
    readonly targetSpan: StructuralRelationTargetSpan;
  }
  | { readonly ok: false; readonly reason: string };

function purposeModifierEvidence(
  options: BuildStructuralRelationGraphOptions,
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): PurposeModifierEvidence {
  const { tokens, layout } = options;
  const sourcePredicate = layout.predicateBeforeNominalClosure(markerStart)
    ?? layout.previousPredicateInClause(markerStart);
  const sourceClauseIndex = sourcePredicate === undefined ? -1 : layout.clauseIndexOfPredicate(sourcePredicate) ?? -1;
  if (sourcePredicate === undefined || sourceClauseIndex < 0 || !options.contentMap.has(sourcePredicate)) {
    return { ok: false, reason: "purpose modifier marker has no source predicate" };
  }
  const sourceClause = layout.clauses[sourceClauseIndex];
  if (
    sourceClause !== undefined &&
    hasStrictReasonEvidence(tokens, sourceClause, markerStart, match.endExclusive, options.contentMap)
  ) {
    return { ok: false, reason: "purpose modifier marker conflicts with strict reason evidence" };
  }
  if (!hasPurposeModifierSourceEvidence(tokens, sourcePredicate, markerStart, sourceClause?.start ?? 0)) {
    return { ok: false, reason: "purpose modifier marker lacks purpose source evidence" };
  }
  if (explicitNominalPurposeFrameFollows(tokens, match.endExclusive)) {
    return { ok: false, reason: "purpose modifier marker is owned by explicit nominal frame" };
  }
  const targetSpan = nounPhraseTargetAfter(tokens, match.endExclusive, purposeModifierTargetSearchEnd(tokens, match.endExclusive));
  if (targetSpan === null) {
    return { ok: false, reason: "purpose modifier marker has no target noun phrase" };
  }
  if (!hasPurposeModifierTargetArgumentEvidence(tokens, targetSpan)) {
    return { ok: false, reason: "purpose modifier target lacks argument evidence" };
  }
  return { ok: true, sourcePredicate, sourceClauseIndex, targetSpan };
}

function hasPurposeModifierSourceEvidence(
  tokens: readonly ClauseToken[],
  sourcePredicate: number,
  markerStart: number,
  lowerBoundInclusive: number,
): boolean {
  const predicate = tokens[sourcePredicate];
  if (predicate === undefined) {
    return false;
  }
  const conj5A = predicate.pos & POS5A;
  const pos0 = predicate.pos & POS0;
  if (pos0 !== 動詞 || conj5A !== 連体形_) {
    return false;
  }
  const last = previousContentTokenIndex(tokens, markerStart - 1, lowerBoundInclusive);
  return last === sourcePredicate;
}

function explicitNominalPurposeFrameFollows(tokens: readonly ClauseToken[], markerEndExclusive: number): boolean {
  const next = nextContentTokenIndex(tokens, markerEndExclusive, tokens.length);
  if (next === null) {
    return false;
  }
  const token = tokens[next];
  return token !== undefined && (token.pos & POS0) === 助詞 && (token.surface === "の" || token.surface === "に");
}

function purposeModifierTargetSearchEnd(tokens: readonly ClauseToken[], start: number): number {
  const c = new TokenCursor(tokens, start, tokens.length);
  while (c.current()) {
    const token = c.current()!;
    if (isHardTerminalPunctuationToken(token) || isClausePunctuationToken(token)) {
      return c.pos;
    }
    c.advance();
  }
  return tokens.length;
}

function hasPurposeModifierTargetArgumentEvidence(
  tokens: readonly ClauseToken[],
  targetSpan: StructuralRelationTargetSpan,
): boolean {
  const next = nextContentTokenIndex(tokens, targetSpan.endExclusive, tokens.length);
  if (next === null) {
    return true;
  }
  const token = tokens[next];
  if (
    token === undefined ||
    (token.pos & POS0) !== 助詞 ||
    !(token.surface === "が" || token.surface === "は" || token.surface === "も" || token.surface === "を")
  ) {
    return false;
  }
  if ((token.surface === "が" || token.surface === "は" || token.surface === "も") && !targetSpanHasPrenominalModifier(tokens, targetSpan)) {
    return false;
  }
  return true;
}

function targetSpanHasPrenominalModifier(
  tokens: readonly ClauseToken[],
  targetSpan: StructuralRelationTargetSpan,
): boolean {
  const c = new TokenCursor(tokens, targetSpan.start, targetSpan.endExclusive - 1);
  while (c.current()) {
    const token = c.current()!;
    const pos0 = token.pos & POS0;
    if (pos0 === 形状詞 || pos0 === 形容詞0 || pos0 === 連体詞 || token.surface === "な" || token.surface === "の") {
      return true;
    }
    c.advance();
  }
  return false;
}

function punctuationMarkerSpanAtClauseEnd(
  tokens: readonly ClauseToken[],
  clause: Clause,
): StructuralRelationMarkerSpan | null {
  for (let index = clause.end - 1; index >= clause.start; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (!isClauseEvidenceTransparentPunctuation(token)) {
      return null;
    }
    return {
      start: index,
      endExclusive: index + 1,
      surface: token.surface,
      role: "punctuated_attributive_marker",
    };
  }
  return null;
}

function sourceClauseCanProjectPunctuatedAttributive(
  tokens: readonly ClauseToken[],
  clause: Clause,
  predicateIdx: number,
  markerStart: number,
  sourcePlan: RenderPlan | null,
  closure: {
    readonly closureRun: UtteranceClosureRunEvidence | null;
    readonly sfpEffect: SfpEffect | null;
    readonly closingEffects: ReadonlySet<string>;
  },
): boolean {
  const predicate = tokens[predicateIdx];
  if (predicate === undefined) {
    return false;
  }
  if (utteranceClosedForAttributiveProjection(
    closure.closureRun,
    closure.sfpEffect,
    closure.closingEffects
  )) {
    return false;
  }
  const last = previousNonSpaceIndex(tokens, markerStart, clause.start);
  const token = last === null ? undefined : tokens[last];
  if (token === undefined) {
    return false;
  }
  const predicatePos0 = predicate.pos & POS0;
  const pos5a = token.pos & POS5A;
  if (predicatePos0 === 動詞 || sourceClauseHasVerbPredicateTail(tokens, predicateIdx, markerStart)) {
    return pos5a === 終止形_ || pos5a === 連体形_;
  }
  if (
    predicatePos0 === 形容詞0 &&
    (last === predicateIdx || sourceClauseHasAdjectivePredicateTail(tokens, predicateIdx, markerStart))
  ) {
    return pos5a === 終止形_ || pos5a === 連体形_;
  }
  if (
    isPredicateHeadTailChainRenderPlan(sourcePlan) &&
    tailRootClosesWithCopulaAttributive(sourcePlan.realization.root)
  ) {
    return pos5a === 連体形_;
  }
  return false;
}

function punctuatedAttributiveSourcePredicate(
  contentMap: ContentMap,
  clause: Clause,
  markerStart: number,
): number | null {
  for (let index = clause.predicates.length - 1; index >= 0; index -= 1) {
    const predicateIdx = clause.predicates[index];
    if (predicateIdx !== undefined && predicateIdx < markerStart && contentMap.has(predicateIdx)) {
      return predicateIdx;
    }
  }
  return null;
}

function sourceClauseHasVerbPredicateTail(
  tokens: readonly ClauseToken[],
  predicateIdx: number,
  markerStart: number,
): boolean {
  const c = new TokenCursor(tokens, predicateIdx + 1, markerStart);
  while (c.current()) {
    const token = c.current()!;
    if (pos0in(token.pos, (1 << 補助記号))) {
      c.advance();
      continue;
    }
    if ((token.pos & POS0) === 動詞) {
      return true;
    }
    c.advance();
  }
  return false;
}

function sourceClauseHasAdjectivePredicateTail(
  tokens: readonly ClauseToken[],
  predicateIdx: number,
  markerStart: number,
): boolean {
  let sawTailToken = false;
  const c = new TokenCursor(tokens, predicateIdx + 1, markerStart);
  while (c.current()) {
    const token = c.current()!;
    if ((token.pos & POS0) === 助動詞 && token.dictionaryForm === "た") {
      sawTailToken = true;
      c.advance();
      continue;
    }
    if ((token.pos & POS01) === (形容詞0 | 非自立可能) && token.dictionaryForm === "ない") {
      sawTailToken = true;
      c.advance();
      continue;
    }
    return false;
  }
  return sawTailToken;
}

function degraded(match: RelationConnectiveSpanMatch, markerStart: number, message: string): CollectResult {
  const markerSpan = markerSpanFromMatch(markerStart, match);
  return {
    kind: "diagnostic",
    diagnostic: structuralRelationDegraded({
      message,
      relationKind: match.relationPolicy,
      confidence: "weak",
      ...layoutBoundaryDiagnosticPayload(match),
      span: markerSpan,
      markerSpans: [markerSpan],
    }),
  };
}

function hasNounModifierTarget(
  options: BuildStructuralRelationGraphOptions,
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): boolean {
  return purposeModifierEvidence(options, markerStart, match).ok;
}

function shouldDeferContiguousForPurposeModifier(
  options: BuildStructuralRelationGraphOptions,
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): boolean {
  return purposeModifierEvidence(options, markerStart, match).ok;
}

function buildStructuralRelationNodes(layout: ClauseLayout, contentMap: ContentMap): readonly StructuralRelationNode[] {
  return layout.clauses.map((clause, clauseIndex): StructuralRelationNode => {
    const contentSpanStart = contentSpanStartForClause(clause.start, clause.end, clause.primaryPredicate, contentMap);
    return {
      id: structuralRelationNodeId(clauseIndex),
      span: tokenSpan(clause.start, clause.end),
      kind: clause.kind,
      predicateIndex: clause.primaryPredicate,
      renderHandle: null,
      contentSpanId: contentSpanStart === null ? null : structuralRelationContentSpanId(contentSpanStart),
    };
  });
}

function clauseAnchor(nodes: readonly StructuralRelationNode[], clauseIndex: number): StructuralAnchor {
  const node = nodes[clauseIndex];
  return {
    kind: "clause",
    clauseId: node?.id ?? structuralRelationNodeId(clauseIndex),
    span: node?.span ?? tokenSpan(0, 0),
    predicateIdx: node?.predicateIndex ?? null,
  };
}

function spanAnchor(options: {
  readonly start: number;
  readonly endExclusive: number;
  readonly clauseIndex: number | null;
}): StructuralAnchor {
  return {
    kind: "span",
    span: tokenSpan(options.start, options.endExclusive),
    clauseId: options.clauseIndex === null || options.clauseIndex < 0
      ? null
      : structuralRelationNodeId(options.clauseIndex),
  };
}

function predicateAnchor(predicateIdx: number, clauseIndex: number | null): StructuralAnchor {
  return {
    kind: "predicate",
    predicateIdx,
    clauseId: clauseIndex === null || clauseIndex < 0
      ? null
      : structuralRelationNodeId(clauseIndex),
    span: tokenSpan(predicateIdx, predicateIdx + 1),
  };
}

function targetSpanAnchor(targetSpan: StructuralRelationTargetSpan): StructuralAnchor {
  if (targetSpan.kind === "noun_phrase") {
    return {
      kind: "noun_phrase",
      span: tokenSpan(targetSpan.start, targetSpan.endExclusive),
      headIdx: targetSpan.endExclusive > targetSpan.start ? targetSpan.endExclusive - 1 : null,
    };
  }
  return {
    kind: "span",
    span: tokenSpan(targetSpan.start, targetSpan.endExclusive),
    clauseId: null,
  };
}

function nounPhraseAnchor(anchor: ClauseNominalClosureAnchor): StructuralAnchor {
  return {
    kind: "noun_phrase",
    span: tokenSpan(anchor.span.start, anchor.span.endExclusive),
    headIdx: anchor.headIdx,
  };
}

interface ReasonCopulaShellMatch {
  readonly start: number;
  readonly endExclusive: number;
  readonly surface: string;
  readonly payload: StructuralReasonCopulaPayload;
}

function collectReasonCopulaExplanationRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const { tokens, layout, contentMap } = options;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!isStrictReasonKaraToken(token)) {
      continue;
    }
    const sourceClauseIndex = layout.clauseIndexOfToken(index);
    const sourceClause = sourceClauseIndex < 0 ? undefined : layout.clauses[sourceClauseIndex];
    if (sourceClause === undefined || !hasReasonCleftEvidence(layout, tokens, contentMap, sourceClause, index, index + 1)) {
      continue;
    }
    const copulaStart = nextContentTokenIndex(tokens, index + 1, tokens.length);
    if (copulaStart === null) {
      continue;
    }
    const copulaShell = matchReasonCopulaShellAt(tokens, copulaStart);
    if (copulaShell === null) {
      continue;
    }
    const afterCopula = nextContentTokenIndex(tokens, copulaShell.endExclusive, tokens.length);
    const quoteMarkerSpan = quoteMarkerSpanForHostlessReasonCopula(tokens, afterCopula);
    const sfpMatch = quoteMarkerSpan === null
      ? reasonCopulaTerminalSfpAt(tokens, afterCopula, copulaShell.payload)
      : null;
    const relationEnd = quoteMarkerSpan?.endExclusive ?? sfpMatch?.markerSpan.endExclusive ?? copulaShell.endExclusive;
    const afterRelation = nextContentTokenIndex(tokens, relationEnd, tokens.length);
    if (!hostlessReasonCopulaCanEndBefore(afterRelation === null ? undefined : tokens[afterRelation])) {
      continue;
    }
    const reasonMarkerSpan: StructuralRelationMarkerSpan = {
      start: index,
      endExclusive: index + 1,
      surface: token.surface,
      role: "reason_marker",
    };
    const copulaMarkerSpan: StructuralRelationMarkerSpan = {
      start: copulaShell.start,
      endExclusive: copulaShell.endExclusive,
      surface: copulaShell.surface,
      role: "explanatory_copula",
    };
    const trailingMarkerSpan = quoteMarkerSpan ?? sfpMatch?.markerSpan ?? null;
    const markerSpans = trailingMarkerSpan === null
      ? [reasonMarkerSpan, copulaMarkerSpan]
      : [reasonMarkerSpan, copulaMarkerSpan, trailingMarkerSpan];
    relations.push({
      kind: "reason_copula_explanation",
      source: clauseAnchor(nodes, sourceClauseIndex),
      target: null,
      markerSpans,
      candidateSuppressibleTokenSpans: markerSpans.map((span) => ({
        start: span.start,
        endExclusive: span.endExclusive,
        reason: span.role ?? "reason_copula_marker",
      })),
      projection: {
        sourceForm: "reason",
        targetSlot: "clause_prefix",
      },
      reasonCopula: sfpMatch === null ? copulaShell.payload : { ...copulaShell.payload, sfp: sfpMatch.sfp },
      confidence: "strict",
      renderEnabledByDefault: true,
      provenance: "structural_relation_owner",
    });
  }
  return relations;
}

function matchReasonCopulaShellAt(
  tokens: readonly ClauseToken[],
  start: number,
): ReasonCopulaShellMatch | null {
  const negativeCursor = new TokenCursor(tokens, start, tokens.length);
  const negative = matchCopulaNegation(negativeCursor);
  if (negative !== undefined) {
    const negativeHead = tokens[negativeCursor.pos - negative[5].length - 1];
    const conjecture = reasonCopulaNegativeConjecture(negativeHead, negative[5]);
    if (
      conjecture === undefined ||
      negative[4] ||
      (negativeHead !== undefined && isConditionalInflection(negativeHead.pos))
    ) {
      return null;
    }
    const trailingTe = negative[2] ? negativeCursor.current() : undefined;
    if (trailingTe?.surface === "て" && isTeConnectiveToken(trailingTe)) {
      negativeCursor.advance(1);
    }
    return {
      start,
      endExclusive: negativeCursor.pos,
      surface: markerSurface(tokens, start, negativeCursor.pos),
      payload: {
        negative: true,
        polite: negative[0],
        past: negative[1],
        connective: negative[2],
        additiveMo: negative[3],
        conditionalNara: negative[4],
        conjecture,
        sfp: null,
      },
    };
  }
  const first = tokens[start];
  if (!isBasicCopulaAuxToken(first)) {
    return null;
  }
  const conjectureShell = reasonCopulaConjectureShellAt(tokens, start);
  if (conjectureShell !== null) {
    return conjectureShell;
  }
  const next = nextContentTokenIndex(tokens, start + 1, tokens.length);
  const nextToken = next === null ? undefined : tokens[next];
  if (next !== null && nextToken !== undefined && isPastAuxiliaryPos(nextToken.pos)) {
    if (isPastAuxConditionalForm(nextToken.pos)) {
      return null;
    }
    return {
      start,
      endExclusive: next + 1,
      surface: markerSurface(tokens, start, next + 1),
      payload: {
        negative: false,
        polite: reasonCopulaTokenPoliteness(first),
        past: true,
        connective: false,
        additiveMo: false,
        conditionalNara: false,
        conjecture: null,
        sfp: null,
      },
    };
  }
  return {
    start,
    endExclusive: start + 1,
    surface: first.surface,
    payload: {
      negative: false,
      polite: reasonCopulaTokenPoliteness(first),
      past: false,
      connective: isCopulaDaRenyouToken(first),
      additiveMo: false,
      conditionalNara: false,
      conjecture: null,
      sfp: null,
    },
  };
}

function reasonCopulaTokenPoliteness(token: ClauseToken): boolean {
  return isPoliteCopulaPos(token.pos) || token.dictionaryForm === "です";
}

function reasonCopulaConjectureShellAt(
  tokens: readonly ClauseToken[],
  start: number,
): ReasonCopulaShellMatch | null {
  const first = tokens[start];
  if (first === undefined) {
    return null;
  }
  const firstPoliteness = conjectureCopulaPoliteness(first.pos);
  if (firstPoliteness !== null) {
    return reasonCopulaConjectureShell(tokens, start, start + 1, firstPoliteness, false);
  }
  const next = nextContentTokenIndex(tokens, start + 1, tokens.length);
  const nextToken = next === null ? undefined : tokens[next];
  if (next === null || nextToken === undefined || !isPastAuxiliaryPos(nextToken.pos)) {
    return null;
  }
  if (isVolitionalInflection(nextToken.pos)) {
    return reasonCopulaConjectureShell(
      tokens,
      start,
      next + 1,
      reasonCopulaTokenPoliteness(first) ? "polite" : "plain",
      true,
    );
  }
  if (isPastAuxConditionalForm(nextToken.pos)) {
    return null;
  }
  const after = nextContentTokenIndex(tokens, next + 1, tokens.length);
  const afterToken = after === null ? undefined : tokens[after];
  const afterPoliteness = afterToken === undefined ? null : conjectureCopulaPoliteness(afterToken.pos);
  if (after === null || afterToken === undefined || afterPoliteness === null || !isBasicCopulaAuxToken(afterToken)) {
    return null;
  }
  return reasonCopulaConjectureShell(tokens, start, after + 1, afterPoliteness, true);
}

function reasonCopulaConjectureShell(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
  politeness: "plain" | "polite",
  past: boolean,
): ReasonCopulaShellMatch {
  const polite = politeness === "polite";
  return {
    start,
    endExclusive,
    surface: markerSurface(tokens, start, endExclusive),
    payload: {
      negative: false,
      polite,
      past,
      connective: false,
      additiveMo: false,
      conditionalNara: false,
      conjecture: { polite },
      sfp: null,
    },
  };
}

function reasonCopulaNegativeConjecture(
  negativeHead: ClauseToken | undefined,
  auxTokens: readonly ClauseToken[],
): StructuralReasonCopulaPayload["conjecture"] | undefined {
  let conjecture: StructuralReasonCopulaPayload["conjecture"] =
    negativeHead !== undefined && isVolitionalInflection(negativeHead.pos)
      ? { polite: false }
      : null;
  for (const token of auxTokens) {
    const conjecturePoliteness = conjectureCopulaPoliteness(token.pos);
    if (conjecturePoliteness !== null) {
      if (conjecture !== null) return undefined;
      conjecture = { polite: conjecturePoliteness === "polite" };
      continue;
    }
    if (!isReasonCopulaNegativeShellAuxiliary(token.pos)) return undefined;
  }
  return conjecture;
}

interface ReasonCopulaTerminalSfpMatch {
  readonly markerSpan: StructuralRelationMarkerSpan;
  readonly sfp: StructuralReasonCopulaSfp;
}

const REASON_COPULA_REALIZABLE_SFP_EFFECTS: ReadonlySet<string> =
  new Set<StructuralReasonCopulaSfpEffect>(["ne", "na_excl", "jan", "yone_confirm", "explanatory"]);

function isRealizableReasonCopulaSfpEffect(effect: SfpEffect): effect is StructuralReasonCopulaSfpEffect {
  return REASON_COPULA_REALIZABLE_SFP_EFFECTS.has(effect);
}

function reasonCopulaTerminalSfpAt(
  tokens: readonly ClauseToken[],
  index: number | null,
  payload: StructuralReasonCopulaPayload,
): ReasonCopulaTerminalSfpMatch | null {
  if (index === null || tokens[index] === undefined) {
    return null;
  }
  if (payload.negative || payload.connective) {
    return null;
  }
  const cursor = new TokenCursor(tokens as readonly RuntimeHaruToken[], index, tokens.length);
  const detected = detectSfpWithNode(cursor, 助動詞, true);
  if (detected === null || cursor.pos <= index) {
    return null;
  }
  const effect = detected.node.effect;
  if (effect !== null && !isRealizableReasonCopulaSfpEffect(effect)) {
    return null;
  }
  return {
    markerSpan: {
      start: index,
      endExclusive: cursor.pos,
      surface: markerSurface(tokens, index, cursor.pos),
      role: "terminal_sfp",
    },
    sfp: { effect, surface: detected.node.surface },
  };
}

function quoteMarkerSpanForHostlessReasonCopula(
  tokens: readonly ClauseToken[],
  index: number | null,
): StructuralRelationMarkerSpan | null {
  const token = index === null ? undefined : tokens[index];
  if (index === null || token === undefined) {
    return null;
  }
  if (token.surface !== "と" && token.surface !== "って") {
    return null;
  }
  return {
    start: index,
    endExclusive: index + 1,
    surface: token.surface,
    role: "quotative_marker",
  };
}

function hostlessReasonCopulaCanEndBefore(token: ClauseToken | undefined): boolean {
  return token === undefined || isClausePunctuationToken(token);
}

function isStrictReasonKaraToken(token: ClauseToken | undefined): token is ClauseToken {
  return token !== undefined &&
    (token.surface === "から" || token.dictionaryForm === "から") &&
    (token.pos & POS01) === 助詞_接続助詞;
}

function isBasicCopulaAuxToken(token: ClauseToken | undefined): token is ClauseToken {
  if (token === undefined || (token.pos & POS0) !== 助動詞) {
    return false;
  }
  const pos4 = token.pos & POS4;
  return pos4 === 助動詞_ダ ||
    pos4 === 助動詞_デス ||
    token.dictionaryForm === "だ" ||
    token.dictionaryForm === "です";
}

function isCopulaDaRenyouToken(token: ClauseToken): boolean {
  return token.surface === "で" &&
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_);
}

function collectQuoteStructuralRelationsFromOptions(options: BuildStructuralRelationGraphOptions): readonly StructuralRelation[] {
  const tokens = options.tokens as readonly RuntimeHaruToken[];
  const existingQuoteRelations = collectQuoteStructuralRelations({
    tokens,
    cursor: new TokenCursor(tokens, 0, tokens.length),
    lookups: options.lookups,
  });
  const copulaClosedTokaRelations = collectCopulaClosedTokaQuoteRelations({
    tokens,
    layout: options.layout,
    contentMap: options.contentMap,
    lookups: options.lookups,
  });
  const relations = [
    ...existingQuoteRelations.filter((relation) => !copulaClosedTokaRelations.some((full) =>
      supersedesPartialQuoteMarkerRelation(full, relation)
    )),
    ...collectBareKaQuestionContentRelations({
      tokens,
      layout: options.layout,
      contentMap: options.contentMap,
      lookups: options.lookups,
    }),
    ...copulaClosedTokaRelations,
  ];
  return relations.map((relation) => {
    const quote = relation.quote;
    if (quote === undefined) return relation;
    if (quote.questionBoundaryKind === "bare_ka" || quote.questionBoundaryKind === "nominalized_no_ka") {
      return relation;
    }
    if (quote.explicitQuotation === true && relation.renderEnabledByDefault !== true) {
      return relation;
    }
    if (quote.markerRealization !== undefined) {
      return relation;
    }
    const hostPlan = options.contentMap.get(quote.hostMatch.hostIdx)?.renderPlan ?? null;
    const attributiveTypification = TYPIFICATION_QUOTATIVE_HEADS.has(
      attributiveModifierPlanSourceFacts(hostPlan)?.headDictionaryForm ?? ""
    );
    const contentPredicateIdx = options.layout.clauses.flatMap((clause) =>
      clause.end <= quote.contentSpan.start || quote.contentSpan.endExclusive <= clause.start
        ? []
        : clause.predicates
    ).filter((index) =>
      quote.contentSpan.start <= index &&
      index < quote.contentSpan.endExclusive &&
      options.contentMap.has(index)
    ).at(-1) ?? null;
    const startPlan = options.contentMap.get(quote.contentSpan.start)?.renderPlan ?? null;
    const contentPredicatePlan = contentPredicateIdx === null
      ? null
      : options.contentMap.get(contentPredicateIdx)?.renderPlan ?? null;
    const conjectureQuote = renderPlanHasConjectureQuote(contentPredicatePlan);
    const predicateIdx = contentPredicateIdx !== null
      ? renderPlanTerminalSfp(options.contentMap.get(contentPredicateIdx)?.renderPlan ?? null) !== null
        ? contentPredicateIdx
        : null
      : renderPlanTerminalSfp(startPlan) !== null && options.contentMap.has(quote.contentSpan.start)
        ? quote.contentSpan.start
        : null;
    if (predicateIdx === null) {
      const absorbed = attributiveTypification || conjectureQuote
        ? null
        : markerAbsorbedContentCopula(options.layout, tokens, quote, options.contentMap);
      if (absorbed !== null) {
        return {
          ...relation,
          renderEnabledByDefault: true,
          quote: {
            ...quote,
            contentPredicateIdx: absorbed.nounIdx,
            markerAbsorbedContentCopulaIdx: absorbed.copulaIdx,
          },
        };
      }
      const withoutAbsorption = quote.markerAbsorbedContentCopulaIdx === undefined
        ? relation
        : { ...relation, quote: withoutMarkerAbsorbedCopula(quote) };
      return attributiveTypification || conjectureQuote
        ? { ...withoutAbsorption, renderEnabledByDefault: true }
        : withoutAbsorption;
    }
    const span = options.contentMap.get(predicateIdx);
    if (span === undefined) return relation;
    const sfp = renderPlanTerminalSfp(span.renderPlan);
    if (sfp === null) return relation;
    const requestSource = quote.request === undefined && isPredicateHeadTailChainRenderPlan(contentPredicatePlan)
      ? tailRootQuoteRequestSourceEvidence(contentPredicatePlan.realization.root) : null;
    const enriched = requestSource === null ? relation
      : quoteRelationWithRequestSourceEvidence(tokens, relation, requestSource, options.lookups);
    return {
      ...enriched,
      renderEnabledByDefault: true,
      quote: {
        ...enriched.quote,
        terminalSfp: sfp,
        terminalSfpMarkerBridgeSpan: terminalSfpQuoteMarkerBridgeSpan(tokens, sfp, enriched.quote.markerIdx),
        contentPredicateIdx: predicateIdx
      },
    };
  });
}

function markerAbsorbedContentCopula(
  layout: ClauseLayout,
  tokens: readonly RuntimeHaruToken[],
  quote: StructuralQuotePayload,
  contentMap: ContentMap,
): { readonly nounIdx: number; readonly copulaIdx: number } | null {
  if (quoteHostMatchIsAttributiveIu(tokens, quote.hostMatch)) {
    return null;
  }
  const closure = copulaClosedNominalPredicateBeforeMarkerAt(tokens, quote.markerSpan.start);
  const contentAnchorIdx = closure === null
    ? null
    : copulaClosedContentAnchorIdx(layout, tokens, contentMap, closure.nounIdx, closure.copulaIdx);
  if (
    closure === null ||
    contentAnchorIdx === null ||
    closure.nounIdx < quote.contentSpan.start ||
    quote.contentSpan.endExclusive <= closure.copulaIdx
  ) {
    return null;
  }
  const contentPlan = contentMap.get(contentAnchorIdx)?.renderPlan ?? null;
  if (
    contentPlan?.kind !== "lemma" ||
    (contentPlan.koreanPos !== 명사 && contentPlan.koreanPos !== 대명사)
  ) {
    return null;
  }
  if (renderPlanTerminalSfp(contentPlan) !== null) {
    return null;
  }
  return { nounIdx: contentAnchorIdx, copulaIdx: closure.copulaIdx };
}

function withoutMarkerAbsorbedCopula(quote: StructuralQuotePayload): StructuralQuotePayload {
  const { markerAbsorbedContentCopulaIdx: _removed, ...rest } = quote;
  return rest;
}

function supersedesPartialQuoteMarkerRelation(
  full: StructuralRelation,
  partial: StructuralRelation,
): boolean {
  const fullQuote = full.quote;
  const partialQuote = partial.quote;
  return fullQuote !== undefined &&
    partialQuote !== undefined &&
    fullQuote.hostMatch.hostIdx === partialQuote.hostMatch.hostIdx &&
    fullQuote.markerSpan.start <= partialQuote.markerSpan.start &&
    partialQuote.markerSpan.endExclusive <= fullQuote.markerSpan.endExclusive;
}

function renderPlanHasConjectureQuote(plan: RenderPlan | null): boolean {
  if (!isPredicateHeadTailChainRenderPlan(plan)) return false;
  const layers = plan.realization.root.tail.kind === "auxLayer"
    ? [plan.realization.root.tail]
    : [plan.realization.root.tail.inner, ...collectConjectureQuoteOuterLayers(plan.realization.root.tail.outer)];
  return layers.some((layer) => {
    const quoteIdx = layer.ops.findIndex((op) => op.kind === "connective" && op.connective === "quotative");
    return quoteIdx >= 0 && layer.ops.slice(0, quoteIdx).some((op) =>
      op.kind === "conjecture" || (op.kind === "copula" && op.variant === "conjecture")
    );
  });
}

function collectConjectureQuoteOuterLayers(
  node: import("../head-tail/tail/predicate-root/grammar.js").TailNode,
): readonly import("../head-tail/tail/predicate-root/grammar.js").AuxLayerNode[] {
  return node.kind === "auxLayer"
    ? [node]
    : [node.inner, ...collectConjectureQuoteOuterLayers(node.outer)];
}

function renderPlanTerminalSfp(plan: RenderPlan | null): import("../head-tail/tail/predicate-root/grammar.js").SfpNode | null {
  if (plan === null) return null;
  if (isPredicateHeadTailChainRenderPlan(plan)) return plan.realization.root.sfp;
  if (plan.kind === "lemma" || plan.kind === "copulaPredicate") return plan.terminalSfp ?? null;
  return null;
}

function contentSpanStartForClause(
  start: number,
  endExclusive: number,
  primaryPredicate: number | null,
  contentMap: ContentMap,
): number | null {
  if (primaryPredicate !== null && contentMap.has(primaryPredicate)) {
    return primaryPredicate;
  }
  const sortedContentStarts = Array.from(contentMap.keys()).sort((left, right) => left - right);
  for (const contentStart of sortedContentStarts) {
    if (start <= contentStart && contentStart < endExclusive) {
      return contentStart;
    }
  }
  return null;
}

export function structuralRelationNodeId(clauseIndex: number): string {
  return `clause:${clauseIndex}`;
}

export function structuralRelationContentSpanId(contentStart: number): string {
  return `content:${contentStart}`;
}

function markerSpanFromMatch(start: number, match: RelationConnectiveSpanMatch, role = `${match.relationPolicy}_marker`): StructuralRelationMarkerSpan {
  return {
    start,
    endExclusive: match.endExclusive,
    surface: match.surface,
    role,
  };
}

function nextClauseIndex(layout: ClauseLayout, sourceClauseIndex: number): number | null {
  const next = sourceClauseIndex + 1;
  return next < layout.clauses.length ? next : null;
}

function hasStrictReasonBoundary(
  tokens: readonly ClauseToken[],
  markerStart: number,
  markerEndExclusive: number,
  sourceClauseEndExclusive: number,
): boolean {
  if (markerStart >= sourceClauseEndExclusive) {
    return new TokenCursor(tokens, sourceClauseEndExclusive, markerStart).current() === undefined;
  }
  const c = new TokenCursor(tokens, markerEndExclusive, sourceClauseEndExclusive);
  while (c.current()) {
    const token = c.current()!;
    if (isClausePunctuationToken(token)) {
      return true;
    }
    return false;
  }
  return markerEndExclusive === sourceClauseEndExclusive;
}

function hasStrictReasonEvidence(
  tokens: readonly ClauseToken[],
  sourceClause: Clause,
  markerStart: number,
  markerEndExclusive: number,
  contentMap: ContentMap,
): boolean {
  return hasStrictReasonBoundary(tokens, markerStart, markerEndExclusive, sourceClause.end) &&
    hasStrictReasonSource(tokens, sourceClause, markerStart, contentMap);
}

function hasReasonCleftEvidence(
  layout: ClauseLayout,
  tokens: readonly ClauseToken[],
  contentMap: ContentMap,
  sourceClause: Clause,
  markerStart: number,
  markerEndExclusive: number,
): boolean {
  return hasStrictReasonBoundary(tokens, markerStart, markerEndExclusive, sourceClause.end) &&
    hasReasonCleftSource(layout, tokens, contentMap, markerStart);
}

function listingClosureCanCloseBeforeClauseBoundary(
  tokens: readonly ClauseToken[],
  start: number,
  upperBoundExclusive: number,
  lookups: LookupTables,
): boolean {
  const next = nextContentTokenIndex(tokens, start, upperBoundExclusive);
  if (next === null) {
    return true;
  }
  const nextToken = tokens[next];
  if (nextToken !== undefined && isClausePunctuationToken(nextToken)) {
    return true;
  }
  if (nextToken !== undefined && (nextToken.pos & POS0) === 動詞 && lookups.SPEECH_VERBS.has(nextToken.dictionaryForm || nextToken.surface)) {
    return false;
  }
  return false;
}

function findCorrelativeDegreeMarker(
  tokens: readonly ClauseToken[],
  start: number,
  upperBoundExclusive: number,
): {
  readonly start: number;
  readonly endExclusive: number;
  readonly markerSpan: StructuralRelationMarkerSpan;
} | null {
  let index = start;
  while (index < upperBoundExclusive) {
    const token = tokens[index];
    if (token === undefined) {
      break;
    }
    if (isClausePunctuationToken(token)) {
      return null;
    }
    const degreeMatch = relationConnectiveSpansAt(new TokenCursor(tokens, index))
      .find((match) => match.relationPolicy === "correlative_degree" && match.markerRole === "degree_marker");
    if (degreeMatch !== undefined) {
      return {
        start: index,
        endExclusive: degreeMatch.endExclusive,
        markerSpan: markerSpanFromMatch(index, degreeMatch, degreeMatch.markerRole ?? "degree_marker"),
      };
    }
    index += 1;
  }
  return null;
}

function correlativeSearchEnd(tokens: readonly ClauseToken[], start: number): number {
  const c = new TokenCursor(tokens, start, tokens.length);
  while (c.current()) {
    const token = c.current()!;
    if (isHardTerminalPunctuationToken(token)) {
      return c.pos;
    }
    c.advance();
  }
  return tokens.length;
}

const relationTokenLemma = (token: ClauseToken): string => token.dictionaryForm || token.surface;

function correlativeConfidence(
  tokens: readonly ClauseToken[],
  leftPredicate: { readonly predicateIdx: number; readonly closureIdx: number } | undefined,
  rightPredicate: { readonly predicateIdx: number; readonly closureIdx: number } | undefined,
): "strict" | "weak" {
  if (
    leftPredicate === undefined ||
    rightPredicate === undefined ||
    leftPredicate.predicateIdx === rightPredicate.predicateIdx
  ) {
    return "weak";
  }
  const headLemma = relationTokenLemma(tokens[leftPredicate.predicateIdx]!);
  const closureLemma = relationTokenLemma(tokens[leftPredicate.closureIdx]!);
  const rightHeadLemma = relationTokenLemma(tokens[rightPredicate.predicateIdx]!);
  const rightClosureLemma = relationTokenLemma(tokens[rightPredicate.closureIdx]!);
  const carrierIdentity = TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM.get(closureLemma) ?? closureLemma;
  return (
    (headLemma.length > 0 && headLemma === rightHeadLemma) ||
    (carrierIdentity === (TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM.get(rightHeadLemma) ?? rightHeadLemma) &&
      carrierIdentity === (TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM.get(rightClosureLemma) ?? rightClosureLemma))
  ) ? "strict" : "weak";
}

function nounPhraseTargetAfter(
  tokens: readonly ClauseToken[],
  start: number,
  upperBoundExclusive: number,
): StructuralRelationTargetSpan | null {
  const first = nextContentTokenIndex(tokens, start, upperBoundExclusive);
  if (first === null) {
    return null;
  }
  const c = new TokenCursor(tokens, first, upperBoundExclusive);
  while (c.current()) {
    const token = c.current()!;
    const pos0 = token.pos & POS0;
    if (pos0in(pos0, NOMINAL_BITS)) {
      return tokenSpanWithKind(first, c.pos + 1, "noun_phrase");
    }
    if (pos0 === 形状詞 || pos0 === 形容詞0 || pos0 === 連体詞 || token.surface === "な" || token.surface === "の") {
      c.advance();
      continue;
    }
    return null;
  }
  return null;
}

function hasStrictReasonSource(
  tokens: readonly ClauseToken[],
  sourceClause: Clause,
  markerStart: number,
  contentMap: ContentMap,
): boolean {
  const primaryPredicate = sourceClause.primaryPredicate;
  if (primaryPredicate === null || primaryPredicate >= markerStart) {
    return false;
  }
  const sourceSpan = contentMap.get(primaryPredicate);
  if (sourceSpan?.koreanPos === 형용사) {
    return true;
  }
  return precedingTokenOpensStrictReason(tokens, markerStart - 1, sourceClause.start);
}

function hasReasonCleftSource(
  layout: ClauseLayout,
  tokens: readonly ClauseToken[],
  contentMap: ContentMap,
  markerStart: number,
): boolean {
  const occurrence = layout.predicateOccurrenceBefore(tokens, contentMap, markerStart);
  if (occurrence === undefined || occurrence.predicateIdx >= markerStart) {
    return false;
  }
  const closure = tokens[occurrence.closureIdx];
  return closure !== undefined && isClauseClosingInflection(closure.pos);
}

function previousContentTokenIndex(
  tokens: readonly ClauseToken[],
  start: number,
  lowerBoundInclusive: number,
): number | null {
  for (let index = start; index >= lowerBoundInclusive; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isClausePunctuationToken(token)) {
      continue;
    }
    return index;
  }
  return null;
}

function nextContentTokenIndex(
  tokens: readonly ClauseToken[],
  start: number,
  upperBoundExclusive: number,
): number | null {
  for (let index = start; index < upperBoundExclusive; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    return index;
  }
  return null;
}

function projectionRequest(sourceForm: ClauseProjectionForm, match: RelationConnectiveSpanMatch): StructuralRelation["projection"] {
  return {
    sourceForm,
    connectiveKind: match.connectiveKind,
    ...(match.targetSlot === undefined ? {} : { targetSlot: match.targetSlot }),
  };
}

function layoutBoundaryRelationPayload(match: RelationConnectiveSpanMatch): Pick<StructuralRelation, "layoutBoundaryPolicy"> {
  return match.layoutBoundaryPolicy === undefined ? {} : { layoutBoundaryPolicy: match.layoutBoundaryPolicy };
}

function renderEnabledRelationPayload(match: RelationConnectiveSpanMatch): Pick<StructuralRelation, "renderEnabledByDefault"> {
  return match.renderEnabledByDefault === true ? { renderEnabledByDefault: true } : {};
}

function layoutBoundaryDiagnosticPayload(match: RelationConnectiveSpanMatch): Pick<StructuralRelationDiagnostic, "layoutBoundaryPolicy"> {
  return match.layoutBoundaryPolicy === undefined ? {} : { layoutBoundaryPolicy: match.layoutBoundaryPolicy };
}

function tokenSpan(start: number, endExclusive: number): StructuralRelationTokenSpan {
  return { start, endExclusive };
}

function tokenSpanWithKind(start: number, endExclusive: number, kind: StructuralRelationTargetSpan["kind"]): StructuralRelationTargetSpan {
  return { start, endExclusive, kind };
}
