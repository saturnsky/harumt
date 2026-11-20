import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { TokenCursor } from "../token-cursor.js";
import { copulaClosedNominalPredicateBeforeMarkerAt } from "../head-tail/boundary/ka-ownership.js";
import { TYPIFICATION_QUOTATIVE_HEADS } from "../head-tail/data/semantic-helper-sets.js";
import type { ContentMap } from "../particles/index.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { 명사, 대명사 } from "../../types/pos.js";
import { isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../types/render-plan.js";
import { attributiveModifierPlanSourceFacts } from "../rendering/render-plan-inspect.js";
import { collectBareKaQuestionContentRelations } from "./quote-question-content.js";
import { collectCopulaClosedTokaQuoteRelations, copulaClosedContentAnchorIdx } from "./quote-closed-toka.js";
import { collectQuoteStructuralRelations } from "./quote.js";
import { quoteRelationWithRequestSourceEvidence } from "./quote-request.js";
import { terminalSfpQuoteMarkerBridgeSpan } from "./quote-content-span.js";
import { quoteHostMatchIsAttributiveIu } from "../quote/host-taxonomy.js";
import { tailRootQuoteRequestSourceEvidence } from "../head-tail/tail/predicate-root/inspect.js";
import type { StructuralRelation, StructuralQuotePayload, BuildStructuralRelationGraphOptions } from "./types.js";

export function collectQuoteStructuralRelationsFromOptions(options: BuildStructuralRelationGraphOptions): readonly StructuralRelation[] {
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

export function renderPlanTerminalSfp(plan: RenderPlan | null): import("../head-tail/tail/predicate-root/grammar.js").SfpNode | null {
  if (plan === null) return null;
  if (isPredicateHeadTailChainRenderPlan(plan)) return plan.realization.root.sfp;
  if (plan.kind === "lemma" || plan.kind === "copulaPredicate") return plan.terminalSfp ?? null;
  return null;
}
