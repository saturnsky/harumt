import { realizeNumeral } from "../../../../generator/numeral-realization.js";
import type { NumericStemBase } from "../../../../types/numeric-base.js";
import { joinNounPhraseSurface } from "../../../nominal-phrase-surface.js";
import type { AuxLayerNode, TailNode, TailRoot } from "./grammar.js";

export function numericHostBaseSurface(base: NumericStemBase): string {
  const numeral = base.plan.kind === "numeral" ? realizeNumeral(base.plan) : base.plan.text;
  const suffixParts = base.suffixParts ?? [];
  if (suffixParts.length === 0) {
    return numeral;
  }
  return joinNounPhraseSurface([
    { korean: numeral, isSuffixNoun1Char: false, isNominal: true },
    ...suffixParts
  ]);
}

export function withNumericStemBaseResolved(root: TailRoot): TailRoot | null {
  const resolved = resolveNumericStemInNode(root.tail);
  if (resolved === null) {
    return null;
  }
  return resolved === root.tail ? root : { ...root, tail: resolved };
}

function resolveNumericStemInNode(node: TailNode): TailNode | null {
  if (node.kind !== "connective") {
    return resolveNumericStemInLayer(node);
  }
  const inner = resolveNumericStemInLayer(node.inner);
  return inner === null ? null : inner === node.inner ? node : { ...node, inner };
}

function resolveNumericStemInLayer(layer: AuxLayerNode): AuxLayerNode | null {
  const stem = layer.stem;
  if (stem.kind !== "noun" || stem.numericBase === undefined) {
    return layer;
  }
  const lemma = numericHostBaseSurface(stem.numericBase);
  return lemma.length === 0 ? null : { ...layer, stem: { ...stem, lemma } };
}
