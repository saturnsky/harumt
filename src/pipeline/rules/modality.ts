import { type DataLoader } from "../../data-loader.js";
import type { RuleResult as PipelineRuleResult } from "../../types/pipeline.js";
import { ContentCtx, RuleResult, RuleTraceEvent } from "../content-types.js";
import { initModalitySpecs } from "../semantics/modality-specs.js";
import type { LookupTables } from "../lookup-tables.js";
export { parseModalitySpecTablesText } from "../semantics/modality-specs.js";

export async function initModality(loader: DataLoader): Promise<void> {
  await initModalitySpecs(loader);
}

export interface ModalityResolver {
  readonly lookups: LookupTables;
  _resolveYoudaCase?(ctx: ContentCtx, options?: { readonly isPotential?: boolean }): PipelineRuleResult | null;
  _resolveAdverbialAdjectiveCase?(ctx: ContentCtx): PipelineRuleResult | null | Promise<PipelineRuleResult | null>;
}

export function ruleYouda(resolver: ModalityResolver, ctx: ContentCtx, isPotential: boolean): RuleResult | null {
  if (typeof resolver._resolveYoudaCase !== "function") {
    return null;
  }
  return normalizeRuleResult(resolver._resolveYoudaCase(ctx, { isPotential }));
}

export async function ruleAdverbialAdjective(resolver: ModalityResolver, ctx: ContentCtx, _isPotential: boolean): Promise<RuleResult | null> {
  void _isPotential;
  if (typeof resolver._resolveAdverbialAdjectiveCase !== "function") {
    return null;
  }
  return normalizeRuleResult(await resolver._resolveAdverbialAdjectiveCase(ctx));
}

function normalizeRuleResult(result: PipelineRuleResult | null | undefined): RuleResult | null {
  if (result === null || result === undefined) {
    return null;
  }
  const traceEvents = (result.traceEvents ?? []).map((event) => new RuleTraceEvent(
    event.ruleName,
    event.detail,
    event.phase ?? "special",
    event.matched ?? true,
    event.tokenIdx ?? null
  ));
  return new RuleResult(
    result.consumed,
    result.korean,
    result.spaceAfter,
    result.renderPlan ?? null,
    result.traceTag ?? null,
    traceEvents,
    result.benefactive ?? {},
    result.warnings ?? [],
    result.renderPlanPolicy ?? "normal"
  );
}
