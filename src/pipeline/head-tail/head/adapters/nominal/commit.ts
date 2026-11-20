import { selectParticle } from "../../../../../generator/particles.js";
import { conjugate, irregularType } from "../../../../../generator/conjugator.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { Warning } from "../../../../../types/warning.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type {
  CandidateSetProjection,
  ProjectionCandidateSelector,
  ProjectionEvidenceScope,
  ProjectionHeadModifierKind
} from "../../../grammar.js";
import { projectionCandidateSelectorMatches, type ProjectionHeadModifierContext, type ProjectionPredicateContext } from "../../../candidate/selector.js";
import { previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { nominalLinkMarkerRelationAt } from "../../../boundary/marker.js";
import { isKoreanNounAble, isNaAdjCapable, isNaAdjCapableNoun, pos0in, 名詞, 代名詞, 連体詞, 動詞, 形容詞0, 形状詞, 助動詞, 接尾辞, 명사, 형용사 } from "../../../../../types/pos.js";
import {
  collectFollowingProjectionBoundaryContext,
  collectFollowingProjectionContextTokens,
  collectPrecedingProjectionBoundaryContext,
  collectPrecedingProjectionContextTokens,
  projectionSelectorBoundsForToken
} from "../../../candidate/context.js";
import {
  buildSharedTailChainRenderResult,
  commitSharedNominalLikenessTailChain,
  commitSharedTailParserGerundRoot,
  commitSharedTailParserRoot,
  type SharedTailChainRenderResult
} from "../../../lifecycle/render.js";
import { renderAniTerminal } from "../../../tail/korean-terminal.js";
import { createConnectiveOp } from "../../../tail/predicate-root/op-builders.js";
import type { CommitContext } from "../../../tail/predicate-root/commit.js";
import { stemHasAdmittedProjectionCategory, stemSupportsProjectionCategory } from "../../../tail/predicate-root/inspect.js";
import { tailPredicateHostPrefersTameReason } from "../../../tail/predicate-root/tame-reason-evidence.js";
import { renderHazuNegativeTail } from "../../../../rendering/wake.js";
import { clauseRoleCommitContext, syntheticTerminalClauseRole } from "../../../lifecycle/commit-context.js";
import type { NominalHeadTailChainPlan } from "../../../lifecycle/head-tail-render-plan.js";
import type {
  CandidateNominalProjectionCandidate,
  CandidateNominalProjection,
  HeadLexicalFormNominalProjection,
  NominalFrame,
  NominalFramePredicateCommitContext,
  NominalRoot,
  NominalTailChainOwner,
  PredicateNominalHostNode,
  PredicateNominalProjectionHost,
  RenyouNominalHeadNode
} from "./grammar.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity } from "../../../tail/predicate-root/stem-candidate-identity.js";
import { commitTail } from "../../../tail/predicate-root/commit.js";
import { withProjectedDerivationalStem } from "../../../tail/predicate-root/derivational-host-base.js";
import { renderDerivationalSuffixHostProjection } from "../../../tail/predicate-root/render-derivational-host-projection.js";
import { firstAuxLayer } from "../../../tail/predicate-root/inspect.js";
import { commitWinner, winnerKorean } from "../../../../translation/access.js";
import { allomorphReadingForRealizedText } from "../../../../rendering/allomorph-host.js";

export interface CommittedNominalTailChain {
  readonly kind: "committedNominalTailChain";
  readonly root: NominalRoot;
  readonly frame: NominalFrame;
  readonly owner: NominalTailChainOwner;
  readonly markerSpan: NominalHeadTailChainPlan["realization"]["markerSpan"];
  readonly headMarkerSpan: NominalHeadTailChainPlan["realization"]["headMarkerSpan"];
  readonly korean: string;
  readonly selectedProjectionId: string | null;
  readonly sharedTailChainRender?: SharedTailChainRenderResult;
  readonly warnings: readonly Warning[];
}

export function commitNominalTailChainPlan(
  plan: NominalHeadTailChainPlan,
  options: {
    readonly formal?: boolean;
    readonly lookups: LookupTables;
    readonly numeric: NumericTables;
    readonly precedingAllomorphKorean?: string;
  }
): CommittedNominalTailChain {
  const lookups = options.lookups;
  const numeric = options.numeric;
  const projection = plan.realization.frame.projection;
  if (plan.realization.root.kind === "hostBearingLikeness") {
    const rendered = renderHostBearingLikenessProjection(plan, options.formal ?? false, lookups, numeric);
    return {
      kind: "committedNominalTailChain",
      root: plan.realization.root,
      frame: plan.realization.frame,
      owner: plan.realization.owner,
      markerSpan: plan.realization.markerSpan,
      headMarkerSpan: plan.realization.headMarkerSpan,
      korean: rendered.text,
      selectedProjectionId: null,
      ...(rendered.sharedTailChainRender === undefined ? {} : { sharedTailChainRender: rendered.sharedTailChainRender }),
      warnings: rendered.warnings
    };
  }
  if (plan.realization.root.kind === "renyouNominalHead") {
    const rendered = renderRenyouNominalHead(plan, plan.realization.root, options.formal ?? false, lookups, numeric);
    return {
      kind: "committedNominalTailChain",
      root: plan.realization.root,
      frame: plan.realization.frame,
      owner: plan.realization.owner,
      markerSpan: plan.realization.markerSpan,
      headMarkerSpan: plan.realization.headMarkerSpan,
      korean: rendered.text,
      selectedProjectionId: null,
      ...(rendered.sharedTailChainRender === undefined ? {} : { sharedTailChainRender: rendered.sharedTailChainRender }),
      warnings: rendered.warnings
    };
  }
  if (plan.realization.root.kind === "productiveAdjectivalSuffix") {
    const rendered = renderProductiveAdjectivalSuffixProjection(plan, options.formal ?? false, lookups, numeric);
    return {
      kind: "committedNominalTailChain",
      root: plan.realization.root,
      frame: plan.realization.frame,
      owner: plan.realization.owner,
      markerSpan: plan.realization.markerSpan,
      headMarkerSpan: plan.realization.headMarkerSpan,
      korean: rendered.text,
      selectedProjectionId: null,
      ...(rendered.sharedTailChainRender === undefined ? {} : { sharedTailChainRender: rendered.sharedTailChainRender }),
      warnings: rendered.warnings
    };
  }
  if (plan.realization.frame.frameKind === "definition_topic") {
    const committed = commitNominalFrameTailChainProjection(plan, options.formal ?? false, lookups, numeric, options.precedingAllomorphKorean);
    return {
      kind: "committedNominalTailChain",
      root: plan.realization.root,
      frame: plan.realization.frame,
      owner: plan.realization.owner,
      markerSpan: plan.realization.markerSpan,
      headMarkerSpan: plan.realization.headMarkerSpan,
      korean: committed.rendered.korean,
      selectedProjectionId: committed.selectedProjectionId,
      sharedTailChainRender: committed.rendered,
      warnings: committed.rendered.warnings
    };
  }
  if (
    projection.kind === "deterministic" ||
    projection.kind === "particle" ||
    projection.kind === "negativeCopulaPredicate" ||
    projection.kind === "hostSuffix" ||
    projection.kind === "headLexicalForm"
  ) {
    const committed = commitNominalFrameTailChainProjection(plan, options.formal ?? false, lookups, numeric, options.precedingAllomorphKorean);
    return {
      kind: "committedNominalTailChain",
      root: plan.realization.root,
      frame: plan.realization.frame,
      owner: plan.realization.owner,
      markerSpan: plan.realization.markerSpan,
      headMarkerSpan: plan.realization.headMarkerSpan,
      korean: committed.rendered.korean,
      selectedProjectionId: null,
      sharedTailChainRender: committed.rendered,
      warnings: committed.rendered.warnings
    };
  }
  const committed = commitNominalFrameTailChainProjection(plan, options.formal ?? false, lookups, numeric, options.precedingAllomorphKorean);
  return {
    kind: "committedNominalTailChain",
    root: plan.realization.root,
    frame: plan.realization.frame,
    owner: plan.realization.owner,
    markerSpan: plan.realization.markerSpan,
    headMarkerSpan: plan.realization.headMarkerSpan,
    korean: committed.rendered.korean,
    selectedProjectionId: committed.selectedProjectionId,
    sharedTailChainRender: committed.rendered,
    warnings: committed.rendered.warnings
  };
}

export function renderCommittedNominalTailChain(committed: CommittedNominalTailChain): string {
  return committed.korean;
}

export function nominalTailChainAssemblyHint(
  plan: NominalHeadTailChainPlan,
  lookups: LookupTables
): string | null {
  const projection = plan.realization.frame.projection;
  if (projection.kind === "candidateSet") {
    return nominalProjectionCandidateAssemblyHint(plan, selectNominalProjectionCandidate(plan, projection, lookups).candidate);
  }
  return nominalProjectionAssemblyHint(plan, projection);
}

export function renderNominalTailChainPurposeAttributive(
  plan: NominalHeadTailChainPlan,
  options: { readonly formal?: boolean; readonly lookups: LookupTables; readonly numeric: NumericTables }
): string | null {
  if (
    plan.realization.root.kind !== "predicateNominalHost" ||
    plan.realization.root.nominalizer.kind !== "tame" ||
    plan.realization.frame.frameKind !== "purpose_reason"
  ) {
    return null;
  }
  const projection = plan.realization.frame.projection;
  if (projection.kind !== "candidateSet") {
    return null;
  }
  const selected = selectNominalProjectionCandidate(plan, projection, options.lookups);
  if (selected.candidate.id !== "purpose") {
    return null;
  }
  const host = renderPredicateNominalHostProjection(plan, options.formal ?? false, options.lookups, options.numeric);
  return host.text.length === 0 ? null : `${host.text} 위한`;
}

export function collectNominalTailChainCommittedWarnings(
  plan: NominalHeadTailChainPlan,
  lookups: LookupTables,
  numeric: NumericTables
): readonly Warning[] {
  try {
    return commitNominalTailChainPlan(plan, { lookups, numeric }).warnings;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [{
      type: "render_fallback",
      severity: "warning",
      opKind: "nominal_tail_chain_warning_collection",
      span: { start: plan.realization.markerSpan.start, end: plan.realization.markerSpan.end - 1 },
      message: `nominal tail-chain warning collection skipped: ${message}`
    }];
  }
}

function nominalFrameAmbiguityWarnings(plan: NominalHeadTailChainPlan, winner: string): readonly Warning[] {
  const projection = plan.realization.frame.projection;
  if (projection.kind !== "candidateSet" || projection.candidates.length <= 1) {
    return [];
  }
  return [{
    type: "ambiguity_default",
    severity: "info",
    opKind: "nominal_frame_ambiguous",
    candidates: projection.candidates.map((candidate) => candidate.id),
    winner,
    span: { start: plan.realization.markerSpan.start, end: plan.realization.markerSpan.end - 1 },
    message: `명사부 frame ${plan.realization.frame.markerSurface} 후보 중 default ${winner} 선택`
  }];
}

interface NominalProjectionSelection {
  readonly candidate: CandidateNominalProjectionCandidate;
  readonly ambiguousDefault: boolean;
}

interface PredicateNominalHostRender {
  readonly text: string;
  readonly warnings: readonly Warning[];
  readonly sharedTailChainRender?: SharedTailChainRenderResult;
}

interface NominalFrameTailChainCommit {
  readonly rendered: SharedTailChainRenderResult;
  readonly selectedProjectionId: string | null;
}

function commitNominalFrameTailChainProjection(
  plan: NominalHeadTailChainPlan,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables,
  precedingAllomorphKorean?: string
): NominalFrameTailChainCommit {
  assertNominalFrameTailSourceMatchesPlan(plan);
  const projection = plan.realization.frame.projection;
  if (plan.realization.frame.frameKind === "definition_topic") {
    const selected = projection.kind === "candidateSet"
      ? selectNominalProjectionCandidate(plan, projection, lookups)
      : null;
    const selectedProjectionId = selected?.candidate.id ?? null;
    const root = plan.realization.root;
    const quoteFocusHost = selectedProjectionId === "quote_focus" && root.kind === "predicateNominalHost" && isQuotedClauseHost(plan)
      ? quotedHostAsQuoteFocus(root.host, plan.realization.frame)
      : null;
    const host = quoteFocusHost === null
      ? renderPredicateNominalHostProjection(plan, formal, lookups, numeric)
      : renderPredicateProjectionHost(quoteFocusHost, formal, lookups, numeric, nominalCommitContextClauseLayout(plan), { closedClause: true });
    const warnings = [
      ...host.warnings,
      ...(selected?.ambiguousDefault === true ? nominalFrameAmbiguityWarnings(plan, selected.candidate.id) : [])
    ];
    const frameText = quoteFocusHost === null
      ? renderDefinitionTopicFrame(plan, selectedProjectionId ?? "definition", host.text, precedingAllomorphKorean)
      : "";
    return {
      selectedProjectionId,
      rendered: buildSharedTailChainRenderResult({
        korean: `${host.text}${frameText}`,
        polite: false,
        warnings,
        descriptor: plan.headTailCandidate,
        sourceCandidate: plan.headTailSourceCandidate,
        fallbackTailSourceKind: "nominal_frame",
        fallbackHeadKind: nominalFrameFallbackHeadKind(plan)
      })
    };
  }
  const host = renderPredicateNominalHostProjection(plan, formal, lookups, numeric);
  if (
    projection.kind === "deterministic" ||
    projection.kind === "particle" ||
    projection.kind === "negativeCopulaPredicate" ||
    projection.kind === "hostSuffix" ||
    projection.kind === "headLexicalForm"
  ) {
    return {
      selectedProjectionId: null,
      rendered: buildSharedTailChainRenderResult({
        korean: `${host.text}${renderNominalProjectionSuffix(plan, projection, host.text, formal, precedingAllomorphKorean)}`,
        polite: projection.kind === "negativeCopulaPredicate" ? projection.polite : false,
        warnings: host.warnings,
        descriptor: plan.headTailCandidate,
        sourceCandidate: plan.headTailSourceCandidate,
        fallbackTailSourceKind: "nominal_frame",
        fallbackHeadKind: nominalFrameFallbackHeadKind(plan)
      })
    };
  }
  const selected = selectNominalProjectionCandidate(plan, projection, lookups);
  if (selected.candidate === undefined) {
    throw new Error(`nominalTailChain commit failed: no projection candidate for ${plan.realization.frame.id}`);
  }
  const warnings = [
    ...host.warnings,
    ...(selected.ambiguousDefault ? nominalFrameAmbiguityWarnings(plan, selected.candidate.id) : [])
  ];
  return {
    selectedProjectionId: selected.candidate.id,
    rendered: buildSharedTailChainRenderResult({
      korean: `${host.text}${renderNominalProjectionCandidateSuffix(plan, selected.candidate, host.text, formal, precedingAllomorphKorean)}`,
      polite: false,
      warnings,
      descriptor: plan.headTailCandidate,
      sourceCandidate: plan.headTailSourceCandidate,
      fallbackTailSourceKind: "nominal_frame",
      fallbackHeadKind: nominalFrameFallbackHeadKind(plan)
    })
  };
}

function assertNominalFrameTailSourceMatchesPlan(plan: NominalHeadTailChainPlan): void {
  const sourceRealization = plan.headTailSourceCandidate?.tail.realization;
  if (sourceRealization?.kind !== "nominal_frame") {
    return;
  }
  const sourceFrame = sourceRealization.nominalFrame.spec;
  if (
    sourceFrame.id !== plan.realization.frame.id ||
    sourceFrame.kind !== plan.realization.frame.frameKind ||
    sourceFrame.surface !== plan.realization.frame.markerSurface ||
    sourceFrame.focus !== plan.realization.frame.focus
  ) {
    throw new Error(
      `nominal frame tail source mismatch: plan=${plan.realization.frame.id}/${plan.realization.frame.markerSurface}, source=${sourceFrame.id}/${sourceFrame.surface}`
    );
  }
}

function nominalFrameFallbackHeadKind(plan: NominalHeadTailChainPlan): string {
  switch (plan.realization.root.kind) {
    case "predicateNominalHost":
      return "predicate_nominalized";
    case "hostBearingLikeness":
    case "productiveAdjectivalSuffix":
    case "renyouNominalHead":
    case "nominalPhrase":
      return "nominal";
  }
}

function isQuotedClauseHost(plan: NominalHeadTailChainPlan): boolean {
  return plan.realization.root.kind === "predicateNominalHost" &&
    plan.realization.root.nominalizer.kind === "quote";
}

function selectNominalProjectionCandidate(
  plan: NominalHeadTailChainPlan,
  projection: CandidateNominalProjection,
  lookups: LookupTables
): NominalProjectionSelection {
  const evidenceCandidateId = selectNominalProjectionCandidateIdFromEvidence(plan, lookups);
  const defaultCandidateId = isQuotedClauseHost(plan)
    ? projection.quotedClauseHostDefaultCandidateId ?? projection.defaultCandidateId
    : projection.defaultCandidateId;
  const candidateId = evidenceCandidateId ?? defaultCandidateId;
  const candidate = projection.candidates.find((item) => item.id === candidateId) ?? projection.candidates[0];
  if (candidate === undefined) {
    throw new Error(`nominalTailChain commit failed: no projection candidate for ${plan.realization.frame.id}`);
  }
  return {
    candidate,
    ambiguousDefault: evidenceCandidateId === null && projection.candidates.length > 1 && projection.warnOnDefault !== false
  };
}

function renderNominalProjectionCandidateSuffix(
  plan: NominalHeadTailChainPlan,
  candidate: CandidateNominalProjectionCandidate,
  renderedHostText: string,
  formal: boolean,
  precedingAllomorphKorean?: string
): string {
  if (candidate.projection !== undefined) {
    return renderNominalProjectionSuffix(plan, candidate.projection, renderedHostText, formal, precedingAllomorphKorean);
  }
  if (candidate.korean !== undefined) {
    return particleStemRequested(plan)
      ? candidate.particleStem ?? candidate.korean
      : candidate.korean;
  }
  throw new Error(`nominalTailChain commit failed: projection candidate ${candidate.id} has no surface projection`);
}

function particleStemRequested(plan: NominalHeadTailChainPlan): boolean {
  return plan.realization.projection?.kind === "particle_stem";
}

function nominalProjectionCandidateAssemblyHint(
  plan: NominalHeadTailChainPlan,
  candidate: CandidateNominalProjectionCandidate
): string | null {
  if (candidate.projection !== undefined) {
    return nominalProjectionAssemblyHint(plan, candidate.projection);
  }
  if (candidate.korean !== undefined && particleStemRequested(plan)) {
    return candidate.particleStem ?? candidate.korean;
  }
  return candidate.korean ?? null;
}

function nominalProjectionAssemblyHint(
  plan: NominalHeadTailChainPlan,
  projection: Exclude<NominalHeadTailChainPlan["realization"]["frame"]["projection"], CandidateSetProjection<CandidateNominalProjectionCandidate>>
): string | null {
  switch (projection.kind) {
    case "deterministic":
      return particleStemRequested(plan)
        ? projection.particleStem ?? projection.korean
        : projection.korean;
    case "particle": {
      const base = plan.realization.root.kind === "nominalPhrase"
        ? plan.realization.root.head.allomorphHint?.korean ?? ""
        : "";
      return `${selectParticle(base, projection.particleKey)}${projection.suffix ?? ""}`;
    }
    case "hostSuffix":
      return projection.suffix;
    case "headLexicalForm":
      return headLexicalFormText(plan, projection);
    case "negativeCopulaPredicate":
      return null;
  }
}

function headLexicalFormText(
  plan: NominalHeadTailChainPlan,
  projection: HeadLexicalFormNominalProjection
): string | null {
  const root = plan.realization.root;
  if (root.kind !== "nominalPhrase") {
    return null;
  }
  return root.head.lexicalForms?.[projection.field] ?? null;
}

function selectNominalProjectionCandidateIdFromEvidence(
  plan: NominalHeadTailChainPlan,
  lookups: LookupTables
): string | null {
  const projection = plan.realization.frame.projection;
  if (projection.kind !== "candidateSet") {
    return null;
  }
  const predicateTameCandidateId = selectPredicateTameProjectionCandidateId(plan, lookups);
  if (predicateTameCandidateId !== null) {
    return predicateTameCandidateId;
  }
  const clauseHost = isQuotedClauseHost(plan);
  const matched = projection.candidates
    .filter((candidate) => !(clauseHost && candidate.requiresNominalHost === true))
    .filter((candidate) => candidate.selectors?.some((selector) => selectorMatches(plan, selector, lookups)) === true);
  return matched[0]?.id ?? null;
}

function selectPredicateTameProjectionCandidateId(
  plan: NominalHeadTailChainPlan,
  lookups: LookupTables
): string | null {
  if (
    plan.realization.root.kind !== "predicateNominalHost" ||
    plan.realization.root.nominalizer.kind !== "tame" ||
    plan.realization.frame.frameKind !== "purpose_reason"
  ) {
    return null;
  }
  return tailPredicateHostPrefersTameReason({
    root: plan.realization.root.host.root,
    tokens: plan.realization.root.host.sourceTokens ?? plan.realization.root.source.tokens,
    tameIndex: plan.realization.frame.source.start,
    lookups,
    adnominal: plan.realization.frame.focus === "の"
  })
    ? "reason"
    : "purpose";
}

function selectorMatches(
  plan: NominalHeadTailChainPlan,
  selector: ProjectionCandidateSelector,
  lookups: LookupTables
): boolean {
  const head = nominalProjectionSelectorHead(plan);
  const headModifier = headModifierContext(plan);
  return projectionCandidateSelectorMatches(selector, {
    ...(head === undefined ? {} : { head }),
    ...(headModifier === undefined ? {} : { headModifier }),
    precedingTokens: precedingContextTokens(plan, selector.window ?? 6, selector.scope),
    followingTokens: followingContextTokens(plan, selector.window ?? 6, selector.scope),
    followingPredicate: followingPredicateContext(plan, selector.scope),
    precedingBoundary: precedingBoundaryContext(plan, selector.scope),
    followingBoundary: followingBoundaryContext(plan, selector.scope)
  }, lookups);
}

function nominalProjectionSelectorHead(plan: NominalHeadTailChainPlan): RuntimeHaruToken | undefined {
  const root = plan.realization.root;
  if (root.kind === "nominalPhrase") {
    return root.head.selectorToken ?? root.head.token;
  }
  if (root.kind === "predicateNominalHost" && isQuotedClauseHost(plan)) {
    return (root.host.sourceTokens ?? plan.realization.commitContext?.tokens)?.[root.host.predicateTokenIdx];
  }
  return undefined;
}

function headModifierContext(plan: NominalHeadTailChainPlan): ProjectionHeadModifierContext | undefined {
  const context = plan.realization.commitContext;
  if (context === undefined || plan.realization.root.kind !== "nominalPhrase") {
    return undefined;
  }
  const head = plan.realization.root.head;
  const headStart = head.source?.start ?? head.tokenIndex;
  const kinds = new Set<ProjectionHeadModifierKind>();
  const headClause = context.layout?.clauseOfToken(head.tokenIndex);
  if (context.layout !== undefined && headClause !== undefined && headStart > 0) {
    const clauseIndex = context.layout.clauseIndexOfToken(head.tokenIndex);
    const previousClause = context.layout.clauseOfToken(headStart - 1);
    if (
      previousClause !== undefined &&
      previousClause.kind === "relative" &&
      previousClause.end === headStart &&
      previousClause.parentIdx === clauseIndex
    ) {
      kinds.add("relative_clause");
    }
  }

  const previousIndex = previousNonSpaceIndex(context.tokens, headStart, 0);
  const previous = previousIndex === null ? undefined : context.tokens[previousIndex];
  if (previousIndex !== null && nominalLinkMarkerRelationAt(context.tokens, previousIndex, { consumers: ["nominal_head_parser"] }) !== null) {
    kinds.add("no_particle");
  } else if (previous !== undefined && pos0in(previous.pos, (1 << 名詞) | (1 << 代名詞) | (1 << 連体詞) | (1 << 動詞) | (1 << 形容詞0) | (1 << 形状詞) | (1 << 助動詞) | (1 << 接尾辞))) {
    kinds.add("content_modifier");
  }

  return kinds.size === 0 ? undefined : { kinds: Array.from(kinds) };
}

function followingPredicateContext(
  plan: NominalHeadTailChainPlan,
  scope?: ProjectionEvidenceScope
): ProjectionPredicateContext | undefined {
  const context = plan.realization.commitContext;
  const predicate = context?.followingPredicate;
  if (context === undefined || predicate === undefined) {
    return undefined;
  }
  const bounds = projectionContextBounds(plan, scope);
  if (predicate.tokenIndex < bounds.lowerBound) {
    return undefined;
  }
  if (bounds.upperBound !== undefined && predicate.tokenIndex >= bounds.upperBound) {
    return undefined;
  }
  const withHead = (item: NominalFramePredicateCommitContext): ProjectionPredicateContext => {
    const headToken = context.tokens[item.tokenIndex];
    return headToken === undefined ? item : { ...item, headToken };
  };
  const { topicClause, ...layoutPredicate } = predicate;
  return {
    ...withHead(layoutPredicate),
    ...(topicClause === undefined ? {} : { topicClause: withHead(topicClause) })
  };
}

function precedingContextTokens(
  plan: NominalHeadTailChainPlan,
  maxCount: number,
  scope?: ProjectionEvidenceScope
): readonly NonNullable<NominalHeadTailChainPlan["realization"]["commitContext"]>["tokens"][number][] {
  const context = plan.realization.commitContext;
  if (context === undefined) {
    return [];
  }
  const bounds = projectionContextBounds(plan, scope);
  return collectPrecedingProjectionContextTokens(context.tokens, plan.realization.hostTokenIdx - 1, {
    maxCount,
    lowerBound: bounds.lowerBound
  });
}

function followingContextTokens(
  plan: NominalHeadTailChainPlan,
  maxCount: number,
  scope?: ProjectionEvidenceScope
): readonly NonNullable<NominalHeadTailChainPlan["realization"]["commitContext"]>["tokens"][number][] {
  const context = plan.realization.commitContext;
  if (context === undefined) {
    return [];
  }
  const bounds = projectionContextBounds(plan, scope);
  return collectFollowingProjectionContextTokens(context.tokens, context.nextIndex, {
    maxCount,
    ...(bounds.upperBound === undefined ? {} : { limit: bounds.upperBound })
  });
}

function precedingBoundaryContext(plan: NominalHeadTailChainPlan, scope?: ProjectionEvidenceScope) {
  const context = plan.realization.commitContext;
  if (context === undefined) {
    return undefined;
  }
  const bounds = projectionContextBounds(plan, scope);
  return collectPrecedingProjectionBoundaryContext(context.tokens, plan.realization.hostTokenIdx - 1, {
    lowerBound: bounds.lowerBound
  });
}

function followingBoundaryContext(plan: NominalHeadTailChainPlan, scope?: ProjectionEvidenceScope) {
  const context = plan.realization.commitContext;
  if (context === undefined) {
    return undefined;
  }
  const bounds = projectionContextBounds(plan, scope);
  return collectFollowingProjectionBoundaryContext(context.tokens, context.nextIndex, {
    ...(bounds.upperBound === undefined ? {} : { limit: bounds.upperBound })
  });
}

function projectionContextBounds(plan: NominalHeadTailChainPlan, scope?: ProjectionEvidenceScope): {
  readonly lowerBound: number;
  readonly upperBound: number | undefined;
} {
  const context = plan.realization.commitContext;
  if (context === undefined) {
    return { lowerBound: 0, upperBound: undefined };
  }
  const markerBounds = projectionSelectorBoundsForToken({
    tokens: context.tokens,
    tokenIdx: plan.realization.markerTokenIdx,
    ...(scope === undefined ? {} : { scope }),
    ...(context.layout === undefined ? {} : { layout: context.layout })
  });
  if (markerBounds.lowerBound !== 0 || markerBounds.upperBound !== undefined) {
    return markerBounds;
  }
  return projectionSelectorBoundsForToken({
    tokens: context.tokens,
    tokenIdx: plan.realization.hostTokenIdx,
    ...(scope === undefined ? {} : { scope }),
    ...(context.layout === undefined ? {} : { layout: context.layout })
  });
}

function nominalFrameAllomorphHostText(
  plan: NominalHeadTailChainPlan,
  renderedHostText: string,
  precedingAllomorphKorean: string | undefined
): string {
  if (renderedHostText.length > 0) {
    return renderedHostText;
  }
  const hint = plan.realization.root.kind === "nominalPhrase"
    ? plan.realization.root.head.allomorphHint?.korean ?? ""
    : "";
  return hint.length > 0 ? hint : precedingAllomorphKorean ?? "";
}

function renderDefinitionTopicFrame(
  plan: NominalHeadTailChainPlan,
  candidateId: string,
  renderedHostText = "",
  precedingAllomorphKorean?: string
): string {
  if (plan.realization.root.kind !== "nominalPhrase") {
    if (renderedHostText.length === 0) {
      throw new Error("definition_topic predicate host frame requires rendered host text");
    }
    const definitionTopic = isQuotedClauseHost(plan)
      ? selectParticle(renderedHostText, "은/는")
      : selectParticle(renderedHostText, "이란/란");
    switch (candidateId) {
      case "definition":
        return definitionTopic;
      case "quote_focus":
        return `${selectParticle(renderedHostText, "이라고/라고")}는`;
      case "contrast":
      case "companion":
        return `${selectParticle(renderedHostText, "과/와")}는`;
      default:
        return definitionTopic;
    }
  }
  const head = nominalFrameAllomorphHostText(plan, renderedHostText, precedingAllomorphKorean);
  switch (candidateId) {
    case "definition":
      return selectParticle(head, "이란/란");
    case "quote_focus":
      return `${selectParticle(head, "이라고/라고")}는`;
    case "contrast":
    case "companion":
      return `${selectParticle(head, "과/와")}는`;
    default:
      return selectParticle(head, "이란/란");
  }
}

function renderNominalProjectionSuffix(
  plan: NominalHeadTailChainPlan,
  projection: NominalHeadTailChainPlan["realization"]["frame"]["projection"],
  renderedHostText: string,
  formal: boolean,
  precedingAllomorphKorean?: string
): string {
  switch (projection.kind) {
    case "deterministic":
      return particleStemRequested(plan)
        ? projection.particleStem ?? projection.korean
        : projection.korean;
    case "particle": {
      const ownerPrefix = nominalPhraseOwnerPrefix(plan, renderedHostText);
      const base = ownerPrefix.length > 0
        ? ownerPrefix
        : nominalFrameAllomorphHostText(plan, renderedHostText, precedingAllomorphKorean);
      const head = plan.realization.root.kind === "nominalPhrase"
        ? plan.realization.root.head.token
        : undefined;
      return `${ownerPrefix}${selectParticle(allomorphReadingForRealizedText(base, head, { readUnitSymbol: false }), projection.particleKey)}${projection.suffix ?? ""}`;
    }
    case "negativeCopulaPredicate":
      return `${nominalPhraseOwnerPrefix(plan, renderedHostText)}${projection.prefix}${renderAniTerminal({
        formal,
        polite: projection.polite,
        past: projection.past
      })}`;
    case "hostSuffix":
      return `${nominalPhraseOwnerPrefix(plan, renderedHostText)}${projection.suffix}`;
    case "headLexicalForm":
      return headLexicalFormText(plan, projection) ?? nominalPhraseOwnerPrefix(plan, renderedHostText);
    case "candidateSet":
      throw new Error("candidateSet projection must be selected before suffix rendering");
  }
}

export function nominalPhraseOwnerPrefix(plan: NominalHeadTailChainPlan, renderedHostText: string): string {
  if (renderedHostText.length > 0 || plan.realization.owner.kind !== "phrase_owner" || plan.realization.root.kind !== "nominalPhrase") {
    return "";
  }
  const hint = plan.realization.root.head.allomorphHint;
  const canonical = hint?.canonicalKorean !== undefined && hint.canonicalKorean.length > 0
    ? hint.canonicalKorean
    : hint?.korean !== undefined && hint.korean.length > 0
      ? hint.korean
      : plan.realization.root.head.token.surface;
  if (hint?.koreanPos === 형용사) {
    if (canonical.endsWith("하다")) {
      return canonical.slice(0, -"하다".length);
    }
    if (canonical.endsWith("다")) {
      return `${canonical.slice(0, -"다".length)}음`;
    }
    if ((hint.canonicalKorean === undefined || hint.canonicalKorean.length === 0) && canonical.endsWith("해")) {
      return canonical.slice(0, -"해".length);
    }
  }
  return canonical;
}

function renderPredicateNominalHostProjection(
  plan: NominalHeadTailChainPlan,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): PredicateNominalHostRender {
  const root = plan.realization.root;
  if (root.kind !== "predicateNominalHost") {
    return { text: "", warnings: [] };
  }
  return renderPredicateNominalHost(root, formal, lookups, numeric, nominalCommitContextClauseLayout(plan));
}

function nominalCommitContextClauseLayout(
  plan: NominalHeadTailChainPlan
): PredicateNominalProjectionHost["layout"] | undefined {
  const layout = plan.realization.commitContext?.layout;
  if (
    layout !== undefined &&
    typeof (layout as { readonly ownerPredicateOfParticle?: unknown }).ownerPredicateOfParticle === "function"
  ) {
    return layout as PredicateNominalProjectionHost["layout"];
  }
  return undefined;
}

function renderHostBearingLikenessProjection(
  plan: NominalHeadTailChainPlan,
  formal: boolean,
  lookups: LookupTables,
  _numeric: NumericTables
): PredicateNominalHostRender {
  const root = plan.realization.root;
  if (root.kind !== "hostBearingLikeness") {
    return { text: "", warnings: [] };
  }
  const modal = root.frame.modal;
  if (modal.kind === "nominalHostLikenessContinuationProjection") {
    const predicateHostSource = modal.predicateHost;
    const predicateHostLayer = predicateHostSource?.root.tail.kind === "auxLayer"
      ? predicateHostSource.root.tail
      : null;
    const sourceStemToken = predicateHostLayer?.stem.source.tokens[0];
    const likenessHead = modal.ops[0];
    const predicativeLikeness = likenessHead?.kind === "modal" &&
      likenessHead.modal === "youda" && likenessHead.terminal === "predicative";
    const nominalReadingAvailable = predicateHostLayer?.stem.kind === "candidateSet" &&
      predicateHostLayer.stem.candidates.some((candidate) => candidate.koreanPos === 명사);
    const ambiguousNaNominalAttributive = sourceStemToken !== undefined &&
      isNaAdjCapableNoun(sourceStemToken) && !predicativeLikeness && nominalReadingAvailable;
    const predicateReadingAvailable = predicateHostLayer !== null &&
      !ambiguousNaNominalAttributive &&
      sourceStemToken !== undefined &&
      isNaAdjCapable(sourceStemToken) &&
      stemHasAdmittedProjectionCategory(predicateHostLayer.stem, "adjectival_predicate");
    const bareNominalHost = ambiguousNaNominalAttributive || (!predicateReadingAvailable && ((predicateHostLayer !== null &&
      stemSupportsProjectionCategory(predicateHostLayer.stem, "nominal")) ||
      isKoreanNounAble(root.frame.host.head.allomorphHint?.koreanPos)));
    const predicateHostForRender = predicateHostSource === undefined || !predicateReadingAvailable
      ? predicateHostSource
      : adjectivalLikenessPredicateHost(predicateHostSource);
    const predicateHost = predicateHostForRender === undefined || bareNominalHost
      ? null
      : renderPredicateProjectionHost(
        predicateHostForRender,
        formal,
        lookups,
        _numeric,
        nominalCommitContextClauseLayout(plan)
      );
    const nominalCandidateText = ambiguousNaNominalAttributive && predicateHostLayer?.stem.kind === "candidateSet"
      ? predicateHostLayer.stem.candidates.find((candidate) => candidate.koreanPos === 명사)?.lemma
      : undefined;
    const hostText = predicateHost?.text ?? nominalCandidateText ?? root.frame.host.head.allomorphHint?.korean ?? root.frame.host.head.token.surface;
    const committed = commitSharedNominalLikenessTailChain({
      headText: hostText,
      ops: modal.ops,
      context: { formal, lookups, outgoingBoundary: modal.boundary },
      ...(plan.headTailCandidate === undefined ? {} : { headTailCandidate: plan.headTailCandidate }),
      ...(plan.headTailSourceCandidate === undefined ? {} : { headTailSourceCandidate: plan.headTailSourceCandidate })
    });
    if ("ok" in committed) {
      throw new Error(`nominal host likeness continuation render failed: ${committed.reason}`);
    }
    const nominalizedKorean = modal.nominalizedAttributive === true
      ? `${committed.korean} 것`
      : committed.korean;
    const sharedTailChainRender: SharedTailChainRenderResult = {
      ...committed,
      korean: nominalizedKorean,
      warnings: [...modal.warnings, ...(predicateHost?.warnings ?? []), ...committed.warnings]
    };
    return {
      text: sharedTailChainRender.korean,
      warnings: sharedTailChainRender.warnings,
      sharedTailChainRender
    };
  }
  if (modal.kind === "nominalHostLikenessQuoteFocusLimitNegationProjection") {
    const hostText = root.frame.host.head.allomorphHint?.korean ?? root.frame.host.head.token.surface;
    const proposition = `${hostText} ${formal ? "같다는" : "같단"}`;
    const text = `${proposition} 법은 ${renderHazuNegativeTail({
      formal,
      polite: modal.polite,
      past: modal.past,
      lookups
    })}`;
    const sharedTailChainRender = buildSharedTailChainRenderResult({
      korean: text,
      polite: modal.polite,
      warnings: [...modal.warnings],
      descriptor: plan.headTailCandidate,
      sourceCandidate: plan.headTailSourceCandidate,
      fallbackTailSourceKind: "predicate_root",
      fallbackHeadKind: "nominal",
      fallbackTailSegmentKinds: ["quote_focus_limit_negation"],
      fallbackRequiredContinuationCapabilityIds: [
        "tail_segment_likeness",
        "tail_segment_quote_focus_limit_negation",
        "predicate_tail_quote"
      ]
    });
    return { text, warnings: sharedTailChainRender.warnings, sharedTailChainRender };
  }
  const hostText = root.frame.host.head.allomorphHint?.korean ?? root.frame.host.head.token.surface;
  const sharedTailChainRenderForText = (text: string): PredicateNominalHostRender => {
    const sharedTailChainRender = buildSharedTailChainRenderResult({
      korean: text,
      polite: false,
      warnings: [],
      descriptor: plan.headTailCandidate,
      sourceCandidate: plan.headTailSourceCandidate,
      fallbackTailSourceKind: "predicate_root",
      fallbackHeadKind: "nominal",
      fallbackTailSegmentKinds: ["likeness"],
      fallbackRequiredContinuationCapabilityIds: ["tail_segment_likeness"]
    });
    return { text, warnings: [], sharedTailChainRender };
  };
  switch (modal.terminal) {
    case "attributive_na":
      return sharedTailChainRenderForText(`${hostText} 같은`);
    case "adverbial_ni":
      return sharedTailChainRenderForText(`${hostText}처럼`);
    case "predicative":
      return sharedTailChainRenderForText(`${hostText} ${formal ? "같습니다" : "같아"}`);
  }
}

function adjectivalLikenessPredicateHost(
  host: PredicateNominalProjectionHost
): PredicateNominalProjectionHost {
  if (host.root.tail.kind !== "auxLayer" || host.root.tail.stem.kind !== "candidateSet") {
    return host;
  }
  const stem = host.root.tail.stem;
  const adjectiveCandidate = stem.candidates.find((candidate) => candidate.koreanPos === 형용사);
  if (adjectiveCandidate === undefined) {
    return host;
  }
  return {
    ...host,
    root: {
      ...host.root,
      tail: {
        ...host.root.tail,
        stem: {
          ...stem,
          committedSense: stemCandidateIdentity(adjectiveCandidate),
          committedSenseRealization: {
            category: "adjectival_predicate",
            projectionKinds: ["direct_adjectival"]
          }
        }
      }
    }
  };
}

function renderProductiveAdjectivalSuffixProjection(
  plan: NominalHeadTailChainPlan,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): PredicateNominalHostRender {
  const root = plan.realization.root;
  if (root.kind !== "productiveAdjectivalSuffix") {
    return { text: "", warnings: [] };
  }
  const suffix = root.frame.suffix;
  const projection = root.frame.projection;
  if (projection.kind === "adverbial" || projection.kind === "nominalized") {
    const ending = projection.kind === "adverbial" ? "게" : "ㅁ/음";
    const text = conjugate(suffix.koreanLemma, irregularType(suffix.irregular), ending);
    const warnings = projection.kind === "adverbial" && projection.fragment === true
      ? [productiveAdjectivalSuffixAdverbialFragmentWarning(root)]
      : [];
    const sharedTailChainRender = buildSharedTailChainRenderResult({
      korean: text,
      polite: false,
      warnings,
      descriptor: plan.headTailCandidate,
      sourceCandidate: plan.headTailSourceCandidate,
      fallbackTailSourceKind: "nominal_productive_adjectival_suffix",
      fallbackHeadKind: "nominal",
      fallbackTailSegmentKinds: [projection.kind],
      fallbackRequiredContinuationCapabilityIds: [
        projection.kind === "adverbial"
          ? "productive_adjectival_suffix_adverbial"
          : "productive_adjectival_suffix_nominalized"
      ]
    });
    return { text, warnings, sharedTailChainRender };
  }
  const clauseRole = syntheticTerminalClauseRole({
    tokenSpan: { start: root.source.start, end: root.source.end - 1 },
    predicateTokenIdx: suffix.source.start
  });
  const layout = nominalCommitContextClauseLayout(plan);
  const commitContext: CommitContext = clauseRoleCommitContext({
    clauseRole,
    root: projection.root,
    sourceTokens: plan.realization.commitContext?.tokens ?? root.source.tokens,
    ...(layout === undefined ? {} : { layoutOverride: layout }),
    lookups,
    numeric
  });
  const committed = commitSharedTailParserRoot({
    root: projection.root,
    context: { formal, lookups },
    commitContext,
    ...(plan.headTailCandidate === undefined ? {} : { descriptor: plan.headTailCandidate }),
    ...(plan.headTailSourceCandidate === undefined ? {} : { sourceCandidate: plan.headTailSourceCandidate }),
    fallbackHeadKind: "nominal"
  });
  if ("ok" in committed) {
    throw new Error(`productive adjectival suffix render failed: ${committed.reason}`);
  }
  return {
    text: committed.korean,
    warnings: committed.warnings,
    sharedTailChainRender: committed
  };
}

function productiveAdjectivalSuffixAdverbialFragmentWarning(
  root: Extract<NominalHeadTailChainPlan["realization"]["root"], { readonly kind: "productiveAdjectivalSuffix" }>
): Warning {
  return {
    type: "render_fallback",
    severity: "warning",
    opKind: "productive_adjectival_suffix_adverbial_fragment",
    span: { start: root.source.start, end: root.source.end },
    message: "productive adjectival suffix adverbial fragment rendered without following predicate evidence"
  };
}

function renderPredicateNominalHost(
  root: PredicateNominalHostNode,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables,
  layoutOverride?: PredicateNominalProjectionHost["layout"]
): PredicateNominalHostRender {
  return renderPredicateProjectionHost(root.host, formal, lookups, numeric, layoutOverride);
}

function quotedHostAsQuoteFocus(
  host: PredicateNominalHostNode["host"],
  frame: NominalFrame
): PredicateNominalHostNode["host"] | null {
  const tail = host.root.tail;
  const carrier = tail.kind === "auxLayer" ? tail.ops.at(-1) : undefined;
  if (tail.kind !== "auxLayer" || carrier?.kind !== "predicateQuoteCarrier") {
    return null;
  }
  const quoteBoundary = { koreanClauseForm: "다고", requestTailKind: null, focusParticle: "は" } as const;
  const markerIndices = Array.from({ length: frame.source.end - frame.source.start }, (_, offset) => frame.source.start + offset);
  const connective = createConnectiveOp({
    connective: "quotative",
    surface: frame.markerSurface,
    source: { tokens: frame.source.tokens, tokenIndices: markerIndices },
    quoteBoundary
  });
  return {
    ...host,
    root: { ...host.root, tail: { ...tail, ops: [...tail.ops.slice(0, -1), connective], terminal: null } },
    outgoingBoundary: {
      kind: "接続助詞",
      connectiveKind: "quotative",
      surface: frame.markerSurface,
      tokenIdx: frame.source.end - 1,
      tokenSpan: { start: frame.source.start, end: frame.source.end - 1 },
      quoteBoundary
    }
  };
}

function renderPredicateProjectionHost(
  host: PredicateNominalHostNode["host"],
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables,
  layoutOverride?: PredicateNominalProjectionHost["layout"],
  options: { readonly closedClause?: boolean } = {}
): PredicateNominalHostRender {
  const layout = host.layout ?? layoutOverride;
  const commitContext = clauseRoleCommitContext({
    clauseRole: host,
    root: host.root,
    ...(host.sourceTokens === undefined ? {} : { sourceTokens: host.sourceTokens }),
    ...(host.commitmentGrammar === undefined ? {} : { grammar: host.commitmentGrammar }),
    ...(layoutOverride === undefined ? {} : { layoutOverride }),
    lookups,
    numeric
  });
  if (host.projection === "gerund_nominalizer") {
    const gerund = commitSharedTailParserGerundRoot({
      root: host.root,
      context: {
        formal,
        outgoingBoundary: host.outgoingBoundary,
        ...(layout === undefined ? {} : { layout }),
        lookups
      },
      commitContext
    });
    if ("ok" in gerund) {
      throw new Error(`predicate gerund host render failed: ${gerund.reason}`);
    }
    return {
      text: gerund.korean,
      warnings: gerund.warnings,
      sharedTailChainRender: gerund
    };
  }
  const committed = commitSharedTailParserRoot({
    root: host.root,
    context: {
      formal,
      outgoingBoundary: host.outgoingBoundary,
      ...(layout === undefined ? {} : { layout }),
      lookups
    },
    commitContext
  });
  if ("ok" in committed) {
    throw new Error(`predicate nominal host render failed: ${committed.reason}`);
  }
  if (options.closedClause === true) {
    return { text: committed.korean, warnings: committed.warnings, sharedTailChainRender: committed };
  }
  switch (host.projection) {
    case "quoted_nominalizer":
    case "attributive_nominalizer": {
      return {
        text: `${committed.korean} 것`,
        warnings: committed.warnings,
        sharedTailChainRender: buildSharedTailChainRenderResult({
          korean: `${committed.korean} 것`,
          polite: committed.polite,
          warnings: committed.warnings,
          descriptor: undefined,
          sourceCandidate: undefined,
          fallbackTailSourceKind: committed.tailSourceKind,
          fallbackHeadKind: committed.headKind,
          fallbackTailSegmentKinds: committed.tailSegmentKinds,
          fallbackRequiredContinuationCapabilityIds: committed.requiredContinuationCapabilityIds,
          ...(committed.committedTailRoot === undefined ? {} : { committedTailRoot: committed.committedTailRoot })
        })
      };
    }
    case "host_bearing_likeness": {
      return {
        text: committed.korean,
        warnings: committed.warnings,
        sharedTailChainRender: committed
      };
    }
    case "nominal_head":
      throw new Error("nominal_head predicate projection host must be realized by its renyou nominal head node");
  }
}

function renderRenyouNominalHead(
  plan: NominalHeadTailChainPlan,
  root: RenyouNominalHeadNode,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): PredicateNominalHostRender {
  const text = realizeRenyouNominalHeadText(root, formal, lookups, numeric);
  if (text === null || text.length === 0) {
    throw new Error(`renyou nominal head render failed: ${root.evidence.kind} at ${root.source.start}`);
  }
  return {
    text,
    warnings: [],
    sharedTailChainRender: buildSharedTailChainRenderResult({
      korean: text,
      polite: false,
      warnings: [],
      descriptor: plan.headTailCandidate,
      sourceCandidate: plan.headTailSourceCandidate,
      fallbackTailSourceKind: "nominal_renyou_head",
      fallbackHeadKind: "nominal",
      fallbackTailSegmentKinds: [root.evidence.kind],
      fallbackRequiredContinuationCapabilityIds: ["renyou_nominal_head"]
    })
  };
}

function realizeRenyouNominalHeadText(
  root: RenyouNominalHeadNode,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): string | null {
  const host = root.host;
  const commitContext = clauseRoleCommitContext({
    clauseRole: host,
    root: host.root,
    ...(host.sourceTokens === undefined ? {} : { sourceTokens: host.sourceTokens }),
    ...(host.commitmentGrammar === undefined ? {} : { grammar: host.commitmentGrammar }),
    lookups,
    numeric
  });
  const lexicalNoun = root.lexicalNoun;
  if (lexicalNoun !== null) {
    return winnerKorean(commitWinner({ ...lexicalNoun, senses: lexicalNoun.senses ?? [] })) ?? null;
  }
  if (root.evidence.kind === "derivational_suffix") {
    const projected = withProjectedDerivationalStem(host.root, { formal, lookups, numeric, commitContext });
    const stem = projected === null ? null : firstAuxLayer(projected.tail)?.stem ?? null;
    return stem?.kind === "noun" ? stem.lemma : null;
  }
  const layer = firstAuxLayer(host.root.tail);
  if (layer === null) {
    return null;
  }
  const stem = layer.stem;
  if (stem.kind === "candidateSet") {
    const committedSense = stem.committedSense;
    if (committedSense === undefined) {
      return null;
    }
    const winner = stem.candidates.find((candidate) =>
      stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), committedSense)
    );
    if (winner?.nominalized !== undefined && winner.nominalized.length > 0) {
      return winner.nominalized;
    }
  }
  const committed = commitTail(host.root, { ...commitContext, lookups, numeric }).root;
  const projectionHost = committed.tail.kind === "auxLayer" && committed.tail.terminal !== null
    ? { ...committed, tail: { ...committed.tail, terminal: null } }
    : committed;
  const projected = renderDerivationalSuffixHostProjection({
    host: projectionHost,
    hostForm: "nominal_m",
    suffixSource: stem.source,
    ctx: { formal, lookups }
  });
  return projected.ok ? projected.text : null;
}
