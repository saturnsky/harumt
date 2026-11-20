import type { RuntimeHaruToken } from "../../types/token.js";
import { isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan, type LemmaRealization, type RenderPlan, type PredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { LookupTables } from "../lookup-tables.js";
import { isClauseEvidenceTransparentPunctuation, isClauseOpeningPunctuationToken } from "../clause-layout/punctuation.js";
import { attachParticleRenderPlan, particleKeyFromAllomorph } from "../rendering/particle-plan.js";
import { matchCopulaTailWithOptionalConditional } from "../semantics/copula-tail-runtime.js";
import { TokenCursor } from "../token-cursor.js";
import { CONNECTIVE_RENDER_MAP } from "../head-tail/tail/predicate-root/connective-render-table.js";
import { nominalPhraseOwnerPrefix } from "../head-tail/head/adapters/nominal/commit.js";
import type { AuxOpNode, ConnectiveOp, OpSource, StemNode } from "../head-tail/tail/predicate-root/grammar.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity } from "../head-tail/tail/predicate-root/stem-candidate-identity.js";
import { type TranslationUnit, UnitType } from "../translation/unit.js";
import { isNominalizedConjectureMatrixQuestionPlan, projectNominalizedConjectureMatrixQuestionContinuationPlan } from "./ka-parallel-plan.js";
import { asIrregular, conjugate, type IrregularType } from "../../generator/conjugator.js";
import type { StructuralRelation, StructuralKaParallelClosure, StructuralKaParallelItem, StructuralNariParallelItem, StructuralQuotePayload, StructuralRelationTokenSpan } from "./types.js";
import type { ParticleKey } from "../../generator/particles.js";
import { POS0, 名詞, 代名詞, 補助記号, 記号, 대명사, 동사, 명사, 수사, 형용사, 구 } from "../../types/pos.js";
import { isTameReasonHeadContext } from "../attributive.js";
import { type RelationRenderOperation, previousNonSpaceTokenIndex, sourceSpanForStructuralTokenSpan, unitIndexesInSpan, unitFullyCoveredBySpans, uniqueSorted, opSourceForMarkerSpans } from "./render-unit-spans.js";
import { composeRelationSourceUnitPlans, structuralRelationSequencePlan } from "./render-source-sequence.js";
import { projectUnitHeadTailConnectivePlan, projectHeadTailConnectivePlan, opSourceCoveredBy } from "./render-connective-plan.js";

export function buildBareKaQuestionContentStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
}): RelationRenderOperation | null {
  const quote = options.relation.quote;
  if (
    quote?.slotKind !== "question_content" ||
    (quote.questionBoundaryKind !== "bare_ka" && quote.questionBoundaryKind !== "nominalized_no_ka") ||
    quote.contentPredicateIdx === undefined ||
    quote.contentPredicateIdx === null
  ) {
    return null;
  }
  const sourceUnitIndex = options.sourceUnitIndexes.find((unitIndex) =>
    options.units[unitIndex]?.jpIndices.includes(quote.contentPredicateIdx!) === true
  );
  const sourceUnit = sourceUnitIndex === undefined ? undefined : options.units[sourceUnitIndex];
  if (sourceUnitIndex === undefined || sourceUnit === undefined) {
    return null;
  }
  const sourcePlan = sourceUnit.renderPlan;
  if (quote.contentPredicateAnchorKind === "interrogative_head" && isPredicateHeadTailChainRenderPlan(sourcePlan)) {
    const tail = sourcePlan.realization.root.tail;
    const anchoredAtHead = tail.kind === "auxLayer" &&
      tail.stem.semanticAnchors.some((anchor) => tail.stem.source.tokenIndices[anchor] === quote.contentPredicateIdx);
    if (!anchoredAtHead) {
      return null;
    }
  }
  const projectedPlan = projectNominalizedConjectureMatrixQuestionContinuationPlan(
    sourceUnit.renderPlan,
    quote.markerIdx,
    quote.markerBaseSurface,
  ) ?? normalizeConfirmedQuestionContentAlternativePlan(
    sourceUnit.renderPlan,
    quote.markerIdx,
    quote.markerBaseSurface,
  ) ?? projectUnitHeadTailConnectivePlan(
    sourceUnit,
    { connective: "question_content", surface: quote.markerBaseSurface },
    opSourceForMarkerSpans(options.tokens, options.relation.markerSpans),
    true,
  ) ?? projectBareNounZeroCopulaQuestionContentPlan(
    sourceUnit.renderPlan,
    quote.contentPredicateAnchorKind,
    quote.markerBaseSurface,
  ) ?? projectNominalFrameQuestionContentPlan(
    sourceUnit.renderPlan,
    quote.markerBaseSurface,
  ) ?? (
    quote.contentPredicateAnchorKind === "zero_copula_nominal"
      ? null
      : projectNominalQuestionContentPlan(sourceUnit.renderPlan)
  );
  if (projectedPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted(options.markerUnitIndexes.filter((unitIndex) => unitIndex !== sourceUnitIndex));
  return {
    relation: options.relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    replaceUnitIndex: sourceUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted([
      ...sourceUnit.jpIndices,
      ...suppressUnitIndexes.flatMap((unitIndex) => options.units[unitIndex]?.jpIndices ?? []),
    ]),
    renderPlan: markStructuralKaParallelQuestionContentPlan(projectedPlan),
  };
}

function projectBareNounZeroCopulaQuestionContentPlan(
  plan: RenderPlan | null,
  anchorKind: StructuralQuotePayload["contentPredicateAnchorKind"],
  markerSurface: string,
): RenderPlan | null {
  if (anchorKind !== "zero_copula_nominal" || plan?.kind !== "lemma") {
    return null;
  }
  if (plan.koreanPos !== 명사 && plan.koreanPos !== 대명사 && plan.koreanPos !== 수사) {
    return null;
  }
  const ending = CONNECTIVE_RENDER_MAP.get(markerSurface)?.korean;
  if (ending === undefined) {
    return null;
  }
  const { connective: _legacyConnective, suffix: _legacySuffix, ...head } = plan;
  return { ...head, connective: ending, sfp: null, terminalSfp: null };
}

function projectNominalFrameQuestionContentPlan(
  plan: RenderPlan | null,
  markerSurface: string,
): RenderPlan | null {
  if (!isNominalHeadTailChainRenderPlan(plan) || plan.realization.frame.projection.kind !== "headLexicalForm") {
    return null;
  }
  const ending = CONNECTIVE_RENDER_MAP.get(markerSurface)?.korean;
  if (ending === undefined) {
    return null;
  }
  const headText = nominalPhraseOwnerPrefix(plan, "");
  if (headText.length === 0) {
    return null;
  }
  const hintPos = plan.realization.root.kind === "nominalPhrase"
    ? plan.realization.root.head.allomorphHint?.koreanPos
    : undefined;
  return {
    kind: "lemma",
    entry: null,
    koreanLemma: headText,
    koreanPos: hintPos === 대명사 ? 대명사 : 명사,
    irregular: null,
    auxTokens: [],
    connective: ending,
    sfp: null,
    terminalSfp: null,
  };
}

function projectNominalQuestionContentPlan(plan: RenderPlan | null): RenderPlan | null {
  if (plan?.kind === "fixedText") {
    return structuralRelationSequencePlan([
      plan,
      { kind: "structuralText", text: "인지", koreanPos: 구 },
    ]);
  }
  if (plan?.kind === "registerText") {
    return structuralRelationSequencePlan([
      plan,
      { kind: "structuralText", text: "인지", koreanPos: 구 },
    ]);
  }
  return null;
}

function normalizeConfirmedQuestionContentAlternativePlan(
  plan: RenderPlan | null,
  markerIdx: number,
  markerSurface: string,
): PredicateHeadTailChainRenderPlan | null {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const alternative = plan.realization.root.tail.ops.find((op): op is ConnectiveOp =>
    op.kind === "connective" &&
    op.connective === "alternative" &&
    op.source.tokenIndices.includes(markerIdx)
  );
  if (alternative === undefined) {
    return null;
  }
  return projectHeadTailConnectivePlan(
    plan,
    { connective: "question_content", surface: markerSurface },
    alternative.source,
    true,
  );
}

function sourceTokensOverlap(
  left: RuntimeHaruToken,
  right: RuntimeHaruToken
): boolean {
  if (left.sourceSpan !== undefined && left.sourceSpan !== null && right.sourceSpan !== undefined && right.sourceSpan !== null) {
    return left.sourceSpan.startOrdinal < right.sourceSpan.endOrdinal &&
      right.sourceSpan.startOrdinal < left.sourceSpan.endOrdinal;
  }
  return left.sourceOrdinal !== undefined &&
    right.sourceOrdinal !== undefined &&
    left.sourceOrdinal === right.sourceOrdinal;
}

export function buildKaParallelStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const payload = options.relation.kaParallel;
  const minimumItemCount = options.relation.kind === "toka_parallel_listing" ? 1 : 2;
  if (payload === undefined || payload.itemAnchors.length < minimumItemCount) {
    return null;
  }
  const explicitTerminalPunctuation = payload.terminalPunctuation;
  const matrixQuestionItems = payload.matrixQuestionItems;
  const yieldsLastItemToTerminalOwner = payload.terminalOwnerBoundary !== undefined;
  const projectedItems = yieldsLastItemToTerminalOwner
    ? payload.itemAnchors.slice(0, -1)
    : payload.itemAnchors;
  if (projectedItems.length === 0) return null;
  if (
    relationWindowHasExternalBoundarySymbol(
      options.tokens,
      options.units,
      options.relation.source.span.start,
      yieldsLastItemToTerminalOwner
        ? projectedItems.at(-1)!.markerSpan.endExclusive
        : payload.itemAnchors.at(-1)?.markerSpan.start ?? options.relation.source.span.endExclusive,
    )
  ) return null;
  const itemPlans: RenderPlan[] = [];
  for (const [itemIndex, item] of projectedItems.entries()) {
    const isLastItem = !yieldsLastItemToTerminalOwner && itemIndex === projectedItems.length - 1;
    const plan = kaParallelItemPlan(
      options.tokens,
      options.units,
      item,
      options.relation.kind,
      isLastItem,
      payload.closure,
      yieldsLastItemToTerminalOwner ? false : matrixQuestionItems
    );
    if (plan === null) {
      return null;
    }
    itemPlans.push(plan);
  }
  const trailingSuffix = yieldsLastItemToTerminalOwner
    ? {
      suffix: payload.separatorSpans.length > 0 ? "," : null,
      suffixUnitIndexes: payload.separatorSpans.flatMap((span) => unitIndexesInSpan(options.units, span)),
    }
    : kaParallelTrailingSuffixPlan(
      options.tokens,
      options.units,
      options.sourceUnitIndexes,
      options.relation.source.span.endExclusive,
      options.lookups,
      payload.closure,
    );
  const projectedSourceSpan = yieldsLastItemToTerminalOwner
    ? {
      start: projectedItems[0]!.source.span.start,
      endExclusive: projectedItems.at(-1)!.markerSpan.endExclusive,
    }
    : options.relation.source.span;
  const relationSourceUnitIndexes = yieldsLastItemToTerminalOwner
    ? unitIndexesInSpan(options.units, projectedSourceSpan)
    : options.sourceUnitIndexes;
  const relationMarkerUnitIndexes = yieldsLastItemToTerminalOwner
    ? projectedItems.flatMap((item) => unitIndexesInSpan(options.units, item.markerSpan))
    : options.markerUnitIndexes;
  const internalSymbolUnitIndexes = unitIndexesInSpan(options.units, options.relation.source.span)
    .filter((unitIndex) =>
      options.units[unitIndex]?.unitType === UnitType.SYMBOL &&
      options.units[unitIndex].jpIndices.some((jpIndex) =>
        jpIndex >= projectedSourceSpan.start && jpIndex < projectedSourceSpan.endExclusive
      )
    );
  const ownedSourceUnitIndexes = uniqueSorted([
    ...relationSourceUnitIndexes,
    ...internalSymbolUnitIndexes,
  ]);
  const suppressUnitIndexes = uniqueSorted([
    ...ownedSourceUnitIndexes,
    ...relationMarkerUnitIndexes,
    ...trailingSuffix.suffixUnitIndexes,
  ]);
  const insertBeforeUnitIndex = suppressUnitIndexes[0] ?? options.sourceUnitIndexes[0] ?? null;
  if (insertBeforeUnitIndex === null) {
    return null;
  }
  const terminalOwnerPlanReplacements = payload.terminalOwnerBoundary === "matrix_terminal_question"
    ? kaParallelTerminalOwnerPlanReplacement(options.units, payload.itemAnchors.at(-1)!)
    : [];
  return {
    relation: options.relation,
    insertBeforeUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: ownedSourceUnitIndexes,
    targetUnitIndexes: yieldsLastItemToTerminalOwner ? [] : options.targetUnitIndexes,
    unitRenderPlanReplacements: terminalOwnerPlanReplacements,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan: {
      kind: "kaParallel",
      relationKind: options.relation.kind === "ka_parallel_choice" ? "choice" : "question_content",
      itemPlans,
      itemSourceSpans: projectedItems.map((item) => sourceSpanForStructuralTokenSpan(options.tokens, item.source.span)),
      markerSourceSpans: projectedItems.map((item) => sourceSpanForStructuralTokenSpan(options.tokens, item.markerSpan)),
      separator: payload.separatorSpans.length > 0 ? "comma" : "space",
      terminalPunctuation: yieldsLastItemToTerminalOwner ? null : explicitTerminalPunctuation,
      terminalPunctuationRun: yieldsLastItemToTerminalOwner ? [] : payload.terminalPunctuationRun,
      ...(trailingSuffix.suffix === null ? {} : { suffix: trailingSuffix.suffix }),
      koreanPos: 구,
    },
  };
}

function kaParallelTerminalOwnerPlanReplacement(
  units: readonly TranslationUnit[],
  item: StructuralKaParallelItem,
): readonly { readonly unitIndex: number; readonly renderPlan: RenderPlan }[] {
  const unitIndexes = unitIndexesInSpan(units, item.source.span);
  const predicateUnitIndex = parallelPredicateUnitIndex(units, unitIndexes, item.predicateIdx);
  if (predicateUnitIndex === null) return [];
  const plan = units[predicateUnitIndex]?.renderPlan;
  if (plan === undefined || plan === null) return [];
  return [{ unitIndex: predicateUnitIndex, renderPlan: markQuestionContentTerminalPlan(plan) }];
}

export function buildEmbeddedQuestionAttributiveQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const payload = options.relation.embeddedQuestionAttributiveQuote;
  if (payload === undefined) return null;
  const itemPlan = kaParallelItemPlan(
    options.tokens,
    options.units,
    payload.item,
    options.relation.kind,
    true,
    payload.closure,
    false,
  );
  if (itemPlan === null) return null;
  const suffixUnitIndexes = unitIndexesInSpan(options.units, payload.closure.markerSpan);
  if (suffixUnitIndexes.length === 0) return null;
  const sourceUnitIndexSet = new Set(options.sourceUnitIndexes);
  const closureEscapesMarkerSpan = suffixUnitIndexes.some((unitIndex) => {
    if (sourceUnitIndexSet.has(unitIndex)) return false;
    const unit = options.units[unitIndex];
    return unit === undefined || !unitFullyCoveredBySpans(unit, [payload.closure.markerSpan]);
  });
  if (closureEscapesMarkerSpan) return null;
  const particleUnitIndexes = payload.closure.particleSpan === undefined
    ? []
    : unitIndexesInSpan(options.units, payload.closure.particleSpan);
  const suffix = payload.closure.realization === "light_koto"
    ? " 하는"
    : payload.closure.realization === "pronominal_no" ? "라는 것" : "라는";
  const sequencePlan = structuralRelationSequencePlan([
    itemPlan,
    {
      kind: "structuralText",
      text: suffix,
      koreanPos: 구,
      sourceSpan: sourceSpanForStructuralTokenSpan(options.tokens, payload.closure.markerSpan),
    },
  ]);
  if (sequencePlan === null) return null;
  const trailingParticle = particleUnitIndexes
    .map((unitIndex) => options.units[unitIndex]?.allomorphKey ?? null)
    .map((key) => key === null ? null : particleKeyFromAllomorph(key))
    .find((key) => key !== null) ?? null;
  const renderPlan = payload.closure.realization === "pronominal_no" && trailingParticle !== null
    ? attachParticleRenderPlan(sequencePlan, trailingParticle)
    : sequencePlan;
  if (renderPlan === null) return null;
  const suppressUnitIndexes = uniqueSorted([
    ...options.sourceUnitIndexes,
    ...options.markerUnitIndexes,
    ...suffixUnitIndexes,
    ...particleUnitIndexes,
  ]).filter((unitIndex) => options.units[unitIndex]?.unitType !== UnitType.SYMBOL);
  const insertBeforeUnitIndex = suppressUnitIndexes[0] ?? null;
  if (insertBeforeUnitIndex === null) return null;
  return {
    relation: options.relation,
    insertBeforeUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((unitIndex) => (
      options.units[unitIndex]?.jpIndices ?? []
    ))),
    renderPlan,
  };
}

function relationWindowHasExternalBoundarySymbol(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  start: number,
  endExclusive: number,
): boolean {
  return units.some((unit) =>
    unit.unitType === UnitType.SYMBOL &&
    unit.jpIndices.some((jpIndex) => {
      if (jpIndex < start || jpIndex >= endExclusive) return false;
      const token = tokens[jpIndex];
      return token !== undefined &&
        !isClauseOpeningPunctuationToken(token) &&
        !isClauseEvidenceTransparentPunctuation(token);
    })
  );
}

export function buildNariParallelStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const payload = options.relation.nariParallel;
  if (payload === undefined || payload.itemAnchors.length < 2) {
    return null;
  }
  const itemPlans: RenderPlan[] = [];
  for (const item of payload.itemAnchors) {
    if (nariItemSpanContainsTransparentPunctuation(options.tokens, item.source.span)) {
      return null;
    }
    const plan = nariParallelItemPlan(options.tokens, options.units, item, item.itemKind);
    if (plan === null) {
      return null;
    }
    itemPlans.push(plan);
  }
  const trailingParticle = nariParallelTrailingParticleKey(
    options.units,
    payload.trailingParticleSpan ?? null,
  );
  const consumeTrailing = payload.trailingParticleSpan !== null &&
    payload.trailingParticleSpan !== undefined && trailingParticle !== null;
  const unconsumedTrailingUnitIndexes = consumeTrailing || payload.trailingParticleSpan === null || payload.trailingParticleSpan === undefined
    ? []
    : unitIndexesInSpan(options.units, payload.trailingParticleSpan);
  const suppressUnitIndexes = uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes])
    .filter((unitIndex) => !unconsumedTrailingUnitIndexes.includes(unitIndex));
  const insertBeforeUnitIndex = suppressUnitIndexes[0] ?? options.sourceUnitIndexes[0] ?? null;
  if (insertBeforeUnitIndex === null) {
    return null;
  }
  return {
    relation: options.relation,
    insertBeforeUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan: {
      kind: "nariParallel",
      itemKind: payload.itemKind,
      itemKinds: payload.itemAnchors.map((item) => item.itemKind),
      itemPlans,
      itemSourceSpans: payload.itemAnchors.map((item) => sourceSpanForStructuralTokenSpan(options.tokens, item.source.span)),
      markerSourceSpans: payload.markerSpans.map((span) => sourceSpanForStructuralTokenSpan(options.tokens, span)),
      separator: payload.separatorSpans.length > 0 ? "comma" : "space",
      ...(consumeTrailing && trailingParticle !== null ? { trailingParticle } : {}),
      koreanPos: 구,
    },
  };
}

export function buildTokaNominalListingStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const payload = options.relation.tokaNominalListing;
  if (payload === undefined || payload.itemAnchors.length < 2) {
    return null;
  }
  const itemPlans: RenderPlan[] = [];
  const relationCoreSpans: StructuralRelationTokenSpan[] = [
    ...payload.itemAnchors.map((item) => item.span),
    ...options.relation.markerSpans,
    ...payload.separatorSpans,
  ];
  if (tokaNominalListingHasUnownedSourceGap(options.tokens, relationCoreSpans)) {
    return null;
  }
  const itemUnitIndexesForSuppression: number[] = [];
  for (const item of payload.itemAnchors) {
    if (nariItemSpanContainsTransparentPunctuation(options.tokens, item.span)) {
      return null;
    }
    const itemUnitIndexes = unitIndexesInSpan(options.units, item.span);
    if (itemUnitIndexes.some((unitIndex) => {
      const unit = options.units[unitIndex];
      return unit === undefined || !unitFullyCoveredBySpans(unit, [item.span]);
    })) {
      return null;
    }
    const itemPlan = composeRelationSourceUnitPlans(
      options.tokens,
      options.units,
      itemUnitIndexes,
    );
    if (itemPlan === null) {
      return null;
    }
    itemUnitIndexesForSuppression.push(...itemUnitIndexes);
    itemPlans.push(itemPlan);
  }
  const trailingParticle = payload.closure === "closed"
    ? nariParallelTrailingParticleKey(options.units, payload.trailingParticleSpan)
    : null;
  const consumeTrailing = payload.closure === "closed" &&
    payload.trailingParticleSpan !== null && trailingParticle !== null;
  const unconsumedTrailingUnitIndexes = !consumeTrailing && payload.trailingParticleSpan !== null
    ? unitIndexesInSpan(options.units, payload.trailingParticleSpan)
    : [];
  const suppressUnitIndexes = uniqueSorted([
    ...options.sourceUnitIndexes,
    ...options.markerUnitIndexes,
    ...itemUnitIndexesForSuppression,
  ]).filter((unitIndex) => !unconsumedTrailingUnitIndexes.includes(unitIndex));
  const suppressibleSpans: StructuralRelationTokenSpan[] = [
    ...payload.itemAnchors.map((item) => item.span),
    ...options.relation.markerSpans,
    ...payload.separatorSpans,
    ...(consumeTrailing && payload.trailingParticleSpan !== null
      ? [payload.trailingParticleSpan]
      : []),
  ];
  if (suppressUnitIndexes.some((unitIndex) => {
    const unit = options.units[unitIndex];
    return unit === undefined || !unitFullyCoveredBySpans(unit, suppressibleSpans);
  })) {
    return null;
  }
  const insertBeforeUnitIndex = suppressUnitIndexes[0] ?? options.sourceUnitIndexes[0] ?? null;
  if (insertBeforeUnitIndex === null) {
    return null;
  }
  return {
    relation: consumeTrailing || payload.trailingParticleSpan === null
      ? options.relation
      : tokaNominalListingRelationWithoutTrailingParticle(options.relation),
    insertBeforeUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: suppressUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    ...(consumeTrailing && payload.trailingParticleSpan !== null
      ? { projectionHeadTokenIndex: payload.trailingParticleSpan.start }
      : {}),
    renderPlan: {
      kind: "nariParallel",
      itemKind: "nominal",
      itemPlans,
      itemSourceSpans: payload.itemAnchors.map((item) => sourceSpanForStructuralTokenSpan(options.tokens, item.span)),
      markerSourceSpans: options.relation.markerSpans.map((span) => sourceSpanForStructuralTokenSpan(options.tokens, span)),
      separator: "space",
      itemSeparatorTexts: payload.itemAnchors.slice(0, -1).map((_, index) => {
        const markerEnd = options.relation.markerSpans[index]?.endExclusive ?? 0;
        const nextItemStart = payload.itemAnchors[index + 1]?.span.start ?? markerEnd;
        const separatorSpans = payload.separatorSpans.filter((span) =>
          span.start >= markerEnd && span.endExclusive <= nextItemStart
        );
        return separatorSpans.length === 0
          ? " "
          : separatorSpans.map((span) => span.surface).join("");
      }),
      itemSeparatorSourceSpans: payload.itemAnchors.slice(0, -1).map((_, index) => {
        const markerEnd = options.relation.markerSpans[index]?.endExclusive ?? 0;
        const nextItemStart = payload.itemAnchors[index + 1]?.span.start ?? markerEnd;
        const separatorSpans = payload.separatorSpans.filter((span) =>
          span.start >= markerEnd && span.endExclusive <= nextItemStart
        );
        const firstSeparator = separatorSpans[0];
        const lastSeparator = separatorSpans.at(-1);
        return firstSeparator === undefined || lastSeparator === undefined
          ? null
          : sourceSpanForStructuralTokenSpan(options.tokens, {
              start: firstSeparator.start,
              endExclusive: lastSeparator.endExclusive,
            });
      }),
      ...(consumeTrailing && trailingParticle !== null && payload.trailingParticleSpan !== null
        ? {
            trailingParticle,
            trailingParticleSourceSpan: sourceSpanForStructuralTokenSpan(
              options.tokens,
              payload.trailingParticleSpan,
            ),
          }
        : {}),
      nominalListingStyle: "toka",
      nominalListingClosure: payload.closure,
      koreanPos: 구,
    },
  };
}

function tokaNominalListingHasUnownedSourceGap(
  tokens: readonly RuntimeHaruToken[],
  spans: readonly StructuralRelationTokenSpan[],
): boolean {
  const indexes = uniqueSorted(spans.flatMap((span) => {
    const values: number[] = [];
    for (let index = span.start; index < span.endExclusive; index += 1) {
      values.push(index);
    }
    return values;
  }));
  for (let position = 1; position < indexes.length; position += 1) {
    const previous = tokens[indexes[position - 1] as number];
    const current = tokens[indexes[position] as number];
    const previousSpan = previous?.sourceSpan;
    const currentSpan = current?.sourceSpan;
    if (
      previousSpan !== undefined &&
      previousSpan !== null &&
      currentSpan !== undefined &&
      currentSpan !== null &&
      previousSpan.endOrdinal < currentSpan.startOrdinal
    ) {
      return true;
    }
  }
  return false;
}

function tokaNominalListingRelationWithoutTrailingParticle(
  relation: StructuralRelation,
): StructuralRelation {
  const payload = relation.tokaNominalListing;
  if (payload === undefined || payload.trailingParticleSpan === null) {
    return relation;
  }
  const sourceEnd = Math.max(
    ...payload.itemAnchors.map((item) => item.span.endExclusive),
    ...relation.markerSpans.map((span) => span.endExclusive),
  );
  return {
    ...relation,
    source: {
      ...relation.source,
      span: { ...relation.source.span, endExclusive: sourceEnd },
    },
    ...(relation.candidateSuppressibleTokenSpans === undefined ? {} : {
      candidateSuppressibleTokenSpans: relation.candidateSuppressibleTokenSpans.filter(
        (span) => span.reason !== "relation_trailing_particle",
      ),
    }),
    tokaNominalListing: {
      ...payload,
      trailingParticleSpan: null,
    },
  };
}

function nariParallelItemPlan(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  item: StructuralNariParallelItem,
  itemKind: "nominal" | "predicate",
): RenderPlan | null {
  const unitIndexes = unitIndexesInSpan(units, item.source.span);
  if (unitIndexes.length === 0) {
    return null;
  }
  if (itemKind === "nominal") {
    return composeRelationSourceUnitPlans(tokens, units, unitIndexes);
  }
  const predicateUnitIndex = parallelPredicateUnitIndex(units, unitIndexes, item.predicateIdx);
  if (predicateUnitIndex === null) {
    return null;
  }
  const predicateUnit = units[predicateUnitIndex];
  if (predicateUnit === undefined) {
    return null;
  }
  const projected = nariParallelPredicateProjectionPlan(predicateUnit.renderPlan);
  if (projected === null) {
    return null;
  }
  const extraUnitIndexes = unitIndexes.filter((unitIndex) =>
    unitIndex !== predicateUnitIndex && units[unitIndex]?.unitType !== UnitType.SYMBOL
  );
  if (extraUnitIndexes.length === 0) {
    return projected;
  }
  if (extraUnitIndexes.some((unitIndex) => unitIndex > predicateUnitIndex)) {
    return null;
  }
  return composeRelationSourceUnitPlans(
    tokens,
    units,
    unitIndexes,
    new Map([[predicateUnitIndex, projected]]),
  );
}

function nariParallelPredicateProjectionPlan(plan: RenderPlan | null): LemmaRealization | null {
  if (plan?.kind === "lemma") {
    if (
      (plan.koreanPos !== 동사 && plan.koreanPos !== 형용사) ||
      plan.prefix !== undefined ||
      plan.suffix !== undefined ||
      (plan.connective !== undefined && plan.connective !== null) ||
      (plan.sfp !== undefined && plan.sfp !== null)
    ) {
      return null;
    }
    return {
      ...plan,
      connective: "든",
      sfp: null,
    };
  }
  if (plan?.kind !== "headTailChain" || plan.realization.kind !== "predicate" || plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const layer = plan.realization.root.tail;
  if (layer.ops.length !== 0 || layer.terminal !== null || plan.realization.root.sfp !== null) {
    return null;
  }
  const stem = layer.stem;
  if (stem.kind !== "verb" && stem.kind !== "adj") {
    return null;
  }
  return {
    kind: "lemma",
    entry: plan.realization.entry ?? null,
    koreanLemma: stem.lemma,
    koreanPos: stem.kind === "verb" ? 동사 : 형용사,
    irregular: stem.irregular,
    auxTokens: [],
    connective: "든",
    voice: "active",
  };
}

function nariItemSpanContainsTransparentPunctuation(
  tokens: readonly RuntimeHaruToken[],
  span: { readonly start: number; readonly endExclusive: number },
): boolean {
  for (let index = span.start; index < span.endExclusive; index += 1) {
    const token = tokens[index];
    if (token !== undefined && isClauseEvidenceTransparentPunctuation(token)) {
      return true;
    }
  }
  return false;
}

function nariParallelTrailingParticleKey(
  units: readonly TranslationUnit[],
  span: StructuralRelationTokenSpan | null,
): ParticleKey | null {
  if (span === null) {
    return null;
  }
  for (const unitIndex of unitIndexesInSpan(units, span)) {
    const key = units[unitIndex]?.allomorphKey;
    if (key === undefined || key === null) {
      continue;
    }
    const particle = particleKeyFromAllomorph(key);
    if (particle !== null) {
      return particle;
    }
  }
  return null;
}

function kaParallelTrailingSuffixPlan(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  sourceUnitIndexes: readonly number[],
  sourceEndExclusive: number,
  lookups: LookupTables,
  closure: StructuralKaParallelClosure,
): { readonly suffix: RenderPlan | string | null; readonly suffixUnitIndexes: readonly number[] } {
  const cursor = new TokenCursor(tokens, sourceEndExclusive, tokens.length, sourceEndExclusive);
  const externalSuffix = kaParallelExternalDakeCopulaSuffixPlan(cursor, units, lookups);
  if (externalSuffix !== null) {
    return externalSuffix;
  }
  const embeddedQuestionQuote = kaParallelEmbeddedQuestionQuoteSuffix(units, closure);
  if (embeddedQuestionQuote !== null) {
    return embeddedQuestionQuote;
  }
  for (const unitIndex of sourceUnitIndexes) {
    const unit = units[unitIndex];
    const plan = unit?.renderPlan;
    if (
      unit === undefined ||
      plan?.kind !== "predicateScopeCarrier" ||
      plan.suffix === undefined ||
      !unit.jpIndices.some((jpIndex) => jpIndex >= sourceEndExclusive)
    ) {
      continue;
    }
    return { suffix: plan.suffix, suffixUnitIndexes: [unitIndex] };
  }
  return { suffix: null, suffixUnitIndexes: [] };
}

function kaParallelEmbeddedQuestionQuoteSuffix(
  units: readonly TranslationUnit[],
  closure: StructuralKaParallelClosure,
): { readonly suffix: string; readonly suffixUnitIndexes: readonly number[] } | null {
  if (closure.kind !== "attributive_quote") {
    return null;
  }
  const suffixUnitIndexes = unitIndexesInSpan(units, {
    start: closure.markerSpan.start,
    endExclusive: closure.markerSpan.endExclusive
  });
  return suffixUnitIndexes.length === 0
    ? null
    : {
      suffix: closure.realization === "light_koto"
        ? " 하는"
        : closure.realization === "pronominal_no" ? "라는 것" : "라는",
      suffixUnitIndexes
    };
}

function kaParallelExternalDakeCopulaSuffixPlan(
  cursor: TokenCursor<RuntimeHaruToken>,
  units: readonly TranslationUnit[],
  lookups: LookupTables,
): { readonly suffix: RenderPlan; readonly suffixUnitIndexes: readonly number[] } | null {
  const { tokens, pos: sourceEndExclusive } = cursor;
  const dakeIndex = nextNonSpaceTokenIndex(cursor);
  const dake = dakeIndex === null ? undefined : tokens[dakeIndex];
  if (dakeIndex === null || dake?.surface !== "だけ") {
    return null;
  }
  const copulaTail = matchCopulaTailWithOptionalConditional(cursor.fork(dakeIndex + 1, cursor.end, dakeIndex + 1), { skipLeadingSpace: true });
  if (copulaTail === null || (copulaTail.auxTokens.length === 0 && copulaTail.connective === null)) {
    return null;
  }
  let endExclusive = dakeIndex + 1 + copulaTail.consumed;
  let connective: string | null = copulaTail.connective;
  const tameReasonConsumed = kaParallelTameReasonTail(cursor.fork(endExclusive), sourceEndExclusive - 1, lookups);
  if (tameReasonConsumed !== null) {
    connective = "기 때문에";
    endExclusive += tameReasonConsumed;
  } else if (!kaParallelSuffixCanEndAt(cursor.fork(endExclusive))) {
    return null;
  }
  const suffixUnitIndexes = unitIndexesInSpan(units, {
    start: dakeIndex,
    endExclusive,
  });
  if (suffixUnitIndexes.length === 0) {
    return null;
  }
  return {
    suffix: {
      kind: "lemma",
      entry: null,
      koreanLemma: "뿐",
      koreanPos: 명사,
      irregular: null,
      auxTokens: copulaTail.auxTokens,
      formalOverride: true,
      ...(connective === null ? {} : { connective }),
    },
    suffixUnitIndexes,
  };
}

function kaParallelTameReasonTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  contentIdx: number,
  lookups: LookupTables,
): number | null {
  const headIndex = nextNonSpaceTokenIndex(cursor);
  const headToken = headIndex === null ? null : cursor.tokens[headIndex] ?? null;
  if (!isTameReasonHeadContext(headToken, cursor.tokens, contentIdx, lookups)) {
    return null;
  }
  if (headIndex === null) {
    return null;
  }
  return headIndex - cursor.pos + 1;
}

function kaParallelSuffixCanEndAt(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const index = nextNonSpaceTokenIndex(cursor);
  if (index === null) {
    return true;
  }
  const token = cursor.tokens[index];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  return pos0 === 補助記号 || pos0 === 記号;
}

function nextNonSpaceTokenIndex(cursor: TokenCursor<RuntimeHaruToken>): number | null {
  const c = cursor.fork();
  return c.pos < c.end ? c.pos : null;
}

function kaParallelItemPlan(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  item: StructuralKaParallelItem,
  relationKind: string,
  isLast: boolean,
  closure: StructuralKaParallelClosure,
  matrixQuestionItems: boolean,
): RenderPlan | null {
  const unitIndexes = unitIndexesInSpan(units, item.source.span);
  if (unitIndexes.length === 0) {
    return null;
  }
  if (relationKind === "toka_parallel_listing") {
    return tokaParallelListingItemPlan(tokens, units, unitIndexes, item);
  }
  if (relationKind === "ka_parallel_choice") {
    const replacements = new Map<number, RenderPlan>();
    for (const unitIndex of unitIndexes) {
      const unit = units[unitIndex];
      if (unit === undefined) {
        continue;
      }
      const projected = projectUnitWithoutKaSfpPlan(unit, item.markerSpan, tokens);
      if (projected !== null) {
        replacements.set(unitIndex, projected);
      }
    }
    return composeRelationSourceUnitPlans(tokens, units, unitIndexes, replacements);
  }
  const negativeAlternative = kaParallelNegativeAlternativePlan(item);
  if (negativeAlternative !== null) {
    return negativeAlternative;
  }
  const predicateUnitIndex = parallelPredicateUnitIndex(units, unitIndexes, item.predicateIdx);
  if (predicateUnitIndex === null) {
    if (!matrixQuestionItems) {
      return composeRelationSourceUnitPlans(tokens, units, unitIndexes);
    }
    const replacements = new Map<number, RenderPlan>();
    for (const unitIndex of unitIndexes) {
      const plan = units[unitIndex]?.renderPlan;
      if (plan === undefined || plan === null) continue;
      const projected = markQuestionContentTerminalPlan(plan);
      if (projected !== plan) replacements.set(unitIndex, projected);
    }
    return composeRelationSourceUnitPlans(tokens, units, unitIndexes, replacements);
  }
  const predicateUnit = units[predicateUnitIndex];
  if (predicateUnit === undefined) {
    return null;
  }
  if (isLast && closure.kind === "terminal_fragment" && isNominalizedConjectureMatrixQuestionPlan(predicateUnit.renderPlan)) {
    return composeRelationSourceUnitPlans(tokens, units, unitIndexes);
  }
  const projectedPredicateBase = projectSimpleNegativeHeadTailQuestionContentPlan(predicateUnit.renderPlan) ??
    projectUnitHeadTailConnectivePlan(
      predicateUnit,
      { connective: "question_content", surface: item.markerSpan.surface },
      opSourceForMarkerSpans(tokens, [item.markerSpan]),
      true,
      closure.kind === "attributive_quote"
        ? opSourceForMarkerSpans(tokens, [item.markerSpan, closure.markerSpan])
        : null,
    ) ??
    projectLemmaQuestionContentPlan(predicateUnit.renderPlan) ??
    projectConjugatedLemmaQuestionContentPlan(predicateUnit.renderPlan) ??
    projectPredicateScopeCarrierQuestionContentPlan(predicateUnit.renderPlan);
  if (projectedPredicateBase === null) {
    return null;
  }
  const projectedPredicate = matrixQuestionItems
    ? markQuestionContentTerminalPlan(projectedPredicateBase)
    : markStructuralKaParallelQuestionContentPlan(projectedPredicateBase);
  return composeRelationSourceUnitPlans(tokens, units, unitIndexes, new Map([[predicateUnitIndex, projectedPredicate]]));
}

function tokaParallelListingItemPlan(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  unitIndexes: readonly number[],
  item: StructuralKaParallelItem,
): RenderPlan | null {
  const replacements = new Map<number, RenderPlan>();
  const ownerUnitIndex = parallelPredicateUnitIndex(units, unitIndexes, item.predicateIdx);
  const plan = ownerUnitIndex === null ? null : units[ownerUnitIndex]?.renderPlan ?? null;
  if (ownerUnitIndex !== null && plan !== null) {
    const copulaIdx = previousNonSpaceTokenIndex(tokens, item.markerSpan.start);
    const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
    const basePlan: RenderPlan = plan.kind === "lemma"
      ? {
        ...plan,
        auxTokens: copula === undefined
          ? plan.auxTokens
          : plan.auxTokens.filter((token) => !sourceTokensOverlap(token, copula)),
        sfp: null,
        terminalSfp: null,
      } satisfies LemmaRealization
      : plan;
    const exemplified = item.predicateCategory === "predicate"
      ? projectTokaPredicateListingPlan(basePlan, opSourceForMarkerSpans(tokens, [item.markerSpan]))
      : attachParticleRenderPlan(basePlan, "이라든가/라든가");
    if (exemplified === null) {
      return null;
    }
    replacements.set(ownerUnitIndex, exemplified);
  }
  return composeRelationSourceUnitPlans(tokens, units, unitIndexes, replacements);
}

function projectTokaPredicateListingPlan(
  plan: RenderPlan,
  source: OpSource | null,
): RenderPlan | null {
  if (plan.kind === "lemma") {
    const rule = CONNECTIVE_RENDER_MAP.get("とか");
    if (rule === undefined || (plan.koreanPos !== 동사 && plan.koreanPos !== 형용사)) {
      return null;
    }
    return {
      ...plan,
      connective: plan.koreanPos === 형용사 ? rule.adjEnding ?? rule.korean : rule.korean,
      ...(rule.suffixText === undefined ? {} : { suffix: `${plan.suffix ?? ""}${rule.suffixText}` }),
      sfp: null,
      terminalSfp: null,
    };
  }
  if (!isPredicateHeadTailChainRenderPlan(plan) || source === null) {
    return null;
  }
  return projectHeadTailConnectivePlan(
    plan,
    { connective: "exemplification", surface: "とか" },
    source,
  );
}

function markQuestionContentTerminalPlan(plan: RenderPlan): RenderPlan {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return plan;
  }
  const layer = plan.realization.root.tail;
  const ops = layer.ops.map((op) =>
    op.kind === "connective" && op.connective === "question_content"
      ? markQuestionContentTerminalOp(op)
      : op
  );
  if (ops.every((op, index) => op === layer.ops[index])) return plan;
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: { ...layer, ops }
      }
    }
  };
}

function markStructuralKaParallelQuestionContentPlan(plan: RenderPlan): RenderPlan {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return plan;
  }
  const layer = plan.realization.root.tail;
  const ops = layer.ops.map((op) =>
    op.kind === "connective" && op.connective === "question_content"
      ? markStructuralKaParallelQuestionContentOp(op)
      : op
  );
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: { ...layer, ops }
      }
    }
  };
}

export function markQuestionContentTerminalOp(
  op: Extract<AuxOpNode, { readonly kind: "connective" }>
): Extract<AuxOpNode, { readonly kind: "connective" }> {
  return { ...op, questionContentRole: "terminal" };
}

export function markStructuralKaParallelQuestionContentOp(
  op: Extract<AuxOpNode, { readonly kind: "connective" }>
): Extract<AuxOpNode, { readonly kind: "connective" }> {
  return {
    ...op,
    questionContentRole: op.questionContentRole ?? "embedded",
    ownedByStructuralKaParallel: true
  };
}

function kaParallelNegativeAlternativePlan(item: StructuralKaParallelItem): RenderPlan | null {
  if (item.itemKind !== "negative_alternative") {
    return null;
  }
  return {
    kind: "kaParallelNegativeAlternative",
    koreanPos: 구,
  };
}

function projectUnitWithoutKaSfpPlan(
  unit: TranslationUnit,
  markerSpan: { readonly start: number; readonly endExclusive: number },
  tokens: readonly RuntimeHaruToken[],
): PredicateHeadTailChainRenderPlan | null {
  const plan = unit.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return null;
  }
  const sfp = plan.realization.root.sfp;
  const markerSource = opSourceForMarkerSpans(tokens, [{
    start: markerSpan.start,
    endExclusive: markerSpan.endExclusive,
    surface: "",
    role: "ka_parallel_marker",
  }]);
  if (markerSource === null || sfp?.effect !== "ka" || !opSourceCoveredBy(sfp.source, markerSource)) {
    return null;
  }
  const projectedRoot = {
    ...plan.realization.root,
    sfp: null,
  };
  const {
    headTailCandidate: _headTailCandidate,
    headTailSourceCandidate: _headTailSourceCandidate,
    ...planWithoutOriginalSourceCandidate
  } = plan;
  return {
    ...planWithoutOriginalSourceCandidate,
    realization: { ...plan.realization, root: projectedRoot },
    clauseRole: { ...plan.clauseRole, outgoingBoundary: { kind: "terminal" } },
  };
}

function lastRealizedUnitIndexAfter(
  units: readonly TranslationUnit[],
  unitIndexes: readonly number[],
  anchorPos: number
): number | null {
  for (let index = unitIndexes.length - 1; index >= anchorPos; index -= 1) {
    const unitIndex = unitIndexes[index];
    if (unitIndex === undefined) {
      continue;
    }
    const unit = units[unitIndex];
    if (unit !== undefined && unit.unitType !== UnitType.SYMBOL && unit.renderPlan !== null) {
      return unitIndex;
    }
  }
  return null;
}

function isNominalHeadUnit(unit: TranslationUnit | undefined): boolean {
  const pos0 = (unit?.jpHead.pos ?? 0) & POS0;
  return pos0 === 名詞 || pos0 === 代名詞;
}

function parallelPredicateUnitIndex(
  units: readonly TranslationUnit[],
  unitIndexes: readonly number[],
  predicateIdx: number | null,
): number | null {
  if (predicateIdx !== null) {
    const anchorPos = unitIndexes.findIndex((unitIndex) => units[unitIndex]?.jpIndices.includes(predicateIdx) === true);
    if (anchorPos >= 0) {
      const closingUnitIndex = lastRealizedUnitIndexAfter(units, unitIndexes, anchorPos);
      if (closingUnitIndex !== null && isNominalHeadUnit(units[closingUnitIndex])) {
        return closingUnitIndex;
      }
      const anchorUnitIndex = unitIndexes[anchorPos];
      if (anchorUnitIndex !== undefined) {
        return anchorUnitIndex;
      }
    }
  }
  for (let index = unitIndexes.length - 1; index >= 0; index -= 1) {
    const unitIndex = unitIndexes[index];
    if (unitIndex === undefined) {
      continue;
    }
    const unit = units[unitIndex];
    if (unit !== undefined && unit.unitType !== UnitType.SYMBOL && unit.renderPlan !== null) {
      return unitIndex;
    }
  }
  return null;
}

function projectLemmaQuestionContentPlan(plan: RenderPlan | null): RenderPlan | null {
  if (plan?.kind !== "lemma") {
    return null;
  }
  if (plan.koreanPos !== 동사 && plan.koreanPos !== 형용사 && plan.koreanPos !== 명사 && plan.koreanPos !== 대명사) {
    return null;
  }
  return {
    ...plan,
    connective: "는지",
    sfp: null,
  };
}

function projectConjugatedLemmaQuestionContentPlan(plan: RenderPlan | null): RenderPlan | null {
  if (plan?.kind !== "conjugatedLemma") {
    return null;
  }
  if (!("koreanLemma" in plan) || !("ending" in plan) || plan.koreanPos !== 동사 && plan.koreanPos !== 형용사) {
    return null;
  }
  return {
    ...plan,
    ending: plan.koreanPos === 형용사 ? "ㄴ/은지" : "는지",
  };
}

function projectPredicateScopeCarrierQuestionContentPlan(plan: RenderPlan | null): RenderPlan | null {
  if (plan?.kind !== "predicateScopeCarrier") {
    return null;
  }
  if (plan.projection.kind === "direct" && predicateHeadTailPlanHasQuestionContent(plan.projection.base)) {
    return projectSimpleNegativeHeadTailQuestionContentPlan(plan.projection.base) ?? plan.projection.base;
  }
  return projectLemmaQuestionContentPlan(plan.projection.base);
}

function predicateHeadTailPlanHasQuestionContent(plan: RenderPlan | null): plan is PredicateHeadTailChainRenderPlan {
  if (plan === null) {
    return false;
  }
  if (plan.kind !== "headTailChain" || plan.realization.kind !== "predicate" || plan.realization.root.tail.kind !== "auxLayer") {
    return false;
  }
  return plan.realization.root.tail.ops.some((op) => (
    op.kind === "connective" &&
    (op.connective === "question_content" || op.connective === "question_content_alternative")
  ));
}

function projectSimpleNegativeHeadTailQuestionContentPlan(plan: RenderPlan | null): RenderPlan | null {
  if (!predicateHeadTailPlanHasQuestionContent(plan)) {
    return null;
  }
  if (plan.realization.root.tail.kind !== "auxLayer" || plan.realization.root.tail.terminal !== null || plan.realization.root.sfp !== null) {
    return null;
  }
  const layer = plan.realization.root.tail;
  if (layer.ops.length !== 2) {
    return null;
  }
  const [negative, connective] = layer.ops;
  if (
    negative?.kind !== "negation" ||
    connective?.kind !== "connective" ||
    (connective.connective !== "question_content" && connective.connective !== "question_content_alternative")
  ) {
    return null;
  }
  const stem = committedPredicateStemView(layer.stem);
  if (stem === null) {
    return null;
  }
  if (stem.category === "adjectival_predicate") {
    return {
      kind: "lemma",
      entry: plan.realization.entry ?? null,
      koreanLemma: "않다",
      koreanPos: 형용사,
      irregular: null,
      prefix: `${conjugate(stem.lemma, asIrregular(stem.irregular), "지")} `,
      auxTokens: [],
      connective: "ㄴ/은지",
      voice: "active",
    };
  }
  return {
    kind: "lemma",
    entry: plan.realization.entry ?? null,
    koreanLemma: stem.lemma,
    koreanPos: 동사,
    irregular: stem.irregular,
    auxTokens: negative.source.tokens,
    connective: "는지",
    voice: "active",
  };
}

function committedPredicateStemView(
  stem: StemNode
): { readonly category: "verbal_predicate" | "adjectival_predicate"; readonly lemma: string; readonly irregular: IrregularType | null } | null {
  if (stem.kind === "verb") {
    return { category: "verbal_predicate", lemma: stem.lemma, irregular: stem.irregular };
  }
  if (stem.kind === "adj") {
    return { category: "adjectival_predicate", lemma: stem.lemma, irregular: stem.irregular };
  }
  if (
    stem.kind !== "candidateSet" ||
    stem.committedSense === undefined
  ) {
    return null;
  }
  const category = committedCandidateSetPredicateCategory(stem);
  if (category === null) {
    return null;
  }
  const candidate = stem.candidates.find((item) =>
    stemCandidateIdentitiesEqual(stemCandidateIdentity(item), stem.committedSense!)
  );
  return candidate === undefined
    ? null
    : {
        category,
        lemma: candidate.lemma,
        irregular: candidate.irregular
      };
}

function committedCandidateSetPredicateCategory(
  stem: Extract<StemNode, { readonly kind: "candidateSet" }>
): "verbal_predicate" | "adjectival_predicate" | null {
  const category = stem.committedSenseRealization?.category;
  if (category !== undefined) {
    return category === "verbal_predicate" || category === "adjectival_predicate"
      ? category
      : null;
  }
  switch (stem.sourcePredicateShape) {
    case "verb":
    case "sahen_verbalization":
      return "verbal_predicate";
    case "i_adjective":
    case "na_adjective":
      return "adjectival_predicate";
    case "nominal":
    case "particle_phrase":
    case "lexical_adverb":
    case undefined:
      return null;
  }
  return null;
}
