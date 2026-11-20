import type { MorphemeEntry } from "../../types/dictionary.js";
import type { RenderPlan, PredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { isBareNaAdjSet, 동사 } from "../../types/pos.js";
import type { LookupTables } from "../lookup-tables.js";
import { isWakePrefixPlan } from "../rendering/render-plan-payloads.js";
import { replaceLemmaRenderPlan } from "../rendering/render-plan-rewrite.js";
import { resolveContextWithLayout } from "../context.js";
import { firstAuxLayer, tailRootHasStateChangeResultTail } from "../head-tail/tail/predicate-root/inspect.js";
import { spanGrammar } from "../candidate-runtime.js";
import { candidateSetMembers, commitmentLaneCandidateSet, isResolvedCandidateSet, keepCandidate, resolveSourceCandidateSet, transformCandidateSet, withStagedCandidatePayload } from "../source-candidate-set.js";
import { TraceEvent, type TraceCollector } from "../trace.js";
import { commitWinner } from "../translation/access.js";
import type { CommitmentContentMap, CommitmentEntry, CommitmentSpan, CommitmentToken, CommitmentTranslation } from "./types.js";
import { runtimeTokens, spanPredicateIsVerbalSuffixDerivation, withTraceClauseIdx } from "./span-evidence.js";







export function commitSpanWinnerEntry(span: CommitmentSpan): void {
  const oldEntry = span.entry;
  if (oldEntry === null || oldEntry.committed === true || oldEntry.senses === undefined) {
    return;
  }
  const newEntry = commitWinner(oldEntry);
  span.entry = newEntry;
  span.renderPlan = replaceEntryInRenderPlan(span.renderPlan ?? null, oldEntry, newEntry);

  const resolved = commitmentLaneCandidateSet(span.sourceCandidates);
  if (!isResolvedCandidateSet(resolved)) {
    return;
  }
  const selectedMember = resolved.winner;
  const selected = selectedMember.candidate;
  span.sourceCandidates = transformCandidateSet(resolved, {
    map: (member) => keepCandidate(member === selectedMember
      ? withStagedCandidatePayload(member, {
        ...selected,
        entry: selected.entry === oldEntry ? newEntry : selected.entry ?? null,
        renderPlan: replaceEntryInRenderPlan(selected.renderPlan ?? null, oldEntry, newEntry)
      })
      : member),
    failClosedReason: "all_members_dropped"
  });
}

function replaceEntryInRenderPlan(plan: RenderPlan | null, oldEntry: CommitmentEntry, newEntry: CommitmentEntry): RenderPlan | null {
  if (plan === null) {
    return null;
  }
  if (plan.kind === "lemma") {
    return entryMatchesCommitSource(plan.entry, oldEntry) ? { ...plan, entry: newEntry } : plan;
  }
  if (plan.kind === "reasonBecause") {
    if ("payload" in plan) {
      const payloadEntry = plan.payload.entry ?? null;
      return entryMatchesCommitSource(payloadEntry, oldEntry)
        ? { ...plan, payload: { ...plan.payload, entry: newEntry } }
        : plan;
    }
    return entryMatchesCommitSource(plan.entry, oldEntry) ? { ...plan, entry: newEntry } : plan;
  }
  if (plan.kind === "youdaModality") {
    if ("payload" in plan) {
      const payloadEntry = plan.payload.entry ?? null;
      return entryMatchesCommitSource(payloadEntry, oldEntry)
        ? { ...plan, payload: { ...plan.payload, entry: newEntry } }
        : plan;
    }
    return entryMatchesCommitSource(plan.entry, oldEntry) ? { ...plan, entry: newEntry } : plan;
  }
  if (plan.kind === "nominalConnectiveScope") {
    const currentContent = "payload" in plan ? plan.payload.content : plan.content;
    const content = replaceEntryInRenderPlan(currentContent, oldEntry, newEntry);
    if (content === currentContent || content === null) {
      return plan;
    }
    return "payload" in plan
      ? { ...plan, payload: { ...plan.payload, content } }
      : { ...plan, content };
  }
  if (plan.kind === "nominalDemoAru") {
    const currentContent = "payload" in plan ? plan.payload.content : plan.content;
    const content = replaceEntryInRenderPlan(currentContent, oldEntry, newEntry);
    if (content === currentContent || content === null) {
      return plan;
    }
    return "payload" in plan
      ? { ...plan, payload: { ...plan.payload, content } }
      : { ...plan, content };
  }
  if (plan.kind === "copulaPredicate") {
    return entryMatchesCommitSource(plan.entry, oldEntry) ? { ...plan, entry: newEntry } : plan;
  }
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return entryMatchesCommitSource(plan.realization.entry, oldEntry)
      ? { ...plan, realization: { ...plan.realization, entry: newEntry } }
      : plan;
  }
  if (plan.kind === "predicateScope" || plan.kind === "predicateNominalScope") {
    const base = replaceEntryInRenderPlan(plan.base, oldEntry, newEntry);
    return base === plan.base || base === null ? plan : { ...plan, base };
  }
  if (plan.kind === "attributive") {
    return plan;
  }
  if (plan.kind === "legacySurfaceComposition") {
    const prefix = typeof plan.prefix === "string" ? plan.prefix : replaceEntryInRenderPlan(plan.prefix ?? null, oldEntry, newEntry);
    const suffix = typeof plan.suffix === "string" ? plan.suffix : replaceEntryInRenderPlan(plan.suffix ?? null, oldEntry, newEntry);
    if (prefix === (plan.prefix ?? null) && suffix === (plan.suffix ?? null)) {
      return plan;
    }
    return {
      ...plan,
      ...(prefix === null ? {} : { prefix }),
      ...(suffix === null ? {} : { suffix })
    };
  }
  if (plan.kind === "noda" && typeof plan.prefix !== "string") {
    const prefix = replaceEntryInRenderPlan(plan.prefix ?? null, oldEntry, newEntry);
    return prefix === (plan.prefix ?? null) || prefix === null ? plan : { ...plan, prefix };
  }
  if (isWakePrefixPlan(plan)) {
    const currentPrefix = "prefix" in plan ? plan.prefix : plan.payload.prefix;
    if (typeof currentPrefix === "string") {
      return plan;
    }
    const prefix = replaceEntryInRenderPlan(currentPrefix ?? null, oldEntry, newEntry);
    if (prefix === (currentPrefix ?? null) || prefix === null) {
      return plan;
    }
    return ("prefix" in plan ? { ...plan, prefix } : { ...plan, payload: { ...plan.payload, prefix } }) as RenderPlan;
  }
  if (plan.kind === "giveRequest") {
    const base = replaceEntryInRenderPlan(plan.base, oldEntry, newEntry);
    return base === plan.base || base === null ? plan : { ...plan, base };
  }
  return plan;
}

function entryMatchesCommitSource(entry: MorphemeEntry | null | undefined, committedSource: CommitmentEntry): boolean {
  if (entry === committedSource) {
    return true;
  }
  if (entry === undefined || entry === null) {
    return false;
  }
  if (
    entry.dictionaryForm !== committedSource.dictionaryForm
    || entry.reading !== committedSource.reading
    || entry.conjugationType !== committedSource.conjugationType
    || entry.conjugationForm !== committedSource.conjugationForm
    || entry.pos !== committedSource.pos
  ) {
    return false;
  }
  const entrySenses = entry.senses ?? [];
  const sourceSenses = committedSource.senses ?? [];
  return sourceSenses.length > 0 && sourceSenses.every((sense) => entrySenses.includes(sense));
}

export function resolveFinalContext(
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  trace: TraceCollector | null,
  lookups: LookupTables,
  numeric: NumericTables
): void {
  const entry = finalContextResolutionEntry(span);
  if (entry === null) {
    return;
  }
  if ((entry.senses ?? []).length <= 1) {
    syncIntrinsicHonorificFromCommittedSense(span, entry.senses?.[0]);
    return;
  }
  const resolved = resolveContextWithLayout(entry, runtimeTokens(tokens), idx, {
    layout,
    contentMap,
    grammar: spanGrammar(span),
    final: true,
    lookups,
    numeric,
    trace
  });
  span.entry = resolved;
  const winningTranslation = resolved.senses?.[0];
  syncIntrinsicHonorificFromCommittedSense(span, winningTranslation);
  const currentRenderPlan = span.renderPlan ?? null;
  if (currentRenderPlan !== null) {
    span.renderPlan = replaceEntryInRenderPlan(currentRenderPlan, entry, resolved);
  }
  const spanSet = span.sourceCandidates;
  const stagedSpan = spanSet !== null && spanSet !== undefined && spanSet.state === "unresolved";
  if (winningTranslation === undefined) {
    return;
  }
  if (stagedSpan && spanSet !== null && spanSet !== undefined) {
    const verdictMember = candidateSetMembers(spanSet).find(
      (member) => member.candidate.translation === winningTranslation
    );
    if (verdictMember !== undefined) {
      span.sourceCandidates = resolveSourceCandidateSet(spanSet, {
        kind: "final_commitment",
        layout,
        predicateTokenIdx: idx,
        verdict: verdictMember.identity
      });
    }
  }
  const stagedSpanNeedsRealization = stagedSpan && (span.renderPlan ?? null) === null;
  if (!stagedSpanNeedsRealization && !senseSelectionChanged(entry, resolved)) {
    return;
  }
  const renderPlan = span.renderPlan ?? null;
  if (renderPlan !== null) {
    const newPlan = replaceLemmaRenderPlan(renderPlan, {
      koreanLemma: winningTranslation.korean,
      irregular: winningTranslation.irregular ?? null,
      koreanPos: winningTranslation.koreanPos ?? null,
      dropFirstPassiveAux: winningTranslation.dropFirstPassiveAux ?? false,
      absorbedPassiveAux: winningTranslation.dropFirstPassiveAux ?? false,
      dropFirstCausativeAux: winningTranslation.dropFirstCausativeAux ?? false,
      dropFirstNegativeAux: winningTranslation.dropFirstNegativeAux ?? false
    });
    if (newPlan !== undefined) {
      span.renderPlan = newPlan;
    }
  }
  span.korean = winningTranslation.korean;
  span.koreanPos = winningTranslation.koreanPos ?? span.koreanPos;
  syncKeijoujiVerbPredicateFlag(span, tokens, idx);
  if (trace !== null) {
    trace.record(new TraceEvent(
      idx,
      "commitment",
      "resolve_sense_frame",
      true,
      withTraceClauseIdx({
        selected: winningTranslation.korean,
        korean_pos: winningTranslation.koreanPos ?? null
      }, layout.clauseIndexOfToken(idx))
    ));
  }
}

function syncIntrinsicHonorificFromCommittedSense(
  span: CommitmentSpan,
  sense: CommitmentTranslation | undefined
): void {
  if (sense?.intrinsicHonorific === undefined) {
    delete span.intrinsicHonorific;
  } else {
    span.intrinsicHonorific = sense.intrinsicHonorific;
  }
}

function finalContextResolutionEntry(span: CommitmentSpan): CommitmentEntry | null {
  const entry = span.entry ?? null;
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan) && tailChainStemHasResolvedSense(span.renderPlan)) {
    return entry;
  }
  if ((entry?.senses ?? []).length > 1) {
    return entry;
  }
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    const compoundEntry = span.compoundHeadFrameEntry ?? null;
    return compoundEntry ?? entry;
  }
  return entry;
}

function tailChainStemHasResolvedSense(plan: PredicateHeadTailChainRenderPlan): boolean {
  const tail = plan.realization.root.tail;
  return tail.kind === "auxLayer" && tail.stem.commitment === "resolved_sense";
}

function senseSelectionChanged(oldEntry: CommitmentEntry, newEntry: CommitmentEntry): boolean {
  return (newEntry.senses ?? [])[0] !== (oldEntry.senses ?? [])[0];
}

export function syncKeijoujiVerbPredicateFlag(span: CommitmentSpan, tokens: readonly CommitmentToken[], idx: number): void {
  const token = tokens[idx];
  span.isKeijoujiVerbPredicate = span.koreanPos === 동사 &&
    token !== undefined && isBareNaAdjSet(token) &&
    !spanPredicateIsVerbalSuffixDerivation(span) &&
    (isKeijoujiPreferenceObjectHead(token) || !keijoujiSuppressedAsStateChangeOrNominalComplement(span));
}

function isKeijoujiPreferenceObjectHead(token: CommitmentToken): boolean {
  const form = token.dictionaryForm ?? token.surface;
  return form === "好き" || form === "嫌い";
}

function keijoujiSuppressedAsStateChangeOrNominalComplement(span: CommitmentSpan): boolean {
  if (!isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    return false;
  }
  const root = span.renderPlan.realization.root;
  return firstAuxLayer(root.tail)?.stem.kind === "noun" || tailRootHasStateChangeResultTail(root);
}
