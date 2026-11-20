import { isPredicateHeadTailChainRenderPlan, type LemmaRealization, type PredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { AuxLayerNode, ConnectiveKind, ConnectiveOp, OpSource } from "../head-tail/tail/predicate-root/grammar.js";
import type { TranslationUnit } from "../translation/unit.js";
import { POS4, 助動詞_タ, 동사, 형용사 } from "../../types/pos.js";
import { createConnectiveOp } from "../head-tail/tail/predicate-root/op-builders.js";

export function projectUnitHeadTailConnectivePlan(
  unit: TranslationUnit,
  connective: {
    readonly connective: ConnectiveKind;
    readonly surface: string;
    readonly quotativeMood?: "declarative" | "imperative";
  },
  sourceOverride: OpSource | null = null,
  suppressNodaOwnedByRelation = false,
  quoteOwnerSource: OpSource | null = null,
): PredicateHeadTailChainRenderPlan | null {
  const plan = unit.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return null;
  }
  return projectHeadTailConnectivePlan(
    plan,
    connective,
    sourceOverride,
    suppressNodaOwnedByRelation,
    quoteOwnerSource,
  );
}

export function projectHeadTailConnectivePlan(
  plan: PredicateHeadTailChainRenderPlan,
  connective: {
    readonly connective: ConnectiveKind;
    readonly surface: string;
    readonly quotativeMood?: "declarative" | "imperative";
  },
  sourceOverride: OpSource | null = null,
  suppressNodaOwnedByRelation = false,
  quoteOwnerSource: OpSource | null = null,
  connectiveProjection: "replace_last" | "append" = "replace_last",
): PredicateHeadTailChainRenderPlan | null {
  if (plan.realization.root.tail.kind !== "auxLayer") return null;
  const layer = plan.realization.root.tail;
  const source = sourceOverride ?? [...layer.ops].reverse().find((op): op is ConnectiveOp => op.kind === "connective")?.source ?? layer.stem.source;
  const suppressQuestionSfp = shouldProjectQuestionSfp(plan.realization.root, connective, source);
  const suppressNominalizedQuestionSfp = suppressQuestionSfp && isNominalizedQuestionSurface(connective.surface);
  const baseOps = layer.ops.filter((op) => {
    if (
      quoteOwnerSource !== null &&
      op.kind === "predicateQuoteCarrier" &&
      opSourceCoveredBy(op.source, quoteOwnerSource)
    ) {
      return false;
    }
    return !(suppressNominalizedQuestionSfp || suppressNodaOwnedByRelation) || !(
      op.kind === "modal" &&
      op.modal === "noda" &&
      (suppressNodaOwnedByRelation || opSourceCoveredBy(op.source, source))
    );
  });
  const replacement = buildStructuralProjectionConnectiveOp(source, connective);
  const projectedOps = connectiveProjection === "append"
    ? [...baseOps, replacement]
    : replaceLastConnectiveOp(baseOps, replacement);
  const projectedLayer: AuxLayerNode = {
    ...layer,
    ops: projectedOps,
    terminal: null,
  };
  const projectedRoot = {
    ...plan.realization.root,
    tail: projectedLayer,
    ...(suppressQuestionSfp ? { sfp: null } : {}),
  };
  const projectedBoundary = connectiveBoundaryForProjection(plan, connective, source);
  const {
    headTailCandidate: _headTailCandidate,
    headTailSourceCandidate: _headTailSourceCandidate,
    ...planWithoutOriginalSourceCandidate
  } = plan;
  const { partial: _partial, ...realizationWithoutPartial } = plan.realization;
  const projectedPlan: PredicateHeadTailChainRenderPlan = {
    ...planWithoutOriginalSourceCandidate,
    clauseRole: { ...plan.clauseRole, outgoingBoundary: projectedBoundary },
    realization: {
      ...realizationWithoutPartial,
      root: projectedRoot,
      warnings: resolvedStructuralProjectionWarnings(plan.realization.warnings),
    },
  };
  return projectedPlan;
}

export function resolvedStructuralProjectionWarnings(
  warnings: PredicateHeadTailChainRenderPlan["realization"]["warnings"],
): PredicateHeadTailChainRenderPlan["realization"]["warnings"] {
  return warnings.filter((warning) =>
    warning.type !== "partial_tail_suffix_unresolved" &&
    warning.type !== "tail_boundary_attachment_weak"
  );
}

export function projectUnitPredicateConnectivePlan(
  unit: TranslationUnit,
  connective: {
    readonly connective: ConnectiveKind;
    readonly surface: string;
  },
  sourceOverride: OpSource | null = null,
): PredicateHeadTailChainRenderPlan | LemmaRealization | null {
  return projectUnitHeadTailConnectivePlan(unit, connective, sourceOverride) ??
    projectUnitLemmaConnectivePlan(unit, connective);
}

export function buildStructuralProjectionConnectiveOp(
  source: OpSource,
  projection: {
    readonly connective: ConnectiveKind;
    readonly surface: string;
    readonly quotativeMood?: "declarative" | "imperative";
  }
): ConnectiveOp {
  return createConnectiveOp({
    connective: projection.connective,
    surface: projection.surface,
    source,
    ...(projection.quotativeMood === undefined ? {} : { quotativeMood: projection.quotativeMood })
  });
}

function projectUnitLemmaConnectivePlan(
  unit: TranslationUnit,
  connective: {
    readonly connective: ConnectiveKind;
    readonly surface: string;
  },
): LemmaRealization | null {
  const plan = unit.renderPlan;
  if (plan?.kind !== "lemma") {
    return null;
  }
  if (connective.connective === "stative_hold") {
    return projectUnitLemmaStativeHoldPlan(plan);
  }
  if (connective.connective !== "sequence_immediate") {
    return null;
  }
  if (plan.koreanPos !== 동사 && plan.koreanPos !== 형용사) {
    return null;
  }
  if (plan.sfp !== undefined && plan.sfp !== null) {
    return null;
  }
  if (plan.suffix !== undefined) {
    return null;
  }
  return {
    ...plan,
    connective: "자",
    suffix: "마자",
    sfp: null,
  };
}

function projectUnitLemmaStativeHoldPlan(plan: LemmaRealization): LemmaRealization | null {
  if (plan.koreanPos !== 동사) {
    return null;
  }
  if (plan.sfp !== undefined && plan.sfp !== null) {
    return null;
  }
  if (plan.suffix !== undefined || (plan.negationChainDepth ?? 0) !== 0) {
    return null;
  }
  if (plan.auxTokens.length === 0 || !plan.auxTokens.every((token) => (token.pos & POS4) === 助動詞_タ)) {
    return null;
  }
  return {
    ...plan,
    auxTokens: [],
    connective: "ㄴ/은",
    suffix: " 채",
    sfp: null,
  };
}

function shouldProjectQuestionSfp(
  root: PredicateHeadTailChainRenderPlan["realization"]["root"],
  connective: { readonly connective: ConnectiveKind; readonly surface: string },
  source: OpSource,
): boolean {
  if (connective.connective !== "question_content" || root.sfp === null) {
    return false;
  }
  if (root.sfp.effect === "ka") {
    return opSourceCoveredBy(root.sfp.source, source);
  }
  if (root.sfp.effect === "kana") {
    return opSourceOverlaps(root.sfp.source, source);
  }
  return false;
}

function opSourceOverlaps(candidate: OpSource, other: OpSource): boolean {
  const otherIndices = new Set(other.tokenIndices);
  return candidate.tokenIndices.some((tokenIndex) => otherIndices.has(tokenIndex));
}

function isNominalizedQuestionSurface(surface: string): boolean {
  return surface.includes("の") || surface.includes("ん");
}

export function opSourceCoveredBy(candidate: OpSource, covering: OpSource): boolean {
  const coveringIndices = new Set(covering.tokenIndices);
  return candidate.tokenIndices.length > 0 && candidate.tokenIndices.every((tokenIndex) => coveringIndices.has(tokenIndex));
}

export function connectiveBoundaryForProjection(
  plan: PredicateHeadTailChainRenderPlan,
  connective: { readonly connective: ConnectiveKind; readonly surface: string },
  source: OpSource,
): PredicateHeadTailChainRenderPlan["clauseRole"]["outgoingBoundary"] {
  const sortedIndices = [...source.tokenIndices].sort((left, right) => left - right);
  const start = sortedIndices[0] ?? plan.clauseRole.tokenSpan.end;
  const end = sortedIndices[sortedIndices.length - 1] ?? start;
  return {
    kind: "接続助詞",
    connectiveKind: connective.connective,
    surface: connective.surface,
    tokenIdx: end,
    tokenSpan: { start, end },
  };
}

function replaceLastConnectiveOp(
  ops: readonly AuxLayerNode["ops"][number][],
  replacement: ConnectiveOp,
): readonly AuxLayerNode["ops"][number][] {
  const projected = [...ops];
  for (let index = projected.length - 1; index >= 0; index -= 1) {
    if (projected[index]?.kind === "connective") {
      projected[index] = replacement;
      return projected;
    }
  }
  return [...projected, replacement];
}
