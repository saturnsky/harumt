import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/index.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import { isClauseEvidenceTransparentPunctuation, isClauseOpeningPunctuationToken, isClausePunctuationToken } from "../clause-layout/punctuation.js";
import { TokenCursor } from "../token-cursor.js";
import { isQuestionParticleKaToken } from "../head-tail/boundary/marker.js";
import { copulaClosedTokaKaRelationAt, type CopulaClosedTokaKaRelation, directDiscourseChoiceQuestionKaRelationAt, isCopularTokaKaMarker, isKaDouKaMarker, isTokaListingKaMarker, previousTokenIsBasicCopula, previousTokenIsCopulaQuestionHost, terminalQuestionKaRelationAt } from "../head-tail/boundary/ka-ownership.js";
import { isStructuralKaParallelMarkerAt } from "./ka-parallel-ownership.js";
import { enumerateClausePhrasesAfter, enumerateClausePhrasesBefore } from "../clause-layout/phrase-enumeration.js";
import { isNominalizedConjectureMatrixQuestionPlan } from "./ka-parallel-plan.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { looksQuestionTakingAfterViaLayout } from "../quote/question-taking-enumeration.js";
import { hardTerminalPunctuationSurfaceClassForToken, isHardTerminalPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { pronominalNoParticleContinuationForToken } from "../pronominal-no-dispatch.js";
import { isSayVerbToken } from "../head-tail/data/quoted-reporting-sets.js";
import type { LookupTables } from "../lookup-tables.js";
import { isNaAdjCapableNoun, POS01, 助詞_副助詞, 助詞_格助詞, 助詞_終助詞, 助詞_準体助詞, 명사, 대명사, 수사, POS0, pos0in, 形状詞, 代名詞, 接尾辞, 名詞, PUNCTUATION_BITS, NOMINAL_BITS, stemFormName } from "../../types/pos.js";
import { isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../types/render-plan.js";
import { tryResolveDemoDiscourseConnective } from "../demo-discourse.js";
import type { StructuralAnchor, StructuralRelationNode, StructuralRelation, StructuralRelationMarkerSpan, StructuralKaParallelClosure, StructuralKaParallelItem, StructuralKaParallelItemKind, StructuralKaParallelTerminalPunctuation, StructuralKaParallelTerminalPunctuationUnit, BuildStructuralRelationGraphOptions } from "./types.js";
import { tokenSpansOverlap } from "./toka-nominal-listing-run.js";
import { hasHardSentenceBoundaryBetween, markerSurface, spanAnchor, predicateAnchor, nextContentTokenIndex, tokenSpan } from "./relation-coordinates.js";
import { nextParallelItemStart, parallelItemStartBeforeMarker, spanHasPredicateLikeToken, isKaParallelPredicateEvidencePlan, isParallelPredicateToken, parallelSeparatorSpans } from "./parallel-item-evidence.js";

export function collectEmbeddedQuestionAttributiveQuoteRelations(
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

interface KaParallelMarkerEvidence {
  readonly kaIdx: number;
  readonly markerSpan: StructuralRelationMarkerSpan;
  readonly clauseIndex: number;
  readonly nominalized: boolean;
}

export function collectKaParallelRelations(
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
