import type { BoundaryKind } from "./index.js";
import type { UtteranceClosureRunKind } from "./utterance-closure.js";

export type JunctureVerdict = "boundary" | "cohesion" | "intra_word" | "undecided";

export function junctureVerdictOf(hasBoundaryEvidence: boolean, hasCohesionEvidence: boolean): JunctureVerdict | null {
  if (hasBoundaryEvidence && hasCohesionEvidence) return "undecided";
  if (hasBoundaryEvidence) return "boundary";
  if (hasCohesionEvidence) return "cohesion";
  return null;
}

export interface RenyouJunctureBoundaryEvidence {
  readonly kind: "chuushi_closure";
  readonly right: "governed" | "elliptic" | "detached";
}

export type RenyouJunctureCohesionEvidence =
  | { readonly kind: "attributive_endpoint" }
  | { readonly kind: "hosted_connective"; readonly markerIdx: number }
  | { readonly kind: "lexical_compound" }
  | { readonly kind: "lexical_head" }
  | { readonly kind: "nominal_frame" }
  | { readonly kind: "nominal_suffix_head"; readonly suffixIdx: number }
  | { readonly kind: "nominal_compound_head"; readonly spanEnd: number };

export type RenyouJunctureCohesionKind = RenyouJunctureCohesionEvidence["kind"];

export interface RenyouJunctureEvidence {
  readonly kind: "renyouJuncture";
  readonly hostIdx: number;
  readonly splitAt: number;
  readonly followerIdx: number;
  readonly boundary: readonly RenyouJunctureBoundaryEvidence[];
  readonly cohesion: readonly RenyouJunctureCohesionEvidence[];
  readonly verdict: JunctureVerdict | null;
}

export function renyouJunctureEvidence(
  input: Omit<RenyouJunctureEvidence, "kind" | "verdict">
): RenyouJunctureEvidence {
  return {
    kind: "renyouJuncture",
    ...input,
    verdict: junctureVerdictOf(input.boundary.length > 0, input.cohesion.length > 0)
  };
}

export function undecidedRenyouClosureDisposition(
  cohesion: readonly RenyouJunctureCohesionEvidence[]
): "suppress" | "eventless" {
  return cohesion.some((evidence) =>
    evidence.kind === "attributive_endpoint" ||
    evidence.kind === "hosted_connective" ||
    evidence.kind === "nominal_suffix_head" ||
    evidence.kind === "nominal_compound_head"
  )
    ? "suppress"
    : "eventless";
}

export type WhitespaceJunctureBoundaryEvidence =
  | { readonly kind: "boundary_event"; readonly event: BoundaryKind }
  | { readonly kind: "utterance_onset" }
  | { readonly kind: "detached_noda_closure" }
  | { readonly kind: "detached_utterance_onset" }
  | { readonly kind: "utterance_closure_run"; readonly run: UtteranceClosureRunKind }
  | { readonly kind: "separated_finite" }
  | { readonly kind: "imperative_closure" };

export type WhitespaceJunctureBoundaryKind = WhitespaceJunctureBoundaryEvidence["kind"];

export type WhitespaceJunctureCohesionEvidence =
  | { readonly kind: "attributive_head_reach"; readonly headIdx: number }
  | { readonly kind: "attributive_event" }
  | { readonly kind: "bound_follower" }
  | { readonly kind: "copula_chain" }
  | { readonly kind: "kadouka_complement" }
  | { readonly kind: "copula_concessive_condition" };

export type WhitespaceAdnominalLicense =
  | { readonly kind: "adnominal_only_form"; readonly headIdx: number }
  | { readonly kind: WhitespaceAttributiveReadingLicenseKind; readonly headIdx: number; readonly leftIdx: number };

export type WhitespaceAttributiveReadingLicenseKind =
  | "governed_rhs_np_closed"
  | "rhs_nominal_predicate_closed"
  | "rhs_predicateless_np_closed";

export function isWhitespaceAttributiveReadingLicense(
  license: WhitespaceAdnominalLicense | undefined
): license is Extract<WhitespaceAdnominalLicense, { readonly leftIdx: number }> {
  return license !== undefined && license.kind !== "adnominal_only_form";
}

export interface WhitespaceJunctureEvidence {
  readonly kind: "whitespaceJuncture";
  readonly gapIdx: number;
  readonly runOrdinal: number;
  readonly boundary: readonly WhitespaceJunctureBoundaryEvidence[];
  readonly cohesion: readonly WhitespaceJunctureCohesionEvidence[];
  readonly adnominalLicense?: WhitespaceAdnominalLicense;
  readonly verdict: JunctureVerdict | null;
}

export function whitespaceJunctureEvidence(
  input: Omit<WhitespaceJunctureEvidence, "kind" | "verdict">
): WhitespaceJunctureEvidence {
  return {
    kind: "whitespaceJuncture",
    ...input,
    verdict: junctureVerdictOf(input.boundary.length > 0, input.cohesion.length > 0)
  };
}

export type PauseJunctureBoundaryEvidence = { readonly kind: "separated_finite" };

export type PauseJunctureCohesionEvidence =
  | { readonly kind: "attributive_head_reach"; readonly headIdx: number }
  | { readonly kind: "bound_follower" }
  | { readonly kind: "copula_chain" }
  | { readonly kind: "copula_concessive_condition" };

export interface TransparentPauseRunEvidence {
  readonly ellipsisRunOrdinal: number;
  readonly boundaryEvidence: readonly PauseJunctureBoundaryEvidence[];
}

export interface PauseJunctureEvidence {
  readonly kind: "pauseJuncture";
  readonly gapIdx: number;
  readonly runOrdinal: number;
  readonly boundary: readonly PauseJunctureBoundaryEvidence[];
  readonly cohesion: readonly PauseJunctureCohesionEvidence[];
  readonly verdict: JunctureVerdict | null;
}

export function pauseJunctureEvidence(
  input: Omit<PauseJunctureEvidence, "kind" | "verdict">
): PauseJunctureEvidence {
  return {
    kind: "pauseJuncture",
    ...input,
    verdict: junctureVerdictOf(input.boundary.length > 0, input.cohesion.length > 0)
  };
}
