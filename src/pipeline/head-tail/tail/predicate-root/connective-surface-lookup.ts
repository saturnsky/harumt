import { lazyValue } from "../../../../data-loader.js";
import { loadConnectiveSurfaceEntries } from "./connective-surface-table.js";
import { type ConnectiveKind, type RetrospectiveQuotativeFlavor, isConnectiveKind } from "./grammar.js";

const CONNECTIVE_SURFACE_ENTRIES: ReturnType<typeof loadConnectiveSurfaceEntries<ConnectiveKind>> = lazyValue(() => loadConnectiveSurfaceEntries({
  isSupportedKind: isConnectiveKind
}));

const CONNECTIVE_SURFACE_MAP: ReadonlyMap<string, ConnectiveKind> = lazyValue(() => (() => {
  const map = new Map<string, ConnectiveKind>();
  for (const entry of CONNECTIVE_SURFACE_ENTRIES) {
    for (const surface of entry.surfaces) {
      if (!map.has(surface)) {
        map.set(surface, entry.kind);
      }
    }
  }
  return map;
})());

const CONNECTIVE_SURFACE_PARTICLE_SUBTYPE_MAP: ReadonlyMap<string, readonly string[]> = lazyValue(() => (() => {
  const map = new Map<string, readonly string[]>();
  const seenSurfaces = new Set<string>();
  for (const entry of CONNECTIVE_SURFACE_ENTRIES) {
    for (const surface of entry.surfaces) {
      if (seenSurfaces.has(surface)) {
        continue;
      }
      seenSurfaces.add(surface);
      if (entry.particleSubtypes !== undefined) {
        map.set(surface, entry.particleSubtypes);
      }
    }
  }
  return map;
})());

const CONNECTIVE_SURFACE_PARTIAL_POLICY_MAP: ReadonlyMap<string, { readonly preservePrefix: boolean; readonly requiresAttachmentEvidence: boolean }> = lazyValue(() => (() => {
  const map = new Map<string, { readonly preservePrefix: boolean; readonly requiresAttachmentEvidence: boolean }>();
  for (const entry of CONNECTIVE_SURFACE_ENTRIES) {
    if (entry.partialPolicy === undefined) {
      continue;
    }
    const policy = {
      preservePrefix: true,
      requiresAttachmentEvidence: entry.requiresAttachmentEvidence === true
    };
    for (const surface of entry.surfaces) {
      const key = connectiveSurfacePolicyKey(entry.kind, surface);
      const existing = map.get(key);
      if (existing !== undefined && (
        existing.preservePrefix !== policy.preservePrefix ||
        existing.requiresAttachmentEvidence !== policy.requiresAttachmentEvidence
      )) {
        throw new Error("conflicting partial policy for connective surface " + entry.kind + ":" + surface);
      }
      map.set(key, policy);
    }
  }
  return map;
})());

const RETROSPECTIVE_QUOTATIVE_FLAVOR_MAP: ReadonlyMap<string, RetrospectiveQuotativeFlavor> = lazyValue(() => (() => {
  const map = new Map<string, RetrospectiveQuotativeFlavor>();
  for (const entry of CONNECTIVE_SURFACE_ENTRIES) {
    if (entry.kind !== "retrospective_quotative" || entry.retrospectiveQuotativeFlavor === undefined) {
      continue;
    }
    for (const surface of entry.surfaces) {
      const existing = map.get(surface);
      if (existing !== undefined && existing !== entry.retrospectiveQuotativeFlavor) {
        throw new Error(`conflicting retrospective quotative flavor for connective surface ${surface}`);
      }
      map.set(surface, entry.retrospectiveQuotativeFlavor);
    }
  }
  return map;
})());

const CONNECTIVE_SURFACE_FINAL_ONLY: ReadonlySet<string> = lazyValue(() => new Set(
  CONNECTIVE_SURFACE_ENTRIES.flatMap((entry) =>
    entry.chainPositionPolicy === "final_only"
      ? entry.surfaces.map((surface) => connectiveSurfacePolicyKey(entry.kind, surface))
      : []
  )
));

function connectiveSurfacePolicyKey(connective: ConnectiveKind, surface: string): string {
  return `${connective}\u0000${surface}`;
}

const FUSED_COPULA_SUPPORT_CONNECTIVE_MAP: ReadonlyMap<
  string,
  { readonly kind: ConnectiveKind; readonly particleSubtypes: readonly string[] }
> = lazyValue(() => (() => {
  const map = new Map<string, { readonly kind: ConnectiveKind; readonly particleSubtypes: readonly string[] }>();
  for (const entry of CONNECTIVE_SURFACE_ENTRIES) {
    if (entry.copulaSupportFusion !== true || entry.particleSubtypes === undefined) {
      continue;
    }
    for (const surface of entry.surfaces) {
      const existing = map.get(surface);
      if (existing !== undefined && existing.kind !== entry.kind) {
        throw new Error("conflicting copula support fusion kind for connective surface " + surface);
      }
      map.set(surface, { kind: entry.kind, particleSubtypes: entry.particleSubtypes });
    }
  }
  return map;
})());

export function lookupFusedCopulaSupportConnective(
  surface: string
): { readonly kind: ConnectiveKind; readonly particleSubtypes: readonly string[] } | undefined {
  return FUSED_COPULA_SUPPORT_CONNECTIVE_MAP.get(surface);
}

export function lookupConnectiveBySurface(surface: string): ConnectiveKind | undefined {
  return CONNECTIVE_SURFACE_MAP.get(surface);
}

export function lookupRetrospectiveQuotativeFlavor(
  surface: string
): RetrospectiveQuotativeFlavor | undefined {
  return RETROSPECTIVE_QUOTATIVE_FLAVOR_MAP.get(surface);
}

export function connectiveSurfaceAllowsPartialPrefix(connective: ConnectiveKind, surface: string): boolean {
  return CONNECTIVE_SURFACE_PARTIAL_POLICY_MAP.get(connectiveSurfacePolicyKey(connective, surface))?.preservePrefix === true;
}

export function connectiveSurfaceRequiresAttachmentEvidence(connective: ConnectiveKind, surface: string): boolean {
  return CONNECTIVE_SURFACE_PARTIAL_POLICY_MAP.get(connectiveSurfacePolicyKey(connective, surface))?.requiresAttachmentEvidence === true;
}

export function connectiveSurfaceRequiresFinalPosition(connective: ConnectiveKind, surface: string): boolean {
  return CONNECTIVE_SURFACE_FINAL_ONLY.has(connectiveSurfacePolicyKey(connective, surface));
}

export function lookupConnectiveParticleSubtypesBySurface(surface: string): readonly string[] | undefined {
  return CONNECTIVE_SURFACE_PARTICLE_SUBTYPE_MAP.get(surface);
}
