import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import type { AdjCopulaBridgeOp, AuxLayerNode, AuxOpNode, NegationOp, TenseOp } from "../grammar.js";
import { closeChainTraceAgainstText, tracedSeg, type ChainSourceTrace, type RenderOutcome, type TailTraceSegment } from "./base-model.js";
import { irregularFrom } from "./final-forms.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";

export function simpleHostChainSourceTrace(
  layer: AuxLayerNode,
  excludeOp: AuxOpNode | null
): ChainSourceTrace | null {
  const companions = layer.ops.filter((op) => op !== excludeOp);
  if (!companions.every((op) =>
    op.kind === "tense" || op.kind === "polite" ||
    op.kind === "classicalAuxResidue" || op.kind === "adjCopulaBridge"
  )) {
    return null;
  }
  return {
    prefixSegments: [],
    finalSourceTokens: [
      ...layer.stem.source.tokens,
      ...companions.flatMap((op) => op.source.tokens)
    ],
    finalKind: "lexeme"
  };
}

export function longNegationChainTrace(
  stemLemma: string,
  stemIrregular: IrregularType | null,
  stemTokens: readonly TenseOp["source"]["tokens"][number][],
  negation: NegationOp,
  extraFinalTokens: readonly TenseOp["source"]["tokens"][number][]
): ChainSourceTrace | null {
  const stemJi = conjugate(stemLemma, stemIrregular, "지");
  const split = negation.sourceSplit?.kind === "predicate_copula_negative" ? negation.sourceSplit : null;
  const prefixSegments: TailTraceSegment[] = [];
  const negationFinalTokens = split !== null
    ? split.finalTokens
    : negation.source.tokens.length === negation.chainDepth
      ? [negation.source.tokens[negation.chainDepth - 1]!]
      : negation.source.tokens.slice(negation.chainDepth - 1);
  if (split !== null) {
    if (!stemJi.endsWith("지") || stemJi.length < 2) {
      return null;
    }
    prefixSegments.push({
      text: stemJi.slice(0, -1),
      sourceTokens: stemTokens,
      kind: "lexeme",
      projectionConfidence: "semantic"
    });
    prefixSegments.push({ text: "지", sourceTokens: split.bridgeTokens, kind: "aux", projectionConfidence: "semantic" });
  } else {
    if (negation.source.tokens.length < negation.chainDepth) {
      return null;
    }
    prefixSegments.push({
      text: stemJi,
      sourceTokens: stemTokens,
      kind: "lexeme",
      projectionConfidence: "semantic"
    });
    for (let i = 0; i < negation.chainDepth - 1; i++) {
      prefixSegments.push({
        text: " 않지",
        sourceTokens: [negation.source.tokens[i]!],
        kind: "aux",
        projectionConfidence: "semantic"
      });
    }
  }
  return {
    prefixSegments,
    finalSourceTokens: [...negationFinalTokens, ...extraFinalTokens],
    finalKind: "aux"
  };
}

export function longNegationTraceParts(
  negation: NegationOp,
  ops: readonly AuxOpNode[],
  extraFinalTokens: readonly TenseOp["source"]["tokens"][number][]
): {
  readonly negation: NegationOp;
  readonly extraFinalTokens: readonly TenseOp["source"]["tokens"][number][];
} {
  if (negation.sourceSplit !== undefined) {
    return { negation, extraFinalTokens };
  }
  const bridge = ops.find((op): op is AdjCopulaBridgeOp => op.kind === "adjCopulaBridge");
  if (bridge === undefined) {
    return { negation, extraFinalTokens };
  }
  return {
    negation: {
      ...negation,
      sourceSplit: {
        kind: "predicate_copula_negative",
        bridgeTokens: bridge.source.tokens,
        finalTokens: negation.source.tokens
      }
    },
    extraFinalTokens
  };
}

export function withSimpleHostTraced(result: RenderOutcome, layer: AuxLayerNode): RenderOutcome {
  if (!result.ok || result.traced !== undefined) {
    return result;
  }
  const hostTrace = simpleHostChainSourceTrace(layer, null);
  if (hostTrace !== null) {
    const traced = closeChainTraceAgainstText(hostTrace, result.text);
    return traced === null ? result : { ...result, traced };
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return result;
  }
  const negations = layer.ops.filter((op): op is NegationOp => op.kind === "negation");
  const carries = layer.ops.filter((op) =>
    op.kind === "tense" || op.kind === "polite" ||
    op.kind === "classicalAuxResidue" || op.kind === "adjCopulaBridge"
  );
  if (negations.length !== 1 || negations.length + carries.length !== layer.ops.length) {
    return result;
  }
  const negation = negations[0]!;
  const carryTokens = carries
    .filter((op) => op.kind !== "adjCopulaBridge")
    .flatMap((op) => op.source.tokens);
  if (result.text.startsWith("안 ") || result.text.includes(" 안 ")) {
    return {
      ...result,
      traced: tracedSeg(
        result.text,
        [...layer.stem.source.tokens, ...negation.source.tokens, ...carryTokens],
        "lexeme",
        "semantic"
      )
    };
  }
  const traceParts = longNegationTraceParts(negation, carries, carryTokens);
  const trace = longNegationChainTrace(
    layer.stem.lemma,
    irregularFrom(layer.stem.irregular),
    layer.stem.source.tokens,
    traceParts.negation,
    traceParts.extraFinalTokens
  );
  if (trace === null) {
    return result;
  }
  const traced = closeChainTraceAgainstText(trace, result.text);
  return traced === null ? result : { ...result, traced };
}

export function splitTeBridgeSourceTokens(
  sourceTokens: readonly RuntimeHaruToken[]
): { readonly bridgeTokens: readonly RuntimeHaruToken[]; readonly finalTokens: readonly RuntimeHaruToken[] } {
  const first = sourceTokens[0];
  if (
    first !== undefined &&
    (first.surface === "て" || first.surface === "で")
  ) {
    return {
      bridgeTokens: sourceTokens.slice(0, 1),
      finalTokens: sourceTokens.slice(1)
    };
  }
  return {
    bridgeTokens: [],
    finalTokens: sourceTokens
  };
}
