import type { RenderPlan } from "../../types/render-plan.js";
import { legacySurfaceCompositionPlan } from "../../types/render-plan.js";
import { realizeNumeral } from "../../generator/numeral-realization.js";
import type { CommitmentSpan } from "./types.js";

export function commitNumeralRendering(span: CommitmentSpan): void {
  const plan = span.renderPlan ?? null;
  if (plan === null || plan.kind !== "numeral") {
    return;
  }
  const numeralPlan = plan;
  const korean = realizeNumeral(numeralPlan);
  span.korean = korean;
}

export function commitExtentPostposition(span: CommitmentSpan): void {
  const postposition = span.extentPostposition ?? null;
  if (postposition === null) {
    return;
  }
  span.extentPostposition = null;
  const modifier = postposition.modifier.trim();
  if (modifier.length === 0) {
    return;
  }
  const base: RenderPlan | string = postposition.targetOverride ?? span.renderPlan ?? span.korean;
  span.renderPlan = legacySurfaceCompositionPlan("deferred_commitment", {
    korean: "",
    koreanPos: span.koreanPos,
    prefix: base,
    suffix: ` ${modifier}`
  });
  span.korean = "";
}

export function clearRelocatedExtentPostpositionSource(span: CommitmentSpan): void {
  if (span.extentPostpositionRelocated !== true) {
    return;
  }
  span.korean = "";
  span.renderPlan = null;
}
