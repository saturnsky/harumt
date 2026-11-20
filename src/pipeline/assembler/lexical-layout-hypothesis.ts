import { spanLocalRenderPlanNode } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import type { buildProtoLayout } from "../clause-layout/index.js";
import type { CommitmentCandidate } from "../commitment/types.js";
import { candidateSetCandidates, candidateSetMembers, commitmentLaneCandidateSet, dropCandidate, isResolvedCandidateSet, transformCandidateSet } from "../source-candidate-set.js";
import { 부사 } from "../../types/pos.js";
import type { LookupTables } from "../lookup-tables.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import { sameLexicalAdverbialAffiliation, type LexicalAdverbialAffiliation } from "../clause-layout/lexical-adverbial-affiliation.js";
import { dewaScopeBridgeRelationAt } from "../head-tail/boundary/marker.js";
import { tryParseNominalFrame } from "../head-tail/head/adapters/nominal/parser.js";
import { TokenCursor } from "../token-cursor.js";
import type { TraceCollector } from "../trace.js";
import type { AssemblyContentSpan } from "../assembly-content-span.js";

export interface LexicalParticleLayoutHypothesis {
  readonly contentMap: Map<number, AssemblyContentSpan>;
  readonly layout: ClauseLayout;
  readonly commitmentTrace: TraceCollector | null;
}

export interface LexicalLayoutHypothesisRun {
  readonly contentMap: Map<number, AssemblyContentSpan>;
  readonly layout: ClauseLayout;
  readonly protoLayout: ReturnType<typeof buildProtoLayout>;
  readonly contentPassMap: Map<number, AssemblyContentSpan>;
  readonly trace: TraceCollector | null;
}

export type LexicalAdverbialAffiliationFacts = ReadonlyMap<number, LexicalAdverbialAffiliation>;

export function adoptLexicalLayoutHypothesis(variant: LexicalLayoutHypothesisRun, trace: TraceCollector | null) {
  for (const event of variant.trace?.events ?? []) {
    trace?.record(event);
  }
  return {
    contentMap: variant.contentMap,
    layout: variant.layout,
    protoLayout: variant.protoLayout,
    contentPassMap: variant.contentPassMap
  };
}

export function sameLexicalAdverbialAffiliationFacts(
  left: LexicalAdverbialAffiliationFacts,
  right: LexicalAdverbialAffiliationFacts
): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const [particleIdx, affiliation] of left) {
    const other = right.get(particleIdx);
    if (other === undefined || !sameLexicalAdverbialAffiliation(affiliation, other, { includeClauseOrdinals: true })) {
      return false;
    }
  }
  return true;
}

export type LexicalParticleOwnershipMode = "particle" | "content_owner" | "marker_owner";

interface LexicalParticleOwnershipSlot {
  readonly start: number;
  readonly particleIdx: number;
  readonly markerEndExclusive: number;
  readonly initialMode: LexicalParticleOwnershipMode;
  readonly modes: readonly LexicalParticleOwnershipMode[];
}

export interface LexicalParticleOwnershipChoice {
  readonly start: number;
  readonly particleIdx: number;
  readonly markerEndExclusive: number;
  readonly mode: LexicalParticleOwnershipMode;
}

interface LexicalParticleSlotRank {
  readonly priorityGroup: number;
  readonly priorityInGroup: number;
  readonly selectedIdx: number;
  readonly ownerModeRank: number;
  readonly initialMismatch: boolean;
}

export function lexicalParticleOwnershipHypothesisSlots(
  contentMap: ReadonlyMap<number, AssemblyContentSpan>,
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  numeric: NumericTables
): readonly LexicalParticleOwnershipSlot[] {
  const result: LexicalParticleOwnershipSlot[] = [];
  const occupiedParticles = new Set<number>();
  for (const [start, span] of contentMap) {
    const candidates = candidateSetCandidates(commitmentLaneCandidateSet(span.sourceCandidates));
    if (candidates.length === 0) {
      continue;
    }
    const hasContentOwner = candidates.some((candidate) => lexicalParticleOwnershipModeForCandidate(candidate) === "content_owner");
    const hasParticle = candidates.some((candidate) => lexicalParticleOwnershipModeForCandidate(candidate) === "particle");
    if (!hasContentOwner || !hasParticle) {
      continue;
    }
    const particleIdx = candidates.find((candidate) => adverbialNiCandidateCommitment(candidate) !== null)
      ?.lexicalParticleAdverbial?.particleIdx ?? start + 1;
    occupiedParticles.add(particleIdx);
    const selected = selectedLexicalParticleCandidate(span);
    const selectedMode = selected === undefined
      ? (span.particleRole === "adverbializer" ? "content_owner" : "particle")
      : lexicalParticleOwnershipModeForCandidate(selected);
    result.push({
      start,
      particleIdx,
      markerEndExclusive: particleIdx + 1,
      initialMode: selectedMode,
      modes: ["content_owner", "particle"]
    });
  }
  for (let markerIdx = 0; markerIdx < tokens.length; markerIdx += 1) {
    if (occupiedParticles.has(markerIdx)) {
      continue;
    }
    const markerSlot = lexicalParticleMarkerOwnerSlotAt(tokens, markerIdx, contentMap, lookups, numeric);
    if (markerSlot !== null) {
      result.push(markerSlot);
    }
  }
  return result;
}

function lexicalParticleMarkerOwnerSlotAt(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  contentMap: ReadonlyMap<number, AssemblyContentSpan>,
  lookups: LookupTables,
  numeric: NumericTables
): LexicalParticleOwnershipSlot | null {
  const bridge = dewaScopeBridgeRelationAt(tokens, markerIdx, {
    consumers: ["assembler"]
  });
  if (bridge === null) {
    return null;
  }
  const parse = tryParseNominalFrame(new TokenCursor(tokens, markerIdx, tokens.length), { lookups, numeric });
  if (
    parse === null ||
    parse.frame.frameKind !== "lexical_particle" ||
    parse.frame.source.start !== bridge.span.start ||
    parse.frame.source.end !== bridge.span.endExclusive ||
    parse.frame.markerSurface !== bridge.surface
  ) {
    return null;
  }
  const start = parse.root.source.start;
  if (!contentMap.has(start)) {
    return null;
  }
  return {
    start,
    particleIdx: markerIdx,
    markerEndExclusive: bridge.span.endExclusive,
    initialMode: "marker_owner",
    modes: ["marker_owner", "particle"]
  };
}

function lexicalParticleOwnershipModeForCandidate(candidate: CommitmentCandidate): LexicalParticleOwnershipMode {
  return adverbialNiCandidateCommitment(candidate) !== null ? "content_owner" : "particle";
}

export function lexicalParticleInitialOwnershipChoices(
  slots: readonly LexicalParticleOwnershipSlot[]
): readonly LexicalParticleOwnershipChoice[] {
  return slots.map((slot) => ({
    start: slot.start,
    particleIdx: slot.particleIdx,
    markerEndExclusive: slot.markerEndExclusive,
    mode: slot.initialMode
  }));
}

export function cloneAssemblyContentMap(
  source: ReadonlyMap<number, AssemblyContentSpan>
): Map<number, AssemblyContentSpan> {
  const result = new Map<number, AssemblyContentSpan>();
  for (const [start, span] of source) {
    result.set(start, cloneAssemblyContentSpan(span));
  }
  return result;
}

function cloneAssemblyContentSpan(span: AssemblyContentSpan): AssemblyContentSpan {
  const clone = {
    ...span,
    renderPlan: spanLocalRenderPlanNode(span.renderPlan),
    ownerCandidates: span.ownerCandidates === undefined ? undefined : [...span.ownerCandidates],
    ownerCandidatePayloads: span.ownerCandidatePayloads === undefined ? undefined : [...span.ownerCandidatePayloads],
    warnings: [...(span.warnings ?? [])],
    traceEvents: [...(span.traceEvents ?? [])]
  } as AssemblyContentSpan;
  delete (clone as { voiceOpen?: unknown }).voiceOpen;
  Object.defineProperty(clone, "voiceOpen", {
    enumerable: true,
    get() {
      return clone.voice === null;
    }
  });
  return clone;
}

export function applyLexicalParticleOwnershipChoice(
  contentMap: Map<number, AssemblyContentSpan>,
  choice: LexicalParticleOwnershipChoice
): void {
  if (choice.mode === "marker_owner") {
    return;
  }
  const span = contentMap.get(choice.start);
  const sourceCandidates = commitmentLaneCandidateSet(span?.sourceCandidates);
  if (span === undefined || sourceCandidates === null || sourceCandidates.members.length === 0) {
    return;
  }
  const ordered = candidateSetMembers(sourceCandidates)
    .filter((member) => lexicalParticleOwnershipModeForCandidate(member.candidate) === choice.mode)
    .sort((left, right) => compareAdverbialNiCandidateStaticOrder(left.candidate, right.candidate));
  if (ordered.length === 0) {
    return;
  }
  span.sourceCandidates = transformCandidateSet(sourceCandidates, {
    map: () => dropCandidate("lexical_particle_ownership"),
    introduce: ordered,
    failClosedReason: "all_members_dropped"
  });
  hydrateAssemblyContentSpanFromCandidate(span, ordered[0]!.candidate, choice.mode);
}

function hydrateAssemblyContentSpanFromCandidate(
  span: AssemblyContentSpan,
  candidate: CommitmentCandidate,
  mode: LexicalParticleOwnershipMode
): void {
  span.entry = candidate.entry ?? span.entry;
  span.renderPlanPolicy = candidate.renderPlanPolicy ?? span.renderPlanPolicy;
  const adverbialNi = adverbialNiCandidateCommitment(candidate);
  if (mode === "content_owner" && adverbialNi !== null) {
    span.consumed = adverbialNi.consumed;
    span.particleRole = adverbialNi.particleRole;
    span.renderPlan = spanLocalRenderPlanNode(adverbialNi.renderPlan);
    span.korean = "";
    span.koreanPos = candidate.koreanPos ?? 부사;
  } else {
    span.consumed = 1;
    span.particleRole = null;
    span.renderPlan = spanLocalRenderPlanNode(candidate.renderPlan ?? null);
    span.korean = candidate.korean ?? "";
    span.koreanPos = candidate.koreanPos ?? span.koreanPos;
  }
  if (candidate.voice !== undefined) span.voice = candidate.voice;
  if (candidate.nareruReadings !== undefined) span.nareruReadings = candidate.nareruReadings;
  if (candidate.rareruReadings !== undefined) span.rareruReadings = candidate.rareruReadings;
  if (candidate.dekiruReadings !== undefined) span.dekiruReadings = candidate.dekiruReadings;
  if (candidate.hasNegative !== undefined) span.hasNegative = candidate.hasNegative;
  if (candidate.hasCausative !== undefined) span.hasCausative = candidate.hasCausative;
  if (candidate.hasCausativePassive !== undefined) span.hasCausativePassive = candidate.hasCausativePassive;
  if (candidate.hasRequestTail !== undefined) span.hasRequestTail = candidate.hasRequestTail;
  if (candidate.hasBenefactiveTail !== undefined) span.hasBenefactiveTail = candidate.hasBenefactiveTail;
  if (candidate.connectiveRole !== undefined) span.connectiveRole = candidate.connectiveRole;
  span.benefactive = candidate.benefactive ?? span.benefactive ?? null;
  span.warnings = candidate.warnings ?? span.warnings ?? [];
}

export function lexicalParticleConsumedIndicesForChoices(
  choices: readonly LexicalParticleOwnershipChoice[]
): readonly number[] {
  const consumed = new Set<number>();
  for (const choice of choices) {
    if (choice.mode === "particle") {
      continue;
    }
    for (let index = choice.particleIdx; index < choice.markerEndExclusive; index += 1) {
      consumed.add(index);
    }
  }
  return [...consumed].sort((left, right) => left - right);
}

export function lexicalParticleLayoutSemanticSignature(
  contentMap: ReadonlyMap<number, AssemblyContentSpan>,
  layout: ClauseLayout,
  choices: readonly LexicalParticleOwnershipChoice[]
): string {
  return JSON.stringify(choices.map((choice) => {
    const span = contentMap.get(choice.start);
    const candidate = span === undefined ? undefined : selectedLexicalParticleCandidate(span);
    return {
      start: choice.start,
      mode: lexicalParticleResolvedMode(span, layout, choice),
      markerEndExclusive: choice.markerEndExclusive,
      consumed: span?.consumed ?? null,
      particleOwner: layout.predicateOfParticle.get(choice.particleIdx) ?? null,
      particleClause: layout.clauseIndexOfToken(choice.particleIdx),
      renderPlanKind: span?.renderPlan?.kind ?? null,
      selected: adverbialNiCandidateSemanticKey(candidate)
    };
  }));
}

function lexicalParticleResolvedMode(
  span: AssemblyContentSpan | undefined,
  layout: ClauseLayout,
  choice: LexicalParticleOwnershipChoice
): LexicalParticleOwnershipMode {
  if (span?.particleRole === "adverbializer") {
    return "content_owner";
  }
  if (!layout.predicateOfParticle.has(choice.particleIdx) && choice.markerEndExclusive > choice.particleIdx + 1) {
    return "marker_owner";
  }
  return "particle";
}

function adverbialNiCandidateSemanticKey(candidate: CommitmentCandidate | undefined): readonly unknown[] {
  if (candidate === undefined) {
    return [];
  }
  const translation = candidate.translation as (CommitmentCandidate["translation"] & {
    readonly priorityGroup?: number;
    readonly priorityInGroup?: number;
    readonly senseIndex?: number;
  }) | undefined;
  return [
    candidate.koreanLemma ?? candidate.korean ?? null,
    candidate.koreanPos ?? null,
    candidate.derivation?.id ?? null,
    translation?.priorityGroup ?? candidate.priority ?? null,
    translation?.priorityInGroup ?? null,
    translation?.senseIndex ?? null,
    candidate.renderPlan?.kind ?? null
  ];
}

function compareAdverbialNiCandidateStaticOrder(
  left: CommitmentCandidate,
  right: CommitmentCandidate
): number {
  const [leftPriorityGroup, leftPriorityInGroup, leftSenseIndex] = adverbialNiCandidatePriorityTuple(left);
  const [rightPriorityGroup, rightPriorityInGroup, rightSenseIndex] = adverbialNiCandidatePriorityTuple(right);
  const priorityGroupDiff = leftPriorityGroup - rightPriorityGroup;
  if (priorityGroupDiff !== 0) return priorityGroupDiff;
  const priorityInGroupDiff = leftPriorityInGroup - rightPriorityInGroup;
  if (priorityInGroupDiff !== 0) return priorityInGroupDiff;
  return leftSenseIndex - rightSenseIndex;
}

function adverbialNiCandidatePriorityTuple(
  candidate: CommitmentCandidate | undefined
): readonly [number, number, number] {
  if (candidate === undefined) {
    return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
  }
  const translation = candidate.translation as (CommitmentCandidate["translation"] & {
    readonly priorityGroup?: number;
    readonly priorityInGroup?: number;
    readonly senseIndex?: number;
  }) | undefined;
  return [
    translation?.priorityGroup ?? candidate.priority ?? 0,
    translation?.priorityInGroup ?? 0,
    translation?.senseIndex ?? Number.MAX_SAFE_INTEGER
  ];
}

export function lexicalParticleChoiceRank(
  contentMap: ReadonlyMap<number, AssemblyContentSpan>,
  choice: LexicalParticleOwnershipChoice,
  initialContentMap: ReadonlyMap<number, AssemblyContentSpan>
): LexicalParticleSlotRank {
  const span = contentMap.get(choice.start);
  const selectedSet = commitmentLaneCandidateSet(span?.sourceCandidates);
  const selectedIdx = isResolvedCandidateSet(selectedSet)
    ? Math.max(0, selectedSet.members.indexOf(selectedSet.winner))
    : 0;
  const candidate = span === undefined ? undefined : selectedLexicalParticleCandidate(span);
  const [priorityGroup, priorityInGroup] = adverbialNiCandidatePriorityTuple(candidate);
  return {
    priorityGroup,
    priorityInGroup,
    selectedIdx,
    ownerModeRank: lexicalParticleOwnershipModeRank(choice.mode),
    initialMismatch: lexicalParticleInitialOwnershipMode(initialContentMap.get(choice.start), choice) !== choice.mode
  };
}

export function compareLexicalParticleSlotRanks(
  left: LexicalParticleSlotRank,
  right: LexicalParticleSlotRank
): number {
  const priorityGroupDiff = left.priorityGroup - right.priorityGroup;
  if (priorityGroupDiff !== 0) return priorityGroupDiff;
  const priorityInGroupDiff = left.priorityInGroup - right.priorityInGroup;
  if (priorityInGroupDiff !== 0) return priorityInGroupDiff;
  const ownerModeDiff = left.ownerModeRank - right.ownerModeRank;
  if (ownerModeDiff !== 0) return ownerModeDiff;
  const selectedIdxDiff = left.selectedIdx - right.selectedIdx;
  if (selectedIdxDiff !== 0) return selectedIdxDiff;
  if (left.initialMismatch !== right.initialMismatch) {
    return left.initialMismatch ? 1 : -1;
  }
  return 0;
}

function lexicalParticleOwnershipModeRank(mode: LexicalParticleOwnershipMode): number {
  switch (mode) {
    case "content_owner":
      return 0;
    case "marker_owner":
      return 1;
    case "particle":
      return 2;
  }
}

export function lexicalParticleChoiceIsRealized(
  contentMap: ReadonlyMap<number, AssemblyContentSpan>,
  layout: ClauseLayout,
  choice: LexicalParticleOwnershipChoice
): boolean {
  const span = contentMap.get(choice.start);
  if (choice.mode === "content_owner") {
    return span?.particleRole === "adverbializer" &&
      span.consumed >= 2 &&
      span.renderPlan?.kind === "lexicalParticleAdverbial" &&
      span.renderPlan.particle === "に";
  }
  if (choice.mode === "marker_owner") {
    if (span === undefined || layout.predicateOfParticle.has(choice.particleIdx)) {
      return false;
    }
    for (let index = choice.particleIdx + 1; index < choice.markerEndExclusive; index += 1) {
      if (layout.predicateOfParticle.has(index)) {
        return false;
      }
    }
    return true;
  }
  return span !== undefined &&
    span.particleRole !== "adverbializer" &&
    layout.predicateOfParticle.has(choice.particleIdx);
}

function lexicalParticleInitialOwnershipMode(
  span: AssemblyContentSpan | undefined,
  choice: LexicalParticleOwnershipChoice
): LexicalParticleOwnershipMode {
  if (choice.markerEndExclusive > choice.particleIdx + 1) {
    return "marker_owner";
  }
  const selected = span === undefined ? undefined : selectedLexicalParticleCandidate(span);
  if (selected !== undefined) {
    return lexicalParticleOwnershipModeForCandidate(selected);
  }
  return span?.particleRole === "adverbializer" ? "content_owner" : "particle";
}

function adverbialNiCandidateCommitment(
  candidate: CommitmentCandidate | undefined
): NonNullable<CommitmentCandidate["lexicalParticleAdverbial"]> | null {
  const commitment = candidate?.lexicalParticleAdverbial;
  if (commitment === undefined || commitment === null || commitment.renderPlan.particle !== "に") {
    return null;
  }
  return commitment;
}

function selectedLexicalParticleCandidate(span: AssemblyContentSpan): CommitmentCandidate | undefined {
  const set = commitmentLaneCandidateSet(span.sourceCandidates);
  return isResolvedCandidateSet(set) ? set.winner.candidate : undefined;
}
