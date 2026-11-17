import { POS4 } from "../types/pos.js";
import { extractFeatures as extractAuxFeatures, type AuxToken } from "../generator/aux-map.js";
import type { LookupTables } from "./lookup-tables.js";
import type { RenderPlan } from "../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../types/render-plan.js";
import type { RuntimeHaruToken } from "../types/token.js";
import type { AuxLayerNode, AuxOpNode, TailRoot } from "./head-tail/tail/predicate-root/grammar.js";

export interface PredicateMorphology {
  readonly polite: boolean;
  readonly past: boolean;
  readonly negative: boolean;
  readonly desire: boolean;
  readonly passive: boolean;
  readonly potential: boolean;
  readonly causative: boolean;
  readonly causativePassive: boolean;
  readonly progressive: boolean;
}

export interface PredicateMorphologyOptions {
  readonly jpDictForm?: string | null;
  readonly verbConjType?: number | null;
  readonly forcePassive?: boolean;
}

export interface PredicateMorphologyUnitView {
  readonly renderPlan: RenderPlan | null;
  readonly jpHead: RuntimeHaruToken;
}

export function predicateMorphologyFromAuxTokens(
  auxTokens: readonly AuxToken[],
  options: PredicateMorphologyOptions = {},
  lookups: LookupTables
): PredicateMorphology {
  const features = extractAuxFeatures(auxTokens, normalizeAuxOptions(options, lookups));
  return {
    polite: features.polite,
    past: features.past,
    negative: features.negative,
    desire: features.desire,
    passive: features.passive,
    potential: features.potential,
    causative: features.causative,
    causativePassive: features.causativePassive,
    progressive: features.progressive || auxTokens.some((token) => token.dictionaryForm === "でる")
  };
}

export function predicateMorphologyFromTailRoot(root: TailRoot): PredicateMorphology | null {
  return predicateMorphologyFromAuxLayer(root.tail.kind === "auxLayer" ? root.tail : root.tail.inner);
}

export function predicateMorphologyFromAuxLayer(layer: AuxLayerNode): PredicateMorphology {
  const ops = layer.ops;
  return {
    polite: ops.some((op) => op.kind === "polite" || ("polite" in op && op.polite === true)),
    past: ops.some((op) => op.kind === "tense" && op.tense === "past") ||
      ops.some((op) => "past" in op && op.past === true),
    negative: ops.some((op) => op.kind === "negation") ||
      ops.some((op) => "polarity" in op && op.polarity === "negative"),
    desire: ops.some((op) => op.kind === "desire") ||
      ops.some(isDesiderativeAspectOp),
    passive: ops.some((op) => op.kind === "voice" && op.voice === "passive"),
    potential: ops.some((op) => op.kind === "voice" && op.voice === "potential"),
    causative: ops.some((op) => op.kind === "voice" && op.voice === "causative"),
    causativePassive: ops.some((op) => op.kind === "voice" && op.voice === "causative_passive"),
    progressive: ops.some((op) => op.kind === "aspect" && op.aspect === "te_iru")
  };
}

export function predicateMorphologyFromRenderPlan(
  plan: RenderPlan | null,
  options: PredicateMorphologyOptions = {},
  lookups: LookupTables
): PredicateMorphology | null {
  if (plan === null) {
    return null;
  }
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return predicateMorphologyFromTailRoot(plan.realization.root);
  }
  if (plan.kind !== "lemma") {
    return null;
  }
  const planJpDictForm = plan.jpDictForm === undefined ? null : plan.jpDictForm;
  const planVerbConjType = plan.verbConjType === undefined ? null : plan.verbConjType;
  const auxOptions: PredicateMorphologyOptions = {
    ...(options.jpDictForm === undefined ? { jpDictForm: planJpDictForm } : { jpDictForm: options.jpDictForm }),
    ...(options.verbConjType === undefined ? { verbConjType: planVerbConjType } : { verbConjType: options.verbConjType }),
    ...(options.forcePassive === undefined ? {} : { forcePassive: options.forcePassive })
  };
  return predicateMorphologyFromAuxTokens(plan.auxTokens, auxOptions, lookups);
}

export function predicateMorphologyFromUnit(
  unit: PredicateMorphologyUnitView,
  options: PredicateMorphologyOptions = {},
  lookups: LookupTables
): PredicateMorphology | null {
  const renderOptions: PredicateMorphologyOptions = {
    jpDictForm: options.jpDictForm ?? unit.jpHead.dictionaryForm,
    ...(options.verbConjType === undefined ? { verbConjType: unit.jpHead.pos & POS4 } : { verbConjType: options.verbConjType }),
    ...(options.forcePassive === undefined ? {} : { forcePassive: options.forcePassive })
  };
  return predicateMorphologyFromRenderPlan(unit.renderPlan, renderOptions, lookups);
}

function normalizeAuxOptions(options: PredicateMorphologyOptions, lookups: LookupTables): {
  readonly lookups: LookupTables;
  readonly jpDictForm?: string;
  readonly verbConjType?: number;
  readonly forcePassive?: boolean;
} {
  return {
    lookups,
    ...(options.jpDictForm === undefined || options.jpDictForm === null ? {} : { jpDictForm: options.jpDictForm }),
    ...(options.verbConjType === undefined || options.verbConjType === null ? {} : { verbConjType: options.verbConjType }),
    ...(options.forcePassive === undefined ? {} : { forcePassive: options.forcePassive })
  };
}

function isDesiderativeAspectOp(
  op: AuxOpNode
): op is Extract<AuxOpNode, { readonly kind: "aspect"; readonly aspect: "te_hoshii" }> {
  return op.kind === "aspect" && op.aspect === "te_hoshii";
}
