import type { ClauseLayout } from "../../clause-layout/index.js";
import {
  commitDecisions,
  type CommitmentSpan
} from "../../deferred-commitment.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { RenderPlan } from "../../../types/render-plan.js";
import type { LookupTables } from "../../lookup-tables.js";
import type { NumericTables } from "../../../generator/numeric-lookup.js";
import { buildSourcePredicateOperatorEvidenceGraph } from "../../structural-relation/source-predicate-operator.js";
import type { StructuralRelationGraph } from "../../structural-relation/types.js";
import type { TraceCollector } from "../../trace.js";

export interface HeadedPlanCarrier {
  readonly renderPlan?: RenderPlan | null;
  readonly voice?: string | null;
  readonly connectiveRole?: string | null;
  readonly hasNegative?: boolean;
  readonly hasCausative?: boolean;
  readonly hasCausativePassive?: boolean;
  readonly hasRequestTail?: boolean;
  readonly hasBenefactiveTail?: boolean;
  readonly provenance?: string | null;
}

export type HeadedPlanLifecycleHookOwner =
  | "shared"
  | "nominal_head"
  | "predicate_tail"
  | "assembler";

export interface HeadedPlanLifecycleHookDescriptor {
  readonly id: string;
  readonly owner: HeadedPlanLifecycleHookOwner;
  readonly contentOrder?: number;
  readonly assemblyOrder?: number;
  readonly description: string;
}

export interface HeadedContentPlanLifecycleContext {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly contentMap: ReadonlyMap<number, CommitmentSpan>;
  readonly spans: readonly CommitmentSpan[];
  readonly layout: ClauseLayout;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly sourcePredicateOperatorGraph: StructuralRelationGraph;
  readonly trace?: TraceCollector | null;
}

export interface HeadedAssemblyPlanLifecycleContext {
  readonly units: readonly HeadedPlanCarrier[];
  readonly ownerSpans: ReadonlyMap<number, HeadedPlanCarrier>;
  readonly layout: ClauseLayout;
  readonly tokens: readonly RuntimeHaruToken[];
}

export interface HeadedPlanLifecycleHook extends HeadedPlanLifecycleHookDescriptor {
  readonly runContent?: (context: HeadedContentPlanLifecycleContext) => void;
  readonly runAssembly?: (context: HeadedAssemblyPlanLifecycleContext) => void;
}

export function runHeadedContentPlanLifecycle(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly contentMap: ReadonlyMap<number, CommitmentSpan>;
  readonly layout: ClauseLayout;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly hooks: Iterable<HeadedPlanLifecycleHook>;
  readonly trace?: TraceCollector | null;
}): void {
  const spans = [...options.contentMap.values()];
  const sourcePredicateOperatorGraph = buildSourcePredicateOperatorEvidenceGraph({
    tokens: options.tokens,
    layout: options.layout,
    contentMap: options.contentMap,
    lookups: options.lookups
  });
  const context: HeadedContentPlanLifecycleContext = {
    tokens: options.tokens,
    contentMap: options.contentMap,
    spans,
    layout: options.layout,
    lookups: options.lookups,
    numeric: options.numeric,
    sourcePredicateOperatorGraph,
    trace: options.trace ?? null
  };
  for (const hook of orderedLifecycleHooks(options.hooks, "content")) {
    hook.runContent?.(context);
  }
}

export function attachHeadedAssemblyUnitPlanLifecycle(options: {
  readonly units: Iterable<HeadedPlanCarrier>;
  readonly ownerSpans: ReadonlyMap<number, HeadedPlanCarrier>;
  readonly layout: ClauseLayout;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly hooks: Iterable<HeadedPlanLifecycleHook>;
}): void {
  const units = [...options.units];
  const context: HeadedAssemblyPlanLifecycleContext = {
    units,
    ownerSpans: options.ownerSpans,
    layout: options.layout,
    tokens: options.tokens
  };
  for (const hook of orderedLifecycleHooks(options.hooks, "assembly")) {
    hook.runAssembly?.(context);
  }
}

export function createCommitmentDecisionLifecycleHook(): HeadedPlanLifecycleHook {
  return {
    id: "shared_commitment_decisions",
    owner: "shared",
    contentOrder: 30,
    description: "",
    runContent: (context) => {
      commitHeadedContentDecisions(
        context.tokens,
        context.contentMap,
        context.layout,
        context.lookups,
        context.numeric,
        context.sourcePredicateOperatorGraph,
        context.trace
      );
    }
  };
}

export function describeHeadedPlanLifecycleHooks(
  hooks: Iterable<HeadedPlanLifecycleHook>
): readonly HeadedPlanLifecycleHookDescriptor[] {
  return [...hooks].map(({ id, owner, contentOrder, assemblyOrder, description }) => ({
    id,
    owner,
    ...(contentOrder === undefined ? {} : { contentOrder }),
    ...(assemblyOrder === undefined ? {} : { assemblyOrder }),
    description
  }));
}

function commitHeadedContentDecisions(
  tokens: readonly RuntimeHaruToken[],
  contentMap: ReadonlyMap<number, CommitmentSpan>,
  layout: ClauseLayout,
  lookups: LookupTables,
  numeric: NumericTables,
  sourcePredicateOperatorGraph: StructuralRelationGraph,
  trace: TraceCollector | null = null
): void {
  const commitmentMap = new Map<number, CommitmentSpan>();
  for (const [index, span] of contentMap) {
    commitmentMap.set(index, span);
  }
  commitDecisions(tokens, commitmentMap, { layout, lookups, numeric, sourcePredicateOperatorGraph, trace });
}

function orderedLifecycleHooks(
  hooks: Iterable<HeadedPlanLifecycleHook>,
  phase: "content" | "assembly"
): readonly HeadedPlanLifecycleHook[] {
  const orderKey = phase === "content" ? "contentOrder" : "assemblyOrder";
  const runKey = phase === "content" ? "runContent" : "runAssembly";
  const ordered = [...hooks].filter((hook) => hook[orderKey] !== undefined);
  const seenOrders = new Map<number, string>();
  for (const hook of ordered) {
    const order = hook[orderKey]!;
    if (seenOrders.has(order)) {
      throw new Error(
        `Duplicate headed plan lifecycle ${phase} order ${order}: ${seenOrders.get(order)} and ${hook.id}`
      );
    }
    if (hook[runKey] === undefined) {
      throw new Error(`Headed plan lifecycle hook ${hook.id} declares ${phase} order without ${runKey}.`);
    }
    seenOrders.set(order, hook.id);
  }
  ordered.sort((left, right) => left[orderKey]! - right[orderKey]!);
  return ordered;
}
