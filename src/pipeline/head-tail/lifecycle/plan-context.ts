import { clauseSentenceOrdinals, type ClauseLayout } from "../../clause-layout/index.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import { warningDedupKey, type Warning } from "../../../types/warning.js";
import type { ClauseTailIR } from "../tail/predicate-root/commit.js";
import type {
  HeadTailChainRenderPlan,
  HeadTailClauseRole,
  PredicateHeadTailChainRenderPlan
} from "./head-tail-render-plan.js";
import type { LookupTables } from "../../lookup-tables.js";
import type { NumericTables } from "../../../generator/numeric-lookup.js";
import { commitSharedTailParserChain } from "./render.js";

export type ClauseRoleBearingPlan = HeadTailChainRenderPlan & { clauseRole: HeadTailClauseRole };

export function attachTailChainRenderPlanLayout(
  plans: readonly ClauseRoleBearingPlan[],
  layout: ClauseLayout
): void {
  for (const plan of plans) {
    plan.clauseRole = { ...plan.clauseRole, layout };
  }
}

export function finalizeTailChainRenderPlanWarnings(
  plans: readonly PredicateHeadTailChainRenderPlan[],
  lookups: LookupTables,
  numeric: NumericTables
): void {
  for (const plan of plans) {
    plan.realization = {
      ...plan.realization,
      warnings: collectTailChainCommittedWarnings(plan, lookups, numeric)
    };
  }
}

export function hydrateTailChainRenderPlanPeerClauses(
  plans: readonly ClauseRoleBearingPlan[],
  layout: ClauseLayout,
  tokens: readonly RuntimeHaruToken[]
): void {
  const sentenceOrdinals = clauseSentenceOrdinals(layout, tokens);
  const groups = new Map<number, { plan: ClauseRoleBearingPlan; clauseIdx: number }[]>();
  const orphans: ClauseRoleBearingPlan[] = [];
  for (const plan of plans) {
    const clauseIdx = layout.clauseIndexOfToken(plan.clauseRole.predicateTokenIdx);
    const sentence = clauseIdx < 0 ? undefined : sentenceOrdinals[clauseIdx];
    if (clauseIdx < 0 || sentence === undefined) {
      orphans.push(plan);
      continue;
    }
    const group = groups.get(sentence) ?? [];
    group.push({ plan, clauseIdx });
    groups.set(sentence, group);
  }
  for (const group of groups.values()) {
    group.sort((a, b) =>
      a.clauseIdx - b.clauseIdx || a.plan.clauseRole.tokenSpan.start - b.plan.clauseRole.tokenSpan.start
    );
    const peerClauses: ClauseTailIR[] = group.map(({ plan, clauseIdx }) => ({
      root: plan.realization.root,
      clauseIndex: clauseIdx,
      tokenSpan: plan.clauseRole.tokenSpan,
      contentSpan: plan.clauseRole.contentSpan,
      predicateTokenIdx: plan.clauseRole.predicateTokenIdx,
      outgoingBoundary: plan.clauseRole.outgoingBoundary
    }));
    for (const { plan, clauseIdx } of group) {
      plan.clauseRole = { ...plan.clauseRole, clauseIndex: clauseIdx, peerClauses };
    }
  }
  for (const plan of orphans) {
    const own: ClauseTailIR = {
      root: plan.realization.root,
      clauseIndex: 0,
      tokenSpan: plan.clauseRole.tokenSpan,
      contentSpan: plan.clauseRole.contentSpan,
      predicateTokenIdx: plan.clauseRole.predicateTokenIdx,
      outgoingBoundary: plan.clauseRole.outgoingBoundary
    };
    plan.clauseRole = { ...plan.clauseRole, clauseIndex: 0, peerClauses: [own] };
  }
}

function collectTailChainCommittedWarnings(
  plan: PredicateHeadTailChainRenderPlan,
  lookups: LookupTables,
  numeric: NumericTables
): readonly Warning[] {
  const warnings: Warning[] = [
    ...plan.realization.warnings.filter((warning) => !isCommitPhaseCandidateWarning(warning))
  ];
  for (const formal of [false, true] as const) {
    try {
      const committed = commitSharedTailParserChain({ plan, formal, lookups, numeric });
      if ("ok" in committed) {
        continue;
      }
      warnings.push(...committed.warnings);
    } catch {
      continue;
    }
  }
  return mergeWarnings(warnings);
}

function isCommitPhaseCandidateWarning(warning: Warning): boolean {
  return warning.type === "ambiguity_default" &&
    (
      warning.opKind === "stem_polysemy" ||
      warning.opKind === "voice_reading" ||
      warning.opKind === "tokoro_reading" ||
      warning.opKind === "souda_reading"
    );
}

function mergeWarnings(warnings: readonly Warning[]): readonly Warning[] {
  const seen = new Set<string>();
  const result: Warning[] = [];
  for (const warning of warnings) {
    const key = warningDedupKey(warning);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(warning);
  }
  return result;
}
