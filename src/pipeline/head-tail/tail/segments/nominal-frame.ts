import type { LookupTables } from "../../../lookup-tables.js";
import type { ProjectionEvidenceLayout } from "../../../clause-layout/layout-types.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import type {
  ProjectionCandidateSelector,
  ProjectionTokenSelector
} from "../../grammar.js";
import {
  collectFollowingNounPhraseTokens,
  collectFollowingProjectionBoundaryContext,
  collectFollowingProjectionContextTokens,
  collectPrecedingProjectionBoundaryContext,
  collectPrecedingProjectionContextTokens,
  projectionContextBoundsForToken
} from "../../candidate/context.js";
import {
  projectionCandidateSelectorMatches,
  projectionTokenMatches,
  type ProjectionSelectorContext
} from "../../candidate/selector.js";
import { loadNominalFrameSurfaceMetadata, nominalFrameDataGeneration } from "../../head/adapters/nominal/frame-table.js";
import type {
  NominalFrameKind,
  NominalFrameSpec
} from "../../head/adapters/nominal/grammar.js";

export interface NominalFrameSurfaceSpec {
  readonly id: string;
  readonly kind: NominalFrameKind;
  readonly surface: string;
  readonly focus: NominalFrameSpec["focus"];
  readonly requiresFollowingContent?: boolean;
  readonly ownerMode?: NominalFrameSpec["ownerMode"];
  readonly attachLeft?: boolean;
  readonly head?: ProjectionTokenSelector;
  readonly markerTokens?: readonly ProjectionTokenSelector[];
  readonly markerVerbOwnsObjectArgument?: boolean;
  readonly ownsKaMarker?: boolean;
  readonly match?: readonly ProjectionCandidateSelector[];
  readonly reject?: readonly ProjectionCandidateSelector[];
}

let cachedClauseOpaqueNominalFrameSurfaces: ReadonlySet<string> | null = null;
let cachedKaContinuationNominalFrameSurfaces: ReadonlySet<string> | null = null;
let cachedNominalFrameSurfaceSpecs: readonly NominalFrameSurfaceSpec[] | null = null;
let cachedNominalFrameTailSurfaceSpecs: readonly NominalFrameSurfaceSpec[] | null = null;
let cachedNominalFrameTailSurfaceSpecsBySurface: ReadonlyMap<string, readonly NominalFrameSurfaceSpec[]> | null = null;
let cachedNominalFrameSurfaceSpecsBySurface: ReadonlyMap<string, readonly NominalFrameSurfaceSpec[]> | null = null;
let cachedMaxNominalFrameSurfaceLength = 0;
let cachedMaxClauseOpaqueNominalFrameSurfaceLength = 0;
let cachedMaxKaContinuationNominalFrameSurfaceLength = 0;
let cachedGeneration = -1;

export function clauseOpaqueNominalFrameSurfaces(): ReadonlySet<string> {
  ensureNominalFrameSurfaceCaches();
  return cachedClauseOpaqueNominalFrameSurfaces ?? new Set();
}

export function nominalFrameSurfaceSpecs(): readonly NominalFrameSurfaceSpec[] {
  ensureNominalFrameSurfaceCaches();
  return cachedNominalFrameSurfaceSpecs ?? [];
}

export function nominalFrameTailSurfaceSpecs(): readonly NominalFrameSurfaceSpec[] {
  ensureNominalFrameSurfaceCaches();
  return cachedNominalFrameTailSurfaceSpecs ?? [];
}

export function nominalFrameTailSurfaceSpecsBySurface(): ReadonlyMap<string, readonly NominalFrameSurfaceSpec[]> {
  ensureNominalFrameSurfaceCaches();
  if (cachedNominalFrameTailSurfaceSpecsBySurface !== null) {
    return cachedNominalFrameTailSurfaceSpecsBySurface;
  }
  cachedNominalFrameTailSurfaceSpecsBySurface = groupSpecsBySurface(cachedNominalFrameTailSurfaceSpecs ?? []);
  return cachedNominalFrameTailSurfaceSpecsBySurface;
}

function groupSpecsBySurface(
  specs: readonly NominalFrameSurfaceSpec[]
): ReadonlyMap<string, readonly NominalFrameSurfaceSpec[]> {
  const bySurface = new Map<string, NominalFrameSurfaceSpec[]>();
  for (const spec of specs) {
    const existing = bySurface.get(spec.surface);
    if (existing === undefined) {
      bySurface.set(spec.surface, [spec]);
    } else {
      existing.push(spec);
    }
  }
  return bySurface;
}

export function nominalFrameSurfaceSpecsBySurface(): ReadonlyMap<string, readonly NominalFrameSurfaceSpec[]> {
  ensureNominalFrameSurfaceCaches();
  if (cachedNominalFrameSurfaceSpecsBySurface !== null) {
    return cachedNominalFrameSurfaceSpecsBySurface;
  }
  cachedNominalFrameSurfaceSpecsBySurface = groupSpecsBySurface(cachedNominalFrameSurfaceSpecs ?? []);
  return cachedNominalFrameSurfaceSpecsBySurface;
}

export function maxNominalFrameSurfaceLength(): number {
  ensureNominalFrameSurfaceCaches();
  return cachedMaxNominalFrameSurfaceLength;
}

export function kaContinuationNominalFrameSurfaces(): ReadonlySet<string> {
  ensureNominalFrameSurfaceCaches();
  return cachedKaContinuationNominalFrameSurfaces ?? new Set();
}

export function maxClauseOpaqueNominalFrameSurfaceLength(): number {
  ensureNominalFrameSurfaceCaches();
  return cachedMaxClauseOpaqueNominalFrameSurfaceLength;
}

export function maxKaContinuationNominalFrameSurfaceLength(): number {
  ensureNominalFrameSurfaceCaches();
  return cachedMaxKaContinuationNominalFrameSurfaceLength;
}

function ensureNominalFrameSurfaceCaches(): void {
  if (cachedGeneration === nominalFrameDataGeneration()) return;
  cachedMaxClauseOpaqueNominalFrameSurfaceLength = 0;
  cachedMaxKaContinuationNominalFrameSurfaceLength = 0;
  const clauseOpaqueSurfaces = new Set<string>();
  const kaContinuationSurfaces = new Set<string>();
  const specs = loadNominalFrameSurfaceMetadata();
  for (const spec of specs) {
    if (spec.kind === "host_bearing_likeness") {
      kaContinuationSurfaces.add(spec.surface);
      cachedMaxKaContinuationNominalFrameSurfaceLength = Math.max(
        cachedMaxKaContinuationNominalFrameSurfaceLength,
        spec.surface.length
      );
    }
    if (
      spec.focus === "の" ||
      (spec.requiresFollowingContent === true && spec.kind !== "host_bearing_likeness")
    ) {
      clauseOpaqueSurfaces.add(spec.surface);
      cachedMaxClauseOpaqueNominalFrameSurfaceLength = Math.max(
        cachedMaxClauseOpaqueNominalFrameSurfaceLength,
        spec.surface.length
      );
    }
  }
  cachedClauseOpaqueNominalFrameSurfaces = clauseOpaqueSurfaces;
  cachedKaContinuationNominalFrameSurfaces = kaContinuationSurfaces;
  cachedNominalFrameTailSurfaceSpecsBySurface = null;
  cachedNominalFrameSurfaceSpecsBySurface = null;
  cachedMaxNominalFrameSurfaceLength = Math.max(0, ...specs.map((spec) => spec.surface.length));
  const sortedSpecs = [...specs].sort((left, right) => right.surface.length - left.surface.length);
  cachedNominalFrameSurfaceSpecs = sortedSpecs;
  cachedNominalFrameTailSurfaceSpecs = sortedSpecs.filter(isNominalFrameTailSurfaceSpec);
  cachedGeneration = nominalFrameDataGeneration();
}

const NOMINAL_FRAME_KIND_TAIL_ELIGIBILITY = {
  about: true,
  regarding: true,
  toward: true,
  standpoint: true,
  by_or_depending: true,
  evidential_source: true,
  according_to: true,
  as_role: true,
  domain: true,
  scope_range: true,
  comparative_standard: true,
  addition: true,
  basis: true,
  substitution: true,
  degree_extent: true,
  alternative_choice: true,
  extreme_topic: true,
  situated_topic: true,
  procedure_sequence: true,
  parallel_activity: true,
  purpose_reason: true,
  cause_benefit: true,
  manner_reference: true,
  category_member: true,
  nominal_modifier: false,
  apposition: true,
  definition_topic: true,
  identity_exclusion: true,
  lexical_particle: false,
  host_bearing_likeness: true,
  productive_adjectival_suffix: true,
  renyou_nominal_head: false,
  occasion: true
} as const satisfies Record<NominalFrameKind, boolean>;

function isNominalFrameTailSurfaceSpec(spec: NominalFrameSurfaceSpec): boolean {
  return NOMINAL_FRAME_KIND_TAIL_ELIGIBILITY[spec.kind];
}

export function nominalFrameSurfaceSpecAdmittedAt(options: {
  readonly spec: NominalFrameSurfaceSpec;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly markerStart: number;
  readonly markerEndExclusive: number;
  readonly limit?: number;
  readonly headToken?: RuntimeHaruToken;
  readonly layout?: ProjectionEvidenceLayout;
  readonly lookups: LookupTables;
}): boolean {
  const { spec, tokens, markerStart, markerEndExclusive, lookups } = options;
  if (spec.head !== undefined && !projectionTokenMatches(options.headToken, spec.head, lookups)) {
    return false;
  }
  if (!nominalFrameMarkerTokensAdmit(spec, tokens, markerStart, markerEndExclusive, lookups)) {
    return false;
  }
  const match = spec.match ?? [];
  const reject = spec.reject ?? [];
  if (match.length === 0 && reject.length === 0) {
    return true;
  }
  const needsNounPhrase = [...match, ...reject].some((selector) => selector.kind === "following_noun_phrase");
  const context = nominalFrameSelectorContext({ ...options, needsNounPhrase });
  return match.every((selector) => projectionCandidateSelectorMatches(selector, context, lookups)) &&
    !reject.some((selector) => projectionCandidateSelectorMatches(selector, context, lookups));
}

function nominalFrameMarkerTokensAdmit(
  spec: NominalFrameSurfaceSpec,
  tokens: readonly RuntimeHaruToken[],
  markerStart: number,
  markerEndExclusive: number,
  lookups: LookupTables
): boolean {
  const selectors = spec.markerTokens;
  if (selectors === undefined) {
    return true;
  }
  if (selectors.length !== markerEndExclusive - markerStart) {
    return false;
  }
  return selectors.every((selector, offset) => projectionTokenMatches(tokens[markerStart + offset], selector, lookups));
}

function nominalFrameSelectorContext(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly markerStart: number;
  readonly markerEndExclusive: number;
  readonly limit?: number;
  readonly headToken?: RuntimeHaruToken;
  readonly layout?: ProjectionEvidenceLayout;
  readonly needsNounPhrase?: boolean;
}): ProjectionSelectorContext {
  const { tokens, markerStart } = options;
  const limit = options.limit ?? tokens.length;
  const bounds = projectionContextBoundsForToken({
    tokens,
    tokenIdx: markerStart,
    fallbackUpperBound: limit,
    ...(options.layout === undefined ? {} : { layout: options.layout })
  });
  return {
    ...(options.headToken === undefined ? {} : { head: options.headToken }),
    precedingTokens: collectPrecedingProjectionContextTokens(tokens, markerStart - 1, {
      maxCount: 6,
      lowerBound: bounds.lowerBound
    }),
    followingTokens: collectFollowingProjectionContextTokens(tokens, options.markerEndExclusive, {
      limit: bounds.upperBound ?? limit,
      maxCount: 6
    }),
    precedingBoundary: collectPrecedingProjectionBoundaryContext(tokens, markerStart - 1, {
      lowerBound: bounds.lowerBound
    }),
    followingBoundary: collectFollowingProjectionBoundaryContext(tokens, options.markerEndExclusive, {
      limit: bounds.upperBound ?? limit
    }),
    ...(options.needsNounPhrase === true
      ? { followingNounPhrase: collectFollowingNounPhraseTokens(tokens, options.markerEndExclusive, { limit }) }
      : {})
  };
}

export function admittedNominalFrameMarkerEndsAt(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly markerStart: number;
  readonly lookups: LookupTables;
  readonly layout?: ProjectionEvidenceLayout;
  readonly registry?: "all" | "tail";
  readonly accept?: (spec: NominalFrameSurfaceSpec) => boolean;
}): readonly number[] {
  const { tokens, markerStart, lookups } = options;
  const specsBySurface = options.registry === "tail"
    ? nominalFrameTailSurfaceSpecsBySurface()
    : nominalFrameSurfaceSpecsBySurface();
  const maxLength = maxNominalFrameSurfaceLength();
  const headToken = markerStart > 0 ? tokens[markerStart - 1] : undefined;
  const ends: number[] = [];
  let surface = "";
  for (let end = markerStart; end < tokens.length; end += 1) {
    surface += tokens[end]!.surface;
    if (surface.length > maxLength) {
      break;
    }
    const specs = specsBySurface.get(surface);
    if (specs === undefined) {
      continue;
    }
    const admitted = specs.some((spec) =>
      (options.accept === undefined || options.accept(spec)) &&
      nominalFrameSurfaceSpecAdmittedAt({
        spec,
        tokens,
        markerStart,
        markerEndExclusive: end + 1,
        ...(headToken === undefined ? {} : { headToken }),
        ...(options.layout === undefined ? {} : { layout: options.layout }),
        lookups
      })
    );
    if (admitted) {
      ends.push(end + 1);
    }
  }
  return ends;
}

export function nominalFrameOwnsKaMarkerAt(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  return admittedNominalFrameMarkerEndsAt({
    tokens,
    markerStart: kaIdx,
    lookups,
    accept: (spec) => spec.ownsKaMarker === true
  }).length > 0;
}
