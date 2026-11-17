import { 동사, 형용사 } from "../../types/pos.js";
import type { StemDerivation, StemDerivationHost, StemDerivationOp } from "../../types/render-plan.js";
import { irregularType } from "../../generator/conjugator.js";
import type { KoreanLemmaPredicateBase } from "../head-tail/tail/predicate-root/renderers/base-model.js";
import { stateChangeBase } from "../head-tail/tail/predicate-root/renderers/predicate-bases.js";
import { longNegativeLemma } from "./negative-polish.js";

function applyStemDerivationOp(host: StemDerivationHost, op: StemDerivationOp): StemDerivationHost | null {
  if (op === "state_change") {
    if (host.koreanPos !== 형용사 && host.koreanPos !== 동사) {
      return null;
    }
    const inputBase: KoreanLemmaPredicateBase = {
      prefix: "",
      final: {
        kind: "lemma",
        lemma: host.koreanLemma,
        irregular: irregularType(host.irregular),
        isVerb: host.koreanPos === 동사
      }
    };
    let changed: KoreanLemmaPredicateBase;
    try {
      changed = stateChangeBase(inputBase, "adjectival");
    } catch {
      return null;
    }
    if (changed.prefix.length === 0) {
      return null;
    }
    return {
      koreanLemma: `${changed.prefix}${changed.final.lemma}`,
      irregular: null,
      koreanPos: 동사
    };
  }
  const longNegative = longNegativeLemma(host.koreanLemma, host.irregular);
  if (longNegative === null) {
    return null;
  }
  return { koreanLemma: longNegative, irregular: null, koreanPos: 형용사 };
}

export function deriveStem(
  host: StemDerivationHost,
  ops: readonly StemDerivationOp[]
): StemDerivationHost | null {
  let current: StemDerivationHost = host;
  for (const op of ops) {
    const next = applyStemDerivationOp(current, op);
    if (next === null) {
      return null;
    }
    current = next;
  }
  return current;
}

export function verifiedStemDerivation(
  foldedLemma: string,
  host: StemDerivationHost,
  ops: readonly StemDerivationOp[]
): StemDerivation | null {
  if (ops.length === 0) {
    return null;
  }
  const derived = deriveStem(host, ops);
  if (derived === null || derived.koreanLemma !== foldedLemma) {
    return null;
  }
  return { ops, host };
}

function dropFirstOp(
  ops: readonly StemDerivationOp[],
  op: StemDerivationOp
): readonly StemDerivationOp[] {
  const index = ops.indexOf(op);
  return index < 0 ? ops : [...ops.slice(0, index), ...ops.slice(index + 1)];
}

export function rederiveStemDerivation(
  derivation: StemDerivation,
  incoming: StemDerivationHost,
  options: { readonly dropLongNegativeOp?: boolean } = {}
): { readonly stem: StemDerivationHost; readonly derivation?: StemDerivation } | null {
  const current = deriveStem(derivation.host, derivation.ops);
  if (current === null) {
    return null;
  }
  const host = current.koreanLemma === incoming.koreanLemma ? derivation.host : incoming;
  const ops = options.dropLongNegativeOp === true
    ? dropFirstOp(derivation.ops, "long_negative")
    : derivation.ops;
  if (ops.length === 0) {
    return { stem: host };
  }
  const rederived = deriveStem(host, ops);
  if (rederived === null) {
    return null;
  }
  return { stem: rederived, derivation: { ops, host } };
}
