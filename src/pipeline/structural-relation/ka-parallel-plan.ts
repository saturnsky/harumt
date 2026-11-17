import {
  isPredicateHeadTailChainRenderPlan,
  type PredicateHeadTailChainRenderPlan,
  type RenderPlan,
} from "../../types/render-plan.js";

export function isNominalizedConjectureMatrixQuestionPlan(plan: RenderPlan | null): boolean {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return false;
  }
  if (plan.realization.root.sfp?.effect !== "ka") {
    return false;
  }
  const ops = plan.realization.root.tail.ops;
  return ops.some((op) => op.kind === "conjecture") &&
    ops.some((op) => op.kind === "modal" && op.modal === "noda");
}

export function projectNominalizedConjectureMatrixQuestionContinuationPlan(
  plan: RenderPlan | null,
  markerIdx: number,
  markerSurface: string,
): PredicateHeadTailChainRenderPlan | null {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const layer = plan.realization.root.tail;
  const alternativeIndex = layer.ops.findIndex((op) =>
    op.kind === "connective" &&
    op.connective === "alternative" &&
    op.source.tokenIndices.includes(markerIdx)
  );
  if (
    alternativeIndex < 0 ||
    !layer.ops.some((op) => op.kind === "conjecture") ||
    !layer.ops.some((op) => op.kind === "modal" && op.modal === "noda")
  ) {
    return null;
  }
  const alternative = layer.ops[alternativeIndex];
  if (alternative?.kind !== "connective") {
    return null;
  }
  const ops = [...layer.ops];
  ops[alternativeIndex] = {
    ...alternative,
    connective: "question_content",
    surface: markerSurface,
    questionContentRole: "terminal",
  };
  const {
    headTailCandidate: _headTailCandidate,
    headTailSourceCandidate: _headTailSourceCandidate,
    ...planWithoutOriginalSourceCandidate
  } = plan;
  return {
    ...planWithoutOriginalSourceCandidate,
    clauseRole: { ...plan.clauseRole, outgoingBoundary: { kind: "terminal" } },
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: { ...layer, ops },
      },
    },
  };
}
