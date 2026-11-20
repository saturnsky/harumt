import type { RenderPlan, PredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import { hasClauseRole, isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { POS0, POS5A, 形容詞0, 名詞, 動詞, 意志推量形_, 命令形_ } from "../../types/pos.js";
import type { LookupTables } from "../lookup-tables.js";
import { replaceTailChainConnectiveSurface, replaceTailChainProjectionConnective, tailChainCopulaHostPredicationForConnectiveKind, tailChainHasConnectiveKind, tailChainHasConnectiveSurface } from "../head-tail/lifecycle/rewrite.js";
import { NIWA_EVALUATION_EXTENT_PREDICATES } from "../head-tail/data/semantic-helper-sets.js";
import type { CommitmentContentMap, CommitmentSpan, CommitmentToken } from "./types.js";
import { contentEntries, contentSpanAt } from "./span-evidence.js";

export const NIWA_INTENTIONAL_PURPOSE_CONNECTIVE = "predicate_projection_intentional_purpose";
export const NIWA_EVALUATION_EXTENT_CONNECTIVE = "predicate_projection_evaluation_extent";

export function commitNiwaEvaluationRefine(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  lookups: LookupTables
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    if (!isPredicateHeadTailChainRenderPlan(span.renderPlan) || !hasClauseRole(span.renderPlan) ||
      !tailChainHasConnectiveKind(span.renderPlan, NIWA_INTENTIONAL_PURPOSE_CONNECTIVE)) {
      continue;
    }
    const followingIdx = layout.nextPredicateInClauseAfter(idx);
    if (followingIdx === undefined || !followingPredicateIsEvaluationExtent(tokens, contentMap, followingIdx)) {
      continue;
    }
    applyNiwaEvaluationRefineToSpan(span, lookups);
  }
}

function followingPredicateIsEvaluationExtent(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  followingIdx: number
): boolean {
  const span = contentSpanAt(contentMap, followingIdx);
  const end = Math.min(followingIdx + (span?.consumed ?? 1), tokens.length);
  for (let i = followingIdx; i < end; i++) {
    const tok = tokens[i];
    if (tok === undefined) {
      continue;
    }
    const lemma = tok.dictionaryForm ?? tok.surface;
    if (!NIWA_EVALUATION_EXTENT_PREDICATES.has(lemma)) {
      continue;
    }
    const next = tokens[i + 1];
    if ((tok.pos & POS0) === 形容詞0 && next !== undefined && (next.pos & POS0) === 名詞) {
      continue;
    }
    return true;
  }
  return false;
}

function refineNiwaConnectivePlan(plan: RenderPlan | null | undefined): PredicateHeadTailChainRenderPlan | undefined {
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return undefined;
  }
  return replaceTailChainProjectionConnective(
    plan,
    NIWA_INTENTIONAL_PURPOSE_CONNECTIVE,
    NIWA_EVALUATION_EXTENT_CONNECTIVE
  );
}

function applyNiwaEvaluationRefineToSpan(span: CommitmentSpan, lookups: LookupTables): void {
  let changed = false;
  const rewrittenSpan = refineNiwaConnectivePlan(span.renderPlan);
  if (rewrittenSpan !== undefined) {
    span.renderPlan = rewrittenSpan;
    span.korean = "";
    changed = true;
  }
  if (changed) {
  }
}

const NONI_PURPOSE_EVALUATION_CONNECTIVE = "purpose_evaluation_nominalizer";
const NONI_ADVERSATIVE_CONNECTIVE = "adversative";

export function commitNoNiCopulaAdversativeRefine(contentMap: CommitmentContentMap): void {
  for (const [, span] of contentEntries(contentMap)) {
    const plan = span.renderPlan;
    if (!isPredicateHeadTailChainRenderPlan(plan) || !hasClauseRole(plan)) {
      continue;
    }
    const boundary = plan.clauseRole.outgoingBoundary;
    if (
      boundary.kind === "terminal" ||
      boundary.connectiveKind !== NONI_PURPOSE_EVALUATION_CONNECTIVE ||
      boundary.adversativeReadingAvailable !== true
    ) {
      continue;
    }
    const hostPredication = tailChainCopulaHostPredicationForConnectiveKind(
      plan,
      NONI_PURPOSE_EVALUATION_CONNECTIVE
    );
    if (hostPredication === null) {
      continue;
    }
    if (hostPredication.copula.polarity !== "negative" && !hostPredication.past) {
      continue;
    }
    const rewritten = replaceTailChainProjectionConnective(
      plan,
      NONI_PURPOSE_EVALUATION_CONNECTIVE,
      NONI_ADVERSATIVE_CONNECTIVE
    );
    if (rewritten === undefined) {
      continue;
    }
    span.renderPlan = rewritten;
    span.korean = "";
  }
}

const SHI_CONNECTIVE_SURFACE = "し";
const SHI_REASON_RENDER_SURFACE = "__shi_reason";

export function commitShiReasonRefine(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  lookups: LookupTables
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    if (!isPredicateHeadTailChainRenderPlan(span.renderPlan) ||
      !tailChainHasConnectiveSurface(span.renderPlan, SHI_CONNECTIVE_SURFACE)) {
      continue;
    }
    const clauseIdx = layout.clauseOfTokenIndex[idx];
    if (clauseIdx === undefined) {
      continue;
    }
    const followingClause = layout.clauses[clauseIdx + 1];
    if (followingClause === undefined) {
      continue;
    }
    const finalPredIdx = followingClause.predicates[followingClause.predicates.length - 1];
    if (finalPredIdx === undefined ||
      !predicateSpanCarriesDirectiveSpeechAct(tokens, contentMap, layout, finalPredIdx)) {
      continue;
    }
    applyShiReasonRefineToSpan(span, lookups);
  }
}

function predicateSpanCarriesDirectiveSpeechAct(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  predIdx: number
): boolean {
  if (layout.speechActScopeOfPredicate(predIdx) !== "matrix") {
    return false;
  }
  const span = contentSpanAt(contentMap, predIdx);
  const end = Math.min(predIdx + (span?.consumed ?? 1), tokens.length);
  for (let i = predIdx; i < end; i++) {
    const tok = tokens[i];
    if (tok === undefined) {
      continue;
    }
    const inflection = tok.pos & POS5A;
    let directive = false;
    if (inflection === 意志推量形_) {
      directive = (tok.pos & POS0) === 動詞 || (tok.dictionaryForm ?? tok.surface) === "ます";
    } else if (inflection === 命令形_ && (tok.pos & POS0) === 動詞) {
      directive = true;
    }
    if (directive) {
      return true;
    }
  }
  return false;
}

function refineShiReasonPlan(plan: RenderPlan | null | undefined): PredicateHeadTailChainRenderPlan | undefined {
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return undefined;
  }
  return replaceTailChainConnectiveSurface(plan, SHI_CONNECTIVE_SURFACE, SHI_REASON_RENDER_SURFACE);
}

function applyShiReasonRefineToSpan(span: CommitmentSpan, lookups: LookupTables): void {
  let changed = false;
  const rewrittenSpan = refineShiReasonPlan(span.renderPlan);
  if (rewrittenSpan !== undefined) {
    span.renderPlan = rewrittenSpan;
    span.korean = "";
    changed = true;
  }
  if (changed) {
  }
}
