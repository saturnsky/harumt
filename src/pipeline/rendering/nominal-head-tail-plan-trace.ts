import type { AuxOpNode, TailRoot } from "../head-tail/tail/predicate-root/grammar.js";
import { renderTailWithSourceTargetTrace } from "../head-tail/tail/predicate-root/render-root.js";
import { commitSharedTailParserGerundRoot, commitSharedTailParserRoot } from "../head-tail/lifecycle/render.js";
import { clauseRoleCommitContext } from "../head-tail/lifecycle/commit-context.js";
import { renderAniTerminal } from "../head-tail/tail/korean-terminal.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { RenderedTarget, TargetSegment } from "../../types/projection.js";
import type { NominalHeadTailChainPlan } from "../../types/render-plan.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import { createConnectiveOp } from "../head-tail/tail/predicate-root/op-builders.js";
import { type RenderTraceOptions, renderedTargetFromSegments, syntheticTargetSegment, sourceSpanForRuntimeTokens } from "./render-plan-segments.js";

export function nominalHeadTailHostTrace(
  plan: NominalHeadTailChainPlan,
  options: RenderTraceOptions,
  numeric: NumericTables
): RenderedTarget | null {
  switch (plan.realization.root.kind) {
    case "predicateNominalHost":
      return predicateNominalHostTrace(plan, options, numeric);
    case "nominalPhrase":
      return nominalPhraseHeadTrace(plan);
    case "hostBearingLikeness":
      return nominalPhraseHeadTraceFromHost(plan.realization.root.frame.host);
    case "productiveAdjectivalSuffix":
      return nominalPhraseHeadTraceFromHost(plan.realization.root.frame.host);
    case "renyouNominalHead":
      return null;
  }
}

function nominalPhraseHeadTrace(plan: NominalHeadTailChainPlan): RenderedTarget | null {
  if (plan.realization.root.kind !== "nominalPhrase") {
    return null;
  }
  return nominalPhraseHeadTraceFromHost(plan.realization.root);
}

function nominalPhraseHeadTraceFromHost(host: Extract<NominalHeadTailChainPlan["realization"]["root"], { readonly kind: "nominalPhrase" }>): RenderedTarget | null {
  const hint = host.head.allomorphHint?.korean;
  if (hint === undefined || hint.length === 0) {
    return null;
  }
  return renderedTargetFromSegments([
    syntheticTargetSegment({
      text: hint,
      sourceSpan: sourceSpanForRuntimeTokens(host.head.source?.tokens ?? [host.head.token]),
      renderPlanKind: "headTailChain",
      kind: "lexeme",
      projectionConfidence: "semantic"
    })
  ]);
}

function predicateNominalHostTrace(
  plan: NominalHeadTailChainPlan,
  options: RenderTraceOptions,
  numeric: NumericTables
): RenderedTarget | null {
  const root = plan.realization.root;
  if (root.kind !== "predicateNominalHost") {
    return null;
  }
  const host = root.host;
  const layout = predicateProjectionHostLayoutForTrace(plan);
  const context = {
    formal: options.formal ?? false,
    outgoingBoundary: host.outgoingBoundary,
    ...(layout === undefined ? {} : { layout }),
    lookups: options.lookups
  };
  const commitContext = clauseRoleCommitContext({
    clauseRole: host,
    root: host.root,
    ...(host.sourceTokens === undefined ? {} : { sourceTokens: host.sourceTokens }),
    ...(host.commitmentGrammar === undefined ? {} : { grammar: host.commitmentGrammar }),
    ...(layout === undefined ? {} : { layoutOverride: layout }),
    lookups: options.lookups,
    numeric
  });
  const committed = host.projection === "gerund_nominalizer"
    ? commitSharedTailParserGerundRoot({
      root: host.root,
      context,
      commitContext,
      fallbackHeadKind: "nominal"
    })
    : commitSharedTailParserRoot({
      root: host.root,
      context,
      commitContext,
      fallbackHeadKind: "nominal"
    });
  if ("ok" in committed) {
    return null;
  }
  if (host.projection === "gerund_nominalizer") {
    const traced = tracePredicateGerundProjectionHost(committed.committedTailRoot, committed.korean, options);
    if (traced !== null) {
      return traced;
    }
    return renderedTargetFromSegments([
      syntheticTargetSegment({
        text: committed.korean,
        sourceSpan: sourceSpanForRuntimeTokens(host.source.tokens),
        renderPlanKind: "headTailChain",
        kind: "lexeme",
        projectionConfidence: "semantic"
      })
    ]);
  }
  if (committed.committedTailRoot === undefined) {
    return null;
  }
  const traced = renderTailWithSourceTargetTrace(committed.committedTailRoot, {
    formal: options.formal ?? false,
    lookups: options.lookups
  });
  if (traced === null || traced.text !== committed.korean) {
    return null;
  }
  if (host.projection !== "attributive_nominalizer" && host.projection !== "quoted_nominalizer") {
    return traced;
  }
  return renderedTargetFromSegments([
    ...traced.segments,
    syntheticTargetSegment({
      text: " 것",
      sourceSpan: sourceSpanForRuntimeTokens(root.nominalizer.source.tokens),
      renderPlanKind: "headTailChain",
      kind: "modal",
      projectionConfidence: "owner"
    })
  ]);
}

function tracePredicateGerundProjectionHost(
  root: TailRoot | undefined,
  renderedText: string,
  options: RenderTraceOptions
): RenderedTarget | null {
  if (root === undefined || root.tail.kind !== "auxLayer") {
    return null;
  }
  const baseTail = root.tail.terminal === "attributive"
    ? { ...root.tail, terminal: null }
    : root.tail;
  const projected: TailRoot = {
    ...root,
    tail: {
      ...baseTail,
      ops: [
        ...baseTail.ops,
        buildPredicateGerundProjectionConnective()
      ]
    },
    sfp: null
  };
  const traced = renderTailWithSourceTargetTrace(projected, {
    formal: options.formal ?? false,
    lookups: options.lookups
  });
  return traced !== null && traced.text === renderedText ? traced : null;
}

function predicateProjectionHostLayoutForTrace(
  plan: NominalHeadTailChainPlan
): Extract<NominalHeadTailChainPlan["realization"]["root"], { readonly kind: "predicateNominalHost" }>["host"]["layout"] | undefined {
  if (plan.realization.root.kind !== "predicateNominalHost") {
    return undefined;
  }
  const hostLayout = plan.realization.root.host.layout;
  if (hostLayout !== undefined) {
    return hostLayout;
  }
  const layout = plan.realization.commitContext?.layout;
  if (
    layout !== undefined &&
    typeof (layout as { readonly ownerPredicateOfParticle?: unknown }).ownerPredicateOfParticle === "function"
  ) {
    return layout as Extract<NominalHeadTailChainPlan["realization"]["root"], { readonly kind: "predicateNominalHost" }>["host"]["layout"];
  }
  return undefined;
}

function nominalHeadTailRestSourceSpan(plan: NominalHeadTailChainPlan): TargetSegment["sourceSpan"] {
  switch (plan.realization.root.kind) {
    case "predicateNominalHost":
      return sourceSpanForRuntimeTokens(plan.realization.frame.source.tokens);
    case "nominalPhrase":
      return sourceSpanForRuntimeTokens(plan.realization.root.source.tokens.slice(1));
    case "hostBearingLikeness":
      return sourceSpanForRuntimeTokens(plan.realization.root.frame.source.tokens.slice(1));
    case "productiveAdjectivalSuffix":
      return sourceSpanForRuntimeTokens(plan.realization.root.frame.source.tokens.slice(1));
    case "renyouNominalHead":
      return sourceSpanForRuntimeTokens(plan.realization.root.source.tokens);
  }
}

function nominalHeadTailRestSegmentKind(plan: NominalHeadTailChainPlan): TargetSegment["kind"] {
  if (plan.realization.root.kind === "productiveAdjectivalSuffix" || plan.realization.root.kind === "hostBearingLikeness") {
    return "modal";
  }
  switch (plan.realization.frame.frameKind) {
    case "lexical_particle":
    case "definition_topic":
    case "host_bearing_likeness":
    case "productive_adjectival_suffix":
      return "modal";
    default:
      return "connective";
  }
}

export function nominalHeadTailRestTraceSegments(
  plan: NominalHeadTailChainPlan,
  restText: string,
  formal: boolean
): readonly TargetSegment[] {
  const negativeCopula = nominalHeadTailNegativeCopulaRestSegments(plan, restText, formal);
  if (negativeCopula !== null) {
    return negativeCopula;
  }
  return [
    syntheticTargetSegment({
      text: restText,
      sourceSpan: nominalHeadTailRestSourceSpan(plan),
      renderPlanKind: "headTailChain",
      kind: nominalHeadTailRestSegmentKind(plan),
      projectionConfidence: "owner"
    })
  ];
}

function nominalHeadTailNegativeCopulaRestSegments(
  plan: NominalHeadTailChainPlan,
  restText: string,
  formal: boolean
): readonly TargetSegment[] | null {
  const projection = plan.realization.frame.projection;
  if (projection.kind !== "negativeCopulaPredicate") {
    return null;
  }
  const terminal = renderAniTerminal({
    formal,
    polite: projection.polite,
    past: projection.past
  });
  if (!restText.endsWith(terminal)) {
    return null;
  }
  const prefix = restText.slice(0, -terminal.length);
  if (prefix.length === 0) {
    return null;
  }
  const source = nominalHeadTailNegativeCopulaSourceSplit(plan);
  if (source === null) {
    return null;
  }
  const trimmedPrefix = prefix.trimEnd();
  if (trimmedPrefix.length === 0) {
    return null;
  }
  const spacing = prefix.slice(trimmedPrefix.length);
  const segments: TargetSegment[] = [
    syntheticTargetSegment({
      text: trimmedPrefix,
      sourceSpan: source.prefixSpan,
      renderPlanKind: "headTailChain",
      kind: nominalHeadTailRestSegmentKind(plan),
      projectionConfidence: "owner"
    })
  ];
  if (spacing.length > 0) {
    segments.push(syntheticTargetSegment({
      text: spacing,
      sourceSpan: null,
      renderPlanKind: "headTailChain",
      kind: "punctuation",
      projectionConfidence: "owner"
    }));
  }
  segments.push(...nominalHeadTailNegativeCopulaTerminalSegments(plan, terminal, source.negativeTokens));
  return segments;
}

function nominalHeadTailNegativeCopulaSourceSplit(
  plan: NominalHeadTailChainPlan
): {
  readonly prefixSpan: TargetSegment["sourceSpan"];
  readonly negativeTokens: readonly RuntimeHaruToken[];
} | null {
  const tokens = plan.realization.frame.source.tokens;
  const projection = plan.realization.frame.projection;
  if (projection.kind !== "negativeCopulaPredicate") {
    return null;
  }
  const negativeStart = tokens.findIndex((token) =>
    token.dictionaryForm === "ない" ||
    token.surface === "ない" ||
    token.surface === "ぬ" ||
    token.surface === "ん" ||
    token.surface.startsWith("なかっ") ||
    (projection.polite && token.surface.startsWith("ませ"))
  );
  if (negativeStart < 0) {
    return null;
  }
  return {
    prefixSpan: sourceSpanForRuntimeTokens(tokens.slice(0, negativeStart)),
    negativeTokens: tokens.slice(negativeStart)
  };
}

function nominalHeadTailNegativeCopulaTerminalSegments(
  plan: NominalHeadTailChainPlan,
  terminal: string,
  sourceTokens: readonly RuntimeHaruToken[]
): readonly TargetSegment[] {
  const split = nominalHeadTailNegativeCopulaTerminalSourceSplit(plan, terminal, sourceTokens);
  if (split === null) {
    return [
      syntheticTargetSegment({
        text: terminal,
        sourceSpan: sourceSpanForRuntimeTokens(sourceTokens),
        renderPlanKind: "headTailChain",
        kind: "aux",
        projectionConfidence: "semantic"
      })
    ];
  }
  return [
    syntheticTargetSegment({
      text: split.negativeText,
      sourceSpan: sourceSpanForRuntimeTokens(split.negativeTokens),
      renderPlanKind: "headTailChain",
      kind: "aux",
      projectionConfidence: "semantic"
    }),
    syntheticTargetSegment({
      text: split.tailText,
      sourceSpan: sourceSpanForRuntimeTokens(split.tailTokens),
      renderPlanKind: "headTailChain",
      kind: "aux",
      projectionConfidence: "semantic"
    })
  ];
}

function nominalHeadTailNegativeCopulaTerminalSourceSplit(
  plan: NominalHeadTailChainPlan,
  terminal: string,
  sourceTokens: readonly RuntimeHaruToken[]
): {
  readonly negativeText: string;
  readonly tailText: string;
  readonly negativeTokens: readonly RuntimeHaruToken[];
  readonly tailTokens: readonly RuntimeHaruToken[];
} | null {
  const projection = plan.realization.frame.projection;
  if (projection.kind !== "negativeCopulaPredicate" || !projection.past || !terminal.startsWith("아니")) {
    return null;
  }
  const tailText = terminal.slice("아니".length);
  if (tailText.length === 0) {
    return null;
  }
  const tailStart = nominalHeadTailNegativeCopulaPastSourceStart(sourceTokens, projection.polite);
  if (tailStart <= 0 || tailStart >= sourceTokens.length) {
    return null;
  }
  return {
    negativeText: "아니",
    tailText,
    negativeTokens: sourceTokens.slice(0, tailStart),
    tailTokens: sourceTokens.slice(tailStart)
  };
}

function nominalHeadTailNegativeCopulaPastSourceStart(
  tokens: readonly RuntimeHaruToken[],
  polite: boolean
): number {
  if (polite) {
    const desuIndex = tokens.findIndex((token) =>
      token.dictionaryForm === "です" ||
      token.surface === "でし" ||
      token.surface.startsWith("でし")
    );
    if (desuIndex >= 0) {
      return desuIndex;
    }
  }
  return tokens.findIndex((token) =>
    token.dictionaryForm === "た" ||
    token.surface === "た"
  );
}

export function buildPredicateGerundProjectionConnective(): Extract<AuxOpNode, { readonly kind: "connective" }> {
  return createConnectiveOp({
    connective: "predicate_projection_tame_gerund",
    surface: "",
    source: { tokens: [], tokenIndices: [] }
  });
}
