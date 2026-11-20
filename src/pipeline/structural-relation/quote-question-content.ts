import { looksNarrowQuestionTakingAfter, looksQuestionTakingAfter, looksQuoteQuestionTakingAfter, clauseContainsInterrogativeBefore, tokenIsInterrogativeLexeme } from "../quote/embedded-question.js";
import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import type { TokenCursor } from "../token-cursor.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { enumerateClausePhrasesAfter, enumerateClausePhrasesBefore } from "../clause-layout/phrase-enumeration.js";
import { kaChoiceAlternativeCounterpartAfter } from "./ka-parallel-ownership.js";
import { utteranceClosureRunAfter } from "../clause-layout/utterance-closure.js";
import { kaOpensGenitiveNominalPhrase } from "../clause-layout/nominal-binding.js";
import { isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { NominalHeadTailChainPlan } from "../head-tail/lifecycle/head-tail-render-plan.js";
import { looksQuoteQuestionTakingAfterViaLayout } from "../quote/question-taking-enumeration.js";
import type { ContentMap } from "../particles/index.js";
import { QuoteHostMatch, quoteHostMatchAfterMarker, quoteHostMatchBlockedByNegativeCondition, quoteHostMatchIsAttributiveIu } from "../quote/host-taxonomy.js";
import { caseParticleMarkerRelationForToken, kaMarkerRelationAt, isJanaiConfirmationKaBaseAt, nominalizerQuestionContentConnectiveRelationAt, predicateNominalizerRelationForToken, questionContentContinuationAfterKaRelationAt, quoteHostSearchBridgeArgumentRelationAt, topicFocusMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { hardTerminalPunctuationRelation } from "../head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { copulaClosedTokaKaRelationAt, explanatoryCopulaClosedTokaKaRelationAt, isTokaListingKaMarker, kaOwnershipKindAt, singleMarkerNominalChoiceKaAt, speakerAcknowledgmentKaHostRelationAt, terminalQuestionKaRelationAt, whIndefiniteKaKindAt } from "../head-tail/boundary/ka-ownership.js";
import { isChainedNaiToken } from "../semantics/grammar-runtime.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { StructuralRelationTokenSpan } from "./types.js";
import { POS0, POS01, pos0in, 助詞_係助詞, POS4, POS5A, 終助詞, 助詞, 助動詞, 助動詞_ダ, 格助詞, 動詞_非自立可能, 連用形_, 意志推量形_, NOMINAL_BITS, 形状詞_助動詞語幹 } from "../../types/pos.js";
import type { QuoteStructuralRelationIndex } from "./quote.js";
import { type QuoteStructuralRelation, makeQuoteStructuralRelation } from "./quote-payload.js";
import { tokenSpan, quoteContentTokenStart, defaultContentTokenStartFallback, bridgeKindBetweenMarkerAndHost } from "./quote-content-span.js";

function yieldsToNominalChoiceCoordination(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly contentMap: ContentMap;
    readonly lookups: LookupTables;
  },
  markerIdx: number,
  hostNominalIdx: number,
  matrixPredicateIdx: number
): boolean {
  if (
    !singleMarkerNominalChoiceKaAt(
      options.tokens,
      markerIdx,
      options.lookups,
      options.contentMap.get(hostNominalIdx)?.koreanPos ?? null
    )
  ) {
    return false;
  }
  const rightIdx = nextNonSpaceIndex(options.tokens, markerIdx + 1);
  if (rightIdx === null) {
    return false;
  }
  const [phrase] = enumerateClausePhrasesAfter(options.layout, options.tokens, markerIdx, {
    scope: "clause"
  });
  if (
    phrase === undefined ||
    phrase.kind !== "nominal" ||
    phrase.span.start !== rightIdx ||
    phrase.span.endExclusive > matrixPredicateIdx
  ) {
    return false;
  }
  const closerIdx = nominalPhraseCaseCloserIdx(options, phrase, rightIdx);
  if (closerIdx === null) {
    return false;
  }
  const roles = options.layout.clauseOfPredicate(matrixPredicateIdx)
    ?.argumentRolesOf(matrixPredicateIdx) ?? [];
  const sharesMatrixArgumentSlot = roles.some(({ particleIdx }) => particleIdx === closerIdx);
  const subjectParticleIndices = new Set(
    roles.filter(({ role }) => role === "subject_topic").map(({ particleIdx }) => particleIdx)
  );
  return !(
    sharesMatrixArgumentSlot &&
    clauseMaterialPrecedesChoiceItem(options, markerIdx, subjectParticleIndices)
  );
}

function nominalPhraseCaseCloserIdx(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly contentMap: ContentMap;
  },
  phrase: { readonly span: { readonly start: number; readonly endExclusive: number } },
  rightIdx: number
): number | null {
  const rightContent = options.contentMap.get(rightIdx);
  const contentEnd = rightContent === undefined
    ? rightIdx + 1
    : rightContent.start + rightContent.consumed;
  for (let idx = Math.max(contentEnd, phrase.span.start); idx < phrase.span.endExclusive; idx += 1) {
    const pos = options.tokens[idx]?.pos ?? 0;
    if ((pos & POS01) === (助詞 | 格助詞) || (pos & POS01) === 助詞_係助詞) {
      return idx;
    }
  }
  return null;
}

function clauseMaterialPrecedesChoiceItem(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly lookups: LookupTables;
  },
  markerIdx: number,
  subjectParticleIndices: ReadonlySet<number>
): boolean {
  let isChoiceItem = true;
  for (const item of enumerateClausePhrasesBefore(options.layout, options.tokens, markerIdx, {
    scope: "clause"
  })) {
    if (phraseCarriesInterrogativeForm(options, item)) {
      return true;
    }
    if (
      !isChoiceItem &&
      item.markerParticleIdx !== null &&
      subjectParticleIndices.has(item.markerParticleIdx)
    ) {
      return true;
    }
    isChoiceItem = false;
  }
  return false;
}

function phraseCarriesInterrogativeForm(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly lookups: LookupTables;
  },
  phrase: { readonly span: { readonly start: number; readonly endExclusive: number } }
): boolean {
  for (let idx = phrase.span.start; idx < phrase.span.endExclusive; idx += 1) {
    const token = options.tokens[idx];
    if (token === undefined) {
      continue;
    }
    const form = token.dictionaryForm || token.surface || "";
    if (
      options.lookups.INTERROGATIVE_PRONOMINAL_FORMS.has(form) ||
      options.lookups.INTERROGATIVE_PRENOMINAL_FORMS.has(form) ||
      options.lookups.INTERROGATIVE_ADVERBIAL_FORMS.has(form) ||
      options.lookups.INTERROGATIVE_NOMINAL_FORMS.has(form)
    ) {
      return true;
    }
  }
  return false;
}

export function collectBareKaQuestionContentRelations(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly layout: ClauseLayout;
  readonly contentMap: ContentMap;
  readonly lookups: LookupTables;
}): readonly QuoteStructuralRelation[] {
  const relations: QuoteStructuralRelation[] = [];
  for (let markerIdx = 0; markerIdx < options.tokens.length; markerIdx += 1) {
    const ownership = kaOwnershipKindAt(options.tokens, markerIdx, options.lookups);
    const whIndefiniteKind = ownership === "wh_indefinite"
      ? whIndefiniteKaKindAt(options.tokens, markerIdx, options.lookups)
      : null;
    if (
      kaMarkerRelationAt(options.tokens, markerIdx, ["quote_content"]) === null ||
      (ownership !== "question" &&
        !(ownership === "wh_indefinite" &&
          (whIndefiniteKind === "pronominal" || whIndefiniteKind === "counter_quantity"))) ||
      terminalQuestionKaRelationAt(options.tokens, markerIdx, {
        lookups: options.lookups,
        anaphoricConjectureSelfQuestion:
          activeProtoLayout()?.anaphoricConjectureSelfQuestionAt(markerIdx) !== undefined,
      }) !== null ||
      isTokaListingKaMarker(options.tokens, markerIdx) ||
      copulaClosedTokaKaRelationAt(options.tokens, markerIdx) !== null ||
      explanatoryCopulaClosedTokaKaRelationAt(options.tokens, markerIdx) !== null
    ) {
      continue;
    }
    const marker = bareKaQuestionContentMarkerAt(options.tokens, markerIdx);
    if (marker === null) {
      continue;
    }
    const markerClause = options.layout.clauseOfToken(markerIdx);
    const previousNonSpaceIdx = previousNonSpaceIndex(options.tokens, markerIdx);
    const zeroCopulaNominalAnchorIdx = ownership === "question" &&
      previousNonSpaceIdx !== null &&
      pos0in(options.tokens[previousNonSpaceIdx]?.pos ?? 0, NOMINAL_BITS) &&
      !kaChoiceAlternativeCounterpartAfter(options.layout, options.tokens, markerIdx, options.lookups)
      ? previousNonSpaceIdx
      : null;
    const nominalAnchorIdx = ownership === "wh_indefinite"
      ? previousNonSpaceIdx
      : zeroCopulaNominalAnchorIdx;
    const interrogativeHeadIdx = previousNonSpaceIdx !== null &&
      !marker.nominalized &&
      tokenIsInterrogativeLexeme(options.tokens[previousNonSpaceIdx]!, options.lookups) &&
      isPredicateHeadTailChainRenderPlan(options.contentMap.get(previousNonSpaceIdx)?.renderPlan)
      ? previousNonSpaceIdx
      : undefined;
    const clausePredicateAnchorIdx = [...new Set([
      ...(markerClause?.predicates ?? []),
      ...interrogativeCopulaPredicateCandidates(options, markerClause?.start ?? 0, marker.markerSpan.start),
    ])]
      .filter((predicateIdx) => predicateIdx < marker.markerSpan.start && options.contentMap.has(predicateIdx))
      .sort((left, right) => left - right)
      .at(-1);
    const contentPredicateIdx = interrogativeHeadIdx ?? clausePredicateAnchorIdx ??
      (nominalAnchorIdx !== null && options.contentMap.has(nominalAnchorIdx)
        ? nominalAnchorIdx
        : undefined);
    if (contentPredicateIdx === undefined) {
      continue;
    }
    const zeroCopulaNominalAnchored = clausePredicateAnchorIdx === undefined &&
      zeroCopulaNominalAnchorIdx !== null &&
      contentPredicateIdx === zeroCopulaNominalAnchorIdx;
    const hostMatch = bareKaQuestionContentHostAfter(options, markerIdx, marker.markerSpan.endExclusive);
    if (hostMatch === null) {
      continue;
    }
    if (
      zeroCopulaNominalAnchored &&
      zeroCopulaNominalAnchorIdx !== null &&
      yieldsToNominalChoiceCoordination(options, markerIdx, zeroCopulaNominalAnchorIdx, hostMatch.hostIdx)
    ) {
      continue;
    }
    if (
      ownership === "wh_indefinite" &&
      nominalAnchorIdx !== null &&
      whIndefiniteKaIsNominalPhraseInternal(options, markerIdx, nominalAnchorIdx)
    ) {
      continue;
    }
    if (
      ownership === "wh_indefinite" &&
      !whIndefiniteQuestionContentLicensedByLayout(options, markerIdx, hostMatch.hostIdx)
    ) {
      continue;
    }
    const explicitQuoteSpan = options.layout.enclosingQuoteSpan(markerIdx);
    if (
      explicitQuoteSpan !== undefined &&
      !(explicitQuoteSpan[0] <= hostMatch.hostIdx && hostMatch.hostIdx < explicitQuoteSpan[1])
    ) {
      continue;
    }
    const contentClause = options.layout.clauseOfPredicate(contentPredicateIdx);
    const contentClauseIndex = options.layout.clauseIndexOfPredicate(contentPredicateIdx);
    const hostClauseIndex = options.layout.clauseIndexOfPredicate(hostMatch.hostIdx);
    const contentStart = contentClause?.start ?? options.contentMap.get(contentPredicateIdx)?.start ?? contentPredicateIdx;
    if (
      zeroCopulaNominalAnchored &&
      markerClause !== undefined &&
      !(markerClause.start <= hostMatch.hostIdx && hostMatch.hostIdx < markerClause.end) &&
      !zeroCopulaNominalComplementExhaustsClause(options, markerClause, marker.markerSpan.endExclusive, contentStart)
    ) {
      continue;
    }
    const relation = makeQuoteStructuralRelation({
      tokens: options.tokens,
      lookups: options.lookups,
      slotKind: "question_content",
      marker: {
        markerIdx,
        markerSurface: marker.markerSurface,
        markerSpan: marker.markerSpan,
        markerBaseSurface: marker.markerSurface,
      },
      hostMatch,
      contentTokenStart: contentStart,
      contentTokenEnd: marker.markerSpan.start,
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
        contentPredicateIdx,
        ...(interrogativeHeadIdx !== undefined
          ? { contentPredicateAnchorKind: "interrogative_head" as const }
          : zeroCopulaNominalAnchored ? { contentPredicateAnchorKind: "zero_copula_nominal" as const } : {}),
        questionBoundaryKind: marker.nominalized ? "nominalized_no_ka" : "bare_ka",
      },
    });
  }
  return relations;
}

function zeroCopulaNominalComplementExhaustsClause(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly lookups: LookupTables;
  },
  markerClause: { readonly start: number; readonly end: number },
  markerEndExclusive: number,
  contentStart: number,
): boolean {
  const traversal = utteranceClosureRunAfter(options.layout, options.tokens, markerEndExclusive);
  if (traversal.endIdx < markerClause.end) {
    return false;
  }
  return !clauseCarriesClosedUtteranceBefore(options, markerClause.start, contentStart);
}

function clauseCarriesClosedUtteranceBefore(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly lookups: LookupTables;
  },
  start: number,
  endExclusive: number,
): boolean {
  for (let idx = start; idx < endExclusive; idx += 1) {
    const closureRun = options.layout.utteranceClosureRunAt(idx);
    if (closureRun !== undefined && closureRun.run !== "formal_noun_dependent") {
      return true;
    }
    if (speakerAcknowledgmentKaHostRelationAt(options.tokens, idx, options.lookups) !== null) {
      return true;
    }
    if (
      terminalQuestionKaRelationAt(options.tokens, idx, {
        lookups: options.lookups,
        anaphoricConjectureSelfQuestion: activeProtoLayout()?.anaphoricConjectureSelfQuestionAt(idx) !== undefined,
      }) !== null
    ) {
      return true;
    }
  }
  return false;
}

function whIndefiniteKaIsNominalPhraseInternal(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly contentMap: ContentMap;
    readonly lookups: LookupTables;
  },
  markerIdx: number,
  whHostIdx: number,
): boolean {
  if (kaOpensGenitiveNominalPhrase(options.layout, options.tokens, markerIdx, options.lookups)) {
    return true;
  }
  const plan = options.contentMap.get(whHostIdx)?.renderPlan;
  return isNominalHeadTailChainRenderPlan(plan ?? null) &&
    (plan as NominalHeadTailChainPlan).realization.frame.source.end > markerIdx + 1;
}

function whIndefiniteQuestionContentLicensedByLayout(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
  },
  markerIdx: number,
  hostIdx: number,
): boolean {
  const clause = options.layout.clauseOfPredicate(hostIdx);
  return clause !== undefined && clause.particleIndices.some((particleIdx) => {
    if (
      particleIdx >= markerIdx ||
      options.layout.ownerPredicateOfParticle(particleIdx) !== hostIdx
    ) {
      return false;
    }
    return quoteHostSearchBridgeArgumentRelationAt(options.tokens, particleIdx, {
      consumers: ["quote_content"],
    })?.argumentKind === "subject_topic";
  });
}

function bareKaQuestionContentMarkerAt(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
): {
  readonly markerSpan: StructuralRelationTokenSpan;
  readonly markerSurface: string;
  readonly nominalized: boolean;
} | null {
  const continuationIdx = nextNonSpaceIndex(tokens, markerIdx + 1, tokens.length);
  if (
    continuationIdx !== null &&
    quoteMarkerRelationAt(tokens, continuationIdx, { consumers: ["quote_content"] }) !== null
  ) {
    return null;
  }
  const previousIdx = previousNonSpaceIndex(tokens, markerIdx);
  const nominalized = previousIdx === null
    ? null
    : nominalizerQuestionContentConnectiveRelationAt(tokens, previousIdx, {
      allowTerminalKa: true,
      consumers: ["quote_content"],
    });
  const markerSpan = nominalized?.span ?? tokenSpan(markerIdx, markerIdx + 1);
  return {
    markerSpan,
    markerSurface: tokens.slice(markerSpan.start, markerSpan.endExclusive).map((token) => token.surface).join(""),
    nominalized: nominalized !== null,
  };
}

function bareKaQuestionContentHostAfter(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly contentMap: ContentMap;
    readonly lookups: LookupTables;
  },
  markerIdx: number,
  afterExclusive: number,
): QuoteHostMatch | null {
  const sentenceEnd = bareKaQuestionContentSentenceEnd(options, afterExclusive);
  const predicates = [...new Set([
    ...options.layout.clauses.flatMap((clause) => clause.predicates),
    ...[...options.contentMap.entries()].flatMap(([predicateIdx, span]) =>
      isPredicateHeadTailChainRenderPlan(span.renderPlan) &&
        options.layout.predicateOfAdverbialAdjunct(predicateIdx) === undefined
        ? [predicateIdx]
        : []
    ),
  ])]
    .filter((predicateIdx) => predicateIdx >= afterExclusive && predicateIdx < sentenceEnd)
    .sort((left, right) => left - right);
  for (const predicateIdx of predicates) {
    const hostMatch = bareKaQuestionContentHostMatchAt(options, predicateIdx);
    if (hostMatch !== null) {
      if (
        clauseContainsInterrogativeBefore(
          options.tokens,
          predicateIdx,
          options.lookups,
          options.layout,
          { lowerBoundInclusive: afterExclusive },
        ) ||
        (
          predicatePlanHasOwnedQuestionContent(options.contentMap.get(predicateIdx)?.renderPlan ?? null) &&
          options.layout.clauseIndexOfToken(markerIdx) !== options.layout.clauseIndexOfPredicate(predicateIdx)
        )
      ) {
        return null;
      }
      return hostMatch;
    }
    if (!predicateIsNominalizedMatrixArgument(options, predicateIdx)) {
      return null;
    }
  }
  return null;
}

function bareKaQuestionContentHostMatchAt(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly contentMap: ContentMap;
    readonly lookups: LookupTables;
  },
  predicateIdx: number,
): QuoteHostMatch | null {
  const plan = options.contentMap.get(predicateIdx)?.renderPlan ?? null;
  const semanticTokenIndexes = isPredicateHeadTailChainRenderPlan(plan) && plan.realization.root.tail.kind === "auxLayer"
    ? plan.realization.root.tail.stem.semanticAnchors.flatMap((anchor) => {
      const tokenIdx = plan.realization.root.tail.kind === "auxLayer"
        ? plan.realization.root.tail.stem.source.tokenIndices[anchor]
        : undefined;
      return tokenIdx === undefined ? [] : [tokenIdx];
    })
    : [predicateIdx];
  for (const tokenIdx of semanticTokenIndexes) {
    const token = options.tokens[tokenIdx];
    if (token === undefined) {
      continue;
    }
    const form = token.dictionaryForm || token.surface;
    if (
      options.lookups.EMBEDDED_QUESTION_CONTENT_HOST_VERBS.has(form) ||
      options.lookups.EMBEDDED_QUESTION_CONTENT_HOST_SAHEN_NOUNS.has(form) ||
      options.lookups.EMBEDDED_QUESTION_CONTENT_HOST_ADJ_DA.has(form)
    ) {
      return new QuoteHostMatch("question", form, predicateIdx);
    }
  }
  return null;
}

function interrogativeCopulaPredicateCandidates(
  options: {
    readonly contentMap: ContentMap;
    readonly lookups: LookupTables;
  },
  start: number,
  endExclusive: number,
): readonly number[] {
  return [...options.contentMap.entries()].flatMap(([predicateIdx, span]) => {
    if (
      predicateIdx < start ||
      predicateIdx >= endExclusive ||
      !isPredicateHeadTailChainRenderPlan(span.renderPlan) ||
      span.renderPlan.realization.root.tail.kind !== "auxLayer"
    ) {
      return [];
    }
    const stem = span.renderPlan.realization.root.tail.stem;
    const interrogative = stem.semanticAnchors.some((anchor) => {
      const token = stem.source.tokens[anchor];
      const form = token?.dictionaryForm || token?.surface || "";
      return options.lookups.INTERROGATIVE_ADVERBIAL_FORMS.has(form) ||
        options.lookups.INTERROGATIVE_PRONOMINAL_FORMS.has(form) ||
        options.lookups.INTERROGATIVE_NOMINAL_FORMS.has(form) ||
        options.lookups.INTERROGATIVE_QUANTITY_FORMS.has(form);
    });
    const copular = span.renderPlan.realization.root.tail.ops.some((op) => op.kind === "copula");
    return interrogative && copular ? [predicateIdx] : [];
  });
}

function predicateIsNominalizedMatrixArgument(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly contentMap: ContentMap;
  },
  predicateIdx: number,
): boolean {
  const span = options.contentMap.get(predicateIdx);
  if (span === undefined) {
    return false;
  }
  const spanEnd = span.start + span.consumed;
  const trailingIdx = previousNonSpaceIndex(options.tokens, spanEnd, span.start);
  const followingIdx = nextNonSpaceIndex(options.tokens, spanEnd, options.tokens.length);
  const nominalizerIdx = trailingIdx !== null && predicateNominalizerRelationForToken(options.tokens[trailingIdx], trailingIdx, {
    requirement: "head_anchor",
    consumers: ["quote_content"],
  }) !== null
    ? trailingIdx
    : followingIdx !== null && predicateNominalizerRelationForToken(options.tokens[followingIdx], followingIdx, {
      requirement: "head_anchor",
      consumers: ["quote_content"],
    }) !== null
      ? followingIdx
      : null;
  if (nominalizerIdx === null) {
    return false;
  }
  const particleIdx = nextNonSpaceIndex(options.tokens, nominalizerIdx + 1, options.tokens.length);
  return particleIdx !== null && (
    caseParticleMarkerRelationForToken(options.tokens[particleIdx], particleIdx, {
      consumers: ["quote_content"],
    }) !== null ||
    topicFocusMarkerRelationForToken(options.tokens[particleIdx], particleIdx, {
      consumers: ["quote_content"],
    }) !== null
  );
}

function predicatePlanHasOwnedQuestionContent(plan: import("../../types/render-plan.js").RenderPlan | null): boolean {
  return isPredicateHeadTailChainRenderPlan(plan) &&
    plan.realization.root.tail.kind === "auxLayer" &&
    plan.realization.root.tail.ops.some((op) =>
      op.kind === "connective" &&
      (op.connective === "question_content" || op.connective === "question_content_alternative")
    );
}

function bareKaQuestionContentSentenceEnd(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
  },
  fromIdx: number,
): number {
  const clauseIndex = options.layout.clauseIndexOfToken(Math.min(fromIdx, options.tokens.length - 1));
  if (clauseIndex < 0) {
    return options.tokens.length;
  }
  for (let index = clauseIndex; index < options.layout.clauses.length; index += 1) {
    const clause = options.layout.clauses[index];
    if (
      clause?.terminatedBy === "punctuation" &&
      hardTerminalPunctuationRelation(options.tokens[clause.end - 1], clause.end - 1, ["quote_content"]) !== null
    ) {
      return clause.end;
    }
  }
  return options.tokens.length;
}

export function buildQuestionAlternativeContentRelationUncached(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  priorRelations: QuoteStructuralRelationIndex
): QuoteStructuralRelation | null {
  const { tokens, pos: kaIdx, end: n } = cursor;
  const questionAlternative = questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
    consumers: ["quote_content"],
    requireAdjacent: true,
    limit: n
  });
  if (questionAlternative?.continuationKind !== "question_alternative_marker") {
    return null;
  }
  const hostSearchMarkerIdx = questionAlternative.span.endExclusive - 1;
  const hostSearch = cursor.lookahead(hostSearchMarkerIdx - cursor.pos, hostSearchCursor => {
    const hostMatch = quoteHostMatchAfterMarker(hostSearchCursor, lookups);
    return { hostMatch, blocked: hostMatch === null ? false : quoteHostMatchBlockedByNegativeCondition(hostSearchCursor, hostMatch, lookups) };
  });
  const hostMatch = hostSearch.hostMatch;
  if (
    hostMatch === null ||
    hostMatch.kind !== "question" ||
    hostSearch.blocked ||
    quoteHostMatchIsAttributiveIu(tokens, hostMatch)
  ) {
    return null;
  }
  const contentTokenEnd = kaIdx;
  const contentTokenStart = quoteContentTokenStart(tokens, defaultContentTokenStartFallback(kaIdx), contentTokenEnd, priorRelations);
  if (contentTokenEnd <= contentTokenStart) {
    return null;
  }
  return makeQuoteStructuralRelation({
    tokens,
    lookups,
    slotKind: "question_content",
    marker: {
      markerIdx: kaIdx,
      markerSurface: questionAlternative.surface,
      markerSpan: questionAlternative.span,
      markerBaseSurface: questionAlternative.surface,
    },
    hostMatch,
    contentTokenStart,
    contentTokenEnd,
    bridgeKind: bridgeKindBetweenMarkerAndHost(tokens, hostSearchMarkerIdx, hostMatch, lookups),
    requestSource: null,
  });
}

export function isEuphemisticJudgmentKato(
  cursor: TokenCursor<RuntimeHaruToken>,
  hostMatch: QuoteHostMatch,
  lookups: LookupTables,
): boolean {
  if (
    !isKatoQuestionMarker(cursor, hostMatch, lookups) ||
    !lookups.QUOTE_HOST_REGISTRY.hostHasCapability(hostMatch, "euphemistic_judgment_kato")
  ) {
    return false;
  }
  const kaIdx = previousNonSpaceIndex(cursor.tokens, cursor.pos);
  return kaIdx !== null &&
    !clauseContainsInterrogativeBefore(
      cursor.tokens,
      kaIdx,
      lookups,
      activeProtoLayout() ?? undefined,
    );
}

export function isKatoQuestionMarker(cursor: TokenCursor<RuntimeHaruToken>, hostMatch: QuoteHostMatch, lookups: LookupTables): boolean {
  const { tokens, pos: markerIdx } = cursor;
  if (quoteMarkerPrecededByVolitionalConfirmation(tokens, markerIdx)) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (prevIdx === null) {
    return false;
  }
  if (isJanaiConfirmationKaBaseAt(tokens, prevIdx)) {
    return false;
  }
  const questionQuote = questionContentContinuationAfterKaRelationAt(tokens, prevIdx, {
    consumers: ["quote_content"],
    requireAdjacent: true,
    limit: markerIdx + 1
  });
  if (
    questionQuote?.continuationKind !== "question_quote_marker" ||
    questionQuote.span.endExclusive !== markerIdx + 1
  ) {
    return false;
  }
  if (previousContentIsWhIndefinite(tokens, prevIdx, lookups)) {
    return hostMatch.kind === "question" ||
      cursor.lookahead(questionQuote.span.endExclusive - cursor.pos, c => looksNarrowQuestionTakingAfter(c, lookups, { scope: "evidence_window" }));
  }
  const scanStart = questionQuote.span.endExclusive;
  const proto = activeProtoLayout();
  if (proto !== null) {
    return looksQuoteQuestionTakingAfterViaLayout(proto, tokens, scanStart, cursor.end, lookups);
  }
  return cursor.lookahead(scanStart - cursor.pos, c =>
    looksQuoteQuestionTakingAfter(c, lookups, { scope: "evidence_window" }) ||
    looksQuestionTakingAfter(c, lookups, { scope: "evidence_window" }));
}

function quoteMarkerPrecededByVolitionalConfirmation(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number
): boolean {
  const kaIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (
    kaIdx === null ||
    kaMarkerRelationAt(tokens, kaIdx, ["quote_content"])?.particleSubtype1 !== 終助詞
  ) {
    return false;
  }
  const negIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (negIdx === null) {
    return false;
  }
  const neg = tokens[negIdx];
  if (neg === undefined || !isChainedNaiToken(neg)) {
    return false;
  }
  const bridgeIdx = previousNonSpaceIndex(tokens, negIdx);
  if (bridgeIdx === null) {
    return false;
  }
  const bridge = tokens[bridgeIdx];
  if (bridge === undefined) {
    return false;
  }
  if (bridge.surface === "じゃ" && (bridge.pos & POS0) === 助動詞) {
    const beforeBridgeIdx = previousNonSpaceIndex(tokens, bridgeIdx);
    return beforeBridgeIdx !== null && tokenCanHostVolitionalConfirmation(tokens, beforeBridgeIdx);
  }
  if (bridge.surface !== "は" || (bridge.pos & POS0) !== 助詞) {
    return false;
  }
  const copulaIdx = previousNonSpaceIndex(tokens, bridgeIdx);
  if (copulaIdx === null) {
    return false;
  }
  const copula = tokens[copulaIdx];
  if (
    copula === undefined || copula.surface !== "で" || (copula.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_)
  ) {
    return false;
  }
  const beforeCopulaIdx = previousNonSpaceIndex(tokens, copulaIdx);
  return beforeCopulaIdx !== null && tokenCanHostVolitionalConfirmation(tokens, beforeCopulaIdx);
}

function tokenCanHostVolitionalConfirmation(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const token = tokens[idx];
  if (isSplitTeIruVolitionalStemAt(tokens, idx)) {
    return true;
  }
  if (token === undefined || (token.pos & POS5A) !== 意志推量形_) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return form !== "だ" && form !== "です";
}

function isSplitTeIruVolitionalStemAt(tokens: readonly RuntimeHaruToken[], youIdx: number): boolean {
  const iru = tokens[youIdx - 1];
  const you = tokens[youIdx];
  if (
    iru === undefined ||
    you === undefined ||
    (iru.pos & (POS01 | POS5A)) !== (動詞_非自立可能 | 連用形_)
  ) {
    return false;
  }
  const form = iru.dictionaryForm || iru.surface;
  return (form === "いる" || form === "居る" || form === "おる") && you.surface === "よう" && (you.pos & POS01) === 形状詞_助動詞語幹;
}

export function isWhIndefiniteToMarker(tokens: readonly RuntimeHaruToken[], markerIdx: number, lookups: LookupTables): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (prevIdx === null) {
    return false;
  }
  const questionQuote = questionContentContinuationAfterKaRelationAt(tokens, prevIdx, {
    consumers: ["quote_content"],
    requireAdjacent: true,
    limit: markerIdx + 1
  });
  if (
    questionQuote?.continuationKind !== "question_quote_marker" ||
    questionQuote.span.endExclusive !== markerIdx + 1
  ) {
    return false;
  }
  return previousContentIsWhIndefinite(tokens, prevIdx, lookups);
}

function previousContentIsWhIndefinite(tokens: readonly RuntimeHaruToken[], kaIdx: number, lookups: LookupTables): boolean {
  const index = previousNonSpaceIndex(tokens, kaIdx);
  if (index === null) {
    return false;
  }
  const token = tokens[index];
  const form = token?.dictionaryForm || token?.surface || "";
  return lookups.EMBEDDED_QUESTION_WH_INDEFINITE_HOSTS.has(form);
}
