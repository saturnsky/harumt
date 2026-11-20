import type { AdjStem, AuxLayerNode, AuxOpNode, ProjectedHostSegments, SourcePredicateShape, TailNode } from "../tail/predicate-root/grammar.js";
import type { TailRoot } from "../tail/predicate-root/grammar.js";
import type { Warning } from "../../../types/warning.js";
import {
  isNominalHeadTailChainRenderPlan,
  isPredicateHeadTailChainRenderPlan
} from "../../../types/render-plan.js";
import type {
  HeadTailChainRenderPlan,
  PredicateHeadTailChainHostProjection,
  PredicateHeadTailChainHostSequencePart,
  PredicateHeadTailChainHostTextPart,
  PredicateHeadTailChainRenderPlan
} from "./head-tail-render-plan.js";
import type { IrregularType } from "../../../generator/conjugator.js";
import type { RenderedTarget, TargetSegment } from "../../../types/projection.js";
import { 형용사 } from "../../../types/pos.js";
import { clauseRoleCommitContext } from "./commit-context.js";
import { renderNominalTailChain } from "../head/adapters/nominal/render.js";
import { commitTail, type CommitContext } from "../tail/predicate-root/commit.js";
import { withProjectedDerivationalStem } from "../tail/predicate-root/derivational-host-base.js";
import { renderNominalHostLikenessContinuation } from "../tail/predicate-root/renderers/noun-copula-tail-forms.js";
import { renderTail, renderTailPredicateGerundProjection } from "../tail/predicate-root/render-root.js";
import type { RenderContext, RenderFailure } from "../tail/predicate-root/renderers/base-model.js";
import type { HeadTailCandidateTraceDescriptor } from "../head/profile.js";
import type { HeadTailCandidate } from "../tail/chain.js";
import type { LookupTables } from "../../lookup-tables.js";
import type { NumericTables } from "../../../generator/numeric-lookup.js";
import { numericHostBaseSurface } from "../tail/predicate-root/numeric-host-base.js";

type TailSegmentDescriptor = HeadTailCandidateTraceDescriptor["tailSegments"][number];

export type HostPlanRealizer = (
  parts: readonly PredicateHeadTailChainHostSequencePart[],
  context: { readonly formal: boolean; readonly lookups: LookupTables; readonly numeric: NumericTables }
) => RenderedTarget;

export interface SharedTailChainRenderResult {
  readonly kind: "sharedTailChainRender";
  readonly tailSourceKind: string;
  readonly headKind: string;
  readonly descriptor?: HeadTailCandidateTraceDescriptor;
  readonly sourceCandidate?: HeadTailCandidate;
  readonly committedTailRoot?: TailRoot;
  readonly korean: string;
  readonly polite: boolean;
  readonly tailSegmentKinds: readonly string[];
  readonly requiredContinuationCapabilityIds: readonly string[];
  readonly warnings: readonly Warning[];
}

export function renderHeadTailChainRenderPlan(
  plan: HeadTailChainRenderPlan,
  options: {
    readonly formal?: boolean;
    readonly precedingNumeralKorean?: string;
    readonly precedingAllomorphKorean?: string;
    readonly realizeHostPlan?: HostPlanRealizer;
  } = {},
  lookups: LookupTables,
  numeric: NumericTables
): string {
  const formal = options.formal ?? false;
  if (isNominalHeadTailChainRenderPlan(plan)) {
    return renderNominalTailChain(plan, lookups, numeric, {
      formal,
      ...(options.precedingAllomorphKorean === undefined ? {} : { precedingAllomorphKorean: options.precedingAllomorphKorean })
    });
  }
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    throw new Error("headTailChain render failed: unknown realization kind");
  }

  const committed = commitSharedTailParserChain({
    plan,
    formal,
    lookups,
    numeric,
    ...(options.precedingNumeralKorean === undefined ? {} : { precedingNumeralKorean: options.precedingNumeralKorean }),
    ...(options.realizeHostPlan === undefined ? {} : { realizeHostPlan: options.realizeHostPlan })
  });
  if ("ok" in committed) {
    throw new Error(`headTailChain render failed: ${committed.reason}`);
  }
  return committed.korean;
}

export function buildSharedTailChainRenderResult(options: {
  readonly korean: string;
  readonly polite: boolean;
  readonly warnings: readonly Warning[];
  readonly descriptor: HeadTailCandidateTraceDescriptor | undefined;
  readonly sourceCandidate: HeadTailCandidate | undefined;
  readonly fallbackTailSourceKind: string;
  readonly fallbackHeadKind: string;
  readonly fallbackTailSegmentKinds?: readonly string[];
  readonly fallbackRequiredContinuationCapabilityIds?: readonly string[];
  readonly committedTailRoot?: TailRoot;
}): SharedTailChainRenderResult {
  return {
    kind: "sharedTailChainRender",
    ...sharedTailChainRenderMetadata({
      descriptor: options.descriptor,
      sourceCandidate: options.sourceCandidate,
      fallbackTailSourceKind: options.fallbackTailSourceKind,
      fallbackHeadKind: options.fallbackHeadKind,
      fallbackTailSegmentKinds: options.fallbackTailSegmentKinds,
      fallbackRequiredContinuationCapabilityIds: options.fallbackRequiredContinuationCapabilityIds
    }),
    ...(options.descriptor === undefined ? {} : { descriptor: options.descriptor }),
    ...(options.sourceCandidate === undefined ? {} : { sourceCandidate: options.sourceCandidate }),
    ...(options.committedTailRoot === undefined ? {} : { committedTailRoot: options.committedTailRoot }),
    korean: options.korean,
    polite: options.polite,
    warnings: options.warnings
  };
}

export function commitSharedNominalLikenessTailChain(options: {
  readonly headText: string;
  readonly ops: readonly AuxOpNode[];
  readonly context: RenderContext;
  readonly headTailCandidate?: HeadTailCandidateTraceDescriptor;
  readonly headTailSourceCandidate?: HeadTailCandidate;
}): RenderFailure | SharedTailChainRenderResult {
  const tailSegments = sharedTailSegmentDescriptors(options.headTailCandidate, options.headTailSourceCandidate);
  if (
    tailSegments !== undefined &&
    tailSegments.length > 0 &&
    !tailSegments.some((segment) => segment.kind === "likeness")
  ) {
    return { ok: false, reason: "shared nominal likeness renderer requires a likeness tail segment" };
  }
  const rendered = renderNominalHostLikenessContinuation(options.headText, options.ops, options.context);
  if (!rendered.ok) {
    return rendered;
  }
  return buildSharedTailChainRenderResult({
    korean: rendered.text,
    polite: rendered.polite,
    warnings: rendered.warnings ?? [],
    descriptor: options.headTailCandidate,
    sourceCandidate: options.headTailSourceCandidate,
    fallbackTailSourceKind: "predicate_root",
    fallbackHeadKind: "nominal"
  });
}

export function commitSharedTailParserChain(options: {
  readonly plan: PredicateHeadTailChainRenderPlan;
  readonly formal: boolean;
  readonly preferSourceCandidateRoot?: boolean;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly precedingNumeralKorean?: string;
  readonly realizeHostPlan?: HostPlanRealizer;
}): RenderFailure | SharedTailChainRenderResult {
  const source = tailParserCommitSourceForPlan(options.plan, options.preferSourceCandidateRoot ?? true);
  const commitContext = commitContextForTailChain(options.plan, source.root, options.lookups, options.numeric);
  const hosted = withProjectedHostBase(source.root, options.plan.realization.hostProjection, {
    formal: options.formal,
    lookups: options.lookups,
    numeric: options.numeric,
    commitContext,
    ...(options.realizeHostPlan === undefined ? {} : { realizeHostPlan: options.realizeHostPlan })
  });
  if (hosted === null) {
    return { ok: false, reason: "projected copula host produced no usable base" };
  }
  const result = commitSharedTailParserRoot({
    root: hosted,
    context: {
      formal: options.formal,
      outgoingBoundary: options.plan.clauseRole.outgoingBoundary,
      lookups: options.lookups,
      ...(options.plan.clauseRole.layout === undefined ? {} : { layout: options.plan.clauseRole.layout }),
      ...(options.precedingNumeralKorean === undefined ? {} : { precedingNumeralKorean: options.precedingNumeralKorean })
    },
    commitContext,
    ...(source.descriptor === undefined ? {} : { descriptor: source.descriptor }),
    ...(source.sourceCandidate === undefined ? {} : { sourceCandidate: source.sourceCandidate }),
    fallbackHeadKind: "predicate"
  });
  if ("ok" in result || options.plan.realization.quotedKotoTopicContraction !== true) {
    return result;
  }
  return {
    ...result,
    korean: `${result.korean}${options.formal ? " 것은" : " 건"}`
  };
}

export function commitSharedTailParserRoot(options: {
  readonly root: TailRoot;
  readonly context: RenderContext;
  readonly commitContext: CommitContext;
  readonly descriptor?: HeadTailCandidateTraceDescriptor;
  readonly sourceCandidate?: HeadTailCandidate;
  readonly fallbackHeadKind?: string;
}): RenderFailure | SharedTailChainRenderResult {
  const committed = commitTail(options.root, options.commitContext);
  const rendered = renderTail(committed.root, options.context);
  if (!rendered.ok) {
    return rendered;
  }
  return buildSharedTailChainRenderResult({
    committedTailRoot: committed.root,
    korean: rendered.text,
    polite: rendered.polite,
    warnings: [...committed.warnings, ...(rendered.warnings ?? [])],
    descriptor: options.descriptor,
    sourceCandidate: options.sourceCandidate,
    fallbackTailSourceKind: "predicate_root",
    fallbackHeadKind: options.fallbackHeadKind ?? "predicate"
  });
}

export function commitSharedTailParserGerundRoot(options: {
  readonly root: TailRoot;
  readonly context: RenderContext;
  readonly commitContext: CommitContext;
  readonly descriptor?: HeadTailCandidateTraceDescriptor;
  readonly sourceCandidate?: HeadTailCandidate;
  readonly fallbackHeadKind?: string;
}): RenderFailure | SharedTailChainRenderResult {
  const committed = commitTail(options.root, options.commitContext);
  const rendered = renderTailPredicateGerundProjection(committed.root, options.context);
  if (!rendered.ok) {
    return rendered;
  }
  return buildSharedTailChainRenderResult({
    committedTailRoot: committed.root,
    korean: rendered.text,
    polite: rendered.polite,
    warnings: [...committed.warnings, ...(rendered.warnings ?? [])],
    descriptor: options.descriptor,
    sourceCandidate: options.sourceCandidate,
    fallbackTailSourceKind: "predicate_root",
    fallbackHeadKind: options.fallbackHeadKind ?? "predicate",
    fallbackTailSegmentKinds: ["connective"],
    fallbackRequiredContinuationCapabilityIds: ["predicate_tail_connective"]
  });
}

function commitContextForTailChain(
  plan: PredicateHeadTailChainRenderPlan,
  root: TailRoot,
  lookups: LookupTables,
  numeric: NumericTables
): CommitContext {
  return clauseRoleCommitContext({
    clauseRole: plan.clauseRole,
    root,
    ...(plan.realization.sourceTokens === undefined ? {} : { sourceTokens: plan.realization.sourceTokens }),
    ...(plan.realization.commitmentGrammar === undefined ? {} : { grammar: plan.realization.commitmentGrammar }),
    lookups,
    numeric
  });
}

export function withProjectedHostBase(
  root: TailRoot,
  hostProjection: PredicateHeadTailChainHostProjection | undefined,
  context: {
    readonly formal: boolean;
    readonly lookups: LookupTables;
    readonly numeric: NumericTables;
    readonly commitContext?: CommitContext;
    readonly realizeHostPlan?: HostPlanRealizer;
  }
): TailRoot | null {
  if (hostProjection === undefined) {
    return root;
  }
  if (hostProjection.kind === "derivational_suffix") {
    return withProjectedDerivationalStem(root, context);
  }
  if (hostProjection.kind === "render_plan_sequence") {
    return withProjectedHostSequenceBase(root, hostProjection, context);
  }
  const base = hostProjection.kind === "particle_surface"
    ? hostProjection.text
    : hostProjection.kind === "numeral"
      ? numericHostBaseSurface(hostProjection.base)
      : renderNominalTailChain(hostProjection.base, context.lookups, context.numeric, { formal: context.formal });
  if (base.length === 0) {
    return null;
  }
  const expectedShape: SourcePredicateShape =
    hostProjection.kind === "nominal_frame" || hostProjection.kind === "numeral"
      ? "nominal"
      : "particle_phrase";
  const tail = withProjectedHostStemLemma(root.tail, base, expectedShape);
  return tail === null ? null : { ...root, tail };
}

function withProjectedHostSequenceBase(
  root: TailRoot,
  hostProjection: Extract<PredicateHeadTailChainHostProjection, { kind: "render_plan_sequence" }>,
  context: {
    readonly formal: boolean;
    readonly lookups: LookupTables;
    readonly numeric: NumericTables;
    readonly realizeHostPlan?: HostPlanRealizer;
  }
): TailRoot | null {
  const realize = context.realizeHostPlan;
  if (realize === undefined) {
    return null;
  }
  const realizeContext = { formal: context.formal, lookups: context.lookups, numeric: context.numeric };
  const contentParts = hostProjection.parts.filter((part) => !isHostDecorationPart(part));
  const decorationParts = hostProjection.parts.filter(isHostDecorationPart);
  const content = realize(contentParts, realizeContext);
  const decoration = decorationParts.length === 0
    ? { text: "", segments: [] satisfies readonly TargetSegment[] }
    : realize(decorationParts, realizeContext);
  if (content.text.length === 0) {
    return null;
  }
  const reanchor = naAdjectiveReanchoredStemFields(hostProjection, decoration);
  const tail = reanchor === null
    ? withProjectedHostStemLemma(
      root.tail,
      `${content.text}${decoration.text}`,
      hostProjection.expectedShape,
      { segments: [...content.segments, ...decoration.segments] }
    )
    : withReanchoredHostStem(root.tail, hostProjection.expectedShape, reanchor);
  return tail === null ? null : { ...root, tail };
}

function isHostDecorationPart(
  part: PredicateHeadTailChainHostSequencePart
): part is PredicateHeadTailChainHostTextPart {
  return part.kind === "hostText" && part.decoration === true;
}

function naAdjectiveReanchoredStemFields(
  hostProjection: Extract<PredicateHeadTailChainHostProjection, { kind: "render_plan_sequence" }>,
  decoration: RenderedTarget
): ReanchoredHostStemFields | null {
  const lexical = hostProjection.hostHeadLexical;
  if (hostProjection.hostSourceShape !== "na_adjective" || lexical === undefined || lexical.koreanPos !== 형용사) {
    return null;
  }
  const stemRoot = lexical.irregular === "여" && lexical.koreanLemma.endsWith(HADA_PREDICATE_FINAL)
    ? lexical.koreanLemma.slice(0, -HADA_PREDICATE_FINAL.length)
    : "";
  const prefixSegments: TargetSegment[] = [
    ...(stemRoot.length === 0 ? [] : [{
      text: stemRoot,
      sourceSpan: lexical.sourceSpan,
      boundaryBefore: null,
      boundaryAfter: null,
      unit: null,
      renderPlanKind: "headTailChain" as const,
      kind: "lexeme" as const,
      projectionConfidence: "semantic" as const
    }]),
    ...(stemRoot.length === 0
      ? decoration.segments.map((segment) => ({ ...segment, relocatedPunctuation: true as const }))
      : decoration.segments)
  ];
  return {
    lemma: stemRoot.length === 0 ? lexical.koreanLemma : HADA_PREDICATE_FINAL,
    irregular: lexical.irregular,
    koreanPrefix: `${stemRoot}${decoration.text}`,
    projectedHost: { segments: prefixSegments }
  };
}

const HADA_PREDICATE_FINAL = "하다";

interface ReanchoredHostStemFields {
  readonly lemma: string;
  readonly irregular: IrregularType | null;
  readonly koreanPrefix: string;
  readonly projectedHost: ProjectedHostSegments;
}

function withProjectedHostStemLemma(
  node: TailNode,
  lemma: string,
  expectedShape: SourcePredicateShape,
  projectedHost?: ProjectedHostSegments
): TailNode | null {
  return withReplacedHostStemLayer(node, (layer) => {
    const stem = layer.stem;
    return stem.kind === "noun" && stem.sourcePredicateShape === expectedShape
      ? { ...layer, stem: { ...stem, lemma, ...(projectedHost === undefined ? {} : { projectedHost }) } }
      : null;
  });
}

function withReanchoredHostStem(
  node: TailNode,
  expectedShape: SourcePredicateShape,
  fields: ReanchoredHostStemFields
): TailNode | null {
  return withReplacedHostStemLayer(node, (layer) => {
    const stem = layer.stem;
    if (stem.kind !== "noun" || stem.sourcePredicateShape !== expectedShape) {
      return null;
    }
    const adj: AdjStem = {
      kind: "adj",
      lemma: fields.lemma,
      irregular: fields.irregular,
      source: stem.source,
      conjugationAnchor: stem.conjugationAnchor,
      semanticAnchors: stem.semanticAnchors,
      sourcePredicateShape: "na_adjective",
      ...(fields.koreanPrefix.length === 0 ? {} : { koreanPrefix: fields.koreanPrefix }),
      projectedHost: fields.projectedHost
    };
    return { ...layer, stem: adj };
  });
}

function withReplacedHostStemLayer(
  node: TailNode,
  replace: (layer: AuxLayerNode) => AuxLayerNode | null
): TailNode | null {
  if (node.kind !== "connective") {
    return replace(node);
  }
  const inner = replace(node.inner);
  return inner === null ? null : { ...node, inner };
}

function tailParserCommitSourceForPlan(
  plan: PredicateHeadTailChainRenderPlan,
  preferSourceCandidateRoot: boolean
): {
  readonly root: TailRoot;
  readonly descriptor?: HeadTailCandidateTraceDescriptor;
  readonly sourceCandidate?: HeadTailCandidate;
} {
  const sourceRealization = plan.headTailSourceCandidate?.tail.realization;
  if (!preferSourceCandidateRoot || sourceRealization?.kind !== "predicate_root") {
    return { root: plan.realization.root };
  }
  if (sourceRealization.root !== plan.realization.root) {
    return { root: plan.realization.root };
  }
  const sourceCandidate = plan.headTailSourceCandidate;
  if (sourceCandidate === undefined) {
    return { root: plan.realization.root };
  }
  return {
    root: sourceRealization.root,
    ...(plan.headTailCandidate === undefined ? {} : { descriptor: plan.headTailCandidate }),
    sourceCandidate
  };
}

function sharedTailChainRenderMetadata(options: {
  readonly descriptor: HeadTailCandidateTraceDescriptor | undefined;
  readonly sourceCandidate: HeadTailCandidate | undefined;
  readonly fallbackTailSourceKind: string;
  readonly fallbackHeadKind: string;
  readonly fallbackTailSegmentKinds: readonly string[] | undefined;
  readonly fallbackRequiredContinuationCapabilityIds: readonly string[] | undefined;
}): Pick<
  SharedTailChainRenderResult,
  "tailSourceKind" | "headKind" | "tailSegmentKinds" | "requiredContinuationCapabilityIds"
> {
  const segments = sharedTailSegmentDescriptors(options.descriptor, options.sourceCandidate);
  return {
    tailSourceKind: options.sourceCandidate?.tail.realization.kind ?? options.descriptor?.tailSourceKind ?? options.fallbackTailSourceKind,
    headKind: options.sourceCandidate?.head.kind ?? options.descriptor?.headKind ?? options.fallbackHeadKind,
    tailSegmentKinds: segments?.map((segment) => segment.kind) ?? options.fallbackTailSegmentKinds ?? [],
    requiredContinuationCapabilityIds: options.sourceCandidate?.tail.requiredCapabilities ??
      options.descriptor?.requiredContinuationCapabilityIds ??
      options.fallbackRequiredContinuationCapabilityIds ??
      []
  };
}

function sharedTailSegmentDescriptors(
  descriptor: HeadTailCandidateTraceDescriptor | undefined,
  sourceCandidate: HeadTailCandidate | undefined
): readonly TailSegmentDescriptor[] | undefined {
  return sourceCandidate?.tail.segments ?? descriptor?.tailSegments;
}
