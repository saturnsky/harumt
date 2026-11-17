import { isAruVerbToken } from "../classifiers/tokens.js";
import type { AuxLayerNode, ConnectiveOp } from "../grammar.js";
import { isBenefactiveAspectOp } from "../inspect.js";
import { operatorCreatesPotentialPredicate } from "../operator-head.js";
import {
  tracedCat,
  tracedSeg,
  type RenderOutcome
} from "./base-model.js";
import {
  CONDITIONAL_QUOTE_ELLIPSIS_PREDICATE,
  type ConditionalQuoteEllipsisMood
} from "./connective-compose.js";

export function composeHostlessConditionalQuote(
  renderedConditional: RenderOutcome,
  sourceLayer: AuxLayerNode,
  quote: ConnectiveOp
): RenderOutcome {
  if (!renderedConditional.ok) {
    return renderedConditional;
  }
  const hostTrace = renderedConditional.traced ?? tracedSeg(
    renderedConditional.text,
    [
      ...sourceLayer.stem.source.tokens,
      ...sourceLayer.ops.slice(0, -1).flatMap((op) => op.source.tokens)
    ],
    "lexeme",
    "semantic"
  );
  return {
    ...renderedConditional,
    text: `${renderedConditional.text} 하고`,
    polite: false,
    traced: tracedCat(
      hostTrace,
      tracedSeg(" 하고", quote.source.tokens, "connective", "semantic")
    )
  };
}
export function composeConditionalWishComplement(
  renderedConditional: RenderOutcome,
  sourceLayer: AuxLayerNode,
  wish: ConnectiveOp
): RenderOutcome {
  if (!renderedConditional.ok) {
    return renderedConditional;
  }
  const hostTrace = renderedConditional.traced ?? tracedSeg(
    renderedConditional.text,
    [
      ...sourceLayer.stem.source.tokens,
      ...sourceLayer.ops.slice(0, -1).flatMap((op) => op.source.tokens)
    ],
    "lexeme",
    "semantic"
  );
  return {
    ...renderedConditional,
    text: `${renderedConditional.text} 좋겠다고`,
    polite: false,
    traced: tracedCat(
      hostTrace,
      tracedSeg(" 좋겠다고", wish.source.tokens, "connective", "semantic")
    )
  };
}

export type { ConditionalQuoteEllipsisMood };

export function conditionalQuoteEllipsisMood(
  layer: AuxLayerNode,
  conditional: ConnectiveOp
): ConditionalQuoteEllipsisMood {
  if (conditional.allomorph === "tara") {
    return "wish";
  }
  if (isAruVerbToken(layer.stem.source.tokens[layer.stem.conjugationAnchor])) {
    return "wish";
  }
  const conditionalIdx = layer.ops.indexOf(conditional);
  const hostOps = conditionalIdx < 0 ? layer.ops : layer.ops.slice(0, conditionalIdx);
  return hostOps.some((op) =>
    operatorCreatesPotentialPredicate(op) ||
    (isBenefactiveAspectOp(op) && (op.benefactive.potential === true || op.aspect === "te_kudasaru"))
  )
    ? "wish"
    : "sufficiency";
}

export function composeConditionalQuoteEllipsisTerminal(
  renderedConditional: RenderOutcome,
  sourceLayer: AuxLayerNode,
  carrier: { readonly source: ConnectiveOp["source"] },
  mood: ConditionalQuoteEllipsisMood
): RenderOutcome {
  if (!renderedConditional.ok) {
    return renderedConditional;
  }
  const suffix = ` ${CONDITIONAL_QUOTE_ELLIPSIS_PREDICATE[mood].declarative}고`;
  const hostTrace = renderedConditional.traced ?? tracedSeg(
    renderedConditional.text,
    [
      ...sourceLayer.stem.source.tokens,
      ...sourceLayer.ops.slice(0, -1).flatMap((op) => op.source.tokens)
    ],
    "lexeme",
    "semantic"
  );
  return {
    ...renderedConditional,
    text: `${renderedConditional.text}${suffix}`,
    polite: false,
    traced: tracedCat(
      hostTrace,
      tracedSeg(suffix, carrier.source.tokens, "connective", "semantic")
    )
  };
}
