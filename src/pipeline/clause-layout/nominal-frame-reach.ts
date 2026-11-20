import { admittedNominalFrameMarkerEndsAt, clauseOpaqueNominalFrameSurfaces, kaContinuationNominalFrameSurfaces, maxClauseOpaqueNominalFrameSurfaceLength, maxKaContinuationNominalFrameSurfaceLength, maxNominalFrameSurfaceLength } from "../head-tail/tail/segments/nominal-frame.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { pos0in, PREDICATE_BITS } from "../../types/pos.js";
import type { ClauseToken } from "./layout-types.js";
import type { ProtoClauseLayout } from "./proto-layout.js";

function isInsideNominalFrameSurface<T extends ClauseToken>(
  tokens: readonly T[],
  tokenIdx: number,
  surfaceSet: ReadonlySet<string>,
  maxSurfaceLength: number
): boolean {
  let leadingSurfaceLength = 0;
  for (let start = tokenIdx; start >= 0; start -= 1) {
    if (start < tokenIdx) {
      leadingSurfaceLength += tokens[start]?.surface.length ?? 0;
    }
    if (leadingSurfaceLength > maxSurfaceLength) {
      break;
    }
    let surface = "";
    for (let end = start; end < tokens.length && surface.length <= maxSurfaceLength; end += 1) {
      const token = tokens[end];
      if (token === undefined) {
        break;
      }
      surface += token.surface;
      if (end >= tokenIdx && surfaceSet.has(surface)) {
        return true;
      }
    }
  }
  return false;
}

export function isInsideAnyNominalFrameSurface(
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  lookups: LookupTables,
  layout: ProtoClauseLayout
): boolean {
  const maxLength = maxNominalFrameSurfaceLength();
  let span = 0;
  for (let start = tokenIdx; start >= 0; start -= 1) {
    span += tokens[start]?.surface.length ?? 0;
    if (span > maxLength) {
      break;
    }
    const markerStart = start;
    const admitted = admittedNominalFrameMarkerEndsAt({
      tokens,
      markerStart,
      lookups,
      accept: (spec) =>
        spec.markerVerbOwnsObjectArgument !== true || !accusativeArgumentReachesMarker(tokens, markerStart, layout)
    });
    if (admitted.some((end) => end > tokenIdx)) {
      return true;
    }
  }
  return false;
}

function accusativeArgumentReachesMarker(
  tokens: readonly RuntimeHaruToken[],
  markerStart: number,
  layout: ProtoClauseLayout
): boolean {
  const clause = layout.clauseOfToken(markerStart);
  for (const particleIdx of clause?.particleIndices ?? []) {
    if (particleIdx >= markerStart) {
      continue;
    }
    if (caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
      acceptedSurfaces: ["を"],
      consumers: ["clause_layout"]
    }) === null) {
      continue;
    }
    if (!tokens.slice(particleIdx + 1, markerStart).some((token) => pos0in(token.pos, PREDICATE_BITS))) {
      return true;
    }
  }
  return false;
}

export function isInsideKaContinuationNominalFrameSurface<T extends ClauseToken>(
  tokens: readonly T[],
  tokenIdx: number
): boolean {
  const surfaceSet = kaContinuationNominalFrameSurfaces();
  if (surfaceSet.size === 0) return false;
  return isInsideNominalFrameSurface(tokens, tokenIdx, surfaceSet, maxKaContinuationNominalFrameSurfaceLength());
}

export function isInsideClauseOpaqueNominalFrameSurface<T extends ClauseToken>(
  tokens: readonly T[],
  tokenIdx: number
): boolean {
  const surfaceSet = clauseOpaqueNominalFrameSurfaces();
  if (surfaceSet.size === 0) return false;
  return isInsideNominalFrameSurface(tokens, tokenIdx, surfaceSet, maxClauseOpaqueNominalFrameSurfaceLength());
}
