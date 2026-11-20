import type { RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { POS0, 終助詞, 補助記号 } from "../../types/pos.js";
import { isSfpSkipSurface, sfpNodeYieldsToAuthoredQuestion, trailingSfpEffectAfterFirst } from "../semantics/grammar-runtime.js";
import { kaMarkerRelationAt } from "../head-tail/boundary/marker.js";
import type { SfpEffect, SfpNode, TailRoot } from "../head-tail/tail/predicate-root/grammar.js";
import { auxOpCarriesCommandIllocution, auxOpsInTailNode } from "../head-tail/tail/predicate-root/inspect.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import { hasHardTerminalPunctuationClass } from "../head-tail/boundary/punctuation.js";

function assemblerKaMarkerRelationAt(tokens: readonly RuntimeHaruToken[], index: number) {
  return kaMarkerRelationAt(tokens, index, ["assembler"]);
}

export function isAssemblerTerminalQuestionKa(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  return assemblerKaMarkerRelationAt(tokens, index)?.particleSubtype1 === 終助詞;
}

function bareQuestionPunctuationIndex(tokens: readonly RuntimeHaruToken[], start: number, end: number): number | null {
  const index = nextNonSpaceIndex(tokens, start, end) ?? end;
  const token = tokens[index];
  if (token === undefined || (token.pos & POS0) !== 補助記号) {
    return null;
  }
  return hasHardTerminalPunctuationClass(token, index, ["question"], ["assembler"]) ? index : null;
}

function plainQuestionSfpNode(token: RuntimeHaruToken, tokenIdx: number): SfpNode {
  return {
    effect: "plain_q",
    surface: token.surface,
    consumed: 1,
    repeatCount: 1,
    source: {
      tokens: [token],
      tokenIndices: [tokenIdx]
    }
  };
}

export function applyBareQuestionRenderPlan(
  plan: RenderPlan | null,
  tokens: readonly RuntimeHaruToken[],
  afterContent: number,
  end: number
): RenderPlan | null {
  return plan === null ? null : applyBareQuestionToRenderPlan(plan, tokens, afterContent, end);
}

export function applyBareQuestionToRenderPlan(
  plan: RenderPlan,
  tokens: readonly RuntimeHaruToken[],
  afterContent: number,
  end: number
): RenderPlan {
  const questionIdx = bareQuestionPunctuationIndex(tokens, afterContent, end);
  if (questionIdx === null) {
    return plan;
  }
  const questionToken = tokens[questionIdx];
  if (questionToken === undefined) {
    return plan;
  }
  if (plan.kind === "lemma" || plan.kind === "copulaPredicate") {
    if (plan.sfp === undefined || plan.sfp === null) {
      return { ...plan, sfp: "plain_q" };
    }
    const node = plan.terminalSfp ?? null;
    const yielded = node === null ? null : authoredQuestionYieldEffect(node, tokens, (plan.auxTokens?.length ?? 0) > 0);
    return yielded === null ? plan : { ...plan, sfp: yielded, terminalSfp: { ...node!, effect: yielded } };
  }
  if (plan.kind === "noda") {
    return plan.sfp === undefined || plan.sfp === null ? { ...plan, sfp: "plain_q" } : plan;
  }
  if (plan.kind === "headTailChain" && plan.realization.kind === "predicate") {
    const root = plan.realization.root;
    const existing = root.sfp;
    if (existing !== null && !terminalSkipSfpYieldsToAuthoredQuestion(existing, root)) {
      return plan;
    }
    const trailingEffect = existing === null || existing.effect === null
      ? null
      : authoredQuestionYieldEffect(existing, tokens, auxOpsInTailNode(root.tail).length > 0);
    if (existing !== null && trailingEffect !== null && trailingEffect !== "plain_q") {
      return {
        ...plan,
        realization: { ...plan.realization, root: { ...root, sfp: { ...existing, effect: trailingEffect } } }
      };
    }
    if (!canInjectPlainQuestionIntoTailRoot(root)) {
      return plan;
    }
    return {
      ...plan,
      realization: {
        ...plan.realization,
        root: {
          ...root,
          sfp: existing === null
            ? plainQuestionSfpNode(questionToken, questionIdx)
            : { ...existing, effect: "plain_q" }
        }
      }
    };
  }
  return plan;
}

function authoredQuestionYieldEffect(
  node: NonNullable<TailRoot["sfp"]>,
  tokens: readonly RuntimeHaruToken[],
  hasAux: boolean
): SfpEffect | null {
  if (!sfpNodeYieldsToAuthoredQuestion(node)) {
    return null;
  }
  const hostToken = tokens[(node.source.tokenIndices[0] ?? 0) - 1];
  return trailingSfpEffectAfterFirst(node, (hostToken?.pos ?? 0) & POS0, hasAux) ?? "plain_q";
}

function terminalSkipSfpYieldsToAuthoredQuestion(
  sfp: NonNullable<TailRoot["sfp"]>,
  root: TailRoot
): boolean {
  const yieldingEffect = sfp.effect === null
    ? isSfpSkipSurface(sfp.surface) || sfpNodeYieldsToAuthoredQuestion(sfp)
    : sfpNodeYieldsToAuthoredQuestion(sfp);
  return yieldingEffect &&
    sfp.quoteProjection === undefined &&
    sfp.questionRole === undefined &&
    sfp.questionRealizationEffect === undefined &&
    !auxOpsInTailNode(root.tail).some(auxOpCarriesCommandIllocution);
}

function canInjectPlainQuestionIntoTailRoot(root: TailRoot): boolean {
  const tail = root.tail;
  if (tail.kind !== "auxLayer" || tail.terminal !== null) {
    return false;
  }
  if (tail.ops.some((op) => op.kind === "copula" && op.variant === "conjecture")) {
    return false;
  }
  if (tail.ops.some((op) => op.kind === "connective")) {
    return false;
  }
  if (tail.stem.kind === "noun" && tail.ops.some((op) => op.kind === "conjecture")) {
    return false;
  }
  return true;
}
