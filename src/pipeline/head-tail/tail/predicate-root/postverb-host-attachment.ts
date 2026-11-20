import type { RuntimeHaruToken } from "../../../../types/token.js";
import { isNominalCopulaHostPos } from "./integration/readiness.js";
import { copulaNiMarkerRelationForToken } from "../../boundary/marker.js";
import type { AuxOpNode, PostverbHostAttachForm, ConnectiveOp, StemNode, TailRoot } from "./grammar.js";
import { isNaiOrNuToken } from "./classifiers/tokens.js";
import { chainFinalOpHostCategory, firstAuxLayer, stemHasSahenSourcePredicate } from "./inspect.js";
import { POS5A, isNaAdjCapable, isIAdjectivePredicateToken, isVerbPredicateToken, 語幹_, isRenyouInflectedToken, isPureNaAdjStem } from "../../../../types/pos.js";
import type { DerivationalSuffixHostCategory } from "./derivational-suffix-table.js";

function chainFinalHostAttachToken(
  stem: StemNode,
  ops: readonly AuxOpNode[]
): RuntimeHaruToken | undefined {
  const source = ops.at(-1)?.source ?? stem.source;
  return source.tokens.at(-1);
}

export function hostChainAttachesAsRenyou(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined && isRenyouInflectedToken(attach);
}

function chainClosesWithCategory(
  stem: StemNode,
  ops: readonly AuxOpNode[],
  category: DerivationalSuffixHostCategory,
  tokenIsCategory: (token: RuntimeHaruToken) => boolean
): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  if (attach === undefined) {
    return false;
  }
  const lastOp = ops.at(-1);
  const declared = lastOp === undefined ? undefined : chainFinalOpHostCategory(lastOp);
  return declared === undefined ? tokenIsCategory(attach) : declared === category;
}

export function hostChainAttachesAsVerbalRenyou(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  return hostChainAttachesAsRenyou(stem, ops) &&
    chainClosesWithCategory(stem, ops, "verbal_predicate", isVerbPredicateToken);
}

export function hostChainAttachesAsAdjectivalRenyou(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined &&
    isRenyouInflectedToken(attach) &&
    !isNaiOrNuToken(attach) &&
    chainClosesWithCategory(stem, ops, "adjectival_predicate", isIAdjectivePredicateToken);
}

export function hostChainAttachesAsNegativeRenyou(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined && isRenyouInflectedToken(attach) && isNaiOrNuToken(attach);
}

function hostChainAttachesAsCopulaNi(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const lastOp = ops.at(-1);
  if (lastOp?.kind === "copula") {
    return lastOp.basicForm === "adverbial_ni";
  }
  return copulaNiMarkerRelationForToken(chainFinalHostAttachToken(stem, ops), 0, {
    consumers: ["tail_boundary_readiness"]
  }) !== null;
}

function hostChainAttachesAsAdjectiveStem(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined &&
    (attach.pos & POS5A) === 語幹_ &&
    chainClosesWithCategory(stem, ops, "adjectival_predicate", isIAdjectivePredicateToken);
}

export function hostChainAttachesAsNominalCopulaStem(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  if (ops.length !== 0) {
    return false;
  }
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined && (isNominalCopulaHostPos(attach.pos) || isPureNaAdjStem(attach));
}

function hostChainAttachesAsNaStem(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined && isNaAdjCapable(attach);
}

function hostChainAttachesAsSahenStem(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  if (ops.length !== 0 || !stemHasSahenSourcePredicate(stem)) {
    return false;
  }
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined && isRenyouInflectedToken(attach);
}

export function hostChainAttachesForPostverbAuxiliary(
  stem: StemNode,
  ops: readonly AuxOpNode[],
  attachForms: readonly PostverbHostAttachForm[]
): boolean {
  return attachForms.some((form) => {
    switch (form) {
      case "te_form":
        return ops.at(-1)?.kind === "connective" && (ops.at(-1) as ConnectiveOp).connective === "te_form";
      case "verb_renyou":
        return hostChainAttachesAsVerbalRenyou(stem, ops);
      case "adjectival_renyou":
        return hostChainAttachesAsAdjectivalRenyou(stem, ops);
      case "negative_renyou":
        return hostChainAttachesAsNegativeRenyou(stem, ops);
      case "copula_ni":
        return hostChainAttachesAsCopulaNi(stem, ops);
      case "adjective_stem":
        return hostChainAttachesAsAdjectiveStem(stem, ops);
      case "na_stem":
        return hostChainAttachesAsNaStem(stem, ops);
      case "sahen_stem":
        return hostChainAttachesAsSahenStem(stem, ops);
    }
  });
}

export function tailRootHostLayerGovernsCopulaNiComplement(root: TailRoot): boolean {
  const layer = firstAuxLayer(root.tail);
  if (layer === null) {
    return false;
  }
  const ops = layer.ops;
  return ops.some((op, index) => {
    const next = ops[index + 1];
    return op.kind === "copula" &&
      next?.kind === "postverbAuxiliary" &&
      hostChainAttachesForPostverbAuxiliary(
        layer.stem,
        ops.slice(0, index + 1),
        (next.auxiliary.requiredHostForms ?? []).filter((form) => form === "copula_ni")
      );
  });
}
