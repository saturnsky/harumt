import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { tailChainWishComplementPlan } from "../../../lifecycle/wish-complement.js";
import { TranslationUnit } from "../../../../translation/unit.js";
import { caseParticleMarkerRelationForToken } from "../../../boundary/marker.js";
import { isPredicateHeadTailChainRenderPlan } from "../../../../../types/render-plan.js";
import type { RenderPlan } from "../../../../../types/render-plan.js";


import { POS4 } from "../../../../../types/pos.js";
export function applyKotoWoWishComplement(
  units: readonly TranslationUnit[],
  options: { readonly lookups: LookupTables; readonly numeric: NumericTables }
): void {
  for (let index = 0; index < units.length - 3; index += 1) {
    const predicate = units[index];
    const koto = units[index + 1];
    const wo = units[index + 2];
    const host = units[index + 3];
    if (
      predicate === undefined ||
      koto === undefined ||
      wo === undefined ||
      host === undefined ||
      predicate.suppressed ||
      koto.suppressed ||
      wo.suppressed ||
      host.suppressed ||
      koto.jpHead.dictionaryForm !== "こと" ||
      caseParticleMarkerRelationForToken(wo.jpHead, -1, {
        acceptedSurfaces: ["を"],
        consumers: ["nominal_head_parser"]
      }) === null ||
      !unitIsWishComplementHost(host, options.lookups)
    ) {
      continue;
    }
    const nominalized = wishNominalizedPredicatePlan(predicate);
    if (nominalized === null) {
      continue;
    }
    predicate.setRenderPlan(nominalized, { rule: "koto_wo_wish_complement", cacheValue: "" });
    koto.suppress({ rule: "koto_wo_wish_complement" });
    wo.suppress({ rule: "koto_wo_wish_complement" });
  }
}

function unitIsWishComplementHost(unit: TranslationUnit, lookups: LookupTables): boolean {
  const form = unit.jpHead.dictionaryForm || unit.jpHead.surface;
  const registry = lookups.QUOTE_HOST_REGISTRY;
  return registry.kind("direct", form) === "wish" || registry.kind("noun_suru", form) === "wish";
}

function wishNominalizedPredicatePlan(
  unit: TranslationUnit
): RenderPlan | null {
  const plan = unit.renderPlan;
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return tailChainWishComplementPlan(plan);
  }
  if (plan?.kind !== "attributive") {
    return null;
  }
  return {
    kind: "conjugatedLemma",
    koreanLemma: plan.koreanLemma,
    irregular: plan.irregular,
    koreanPos: plan.koreanPos,
    ending: "기",
    auxTokens: plan.auxTokens,
    particle: "을/를",
    jpDictForm: plan.contentToken.dictionaryForm,
    verbConjType: (plan.contentToken.pos & POS4) !== 0 ? (plan.contentToken.pos & POS4) : null,
    ...(plan.voice === undefined ? {} : { voice: plan.voice })
  };
}
