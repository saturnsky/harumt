import { TranslationUnit, UnitType } from "../../../../translation/unit.js";
import {
  renderPlanIsPredicateQuoteCarrierAttributive,
  withCognitiveComplementTopicRenderPlan,
  withQuotedKotoTopicContractionRenderPlan
} from "../../../../rendering/render-plan.js";

export function applyQuotedKotoTopicContraction(
  units: readonly TranslationUnit[]
): void {
  for (let index = 1; index < units.length - 1; index += 1) {
    const previous = units[index - 1];
    const current = units[index];
    const next = units[index + 1];
    if (previous === undefined || current === undefined || next === undefined || previous.suppressed || current.suppressed || next.suppressed) {
      continue;
    }
    if (current.unitType !== UnitType.CONTENT || current.jpHead.surface !== "こと") {
      continue;
    }
    if (next.unitType !== UnitType.FUNCTIONAL || next.jpHead.surface !== "は") {
      continue;
    }
    if (!renderPlanIsPredicateQuoteCarrierAttributive(previous.renderPlan)) {
      continue;
    }
    const afterTopic = units[index + 2];
    if (
      afterTopic?.unitType === UnitType.SYMBOL &&
      (afterTopic.jpHead.surface === "、" || afterTopic.jpHead.surface === ",")
    ) {
      continue;
    }
    let cursor = index + 2;
    while (cursor < units.length && units[cursor]?.unitType === UnitType.SYMBOL) {
      cursor += 1;
    }
    if (cursor < units.length && units[cursor]?.jpHead.dictionaryForm === "ない") {
      continue;
    }
    const boundary = previous.renderPlan?.kind === "headTailChain" && previous.renderPlan.realization.kind === "predicate"
      ? previous.renderPlan.clauseRole.outgoingBoundary
      : undefined;
    const cognitiveTopic = boundary !== undefined && boundary.kind !== "terminal" &&
      boundary.connectiveKind === "cognitive_complement";
    const plan = cognitiveTopic
      ? withCognitiveComplementTopicRenderPlan(previous.renderPlan!)
      : withQuotedKotoTopicContractionRenderPlan(previous.renderPlan);
    if (plan === undefined) {
      continue;
    }
    previous.setRenderPlan(plan, { rule: "quoted_koto_topic_contraction", cacheValue: "" });
    current.suppress({ rule: "quoted_koto_topic_contraction" });
    next.suppress({ rule: "quoted_koto_topic_contraction" });
  }
}
