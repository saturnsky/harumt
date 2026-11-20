
import { lazyValue } from "../../data-loader.js";
import { loadHeadTailStringSetRows } from "../head-tail/data/string-set-table.js";
import { isSecondaryParticleToken } from "../../types/pos.js";

export interface SecondaryParticleToken {
  readonly surface: string;
  readonly pos: number;
  readonly normalizedForm?: string;
}

const CANONICAL_BY_ALIAS: ReadonlyMap<string, string> = lazyValue(() => {
  const inverted = new Map<string, string>();
  for (const [canonical, aliases] of loadHeadTailStringSetRows("secondary_particle_aliases.jsonl")) {
    for (const alias of aliases) {
      inverted.set(alias, canonical);
    }
  }
  return inverted;
});

export { isSecondaryParticleToken };

export function secondaryParticleCanonical(
  token: SecondaryParticleToken | undefined | null
): string | null {
  if (token === undefined || token === null || !isSecondaryParticleToken(token)) {
    return null;
  }
  const canonical = CANONICAL_BY_ALIAS.get(token.surface);
  if (canonical === undefined) {
    return token.surface;
  }
  return token.normalizedForm === canonical ? canonical : null;
}

export function isSecondaryParticle(
  token: SecondaryParticleToken | undefined | null,
  canonical: string
): boolean {
  return secondaryParticleCanonical(token) === canonical;
}

export function isDegreeExtentParticle(token: SecondaryParticleToken | undefined): boolean {
  const canonical = secondaryParticleCanonical(token);
  return canonical === "ほど" || canonical === "くらい";
}
