import type { AuxLayerNode, TailRoot } from "../head-tail/tail/predicate-root/grammar.js";
import { auxOpsInTailNode, firstAuxLayer, layerFinalScopeCarriesSourcePast, tailRootClosesWithAttributiveTerminal } from "../head-tail/tail/predicate-root/inspect.js";
import type { RenderPlan } from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import { POS4, 助動詞_タ } from "../../types/pos.js";
import { youdaModalityPayload, reasonBecausePayload, nominalConnectiveScopePayload, nominalDemoAruPayload, isWakeWrapperPlan, wakeWrapperPrefix, isRenderPlan } from "./render-plan-payloads.js";

export function renderPlanIsAttributiveModifier(plan: RenderPlan | string | null | undefined): boolean {
  if (plan === undefined || plan === null || typeof plan === "string") {
    return false;
  }
  if (plan.kind === "attributive") {
    return true;
  }
  return isPredicateHeadTailChainRenderPlan(plan) && tailRootClosesWithAttributiveTerminal(plan.realization.root);
}

export function renderPlanContainsAttributiveModifier(plan: RenderPlan | string | null | undefined): boolean {
  if (renderPlanIsAttributiveModifier(plan)) {
    return true;
  }
  if (plan !== undefined && plan !== null && typeof plan !== "string" && plan.kind === "legacySurfaceComposition") {
    return renderPlanContainsAttributiveModifier(plan.prefix) ||
      renderPlanContainsAttributiveModifier(plan.suffix);
  }
  return false;
}

export function attributiveModifierPlanSourceFacts(
  plan: RenderPlan | null | undefined
): {
  readonly headDictionaryForm: string | null;
  readonly sourcePast: boolean;
  readonly carriesNonTenseOperator: boolean;
} | null {
  if (plan === undefined || plan === null) {
    return null;
  }
  if (plan.kind === "attributive") {
    return {
      headDictionaryForm: plan.headNounToken?.dictionaryForm ?? null,
      sourcePast: plan.auxTokens.some((token) => (token.pos & POS4) === 助動詞_タ),
      carriesNonTenseOperator: (plan.voice !== undefined && plan.voice !== "active") ||
        plan.auxTokens.some((token) => (token.pos & POS4) !== 助動詞_タ)
    };
  }
  if (!isPredicateHeadTailChainRenderPlan(plan) || !tailRootClosesWithAttributiveTerminal(plan.realization.root)) {
    return null;
  }
  const layer = firstAuxLayer(plan.realization.root.tail);
  if (layer === null) {
    return null;
  }
  const payload = layer.terminalPayload;
  return {
    headDictionaryForm: payload?.kind === "attributiveBoundary" ? payload.head.dictionaryForm : null,
    sourcePast: layerFinalScopeCarriesSourcePast(layer),
    carriesNonTenseOperator: auxOpsInTailNode(plan.realization.root.tail).some((op) => op.kind !== "tense")
  };
}

export function renderPlanHasKoreanLemma(plan: RenderPlan | null | undefined, koreanLemma: string): boolean {
  if (plan === null || plan === undefined) {
    return false;
  }
  switch (plan.kind) {
    case "lemma":
    case "attributive":
    case "particleizedLemma":
    case "conjugatedLemma":
      return "koreanLemma" in plan && plan.koreanLemma === koreanLemma;
    case "giveRequest":
      return plan.koreanLemma === koreanLemma || renderPlanHasKoreanLemma(plan.base, koreanLemma);
    case "predicateScope":
    case "predicateNominalScope":
      return renderPlanHasKoreanLemma(plan.base, koreanLemma);
    case "noda":
      return isRenderPlan(plan.content) && renderPlanHasKoreanLemma(plan.content, koreanLemma) ||
        isRenderPlan(plan.prefix) && renderPlanHasKoreanLemma(plan.prefix, koreanLemma);
    case "copulaPredicate":
      return plan.koreanLemma === koreanLemma ||
        (isRenderPlan(plan.base) && renderPlanHasKoreanLemma(plan.base, koreanLemma));
    case "quoteHostReportingPassive":
      return plan.lemma === koreanLemma;
    case "quoteCognitionHost":
      return koreanLemma === "알 수 있다";
    case "legacySurfaceComposition":
      return (isRenderPlan(plan.prefix) && renderPlanHasKoreanLemma(plan.prefix, koreanLemma)) ||
        (isRenderPlan(plan.suffix) && renderPlanHasKoreanLemma(plan.suffix, koreanLemma));
    case "semanticCarrierPredicate":
      return tailRootHasKoreanLemma(plan.root, koreanLemma);
    case "youdaModality": {
      const payload = youdaModalityPayload(plan);
      return payload.koreanLemma === koreanLemma || koreanLemma === "같다" || koreanLemma === "듯하다";
    }
    case "reasonBecause": {
      const payload = reasonBecausePayload(plan);
      return payload.koreanLemma === koreanLemma;
    }
    case "nominalConnectiveScope": {
      const payload = nominalConnectiveScopePayload(plan);
      return renderPlanHasKoreanLemma(payload.content, koreanLemma);
    }
    case "nominalDemoAru": {
      const payload = nominalDemoAruPayload(plan);
      return renderPlanHasKoreanLemma(payload.content, koreanLemma);
    }
    case "headTailChain":
      return plan.realization.kind === "predicate" && tailRootHasKoreanLemma(plan.realization.root, koreanLemma);
    default:
      if (isWakeWrapperPlan(plan)) {
        const prefix = wakeWrapperPrefix(plan);
        return isRenderPlan(prefix) && renderPlanHasKoreanLemma(prefix, koreanLemma);
      }
      return false;
  }
}

function tailRootHasKoreanLemma(root: TailRoot, koreanLemma: string): boolean {
  return tailNodeHasKoreanLemma(root.tail, koreanLemma);
}

function tailNodeHasKoreanLemma(node: TailRoot["tail"], koreanLemma: string): boolean {
  if (node.kind === "auxLayer") {
    return auxLayerHasKoreanLemma(node, koreanLemma);
  }
  return auxLayerHasKoreanLemma(node.inner, koreanLemma) || tailNodeHasKoreanLemma(node.outer, koreanLemma);
}

function auxLayerHasKoreanLemma(node: AuxLayerNode, koreanLemma: string): boolean {
  const stem = node.stem;
  if (stem.kind === "candidateSet") {
    return stem.candidates.some((candidate) => candidate.lemma === koreanLemma);
  }
  return stem.lemma === koreanLemma;
}
