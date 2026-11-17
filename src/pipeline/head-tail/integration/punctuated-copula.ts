import type { RuntimeHaruToken, SourceTokenSpan } from "../../../types/token.js";
import type { RenderPlan } from "../../../types/render-plan.js";
import type { LookupTables } from "../../lookup-tables.js";
import type { TailRoot } from "../tail/predicate-root/grammar.js";
import type {
  PredicateHeadTailChainHostHeadLexical,
  PredicateHeadTailChainHostSequencePart,
  PredicateHeadTailChainRenderPlan
} from "../lifecycle/head-tail-render-plan.js";
import type { PunctuatedCopulaHostBinding } from "../../clause-layout/punctuated-copula.js";
import { copulaChainOutgoingBoundary } from "./particle-phrase-copula.js";
import { tryBuildCopulaHostChain } from "./copula-host-chain.js";

export interface PunctuatedCopulaChain {
  readonly consumed: number;
  readonly plan: PredicateHeadTailChainRenderPlan;
  readonly root: TailRoot;
  readonly familyId: string;
}

export interface PunctuatedCopulaChainInput {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly limit: number;
  readonly binding: PunctuatedCopulaHostBinding;
  readonly hostSpan: { readonly start: number; readonly endExclusive: number };
  readonly hostParts: readonly PredicateHeadTailChainHostSequencePart[];
  readonly hostHeadLexical?: PredicateHeadTailChainHostHeadLexical;
  readonly lookups: LookupTables;
}

export function punctuatedCopulaHostHeadLexical(
  plan: RenderPlan | null,
  sourceSpan: SourceTokenSpan | null
): PredicateHeadTailChainHostHeadLexical | null {
  if (plan === null || plan.kind !== "lemma") {
    return null;
  }
  if (
    plan.auxTokens.length > 0 ||
    plan.prefix !== undefined ||
    plan.suffix !== undefined ||
    (plan.sfp ?? null) !== null ||
    (plan.terminalSfp ?? null) !== null ||
    (plan.connective ?? null) !== null ||
    (plan.negationChainDepth ?? 0) > 0 ||
    plan.isImperative === true ||
    (plan.voice !== undefined && plan.voice !== "active")
  ) {
    return null;
  }
  return {
    koreanLemma: plan.koreanLemma,
    koreanPos: plan.koreanPos,
    irregular: plan.irregular,
    sourceSpan
  };
}

export function tryBuildPunctuatedCopulaChain(
  input: PunctuatedCopulaChainInput
): PunctuatedCopulaChain | null {
  const { tokens, binding } = input;
  const stemSpan = { start: input.hostSpan.start, endExclusive: binding.decorationSpan.endExclusive };
  const chain = tryBuildCopulaHostChain({
    tokens,
    limit: input.limit,
    copulaStart: binding.copulaStart,
    chainEndExclusive: binding.chainEndExclusive,
    stemSpan,
    hostHeadIdx: binding.hostHeadIdx,
    sourcePredicateShape: "nominal",
    syntheticReason: `synthetic_punctuated_copula_stem:${binding.hostKind}:${binding.hostHeadIdx}`,
    lookups: input.lookups
  });
  if (chain === null) {
    return null;
  }
  return {
    consumed: chain.consumed,
    root: chain.root,
    familyId: chain.familyId,
    plan: {
      kind: "headTailChain",
      clauseRole: {
        clauseIndex: binding.clauseIndex < 0 ? 0 : binding.clauseIndex,
        tokenSpan: { start: input.hostSpan.start, end: chain.contentEnd },
        contentSpan: { start: input.hostSpan.start, end: chain.contentEnd },
        predicateTokenIdx: binding.hostHeadIdx,
        outgoingBoundary: copulaChainOutgoingBoundary(chain.layer.ops, binding.clauseBoundaryKind)
      },
      realization: {
        kind: "predicate",
        root: chain.root,
        hostProjection: {
          kind: "render_plan_sequence",
          parts: input.hostParts,
          ...(input.hostHeadLexical === undefined ? {} : { hostHeadLexical: input.hostHeadLexical }),
          expectedShape: "nominal",
          hostSourceShape: binding.sourcePredicateShape
        },
        sourceTokens: tokens,
        warnings: []
      }
    }
  };
}
