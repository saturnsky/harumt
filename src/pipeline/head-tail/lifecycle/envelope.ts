import { isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../../types/render-plan.js";
import type { TailRoot } from "../tail/predicate-root/grammar.js";
import type { HeadTailCandidate } from "../tail/chain.js";

export function preserveTailChainRenderPlanEnvelope(
  candidatePlan: RenderPlan,
  currentPlan: RenderPlan | null | undefined
): RenderPlan {
  if (
    !isPredicateHeadTailChainRenderPlan(candidatePlan) ||
    !isPredicateHeadTailChainRenderPlan(currentPlan)
  ) {
    return candidatePlan;
  }
  const candidateRealization = candidatePlan.realization;
  const currentRealization = currentPlan.realization;
  const root = currentRealization.root;
  const headTailCandidate = candidatePlan.headTailCandidate ?? currentPlan.headTailCandidate;
  const headTailSourceCandidate =
    candidatePlan.headTailSourceCandidate ?? rebaseTailParserHeadTailSourceCandidate(currentPlan.headTailSourceCandidate, root);
  return {
    ...candidatePlan,
    clauseRole: currentPlan.clauseRole,
    ...(currentPlan.headProfile === undefined ? {} : { headProfile: currentPlan.headProfile }),
    ...(headTailCandidate === undefined ? {} : { headTailCandidate }),
    ...(headTailSourceCandidate === undefined ? {} : { headTailSourceCandidate }),
    realization: {
      ...candidateRealization,
      root,
      ...(currentRealization.sourceTokens === undefined ? {} : { sourceTokens: currentRealization.sourceTokens }),
      ...(currentRealization.commitmentGrammar === undefined ? {} : { commitmentGrammar: currentRealization.commitmentGrammar }),
      warnings: currentRealization.warnings
    }
  };
}

function rebaseTailParserHeadTailSourceCandidate(
  candidate: HeadTailCandidate | undefined,
  root: TailRoot
): HeadTailCandidate | undefined {
  const realization = candidate?.tail.realization;
  if (candidate === undefined || realization?.kind !== "predicate_root") {
    return candidate;
  }
  const tail = {
    ...candidate.tail,
    realization: {
      ...realization,
      root,
      tailChunk: {
        ...realization.tailChunk,
        root
      }
    }
  };
  return {
    ...candidate,
    tail
  };
}
