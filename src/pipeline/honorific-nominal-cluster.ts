
import { POS0, POS01, POS1, POS2, 固有名詞, 人名, 名詞, 代名詞, 接尾辞_名詞的 } from "../types/pos.js";
import { type LookupTables } from "./lookup-tables.js";

export interface HonorificClusterToken {
  readonly pos: number;
  readonly dictionaryForm: string;
  readonly surface: string;
}

export interface HonorificClusterLookups {
  readonly clusterSuffixes: ReadonlySet<string>;
  readonly absorbHosts: ReadonlySet<string>;
}

export function honorificClusterSuffixAbsorbedByHost(
  tokens: readonly HonorificClusterToken[],
  suffixIndex: number,
  lookups: HonorificClusterLookups
): boolean {
  const suffix = tokens[suffixIndex];
  if (suffix === undefined || (suffix.pos & POS01) !== 接尾辞_名詞的) {
    return false;
  }
  if (
    !lookups.clusterSuffixes.has(suffix.dictionaryForm) &&
    !lookups.clusterSuffixes.has(suffix.surface)
  ) {
    return false;
  }
  const host = tokens[suffixIndex - 1];
  if (host === undefined) {
    return false;
  }
  const hostPos0 = host.pos & POS0;
  if (hostPos0 !== 名詞 && hostPos0 !== 代名詞) {
    return false;
  }
  if ((host.pos & POS1) === 固有名詞) {
    return false;
  }
  return lookups.absorbHosts.has(host.dictionaryForm) || lookups.absorbHosts.has(host.surface);
}

export interface HonorificClusterSuffixRealization {
  readonly korean: string;
  readonly attachLeft: boolean;
}

export interface HonorificClusterOverrideLookups {
  readonly clusterSuffixes: ReadonlySet<string>;
  readonly titleHosts: ReadonlySet<string>;
  readonly bunHosts: ReadonlySet<string>;
}

const PERSON_NAME_SUFFIX_KOREAN: ReadonlyMap<string, string> = new Map([
  ["さん", "씨"],
  ["様", "님"],
  ["さま", "님"],
  ["殿", "공"],
  ["君", "군"],
  ["ちゃん", "쨩"],
]);

export function honorificClusterSuffixOverride(
  tokens: readonly HonorificClusterToken[],
  suffixIndex: number,
  lookups: HonorificClusterOverrideLookups
): HonorificClusterSuffixRealization | null {
  const suffix = tokens[suffixIndex];
  if (suffix === undefined || (suffix.pos & POS01) !== 接尾辞_名詞的) {
    return null;
  }
  const suffixForm = lookups.clusterSuffixes.has(suffix.dictionaryForm)
    ? suffix.dictionaryForm
    : lookups.clusterSuffixes.has(suffix.surface)
      ? suffix.surface
      : null;
  if (suffixForm === null) {
    return null;
  }
  const host = tokens[suffixIndex - 1];
  if (host === undefined) {
    return null;
  }
  const hostPos0 = host.pos & POS0;
  if (hostPos0 !== 名詞 && hostPos0 !== 代名詞) {
    return null;
  }
  if (lookups.titleHosts.has(host.dictionaryForm) || lookups.titleHosts.has(host.surface)) {
    return { korean: "님", attachLeft: true };
  }
  if (lookups.bunHosts.has(host.dictionaryForm) || lookups.bunHosts.has(host.surface)) {
    return { korean: "분", attachLeft: true };
  }
  if ((host.pos & (POS1 | POS2)) === (固有名詞 | 人名)) {
    const korean = PERSON_NAME_SUFFIX_KOREAN.get(suffixForm);
    if (korean !== undefined) {
      return { korean, attachLeft: false };
    }
  }
  return null;
}

export function honorificClusterLookupsFrom(
  lookups: LookupTables
): HonorificClusterLookups & HonorificClusterOverrideLookups {
  return {
    clusterSuffixes: lookups.set("honorific", "honorific_cluster_suffixes"),
    absorbHosts: lookups.set("honorific", "cluster_absorb_hosts"),
    titleHosts: lookups.set("honorific", "cluster_honorific_title_hosts"),
    bunHosts: lookups.set("honorific", "cluster_bun_hosts")
  };
}

export type HonorificClusterSuffixDecision =
  | { readonly kind: "absorbed" }
  | { readonly kind: "override"; readonly realization: HonorificClusterSuffixRealization };

export function honorificClusterSuffixDecision(
  tokens: readonly HonorificClusterToken[],
  suffixIndex: number,
  lookups: HonorificClusterLookups & HonorificClusterOverrideLookups
): HonorificClusterSuffixDecision | null {
  if (honorificClusterSuffixAbsorbedByHost(tokens, suffixIndex, lookups)) {
    return { kind: "absorbed" };
  }
  const realization = honorificClusterSuffixOverride(tokens, suffixIndex, lookups);
  return realization === null ? null : { kind: "override", realization };
}
