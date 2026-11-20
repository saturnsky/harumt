import { ALLOMORPH_MAP, SKIP_SUBPOS } from "../../generator/particle-map.js";
import { secondaryParticleCanonical } from "../particles/secondary-particle.js";
import type { ParticleKey } from "../../generator/particles.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { ParticleAssignment } from "../../types/pipeline.js";
import { NOMINAL_BITS, POS0, POS1, pos0in, 助詞 } from "../../types/pos.js";
import { registeredClauseConnectiveRelationForToken } from "../head-tail/boundary/marker.js";
import type { TokenCursor } from "../token-cursor.js";

export function isClauseConnectiveEmphasisParticle(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const token = cursor.current();
  if (token?.surface !== "こそ" || (token.pos & POS0) !== 助詞) {
    return false;
  }
  return registeredClauseConnectiveRelationForToken(cursor.tokens[cursor.pos - 1], cursor.pos - 1, {
    acceptedSurfaces: ["から"],
    acceptedParticleSubtypes: ["接続助詞", "格助詞"],
    consumers: ["assembler"]
  }) !== null;
}

export function committedParticleAssignmentAt(
  contentMap: ReadonlyMap<number, { readonly committedParticleRoles?: Record<number, ParticleAssignment> | ReadonlyMap<number, ParticleAssignment> }>,
  particleIdx: number,
  ownerIndex?: number
): ParticleAssignment | undefined {
  const owned = ownerIndex === undefined
    ? undefined
    : committedParticleAssignmentFromSpan(contentMap.get(ownerIndex), particleIdx);
  if (owned !== undefined) {
    return owned;
  }
  for (const span of contentMap.values()) {
    const committed = committedParticleAssignmentFromSpan(span, particleIdx);
    if (committed?.commitmentSource === "slot_realization") {
      return committed;
    }
  }
  return undefined;
}

function committedParticleAssignmentFromSpan(
  span: { readonly committedParticleRoles?: Record<number, ParticleAssignment> | ReadonlyMap<number, ParticleAssignment> } | undefined,
  particleIdx: number
): ParticleAssignment | undefined {
  const roles = span?.committedParticleRoles;
  if (roles === undefined) {
    return undefined;
  }
  if (roles instanceof Map) {
    return roles.get(particleIdx);
  }
  return (roles as Record<number, ParticleAssignment>)[particleIdx];
}

export function isVocativeYo(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  if (index < 1 || !pos0in((tokens[index - 1]?.pos ?? 0), NOMINAL_BITS)) {
    return false;
  }
  const previousPrevious = index >= 2 ? tokens[index - 2] : undefined;
  if (previousPrevious !== undefined && (previousPrevious.pos & POS0) === 助詞 && (previousPrevious.surface === "は" || previousPrevious.surface === "が" || previousPrevious.surface === "も")) {
    return false;
  }
  return true;
}

export function particleAllomorphKey(token: RuntimeHaruToken): ParticleKey | undefined {
  const pos1 = token.pos & POS1;
  if (pos1 !== undefined && SKIP_SUBPOS.has(pos1)) {
    return undefined;
  }
  return ALLOMORPH_MAP[secondaryParticleCanonical(token) ?? token.surface];
}
