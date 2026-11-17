import type { AuxLayerNode, TailRoot } from "./grammar.js";
import {
  probeProductionDispatch,
  tailRootHasMidChainConnective as registryTailRootHasMidChainConnective,
  type ProductionIntakeSite
} from "./production-registry.js";


export function tailRootHasMidChainConnective(root: TailRoot): boolean {
  return registryTailRootHasMidChainConnective(root);
}

export function nounCopulaReasonBeforeQuoteNormalizationIndex(
  layer: AuxLayerNode,
): number | null {
  const dispatch = probeProductionDispatch(
    { tail: layer, sfp: null, quoteBinding: "unbound" },
    { intake: { site: "committed_render", partial: false } }
  );
  if (
    dispatch.kind !== "registry" ||
    dispatch.match.familyId !== "quote_mid_chain" ||
    dispatch.match.record.id !== "noun_copula_reason_quote_render"
  ) {
    return null;
  }
  const reason = dispatch.match.shape.slots.get("reason")?.[0];
  return reason === undefined ? null : layer.ops.indexOf(reason);
}

export function tailRootHasConditionalCompactQuoteMannerShape(root: TailRoot): boolean {
  const dispatch = probeProductionDispatch(root, {
    intake: {
      site: "assembler_resumable_prefix",
      partial: true,
      conditionalCompactQuoteManner: true
    }
  });
  return dispatch.kind === "registry" &&
    dispatch.match.familyId === "conditional_quote_carrier" &&
    dispatch.match.record.id === "conditional_compact_quote_manner_prefix";
}

export function quotePrefixBuilderAllowsTailRoot(root: TailRoot): boolean {
  const registryDecision = registryMidChainDecision(root, "quote_prefix");
  return registryDecision ?? !registryTailRootHasMidChainConnective(root);
}

export function attributivePrefixBuilderAllowsTailRoot(
  root: TailRoot,
  options: { readonly allowConditionalCompactQuoteManner?: boolean } = {},
): boolean {
  if (!registryTailRootHasMidChainConnective(root)) return true;
  const registryDecision = registryMidChainDecision(
    root,
    "assembler_resumable_prefix",
    options.allowConditionalCompactQuoteManner === true
  );
  return registryDecision ?? !registryTailRootHasMidChainConnective(root);
}

function registryMidChainDecision(
  root: TailRoot,
  site: ProductionIntakeSite,
  conditionalCompactQuoteManner = false,
): boolean | null {
  const productionDispatch = probeProductionDispatch(root, {
    intake: {
      site,
      partial: true,
      ...(conditionalCompactQuoteManner ? { conditionalCompactQuoteManner: true } : {})
    }
  });
  if (productionDispatch.kind === "registry") return true;
  if (productionDispatch.kind === "non_admission") return false;
  return null;
}
