import {
  commitNominalTailChainPlan,
  renderCommittedNominalTailChain,
  renderNominalTailChainPurposeAttributive as renderPurposeAttributiveProjection,
} from "./commit.js";
import type { NominalHeadTailChainPlan } from "../../../lifecycle/head-tail-render-plan.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";

export function renderNominalTailChain(
  plan: NominalHeadTailChainPlan,
  lookups: LookupTables,
  numeric: NumericTables,
  options: { readonly formal?: boolean; readonly precedingAllomorphKorean?: string } = {}
): string {
  if (plan.realization.projection?.kind === "purpose_attributive") {
    const projected = renderPurposeAttributiveProjection(plan, { ...options, lookups, numeric });
    if (projected === null) {
      throw new Error("nominal tail chain purpose-attributive projection is not renderable");
    }
    return projected;
  }
  return renderCommittedNominalTailChain(commitNominalTailChainPlan(plan, { ...options, lookups, numeric }));
}

export function renderNominalTailChainPurposeAttributive(
  plan: NominalHeadTailChainPlan,
  lookups: LookupTables,
  numeric: NumericTables,
  options: { readonly formal?: boolean } = {}
): string | null {
  return renderPurposeAttributiveProjection(plan, { ...options, lookups, numeric });
}
