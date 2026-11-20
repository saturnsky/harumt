import type { RuntimeHaruToken, SourceTokenSpan } from "../../../types/token.js";
import type { RenderPlan } from "../../../types/render-plan.js";
import { isNominalHeadTailChainRenderPlan } from "../../../types/render-plan.js";
import type { LookupTables } from "../../lookup-tables.js";
import type { AuxOpNode, TailRoot } from "../tail/predicate-root/grammar.js";
import type { ClauseBoundary } from "../tail/predicate-root/commit.js";
import { tryBuildCopulaHostChain } from "./copula-host-chain.js";
import type {
  PredicateHeadTailChainHostProjection,
  PredicateHeadTailChainHostTextPart,
  PredicateHeadTailChainRenderPlan
} from "../lifecycle/head-tail-render-plan.js";
import { withParticleStemProjection } from "./nominal-assembly.js";
import type { ParticlePhraseCopulaHostBinding } from "../../clause-layout/particle-phrase-copula.js";
import type { BoundaryKind } from "../../clause-layout/layout-types.js";

export interface ParticlePhraseCopulaChain {
  readonly consumed: number;
  readonly plan: PredicateHeadTailChainRenderPlan;
  readonly root: TailRoot;
  readonly familyId: string;
}

export interface ParticlePhraseCopulaChainInput {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly limit: number;
  readonly binding: ParticlePhraseCopulaHostBinding;
  readonly hostSpan: { readonly start: number; readonly endExclusive: number };
  readonly hostPlan: RenderPlan | null;
  readonly hostSurface: string;
  readonly hostMarkerKind: string | null;
  readonly hostMarkerCopulaBase: string | null;
  readonly hostPauseParts?: readonly PredicateHeadTailChainHostTextPart[];
  readonly hostSourceSpan?: SourceTokenSpan | null;
  readonly lookups: LookupTables;
}

export function tryBuildParticlePhraseCopulaChain(
  input: ParticlePhraseCopulaChainInput
): ParticlePhraseCopulaChain | null {
  const { tokens, binding, hostSpan } = input;
  const hostProjection = particlePhraseHostProjection(input);
  if (hostProjection === null) {
    return null;
  }
  const chain = tryBuildCopulaHostChain({
    tokens,
    limit: input.limit,
    copulaStart: binding.copulaStart,
    chainEndExclusive: binding.chainEndExclusive,
    stemSpan: hostSpan,
    hostHeadIdx: binding.hostHeadIdx,
    sourcePredicateShape: "particle_phrase",
    syntheticReason: `synthetic_particle_phrase_stem:${binding.hostHeadIdx}`,
    lookups: input.lookups,
    acceptLeadingCopula: (leadingCopula) => {
      const copulaSourceTokens = new Set(leadingCopula.source.tokenIndices);
      return !binding.hostParticleOwners.some((owner) => !copulaSourceTokens.has(owner));
    }
  });
  if (chain === null) {
    return null;
  }
  return {
    consumed: chain.consumed,
    root: chain.root,
    familyId: chain.familyId,
    plan: {
      kind: "headTailChain",
      clauseRole: {
        clauseIndex: binding.clauseIndex < 0 ? 0 : binding.clauseIndex,
        tokenSpan: { start: hostSpan.start, end: chain.contentEnd },
        contentSpan: { start: hostSpan.start, end: chain.contentEnd },
        predicateTokenIdx: binding.hostHeadIdx,
        outgoingBoundary: copulaChainOutgoingBoundary(chain.layer.ops, binding.clauseBoundaryKind)
      },
      realization: {
        kind: "predicate",
        root: chain.root,
        hostProjection,
        sourceTokens: tokens,
        warnings: []
      }
    }
  };
}

function particlePhraseHostProjection(
  input: ParticlePhraseCopulaChainInput
): PredicateHeadTailChainHostProjection | null {
  const projection = particlePhraseHostBaseProjection(input);
  const pause = input.hostPauseParts ?? [];
  if (projection === null || pause.length === 0) {
    return projection;
  }
  return {
    kind: "render_plan_sequence",
    parts: [
      projection.kind === "particle_surface"
        ? {
          kind: "hostText",
          text: projection.text,
          segmentKind: "particle",
          projectionConfidence: "owner",
          ...(input.hostSourceSpan === undefined ? {} : { sourceSpan: input.hostSourceSpan })
        }
        : {
          kind: "hostPlan",
          plan: projection.base,
          ...(input.hostSourceSpan === undefined ? {} : { sourceSpan: input.hostSourceSpan })
        },
      ...pause
    ],
    expectedShape: "particle_phrase"
  };
}

function particlePhraseHostBaseProjection(
  input: ParticlePhraseCopulaChainInput
): Extract<PredicateHeadTailChainHostProjection, { kind: "particle_surface" | "particle_stem" }> | null {
  const { hostPlan } = input;
  if (input.hostMarkerKind !== null) {
    const declared = input.hostMarkerCopulaBase;
    return declared === null || declared.length === 0
      ? null
      : { kind: "particle_surface", text: declared };
  }
  if (hostPlan === null || hostPlan.kind === "fixedText") {
    const text = hostPlan === null ? input.hostSurface : hostPlan.text;
    return text.length === 0 ? null : { kind: "particle_surface", text };
  }
  if (!isNominalHeadTailChainRenderPlan(hostPlan)) {
    return null;
  }
  const projected = withParticleStemProjection(hostPlan);
  return isNominalHeadTailChainRenderPlan(projected)
    ? { kind: "particle_stem", base: projected }
    : null;
}

export function copulaChainOutgoingBoundary(
  ops: readonly AuxOpNode[],
  clauseBoundaryKind: BoundaryKind | null
): ClauseBoundary {
  const last = ops.at(-1);
  if (clauseBoundaryKind !== "connective" || last === undefined || last.kind !== "connective") {
    return { kind: "terminal" };
  }
  const indices = last.source.tokenIndices;
  const start = indices[0];
  const end = indices.at(-1);
  if (start === undefined || end === undefined) {
    return { kind: "terminal" };
  }
  return {
    kind: "接続助詞",
    connectiveKind: last.connective,
    surface: last.surface,
    tokenIdx: end,
    tokenSpan: { start, end }
  };
}
