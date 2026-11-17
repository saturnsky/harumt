import type { AuxOpNode, TailRoot } from "../tail/predicate-root/grammar.js";
import type { PredicateHeadTailChainRenderPlan } from "./head-tail-render-plan.js";
import { createConnectiveOp } from "../tail/predicate-root/op-builders.js";

export function tailChainWishComplementPlan(plan: PredicateHeadTailChainRenderPlan): PredicateHeadTailChainRenderPlan | null {
  const root = tailRootWithWishComplementConnective(plan.realization.root);
  if (root === null) {
    return null;
  }
  return {
    ...plan,
    realization: { ...plan.realization, root },
    clauseRole: {
      ...plan.clauseRole,
      outgoingBoundary: {
        kind: "接続助詞",
        connectiveKind: "wish_complement",
        surface: "ことを",
        tokenIdx: plan.clauseRole.tokenSpan.end,
        tokenSpan: { start: plan.clauseRole.tokenSpan.end + 1, end: plan.clauseRole.tokenSpan.end + 2 }
      }
    }
  };
}

function tailRootWithWishComplementConnective(root: TailRoot): TailRoot | null {
  if (root.tail.kind !== "auxLayer") {
    return null;
  }
  const source = lastTailNodeSource(root.tail);
  if (source === null) {
    return null;
  }
  const connective: AuxOpNode = createConnectiveOp({

    connective: "wish_complement",
    surface: "ことを",
    source
  });
  return {
    ...root,
    tail: {
      ...root.tail,
      ops: [...root.tail.ops, connective],
      terminal: null
    }
  };
}

function lastTailNodeSource(node: Extract<TailRoot["tail"], { readonly kind: "auxLayer" }>): AuxOpNode["source"] | null {
  for (let i = node.ops.length - 1; i >= 0; i -= 1) {
    const op = node.ops[i];
    if (op !== undefined) return op.source;
  }
  return node.stem.source;
}
