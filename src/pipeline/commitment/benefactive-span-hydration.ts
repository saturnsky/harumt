import type { PredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import { hasClauseRole, isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import type { LookupTables } from "../lookup-tables.js";
import { hydrateBenefactivePayloads } from "../head-tail/tail/predicate-root/benefactive-hydration.js";
import { tailRootBenefactiveContext } from "../head-tail/tail/predicate-root/span-metadata.js";
import { TraceEvent, type TraceCollector } from "../trace.js";
import type { CommitmentContentMap, CommitmentToken } from "./types.js";
import { contentEntries, runtimeTokens, withTraceClauseIdx } from "./span-evidence.js";

export function hydrateBenefactiveCommitmentSpans(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  trace: TraceCollector | null,
  lookups: LookupTables
): void {
  const runtime = runtimeTokens(tokens);
  for (const [idx, span] of contentEntries(contentMap)) {
    const plan = span.renderPlan ?? null;
    if (!isPredicateHeadTailChainRenderPlan(plan) || !hasClauseRole(plan)) {
      continue;
    }
    const predicateTokenIdx = benefactiveHydrationPredicateIdxForPlan(plan, layout);
    const hydratedRoot = hydrateBenefactivePayloads(plan.realization.root, {
      tokens: plan.realization.sourceTokens ?? runtime,
      predicateTokenIdx,
      lookups,
      layout
    });
    if (hydratedRoot === plan.realization.root) {
      continue;
    }
    span.renderPlan = {
      ...plan,
      clauseRole: { ...plan.clauseRole, layout },
      realization: {
        ...plan.realization,
        root: hydratedRoot,
        sourceTokens: plan.realization.sourceTokens ?? runtime
      }
    };
    span.benefactive = tailRootBenefactiveContext(hydratedRoot) ?? span.benefactive ?? null;
    if (trace !== null) {
      trace.record(new TraceEvent(
        idx,
        "commitment",
        "benefactive_layout_hydration",
        true,
        withTraceClauseIdx({
          agent_particle_idx: span.benefactive?.agentParticleIdx ?? null,
          recipient_particle_idx: span.benefactive?.recipientParticleIdx ?? null,
          honorific_level: span.benefactive?.honorificLevel ?? null
        }, layout.clauseIndexOfPredicate(idx))
      ));
    }
  }
}

function benefactiveHydrationPredicateIdxForPlan(
  plan: PredicateHeadTailChainRenderPlan,
  layout: ClauseLayout
): number {
  if (layout.clauseOfPredicate(plan.clauseRole.predicateTokenIdx) !== undefined) {
    return plan.clauseRole.predicateTokenIdx;
  }
  return layout.clauseOfPredicate(plan.clauseRole.contentSpan.start) !== undefined
    ? plan.clauseRole.contentSpan.start
    : plan.clauseRole.predicateTokenIdx;
}
