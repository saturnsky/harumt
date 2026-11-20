import { nominalParserHeadedPlanLifecycleHooks } from "../head/adapters/nominal/plan-lifecycle.js";
import { tailParserHeadedPlanLifecycleHooks } from "../tail/predicate-root/plan-lifecycle.js";
import {
  attachHeadedAssemblyUnitPlanLifecycle,
  createCommitmentDecisionLifecycleHook,
  runHeadedContentPlanLifecycle,
  type HeadedPlanCarrier,
  type HeadedPlanLifecycleHook
} from "./hooks.js";
import type { ClauseLayout } from "../../clause-layout/final-layout.js";
import type { CommitmentSpan } from "../../commitment/types.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { LookupTables } from "../../lookup-tables.js";
import type { NumericTables } from "../../../generator/numeric-lookup.js";
import type { TraceCollector } from "../../trace.js";

const REGISTERED_HEADED_PLAN_LIFECYCLE_HOOKS: readonly HeadedPlanLifecycleHook[] = Object.freeze([
  ...tailParserHeadedPlanLifecycleHooks(),
  ...nominalParserHeadedPlanLifecycleHooks(),
  createCommitmentDecisionLifecycleHook()
]);

export function runRegisteredHeadedContentPlanLifecycle(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly contentMap: ReadonlyMap<number, CommitmentSpan>;
  readonly layout: ClauseLayout;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly trace?: TraceCollector | null;
}): void {
  runHeadedContentPlanLifecycle({
    ...options,
    hooks: REGISTERED_HEADED_PLAN_LIFECYCLE_HOOKS
  });
}

export function attachRegisteredHeadedAssemblyUnitPlanLifecycle(options: {
  readonly units: Iterable<HeadedPlanCarrier>;
  readonly ownerSpans: ReadonlyMap<number, HeadedPlanCarrier>;
  readonly layout: ClauseLayout;
  readonly tokens: readonly RuntimeHaruToken[];
}): void {
  attachHeadedAssemblyUnitPlanLifecycle({
    ...options,
    hooks: REGISTERED_HEADED_PLAN_LIFECYCLE_HOOKS
  });
}
