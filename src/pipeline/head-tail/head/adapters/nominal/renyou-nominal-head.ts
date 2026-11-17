import { tokenLemma, type RuntimeHaruToken } from "../../../../../types/token.js";
import {
  isAdnominalGenitiveMarkerToken,
  isCommonNounToken,
  isGeneralRenyouInflectedToken,
  isNominalScopeParticleToken,
  isPrefixAffixToken,
  isSubstantiveNounToken,
  isTerminalParticleToken,
  isVerbPredicateToken
} from "../../../../../types/pos.js";
import { hasSourceOrdinalGapBeforeToken, previousNonSpaceIndex, separationBefore } from "../../../../clause-layout/trivia.js";
import { admittedNominalFrameMarkerEndsAt } from "../../../tail/segments/nominal-frame.js";
import { matchCopula } from "../../../tail/predicate-root/matchers/copula.js";
import { detectSahenPredicateStart } from "../../../tail/predicate-root/integration/readiness.js";
import { isStreamVvCompoundPairAt } from "../../../../compounds/compound-verbs.js";
import { derivedNominalPhraseSpanAt } from "../../../tail/predicate-root/derivational-suffix-table.js";
import { honorificPrefixRenyouVerbHostAt } from "../../../integration/tail-assembly.js";
import { caseParticleMarkerRelationForToken } from "../../../boundary/marker.js";
import type { MorphemeEntry } from "../../../../../types/dictionary.js";
import type { NominalHeadTailChainPlan } from "../../../lifecycle/head-tail-render-plan.js";
import type { NominalFrameCommitContext, NominalSourceSpan, PredicateNominalProjectionHost, RenyouNominalHeadEvidence, RenyouNominalHeadNode } from "./grammar.js";
import { 명사 } from "../../../../../types/pos.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { loadNominalFrameSpecsBySurface } from "./frame-table.js";
import { derivationalSuffixProfileById } from "../../../tail/predicate-root/derivational-suffix-table.js";
import { lowerDerivationalSuffixRoot } from "../../../tail/predicate-root/derivational-suffix-lowering.js";
import { buildPredicateSuffixOp } from "../../../tail/predicate-root/parser.js";
import type { ParsedTailRoot } from "../../../tail/predicate-root/grammar.js";

export type RenyouNominalHeadAdmission =
  | {
    readonly kind: "derivational_suffix";
    readonly hostIdx: number;
    readonly suffixIdx: number;
    readonly profileId: string;
  }
  | {
    readonly kind: "noun_compound_suffix";
    readonly hostIdx: number;
    readonly suffixIdx: number;
    readonly profileId: string;
  }
  | {
    readonly kind: "honorific_prefix";
    readonly prefixIdx: number;
    readonly hostIdx: number;
    readonly followerIdx: number;
  }
  | {
    readonly kind: "honorific_prefix_compound";
    readonly prefixIdx: number;
    readonly hostIdx: number;
    readonly followerIdx: number;
  }
  | {
    readonly kind: "lexical_noun_compound";
    readonly hostIdx: number;
    readonly nounEnd: number;
    readonly followerIdx: number;
  }
  | {
    readonly kind: "bare_case_particle";
    readonly hostIdx: number;
    readonly followerIdx: number;
  };

export function renyouNominalHeadAdmissionAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables,
  options: {
    readonly admitGenitiveFollower?: boolean;
    readonly lexicalNounCompoundEnd?: number | null;
  } = {}
): RenyouNominalHeadAdmission | null {
  const host = tokens[idx];
  if (host === undefined || !isVerbPredicateToken(host) || !isGeneralRenyouInflectedToken(host)) {
    return null;
  }
  if (idx > 0 && isStreamVvCompoundPairAt(tokens, idx - 1)) {
    return null;
  }
  const prevIdx = previousNonSpaceIndex(tokens, idx);
  if (prevIdx === idx - 1 && detectSahenPredicateStart(tokens, prevIdx)?.suruToken === host) {
    return null;
  }
  const derived = derivedNominalPhraseSpanAt(tokens, idx);
  if (derived !== null) {
    return derivationalSuffixProfileById(derived.profileId)?.hostForm === "noun_compound"
      ? { kind: "noun_compound_suffix", hostIdx: idx, suffixIdx: derived.head, profileId: derived.profileId }
      : { kind: "derivational_suffix", hostIdx: idx, suffixIdx: derived.head, profileId: derived.profileId };
  }
  const nounEnd = options.lexicalNounCompoundEnd ?? null;
  if (nounEnd !== null && nounEnd > idx && renyouLexicalNounCompoundFollowerAdmitted(tokens, nounEnd + 1, lookups)) {
    return { kind: "lexical_noun_compound", hostIdx: idx, nounEnd, followerIdx: nounEnd + 1 };
  }
  const prefixIdx = prevIdx;
  const followerIdx = idx + 1;
  const follower = tokens[followerIdx];
  const prefixed = prefixIdx !== null && isPrefixAffixToken(tokens[prefixIdx]!);
  if (!prefixed) {
    return bareCaseParticleAdmission(tokens, idx, followerIdx, lookups);
  }
  if (honorificPrefixRenyouVerbHostAt(tokens, prefixIdx) !== idx) {
    return null;
  }
  if (directCompoundNounFollowerAt(tokens, followerIdx)) {
    return { kind: "honorific_prefix_compound", prefixIdx, hostIdx: idx, followerIdx };
  }
  if (follower === undefined || !isNominalScopeParticleToken(follower)) {
    return null;
  }
  if (options.admitGenitiveFollower !== true && adnominalNoLinkFollower(follower, lookups)) {
    return null;
  }
  return { kind: "honorific_prefix", prefixIdx, hostIdx: idx, followerIdx };
}

function directCompoundNounFollowerAt(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const token = tokens[idx];
  return token !== undefined &&
    isCommonNounToken(token) &&
    separationBefore(tokens, idx) === null &&
    !hasSourceOrdinalGapBeforeToken(tokens, idx);
}

export function renyouLexicalNounCompoundCandidateEnds(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number
): readonly number[] {
  const host = tokens[hostIdx];
  if (host === undefined || !isVerbPredicateToken(host) || !isGeneralRenyouInflectedToken(host)) {
    return [];
  }
  const ends: number[] = [];
  for (let idx = hostIdx + 1; idx < tokens.length; idx += 1) {
    const token = tokens[idx]!;
    if (!isSubstantiveNounToken(token) || separationBefore(tokens, idx) !== null || hasSourceOrdinalGapBeforeToken(tokens, idx)) {
      break;
    }
    ends.push(idx);
  }
  return ends.reverse();
}

function renyouLexicalNounCompoundFollowerAdmitted(
  tokens: readonly RuntimeHaruToken[],
  followerIdx: number,
  lookups: LookupTables
): boolean {
  const follower = tokens[followerIdx];
  if (follower === undefined || matchCopula(tokens, followerIdx, lookups) !== null) {
    return false;
  }
  if (isNominalScopeParticleToken(follower) || isTerminalParticleToken(follower)) {
    return true;
  }
  return admittedNominalFrameMarkerEndsAt({ tokens, markerStart: followerIdx, lookups }).length > 0;
}

function bareCaseParticleAdmission(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number,
  followerIdx: number,
  lookups: LookupTables
): RenyouNominalHeadAdmission | null {
  const relation = caseParticleMarkerRelationForToken(tokens[followerIdx], followerIdx);
  if (relation === null) {
    return null;
  }
  if (
    lookups.RENYOU_NOMINAL_HEAD_VERBAL_HOST_CASE_PARTICLES.has(relation.caseSurface) &&
    !resultComplementPredicateAt(tokens, followerIdx + 1, lookups)
  ) {
    return null;
  }
  return { kind: "bare_case_particle", hostIdx, followerIdx };
}

function resultComplementPredicateAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  const token = tokens[idx];
  return token !== undefined &&
    isVerbPredicateToken(token) &&
    lookups.RENYOU_NOMINAL_HEAD_VERBAL_HOST_CASE_PARTICLE_RESULT_PREDICATES.has(tokenLemma(token));
}

export function renyouNominalHeadHostEnd(admission: RenyouNominalHeadAdmission): number {
  switch (admission.kind) {
    case "derivational_suffix":
      return admission.suffixIdx;
    case "lexical_noun_compound":
      return admission.nounEnd;
    default:
      return admission.hostIdx;
  }
}

export function renyouNominalHeadHostShapeAdmitted(host: PredicateNominalProjectionHost): boolean {
  const root = host.root;
  if (root.sfp !== null || root.tail.kind !== "auxLayer" || root.tail.ops.length !== 0) {
    return false;
  }
  const stem = root.tail.stem;
  return stem.kind === "verb" || stem.kind === "candidateSet";
}

export function renyouDerivationalNominalHost(
  admission: Extract<RenyouNominalHeadAdmission, { readonly kind: "derivational_suffix" }>,
  host: PredicateNominalProjectionHost,
  tokens: readonly RuntimeHaruToken[]
): PredicateNominalProjectionHost | null {
  const profile = derivationalSuffixProfileById(admission.profileId);
  const suffixToken = tokens[admission.suffixIdx];
  const layer = host.root.tail;
  if (profile === undefined || suffixToken === undefined || layer.kind !== "auxLayer") {
    return null;
  }
  const suffixOp = buildPredicateSuffixOp(
    { tokens: [suffixToken], tokenIndices: [admission.suffixIdx] },
    profile.legacySuffixKind ?? null,
    profile.id,
    suffixToken.surface
  );
  const parsed: ParsedTailRoot = {
    tail: { ...layer, ops: [suffixOp], terminal: null },
    sfp: null,
    ...(host.root.headHypothesis === undefined ? {} : { headHypothesis: host.root.headHypothesis })
  };
  const lowered = lowerDerivationalSuffixRoot(parsed, { quoteBinding: host.root.quoteBinding });
  if (lowered.kind !== "lowered") {
    return null;
  }
  const end = admission.suffixIdx;
  return {
    ...host,
    root: { ...lowered.root, quoteBinding: host.root.quoteBinding },
    tokenSpan: { start: host.tokenSpan.start, end },
    contentSpan: { start: host.contentSpan.start, end },
    source: {
      start: host.source.start,
      end: end + 1,
      tokens: tokens.slice(host.source.start, end + 1)
    }
  };
}

function sourceSpanOf(tokens: readonly RuntimeHaruToken[], start: number, end: number): NominalSourceSpan {
  return { start, end, tokens: tokens.slice(start, end) };
}

export function buildRenyouNominalHeadTailChainPlan(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly admission: RenyouNominalHeadAdmission;
  readonly host: PredicateNominalProjectionHost;
  readonly lexicalNoun: MorphemeEntry | null;
  readonly commitContext?: NominalFrameCommitContext;
}): NominalHeadTailChainPlan {
  const { tokens, admission } = options;
  const hostEnd = renyouNominalHeadHostEnd(admission);
  const source = sourceSpanOf(tokens, admission.hostIdx, hostEnd + 1);
  const evidence = renyouNominalHeadEvidenceOf(tokens, admission);
  const root: RenyouNominalHeadNode = {
    kind: "renyouNominalHead",
    host: options.host,
    evidence,
    lexicalNoun: options.lexicalNoun,
    source
  };
  const markerIdx = admission.kind === "derivational_suffix" ? admission.suffixIdx : admission.hostIdx;
  const frameId = admission.kind === "derivational_suffix" || admission.kind === "noun_compound_suffix"
    ? `renyou_nominal_head:${admission.profileId}`
    : `renyou_nominal_head:${admission.kind}`;
  const markerSource = sourceSpanOf(tokens, markerIdx, hostEnd + 1);
  return {
    kind: "headTailChain",
    realization: {
      kind: "nominal",
      root,
      frame: {
        kind: "nominalFrame",
        id: frameId,
        frameKind: "renyou_nominal_head",
        markerSurface: markerSource.tokens.map((token) => token.surface).join(""),
        projection: { kind: "deterministic", korean: "" },
        outputPos: 명사,
        focus: null,
        source: markerSource
      },
      markerSpan: { start: markerSource.start, end: markerSource.end },
      headMarkerSpan: { start: source.start, end: source.end },
      owner: { kind: "phrase_owner", provenance: "nominal_head" },
      hostTokenIdx: admission.hostIdx,
      markerTokenIdx: markerIdx,
      ...(options.commitContext === undefined ? {} : { commitContext: options.commitContext })
    }
  };
}

function renyouNominalHeadEvidenceOf(
  tokens: readonly RuntimeHaruToken[],
  admission: RenyouNominalHeadAdmission
): RenyouNominalHeadEvidence {
  switch (admission.kind) {
    case "derivational_suffix":
      return {
        kind: "derivational_suffix",
        profileId: admission.profileId,
        suffix: sourceSpanOf(tokens, admission.suffixIdx, admission.suffixIdx + 1)
      };
    case "noun_compound_suffix":
      return {
        kind: "noun_compound_suffix",
        profileId: admission.profileId,
        suffix: sourceSpanOf(tokens, admission.suffixIdx, admission.suffixIdx + 1)
      };
    case "honorific_prefix":
      return { kind: "honorific_prefix", prefix: sourceSpanOf(tokens, admission.prefixIdx, admission.prefixIdx + 1) };
    case "honorific_prefix_compound":
      return {
        kind: "honorific_prefix_compound",
        prefix: sourceSpanOf(tokens, admission.prefixIdx, admission.prefixIdx + 1),
        follower: sourceSpanOf(tokens, admission.followerIdx, admission.followerIdx + 1)
      };
    case "lexical_noun_compound":
      return { kind: "lexical_noun_compound", noun: sourceSpanOf(tokens, admission.hostIdx + 1, admission.nounEnd + 1) };
    case "bare_case_particle":
      return { kind: "bare_case_particle", follower: sourceSpanOf(tokens, admission.followerIdx, admission.followerIdx + 1) };
  }
}

export function renyouNominalHeadFrameHostAt(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number,
  followerIdx: number,
  lookups: LookupTables
): boolean {
  const admission = renyouNominalHeadAdmissionAt(tokens, hostIdx, lookups);
  if (
    admission === null ||
    admission.kind === "derivational_suffix" ||
    admission.kind === "noun_compound_suffix" ||
    admission.kind === "honorific_prefix_compound" ||
    admission.kind === "lexical_noun_compound" ||
    admission.followerIdx !== followerIdx
  ) {
    return false;
  }
  const follower = tokens[followerIdx];
  return follower !== undefined && !adnominalNoLinkFollower(follower, lookups);
}

function adnominalNoLinkFollower(follower: RuntimeHaruToken, lookups: LookupTables): boolean {
  if (isAdnominalGenitiveMarkerToken(follower)) {
    return true;
  }
  return loadNominalFrameSpecsBySurface(lookups).get(follower.surface)
    ?.some((spec) => spec.kind === "host_bearing_likeness") ?? false;
}
