import { trailingAllomorphHostText } from "./allomorph-host.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { RenderedTarget, TargetSegment } from "../../types/projection.js";
import type { RenderPlan, ParticleSourceProvenance } from "../../types/render-plan.js";
import type { LookupTables } from "../lookup-tables.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";

export interface RenderTraceOptions {
  readonly formal?: boolean;
  readonly lookups: LookupTables;
  readonly numeric?: NumericTables;
  readonly sourceSpan?: TargetSegment["sourceSpan"];
  readonly unit?: TargetSegment["unit"];
  readonly tokens?: readonly RuntimeHaruToken[];
  readonly precedingNumeralKorean?: string;
  readonly precedingAllomorphKorean?: string;
}

export function attachUnitToRenderedTarget(
  rendered: RenderedTarget,
  unit: TargetSegment["unit"]
): RenderedTarget {
  if (unit === null) {
    return rendered;
  }
  return {
    text: rendered.text,
    segments: rendered.segments.map((segment) => ({
      ...segment,
      unit: segment.unit ?? unit
    }))
  };
}

export function semanticRenderedTargetSegment(
  renderPlanKind: RenderPlan["kind"],
  text: string,
  sourceSpan: TargetSegment["sourceSpan"],
  kind: TargetSegment["kind"],
  projectionConfidence: TargetSegment["projectionConfidence"] = "semantic"
): RenderedTarget {
  return renderedTargetFromSegments([
    syntheticTargetSegment({
      text,
      sourceSpan,
      renderPlanKind,
      kind,
      projectionConfidence
    })
  ]);
}

export function appendOwnerTemplateText(
  segments: TargetSegment[],
  renderPlanKind: RenderPlan["kind"],
  text: string,
  kind: TargetSegment["kind"]
): void {
  if (text.length === 0) {
    return;
  }
  segments.push(syntheticTargetSegment({
    text,
    renderPlanKind,
    kind: /^\s+$/u.test(text) ? "punctuation" : kind,
    projectionConfidence: "owner"
  }));
}

export function appendRenderedTarget(base: RenderedTarget, suffix: RenderedTarget): RenderedTarget {
  return renderedTargetFromSegments([...base.segments, ...suffix.segments]);
}

export function appendOwnerSuffixTrace(
  renderPlanKind: RenderPlan["kind"],
  base: RenderedTarget,
  suffix: string,
  kind: TargetSegment["kind"]
): RenderedTarget {
  if (suffix.length === 0) {
    return base;
  }
  return renderedTargetFromSegments([
    ...base.segments,
    syntheticTargetSegment({
      text: suffix,
      renderPlanKind,
      kind,
      projectionConfidence: "owner"
    })
  ]);
}

export function trimRenderedTargetSuffix(rendered: RenderedTarget, suffix: string): RenderedTarget | null {
  if (suffix.length === 0 || !rendered.text.endsWith(suffix) || rendered.segments.length === 0) {
    return null;
  }
  const segments = rendered.segments.slice();
  let remaining = suffix.length;
  while (remaining > 0 && segments.length > 0) {
    const last = segments[segments.length - 1]!;
    if (last.text.length > remaining) {
      segments[segments.length - 1] = {
        ...last,
        text: last.text.slice(0, last.text.length - remaining)
      };
      remaining = 0;
      break;
    }
    remaining -= last.text.length;
    segments.pop();
  }
  return remaining === 0 ? renderedTargetFromSegments(segments) : null;
}

export function renderedTargetFromSegments(segments: readonly TargetSegment[]): RenderedTarget {
  return {
    text: renderedTargetText(segments),
    segments,
  };
}

export function renderedTargetText(segments: readonly TargetSegment[]): string {
  return segments.map((segment) => segment.text).join("");
}

export function nonIdentityAllomorphHost(surface: string, host: string): string | undefined {
  return host === surface ? undefined : host;
}

export function allomorphHostOfRenderedTarget(target: RenderedTarget, options: RenderTraceOptions): string {
  const host = trailingAllomorphHostText(
    target.segments,
    options.tokens === undefined ? {} : { tokens: options.tokens }
  );
  return host.length > 0 ? host : target.text;
}

export function withFusedParticleSourceSpan(
  target: RenderedTarget,
  source: ParticleSourceProvenance | undefined
): RenderedTarget {
  const particleSpan = source?.sourceSpan ?? null;
  if (particleSpan === null || target.segments.length === 0) {
    return target;
  }
  const lastIndex = target.segments.length - 1;
  const last = target.segments[lastIndex]!;
  const combined = combineSourceSpans(last.sourceSpan, particleSpan);
  return {
    text: target.text,
    segments: [
      ...target.segments.slice(0, lastIndex),
      {
        ...last,
        sourceSpan: combined,
        boundaryBefore: sourceBoundaryBefore(combined),
        boundaryAfter: sourceBoundaryAfter(combined)
      }
    ]
  };
}

export function withParticleSourceProvenance(
  segment: TargetSegment,
  source: ParticleSourceProvenance | undefined
): TargetSegment {
  if (source === undefined) {
    return segment;
  }
  const sourceSpan = source.sourceSpan ?? null;
  return {
    ...segment,
    sourceSpan,
    boundaryBefore: sourceBoundaryBefore(sourceSpan),
    boundaryAfter: sourceBoundaryAfter(sourceSpan),
    unit: source.unit ?? segment.unit
  };
}

export function syntheticTargetSegment(options: {
  readonly text: string;
  readonly sourceSpan?: TargetSegment["sourceSpan"];
  readonly kind: TargetSegment["kind"];
  readonly renderPlanKind: RenderPlan["kind"] | string | null;
  readonly projectionConfidence?: TargetSegment["projectionConfidence"];
  readonly allomorphRole?: TargetSegment["allomorphRole"];
}): TargetSegment {
  const sourceSpan = options.sourceSpan ?? null;
  const allomorphRole = options.allomorphRole ?? (
    options.kind === "punctuation" ||
      options.kind === "quote" ||
      options.kind === "parenthetical" ||
      options.kind === "annotation" ||
      options.kind === "fallback" ||
      sourceSpan === null
      ? undefined
      : "source_anchor"
  );
  return {
    text: options.text,
    sourceSpan,
    boundaryBefore: sourceBoundaryBefore(sourceSpan),
    boundaryAfter: sourceBoundaryAfter(sourceSpan),
    unit: null,
    renderPlanKind: options.renderPlanKind,
    kind: options.kind,
    ...(allomorphRole === undefined ? {} : { allomorphRole }),
    projectionConfidence: options.projectionConfidence ?? "exact",
  };
}

export function sourceSpanForRuntimeTokens(tokens: readonly RuntimeHaruToken[]): TargetSegment["sourceSpan"] {
  let startOrdinal: number | null = null;
  let endOrdinal: number | null = null;
  for (const token of tokens) {
    const span = token.sourceSpan ?? (token.sourceOrdinal === undefined ? null : {
      startOrdinal: token.sourceOrdinal,
      endOrdinal: token.sourceOrdinal + 1,
    });
    if (span === null) {
      continue;
    }
    startOrdinal = startOrdinal === null ? span.startOrdinal : Math.min(startOrdinal, span.startOrdinal);
    endOrdinal = endOrdinal === null ? span.endOrdinal : Math.max(endOrdinal, span.endOrdinal);
  }
  return startOrdinal === null || endOrdinal === null
    ? null
    : { startOrdinal, endOrdinal };
}

export function sourceSpanForRuntimeTokenIndexes(
  tokens: readonly RuntimeHaruToken[],
  indexes: readonly number[]
): TargetSegment["sourceSpan"] {
  return sourceSpanForRuntimeTokens(indexes
    .map((index) => tokens[index])
    .filter((token): token is RuntimeHaruToken => token !== undefined));
}

export function combineSourceSpans(
  ...spans: readonly TargetSegment["sourceSpan"][]
): TargetSegment["sourceSpan"] {
  let startOrdinal: number | null = null;
  let endOrdinal: number | null = null;
  for (const span of spans) {
    if (span === null) {
      continue;
    }
    startOrdinal = startOrdinal === null ? span.startOrdinal : Math.min(startOrdinal, span.startOrdinal);
    endOrdinal = endOrdinal === null ? span.endOrdinal : Math.max(endOrdinal, span.endOrdinal);
  }
  return startOrdinal === null || endOrdinal === null
    ? null
    : { startOrdinal, endOrdinal };
}

export function renderPlanTargetSegmentKind(plan: RenderPlan): TargetSegment["kind"] {
  switch (plan.kind) {
    case "fixedText":
    case "registerText":
    case "numeral":
    case "lemma":
    case "attributive":
    case "conjugatedLemma":
    case "particleizedLemma":
    case "particleizedContent":
    case "compoundNominalSuffix":
    case "semanticCarrierPredicate":
    case "keijoujiAdverb":
    case "keijoujiState":
      return "lexeme";
    case "lexicalParticleAdverbial":
      return "connective";
    case "structuralRelationSequence":
      return "quote";
    case "copulaPredicate":
      return "aux";
    case "headTailChain":
    case "hybridPostAux":
    case "functionalChainResidual":
    case "noda":
      return "modal";
    case "discourseConnective":
    case "reasonBecause":
    case "nominalConnectiveScope":
      return "connective";
    case "quoteHostReportingPassive":
    case "quoteCognitionHost":
    case "conjectureThoughtQuote":
      return "quote";
    case "kaParallel":
    case "kaParallelNegativeAlternative":
    case "nariParallel":
    case "predicateScope":
    case "predicateNominalScope":
    case "predicateScopeCarrier":
    case "pronominalNoNominal":
    case "youdaModality":
    case "nominalDemoAru":
    case "giveRequest":
    case "wakeExplanation":
      return "synthetic";
    case "legacySurfaceComposition":
      return "fallback";
  }
  return assertNeverSegmentKind(plan);
}

export function renderPlanProjectionConfidence(plan: RenderPlan): TargetSegment["projectionConfidence"] {
  if (plan.kind === "fixedText" || plan.kind === "registerText" || plan.kind === "numeral") {
    return "exact";
  }
  if (plan.kind === "legacySurfaceComposition") {
    return "fallback";
  }
  return "owner";
}

export function sourceBoundaryBefore(sourceSpan: TargetSegment["sourceSpan"]): TargetSegment["boundaryBefore"] {
  if (sourceSpan === null) {
    return null;
  }
  return {
    beforeOrdinal: sourceSpan.startOrdinal > 0 ? sourceSpan.startOrdinal - 1 : null,
    afterOrdinal: sourceSpan.startOrdinal
  };
}

export function sourceBoundaryAfter(sourceSpan: TargetSegment["sourceSpan"]): TargetSegment["boundaryAfter"] {
  if (sourceSpan === null) {
    return null;
  }
  return {
    beforeOrdinal: sourceSpan.endOrdinal - 1,
    afterOrdinal: sourceSpan.endOrdinal
  };
}

function assertNeverSegmentKind(plan: never): never {
  throw new Error(`unhandled render plan kind in segment classifier: ${(plan as RenderPlan).kind}`);
}
