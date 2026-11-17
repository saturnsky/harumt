import type { ClauseLayout } from "../../../../clause-layout/index.js";
import type {
  HeadedPlanCarrier,
  HeadedPlanLifecycleHook
} from "../../../lifecycle/hooks.js";
import { isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan } from "../../../../../types/render-plan.js";
import type { NominalHeadTailChainPlan } from "../../../lifecycle/head-tail-render-plan.js";
import type { NominalFramePredicateCommitContext } from "./grammar.js";

export function nominalParserHeadedPlanLifecycleHooks(): readonly HeadedPlanLifecycleHook[] {
  return [
    {
      id: "nominal_head_layout_context",
      owner: "nominal_head",
      contentOrder: 20,
      assemblyOrder: 10,
      description: "",
      runContent: (context) => attachNominalTailChainLayout(context.spans, context.layout),
      runAssembly: (context) => attachNominalTailChainLayout(context.units, context.layout)
    },
    {
      id: "nominal_head_predicate_evidence",
      owner: "nominal_head",
      contentOrder: 40,
      assemblyOrder: 20,
      description: "",
      runContent: (context) => attachNominalTailChainPredicateEvidence(context.contentMap, context.layout),
      runAssembly: (context) => attachNominalTailChainPredicateEvidenceFromOwners(
        context.units,
        context.ownerSpans,
        context.layout
      )
    }
  ];
}

export function attachNominalTailChainLayout(spans: Iterable<HeadedPlanCarrier>, layout: ClauseLayout): void {
  for (const plan of nominalTailChainPlans(spans)) {
    const commitContext = plan.realization.commitContext;
    if (commitContext === undefined) {
      continue;
    }
    plan.realization = {
      ...plan.realization,
      commitContext: { ...commitContext, layout }
    };
  }
}

function predicatelessSegmentFollowingPredicate(
  layout: ClauseLayout,
  tokens: NonNullable<NominalHeadTailChainPlan["realization"]["commitContext"]>["tokens"],
  markerIdx: number
): { readonly evidenceIdx: number; readonly ownerIdx: number } | undefined {
  const clause = layout.clauseOfToken(markerIdx);
  if (clause === undefined || clause.predicates.some((predicateIdx) => predicateIdx > markerIdx)) {
    return undefined;
  }
  const evidenceIdx = layout.followingPredicateEvidenceIndexAfter(tokens, markerIdx, { includeAuxiliary: false });
  if (evidenceIdx === null) {
    return undefined;
  }
  return { evidenceIdx, ownerIdx: predicateOutsideRelativeClauses(layout, evidenceIdx) };
}

function predicateOutsideRelativeClauses(layout: ClauseLayout, predicateIdx: number): number {
  let clauseIdx = layout.clauseIndexOfToken(predicateIdx);
  let climbed = false;
  for (
    let clause = layout.clauses[clauseIdx];
    clause !== undefined && clause.kind === "relative" && clause.parentIdx !== null;
    clause = layout.clauses[clauseIdx]
  ) {
    clauseIdx = clause.parentIdx;
    climbed = true;
  }
  return climbed ? layout.clauses[clauseIdx]?.predicates.at(-1) ?? predicateIdx : predicateIdx;
}

export function attachNominalTailChainPredicateEvidence(
  spans: ReadonlyMap<number, HeadedPlanCarrier>,
  layout: ClauseLayout
): void {
  attachNominalTailChainPredicateEvidenceFromOwners(spans.values(), spans, layout);
}

export function attachNominalTailChainPredicateEvidenceFromOwners(
  carriers: Iterable<HeadedPlanCarrier>,
  ownerSpans: ReadonlyMap<number, HeadedPlanCarrier>,
  layout: ClauseLayout
): void {
  for (const plan of nominalTailChainPlans(carriers)) {
    const commitContext = plan.realization.commitContext;
    if (commitContext === undefined) {
      continue;
    }
    const assignedOwnerIdx = layout.ownerPredicateOfParticle(plan.realization.markerTokenIdx);
    const resolved = assignedOwnerIdx === undefined
      ? predicatelessSegmentFollowingPredicate(layout, commitContext.tokens, plan.realization.markerTokenIdx)
      : {
        evidenceIdx: assignedOwnerIdx,
        ownerIdx: plan.realization.frame.focus === "は"
          ? predicateOutsideRelativeClauses(layout, assignedOwnerIdx)
          : assignedOwnerIdx
      };
    const evidencePredicate = resolved === undefined ? undefined : ownerSpans.get(resolved.evidenceIdx);
    if (resolved === undefined || evidencePredicate === undefined) {
      continue;
    }
    const topicClauseSpan = resolved.ownerIdx === resolved.evidenceIdx ? undefined : ownerSpans.get(resolved.ownerIdx);
    plan.realization = {
      ...plan.realization,
      commitContext: {
        ...commitContext,
        followingPredicate: {
          ...nominalPredicateCommitContext(resolved.evidenceIdx, evidencePredicate),
          ...(topicClauseSpan === undefined
            ? {}
            : { topicClause: nominalPredicateCommitContext(resolved.ownerIdx, topicClauseSpan) })
        }
      }
    };
  }
}

export function nominalPredicateCommitContext(
  tokenIndex: number,
  span: HeadedPlanCarrier
): NominalFramePredicateCommitContext {
  return {
    tokenIndex,
    voice: span.voice ?? null,
    connectiveRole: span.connectiveRole ?? null,
    ...(span.hasNegative === undefined ? {} : { hasNegative: span.hasNegative }),
    ...(span.hasCausative === undefined ? {} : { hasCausative: span.hasCausative }),
    ...(span.hasCausativePassive === undefined ? {} : { hasCausativePassive: span.hasCausativePassive }),
    ...(span.hasRequestTail === undefined ? {} : { hasRequestTail: span.hasRequestTail }),
    ...(span.hasBenefactiveTail === undefined ? {} : { hasBenefactiveTail: span.hasBenefactiveTail }),
    ...(span.provenance === undefined ? {} : { provenance: span.provenance }),
    renderPlanKind: span.renderPlan?.kind ?? null,
    sourcePredicateShape: ownerPredicateSourceShape(span)
  };
}

function ownerPredicateSourceShape(span: HeadedPlanCarrier): string | null {
  const plan = span.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return null;
  }
  const tail = plan.realization.root.tail;
  const layer = tail.kind === "auxLayer" ? tail : tail.inner;
  return layer.stem.sourcePredicateShape ?? null;
}

function nominalTailChainPlans(spans: Iterable<HeadedPlanCarrier>): NominalHeadTailChainPlan[] {
  const plans: NominalHeadTailChainPlan[] = [];
  for (const span of spans) {
    const plan = span.renderPlan;
    if (isNominalHeadTailChainRenderPlan(plan)) {
      plans.push(plan);
    }
  }
  return plans;
}
