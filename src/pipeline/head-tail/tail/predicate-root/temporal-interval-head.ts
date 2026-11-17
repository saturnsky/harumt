import type { LookupTables } from "../../../lookup-tables.js";
import { topicFocusMarkerRelationAt } from "../../boundary/marker.js";
import type { AttributiveBoundaryPayload, AuxLayerNode, AuxOpNode, TemporalIntervalHeadVariant } from "./grammar.js";
import { chainFinalOpHostCategory, layerFinalScopeCarriesSourcePast } from "./inspect.js";
import { isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../../../types/render-plan.js";
import type { PredicateHeadTailChainRenderPlan } from "../../lifecycle/head-tail-render-plan.js";

export function classifyTemporalIntervalHeadVariant(
  layer: AuxLayerNode,
  payload: AttributiveBoundaryPayload,
  lookups: LookupTables
): TemporalIntervalHeadVariant | null {
  const heads = lookups.UCHI_TEMPORAL_HEADS;
  if (!heads.has(payload.head.dictionaryForm) && !heads.has(payload.head.surface)) {
    return null;
  }
  if (layerFinalScopeCarriesSourcePast(layer)) {
    return null;
  }
  const ops = layer.ops;
  const last: AuxOpNode | undefined = ops[ops.length - 1];
  const finalNegation = last?.kind === "negation" ? last : null;
  const suppletiveNegation = layer.stem.commitment === "suppletive_negation" && ops.length === 0;
  const category = predicateCategoryBefore(layer, finalNegation === null ? ops.length : ops.length - 1);
  if (category === null) {
    return null;
  }
  const negated = finalNegation !== null || suppletiveNegation;
  if (category === "stative") {
    return "adjectival_time";
  }
  const unaware = negated && stemIsUnawarePredicate(layer, lookups);
  if (!unaware && finalNegation !== null && !finalNegation.chainPast) {
    return "before";
  }
  const tokens = payload.projectionContext.tokens;
  const topicFollows = topicFocusMarkerRelationAt(tokens, payload.head.tokenIdx + 1, {
    acceptedSurfaces: ["は"],
    consumers: ["nominal_head"]
  }) !== null;
  if (topicFollows) {
    return "duration";
  }
  return unaware ? "unaware_interval" : "interval";
}

function predicateCategoryBefore(layer: AuxLayerNode, end: number): "verbal" | "stative" | null {
  for (let idx = end - 1; idx >= 0; idx -= 1) {
    const category = chainFinalOpHostCategory(layer.ops[idx]);
    if (category === "verbal_predicate") return "verbal";
    if (category === "adjectival_predicate" || category === "noun") return "stative";
  }
  const shape = layer.stem.sourcePredicateShape;
  if (shape === "verb" || shape === "sahen_verbalization") {
    return "verbal";
  }
  if (shape === "i_adjective" || shape === "na_adjective" || shape === "nominal") {
    return "stative";
  }
  return null;
}

function stemIsUnawarePredicate(layer: AuxLayerNode, lookups: LookupTables): boolean {
  const stem = layer.stem;
  const unaware = lookups.UCHI_UNAWARE_VERBS;
  return [...stem.semanticAnchors, stem.conjugationAnchor].some((anchorIdx) => {
    const token = stem.source.tokens[anchorIdx];
    return token !== undefined && unaware.has(token.dictionaryForm);
  });
}

export function temporalIntervalVariantHeadedAt(
  plans: Iterable<RenderPlan | null | undefined>,
  headIdx: number
): TemporalIntervalHeadVariant | null {
  for (const plan of plans) {
    if (!isPredicateHeadTailChainRenderPlan(plan ?? null)) {
      continue;
    }
    const tail = (plan as PredicateHeadTailChainRenderPlan).realization.root.tail;
    const payload = tail.kind === "auxLayer" ? tail.terminalPayload : undefined;
    if (payload?.kind === "attributiveBoundary" && payload.head.tokenIdx === headIdx) {
      return payload.temporalIntervalVariant ?? null;
    }
  }
  return null;
}
