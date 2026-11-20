import type { RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { 동사 } from "../../types/pos.js";
import type { CarrierIdiomEntry } from "../semantics/carrier-idiom.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { replaceLemmaRenderPlan } from "../rendering/render-plan-rewrite.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import type { AssemblyContentSpan } from "../assembly-content-span.js";

interface NominalLightVerbObjectLink {
  readonly particleIndex: number;
  readonly predicateIndex: number;
  readonly predicateDictForm: string;
  readonly predicateSpan: AssemblyContentSpan;
}

export interface NominalLightVerbCarrierProjection {
  readonly kind: "carrier";
  readonly predicateIndex: number;
  readonly particleIndex: number;
  readonly entry: CarrierIdiomEntry;
  readonly renderPlan: RenderPlan;
}

export function nominalLightVerbObjectLinkAt(
  tokens: readonly RuntimeHaruToken[],
  nounIndex: number,
  nounConsumed: number,
  contentMap: ReadonlyMap<number, AssemblyContentSpan>,
  layout: ClauseLayout
): NominalLightVerbObjectLink | null {
  const particleIndex = nextNonSpaceIndex(tokens, nounIndex + nounConsumed, tokens.length) ?? tokens.length;
  const particle = tokens[particleIndex];
  if (caseParticleMarkerRelationForToken(particle, particleIndex, {
    acceptedSurfaces: ["を"],
    consumers: ["assembler"]
  }) === null) {
    return null;
  }
  const predicateIndex = nextNonSpaceIndex(tokens, particleIndex + 1, tokens.length) ?? tokens.length;
  if (layout.ownerPredicateOfParticle(particleIndex) !== predicateIndex) {
    return null;
  }
  const predicate = tokens[predicateIndex];
  const predicateSpan = contentMap.get(predicateIndex);
  if (predicate === undefined || predicateSpan === undefined) {
    return null;
  }
  const predicateDictForm = predicate.dictionaryForm || predicate.surface;
  if (predicateDictForm.length === 0) {
    return null;
  }
  return {
    particleIndex,
    predicateIndex,
    predicateDictForm,
    predicateSpan
  };
}

export function rewriteCarrierIdiomRenderPlan(
  renderPlan: RenderPlan | null,
  entry: CarrierIdiomEntry
): RenderPlan | undefined {
  if (renderPlan === null) {
    return undefined;
  }
  return replaceLemmaRenderPlan(renderPlan, {
    koreanLemma: entry.koreanCarrier,
    koreanPos: 동사,
    irregular: entry.irregular ?? null
  });
}
