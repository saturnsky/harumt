
import type { ReanalysisDictionary } from "../../dictionary/reanalysis.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import type { LookupTables } from "../lookup-tables.js";
import { matchCopulaNegation } from "../rules/copula.js";
import { TokenCursor } from "../token-cursor.js";
import type { Clause, ClauseLayout } from "../clause-layout/index.js";
import { enumerateClausePhrasesAfter, enumerateClausePhrasesBefore } from "../clause-layout/phrase-enumeration.js";
import type { RuntimeHaruToken, TokenReanalysisProposal } from "../../types/token.js";

import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { ReanalysisProposalResolution, ReanalysisResolutionRecord } from "../../types/reanalysis.js";
import type { SimpleAspectOp, TailNode } from "../head-tail/tail/predicate-root/grammar.js";
import { isSimpleAspectOp } from "../head-tail/tail/predicate-root/aspect-semantics.js";
import { classifyTeTailContinuation, type TeTailContinuationKind } from "../head-tail/tail/postverb-tail-classifier.js";

import { spanHasNegativeAux } from "./span-evidence.js";
import type { CommitmentSpan } from "./types.js";
import {
  POS0,
  isAdjectivalRenyouTeFormHostToken,
  isCaseParticleToken,
  isCopulaDaFusedRenyouToken,
  isMizenInflection,
  isTerminalParticleToken,
  isVerbPredicateToken,
  isVerbRenyouPredicateToken,
  isVoicedTeFormHostToken,
  助詞,
  名詞,
  代名詞,
  接尾辞
} from "../../types/pos.js";
import { DETACHED_SEPARATIONS, isSourceSeparatedFromPreviousToken, separatedAs } from "../clause-layout/trivia.js";
import { isTerminalNeSfpSurface, terminalSfpLexeme } from "../semantics/sfp-surface.js";
import {
  explanatoryMonPauseClosesBeforePostposedMaterial,
  explanatoryMonReadingAt
} from "../semantics/explanatory-mon-reading.js";
import { isHardTerminalPunctuationToken } from "../head-tail/boundary/punctuation.js";

export interface ReanalysisEvidence {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly contentMap: ReadonlyMap<number, CommitmentSpan>;
  readonly layout: ClauseLayout;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}

export interface ReanalysisSite {
  readonly anchorIndex: number;
  readonly consumed: number;
}

export interface ReanalysisConditionVerdict {
  readonly met: boolean;
  readonly evidenceNote: string;
}

export type ReanalysisConditionEvaluator = (
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
) => ReanalysisConditionVerdict;

export type {
  ReanalysisProposalResolution,
  ReanalysisResolutionRecord
} from "../../types/reanalysis.js";

const EVALUATORS: ReadonlyMap<string, ReanalysisConditionEvaluator> = new Map([
  ["npi_host_negation", evaluateNpiHostNegation],
  ["verb_object_argument", evaluateVerbObjectArgument],
  ["following_clause_chain_discovery_matrix", evaluateFollowingClauseChainDiscoveryMatrix],
  ["following_clause_question_host_absent", evaluateFollowingClauseQuestionHostAbsent],
  ["question_taking_host_before_terminal_ka", evaluateQuestionTakingHostBeforeTerminalKa],
  ["duplicate_desire_aux_chain", evaluateDuplicateDesireAuxChain],
  ["te_shimau_duplicate_polite_chain", evaluateTeShimauDuplicatePoliteChain],
  ["duplicate_past_aux_chain", evaluateDuplicatePastAuxChain],
  ["negative_quote_disfluency_chain", evaluateNegativeQuoteDisfluencyChain],
  ["desu_renyou_te_committed_aspect", evaluateDesuRenyouTeCommittedAspect],
  ["zero_predicate_copula_de_host", evaluateZeroPredicateCopulaDeHost],
  ["contracted_ja_nai_before_question", evaluateContractedJaNaiBeforeQuestion],
  ["colloquial_sokuon_te_after_adjectival_renyou", evaluateColloquialSokuonTeAfterAdjectivalRenyou],
  ["explanatory_mon_before_postposed_material", evaluateExplanatoryMonBeforePostposedMaterial],
  ["quote_marker_bound_to_host", evaluateQuoteMarkerBoundToHost]
] as const);

export { proposeRuleReanalysis } from "../../types/reanalysis.js";

export function registeredReanalysisConditionIds(): ReadonlySet<string> {
  return new Set(EVALUATORS.keys());
}

export function resolveDeferredReanalysisProposals(
  reanalysis: ReanalysisDictionary,
  evidence: ReanalysisEvidence
): ReanalysisResolutionRecord | null {
  const proposals: ReanalysisProposalResolution[] = [];
  for (let index = 0; index < evidence.tokens.length; index += 1) {
    const carried = evidence.tokens[index]?.reanalysisProposals;
    if (carried === undefined || carried.length === 0) {
      continue;
    }
    for (const proposal of carried) {
      const rematch = proposal.flipKind === "token_substitution"
        ? reanalysis.matchAt(evidence.tokens, index)
        : undefined;
      if (proposal.flipKind === "token_substitution" &&
        (rematch === undefined || rematch.entry.id !== proposal.rowId || rematch.consumed !== proposal.consumed)) {
        proposals.push({
          rowId: proposal.rowId,
          anchorIndex: index,
          anchorSourceOrdinal: proposal.anchorSourceOrdinal,
          flipKind: "token_substitution",
          condition: { id: proposal.conditionId, met: false, evidenceNote: "carrier span no longer matches row" },
          blockers: [],
          confirmed: false,
          note: "span_mismatch"
        });
        continue;
      }
      const site: ReanalysisSite = { anchorIndex: index, consumed: proposal.consumed };
      const condition = { id: proposal.conditionId, ...evaluateById(proposal.conditionId, site, evidence) };
      const blockers = proposal.blockerIds.map((blockerId: string) => ({
        id: blockerId,
        ...evaluateById(blockerId, site, evidence)
      }));
      proposals.push({
        rowId: proposal.rowId,
        anchorIndex: index,
        anchorSourceOrdinal: proposal.anchorSourceOrdinal,
        flipKind: proposal.flipKind,
        condition,
        blockers,
        confirmed: condition.met && blockers.every((blocker: { met: boolean }) => !blocker.met)
      });
    }
  }
  return proposals.length === 0 ? null : { proposals };
}

function evaluateById(
  id: string,
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const evaluator = EVALUATORS.get(id);
  if (evaluator === undefined) {
    return { met: false, evidenceNote: `unregistered condition id "${id}"` };
  }
  return evaluator(site, evidence);
}

function evaluateDuplicateDesireAuxChain(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const proposalEnd = site.anchorIndex + site.consumed;
  for (const span of evidence.contentMap.values()) {
    const spanEnd = span.start + span.consumed;
    if (span.start > site.anchorIndex || spanEnd < proposalEnd) {
      continue;
    }
    const plan = span.renderPlan ?? null;
    if (!isPredicateHeadTailChainRenderPlan(plan)) {
      continue;
    }
    const duplicateCount = duplicateDesireCountInTail(plan.realization.root.tail);
    if (duplicateCount >= 2) {
      return {
        met: true,
        evidenceNote: `${duplicateCount} DesireOps in one aux layer (predicate idx ${span.start})`
      };
    }
  }
  return {
    met: false,
    evidenceNote: "no covering predicate plan with duplicate DesireOps in one aux layer"
  };
}

function duplicateDesireCountInTail(node: TailNode): number {
  if (node.kind === "connective") {
    return Math.max(
      duplicateDesireCountInTail(node.inner),
      duplicateDesireCountInTail(node.outer)
    );
  }
  return node.ops.filter((op) => op.kind === "desire").length;
}

function evaluateTeShimauDuplicatePoliteChain(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const host = evidence.tokens[site.anchorIndex - 1];
  const marker = evidence.tokens[site.anchorIndex];
  if (host === undefined || marker === undefined || !isVerbRenyouPredicateToken(host)) {
    return {
      met: false,
      evidenceNote: "te-shimau candidate is not immediately preceded by a verbal renyou host"
    };
  }
  const expectedMarker = isVoicedTeFormHostToken(host) ? "で" : "て";
  if (marker.surface !== expectedMarker) {
    return {
      met: false,
      evidenceNote: `te-form allomorph mismatch (expected ${expectedMarker}, got ${marker.surface})`
    };
  }

  const shimauHeadIndex = site.anchorIndex + 1;
  const proposalEnd = site.anchorIndex + site.consumed;
  const span = evidence.contentMap.get(shimauHeadIndex);
  if (span === undefined || span.start + span.consumed < proposalEnd) {
    return {
      met: false,
      evidenceNote: "no predicate span owns the complete malformed shimau chain"
    };
  }
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return {
      met: false,
      evidenceNote: "malformed shimau head has no predicate head-tail plan"
    };
  }
  const duplicateCount = duplicatePoliteCountInTail(plan.realization.root.tail);
  return duplicateCount >= 2
    ? {
        met: true,
        evidenceNote: `${duplicateCount} PoliteOps in malformed shimau aux layer (predicate idx ${shimauHeadIndex})`
      }
    : {
        met: false,
        evidenceNote: "malformed shimau predicate does not contain duplicate PoliteOps in one aux layer"
      };
}

function evaluateDuplicatePastAuxChain(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const host = evidence.tokens[site.anchorIndex - 1];
  if (host === undefined || !isVerbRenyouPredicateToken(host)) {
    return {
      met: false,
      evidenceNote: "duplicate past candidate is not immediately preceded by a verbal renyou host"
    };
  }
  const proposalEnd = site.anchorIndex + site.consumed;
  for (const span of evidence.contentMap.values()) {
    if (span.start > site.anchorIndex || span.start + span.consumed < proposalEnd) continue;
    const plan = span.renderPlan ?? null;
    if (!isPredicateHeadTailChainRenderPlan(plan)) continue;
    const duplicateCount = duplicatePastCountInTail(plan.realization.root.tail);
    if (duplicateCount >= 2) {
      return {
        met: true,
        evidenceNote: `${duplicateCount} past TenseOps in one aux layer (predicate idx ${span.start})`
      };
    }
  }
  return {
    met: false,
    evidenceNote: "no covering predicate plan with duplicate past TenseOps in one aux layer"
  };
}

function duplicatePastCountInTail(node: TailNode): number {
  if (node.kind === "connective") {
    return Math.max(
      duplicatePastCountInTail(node.inner),
      duplicatePastCountInTail(node.outer)
    );
  }
  return node.ops.filter((op) => op.kind === "tense" && op.tense === "past").length;
}

function duplicatePoliteCountInTail(node: TailNode): number {
  if (node.kind === "connective") {
    return Math.max(
      duplicatePoliteCountInTail(node.inner),
      duplicatePoliteCountInTail(node.outer)
    );
  }
  return node.ops.filter((op) => op.kind === "polite").length;
}

function evaluateDesuRenyouTeCommittedAspect(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const aspectSourceStart = site.anchorIndex + 1;
  const proposalEnd = site.anchorIndex + site.consumed;
  for (const span of evidence.contentMap.values()) {
    if (span.start > site.anchorIndex || span.start + span.consumed < proposalEnd) continue;
    const plan = span.renderPlan ?? null;
    if (!isPredicateHeadTailChainRenderPlan(plan)) continue;
    const aspect = exactSimpleAspectForSource(plan.realization.root.tail, aspectSourceStart, proposalEnd);
    if (aspect !== null) {
      return {
        met: true,
        evidenceNote: `${aspect.aspect} owns exact te+carrier span [${aspectSourceStart},${proposalEnd})`
      };
    }
  }
  const host = evidence.tokens[site.anchorIndex - 1];
  const nominalHost = host !== undefined && NOMINAL_HOST_POS0.has(host.pos & POS0);
  const carrier = evidence.tokens[proposalEnd - 1];
  const carrierKind = carrier === undefined || !nominalHost ? null : classifyTeTailContinuation(carrier, evidence.lookups);
  if (carrierKind !== null && DESU_TE_IMPOSSIBLE_CARRIER_KINDS.has(carrierKind)) {
    return {
      met: true,
      evidenceNote: `te-tail ${carrierKind} carrier cannot follow desu renyou + te`
    };
  }
  return {
    met: false,
    evidenceNote: "no covering predicate plan with exact SimpleAspectOp ownership of te+carrier"
  };
}

const NOMINAL_HOST_POS0: ReadonlySet<number> = new Set([名詞, 代名詞, 接尾辞]);

const DESU_TE_IMPOSSIBLE_CARRIER_KINDS: ReadonlySet<TeTailContinuationKind> = new Set(["simple_aspect", "benefactive", "request"]);

function exactSimpleAspectForSource(
  node: TailNode,
  sourceStart: number,
  sourceEnd: number
): SimpleAspectOp | null {
  if (node.kind === "connective") {
    return exactSimpleAspectForSource(node.inner, sourceStart, sourceEnd) ??
      exactSimpleAspectForSource(node.outer, sourceStart, sourceEnd);
  }
  for (const op of node.ops) {
    if (
      isSimpleAspectOp(op) &&
      op.source.tokenIndices.length === sourceEnd - sourceStart &&
      op.source.tokenIndices.every((index, offset) => index === sourceStart + offset)
    ) return op;
  }
  return null;
}

function evaluateNegativeQuoteDisfluencyChain(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const host = evidence.tokens[site.anchorIndex - 1];
  if (host === undefined ||
    !isVerbPredicateToken(host) ||
    !isMizenInflection(host.pos)) {
    return {
      met: false,
      evidenceNote: "negative quote disfluency is not immediately preceded by a verbal mizen host"
    };
  }

  const proposalEnd = site.anchorIndex + site.consumed;
  for (const span of evidence.contentMap.values()) {
    if (span.start > site.anchorIndex || span.start + span.consumed < proposalEnd) {
      continue;
    }
    const plan = span.renderPlan ?? null;
    if (!isPredicateHeadTailChainRenderPlan(plan)) {
      continue;
    }
    if (tailContainsNegativeQuoteDisfluencyLayer(
      plan.realization.root.tail,
      site.anchorIndex,
      proposalEnd
    )) {
      return {
        met: true,
        evidenceNote: `impossible Negation+Desire+te_iku+te_iru+Past layer (predicate idx ${span.start})`
      };
    }
  }
  return {
    met: false,
    evidenceNote: "no covering predicate plan with the exact negative quote disfluency layer"
  };
}

function tailContainsNegativeQuoteDisfluencyLayer(
  node: TailNode,
  proposalStart: number,
  proposalEnd: number
): boolean {
  if (node.kind === "connective") {
    return tailContainsNegativeQuoteDisfluencyLayer(node.inner, proposalStart, proposalEnd) ||
      tailContainsNegativeQuoteDisfluencyLayer(node.outer, proposalStart, proposalEnd);
  }
  const [negative, desire, iku, iru, past] = node.ops;
  if (node.ops.length !== 5 ||
    negative?.kind !== "negation" ||
    desire?.kind !== "desire" ||
    iku?.kind !== "aspect" || iku.aspect !== "te_iku" ||
    iru?.kind !== "aspect" || iru.aspect !== "te_iru" ||
    past?.kind !== "tense" || past.tense !== "past") {
    return false;
  }
  const sourceIndices = node.ops.flatMap((op) => op.source.tokenIndices);
  return sourceIndices.length === proposalEnd - proposalStart &&
    sourceIndices.every((index, offset) => index === proposalStart + offset);
}

function evaluateNpiHostNegation(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const { tokens, contentMap, layout } = evidence;
  const anchorClauseIdx = layout.clauseIndexOfToken(site.anchorIndex);
  if (anchorClauseIdx < 0) {
    return { met: false, evidenceNote: "candidate token outside clause layout" };
  }
  for (let clauseIdx = anchorClauseIdx + 1; clauseIdx < layout.clauses.length; clauseIdx += 1) {
    const clause = layout.clauses[clauseIdx]!;
    if (clause.kind === "relative") {
      continue;
    }
    const hostPredicate = clause.predicates[clause.predicates.length - 1];
    if (hostPredicate === undefined) {
      continue;
    }
    const hostForm = tokens[hostPredicate]?.dictionaryForm ?? "?";
    const span = contentMap.get(hostPredicate);
    if (span !== undefined && spanHasNegativeAux(span)) {
      return { met: true, evidenceNote: `host=${hostForm}(idx ${hostPredicate}) negative aux/tail` };
    }
    if (span !== undefined && spanHasForbiddenIdiomTail(span)) {
      return { met: true, evidenceNote: `host=${hostForm}(idx ${hostPredicate}) forbidden idiom tail (てはいけない/てはならない)` };
    }
    if (span !== undefined && spanHasProhibitiveNaSfp(span)) {
      return { met: true, evidenceNote: `host=${hostForm}(idx ${hostPredicate}) prohibitive な sfp` };
    }
    if (clauseHasCopulaNegation(tokens, clause)) {
      return { met: true, evidenceNote: `host=${hostForm}(idx ${hostPredicate}) copula negation in host clause` };
    }
    return { met: false, evidenceNote: `host=${hostForm}(idx ${hostPredicate}) no negation evidence` };
  }
  return { met: false, evidenceNote: "no host clause after candidate" };
}

function spanHasForbiddenIdiomTail(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  return isPredicateHeadTailChainRenderPlan(plan) && tailNodeHasForbiddenIdiom(plan.realization.root.tail);
}

function tailNodeHasForbiddenIdiom(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasForbiddenIdiom(node.inner) || tailNodeHasForbiddenIdiom(node.outer);
  }
  return node.ops.some((op) => op.kind === "idiom" && op.idiom === "forbidden");
}

function spanHasProhibitiveNaSfp(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  return isPredicateHeadTailChainRenderPlan(plan) && plan.realization.root.sfp?.effect === "na_prohib";
}

function clauseHasCopulaNegation(tokens: readonly RuntimeHaruToken[], clause: Clause): boolean {
  for (let index = clause.start; index < clause.end; index += 1) {
    if (matchCopulaNegation(new TokenCursor(tokens, index, clause.end)) !== undefined) {
      return true;
    }
  }
  return false;
}

function evaluateZeroPredicateCopulaDeHost(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const { tokens, layout, lookups } = evidence;
  const deIdx = site.anchorIndex;
  const clauseIdx = layout.clauseIndexOfToken(deIdx);
  if (clauseIdx < 0) {
    return { met: false, evidenceNote: "de token outside clause layout" };
  }
  const clause = layout.clauses[clauseIdx]!;
  if (clause.predicates.length > 0) {
    return { met: false, evidenceNote: `clause has predicate(s) [${clause.predicates.join(",")}]` };
  }
  let hasTopicOrSubject = false;
  for (let idx = clause.start; idx < clause.end; idx += 1) {
    const marker = tokens[idx];
    if (marker === undefined || (marker.pos & POS0) !== 助詞) {
      continue;
    }
    if (marker.surface === "は" || marker.surface === "が") {
      hasTopicOrSubject = true;
      break;
    }
  }
  if (!hasTopicOrSubject) {
    return { met: false, evidenceNote: "no は/が topic-subject in clause" };
  }
  const host = tokens[deIdx - 1];
  const hostPos0 = (host?.pos ?? 0) & POS0;
  if (host === undefined || (hostPos0 !== 名詞 && hostPos0 !== 代名詞)) {
    return { met: false, evidenceNote: "host before で is not a noun/pronoun" };
  }
  const hostForm = host.dictionaryForm ?? host.surface;
  const inWhitelist =
    lookups.PERSON_NOUNS.has(hostForm) ||
    lookups.PERSON_PRONOUNS.has(hostForm) ||
    lookups.ANIMATE_NOUNS.has(hostForm) ||
    lookups.COPULA_DE_PREDICATE_EXTRA_HOST_NOUNS.has(hostForm);
  if (!inWhitelist) {
    return { met: false, evidenceNote: `host ${hostForm} not in copula-de whitelist` };
  }
  const sfp = tokens[deIdx + 1];
  const sfpCanon = terminalSfpLexeme(sfp);
  const isDiscourseSfp =
    (sfpCanon === "ね" || sfpCanon === "な" || sfpCanon === "さ");
  if (!isDiscourseSfp) {
    return { met: false, evidenceNote: "following token is not a ね/な/さ discourse SFP" };
  }
  const after = tokens[deIdx + 2];
  if (after !== undefined && !isHardTerminalPunctuationToken(after)) {
    return { met: false, evidenceNote: "SFP not utterance-terminal (followed by non-terminal token)" };
  }
  return {
    met: true,
    evidenceNote: `host ${hostForm}(idx ${deIdx - 1}) copula-de zero-predicate + ${sfpCanon} utterance-terminal`
  };
}

function isNonTerminalDewaJaToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || token.surface !== "じゃ") {
    return false;
  }
  return isCaseParticleToken(token) || isCopulaDaFusedRenyouToken(token);
}

function evaluateContractedJaNaiBeforeQuestion(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const { tokens, layout } = evidence;
  const jaIdx = site.anchorIndex;
  const neIdx = jaIdx + 1;
  if (!isNonTerminalDewaJaToken(tokens[jaIdx])) {
    return { met: false, evidenceNote: "ja is not a non-terminal dewa-series token" };
  }
  const ne = tokens[neIdx];
  if (ne === undefined || !isTerminalParticleToken(ne) || !isTerminalNeSfpSurface(ne)) {
    return { met: false, evidenceNote: "following token is not a terminal ne SFP" };
  }
  if (separatedAs(tokens, neIdx, DETACHED_SEPARATIONS)) {
    return { met: false, evidenceNote: `ne(idx ${neIdx}) is detached from ja (spacing/pause boundary)` };
  }
  const run = layout.terminalPunctuationRunAfter(neIdx);
  if (run === undefined || !run.units.includes("question")) {
    return {
      met: false,
      evidenceNote: `no interrogative terminal punctuation run after ne(idx ${neIdx})`
    };
  }
  return {
    met: true,
    evidenceNote: `contracted ja+ne adjacent, terminal run [${run.units.join(",")}] after idx ${neIdx}`
  };
}

function evaluateExplanatoryMonBeforePostposedMaterial(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const { tokens, layout } = evidence;
  const monIdx = site.anchorIndex;
  const reading = explanatoryMonReadingAt(layout, tokens, monIdx);
  if (reading.kind === "explanatory_sfp") {
    return { met: true, evidenceNote: `layout closure after mon(idx ${monIdx}) [${reading.evidence}]` };
  }
  if (reading.kind !== "pause_pending") {
    return { met: false, evidenceNote: `mon(idx ${monIdx}) is not an explanatory SFP candidate` };
  }
  return explanatoryMonPauseClosesBeforePostposedMaterial(layout, monIdx, reading.pauseIdx)
    ? { met: true, evidenceNote: `no layout predicate after pause(idx ${reading.pauseIdx}) before utterance closure` }
    : { met: false, evidenceNote: `layout predicate follows pause(idx ${reading.pauseIdx}) — nominal head reading kept` };
}

function evaluateColloquialSokuonTeAfterAdjectivalRenyou(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const { tokens } = evidence;
  const tteIdx = site.anchorIndex;
  const host = tokens[tteIdx - 1];
  if (host === undefined || !isAdjectivalRenyouTeFormHostToken(host)) {
    return { met: false, evidenceNote: "preceding token is not an adjectival renyou te-form host" };
  }
  if (isSourceSeparatedFromPreviousToken(tokens, tteIdx)) {
    return {
      met: false,
      evidenceNote: `tte(idx ${tteIdx}) is source-separated from host (spacing/pause/removed island)`
    };
  }
  return { met: true, evidenceNote: `adjectival renyou host ${host.surface}(idx ${tteIdx - 1}) + adjacent tte` };
}

function evaluateQuoteMarkerBoundToHost(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const { layout } = evidence;
  const markerIdx = site.anchorIndex;
  const hostIdx = layout.quoteHostOfMarker(markerIdx);
  if (hostIdx !== undefined) {
    return { met: true, evidenceNote: `quote marker idx ${markerIdx} bound to host idx ${hostIdx}` };
  }
  const attributiveHeadIdx = layout.quoteAttributiveCarrierHeadOfMarker(markerIdx);
  if (attributiveHeadIdx !== undefined) {
    return {
      met: true,
      evidenceNote: `quote marker idx ${markerIdx} is an attributive iu carrier (head idx ${attributiveHeadIdx})`
    };
  }
  return { met: false, evidenceNote: `no quote host binds marker idx ${markerIdx}` };
}

function evaluateFollowingClauseChainDiscoveryMatrix(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const { tokens, layout, lookups } = evidence;
  const forms = lookups.TOKORO_RESULT_EVIDENCE_AFTER_FORMS;
  let seen = 0;
  for (const item of enumerateClausePhrasesAfter(layout, tokens, site.anchorIndex + site.consumed - 1, { scope: "sentence" })) {
    if (item.kind === "marker_particle" || item.kind === "punctuation_weak" || item.kind === "opaque_span" || item.kind === "adverbial") {
      continue;
    }
    if (item.clauseOrdinalDelta > 0) {
      const head = tokens[item.headIdx];
      const form = head?.dictionaryForm || head?.surface || "";
      if (forms.has(form)) {
        return { met: true, evidenceNote: `matrix ${item.kind} ${form}(idx ${item.headIdx}, Δclause ${item.clauseOrdinalDelta})` };
      }
    }
    seen += 1;
    if (seen >= 8) {
      break;
    }
  }
  return { met: false, evidenceNote: "no discovery-matrix predicate in following clause chain" };
}

function evaluateFollowingClauseQuestionHostAbsent(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const { tokens, layout, lookups } = evidence;
  const verbs = lookups.EMBEDDED_QUESTION_BROAD_VERBS;
  const sahen = lookups.EMBEDDED_QUESTION_BROAD_SAHEN_NOUNS;
  const adjDa = lookups.EMBEDDED_QUESTION_BROAD_ADJ_DA;
  let seen = 0;
  for (const item of enumerateClausePhrasesAfter(layout, tokens, site.anchorIndex + site.consumed - 1, { scope: "sentence" })) {
    if (item.kind === "marker_particle" || item.kind === "punctuation_weak" || item.kind === "opaque_span") {
      continue;
    }
    const head = tokens[item.headIdx];
    const form = head?.dictionaryForm || head?.surface || "";
    if (verbs.has(form) || sahen.has(form) || adjDa.has(form)) {
      return { met: false, evidenceNote: `question-taking host ${form}(idx ${item.headIdx}) after candidate` };
    }
    seen += 1;
    if (seen >= 8) {
      break;
    }
  }
  return { met: true, evidenceNote: "no question-taking host in following clause chain (terminal question)" };
}

function evaluateQuestionTakingHostBeforeTerminalKa(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const { tokens, layout, lookups } = evidence;
  const anchorClauseIdx = layout.clauseIndexOfToken(site.anchorIndex);
  if (anchorClauseIdx <= 0) {
    return { met: false, evidenceNote: "no prior clause before terminal ka clause" };
  }
  const verbs = lookups.EMBEDDED_QUESTION_BROAD_VERBS;
  const sahen = lookups.EMBEDDED_QUESTION_BROAD_SAHEN_NOUNS;
  const adjDa = lookups.EMBEDDED_QUESTION_BROAD_ADJ_DA;
  for (const item of enumerateClausePhrasesBefore(layout, tokens, site.anchorIndex, { scope: "clause" })) {
    if (item.kind === "marker_particle" || item.kind === "punctuation_weak" || item.kind === "opaque_span" || item.kind === "adverbial") {
      continue;
    }
    const head = tokens[item.headIdx];
    const form = head?.dictionaryForm || head?.surface || "";
    if (verbs.has(form) || sahen.has(form) || adjDa.has(form)) {
      const span = evidence.contentMap.get(item.headIdx);
      if (span !== undefined && spanHasDesireTail(span)) {
        return { met: false, evidenceNote: `predicate before ka is desiderative (${form}+たい)` };
      }
      return { met: true, evidenceNote: `question-taking host ${form}(idx ${item.headIdx}) directly before terminal ka, prior clause exists` };
    }
    return { met: false, evidenceNote: `predicate before ka is not question-taking (${form})` };
  }
  return { met: false, evidenceNote: "no content item before terminal ka in clause" };
}

function spanHasDesireTail(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  return isPredicateHeadTailChainRenderPlan(plan) && tailNodeHasDesire(plan.realization.root.tail);
}

function tailNodeHasDesire(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasDesire(node.inner) || tailNodeHasDesire(node.outer);
  }
  return node.ops.some((op) => op.kind === "desire");
}

function evaluateVerbObjectArgument(
  site: ReanalysisSite,
  evidence: ReanalysisEvidence
): ReanalysisConditionVerdict {
  const { tokens, layout } = evidence;
  const clauseIdx = layout.clauseIndexOfToken(site.anchorIndex);
  const clause = clauseIdx >= 0 ? layout.clauses[clauseIdx] : undefined;
  if (clause === undefined) {
    return { met: false, evidenceNote: "candidate token outside clause layout" };
  }
  const woIndex = clause.particlesOf(site.anchorIndex).find((particleIdx) => tokens[particleIdx]?.surface === "を");
  if (woIndex !== undefined) {
    return { met: true, evidenceNote: `を argument (idx ${woIndex}) owned by candidate predicate` };
  }
  return { met: false, evidenceNote: "no を argument owned by candidate predicate" };
}
