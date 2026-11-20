import type { RenderPlan, PredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan, renderPlanStartsWithShortNegation, spanLocalRenderPlanNode } from "../../types/render-plan.js";
import { isSahenCapableNominal, 동사, 명사, 부사, 형용사, POS01, 動詞_非自立可能 } from "../../types/pos.js";
import type { LookupTables } from "../lookup-tables.js";
import { candidateRealizationFromDecisionChoices } from "../head-tail/tail/predicate-root/tail-evidence-decision.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity, translationCandidateIdentity } from "../head-tail/tail/predicate-root/stem-candidate-identity.js";
import { opChainCanHostBareNounStem } from "../head-tail/tail/predicate-root/bare-noun-stem-hosting.js";
import { firstAuxLayer } from "../head-tail/tail/predicate-root/inspect.js";
import { candidateProjectionKinds, type BareStemNominalUseHostClass } from "../candidate-runtime.js";
import { preserveTailChainRenderPlanEnvelope } from "../head-tail/lifecycle/envelope.js";
import type { ResolvedCandidateSet } from "../source-candidate-set.js";
import { committedStemPrefersShortNegation } from "../head-tail/tail/predicate-root/short-negation-policy.js";
import type { CarrierHeadContract, HeadProjectionKind, HeadTailEvidenceDecision, StemCandidateRealization, TailNode } from "../head-tail/tail/predicate-root/grammar.js";
import type { NominalRoot, PredicateNominalProjectionHost } from "../head-tail/head/adapters/nominal/grammar.js";
import type { CommitmentCandidate, CommitmentSpan, CommitmentToken } from "./types.js";
import { candidatePriorityGroup, candidatePriorityInGroup, commitmentCandidateView, selectedCommitmentCandidate } from "./span-evidence.js";

const NOMINAL_PROJECTIONS = [
  "direct_nominal",
  "nominalized_predicate",
  "adverbial_nominal_fallback"
] as const satisfies readonly HeadProjectionKind[];
const NOMINAL_EXPECTED_REALIZATION_ORDER = [
  ["direct_nominal"],
  ["nominalized_predicate", "projected_nominal_adjectival"],
  ["adverbial_nominal_fallback"]
] as const satisfies readonly (readonly HeadProjectionKind[])[];
const NOMINAL_EXPECTED_PROJECTIONS = [
  "direct_nominal",
  "nominalized_predicate",
  "projected_nominal_adjectival",
  "adverbial_nominal_fallback"
] as const satisfies readonly HeadProjectionKind[];
const STEM_ROOT_NOMINAL_PROJECTIONS = [
  "stem_root_nominal"
] as const satisfies readonly HeadProjectionKind[];
const VERBAL_NOMINAL_M_PROJECTIONS = [
  "verbal_nominal_m"
] as const satisfies readonly HeadProjectionKind[];
const STEM_NOMINAL_REALIZATION_ACCEPTS = [
  ...STEM_ROOT_NOMINAL_PROJECTIONS,
  ...VERBAL_NOMINAL_M_PROJECTIONS
] as const satisfies readonly HeadProjectionKind[];
const DIRECT_PREDICATE_PROJECTIONS = [
  "direct_adjectival",
  "direct_verbal"
] as const satisfies readonly HeadProjectionKind[];
const DERIVED_PREDICATE_PROJECTIONS = [
  "projected_nominal_adjectival",
  "sahen_verbalized_nominal"
] as const satisfies readonly HeadProjectionKind[];
const PREDICATE_PROJECTIONS = [
  ...DIRECT_PREDICATE_PROJECTIONS,
  ...DERIVED_PREDICATE_PROJECTIONS
] as const satisfies readonly HeadProjectionKind[];
const DIRECT_QUOTE_BODY_PROJECTIONS = [
  ...NOMINAL_PROJECTIONS,
  ...DIRECT_PREDICATE_PROJECTIONS,
  "direct_adverbial"
] as const satisfies readonly HeadProjectionKind[];
const ADVERBIAL_PROJECTIONS = [
  "direct_adverbial",
  "adverbialized_adjectival",
  "adverbialized_verbal"
] as const satisfies readonly HeadProjectionKind[];

interface DeferredRealizationConstraint {
  readonly accepts?: readonly HeadProjectionKind[];
  readonly realizationOrder?: readonly (readonly HeadProjectionKind[])[];
}

export function selectCandidatesByDeferredSlotContract(
  candidates: readonly CommitmentCandidate[],
  slot: string | null | undefined,
  options: {
    readonly preserveExistingOrder: boolean;
    readonly hostClass?: BareStemNominalUseHostClass | null;
  }
): CommitmentCandidate[] {
  const contract = deferredSlotContract(slot, options.hostClass ?? null);
  if (contract === null || candidates.length < 2) {
    return [...candidates];
  }
  const groups = commitmentCandidatePriorityGroups(candidates);
  for (const [groupIndex, group] of groups.entries()) {
    const finalFallback = groupIndex === groups.length - 1;
    const compatible = group.filter((candidateIndex) =>
      commitmentCandidateMatchesContract(candidates[candidateIndex]!, contract)
    );
    if (compatible.length > 0) {
      const selected = options.preserveExistingOrder
        ? finalFallback ? group : compatible
        : finalFallback
          ? reorderCommitmentCandidateIndicesByContract(group, candidates, contract)
          : reorderCommitmentCandidateIndicesByContract(compatible, candidates, contract);
      return selected.map((index) => candidates[index]!);
    }
    if (finalFallback) {
      const selected = options.preserveExistingOrder
        ? group
        : reorderCommitmentCandidateIndicesByContract(group, candidates, contract);
      return selected.map((index) => candidates[index]!);
    }
  }
  return [...candidates];
}

function reorderCommitmentCandidateIndicesByContract(
  indices: readonly number[],
  candidates: readonly CommitmentCandidate[],
  contract: CarrierHeadContract
): number[] {
  return [...indices].sort((left, right) => {
    const leftCandidate = candidates[left]!;
    const rightCandidate = candidates[right]!;
    return commitmentCandidateProjectionTier(leftCandidate, contract) - commitmentCandidateProjectionTier(rightCandidate, contract) ||
      candidatePriorityInGroup(leftCandidate) - candidatePriorityInGroup(rightCandidate) ||
      left - right;
  });
}

function commitmentCandidateProjectionTier(candidate: CommitmentCandidate, contract: CarrierHeadContract): number {
  const groups = contract.candidatePreference ?? contract.realizationOrder ?? [];
  if (groups.length === 0) {
    return 0;
  }
  const kinds = candidateProjectionKinds(commitmentCandidateView(candidate));
  const tier = groups.findIndex((group) => group.some((kind) => kinds.includes(kind)));
  return tier >= 0 ? tier : groups.length;
}

export function predicateRootOwnerRejectsBareNounStem(plan: RenderPlan | null | undefined): boolean {
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  const layer = firstAuxLayer(plan.realization.root.tail);
  return layer !== null && !opChainCanHostBareNounStem(layer.ops);
}

export function deferredSlotContract(
  slot: string | null | undefined,
  hostClass: BareStemNominalUseHostClass | null = null
): CarrierHeadContract | null {
  switch (slot) {
    case "noun_particle":
    case "noun_only_compound":
      return {
        relation: "modification",
        accepts: [...NOMINAL_EXPECTED_PROJECTIONS, ...STEM_NOMINAL_REALIZATION_ACCEPTS],
        candidatePreference: [...NOMINAL_EXPECTED_REALIZATION_ORDER, STEM_ROOT_NOMINAL_PROJECTIONS, VERBAL_NOMINAL_M_PROJECTIONS],
        realizationOrder: [...NOMINAL_EXPECTED_REALIZATION_ORDER, STEM_ROOT_NOMINAL_PROJECTIONS, VERBAL_NOMINAL_M_PROJECTIONS],
        contextReason: "nominal argument slot requires nominal head realization"
      };
    case "nominalized_suffix":
      return {
        relation: "modification",
        accepts: ["nominalized_predicate", "direct_nominal", ...STEM_ROOT_NOMINAL_PROJECTIONS],
        candidatePreference: [["nominalized_predicate"], ["direct_nominal"], STEM_ROOT_NOMINAL_PROJECTIONS],
        realizationOrder: [["nominalized_predicate"], ["direct_nominal"], STEM_ROOT_NOMINAL_PROJECTIONS],
        contextReason: "nominalizing suffix prefers an explicit nominalized predicate projection before lexical noun fallback"
      };
    case "nominal_suffix_compound":
    case "quoted_lexical_mention":
    case "stem_coordination":
    case "stem_clause_pause": {
      const verbalNominalM: readonly (readonly HeadProjectionKind[])[] =
        slot === "stem_coordination" ? [VERBAL_NOMINAL_M_PROJECTIONS] : [];
      const stemFirst: readonly (readonly HeadProjectionKind[])[] = [
        STEM_ROOT_NOMINAL_PROJECTIONS, ["direct_nominal"], ["nominalized_predicate", "projected_nominal_adjectival"], ...verbalNominalM, ["adverbial_nominal_fallback"]
      ];
      const nounFirst: readonly (readonly HeadProjectionKind[])[] = [
        ["direct_nominal"], STEM_ROOT_NOMINAL_PROJECTIONS, ["nominalized_predicate", "projected_nominal_adjectival"], ...verbalNominalM, ["adverbial_nominal_fallback"]
      ];
      const order = hostClass === "na_adj_capable_noun" ? nounFirst : stemFirst;
      return {
        relation: slot === "quoted_lexical_mention" ? "quote_body" : "modification",
        accepts: [...NOMINAL_EXPECTED_PROJECTIONS, ...STEM_ROOT_NOMINAL_PROJECTIONS,
          ...(slot === "stem_coordination" ? VERBAL_NOMINAL_M_PROJECTIONS : [])],
        candidatePreference: order,
        realizationOrder: order,
        contextReason: hostClass === "na_adj_capable_noun"
          ? "na-adjective-capable noun in a nominal-use slot prefers its lexical noun sense before the predicate stem root"
          : "bare na-adjective stem in a nominal-use slot prefers the predicate stem root (combining form) over a lexical noun sense"
      };
    }
    case "keijouji_suffix":
      return {
        relation: "modification",
        accepts: [...PREDICATE_PROJECTIONS, ...NOMINAL_PROJECTIONS],
        candidatePreference: [
          DIRECT_PREDICATE_PROJECTIONS,
          DERIVED_PREDICATE_PROJECTIONS,
          NOMINAL_PROJECTIONS
        ],
        realizationOrder: [
          DIRECT_PREDICATE_PROJECTIONS,
          DERIVED_PREDICATE_PROJECTIONS,
          NOMINAL_PROJECTIONS
        ],
        contextReason: "na-attributive slot prefers predicate/adjectival projection while preserving nominal-only heads"
      };
    case "keijouji_adverbial":
      return {
        relation: "modification",
        accepts: [...ADVERBIAL_PROJECTIONS, ...DIRECT_PREDICATE_PROJECTIONS, "projected_nominal_adjectival", ...NOMINAL_PROJECTIONS],
        candidatePreference: [
          ["direct_adverbial"],
          ["adverbialized_adjectival", "adverbialized_verbal"],
          DIRECT_PREDICATE_PROJECTIONS,
          ["projected_nominal_adjectival"],
          NOMINAL_PROJECTIONS
        ],
        realizationOrder: [
          ["direct_adverbial"],
          ["adverbialized_adjectival", "adverbialized_verbal"],
          DIRECT_PREDICATE_PROJECTIONS,
          ["projected_nominal_adjectival"],
          NOMINAL_PROJECTIONS
        ],
        contextReason: "copula-ni adverbial slot prefers adverbial or adverbialized predicate realization before nominal fallback"
      };
    case "copula_nominal_idiom":
      return {
        relation: "modification",
        accepts: [...NOMINAL_EXPECTED_PROJECTIONS, ...PREDICATE_PROJECTIONS],
        candidatePreference: [...NOMINAL_EXPECTED_REALIZATION_ORDER, DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
        realizationOrder: [...NOMINAL_EXPECTED_REALIZATION_ORDER, DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
        contextReason: "lexical copula nominal idiom keeps nominal realization before predicate projection"
      };
    case "copula_predicate":
    case "naru_complement":
      return {
        relation: "modification",
        accepts: [...PREDICATE_PROJECTIONS, ...NOMINAL_EXPECTED_PROJECTIONS],
        candidatePreference: [DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS, ...NOMINAL_EXPECTED_REALIZATION_ORDER],
        realizationOrder: [DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS, ...NOMINAL_EXPECTED_REALIZATION_ORDER],
        contextReason: "predicate copula/complement slot prefers direct predicate realization before nominal fallback"
      };
    case "quoted_nominal":
      return {
        relation: "quote_body",
        accepts: [...DIRECT_QUOTE_BODY_PROJECTIONS, ...STEM_ROOT_NOMINAL_PROJECTIONS, ...DERIVED_PREDICATE_PROJECTIONS],
        candidatePreference: [["direct_nominal"], STEM_ROOT_NOMINAL_PROJECTIONS, ["nominalized_predicate", "projected_nominal_adjectival"], ["adverbial_nominal_fallback"], DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
        realizationOrder: [["direct_nominal"], STEM_ROOT_NOMINAL_PROJECTIONS, ["nominalized_predicate", "projected_nominal_adjectival"], ["adverbial_nominal_fallback"], DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
        contextReason: "explicit metalinguistic quoted nominal slot preserves direct nominal realization before predicate projection"
      };
    default:
      return null;
  }
}

function commitmentCandidatePriorityGroups(candidates: readonly CommitmentCandidate[]): number[][] {
  const groups: number[][] = [];
  const groupKeys: number[] = [];
  for (const [index, candidate] of candidates.entries()) {
    const groupKey = candidatePriorityGroup(candidate);
    const existingIndex = groupKeys.indexOf(groupKey);
    if (existingIndex >= 0) {
      groups[existingIndex]!.push(index);
      continue;
    }
    groupKeys.push(groupKey);
    groups.push([index]);
  }
  return groups
    .map((group, index) => ({ group, key: groupKeys[index] ?? Number.MAX_SAFE_INTEGER }))
    .sort((left, right) => left.key - right.key)
    .map(({ group }) => group);
}

function commitmentCandidateMatchesContract(candidate: CommitmentCandidate, contract: CarrierHeadContract): boolean {
  const kinds = candidateProjectionKinds(commitmentCandidateView(candidate));
  return kinds.some((kind) => contract.accepts.includes(kind));
}

export function predicatePlanWithCandidateSetCommitment(
  plan: PredicateHeadTailChainRenderPlan,
  decision: HeadTailEvidenceDecision,
  committedSense: ReturnType<typeof translationCandidateIdentity> | undefined,
  realizationConstraint?: DeferredRealizationConstraint
): PredicateHeadTailChainRenderPlan {
  const committedSenseRealization = committedSense === undefined
    ? undefined
    : candidateRealizationFromDecisionChoices(decision, committedSense, realizationConstraint === undefined
      ? {}
      : {
        ...(realizationConstraint.accepts === undefined ? {} : { accepts: realizationConstraint.accepts }),
        ...(realizationConstraint.realizationOrder === undefined
          ? {}
          : { realizationOrder: realizationConstraint.realizationOrder })
      });
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        headEvidenceDecision: decision,
        tail: tailNodeWithCandidateSetCommitment(
          plan.realization.root.tail,
          committedSenseRealization,
          committedSense,
          realizationConstraint === undefined
        )
      }
    }
  };
}

export function tailNodeWithCandidateSetCommitment(
  node: TailNode,
  committedSenseRealization: StemCandidateRealization | null | undefined,
  committedSense: ReturnType<typeof translationCandidateIdentity> | undefined,
  preserveExistingRealization = false
): TailNode {
  if (node.kind === "connective") {
    return {
      ...node,
      inner: tailNodeWithCandidateSetCommitment(
        node.inner,
        committedSenseRealization,
        committedSense,
        preserveExistingRealization
      ) as typeof node.inner,
      outer: tailNodeWithCandidateSetCommitment(
        node.outer,
        committedSenseRealization,
        committedSense,
        preserveExistingRealization
      )
    };
  }
  const derivationalBase = node.stem.derivationalBase;
  const stem = derivationalBase === undefined
    ? node.stem
    : {
      ...node.stem,
      derivationalBase: {
        ...derivationalBase,
        host: {
          ...derivationalBase.host,
          tail: tailNodeWithCandidateSetCommitment(
            derivationalBase.host.tail,
            committedSenseRealization,
            committedSense,
            preserveExistingRealization
          )
        }
      }
    };
  if (stem.kind !== "candidateSet") {
    return stem === node.stem ? node : { ...node, stem };
  }
  if (
    committedSense !== undefined &&
    !stem.candidates.some((candidate) =>
      stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), committedSense)
    )
  ) {
    return stem === node.stem ? node : { ...node, stem };
  }
  const sameCommittedSense = committedSense !== undefined &&
    stem.committedSense !== undefined &&
    stemCandidateIdentitiesEqual(stem.committedSense, committedSense);
  const nextRealization = preserveExistingRealization &&
    sameCommittedSense &&
    stem.committedSenseRealization !== undefined
    ? stem.committedSenseRealization
    : committedSenseRealization;
  return {
    ...node,
    stem: {
      ...stem,
      ...(nextRealization === undefined ? {} : { committedSenseRealization: nextRealization }),
      ...(committedSense === undefined ? {} : { committedSense })
    }
  };
}

export function predicateNominalProjectionHosts(root: NominalRoot): readonly PredicateNominalProjectionHost[] {
  if (root.kind === "predicateNominalHost" || root.kind === "renyouNominalHead") {
    return [root.host];
  }
  if (
    root.kind === "hostBearingLikeness" &&
    root.frame.modal.kind === "nominalHostLikenessContinuationProjection" &&
    root.frame.modal.predicateHost !== undefined
  ) {
    return [root.frame.modal.predicateHost];
  }
  return [];
}

export function nominalRootWithPredicateHostRoot(
  root: NominalRoot,
  target: PredicateNominalProjectionHost,
  committedRoot: PredicateNominalProjectionHost["root"]
): NominalRoot {
  if ((root.kind === "predicateNominalHost" || root.kind === "renyouNominalHead") && root.host === target) {
    return { ...root, host: { ...root.host, root: committedRoot } };
  }
  if (
    root.kind === "hostBearingLikeness" &&
    root.frame.modal.kind === "nominalHostLikenessContinuationProjection" &&
    root.frame.modal.predicateHost === target
  ) {
    return {
      ...root,
      frame: {
        ...root.frame,
        modal: {
          ...root.frame.modal,
          predicateHost: { ...root.frame.modal.predicateHost, root: committedRoot }
        }
      }
    };
  }
  return root;
}

export function realizeCommittedCandidate(
  span: CommitmentSpan,
  set: ResolvedCandidateSet<CommitmentCandidate>,
  options: {
    readonly deriveRealization?: boolean;
    readonly realizationConstraint?: DeferredRealizationConstraint;
  } = {}
): void {
  const candidate = set.winner.candidate;
  span.entry = candidate.entry ?? span.entry;
  const intrinsicHonorific = candidate.intrinsicHonorific ?? candidate.translation?.intrinsicHonorific;
  if (intrinsicHonorific === undefined) {
    delete span.intrinsicHonorific;
  } else {
    span.intrinsicHonorific = intrinsicHonorific;
  }
  const candidateRenderPlanPolicy = candidate.renderPlanPolicy ?? "normal";
  span.renderPlanPolicy = candidateRenderPlanPolicy;
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    const rootDecision = span.renderPlan.realization.root.headEvidenceDecision;
    const committedSense = translationCandidateIdentity(commitmentCandidateView(candidate));
    if (rootDecision !== undefined) {
      const realizationConstraint = options.deriveRealization === true
        ? deferredCandidateRealizationConstraint(candidate, options.realizationConstraint)
        : options.realizationConstraint;
      span.renderPlan = predicatePlanWithCandidateSetCommitment(
        span.renderPlan,
        rootDecision,
        committedSense,
        realizationConstraint
      );
    } else {
      span.renderPlan = {
        ...span.renderPlan,
        realization: {
          ...span.renderPlan.realization,
          root: {
            ...span.renderPlan.realization.root,
            tail: tailNodeWithCommittedSenseOnly(span.renderPlan.realization.root.tail, committedSense)
          }
        }
      };
    }
  } else if (candidate.renderPlan !== undefined) {
    span.renderPlan = candidate.renderPlan === null
      ? null
      : spanLocalRenderPlanNode(preserveTailChainRenderPlanEnvelope(candidate.renderPlan, span.renderPlan ?? null));
  }
  if (candidate.entry !== undefined && isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    span.renderPlan = {
      ...span.renderPlan,
      realization: {
        ...span.renderPlan.realization,
        entry: candidate.entry
      }
    };
  }
  if (candidate.lexicalParticleAdverbial !== undefined && candidate.lexicalParticleAdverbial !== null) {
    span.consumed = candidate.lexicalParticleAdverbial.consumed;
    span.particleRole = candidate.lexicalParticleAdverbial.particleRole;
    span.renderPlan = spanLocalRenderPlanNode(candidate.lexicalParticleAdverbial.renderPlan);
  }
  span.korean = candidate.korean ?? "";
  span.koreanPos = candidate.koreanPos ?? span.koreanPos;
  if (candidate.voice !== undefined) {
    span.voice = candidate.voice;
  }
  if (candidate.nareruReadings !== undefined) {
    span.nareruReadings = candidate.nareruReadings;
  }
  if (candidate.rareruReadings !== undefined) {
    span.rareruReadings = candidate.rareruReadings;
  }
  if (candidate.dekiruReadings !== undefined) {
    span.dekiruReadings = candidate.dekiruReadings;
  }
  if (candidate.hasNegative !== undefined) {
    span.hasNegative = candidate.hasNegative;
  }
  if (candidate.hasRequestTail !== undefined) {
    span.hasRequestTail = candidate.hasRequestTail;
  }
  if (candidate.connectiveRole !== undefined) {
    span.connectiveRole = candidate.connectiveRole;
  }
  if (candidate.teConnectiveClassificationState !== undefined) {
    span.teConnectiveClassificationState = candidate.teConnectiveClassificationState;
  }
  span.benefactive = candidate.benefactive ?? span.benefactive ?? null;
  span.warnings = candidate.warnings ?? [];
}

export function deferredCandidateRealizationConstraint(
  candidate: CommitmentCandidate,
  inherited: DeferredRealizationConstraint | undefined
): DeferredRealizationConstraint {
  const direct = candidate.koreanPos === 형용사
    ? ["direct_adjectival" as const]
    : candidate.koreanPos === 동사
      ? ["direct_verbal" as const]
      : candidate.koreanPos === 명사
        ? ["direct_nominal" as const]
        : candidate.koreanPos === 부사
          ? ["direct_adverbial" as const]
          : [];
  const inheritedOrder = inherited?.realizationOrder;
  const withDirectPreference = (
    fallback: readonly (readonly HeadProjectionKind[])[]
  ): readonly (readonly HeadProjectionKind[])[] => direct.length === 0
    ? fallback
    : [direct, ...fallback];
  if (candidate.koreanPos === 형용사 || candidate.koreanPos === 동사) {
    return {
      ...(inherited?.accepts === undefined ? {} : { accepts: inherited.accepts }),
      realizationOrder: withDirectPreference(inheritedOrder ?? [
        DIRECT_PREDICATE_PROJECTIONS,
        DERIVED_PREDICATE_PROJECTIONS,
        NOMINAL_PROJECTIONS,
        ADVERBIAL_PROJECTIONS
      ])
    };
  }
  if (candidate.koreanPos === 명사) {
    return {
      ...(inherited?.accepts === undefined ? {} : { accepts: inherited.accepts }),
      realizationOrder: withDirectPreference(inheritedOrder ?? [
        ...NOMINAL_EXPECTED_REALIZATION_ORDER,
        DIRECT_PREDICATE_PROJECTIONS,
        DERIVED_PREDICATE_PROJECTIONS,
        ADVERBIAL_PROJECTIONS
      ])
    };
  }
  return {
    ...(inherited?.accepts === undefined ? {} : { accepts: inherited.accepts }),
    realizationOrder: withDirectPreference(inheritedOrder ?? [
      ADVERBIAL_PROJECTIONS,
      NOMINAL_PROJECTIONS,
      DIRECT_PREDICATE_PROJECTIONS,
      DERIVED_PREDICATE_PROJECTIONS
    ])
  };
}

function tailNodeWithCommittedSenseOnly(
  node: TailNode,
  committedSense: ReturnType<typeof translationCandidateIdentity>
): TailNode {
  if (node.kind === "connective") {
    return {
      ...node,
      inner: tailNodeWithCommittedSenseOnly(node.inner, committedSense) as typeof node.inner,
      outer: tailNodeWithCommittedSenseOnly(node.outer, committedSense)
    };
  }
  const derivationalBase = node.stem.derivationalBase;
  const stem = derivationalBase === undefined
    ? node.stem
    : {
      ...node.stem,
      derivationalBase: {
        ...derivationalBase,
        host: {
          ...derivationalBase.host,
          tail: tailNodeWithCommittedSenseOnly(derivationalBase.host.tail, committedSense)
        }
      }
    };
  return stem.kind === "candidateSet" && stem.candidates.some((candidate) =>
    stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), committedSense)
  )
    ? { ...node, stem: { ...stem, committedSense } }
    : stem === node.stem ? node : { ...node, stem };
}

export function syncSahenShortNegationAttachment(
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  lookups: LookupTables
): void {
  const candidate = selectedCommitmentCandidate(span);
  const plan = span.renderPlan;
  const layer = isPredicateHeadTailChainRenderPlan(plan) ? firstAuxLayer(plan.realization.root.tail) : null;
  const committedShortNegation = candidate !== undefined && layer !== null &&
    committedStemPrefersShortNegation(
      layer.ops,
      candidate.koreanLemma ?? candidate.korean ?? "",
      candidate.shortNegationPolicy,
      lookups.LONG_NEGATION_PREFERRED_KOREAN_LEMMAS
    );
  if (
    isSahenBoundVerbAfterSahenCommitment(tokens, idx) &&
    (renderPlanStartsWithShortNegation(plan ?? null) || committedShortNegation)
  ) {
    span.attachLeft = false;
  }
}

function isSahenBoundVerbAfterSahenCommitment(tokens: readonly CommitmentToken[], idx: number): boolean {
  if (idx <= 0) {
    return false;
  }
  const token = tokens[idx];
  if (
    token === undefined || (token.pos & POS01) !== 動詞_非自立可能 || token.dictionaryForm !== "する" && token.dictionaryForm !== "できる" && token.dictionaryForm !== "出来る"
  ) {
    return false;
  }
  const previous = tokens[idx - 1];
  return previous !== undefined && isSahenCapableNominal(previous);
}
