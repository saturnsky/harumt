import { isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { closesUtteranceAs, type UtteranceClosureKind } from "../clause-layout/utterance-closure.js";
import { 助詞_副助詞, POS01 } from "../../types/pos.js";
import type { LookupTables } from "../lookup-tables.js";
import { replaceTosuruPassiveWithJudgmentQuote, tailRootWithTosuruPassiveJudgmentQuote, replaceBareTteCarrierWithQuotativeConnective, replaceBareTteQuoteWithTopicExclamativeSfp } from "../head-tail/lifecycle/rewrite.js";
import { bareTteTopicExclamativeFollowerAhead } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import type { CommitmentContentMap, CommitmentSpan, CommitmentToken } from "./types.js";
import { contentEntries, contentSpanAt } from "./span-evidence.js";
import { argumentParticleIndicesForPredicate as argumentParticleIndicesForPredicateEvidence, hasNiYotteAgentMarker, isNiYotteAgentMarkerVerbToken } from "./voice-reading-resolution.js";
import { predicateNominalProjectionHosts, nominalRootWithPredicateHostRoot } from "./candidate-projection.js";

export function commitTteTopicExclamativeRefine(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  lookups: LookupTables
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    if (!isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
      continue;
    }
    const tteIdx = idx + span.consumed - 1;
    const tte = tokens[tteIdx];
    if (tte === undefined || tte.surface !== "って" || (tte.pos & POS01) !== 助詞_副助詞) {
      continue;
    }
    if (!bareTteTopicExclamativeFollowerAhead(tokens, tteIdx + 1, lookups)) {
      continue;
    }
    applyTteTopicExclamativeToSpan(span, lookups);
  }
}

function predicateIsNounPhraseInternalAttributive(
  contentMap: CommitmentContentMap,
  predicateIdx: number
): boolean {
  const plan = contentSpanAt(contentMap, predicateIdx)?.renderPlan ?? null;
  if (plan === null || plan === undefined) {
    return false;
  }
  if (plan.kind === "attributive") {
    return true;
  }
  return isPredicateHeadTailChainRenderPlan(plan) &&
    plan.realization.root.tail.kind === "auxLayer" &&
    plan.realization.root.tail.terminal === "attributive";
}

function clauseIsPredicatelessAdjunct(
  clause: { readonly predicates: readonly number[] },
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap
): boolean {
  return clause.predicates.every((predicateIdx) =>
    isNiYotteAgentMarkerVerbToken(tokens[predicateIdx]) ||
    predicateIsNounPhraseInternalAttributive(contentMap, predicateIdx)
  );
}

function tosuruAgentPhraseEvidence(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap
): boolean {
  const assigned = argumentParticleIndicesForPredicateEvidence(predIdx, tokens, layout);
  const particleIndices: number[] = [...assigned];
  const clauseIdx = layout.clauseIndexOfToken(predIdx);
  if (clauseIdx < 0) {
    return particleIndices.length > 0 && hasNiYotteAgentMarker(tokens, particleIndices);
  }
  if (assigned.length === 0) {
    particleIndices.push(...(layout.clauses[clauseIdx]?.particleIndices ?? []));
  }
  for (let idx = clauseIdx - 1; idx >= 0; idx -= 1) {
    const preceding = layout.clauses[idx];
    if (preceding === undefined || !clauseIsPredicatelessAdjunct(preceding, tokens, contentMap)) {
      break;
    }
    particleIndices.push(...preceding.particleIndices);
  }
  return particleIndices.length > 0 && hasNiYotteAgentMarker(tokens, particleIndices);
}

export function commitTosuruJudgmentPassiveRefine(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    const plan = span.renderPlan;
    if (isPredicateHeadTailChainRenderPlan(plan)) {
      const rewritten = replaceTosuruPassiveWithJudgmentQuote(
        plan,
        () => tosuruAgentPhraseEvidence(tokens, idx, layout, contentMap)
      );
      if (rewritten === undefined) {
        continue;
      }
      span.renderPlan = rewritten;
      span.korean = "";
      continue;
    }
    if (!isNominalHeadTailChainRenderPlan(plan)) {
      continue;
    }
    let root = plan.realization.root;
    let changed = false;
    for (const host of predicateNominalProjectionHosts(root)) {
      const refined = tailRootWithTosuruPassiveJudgmentQuote(
        host.root,
        () => tosuruAgentPhraseEvidence(tokens, host.predicateTokenIdx, layout, contentMap)
      );
      if (refined === undefined) {
        continue;
      }
      root = nominalRootWithPredicateHostRoot(root, host, refined);
      changed = true;
    }
    if (changed) {
      span.renderPlan = { ...plan, realization: { ...plan.realization, root } };
      span.korean = "";
    }
  }
}

const BARE_TTE_CARRIER_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing"
]);

export function commitBareTteCarrierMidUtteranceRefine(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    if (!isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
      continue;
    }
    const tteIdx = idx + span.consumed - 1;
    const tte = tokens[tteIdx];
    if (tte === undefined || tte.surface !== "って") {
      continue;
    }
    const closure = layout.utteranceClosureAfter(tokens, tteIdx + 1);
    if (closesUtteranceAs(closure, BARE_TTE_CARRIER_CLOSURES) || closure.closure !== "weak_pause") {
      continue;
    }
    const refined = replaceBareTteCarrierWithQuotativeConnective(span.renderPlan);
    if (refined !== undefined) {
      span.renderPlan = refined;
      span.korean = "";
    }
  }
}

function applyTteTopicExclamativeToSpan(span: CommitmentSpan, lookups: LookupTables): void {
  let changed = false;
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    const rewrittenSpan = replaceBareTteQuoteWithTopicExclamativeSfp(span.renderPlan);
    if (rewrittenSpan !== undefined) {
      span.renderPlan = rewrittenSpan;
      span.korean = "";
      changed = true;
    }
  }
  if (changed) {
  }
}
