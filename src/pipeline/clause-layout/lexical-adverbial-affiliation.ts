import type { LookupTables } from "../lookup-tables.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { TokenCursor } from "../token-cursor.js";
import {
  teBenefactiveContinuationMetadataForToken,
  teDeContinuationRelationAt
} from "../head-tail/tail/postverb-tail-classifier.js";
import { matchYouNiPredicateProjectionConnectiveAt } from "../head-tail/tail/predicate-root/matchers/predicate-projection-connective.js";
import { isSahenLightVerbCarrierToken } from "../head-tail/tail/predicate-root/integration/readiness.js";
import { quoteStructuralRelationsForHost } from "../structural-relation/quote.js";
import {
  POS0,
  POS4,
  POS5A,
  仮定形_,
  代名詞,
  副詞,
  助詞,
  助動詞,
  助動詞_タ,
  動詞,
  名詞,
  形容詞0,
  形状詞,
  接頭辞,
  連体詞,
  空白,
  補助記号,
  命令形_,
  連用形_,
  isDesireAuxiliaryPos,
  isImperativeInflection,
  isNonIndependentVerbToken,
  isRenyouInflection,
  isSahenCapableNominal
} from "../../types/pos.js";
import { teUtteranceFinalLeftAt } from "./chuushi-closure.js";
import { isAdverbialKeijoujiMarkerHostPos } from "./adverbial-host.js";
import { isClauseEvidenceTransparentPunctuation } from "./punctuation.js";
import { teIisashiSignalsAt, terminalPunctuationRunQuestionIndex, type TeUtteranceActLookupSets } from "./speech-act.js";
import { isSourceSeparatedFromPreviousToken, nextNonSpaceIndex, previousNonSpaceIndex, separatedAs } from "./trivia.js";
import type { SeparationKind } from "../../types/token.js";
import { isQuestionParticleKaToken } from "../head-tail/boundary/marker.js";
import { isKaDouKaMarker } from "../head-tail/boundary/ka-ownership.js";
import type { Clause, ClauseLayout } from "./final-layout.js";
import { isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../types/render-plan.js";
import { enumerateClausePhrasesAfter, type ClausePhraseItem } from "./phrase-enumeration.js";
import { utteranceClosureRunAfter, type UtteranceClosureKind } from "./utterance-closure.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { PredicateArgumentView } from "../head-tail/candidate/semantic-classifiers.js";
import { auxOpsInTailNode, firstAuxLayer } from "../head-tail/tail/predicate-root/inspect.js";
import { isHeadOp } from "../head-tail/tail/predicate-root/operator-head.js";
import type { TailNode } from "../head-tail/tail/predicate-root/grammar.js";

export type RequestModalForce =
  | "imperative"
  | "performative"
  | "te_request"
  | "te_desiderative"
  | "receive_wish"
  | "benefactive_question"
  | "optative"
  | "te_ellipsis";

export type LexicalAdverbialAffiliationRelation = "request_adjunct" | "question_complement" | "unresolved";

export type LexicalAdverbialAffiliationEvidence =
  | EllipticRequestFragmentEvidence
  | {
    readonly kind: "intervening_clause_path";
    readonly sourcePredicateIdx: number;
    readonly ownerPredicateIdx: number;
    readonly force: RequestModalForce;
    readonly steps: readonly LexicalAdverbialBindingStep[];
  }
  | {
    readonly kind: "first_predicate_chain";
    readonly chainStartIdx: number;
    readonly anchorIdx: number | null;
    readonly force: RequestModalForce | null;
    readonly intervening: readonly InterveningMaterialKind[];
  }
  | {
    readonly kind: "no_predicate_chain";
    readonly stop: "utterance_closed" | "delimiter" | "chunk_break" | "pause_boundary" | "end";
    readonly stopIdx: number | null;
  }
  | {
    readonly kind: "not_adjunct_position";
    readonly reason: "ka_dou_ka_marker" | "particle_chain" | "topic_subject_host" | "claim_shape";
  };

export type EllipticRequestResidueKind = "object" | "state_adverbial";

export type EllipticRequestFragmentClosure = "eos" | "hard_terminal" | "matched_delimiter_close" | "unmatched_trailing";

export interface EllipticRequestFragmentEvidence {
  readonly kind: "elliptic_request_fragment";
  readonly residue: EllipticRequestResidueKind;
  readonly residueStart: number;
  readonly markerIdx: number;
  readonly closure: EllipticRequestFragmentClosure;
  readonly target: "elided_predicate";
}

export type InterveningMaterialKind = "nominal" | "particle" | "adverbial" | "weak_punctuation" | "other";

export type LexicalAdverbialBindingStep =
  | { readonly kind: "relative_argument"; readonly sourceClauseIdx: number; readonly sourcePredicateIdx: number;
    readonly parentClauseIdx: number; readonly headIdx: number; readonly markerIdx: number; readonly targetPredicateIdx: number }
  | { readonly kind: "te_connection"; readonly sourceClauseIdx: number; readonly sourcePredicateIdx: number;
    readonly connectiveIdx: number; readonly role: string; readonly targetPredicateIdx: number };

type AffiliationContentMap = ReadonlyMap<number, {
  readonly start: number; readonly consumed: number; readonly renderPlan?: RenderPlan | null;
}>;

export function sameLexicalAdverbialAffiliation(
  left: LexicalAdverbialAffiliation,
  right: LexicalAdverbialAffiliation,
  options: { readonly includeClauseOrdinals: boolean }
): boolean {
  return left.headIdx === right.headIdx &&
    left.particleIdx === right.particleIdx &&
    left.predicateIdx === right.predicateIdx &&
    left.relation === right.relation &&
    sameAffiliationEvidence(left.evidence, right.evidence, options.includeClauseOrdinals);
}

function sameAffiliationEvidence(
  left: LexicalAdverbialAffiliationEvidence,
  right: LexicalAdverbialAffiliationEvidence,
  includeClauseOrdinals: boolean
): boolean {
  switch (left.kind) {
    case "intervening_clause_path":
      return right.kind === left.kind &&
        left.sourcePredicateIdx === right.sourcePredicateIdx &&
        left.ownerPredicateIdx === right.ownerPredicateIdx &&
        left.force === right.force &&
        left.steps.length === right.steps.length &&
        left.steps.every((step, idx) => sameBindingStep(step, right.steps[idx]!, includeClauseOrdinals));
    case "first_predicate_chain":
      return right.kind === left.kind &&
        left.chainStartIdx === right.chainStartIdx &&
        left.anchorIdx === right.anchorIdx &&
        left.force === right.force &&
        left.intervening.length === right.intervening.length &&
        left.intervening.every((material, idx) => material === right.intervening[idx]);
    case "no_predicate_chain":
      return right.kind === left.kind && left.stop === right.stop && left.stopIdx === right.stopIdx;
    case "not_adjunct_position":
      return right.kind === left.kind && left.reason === right.reason;
    case "elliptic_request_fragment":
      return right.kind === left.kind &&
        left.residue === right.residue &&
        left.residueStart === right.residueStart &&
        left.markerIdx === right.markerIdx &&
        left.closure === right.closure;
  }
}

function sameBindingStep(
  left: LexicalAdverbialBindingStep,
  right: LexicalAdverbialBindingStep,
  includeClauseOrdinals: boolean
): boolean {
  if (left.sourcePredicateIdx !== right.sourcePredicateIdx || left.targetPredicateIdx !== right.targetPredicateIdx) {
    return false;
  }
  if (includeClauseOrdinals && left.sourceClauseIdx !== right.sourceClauseIdx) {
    return false;
  }
  switch (left.kind) {
    case "relative_argument":
      return right.kind === left.kind &&
        left.headIdx === right.headIdx &&
        left.markerIdx === right.markerIdx &&
        (!includeClauseOrdinals || left.parentClauseIdx === right.parentClauseIdx);
    case "te_connection":
      return right.kind === left.kind && left.connectiveIdx === right.connectiveIdx && left.role === right.role;
  }
}

export function collectInterveningClauseAffiliations(
  tokens: readonly RuntimeHaruToken[],
  initial: ReadonlyMap<number, LexicalAdverbialAffiliation>,
  layout: ClauseLayout,
  contentMap: AffiliationContentMap,
  lookups: LookupTables,
  questionOwnedHeads: ReadonlySet<number>
): ReadonlyMap<number, LexicalAdverbialAffiliation> {
  const result = new Map<number, LexicalAdverbialAffiliation>();
  for (const [particleIdx, affiliation] of initial) {
    if (
      affiliation.relation !== "unresolved" ||
      affiliation.evidence.kind !== "first_predicate_chain" ||
      affiliation.predicateIdx === null ||
      questionOwnedHeads.has(affiliation.headIdx)
    ) {
      continue;
    }
    const sourcePredicateIdx = headTailPredicateSpanContaining(contentMap, layout, affiliation.predicateIdx);
    if (sourcePredicateIdx === null) {
      continue;
    }
    const path = interveningClausePathToRequest(tokens, affiliation.headIdx, sourcePredicateIdx, layout, contentMap, lookups);
    if (path !== null) {
      result.set(particleIdx, { ...affiliation, relation: "request_adjunct", predicateIdx: path.lexicalIdx, evidence: path.evidence });
    }
  }
  return result;
}

export function collectEllipticRequestFragmentAffiliations(
  tokens: readonly RuntimeHaruToken[],
  initial: ReadonlyMap<number, LexicalAdverbialAffiliation>,
  layout: ClauseLayout,
  questionOwnedHeads: ReadonlySet<number>
): ReadonlyMap<number, LexicalAdverbialAffiliation> {
  const result = new Map<number, LexicalAdverbialAffiliation>();
  for (const [particleIdx, affiliation] of initial) {
    if (
      affiliation.relation !== "unresolved" ||
      affiliation.evidence.kind !== "no_predicate_chain" ||
      questionOwnedHeads.has(affiliation.headIdx)
    ) {
      continue;
    }
    const evidence = ellipticRequestFragmentAfter(tokens, layout, particleIdx, affiliation.evidence.stopIdx ?? tokens.length);
    if (evidence !== null) {
      result.set(particleIdx, {
        kind: affiliation.kind,
        headIdx: affiliation.headIdx,
        particleIdx: affiliation.particleIdx,
        predicateIdx: null,
        relation: "request_adjunct",
        evidence
      });
    }
  }
  return result;
}

const ELLIPTIC_REQUEST_FRAGMENT_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<EllipticRequestFragmentClosure>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing"
]);

function ellipticRequestFragmentAfter(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  particleIdx: number,
  stopIdx: number
): EllipticRequestFragmentEvidence | null {
  const markerIdx = previousNonSpaceIndex(tokens, stopIdx);
  if (markerIdx === null || markerIdx <= particleIdx) {
    return null;
  }
  let residue: ClausePhraseItem | null = null;
  for (const item of enumerateClausePhrasesAfter(layout, tokens, particleIdx, { scope: "evidence_window" })) {
    if (item.span.start > markerIdx) {
      break;
    }
    residue = item;
  }
  if (residue === null || residue.span.endExclusive !== markerIdx + 1) {
    return null;
  }
  let kind: EllipticRequestResidueKind;
  let residueStart: number;
  if (
    residue.kind === "nominal" &&
    residue.markerParticleIdx === markerIdx &&
    caseParticleMarkerRelationForToken(tokens[markerIdx], markerIdx, { acceptedSurfaces: ["を"], consumers: ["clause_layout"] }) !== null
  ) {
    kind = "object";
    residueStart = residue.span.start;
  } else if (isAdverbialKeijoujiMarkerAt(tokens, markerIdx)) {
    const hostIdx = previousNonSpaceIndex(tokens, markerIdx);
    if (hostIdx === null || hostIdx <= particleIdx) {
      return null;
    }
    kind = "state_adverbial";
    residueStart = hostIdx;
  } else {
    return null;
  }
  const closure = utteranceClosureRunAfter(layout, tokens, markerIdx + 1).closures
    .map((evidence) => evidence.closure)
    .find((closureKind): closureKind is EllipticRequestFragmentClosure => ELLIPTIC_REQUEST_FRAGMENT_CLOSURES.has(closureKind));
  if (closure === undefined) {
    return null;
  }
  return {
    kind: "elliptic_request_fragment",
    residue: kind,
    residueStart,
    markerIdx,
    closure,
    target: "elided_predicate"
  };
}

function headTailPredicateSpanContaining(
  contentMap: AffiliationContentMap,
  layout: ClauseLayout,
  tokenIdx: number
): number | null {
  for (const [start, span] of contentMap) {
    if (
      start <= tokenIdx &&
      tokenIdx < start + span.consumed &&
      layout.clauseOfPredicate(start) !== undefined &&
      isPredicateHeadTailChainRenderPlan(span.renderPlan)
    ) {
      return start;
    }
  }
  return null;
}

function interveningClausePathToRequest(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number,
  sourcePredicateIdx: number,
  layout: ClauseLayout,
  contentMap: AffiliationContentMap,
  lookups: LookupTables
): {
  readonly lexicalIdx: number;
  readonly evidence: Extract<LexicalAdverbialAffiliationEvidence, { readonly kind: "intervening_clause_path" }>;
} | null {
  const steps: LexicalAdverbialBindingStep[] = [];
  const visited = new Set<number>();
  let predicateIdx = sourcePredicateIdx;
  while (!visited.has(predicateIdx)) {
    visited.add(predicateIdx);
    const span = contentMap.get(predicateIdx);
    const plan = span?.renderPlan;
    if (span === undefined || !isPredicateHeadTailChainRenderPlan(plan)) {
      return null;
    }
    const request = requestForceInPredicateSpan(tokens, plan.realization.root.tail, predicateIdx, predicateIdx + span.consumed, lookups);
    if (request !== null) {
      if (steps.length === 0) {
        return null;
      }
      const stem = firstAuxLayer(plan.realization.root.tail)?.stem;
      const lexicalIdx = stem?.source.tokenIndices[stem.semanticAnchors[0] ?? stem.conjugationAnchor] ?? predicateIdx;
      return {
        lexicalIdx,
        evidence: { kind: "intervening_clause_path", sourcePredicateIdx, ownerPredicateIdx: predicateIdx, force: request.force, steps }
      };
    }
    const clause = layout.clauseOfPredicate(predicateIdx);
    const clauseIdx = layout.clauseIndexOfPredicate(predicateIdx);
    if (clause === undefined || clauseIdx === undefined) {
      return null;
    }
    let step: LexicalAdverbialBindingStep | null = null;
    if (clause.kind === "relative" && clause.terminatedBy === "attributive" && clause.parentIdx !== null) {
      step = relativeArgumentStep(tokens, layout, lookups, clause, clauseIdx, predicateIdx);
    } else if (clause.kind === "subordinate" && clause.terminatedBy === "connective") {
      step = teConnectionStep(layout, clause, clauseIdx, predicateIdx, span.consumed);
    }
    if (step === null || step.targetPredicateIdx <= predicateIdx || !layout.sameQuoteScope(headIdx, step.targetPredicateIdx)) {
      return null;
    }
    steps.push(step);
    predicateIdx = step.targetPredicateIdx;
  }
  return null;
}

function requestForceInPredicateSpan(
  tokens: readonly RuntimeHaruToken[],
  tail: TailNode,
  start: number,
  end: number,
  lookups: LookupTables
): { readonly anchorIdx: number; readonly force: RequestModalForce } | null {
  const chainStart = predicateChainStartWithin(tokens, start, end);
  if (chainStart === null) {
    return null;
  }
  const walkStarts = [chainStart];
  for (const op of auxOpsInTailNode(tail)) {
    const headEnd = op.source.tokenIndices.at(-1);
    if (isHeadOp(op) && headEnd !== undefined && headEnd > walkStarts.at(-1)! && headEnd < end) {
      walkStarts.push(headEnd);
    }
  }
  for (const walkStart of walkStarts) {
    const request = requestModalForceInChain(tokens, walkStart, lookups, end);
    if (request !== null) {
      return request;
    }
  }
  return null;
}

function relativeArgumentStep(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  lookups: LookupTables,
  clause: Clause,
  clauseIdx: number,
  predicateIdx: number
): LexicalAdverbialBindingStep | null {
  const parent = layout.parentOf(clauseIdx);
  if (
    parent === undefined ||
    clause.parentIdx === null ||
    parent.start !== clause.end ||
    !clause.canBindAttributiveHead(predicateIdx) ||
    layout.predicateBeforeNominalClosure(parent.start) !== predicateIdx
  ) {
    return null;
  }
  const phrase = enumerateClausePhrasesAfter(layout, tokens, parent.start - 1, { scope: "clause" }).next().value;
  if (
    phrase === undefined ||
    phrase.kind !== "nominal" ||
    phrase.span.start !== parent.start ||
    phrase.markerParticleIdx === null
  ) {
    return null;
  }
  const markerIdx = phrase.markerParticleIdx;
  const ownsMarker = (owner: number): boolean =>
    new PredicateArgumentView(tokens, owner, { layout, lookups })
      .arguments()
      .some((argument) => !argument.borrowed && argument.origin !== "relative_head" && argument.particleIdx === markerIdx);
  const particleOwner = layout.ownerPredicateOfParticle(markerIdx);
  const owners = particleOwner === undefined ? parent.predicates.filter(ownsMarker) : [particleOwner];
  const owner = owners.length === 1 ? owners[0]! : undefined;
  if (owner === undefined || !ownsMarker(owner)) {
    return null;
  }
  return {
    kind: "relative_argument",
    sourceClauseIdx: clauseIdx,
    sourcePredicateIdx: predicateIdx,
    parentClauseIdx: clause.parentIdx,
    headIdx: phrase.headIdx,
    markerIdx,
    targetPredicateIdx: owner
  };
}

function teConnectionStep(
  layout: ClauseLayout,
  clause: Clause,
  clauseIdx: number,
  predicateIdx: number,
  consumed: number
): LexicalAdverbialBindingStep | null {
  const closure = layout.chuushiClosureAt(clause.end);
  const role = layout.connectiveRoles.get(predicateIdx);
  if (closure?.hostKind !== "te" || closure.right !== "governed" || role === undefined) {
    return null;
  }
  if (closure.predicateIdx < predicateIdx || closure.predicateIdx >= predicateIdx + consumed) {
    return null;
  }
  const target = layout.clauses[clauseIdx + 1]?.primaryPredicate;
  if (target === null || target === undefined) {
    return null;
  }
  return {
    kind: "te_connection",
    sourceClauseIdx: clauseIdx,
    sourcePredicateIdx: predicateIdx,
    connectiveIdx: closure.connectiveIdx,
    role,
    targetPredicateIdx: target
  };
}

interface LexicalAdverbialAffiliationBase {
  readonly kind: "lexicalAdverbialAffiliation";
  readonly headIdx: number;
  readonly particleIdx: number;
}

export type LexicalAdverbialAffiliation =
  | (LexicalAdverbialAffiliationBase & {
    readonly predicateIdx: number | null;
    readonly relation: LexicalAdverbialAffiliationRelation;
    readonly evidence: Exclude<LexicalAdverbialAffiliationEvidence, EllipticRequestFragmentEvidence>;
  })
  | (LexicalAdverbialAffiliationBase & {
    readonly predicateIdx: null;
    readonly relation: "request_adjunct";
    readonly evidence: EllipticRequestFragmentEvidence;
  });

export interface LexicalAdverbialAffiliationClaim {
  readonly headIdx: number;
  readonly particleIdx: number;
  readonly particle: string;
  readonly followingRequestOrImperative?: boolean;
}

const CHUNK_BREAK: ReadonlySet<SeparationKind> = new Set<SeparationKind>(["chunk_break"]);
const NOMINAL_LIKE_POS0: ReadonlySet<number> = new Set<number>([名詞, 代名詞, 形状詞, 接頭辞, 連体詞]);

export function collectLexicalAdverbialAffiliations(
  tokens: readonly RuntimeHaruToken[],
  claims: readonly LexicalAdverbialAffiliationClaim[],
  lookups: LookupTables
): ReadonlyMap<number, LexicalAdverbialAffiliation> {
  const affiliations = new Map<number, LexicalAdverbialAffiliation>();
  for (const claim of claims) {
    if (claim.followingRequestOrImperative !== true || affiliations.has(claim.particleIdx)) {
      continue;
    }
    affiliations.set(claim.particleIdx, affiliationForClaim(tokens, claim, lookups));
  }
  return affiliations;
}

function affiliationForClaim(
  tokens: readonly RuntimeHaruToken[],
  claim: LexicalAdverbialAffiliationClaim,
  lookups: LookupTables
): LexicalAdverbialAffiliation {
  const base = { kind: "lexicalAdverbialAffiliation" as const, headIdx: claim.headIdx, particleIdx: claim.particleIdx };
  const notAdjunct = adjunctPositionFailure(tokens, claim);
  if (notAdjunct !== null) {
    return { ...base, predicateIdx: null, relation: "unresolved", evidence: { kind: "not_adjunct_position", reason: notAdjunct } };
  }
  const walk = firstPredicateChainStart(tokens, claim.particleIdx);
  if (walk.kind === "stop") {
    return {
      ...base,
      predicateIdx: null,
      relation: "unresolved",
      evidence: { kind: "no_predicate_chain", stop: walk.stop, stopIdx: walk.stopIdx }
    };
  }
  const chain = requestModalForceInChain(tokens, walk.startIdx, lookups);
  return {
    ...base,
    predicateIdx: chainLexicalAnchor(tokens, walk.startIdx, lookups),
    relation: chain === null ? "unresolved" : "request_adjunct",
    evidence: {
      kind: "first_predicate_chain",
      chainStartIdx: walk.startIdx,
      anchorIdx: chain?.anchorIdx ?? null,
      force: chain?.force ?? null,
      intervening: walk.intervening
    }
  };
}

function adjunctPositionFailure(
  tokens: readonly RuntimeHaruToken[],
  claim: LexicalAdverbialAffiliationClaim
): "ka_dou_ka_marker" | "particle_chain" | "topic_subject_host" | "claim_shape" | null {
  if (claim.headIdx < 0 || claim.particleIdx !== claim.headIdx + 1) {
    return "claim_shape";
  }
  const head = tokens[claim.headIdx];
  const particle = tokens[claim.particleIdx];
  if (head === undefined || particle === undefined || particle.surface !== claim.particle) {
    return "claim_shape";
  }
  if (isKaDouKaMarker(tokens, claim.particleIdx)) {
    return "ka_dou_ka_marker";
  }
  const next = tokens[claim.particleIdx + 1];
  if (next !== undefined && (next.pos & POS0) === 助詞 && !isSourceSeparatedFromPreviousToken(tokens, claim.particleIdx + 1)) {
    return "particle_chain";
  }
  const previous = previousNonSpaceIndex(tokens, claim.headIdx);
  const previousToken = previous === null ? undefined : tokens[previous];
  if (
    previous !== null &&
    previousToken !== undefined &&
    (previousToken.pos & POS0) === 助詞 &&
    (previousToken.surface === "は" || previousToken.surface === "が" || previousToken.surface === "も")
  ) {
    const hostIdx = previousNonSpaceIndex(tokens, previous);
    const hostIsParticle = hostIdx !== null && ((tokens[hostIdx]?.pos ?? 0) & POS0) === 助詞;
    if (!hostIsParticle) {
      return "topic_subject_host";
    }
  }
  return null;
}

type ChainStartWalk =
  | { readonly kind: "chain"; readonly startIdx: number; readonly intervening: readonly InterveningMaterialKind[] }
  | {
    readonly kind: "stop";
    readonly stop: "utterance_closed" | "delimiter" | "chunk_break" | "pause_boundary" | "end";
    readonly stopIdx: number | null;
  };

function firstPredicateChainStart(
  tokens: readonly RuntimeHaruToken[],
  particleIdx: number
): ChainStartWalk {
  const intervening: InterveningMaterialKind[] = [];
  const note = (kind: InterveningMaterialKind): void => {
    if (!intervening.includes(kind)) {
      intervening.push(kind);
    }
  };
  for (let idx = particleIdx + 1; idx < tokens.length; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      break;
    }
    if (separatedAs(tokens, idx, CHUNK_BREAK)) {
      return { kind: "stop", stop: "chunk_break", stopIdx: idx };
    }
    if ((tokens[idx - 1]?.transparentPauseRunAfter?.boundaryEvidence.length ?? 0) > 0) {
      return { kind: "stop", stop: "pause_boundary", stopIdx: idx };
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 空白) {
      continue;
    }
    if (pos0 === 補助記号) {
      if (isClauseEvidenceTransparentPunctuation(token)) {
        note("weak_punctuation");
        continue;
      }
      return { kind: "stop", stop: "delimiter", stopIdx: idx };
    }
    if (isAdverbialKeijoujiMarkerAt(tokens, idx)) {
      note("adverbial");
      continue;
    }
    if (isPredicateChainEvidenceToken(token)) {
      return { kind: "chain", startIdx: idx, intervening };
    }
    note(pos0 === 助詞 ? "particle" : pos0 === 副詞 ? "adverbial" : NOMINAL_LIKE_POS0.has(pos0) ? "nominal" : "other");
  }
  return { kind: "stop", stop: "end", stopIdx: null };
}

function isPredicateChainEvidenceToken(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 動詞 || pos0 === 形容詞0 || pos0 === 助動詞;
}

function predicateChainStartWithin(tokens: readonly RuntimeHaruToken[], start: number, end: number): number | null {
  for (let idx = start; idx < end; idx += 1) {
    const token = tokens[idx];
    if (token !== undefined && isPredicateChainEvidenceToken(token) && !isAdverbialKeijoujiMarkerAt(tokens, idx)) {
      return idx;
    }
  }
  return null;
}

function isAdverbialKeijoujiMarkerAt(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const marker = tokens[idx];
  if (
    marker === undefined ||
    (marker.pos & (POS0 | POS5A)) !== (助動詞 | 連用形_) ||
    marker.dictionaryForm !== "だ" ||
    marker.surface !== "に"
  ) {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, idx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  return host !== undefined && isAdverbialKeijoujiMarkerHostPos(host);
}

function requestModalForceInChain(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  lookups: LookupTables,
  end: number = tokens.length
): { readonly anchorIdx: number; readonly force: RequestModalForce } | null {
  const teRequestSets: TeUtteranceActLookupSets = {
    reportHostVerbs: lookups.SPEECH_ACT_TE_IISASHI_REPORT_HOST_VERBS,
    nonvolitionalVerbs: lookups.SPEECH_ACT_TE_IISASHI_NONVOLITIONAL_VERBS,
    stativeOperatorForms: lookups.SPEECH_ACT_TE_IISASHI_STATIVE_OPERATOR_FORMS
  };
  let idx = startIdx;
  for (let guard = 0; guard < tokens.length && idx < end; guard += 1) {
    const force = requestModalForceAt(new TokenCursor(tokens, idx, end), lookups, teRequestSets);
    if (force !== null) {
      return { anchorIdx: idx, force };
    }
    const tailPos = auxChainEndAfter(tokens, (tokens[idx]!.pos & POS0) === 助動詞 ? idx : idx + 1, end);
    const relation = teDeContinuationRelationAt(tokens, tailPos, { consumers: ["clause_layout"], lookups });
    if (relation !== null && relation.continuationIdx > idx) {
      idx = relation.continuationIdx;
      continue;
    }
    const last = tokens[tailPos - 1];
    const next = tokens[tailPos];
    if (
      tailPos > idx &&
      last !== undefined &&
      isRenyouInflection(last.pos) &&
      next !== undefined &&
      isNonIndependentVerbToken(next) &&
      !isSourceSeparatedFromPreviousToken(tokens, tailPos)
    ) {
      idx = tailPos;
      continue;
    }
    return null;
  }
  return null;
}

function chainLexicalAnchor(tokens: readonly RuntimeHaruToken[], startIdx: number, lookups: LookupTables): number {
  const start = tokens[startIdx];
  if (start !== undefined && isSahenLightVerbCarrierToken(start, lookups) && !isSourceSeparatedFromPreviousToken(tokens, startIdx)) {
    const previous = tokens[startIdx - 1];
    if (previous !== undefined && isSahenCapableNominal(previous)) {
      return startIdx - 1;
    }
  }
  const previous = tokens[startIdx - 1];
  if (
    start !== undefined &&
    (start.pos & POS0) === 助動詞 &&
    previous !== undefined &&
    isAdverbialKeijoujiMarkerHostPos(previous)
  ) {
    return startIdx - 1;
  }
  return startIdx;
}

export function requestModalForceAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  teRequestSets: TeUtteranceActLookupSets
): RequestModalForce | null {
  const { tokens, pos: idx, end } = cursor;
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) === 補助記号) {
    return null;
  }
  const auxEnd = auxChainEndAfter(tokens, idx + 1, end);
  if ((token.pos & POS5A) === 命令形_ || imperativeAuxiliaryIn(tokens, idx + 1, auxEnd)) {
    return "imperative";
  }
  if (isRequestPerformativeAt(tokens, idx, lookups)) {
    return "performative";
  }
  if (optativeWishTerminalAt(tokens, idx, end, lookups) || optativeWishTerminalAt(tokens, auxEnd, end, lookups)) {
    return "optative";
  }
  if ((token.pos & POS0) !== 動詞) {
    return null;
  }
  if (receiveWishAt(tokens, idx, end)) {
    return "receive_wish";
  }
  if (benefactiveQuestionRequestAt(tokens, idx)) {
    return "benefactive_question";
  }
  const tailPos = auxEnd;
  const relation = teDeContinuationRelationAt(tokens, tailPos, {
    consumers: ["clause_layout"],
    lookups
  });
  if (relation !== null && relation.span.endExclusive <= end) {
    if (relation.continuationKind === "request" || relation.continuationKind === "prohibition") {
      return "te_request";
    }
    if (relation.continuationKind === "desiderative") {
      return "te_desiderative";
    }
  }
  if (tailPos < end && teRequestEllipsisAt(tokens, idx, tailPos, lookups, teRequestSets)) {
    return "te_ellipsis";
  }
  return null;
}

function isRequestPerformativeAt(tokens: readonly RuntimeHaruToken[], idx: number, lookups: LookupTables): boolean {
  const performatives = lookups.SPEECH_ACT_REQUEST_PERFORMATIVE_PREDICATES;
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  if ((token.pos & POS0) === 動詞 && (performatives.has(token.dictionaryForm) || performatives.has(token.surface))) {
    return true;
  }
  if (!isSahenLightVerbCarrierToken(token, lookups) || isSourceSeparatedFromPreviousToken(tokens, idx)) {
    return false;
  }
  const host = tokens[idx - 1];
  return host !== undefined &&
    isSahenCapableNominal(host) &&
    (performatives.has(host.dictionaryForm) || performatives.has(host.surface));
}

function receiveWishAt(
  tokens: readonly RuntimeHaruToken[],
  verbIdx: number,
  end: number
): boolean {
  const verb = tokens[verbIdx];
  const metadata = verb === undefined ? null : teBenefactiveContinuationMetadataForToken(verb);
  if (verb === undefined || metadata === null || !metadata.recipientPivot) {
    return false;
  }
  if (metadata.potential && (verb.pos & POS5A) === 仮定形_) {
    return true;
  }
  for (let idx = verbIdx + 1; idx < end; idx += 1) {
    const aux = tokens[idx];
    if (aux === undefined || (aux.pos & POS0) !== 助動詞) {
      return false;
    }
    if (isDesireAuxiliaryPos(aux.pos)) {
      return true;
    }
    if (metadata.potential && (aux.pos & POS5A) === 仮定形_) {
      return true;
    }
  }
  return false;
}

function benefactiveQuestionRequestAt(
  tokens: readonly RuntimeHaruToken[],
  verbIdx: number
): boolean {
  const verb = tokens[verbIdx];
  const metadata = verb === undefined ? null : teBenefactiveContinuationMetadataForToken(verb);
  if (metadata === null) {
    return false;
  }
  const towardSpeaker = metadata.aspect === "te_kureru" || metadata.aspect === "te_kudasaru";
  if (!towardSpeaker && !(metadata.recipientPivot && metadata.potential)) {
    return false;
  }
  let idx = verbIdx + 1;
  while (((tokens[idx]?.pos ?? 0) & POS0) === 助動詞) {
    if (((tokens[idx]?.pos ?? 0) & POS4) === 助動詞_タ) {
      return false;
    }
    idx += 1;
  }
  const next = nextNonSpaceIndex(tokens, idx);
  return next !== null &&
    (isQuestionParticleKaToken(tokens[next]) || terminalPunctuationRunQuestionIndex(tokens, next) !== null);
}

function auxChainEndAfter(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number
): number {
  let index = start;
  while (index < end && ((tokens[index]?.pos ?? 0) & POS0) === 助動詞) {
    index += 1;
  }
  return index;
}

function teRequestEllipsisAt(
  tokens: readonly RuntimeHaruToken[],
  verbIdx: number,
  tePos: number,
  lookups: LookupTables,
  teRequestSets: TeUtteranceActLookupSets
): boolean {
  const left = teUtteranceFinalLeftAt(tokens, tePos);
  if (left === null || left.predicateIdx > verbIdx) {
    return false;
  }
  if (teIisashiSignalsAt(tokens, left, teRequestSets).length > 0) {
    return false;
  }
  return !quoteStructuralRelationsForHost(
    new TokenCursor(tokens, verbIdx, tokens.length),
    lookups
  ).some(({ quote }) => quote.contentSpan.endExclusive <= verbIdx);
}

function imperativeAuxiliaryIn(tokens: readonly RuntimeHaruToken[], start: number, end: number): boolean {
  for (let idx = start; idx < end; idx += 1) {
    if (isImperativeInflection(tokens[idx]?.pos ?? 0)) {
      return true;
    }
  }
  return false;
}

function optativeWishTerminalAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  end: number,
  lookups: LookupTables
): boolean {
  const wish = matchYouNiPredicateProjectionConnectiveAt(tokens, idx, { requireEnd: true, lookups });
  return wish !== null && wish.connective === "predicate_projection_wish_terminal" && idx + wish.consumed <= end;
}
