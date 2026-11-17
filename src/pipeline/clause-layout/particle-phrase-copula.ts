import type { RuntimeHaruToken } from "../../types/token.js";
import type { BoundaryKind } from "./index.js";
import type { CopulaPauseBridgeEvidence } from "./punctuation.js";
import { previousNonSpaceIndex } from "./trivia.js";
import { POS0, isCaseParticleToken, isSecondaryParticleToken, 助詞 } from "../../types/pos.js";

export interface ParticlePhraseCopulaHostBinding {
  readonly hostHeadIdx: number;
  readonly copulaStart: number;
  readonly chainEndExclusive: number;
  readonly markerSubtype: "case" | "secondary";
  readonly clauseBoundaryKind: BoundaryKind | null;
  readonly clauseIndex: number;
  readonly hostParticleOwners: readonly number[];
  readonly pauseSpan?: { readonly start: number; readonly endExclusive: number };
}

export function copulaHostParticleMarkerSubtype(
  token: { readonly pos: number } | undefined
): "case" | "secondary" | null {
  if (token === undefined) {
    return null;
  }
  if (isCaseParticleToken(token)) {
    return "case";
  }
  return isSecondaryParticleToken(token) ? "secondary" : null;
}

export interface ParticlePhraseCopulaHostLayout {
  clauseIndexOfToken(tokenIdx: number): number;
  copulaPauseBridgeAt(copulaStart: number): CopulaPauseBridgeEvidence | undefined;
  enclosingQuoteSpan(tokenIdx: number): readonly [number, number] | undefined;
  enclosingBalancedSpan(tokenIdx: number): { readonly start: number; readonly endExclusive: number } | undefined;
  clauseOfToken(tokenIdx: number): { readonly terminatedBy: BoundaryKind | null } | undefined;
  tailReachInClause(tokenIdx: number): number;
  ownerPredicateOfParticle(particleIdx: number): number | undefined;
}

export function particlePhraseCopulaHostBinding(
  layout: ParticlePhraseCopulaHostLayout,
  tokens: readonly RuntimeHaruToken[],
  copulaStart: number
): ParticlePhraseCopulaHostBinding | null {
  const bridge = layout.copulaPauseBridgeAt(copulaStart);
  const adjacentIdx = previousNonSpaceIndex(tokens, copulaStart);
  const adjacent = adjacentIdx === null ? undefined : tokens[adjacentIdx];
  const hostHeadIdx = adjacent !== undefined && (adjacent.pos & POS0) === 助詞
    ? adjacentIdx
    : bridge?.edgeIdx ?? null;
  if (hostHeadIdx === null) {
    return null;
  }
  const host = tokens[hostHeadIdx];
  if (host === undefined || (host.pos & POS0) !== 助詞) {
    return null;
  }
  if (
    hostHeadIdx !== adjacentIdx &&
    (layout.enclosingQuoteSpan(copulaStart) !== undefined ||
      layout.enclosingBalancedSpan(copulaStart) !== undefined)
  ) {
    return null;
  }
  const markerSubtype = copulaHostParticleMarkerSubtype(host);
  if (markerSubtype === null) {
    return null;
  }
  if (layout.clauseIndexOfToken(hostHeadIdx) !== layout.clauseIndexOfToken(copulaStart)) {
    return null;
  }
  if (layout.clauseOfToken(copulaStart)?.terminatedBy === "attributive") {
    return null;
  }
  const chainEndExclusive = layout.tailReachInClause(copulaStart);
  if (chainEndExclusive <= copulaStart) {
    return null;
  }
  const owners = particleClusterOwners(layout, tokens, hostHeadIdx);
  if (owners.some((owner) => owner < copulaStart || owner >= chainEndExclusive)) {
    return null;
  }
  return {
    hostHeadIdx,
    ...(hostHeadIdx === adjacentIdx || bridge === undefined ? {} : { pauseSpan: bridge.punctuationSpan }),
    copulaStart,
    chainEndExclusive,
    markerSubtype,
    clauseBoundaryKind: layout.clauseOfToken(copulaStart)?.terminatedBy ?? null,
    clauseIndex: layout.clauseIndexOfToken(copulaStart),
    hostParticleOwners: owners
  };
}

function particleClusterOwners(
  layout: ParticlePhraseCopulaHostLayout,
  tokens: readonly RuntimeHaruToken[],
  hostHeadIdx: number
): readonly number[] {
  const owners: number[] = [];
  let idx: number | null = hostHeadIdx;
  while (idx !== null) {
    const token: RuntimeHaruToken | undefined = tokens[idx];
    if (token === undefined || (token.pos & POS0) !== 助詞) {
      break;
    }
    const owner = layout.ownerPredicateOfParticle(idx);
    if (owner !== undefined) {
      owners.push(owner);
    }
    idx = previousNonSpaceIndex(tokens, idx);
  }
  return owners;
}
