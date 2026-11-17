import { PredicateArgumentView } from "../head-tail/candidate/semantic-classifiers.js";
import { tailChainEndsInOpenConnective } from "../head-tail/lifecycle/rewrite.js";
import { tailRootClosesWithAttributiveTerminal, tailRootHasQuestionSfp } from "../head-tail/tail/predicate-root/inspect.js";
import type { AuxOpNode, TailRoot, TerminalKind } from "../head-tail/tail/predicate-root/grammar.js";
import { isToiuCarrierCandidateIu } from "../semantics/marker-roles.js";
import { isCaseParticleToken, POS01, 助詞_係助詞 } from "../../types/pos.js";
import { isCaseParticleNoToken } from "../semantics/gano-conversion.js";
import type { LookupTables } from "../lookup-tables.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { hasClauseRole, isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../types/render-plan.js";
import {
  genitiveNominalContinuationHeadIndex,
  isAttributiveHeadNounishToken,
  isPoliteMasuChainTerminalEndAt,
  isPostposedVocativeNounPhraseAt,
  type ClauseLayout
} from "./index.js";
import type { WhitespaceJunctureEvidence } from "./juncture-verdict.js";
import { enumerateClausePhrasesAfter, type ClausePhraseItem } from "./phrase-enumeration.js";
import {
  runClosesUtteranceAs,
  utteranceClosedForAttributiveProjection,
  utteranceClosureAfter,
  utteranceClosureRunAfter,
  type UtteranceClosureKind
} from "./utterance-closure.js";

export type WhitespaceAttributiveRhsWitness =
  | {
    readonly kind: "governed_rhs_np_closed";
    readonly particleIdx: number;
    readonly role: "subject" | "object";
    readonly predicateIdx: number;
  }
  | {
    readonly kind: "rhs_nominal_predicate_closed";
    readonly predicateIdx: number;
    readonly evidence: NominalPredicateEvidenceKind;
    readonly evidenceIdx: number;
    readonly closureIdx: number;
  }
  | {
    readonly kind: "rhs_predicateless_np_closed";
    readonly fragmentHeadIdx: number;
    readonly closureIdx: number;
  };

export type NominalPredicateEvidenceKind = "copula" | "copula_scope_bridge" | "nominal_question";

export interface WhitespaceAttributiveReading {
  readonly gapIdx: number;
  readonly leftIdx: number;
  readonly headIdx: number;
  readonly witness: WhitespaceAttributiveRhsWitness;
}

export type WhitespaceAttributiveReadingFacts = ReadonlyMap<number, WhitespaceAttributiveReading>;

interface ContentPlanSpan {
  readonly start: number;
  readonly consumed: number;
  readonly renderPlan: RenderPlan | null;
}

export function collectWhitespaceAttributiveReadingProposals(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  contentMap: ReadonlyMap<number, ContentPlanSpan>,
  lookups: LookupTables
): Map<number, WhitespaceAttributiveReading> {
  const proposals = new Map<number, WhitespaceAttributiveReading>();
  for (const juncture of layout.whitespaceJunctures.values()) {
    if (juncture.verdict !== "undecided" || juncture.adnominalLicense !== undefined) {
      continue;
    }
    const headIdx = juncture.cohesion.find((evidence) => evidence.kind === "attributive_head_reach")?.headIdx;
    const leftIdx = juncture.gapIdx - 1;
    if (
      headIdx === undefined ||
      leftIdx < 0 ||
      isAttributiveHeadNounishToken(tokens[juncture.gapIdx]) ||
      utteranceWitnessStandsAt(tokens, layout, contentMap, juncture, lookups) ||
      leftEndpointIsQuoteCarrierCandidate(tokens, layout, leftIdx)
    ) {
      continue;
    }
    const witness = rhsWitnessOf(tokens, layout, contentMap, lookups, leftIdx, headIdx);
    if (witness === null || leftPredicateOwnsTopic(tokens, layout, lookups, leftIdx)) {
      continue;
    }
    proposals.set(juncture.gapIdx, { gapIdx: juncture.gapIdx, leftIdx, headIdx, witness });
  }
  return proposals;
}

export function reverifiedWhitespaceAttributiveReadings(
  tokens: readonly RuntimeHaruToken[],
  proposed: WhitespaceAttributiveReadingFacts,
  layout: ClauseLayout,
  contentMap: ReadonlyMap<number, ContentPlanSpan>,
  lookups: LookupTables
): Map<number, WhitespaceAttributiveReading> {
  const kept = new Map<number, WhitespaceAttributiveReading>();
  for (const [gapIdx, reading] of proposed) {
    const license = layout.whitespaceJunctureAt(gapIdx)?.adnominalLicense;
    const witness = rhsWitnessOf(tokens, layout, contentMap, lookups, reading.leftIdx, reading.headIdx);
    if (
      license?.kind !== reading.witness.kind ||
      license.leftIdx !== reading.leftIdx ||
      license.headIdx !== reading.headIdx ||
      !layout.clauses.some((clause) => clause.kind === "relative" && clause.end === gapIdx) ||
      witness === null ||
      !sameRhsWitness(witness, reading.witness) ||
      leftPredicateOwnsTopic(tokens, layout, lookups, reading.leftIdx) ||
      !leftEndpointClosesWithAttributiveTerminal(contentMap, reading.leftIdx)
    ) {
      continue;
    }
    kept.set(gapIdx, reading);
  }
  return kept;
}

export function sameWhitespaceAttributiveReadingFacts(
  left: WhitespaceAttributiveReadingFacts,
  right: WhitespaceAttributiveReadingFacts
): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const [gapIdx, reading] of left) {
    const other = right.get(gapIdx);
    if (
      other === undefined ||
      other.leftIdx !== reading.leftIdx ||
      other.headIdx !== reading.headIdx ||
      !sameRhsWitness(other.witness, reading.witness)
    ) {
      return false;
    }
  }
  return true;
}

function utteranceWitnessStandsAt(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  contentMap: ReadonlyMap<number, ContentPlanSpan>,
  juncture: WhitespaceJunctureEvidence,
  lookups: LookupTables
): boolean {
  const leftIdx = juncture.gapIdx - 1;
  const leftPlan = contentSpanCovering(contentMap, leftIdx)?.renderPlan;
  if (utteranceClosedForAttributiveProjection(
    layout.utteranceClosureRunAt(juncture.gapIdx) ?? null,
    isPredicateHeadTailChainRenderPlan(leftPlan) ? leftPlan.realization.root.sfp?.effect ?? null : null,
    lookups.SFP_UTTERANCE_CLOSING_EFFECTS
  )) {
    return true;
  }
  if (isPoliteMasuChainTerminalEndAt(tokens, leftIdx)) {
    return true;
  }
  return juncture.boundary.some((evidence) =>
    evidence.kind === "utterance_onset" ||
    evidence.kind === "detached_noda_closure" ||
    evidence.kind === "imperative_closure" ||
    (evidence.kind === "utterance_closure_run" && evidence.run !== "formal_noun_dependent") ||
    (evidence.kind === "boundary_event" && evidence.event !== "attributive")
  );
}

function rhsWitnessOf(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  contentMap: ReadonlyMap<number, ContentPlanSpan>,
  lookups: LookupTables,
  leftIdx: number,
  headIdx: number
): WhitespaceAttributiveRhsWitness | null {
  return governedRhsWitnessOf(tokens, layout, contentMap, lookups, headIdx) ??
    nominalPredicateWitnessOf(tokens, layout, contentMap, headIdx) ??
    predicatelessNominalWitnessOf(tokens, layout, lookups, leftIdx, headIdx);
}

const PREDICATELESS_FRAGMENT_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>(["eos", "hard_terminal"]);

function predicatelessNominalWitnessOf(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  lookups: LookupTables,
  leftIdx: number,
  headIdx: number
): WhitespaceAttributiveRhsWitness | null {
  let phraseStart = headIdx;
  let phrase = firstNominalPhraseFrom(layout, tokens, phraseStart);
  while (phrase !== null) {
    if (phraseMarkerIsOwned(layout, phrase)) {
      return null;
    }
    const last = phrase.span.endExclusive - 1;
    const continuationHeadIdx = phrase.markerParticleIdx !== null && isCaseParticleNoToken(tokens[last])
      ? genitiveNominalContinuationHeadIndex(tokens, last + 1, lookups)
      : null;
    if (continuationHeadIdx === null) {
      break;
    }
    phraseStart = continuationHeadIdx;
    phrase = firstNominalPhraseFrom(layout, tokens, phraseStart);
  }
  if (
    phrase === null ||
    isPostposedVocativeNounPhraseAt(tokens, phraseStart, lookups) ||
    leftPredicateOwnsSameCaseNounArgument(tokens, layout, lookups, leftIdx, phrase)
  ) {
    return null;
  }
  const closureIdx = phrase.span.endExclusive;
  if (!runClosesUtteranceAs(utteranceClosureRunAfter(layout, tokens, closureIdx), PREDICATELESS_FRAGMENT_CLOSURES)) {
    return null;
  }
  return { kind: "rhs_predicateless_np_closed", fragmentHeadIdx: phrase.headIdx, closureIdx };
}

function leftPredicateOwnsSameCaseNounArgument(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  lookups: LookupTables,
  leftIdx: number,
  fragment: ClausePhraseItem
): boolean {
  const head = tokens[fragment.headIdx];
  const marker = fragment.markerParticleIdx === null ? undefined : tokens[fragment.markerParticleIdx];
  const predicateIdx = layout.clauseOfToken(leftIdx)?.predicates.findLast((predicate) => predicate <= leftIdx);
  if (head === undefined || marker === undefined || !isCaseParticleToken(marker) || predicateIdx === undefined) {
    return false;
  }
  return new PredicateArgumentView(tokens, predicateIdx, { layout, lookups })
    .arguments()
    .some((argument) =>
      !argument.borrowed &&
      argument.noun !== null &&
      argument.noun.dictionaryForm === head.dictionaryForm &&
      argument.particle.surface === marker.surface
    );
}

function firstNominalPhraseFrom(
  layout: ClauseLayout,
  tokens: readonly RuntimeHaruToken[],
  headIdx: number
): ClausePhraseItem | null {
  const phrase = enumerateClausePhrasesAfter(layout, tokens, headIdx - 1, { scope: "clause" }).next().value;
  return phrase !== undefined && phrase.kind === "nominal" && phrase.headIdx >= headIdx ? phrase : null;
}

function phraseMarkerIsOwned(layout: ClauseLayout, phrase: ClausePhraseItem): boolean {
  if (phrase.markerParticleIdx === null) {
    return false;
  }
  for (let particleIdx = phrase.markerParticleIdx; particleIdx < phrase.span.endExclusive; particleIdx += 1) {
    if (layout.ownerPredicateOfParticle(particleIdx) !== undefined) {
      return true;
    }
  }
  return false;
}

function nominalPredicateWitnessOf(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  contentMap: ReadonlyMap<number, ContentPlanSpan>,
  headIdx: number
): WhitespaceAttributiveRhsWitness | null {
  const plan = contentSpanCovering(contentMap, headIdx)?.renderPlan;
  if (
    !hasClauseRole(plan) ||
    !isPredicateHeadTailChainRenderPlan(plan) ||
    plan.clauseRole.predicateTokenIdx !== headIdx
  ) {
    return null;
  }
  const root = plan.realization.root;
  const layer = root.tail.kind === "auxLayer" ? root.tail : null;
  if (
    layer === null ||
    layer.stem.sourcePredicateShape !== "nominal" ||
    !FINITE_CLOSING_TERMINALS.has(layer.terminal)
  ) {
    return null;
  }
  const evidence = nominalPredicateEvidenceOf(layer.ops, root, plan.clauseRole.tokenSpan.end);
  if (evidence === null || !predicateClosesUtterance(tokens, layout, contentMap, headIdx)) {
    return null;
  }
  return {
    kind: "rhs_nominal_predicate_closed",
    predicateIdx: headIdx,
    evidence: evidence.kind,
    evidenceIdx: evidence.idx,
    closureIdx: plan.clauseRole.tokenSpan.end
  };
}

const FINITE_CLOSING_TERMINALS: ReadonlySet<TerminalKind | null> = new Set<TerminalKind | null>([
  null, "predicative", "ka_question", "volitional"
]);

function nominalPredicateEvidenceOf(
  ops: readonly AuxOpNode[],
  root: TailRoot,
  spanEnd: number
): { readonly kind: NominalPredicateEvidenceKind; readonly idx: number } | null {
  for (const op of ops) {
    if (op.kind === "copula" || op.kind === "scopeBridge") {
      return {
        kind: op.kind === "copula" ? "copula" : "copula_scope_bridge",
        idx: op.source.tokenIndices[0] ?? spanEnd
      };
    }
  }
  return tailRootHasQuestionSfp(root) ? { kind: "nominal_question", idx: spanEnd } : null;
}

function governedRhsWitnessOf(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  contentMap: ReadonlyMap<number, ContentPlanSpan>,
  lookups: LookupTables,
  headIdx: number
): WhitespaceAttributiveRhsWitness | null {
  const phrase = enumerateClausePhrasesAfter(layout, tokens, headIdx - 1, { scope: "clause" }).next().value;
  if (phrase === undefined || phrase.kind !== "nominal" || phrase.markerParticleIdx === null || phrase.headIdx < headIdx) {
    return null;
  }
  for (let particleIdx = phrase.markerParticleIdx; particleIdx < phrase.span.endExclusive; particleIdx += 1) {
    const predicateIdx = layout.ownerPredicateOfParticle(particleIdx);
    if (predicateIdx === undefined || predicateIdx <= particleIdx || isCaseParticleNoToken(tokens[particleIdx])) {
      continue;
    }
    const argument = new PredicateArgumentView(tokens, predicateIdx, { layout, lookups })
      .arguments()
      .find((candidate) => candidate.particleIdx === particleIdx);
    if (
      argument === undefined ||
      argument.borrowed ||
      argument.origin !== "owned_particle" ||
      (argument.role !== "subject" && argument.role !== "object")
    ) {
      continue;
    }
    return predicateClosesUtterance(tokens, layout, contentMap, predicateIdx)
      ? { kind: "governed_rhs_np_closed", particleIdx, role: argument.role, predicateIdx }
      : null;
  }
  return null;
}

function predicateClosesUtterance(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  contentMap: ReadonlyMap<number, ContentPlanSpan>,
  predicateIdx: number
): boolean {
  const plan = contentSpanCovering(contentMap, predicateIdx)?.renderPlan;
  if (
    !hasClauseRole(plan) ||
    !isPredicateHeadTailChainRenderPlan(plan) ||
    plan.clauseRole.outgoingBoundary.kind !== "terminal" ||
    tailChainEndsInOpenConnective(plan)
  ) {
    return false;
  }
  const closure = utteranceClosureAfter(layout, tokens, plan.clauseRole.tokenSpan.end + 1).closure;
  return closure === "eos" || closure === "hard_terminal";
}

function leftEndpointIsQuoteCarrierCandidate(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  leftIdx: number
): boolean {
  if (isToiuCarrierCandidateIu(tokens, leftIdx)) {
    return true;
  }
  const predicateIdx = layout.clauseOfToken(leftIdx)?.predicates.findLast((predicate) => predicate <= leftIdx);
  return predicateIdx !== undefined && isToiuCarrierCandidateIu(tokens, predicateIdx);
}

function leftEndpointClosesWithAttributiveTerminal(
  contentMap: ReadonlyMap<number, ContentPlanSpan>,
  leftIdx: number
): boolean {
  const plan = contentSpanCovering(contentMap, leftIdx)?.renderPlan;
  return isPredicateHeadTailChainRenderPlan(plan) && tailRootClosesWithAttributiveTerminal(plan.realization.root);
}

function leftPredicateOwnsTopic(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  lookups: LookupTables,
  leftIdx: number
): boolean {
  const predicateIdx = layout.clauseOfToken(leftIdx)?.predicates.findLast((predicate) => predicate <= leftIdx);
  if (predicateIdx === undefined) {
    return false;
  }
  return new PredicateArgumentView(tokens, predicateIdx, { layout, lookups })
    .arguments()
    .some((argument) =>
      !argument.borrowed &&
      argument.origin === "topic_focus" &&
      isTopicWaParticle(argument.particle) &&
      argument.role !== "oblique" &&
      argument.role !== "prefixed_focus"
    );
}

function isTopicWaParticle(token: { readonly surface: string; readonly pos: number }): boolean {
  return (token.pos & POS01) === 助詞_係助詞 && token.surface === "は";
}

function sameRhsWitness(left: WhitespaceAttributiveRhsWitness, right: WhitespaceAttributiveRhsWitness): boolean {
  if (left.kind === "governed_rhs_np_closed") {
    return right.kind === "governed_rhs_np_closed" &&
      left.particleIdx === right.particleIdx && left.role === right.role && left.predicateIdx === right.predicateIdx;
  }
  if (left.kind === "rhs_predicateless_np_closed") {
    return right.kind === "rhs_predicateless_np_closed" &&
      left.fragmentHeadIdx === right.fragmentHeadIdx && left.closureIdx === right.closureIdx;
  }
  return right.kind === "rhs_nominal_predicate_closed" &&
    left.predicateIdx === right.predicateIdx &&
    left.evidence === right.evidence &&
    left.evidenceIdx === right.evidenceIdx &&
    left.closureIdx === right.closureIdx;
}

function contentSpanCovering(contentMap: ReadonlyMap<number, ContentPlanSpan>, idx: number): ContentPlanSpan | undefined {
  for (const span of contentMap.values()) {
    if (span.start <= idx && idx < span.start + Math.max(1, span.consumed)) {
      return span;
    }
  }
  return undefined;
}
