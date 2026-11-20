import type { RuntimeHaruToken } from "../types/token.js";
import type { RenderPlan } from "../types/render-plan.js";
import type { ProjectionEvidenceLayout } from "./clause-layout/layout-types.js";
import type { TraceDetailValue } from "./trace.js";
import { FunctionalKind, UnitType } from "./translation/unit.js";
import {
  classifyDatteMarkerAt,
  hasNadoNegativeFollower,
  isKeredoMoTailParticle,
  isNanteQuotativeMarker,
  orphanConnectiveParticleKorean,
  resolveTteParticleAllomorphKey,
  toiuIuStandsAsAttributiveCarrier,
  yaraIndefiniteKorean
} from "./semantics/marker-roles.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "./clause-layout/trivia.js";
import { TokenCursor } from "./token-cursor.js";
import { isPlaceScopeNoun } from "./head-tail/candidate/semantic-classifiers.js";
import { isQuotationContext } from "./semantics/helpers.js";
import type { LookupTables } from "./lookup-tables.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import {
  describeNominalFrameMarkerAdapterProfiles,
  explainNominalFrameMarkerAdapterBlock,
  nominalTailChainAttachLeft,
  nominalTailChainKoreanPos,
  tryBuildNominalFrameMarkerAdapterPlan,
  type NominalFrameMarkerAdapterBuildResult
} from "./head-tail/head/adapters/nominal/integration.js";
import type { NominalFramePredicateCommitContext } from "./head-tail/head/adapters/nominal/grammar.js";
import type {
  NominalFrameCommittedParticleAssignment,
  NominalOwnerArbitrationBlock
} from "./head-tail/head/adapters/nominal/owner-arbitration.js";
import {
  collectHeadProfileContinuationCapabilities,
  defineHeadedParserEngine,
  headProfileArbitrationTraceDetail,
  headProfileDispatchSelection,
  type HeadProfile,
  type HeadProfileArbitrationDecision,
  type HeadProfileDispatchMetadata,
  type HeadProfileDescriptor
} from "./head-tail/head/profile.js";
import { projectionContextBoundsForToken, type ProjectionContextBounds } from "./head-tail/candidate/context.js";
import { caseParticleMarkerRelationForToken, kaMarkerRelationAt, nominalLinkMarkerRelationAt, predicateNominalizerRelationForToken } from "./head-tail/boundary/marker.js";
import { singleMarkerNominalChoiceKaAt } from "./head-tail/boundary/ka-ownership.js";
import { plainNominalizerFollowerVerdictAt } from "./head-tail/tail/predicate-root/matchers/nominalizer.js";
import { isTrailingPunctuationToken } from "./head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt } from "./head-tail/boundary/quote-marker.js";
import {
  relationConnectiveSpansAt,
  relationDiscontinuousClosureSpanAfter
} from "./head-tail/tail/connective-span-scanner.js";
import { tariKeijoujiAdverbialToEvidence } from "./semantics/tari-adverbial-marker.js";
import { isClassicalNariMizenNaraToken, isClassicalNuRenyouZuToken } from "./matchers.js";
import { isSecondaryParticle, secondaryParticleCanonical } from "./particles/secondary-particle.js";


import {
  POS0,
  POS01,
  POS012,
  POS1,
  POS4,
  POS5,
  POS5A,
  格助詞,
  形状詞,
  形容詞0,
  助詞,
  助詞_副助詞,
  助動詞,
  助動詞_ダ,
  助動詞_ナイ,
  助動詞_ヌ,
  代名詞,
  動詞,
  非自立可能,
  副詞,
  副助詞,
  名詞,
  名詞_固有名詞_地名,
  接尾辞_名詞的,
  連用形_,
  連用形_促音便,
  관형사,
  대명사,
  부사,
  접속사,
  조사,
  isAdverbCapableNominal,
  isNominalLike,
  isNaAdjCapable,
  NOMINAL_BITS,
  pos0in,
  INFLECTABLE_BITS,
  助詞_格助詞
} from "../types/pos.js";
import { IU_LEXEME_FORMS } from "./head-tail/data/quoted-reporting-sets.js";
interface ParticleHeadDispatchContext {
  readonly nominalFrameMarker: () => Promise<NominalFrameMarkerAdapterBuildResult | null>;
  readonly caseParticleMarker: () => ParticleFunctionalMarkerBuildPayload | null;
  readonly datteFunctionalMarker: () => ParticleFunctionalMarkerBuildPayload | null;
  readonly toFunctionalMarker: () => ParticleFunctionalMarkerBuildPayload | null;
  readonly toiuFunctionalMarker: () => ParticleFunctionalMarkerBuildPayload | null;
  readonly tteFunctionalMarker: () => ParticleFunctionalMarkerBuildPayload | null;
  readonly tokaFunctionalMarker: () => ParticleFunctionalMarkerBuildPayload | null;
  readonly kaNominalChoiceMarker: () => ParticleFunctionalMarkerBuildPayload | null;
  readonly secondaryParticleMarker: () => ParticleFunctionalMarkerBuildPayload | null;
  readonly orphanConnectiveParticle: () => ParticleFunctionalMarkerBuildPayload | null;
}

export interface ParticleHeadDispatchOptions {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly layout?: ProjectionEvidenceLayout;
  readonly allomorphHint?: string | null;
  readonly precedingTokenKoreanPos?: number | null;
  readonly precedingCasePreference?: ParticleHeadCasePreference | null;
  readonly precedingPrenominalPredicate?: boolean;
  readonly committedParticleAssignment?: NominalFrameCommittedParticleAssignment | null;
  readonly followingPredicate?: NominalFramePredicateCommitContext;
}

export interface ParticleHeadCasePreference {
  readonly korean?: string | null;
  readonly allomorphKey?: string | null;
}

export interface ParticleHeadAssemblyDescriptor {
  readonly korean: string;
  readonly unitType: UnitType;
  readonly koreanPos: number;
  readonly attachLeft: boolean;
  readonly functionalKind?: FunctionalKind | null;
  readonly allomorphKey?: string | null;
  readonly renderPlan?: RenderPlan | null;
  readonly emit?: boolean;
  readonly copulaBase?: string;
}

export interface ParticleHeadRewriteDescriptor {
  readonly target: "previous_content";
  readonly renderPlan: RenderPlan;
  readonly rule: string;
}

export type ParticleHeadDispatchResult =
  | ({
    readonly kind: "nominal_frame_marker_adapter";
    readonly built: NominalFrameMarkerAdapterBuildResult;
    readonly assembly: ParticleHeadAssemblyDescriptor;
  } & HeadProfileDispatchMetadata<ParticleHeadBuildPayload>)
  | ({
    readonly kind: "functional_marker_adapter";
    readonly markerKind: ParticleFunctionalMarkerKind;
    readonly consumed: number;
    readonly assembly: ParticleHeadAssemblyDescriptor;
    readonly headRewrite?: ParticleHeadRewriteDescriptor | null;
  } & HeadProfileDispatchMetadata<ParticleHeadBuildPayload>)
  | {
    readonly kind: "none";
    readonly block: NominalOwnerArbitrationBlock | null;
    readonly reason: string;
    readonly dispatchDecision: HeadProfileArbitrationDecision<ParticleHeadBuildPayload>;
  };

type ParticleHeadDispatchNoneResult = Extract<ParticleHeadDispatchResult, { readonly kind: "none" }>;
type ParticleHeadDispatchMatchedResult = Extract<
  ParticleHeadDispatchResult,
  { readonly kind: "nominal_frame_marker_adapter" | "functional_marker_adapter" }
>;

export interface ParticleHeadAppendPayload {
  readonly consumed: number;
  readonly korean: string;
  readonly emit: boolean;
  readonly markerKind?: ParticleFunctionalMarkerKind;
  readonly headRewrite?: ParticleHeadRewriteDescriptor | null;
  readonly nominalFrame?: NominalFrameMarkerAdapterBuildResult;
  readonly assemblyOptions: Omit<ParticleHeadAssemblyDescriptor, "korean">;
  readonly traceDetail: { readonly [key: string]: TraceDetailValue };
}

export type ParticleHeadConsumptionResult =
  | (ParticleHeadAppendPayload & { readonly kind: "append" })
  | {
    readonly kind: "none";
    readonly block: NominalOwnerArbitrationBlock | null;
    readonly reason: string;
    readonly traceDetail: { readonly [key: string]: TraceDetailValue };
  };

type ParticleHeadBuildPayload = {
  readonly kind: "nominal_frame_marker_adapter";
  readonly built: NominalFrameMarkerAdapterBuildResult;
} | ParticleFunctionalMarkerBuildPayload;

export type ParticleFunctionalMarkerKind =
  | "case_no_lexical_preference"
  | "case_no_determiner_omit"
  | "case_no_default_genitive"
  | "case_no_genitive_suppressed"
  | "case_de_orphan_demo_discourse"
  | "case_de_default_contextual"
  | "case_ni_nari_own_way"
  | "datte_causal_discourse"
  | "datte_focus_particle"
  | "to_adverbial"
  | "to_naru_result"
  | "to_suru_transform"
  | "orphan_connective_particle"
  | "orphan_connective_tail_particle_skip"
  | "toiu_attributive"
  | "toiu_comparative"
  | "tte_quote"
  | "tte_attributive"
  | "tte_topic"
  | "ka_nominal_choice"
  | "toka_listing_middle"
  | "toka_listing_final"
  | "toka_single_example"
  | "toka_exemplifier"
  | "secondary_bakari_ka_additive"
  | "secondary_dokoro_ka_reversal"
  | "secondary_kiri_limit"
  | "secondary_distributive"
  | "secondary_kiri_attributive_limit"
  | "secondary_kosoado_dake_degree"
  | "secondary_kosoado_dake_degree_attr"
  | "secondary_degree"
  | "secondary_yara_indefinite"
  | "secondary_yara_particle_skip"
  | "secondary_yara_listing"
  | "secondary_kashira_indefinite"
  | "secondary_nado_soft_topic"
  | "secondary_nado_dismissive"
  | "secondary_nado_example"
  | "secondary_nante_quote_contrast"
  | "secondary_nante_dismissive"
  | "secondary_nanka_comparative_dismissive"
  | "secondary_nanka_additive_dismissive"
  | "secondary_nanka_soft_topic"
  | "secondary_nanka_split_indefinite";

interface ParticleFunctionalMarkerBuildPayload {
  readonly kind: "functional_marker_adapter";
  readonly markerKind: ParticleFunctionalMarkerKind;
  readonly consumed: number;
  readonly assembly: ParticleHeadAssemblyDescriptor;
  readonly headRewrite?: ParticleHeadRewriteDescriptor | null;
}

type ParticleHeadDispatchProfile = HeadProfile<ParticleHeadDispatchContext, ParticleHeadBuildPayload>;

let _particleHeadDispatchProfiles: readonly HeadProfile<ParticleHeadDispatchContext, ParticleHeadBuildPayload>[] | undefined;
function getParticleHeadDispatchProfiles(): readonly HeadProfile<ParticleHeadDispatchContext, ParticleHeadBuildPayload>[] {
  if (_particleHeadDispatchProfiles !== undefined) return _particleHeadDispatchProfiles;
  _particleHeadDispatchProfiles = [
    datteFunctionalMarkerProfile(),
    toiuFunctionalMarkerProfile(),
    tteFunctionalMarkerProfile(),
    toFunctionalMarkerProfile(),
    orphanConnectiveParticleProfile(),
    tokaFunctionalMarkerProfile(),
    kaNominalChoiceMarkerProfile(),
    secondaryParticleMarkerProfile(),
    nominalFrameMarkerProfile(),
    caseParticleMarkerProfile()
  ] as const;
  return _particleHeadDispatchProfiles;
}

function datteFunctionalMarkerProfile(): ParticleHeadDispatchProfile {
  return {
    id: "datte_functional_marker_adapter",
    owner: "assembler",
    continuationCapabilities: [
      {
        id: "datte_causal_discourse_marker",
        kind: "connective",
        surfaces: ["だって"],
        description: ""
      },
      {
        id: "datte_focus_particle_marker",
        kind: "focus",
        surfaces: ["Nだって", "Pだって"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: (result) => {
      if (result.kind !== "functional_marker_adapter") {
        return [];
      }
      switch (result.markerKind) {
        case "datte_causal_discourse":
          return ["datte_causal_discourse_marker"];
        case "datte_focus_particle":
          return ["datte_focus_particle_marker"];
        default:
          return [];
      }
    },
    tryBuild: (context) => context.datteFunctionalMarker()
  };
}

function toiuFunctionalMarkerProfile(): ParticleHeadDispatchProfile {
  return {
    id: "toiu_functional_marker_adapter",
    owner: "assembler",
    continuationCapabilities: [
      {
        id: "toiu_attributive_marker",
        kind: "attributive_quote",
        surfaces: ["というN", "っていうN"],
        description: ""
      },
      {
        id: "toiu_comparative_marker",
        kind: "connective",
        surfaces: ["というより", "っていうより"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: (result) => {
      if (result.kind !== "functional_marker_adapter") {
        return [];
      }
      return result.markerKind === "toiu_comparative"
        ? ["toiu_comparative_marker"]
        : ["toiu_attributive_marker"];
    },
    tryBuild: (context) => context.toiuFunctionalMarker()
  };
}

function tteFunctionalMarkerProfile(): ParticleHeadDispatchProfile {
  return {
    id: "tte_functional_marker_adapter",
    owner: "assembler",
    continuationCapabilities: [
      {
        id: "tte_quote_marker",
        kind: "quote",
        surfaces: ["Pって言う", "」って"],
        description: ""
      },
      {
        id: "tte_attributive_marker",
        kind: "attributive_quote",
        surfaces: ["NってN", "PってN"],
        description: ""
      },
      {
        id: "tte_topic_marker",
        kind: "topic",
        surfaces: ["Nって"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: (result) => {
      if (result.kind !== "functional_marker_adapter") {
        return [];
      }
      switch (result.markerKind) {
        case "tte_quote":
          return ["tte_quote_marker"];
        case "tte_attributive":
          return ["tte_attributive_marker"];
        case "tte_topic":
          return ["tte_topic_marker"];
        default:
          return [];
      }
    },
    tryBuild: (context) => context.tteFunctionalMarker()
  };
}

function toFunctionalMarkerProfile(): ParticleHeadDispatchProfile {
  return {
    id: "to_functional_marker_adapter",
    owner: "assembler",
    continuationCapabilities: [
      {
        id: "to_adverbial_marker",
        kind: "adverbial",
        surfaces: ["副詞と", "形状詞-タリと", "畳語形状詞と"],
        description: ""
      },
      {
        id: "to_naru_result_marker",
        kind: "case_frame",
        surfaces: ["Nとなる"],
        description: ""
      },
      {
        id: "to_suru_transform_marker",
        kind: "case_frame",
        surfaces: ["Nとする"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: (result) => {
      if (result.kind !== "functional_marker_adapter") {
        return [];
      }
      switch (result.markerKind) {
        case "to_adverbial":
          return ["to_adverbial_marker"];
        case "to_naru_result":
          return ["to_naru_result_marker"];
        case "to_suru_transform":
          return ["to_suru_transform_marker"];
        default:
          return [];
      }
    },
    tryBuild: (context) => context.toFunctionalMarker()
  };
}

function orphanConnectiveParticleProfile(): ParticleHeadDispatchProfile {
  return {
    id: "orphan_connective_particle_adapter",
    owner: "assembler",
    continuationCapabilities: [
      {
        id: "orphan_connective_particle_marker",
        kind: "connective",
        surfaces: ["けど"],
        description: ""
      },
      {
        id: "orphan_connective_tail_particle_skip",
        kind: "connective",
        surfaces: ["けども", "けれども"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: (result) => {
      if (result.kind !== "functional_marker_adapter") {
        return [];
      }
      switch (result.markerKind) {
        case "orphan_connective_particle":
          return ["orphan_connective_particle_marker"];
        case "orphan_connective_tail_particle_skip":
          return ["orphan_connective_tail_particle_skip"];
        default:
          return [];
      }
    },
    tryBuild: (context) => context.orphanConnectiveParticle()
  };
}

function tokaFunctionalMarkerProfile(): ParticleHeadDispatchProfile {
  return {
    id: "toka_functional_marker_adapter",
    owner: "assembler",
    continuationCapabilities: [
      {
        id: "toka_listing_middle_marker",
        kind: "listing",
        surfaces: ["NとかNとか"],
        description: ""
      },
      {
        id: "toka_listing_final_marker",
        kind: "listing",
        surfaces: ["Nとか...Nとか"],
        description: ""
      },
      {
        id: "toka_single_example_marker",
        kind: "listing",
        surfaces: ["NとかV"],
        description: ""
      },
      {
        id: "toka_exemplifier_marker",
        kind: "listing",
        surfaces: ["...かとか", "Nとか格助詞"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: (result) => {
      if (result.kind !== "functional_marker_adapter") {
        return [];
      }
      switch (result.markerKind) {
        case "toka_listing_middle":
          return ["toka_listing_middle_marker"];
        case "toka_listing_final":
          return ["toka_listing_final_marker"];
        case "toka_single_example":
          return ["toka_single_example_marker"];
        case "toka_exemplifier":
          return ["toka_exemplifier_marker"];
        default:
          return [];
      }
    },
    tryBuild: (context) => context.tokaFunctionalMarker()
  };
}

function kaNominalChoiceMarkerProfile(): ParticleHeadDispatchProfile {
  return {
    id: "ka_nominal_choice_marker_adapter",
    owner: "assembler",
    continuationCapabilities: [
      {
        id: "ka_nominal_choice_marker",
        kind: "listing",
        surfaces: ["NかN"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: (result) => {
      if (result.kind !== "functional_marker_adapter") {
        return [];
      }
      return result.markerKind === "ka_nominal_choice" ? ["ka_nominal_choice_marker"] : [];
    },
    tryBuild: (context) => context.kaNominalChoiceMarker()
  };
}

function secondaryParticleMarkerProfile(): ParticleHeadDispatchProfile {
  return {
    id: "secondary_particle_marker_adapter",
    owner: "assembler",
    continuationCapabilities: [
      {
        id: "secondary_kosoado_dake_degree_marker",
        kind: "degree",
        surfaces: ["これだけ", "それだけ", "あれだけ", "どれだけ", "これだけの", "それだけの", "あれだけの", "どれだけの"],
        description: ""
      },
      {
        id: "secondary_bakari_ka_additive_marker",
        kind: "additive",
        surfaces: ["Nばかりか", "Nばかりでなく", "Nばかりではなく", "Nばかりじゃなく", "Nのみならず"],
        description: ""
      },
      {
        id: "secondary_dokoro_ka_reversal_marker",
        kind: "reversal",
        surfaces: ["Nどころか"],
        description: ""
      },
      {
        id: "secondary_kiri_limit_marker",
        kind: "limit",
        surfaces: ["Nきり", "Nきりの"],
        description: ""
      },
      {
        id: "secondary_degree_marker",
        kind: "degree",
        surfaces: ["Nくらい", "Nぐらい", "Nほど"],
        description: ""
      },
      {
        id: "secondary_yara_indefinite_marker",
        kind: "indefinite",
        surfaces: ["疑問詞やら"],
        description: ""
      },
      {
        id: "secondary_yara_listing_marker",
        kind: "listing",
        surfaces: ["NやらNやら"],
        description: ""
      },
      {
        id: "secondary_kashira_indefinite_marker",
        kind: "indefinite",
        surfaces: ["疑問詞かしら"],
        description: ""
      },
      {
        id: "secondary_nado_example_marker",
        kind: "example",
        surfaces: ["Nなど"],
        description: ""
      },
      {
        id: "secondary_nado_soft_topic_marker",
        kind: "topic",
        surfaces: ["Nなどは"],
        description: ""
      },
      {
        id: "secondary_nado_dismissive_marker",
        kind: "dismissive",
        surfaces: ["Nなど+neg"],
        description: ""
      },
      {
        id: "secondary_nante_quote_marker",
        kind: "quote",
        surfaces: ["Pなんて言う"],
        description: ""
      },
      {
        id: "secondary_nante_dismissive_marker",
        kind: "dismissive",
        surfaces: ["Nなんて"],
        description: ""
      },
      {
        id: "secondary_nanka_dismissive_marker",
        kind: "dismissive",
        surfaces: ["Nなんか", "Nなんかより", "Nなんかも"],
        description: ""
      },
      {
        id: "secondary_nanka_indefinite_marker",
        kind: "indefinite",
        surfaces: ["何か"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: (result) => {
      if (result.kind !== "functional_marker_adapter") {
        return [];
      }
      switch (result.markerKind) {
        case "secondary_bakari_ka_additive":
          return ["secondary_bakari_ka_additive_marker"];
        case "secondary_dokoro_ka_reversal":
          return ["secondary_dokoro_ka_reversal_marker"];
        case "secondary_kosoado_dake_degree":
        case "secondary_kosoado_dake_degree_attr":
          return ["secondary_kosoado_dake_degree_marker"];
        case "secondary_kiri_limit":
        case "secondary_kiri_attributive_limit":
          return ["secondary_kiri_limit_marker"];
        case "secondary_degree":
          return ["secondary_degree_marker"];
        case "secondary_yara_indefinite":
          return ["secondary_yara_indefinite_marker"];
        case "secondary_yara_particle_skip":
        case "secondary_yara_listing":
          return ["secondary_yara_listing_marker"];
        case "secondary_kashira_indefinite":
          return ["secondary_kashira_indefinite_marker"];
        case "secondary_nado_soft_topic":
          return ["secondary_nado_soft_topic_marker"];
        case "secondary_nado_dismissive":
          return ["secondary_nado_dismissive_marker"];
        case "secondary_nado_example":
          return ["secondary_nado_example_marker"];
        case "secondary_nante_quote_contrast":
          return ["secondary_nante_quote_marker"];
        case "secondary_nante_dismissive":
          return ["secondary_nante_dismissive_marker"];
        case "secondary_nanka_comparative_dismissive":
        case "secondary_nanka_additive_dismissive":
        case "secondary_nanka_soft_topic":
          return ["secondary_nanka_dismissive_marker"];
        case "secondary_nanka_split_indefinite":
          return ["secondary_nanka_indefinite_marker"];
        default:
          return [];
      }
    },
    tryBuild: (context) => context.secondaryParticleMarker()
  };
}

function nominalFrameMarkerProfile(): ParticleHeadDispatchProfile {
  return {
    id: "nominal_frame_marker_adapter_entry",
    owner: "assembler",
    continuationCapabilities: collectHeadProfileContinuationCapabilities(describeNominalFrameMarkerAdapterProfiles()),
    requiredContinuationCapabilityIds: (result) => result.kind === "nominal_frame_marker_adapter"
      ? result.built.requiredContinuationCapabilityIds
      : [],
    tryBuild: async (context) => {
      const built = await context.nominalFrameMarker();
      return built === null
        ? null
        : { kind: "nominal_frame_marker_adapter", built };
    }
  };
}

function caseParticleMarkerProfile(): ParticleHeadDispatchProfile {
  return {
    id: "case_particle_marker_adapter",
    owner: "assembler",
    continuationCapabilities: [
      {
        id: "case_no_lexical_preference_marker",
        kind: "case_frame",
        surfaces: ["NのN"],
        description: ""
      },
      {
        id: "case_no_determiner_omit_marker",
        kind: "attributive",
        surfaces: ["連体詞のN"],
        description: ""
      },
      {
        id: "case_no_default_genitive_marker",
        kind: "case_frame",
        surfaces: ["XのN"],
        description: ""
      },
      {
        id: "case_de_orphan_demo_discourse_marker",
        kind: "connective",
        surfaces: ["でも"],
        description: ""
      },
      {
        id: "case_de_default_contextual_marker",
        kind: "case_frame",
        surfaces: ["Nで"],
        description: ""
      },
      {
        id: "case_ni_nari_own_way_marker",
        kind: "case_frame",
        surfaces: ["Nなりに"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: (result) => {
      if (result.kind !== "functional_marker_adapter") {
        return [];
      }
      switch (result.markerKind) {
        case "case_no_lexical_preference":
          return ["case_no_lexical_preference_marker"];
        case "case_no_determiner_omit":
          return ["case_no_determiner_omit_marker"];
        case "case_no_default_genitive":
          return ["case_no_default_genitive_marker"];
        case "case_de_orphan_demo_discourse":
          return ["case_de_orphan_demo_discourse_marker"];
        case "case_de_default_contextual":
          return ["case_de_default_contextual_marker"];
        case "case_ni_nari_own_way":
          return ["case_ni_nari_own_way_marker"];
        default:
          return [];
      }
    },
    tryBuild: (context) => context.caseParticleMarker()
  };
}

let _particleHeadDispatchEngine: ReturnType<typeof defineHeadedParserEngine<ParticleHeadDispatchContext, ParticleHeadBuildPayload>> | undefined;
function getParticleHeadDispatchEngine() {
  _particleHeadDispatchEngine ??= defineHeadedParserEngine({
    id: "particle_head_dispatch",
    profiles: getParticleHeadDispatchProfiles()
  });
  return _particleHeadDispatchEngine;
}

function nominalFrameMarkerAdapterAssembly(
  built: NominalFrameMarkerAdapterBuildResult
): ParticleHeadAssemblyDescriptor {
  return {
    korean: "",
    unitType: UnitType.FUNCTIONAL,
    koreanPos: nominalTailChainKoreanPos(built.plan),
    attachLeft: nominalTailChainAttachLeft(built.plan),
    functionalKind: FunctionalKind.MULTI_TOKEN,
    renderPlan: built.plan
  };
}

export function particleHeadDispatchAppendPayload(
  result: ParticleHeadDispatchMatchedResult
): ParticleHeadAppendPayload {
  const { korean, emit = true, ...assemblyOptions } = result.assembly;
  return {
    consumed: result.kind === "nominal_frame_marker_adapter" ? result.built.consumed : result.consumed,
    korean,
    emit,
    ...(result.kind === "functional_marker_adapter" ? { markerKind: result.markerKind } : {}),
    ...(result.kind === "functional_marker_adapter" ? { headRewrite: result.headRewrite ?? null } : {}),
    ...(result.kind === "nominal_frame_marker_adapter" ? { nominalFrame: result.built } : {}),
    assemblyOptions,
    traceDetail: particleHeadDispatchMatchedTraceDetail(result)
  };
}

export async function tryBuildParticleHeadConsumption(
  options: ParticleHeadDispatchOptions
): Promise<ParticleHeadConsumptionResult> {
  const result = await tryBuildParticleHeadDispatch(options);
  if (result.kind === "none") {
    return {
      kind: "none",
      block: result.block,
      reason: result.reason,
      traceDetail: particleHeadDispatchBlockTraceDetail(result)
    };
  }
  return {
    kind: "append",
    ...particleHeadDispatchAppendPayload(result)
  };
}

export function describeParticleHeadDispatchProfiles(): readonly HeadProfileDescriptor[] {
  return getParticleHeadDispatchEngine().describe();
}

export async function tryBuildParticleHeadDispatch(options: ParticleHeadDispatchOptions): Promise<ParticleHeadDispatchResult> {
  const { cursor } = options;
  const { tokens, pos: index, end: limit } = cursor;
  let nominalFrameCache: NominalFrameMarkerAdapterBuildResult | null | undefined;
  let nominalFrameBlockCache: NominalOwnerArbitrationBlock | null | undefined;
  let caseParticleMarkerCache: ParticleFunctionalMarkerBuildPayload | null | undefined;
  let datteFunctionalMarkerCache: ParticleFunctionalMarkerBuildPayload | null | undefined;
  let toFunctionalMarkerCache: ParticleFunctionalMarkerBuildPayload | null | undefined;
  let toiuFunctionalMarkerCache: ParticleFunctionalMarkerBuildPayload | null | undefined;
  let tteFunctionalMarkerCache: ParticleFunctionalMarkerBuildPayload | null | undefined;
  let tokaFunctionalMarkerCache: ParticleFunctionalMarkerBuildPayload | null | undefined;
  let kaNominalChoiceMarkerCache: ParticleFunctionalMarkerBuildPayload | null | undefined;
  let secondaryParticleMarkerCache: ParticleFunctionalMarkerBuildPayload | null | undefined;
  let orphanConnectiveParticleCache: ParticleFunctionalMarkerBuildPayload | null | undefined;
  const nominalFrameOptions = {
    tokens,
    cursor: cursor.fork(index, limit),
    markerStart: index,
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.layout === undefined ? {} : { layout: options.layout }),
    ...(options.allomorphHint === undefined
      ? {}
      : { allomorphHint: options.allomorphHint }),
    allomorphHintSource: "assembler_previous_unit" as const,
    committedParticleAssignment: options.committedParticleAssignment ?? null,
    ...(options.followingPredicate === undefined ? {} : { followingPredicate: options.followingPredicate })
  };
  const context: ParticleHeadDispatchContext = {
    nominalFrameMarker: async () => {
      nominalFrameCache ??= await tryBuildNominalFrameMarkerAdapterPlan(nominalFrameOptions);
      return nominalFrameCache;
    },
    caseParticleMarker: () => {
      caseParticleMarkerCache ??= tryBuildCaseParticleMarker({
        cursor: options.cursor,
        precedingTokenKoreanPos: options.precedingTokenKoreanPos ?? null,
        precedingCasePreference: options.precedingCasePreference ?? null,
        precedingPrenominalPredicate: options.precedingPrenominalPredicate ?? false,
        committedParticleAssignment: options.committedParticleAssignment ?? null,
        lookups: options.lookups
      });
      return caseParticleMarkerCache;
    },
    datteFunctionalMarker: () => {
      datteFunctionalMarkerCache ??= tryBuildDatteFunctionalMarker(options.cursor, options.lookups);
      return datteFunctionalMarkerCache;
    },
    toFunctionalMarker: () => {
      toFunctionalMarkerCache ??= tryBuildToFunctionalMarker(
        options.cursor,
        options.followingPredicate?.tokenIndex ?? null,
        options.lookups
      );
      return toFunctionalMarkerCache;
    },
    toiuFunctionalMarker: () => {
      toiuFunctionalMarkerCache ??= tryBuildToiuFunctionalMarker(options.cursor);
      return toiuFunctionalMarkerCache;
    },
    tteFunctionalMarker: () => {
      tteFunctionalMarkerCache ??= tryBuildTteFunctionalMarker(options.cursor, options.lookups);
      return tteFunctionalMarkerCache;
    },
    tokaFunctionalMarker: () => {
      tokaFunctionalMarkerCache ??= tryBuildTokaFunctionalMarker(
        options.cursor,
        projectionContextBoundsForToken({
          tokens,
          tokenIdx: index,
          fallbackLowerBound: 0,
          fallbackUpperBound: limit,
          ...(options.layout === undefined ? {} : { layout: options.layout })
        }),
        options.lookups
      );
      return tokaFunctionalMarkerCache;
    },
    kaNominalChoiceMarker: () => {
      kaNominalChoiceMarkerCache ??= tryBuildKaNominalChoiceMarker(
        options.cursor,
        options.lookups,
        options.precedingTokenKoreanPos ?? null
      );
      return kaNominalChoiceMarkerCache;
    },
    secondaryParticleMarker: () => {
      secondaryParticleMarkerCache ??= tryBuildSecondaryParticleMarker(
        options.cursor,
        projectionContextBoundsForToken({
          tokens,
          tokenIdx: index,
          fallbackLowerBound: 0,
          fallbackUpperBound: limit,
          ...(options.layout === undefined ? {} : { layout: options.layout })
        }),
        options.allomorphHint ?? "",
        options.lookups
      );
      return secondaryParticleMarkerCache;
    },
    orphanConnectiveParticle: () => {
      orphanConnectiveParticleCache ??= tryBuildOrphanConnectiveParticle(options.cursor);
      return orphanConnectiveParticleCache;
    }
  };
  const decision = applyParticleHeadSourceSpanPrecedence(await getParticleHeadDispatchEngine().arbitrate(context));
  const selection = headProfileDispatchSelection(decision);
  if (selection === null) {
    nominalFrameBlockCache ??= explainNominalFrameMarkerAdapterBlock(nominalFrameOptions)?.block ?? null;
    return {
      kind: "none",
      block: nominalFrameBlockCache,
      reason: nominalFrameBlockCache?.reason ?? "particle head dispatch profile not matched",
      dispatchDecision: decision
    };
  }
  return {
    ...selection.match.result,
    ...selection.metadata,
    assembly: selection.match.result.kind === "nominal_frame_marker_adapter"
      ? nominalFrameMarkerAdapterAssembly(selection.match.result.built)
      : selection.match.result.assembly
  };
}

function applyParticleHeadSourceSpanPrecedence(
  decision: HeadProfileArbitrationDecision<ParticleHeadBuildPayload>
): HeadProfileArbitrationDecision<ParticleHeadBuildPayload> {
  const winner = decision.winner;
  if (winner === null) {
    return decision;
  }
  const winnerConsumed = particleHeadBuildPayloadConsumed(winner.result);
  const longerNominal = decision.candidates
    .map((candidate, declarationIndex) => ({ candidate, declarationIndex }))
    .filter((candidate) =>
      candidate.candidate.result.kind === "nominal_frame_marker_adapter" &&
      particleHeadBuildPayloadConsumed(candidate.candidate.result) > winnerConsumed
    )
    .sort((left, right) => {
      const consumedDelta =
        particleHeadBuildPayloadConsumed(right.candidate.result) -
        particleHeadBuildPayloadConsumed(left.candidate.result);
      return consumedDelta !== 0 ? consumedDelta : left.declarationIndex - right.declarationIndex;
    })[0]?.candidate;
  if (longerNominal === undefined) {
    return decision;
  }
  const selectedConsumed = particleHeadBuildPayloadConsumed(longerNominal.result);
  return {
    ...decision,
    strategy: "source_span_precedence",
    winner: longerNominal,
    tiedWinners: [longerNominal],
    hasArbitrationTie: false,
    reason: `selected '${longerNominal.profile.id}' because its source span (${selectedConsumed} tokens) subsumes shorter prefix marker '${winner.profile.id}' (${winnerConsumed} tokens)`
  };
}

function particleHeadBuildPayloadConsumed(payload: ParticleHeadBuildPayload): number {
  return payload.kind === "nominal_frame_marker_adapter" ? payload.built.consumed : payload.consumed;
}

function tryBuildCaseParticleMarker(options: {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly precedingTokenKoreanPos: number | null;
  readonly precedingCasePreference: ParticleHeadCasePreference | null;
  readonly precedingPrenominalPredicate: boolean;
  readonly committedParticleAssignment: NominalFrameCommittedParticleAssignment | null;
  readonly lookups: LookupTables;
}): ParticleFunctionalMarkerBuildPayload | null {
  if (options.committedParticleAssignment !== null) {
    return null;
  }
  const marker = options.cursor.current();
  const relation = caseParticleMarkerRelationForToken(marker, options.cursor.pos, {
    acceptedSurfaces: ["の", "で", "に"],
    consumers: ["particle_head_dispatch"]
  });
  if (relation === null) {
    return null;
  }
  if (relation.caseSurface === "の") {
    return tryBuildNoCaseParticleMarker(options, options.lookups);
  }
  if (relation.caseSurface === "で") {
    return tryBuildDeCaseParticleMarker(options.cursor, options.lookups);
  }
  if (relation.caseSurface === "に") {
    return tryBuildNiNariOwnWayMarker(options.cursor);
  }
  return null;
}

function tryBuildNiNariOwnWayMarker(
  cursor: TokenCursor<RuntimeHaruToken>
): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index } = cursor;
  const previous = index > 0 ? tokens[index - 1] : undefined;
  if (
    previous === undefined ||
    (previous.pos & POS01) !== 接尾辞_名詞的 ||
    (previous.dictionaryForm || previous.surface) !== "なり"
  ) {
    return null;
  }
  const host = index > 1 ? tokens[index - 2] : undefined;
  if (
    host !== undefined &&
    (host.pos & POS0) === 代名詞 &&
    ["何", "なん", "なに"].includes(host.surface)
  ) {
    return null;
  }
  return {
    kind: "functional_marker_adapter",
    markerKind: "case_ni_nari_own_way",
    consumed: 1,
    assembly: {
      korean: "대로",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.PARTICLE
    }
  };
}

function tryBuildNoCaseParticleMarker(options: {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly precedingTokenKoreanPos: number | null;
  readonly precedingCasePreference: ParticleHeadCasePreference | null;
  readonly precedingPrenominalPredicate: boolean;
}, lookups: LookupTables): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index, end: limit } = options.cursor;
  const previous = index > 0 ? tokens[index - 1] : undefined;
  const next = index + 1 < limit ? tokens[index + 1] : undefined;
  if (previous === undefined) {
    return null;
  }
  if (next === undefined || !isNominalFollower(next)) {
    return options.precedingTokenKoreanPos === 관형사 ? noDeterminerOmitPayload() : null;
  }
  const preference = options.precedingCasePreference;
  if (preference !== null) {
    const korean = preference.korean ?? "";
    const allomorphKey = preference.allomorphKey ?? null;
    return {
      kind: "functional_marker_adapter",
      markerKind: "case_no_lexical_preference",
      consumed: 1,
      assembly: {
        korean,
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL,
        allomorphKey,
        emit: korean.length > 0 || allomorphKey !== null
      }
    };
  }
  if (options.precedingTokenKoreanPos === 관형사) {
    return noDeterminerOmitPayload();
  }
  if (!isSafeDefaultNoGenitiveHead(previous, options.precedingPrenominalPredicate)) {
    return null;
  }
  if (isNoGenitiveModifier(previous, lookups) && !isIdentityGenitiveHead(next, lookups)) {
    return noGenitiveSuppressionPayload();
  }
  return {
    kind: "functional_marker_adapter",
    markerKind: "case_no_default_genitive",
    consumed: 1,
    assembly: {
      korean: "",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.CONTEXTUAL,
      allomorphKey: "의"
    }
  };
}

function tryBuildDeCaseParticleMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index, end: limit } = cursor;
  const previous = index > 0 ? tokens[index - 1] : undefined;
  const next = index + 1 < limit ? tokens[index + 1] : undefined;
  const previousNonSpaceIdx = previousNonSpaceIndex(tokens, index, 0);
  const previousNonSpace = previousNonSpaceIdx === null ? undefined : tokens[previousNonSpaceIdx];
  if (
    next?.surface === "も" &&
    (next.pos & POS0) === 助詞 &&
    isTrailingPunctuationToken(previousNonSpace)
  ) {
    return {
      kind: "functional_marker_adapter",
      markerKind: "case_de_orphan_demo_discourse",
      consumed: 2,
      assembly: {
        korean: "하지만",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 접속사,
        functionalKind: FunctionalKind.MULTI_TOKEN,
        attachLeft: false
      }
    };
  }
  if (previous !== undefined && previous.pos !== 0 && isAdverbCapableNominal(previous)) {
    return null;
  }
  if (
    previousNonSpace !== undefined &&
    previousNonSpace.surface === "か" &&
    (previousNonSpace.pos & POS1) === 副助詞 &&
    previousNonSpaceIdx !== null
  ) {
    const hostIdx = previousNonSpaceIndex(tokens, previousNonSpaceIdx, 0);
    const host = hostIdx === null ? undefined : tokens[hostIdx];
    if (host !== undefined && isPlaceScopeNoun(host, lookups)) {
      return null;
    }
  }
  return {
    kind: "functional_marker_adapter",
    markerKind: "case_de_default_contextual",
    consumed: 1,
    assembly: {
      korean: "",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.CONTEXTUAL,
      allomorphKey: "으로/로"
    }
  };
}

function isNominalFollower(token: RuntimeHaruToken): boolean {
  return pos0in(token.pos, NOMINAL_BITS);
}

function noDeterminerOmitPayload(): ParticleFunctionalMarkerBuildPayload {
  return {
    kind: "functional_marker_adapter",
    markerKind: "case_no_determiner_omit",
    consumed: 1,
    assembly: {
      korean: "",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.CONTEXTUAL,
      emit: false
    }
  };
}

function isSafeDefaultNoGenitiveHead(token: RuntimeHaruToken, precedingPrenominalPredicate: boolean): boolean {
  const pos0 = token.pos & POS0;
  if (isNaAdjCapable(token)) {
    return false;
  }
  if (pos0in(pos0, INFLECTABLE_BITS)) {
    return false;
  }
  return !precedingPrenominalPredicate;
}

function isIdentityGenitiveHead(token: RuntimeHaruToken, lookups: LookupTables): boolean {
  return lookups.NO_IDENTITY_GENITIVE_HEADS.has(token.dictionaryForm) || lookups.NO_IDENTITY_GENITIVE_HEADS.has(token.surface);
}

function isNoGenitiveModifier(token: RuntimeHaruToken, lookups: LookupTables): boolean {
  if (lookups.TEMPORAL_NOUNS.has(token.dictionaryForm)) {
    return true;
  }
  if (lookups.TEMPORAL_SUFFIX_NOUNS.has(token.dictionaryForm)) {
    return true;
  }
  if ((token.pos & POS012) === 名詞_固有名詞_地名) {
    return true;
  }
  return lookups.NO_GENITIVE_MODIFIERS.has(token.dictionaryForm);
}

function noGenitiveSuppressionPayload(): ParticleFunctionalMarkerBuildPayload {
  return {
    kind: "functional_marker_adapter",
    markerKind: "case_no_genitive_suppressed",
    consumed: 1,
    assembly: {
      korean: "",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.CONTEXTUAL,
      emit: false
    }
  };
}

function tryBuildDatteFunctionalMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index } = cursor;
  const marker = tokens[index];
  if (marker === undefined || marker.surface !== "だって" || (marker.pos & POS0) !== 助詞) {
    return null;
  }
  const role = classifyDatteMarkerAt(cursor, lookups).role;
  if (role === "causal_discourse") {
    return {
      kind: "functional_marker_adapter",
      markerKind: "datte_causal_discourse",
      consumed: 1,
      assembly: {
        korean: "왜냐하면",
        unitType: UnitType.CONTENT,
        koreanPos: 접속사,
        attachLeft: false
      }
    };
  }
  if (role === "focus_particle") {
    return {
      kind: "functional_marker_adapter",
      markerKind: "datte_focus_particle",
      consumed: 1,
      assembly: {
        korean: "도",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.PARTICLE
      }
    };
  }
  return null;
}

function tryBuildToFunctionalMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  followingPredicateIdx: number | null,
  lookups: LookupTables
): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index, end: limit } = cursor;
  const marker = tokens[index];
  if (caseParticleMarkerRelationForToken(marker, index, {
    acceptedSurfaces: ["と"],
    consumers: ["particle_head_dispatch"]
  }) === null) {
    return null;
  }
  const previous = index > 0 ? tokens[index - 1] : undefined;
  if (((previous?.pos ?? 0) & POS0) === 副詞) {
    return {
      kind: "functional_marker_adapter",
      markerKind: "to_adverbial",
      consumed: 1,
      assembly: {
        korean: "",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL
      }
    };
  }
  const next = index + 1 < limit ? tokens[index + 1] : undefined;
  if (tariKeijoujiAdverbialToEvidence(cursor, {
    followingPredicateIdx,
    followingPredicateIdxIsProjectionEvidence: true,
    lookups
  }) !== null) {
    return {
      kind: "functional_marker_adapter",
      markerKind: "to_adverbial",
      consumed: 1,
      assembly: {
        korean: "",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL
      }
    };
  }
  if (next === undefined || (next.pos & POS0) !== 動詞 || isQuotationContext(cursor, lookups)) {
    return null;
  }
  if (next.dictionaryForm === "なる") {
    return {
      kind: "functional_marker_adapter",
      markerKind: "to_naru_result",
      consumed: 1,
      assembly: {
        korean: "",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL,
        allomorphKey: "이/가"
      }
    };
  }
  if (next.dictionaryForm === "する") {
    return {
      kind: "functional_marker_adapter",
      markerKind: "to_suru_transform",
      consumed: 1,
      assembly: {
        korean: "",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL,
        allomorphKey: "으로/로"
      }
    };
  }
  return null;
}

function tryBuildOrphanConnectiveParticle(cursor: TokenCursor<RuntimeHaruToken>): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index, end: limit } = cursor;
  const marker = tokens[index];
  if (marker === undefined || (marker.pos & POS0) !== 助詞) {
    return null;
  }
  if (isKeredoMoTailParticle(tokens, index)) {
    return {
      kind: "functional_marker_adapter",
      markerKind: "orphan_connective_tail_particle_skip",
      consumed: 1,
      assembly: {
        korean: "",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: false,
        emit: false
      }
    };
  }
  const korean = orphanConnectiveParticleKorean(marker);
  if (korean === undefined) {
    return null;
  }
  const consumed = index + 1 < limit && isKeredoMoTailParticle(tokens, index + 1) ? 2 : 1;
  return {
    kind: "functional_marker_adapter",
    markerKind: "orphan_connective_particle",
    consumed,
    assembly: {
      korean,
      unitType: UnitType.CONTENT,
      koreanPos: 접속사,
      attachLeft: false
    }
  };
}

function isSecondaryFocusParticle(token: RuntimeHaruToken | undefined, surface: string): boolean {
  return isSecondaryParticle(token, surface);
}

function isCopulaDaRenyouToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_);
}

function isWaParticle(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    token.surface === "は" &&
    (token.pos & POS0) === 助詞;
}

function isLinkingRenyouNegativeToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos4 = token.pos & POS4;
  const isNegative =
    pos4 === 助動詞_ナイ ||
    pos4 === 助動詞_ヌ ||
    (
      (token.pos & POS01) === (形容詞0 | 非自立可能) &&
      (token.dictionaryForm === "ない" || token.dictionaryForm === "無い")
    );
  const inflection5 = token.pos & POS5;
  return isNegative && (inflection5 & POS5A) === 連用形_ && inflection5 !== 連用形_促音便;
}

function matchSecondaryAdditiveFocusMarker(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const { tokens, pos: index, end: limit } = cursor;
  const marker = tokens[index];
  let consumed: number | null = null;
  if (isSecondaryFocusParticle(marker, "ばかり")) {
    if (index + 1 < limit && kaMarkerRelationAt(tokens, index + 1, ["particle_head_dispatch"])?.particleSubtype1 === 副助詞) {
      consumed = 2;
    } else {
      const bridge = tokens[index + 1];
      if (bridge?.surface === "じゃ" && isCopulaDaRenyouToken(bridge) && index + 2 < limit && isLinkingRenyouNegativeToken(tokens[index + 2])) {
        consumed = 3;
      } else if (bridge?.surface === "で" && isCopulaDaRenyouToken(bridge)) {
        if (index + 3 < limit && isWaParticle(tokens[index + 2]) && isLinkingRenyouNegativeToken(tokens[index + 3])) {
          consumed = 4;
        } else if (index + 2 < limit && isLinkingRenyouNegativeToken(tokens[index + 2])) {
          consumed = 3;
        }
      }
    }
  } else if (
    isSecondaryFocusParticle(marker, "のみ") &&
    index + 2 < limit &&
    isClassicalNariMizenNaraToken(tokens[index + 1]) &&
    isClassicalNuRenyouZuToken(tokens[index + 2])
  ) {
    consumed = 3;
  }
  if (consumed === null) {
    return false;
  }
  cursor.advance(consumed);
  return true;
}

function tryBuildSecondaryParticleMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  bounds: ProjectionContextBounds,
  precedingAllomorphText: string,
  lookups: LookupTables
): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index, end: limit } = cursor;
  const marker = tokens[index];
  const surface = secondaryParticleCanonical(marker);
  if (marker === undefined || surface === null) {
    return null;
  }
  const next = index + 1 < limit ? tokens[index + 1] : undefined;
  const additiveFocusConsumed = cursor.lookahead(0, (probe) =>
    matchSecondaryAdditiveFocusMarker(probe) ? probe.pos - index : null
  );
  if (additiveFocusConsumed !== null) {
    return {
      kind: "functional_marker_adapter",
      markerKind: "secondary_bakari_ka_additive",
      consumed: additiveFocusConsumed,
      assembly: {
        korean: "뿐만 아니라",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: false
      }
    };
  }
  if (surface === "だけ") {
    return tryBuildDakeSecondaryMarker(cursor, lookups);
  }
  if (surface === "どころ" && kaMarkerRelationAt(tokens, index + 1, ["particle_head_dispatch"])?.particleSubtype1 === 副助詞) {
    return {
      kind: "functional_marker_adapter",
      markerKind: "secondary_dokoro_ka_reversal",
      consumed: 2,
      assembly: {
        korean: "",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.MULTI_TOKEN,
        allomorphKey: "은/는커녕"
      }
    };
  }
  if (surface === "きり") {
    if (nominalLinkMarkerRelationAt(tokens, index + 1, { consumers: ["particle_head_dispatch"] }) !== null) {
      return {
        kind: "functional_marker_adapter",
        markerKind: "secondary_kiri_attributive_limit",
        consumed: 2,
        assembly: {
          korean: "뿐인",
          unitType: UnitType.FUNCTIONAL,
          koreanPos: 조사,
          attachLeft: true
        }
      };
    }
    return {
      kind: "functional_marker_adapter",
      markerKind: "secondary_kiri_limit",
      consumed: 1,
      assembly: {
        korean: "뿐",
        copulaBase: "뿐",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true
      }
    };
  }
  if (surface === "ずつ") {
    return {
      kind: "functional_marker_adapter",
      markerKind: "secondary_distributive",
      consumed: 1,
      assembly: {
        korean: "씩",
        copulaBase: "씩",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true
      }
    };
  }
  if (surface === "くらい" || surface === "ほど") {
    return {
      kind: "functional_marker_adapter",
      markerKind: "secondary_degree",
      consumed: 1,
      assembly: {
        korean: "정도",
        copulaBase: "정도",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: false
      }
    };
  }
  if (surface === "かしら") {
    const previous = index > 0 ? tokens[index - 1] : undefined;
    if (previous !== undefined && (previous.pos & POS0) === 代名詞) {
      const indefinite = yaraIndefiniteKorean(previous.dictionaryForm);
      if (indefinite !== undefined) {
        return {
          kind: "functional_marker_adapter",
          markerKind: "secondary_kashira_indefinite",
          consumed: 1,
          headRewrite: {
            target: "previous_content",
            renderPlan: { kind: "fixedText", text: indefinite, koreanPos: 대명사 },
            rule: "kashira_indef"
          },
          assembly: {
            korean: "",
            unitType: UnitType.FUNCTIONAL,
            koreanPos: 조사,
            attachLeft: false,
            emit: false
          }
        };
      }
    }
  }
  if (surface === "やら") {
    const previous = index > 0 ? tokens[index - 1] : undefined;
    if (previous !== undefined && (previous.pos & POS0) === 代名詞) {
      const indefinite = yaraIndefiniteKorean(previous.dictionaryForm);
      if (indefinite !== undefined) {
        return {
          kind: "functional_marker_adapter",
          markerKind: "secondary_yara_indefinite",
          consumed: 1,
          headRewrite: {
            target: "previous_content",
            renderPlan: { kind: "fixedText", text: indefinite, koreanPos: 대명사 },
            rule: "yara_indef"
          },
          assembly: {
            korean: "",
            unitType: UnitType.FUNCTIONAL,
            koreanPos: 조사,
            attachLeft: false,
            emit: false
          }
        };
      }
    }
    if (((previous?.pos ?? 0) & POS0) === 助詞) {
      return {
        kind: "functional_marker_adapter",
        markerKind: "secondary_yara_particle_skip",
        consumed: 1,
        assembly: {
          korean: "",
          unitType: UnitType.FUNCTIONAL,
          koreanPos: 조사,
          attachLeft: false,
          emit: false
        }
      };
    }
    return {
      kind: "functional_marker_adapter",
      markerKind: "secondary_yara_listing",
      consumed: 1,
      assembly: {
        korean: "",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.PARTICLE,
        allomorphKey: "이니/니"
      }
    };
  }
  if (surface === "など") {
    if (next?.surface === "は" && (next.pos & POS0) === 助詞) {
      return {
        kind: "functional_marker_adapter",
        markerKind: "secondary_nado_soft_topic",
        consumed: 2,
        assembly: {
          korean: "같은 건",
          unitType: UnitType.FUNCTIONAL,
          koreanPos: 조사,
          attachLeft: false
        }
      };
    }
    const upperBound = Math.min(limit, bounds.upperBound ?? limit);
    const dismissive = hasNadoNegativeFollower(tokens, index, upperBound);
    return {
      kind: "functional_marker_adapter",
      markerKind: dismissive ? "secondary_nado_dismissive" : "secondary_nado_example",
      consumed: 1,
      assembly: {
        korean: dismissive ? "따위" : "등",
        copulaBase: dismissive ? "따위" : "등",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: false
      }
    };
  }
  if (surface === "なんて") {
    const isQuotative = isNanteQuotativeMarker(cursor, lookups);
    return {
      kind: "functional_marker_adapter",
      markerKind: isQuotative ? "secondary_nante_quote_contrast" : "secondary_nante_dismissive",
      consumed: 1,
      assembly: {
        korean: isQuotative ? (precedingAllomorphText.endsWith("다") ? "고는" : "") : "따위",
        ...(isQuotative && !precedingAllomorphText.endsWith("다") ? { allomorphKey: "이라고는/라고는" } : {}),
        ...(isQuotative ? {} : { copulaBase: "따위" }),
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: isQuotative
      }
    };
  }
  if (surface === "なんか") {
    const nextSurface = next?.surface ?? "";
    const markerKind = nextSurface === "より"
      ? "secondary_nanka_comparative_dismissive"
      : nextSurface === "も"
        ? "secondary_nanka_additive_dismissive"
        : "secondary_nanka_soft_topic";
    return {
      kind: "functional_marker_adapter",
      markerKind,
      consumed: nextSurface === "より" || nextSurface === "も" ? 2 : 1,
      assembly: {
        korean: nextSurface === "より" ? "따위보다" : nextSurface === "も" ? "따위도" : "같은 건",
        ...(nextSurface === "より" || nextSurface === "も" ? {} : { copulaBase: "같은 것" }),
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: false
      }
    };
  }
  if (
    kaMarkerRelationAt(tokens, index, ["particle_head_dispatch"]) !== null &&
    index > 0 &&
    (tokens[index - 1]?.surface === "なん" || tokens[index - 1]?.surface === "何") &&
    ((tokens[index - 1]?.pos ?? 0) & POS0) === 代名詞
  ) {
    return {
      kind: "functional_marker_adapter",
      markerKind: "secondary_nanka_split_indefinite",
      consumed: 1,
      headRewrite: {
        target: "previous_content",
        renderPlan: { kind: "fixedText", text: "뭔가", koreanPos: 대명사 },
        rule: "nanka_split"
      },
      assembly: {
        korean: "",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: false,
        emit: false
      }
    };
  }
  return null;
}

function tryBuildDakeSecondaryMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index, end: limit } = cursor;
  const previous = index > 0 ? tokens[index - 1] : undefined;
  const next = index + 1 < limit ? tokens[index + 1] : undefined;
  const previousSurface = previous?.surface ?? "";
  const nextSurface = next?.surface ?? "";
  if (nextSurface === "は" || nextSurface === "も") {
    return null;
  }
  if (nextSurface === "の") {
    const replacement = lookups.SECONDARY_PARTICLE_KOSOADO_DAKE_DEGREE_ATTR.get(previousSurface);
    if (replacement !== undefined) {
      return {
        kind: "functional_marker_adapter",
        markerKind: "secondary_kosoado_dake_degree_attr",
        consumed: 2,
        headRewrite: {
          target: "previous_content",
          renderPlan: { kind: "fixedText", text: replacement, koreanPos: 관형사 },
          rule: "kosoado_dake_degree_attr"
        },
        assembly: {
          korean: "",
          unitType: UnitType.FUNCTIONAL,
          koreanPos: 조사,
          attachLeft: false,
          emit: false
        }
      };
    }
  }
  const replacement = lookups.SECONDARY_PARTICLE_KOSOADO_DAKE_DEGREE.get(previousSurface);
  if (replacement === undefined) {
    return null;
  }
  return {
    kind: "functional_marker_adapter",
    markerKind: "secondary_kosoado_dake_degree",
    consumed: 1,
    headRewrite: {
      target: "previous_content",
      renderPlan: { kind: "fixedText", text: replacement, koreanPos: 부사 },
      rule: "kosoado_dake_degree"
    },
    assembly: {
      korean: "",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: false,
      emit: false
    }
  };
}

function tryBuildTteFunctionalMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index } = cursor;
  const marker = tokens[index];
  const quoteMarker = quoteMarkerRelationAt(tokens, index, { consumers: ["particle_head_dispatch"] });
  if (marker === undefined || quoteMarker?.canonicalSurface !== "って" || (marker.pos & POS01) !== 助詞_副助詞) {
    return null;
  }
  const allomorphKey = resolveTteParticleAllomorphKey(cursor, lookups);
  const markerKind = allomorphKey === "이라고/라고"
    ? "tte_quote"
    : allomorphKey === "이라는/라는"
      ? "tte_attributive"
      : "tte_topic";
  return {
    kind: "functional_marker_adapter",
    markerKind,
    consumed: 1,
    assembly: {
      korean: "",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.PARTICLE,
      allomorphKey
    }
  };
}

function isJuntaiNounPhraseTokaHost(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const { tokens, pos: index } = cursor;
  if (index <= 0) {
    return false;
  }
  if (predicateNominalizerRelationForToken(tokens[index - 1], index - 1, {
    requirement: "tail_connective_marker",
    consumers: ["particle_head_dispatch"]
  })?.nominalizerKind !== "no") {
    return false;
  }
  if (isQuotationContext(cursor, lookups)) {
    return false;
  }
  return plainNominalizerFollowerVerdictAt(tokens, index, lookups, ["particle_head_dispatch"]) === "particle_follower";
}

export function tokaFunctionalMarkerHostAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly admitJuntaiNounPhrase: boolean }
): boolean {
  const { tokens, pos: index } = cursor;
  if (!isTokaPairAt(cursor)) {
    return false;
  }
  const previous = index > 0 ? tokens[index - 1] : undefined;
  if (previous === undefined) {
    return false;
  }
  if ((previous.pos & POS0) === 名詞 || (previous.pos & POS0) === 代名詞) {
    return true;
  }
  return options.admitJuntaiNounPhrase && isJuntaiNounPhraseTokaHost(cursor, lookups);
}

function tryBuildKaNominalChoiceMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  hostKoreanPos: number | null
): ParticleFunctionalMarkerBuildPayload | null {
  if (!singleMarkerNominalChoiceKaAt(cursor.tokens, cursor.pos, lookups, hostKoreanPos)) {
    return null;
  }
  return {
    kind: "functional_marker_adapter",
    markerKind: "ka_nominal_choice",
    consumed: 1,
    assembly: {
      korean: "",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.MULTI_TOKEN,
      allomorphKey: "이나/나"
    }
  };
}

function tryBuildTokaFunctionalMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  bounds: { readonly lowerBound: number; readonly upperBound: number | undefined },
  lookups: LookupTables
): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index, end: limit } = cursor;
  if (!isTokaPairAt(cursor)) {
    return null;
  }
  const previous = index > 0 ? tokens[index - 1] : undefined;
  if (previous === undefined) {
    return null;
  }
  if (!tokaFunctionalMarkerHostAt(cursor, lookups, { admitJuntaiNounPhrase: true })) {
    if ((previous.pos & POS0) === 助詞 && kaMarkerRelationAt(tokens, index - 1, ["particle_head_dispatch"]) !== null) {
      return buildTokaExemplifierPayload();
    }
    return null;
  }
  const upperBound = Math.min(bounds.upperBound ?? limit, limit);
  const lowerBound = Math.max(0, bounds.lowerBound);
  const hasOtherToka = hasTokaPairInRange(cursor, lowerBound, upperBound, index);
  if (!hasOtherToka) {
    const followerIdx = nextNonSpaceIndex(tokens, index + 2, limit);
    const follower = followerIdx === null || followerIdx === undefined ? undefined : tokens[followerIdx];
    if (follower !== undefined && isNominalLike(follower)) {
      return {
        kind: "functional_marker_adapter",
        markerKind: "toka_listing_middle",
        consumed: 2,
        assembly: {
          korean: "",
          unitType: UnitType.FUNCTIONAL,
          koreanPos: 조사,
          attachLeft: true,
          functionalKind: FunctionalKind.MULTI_TOKEN,
          allomorphKey: "이나/나"
        }
      };
    }
    if (follower !== undefined && (follower.pos & POS01) === 助詞_格助詞) {
      return buildTokaExemplifierPayload();
    }
    return {
      kind: "functional_marker_adapter",
      markerKind: "toka_single_example",
      consumed: 2,
      assembly: {
        korean: "같은 걸",
        copulaBase: "같은 것",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: false
      }
    };
  }
  const hasTokaAfter = hasTokaPairInRange(cursor, index + 2, upperBound, index);
  if (hasTokaAfter) {
    return {
      kind: "functional_marker_adapter",
      markerKind: "toka_listing_middle",
      consumed: 2,
      assembly: {
        korean: "",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.MULTI_TOKEN,
        allomorphKey: "이나/나"
      }
    };
  }
  return {
    kind: "functional_marker_adapter",
    markerKind: "toka_listing_final",
    consumed: 2,
    assembly: {
      korean: "등",
      copulaBase: "등",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: false
    }
  };
}

function hasTokaPairInRange(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  endExclusive: number,
  excludeIndex: number
): boolean {
  for (let scan = start; scan < endExclusive - 1; scan += 1) {
    if (scan === excludeIndex) {
      continue;
    }
    if (isDiscontinuousListingClosureAt(cursor, scan)) {
      continue;
    }
    if (isTokaPairAt(cursor.fork(scan, endExclusive))) {
      return true;
    }
  }
  return false;
}

function isDiscontinuousListingClosureAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number
): boolean {
  const markerIdx = previousNonSpaceIndex(cursor.tokens, index);
  if (markerIdx === null) {
    return false;
  }
  for (const match of relationConnectiveSpansAt(cursor.fork(markerIdx, cursor.end, markerIdx))) {
    if (match.markerPolicy !== "discontinuous") {
      continue;
    }
    const closure = relationDiscontinuousClosureSpanAfter(
      cursor.fork(match.endExclusive, cursor.end, match.endExclusive),
      match
    );
    if (closure !== null && closure.start === index) {
      return true;
    }
  }
  return false;
}

function buildTokaExemplifierPayload(): ParticleFunctionalMarkerBuildPayload {
  return {
    kind: "functional_marker_adapter",
    markerKind: "toka_exemplifier",
    consumed: 2,
    assembly: {
      korean: "",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.PARTICLE,
      allomorphKey: "이라든가/라든가"
    }
  };
}

function isTokaPairAt(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const { tokens, pos: index, end: limit } = cursor;
  const to = tokens[index];
  const ka = index + 1 < limit ? tokens[index + 1] : undefined;
  return to !== undefined && ka !== undefined && quoteMarkerRelationAt(tokens, index, { consumers: ["particle_head_dispatch"] })?.canonicalSurface === "と" && (to.pos & POS01) === 助詞_格助詞 && kaMarkerRelationAt(tokens, index + 1, ["particle_head_dispatch"])?.particleSubtype1 === 副助詞;
}

function tryBuildToiuFunctionalMarker(cursor: TokenCursor<RuntimeHaruToken>): ParticleFunctionalMarkerBuildPayload | null {
  const { tokens, pos: index, end: limit } = cursor;
  const marker = tokens[index];
  if (marker === undefined || (marker.pos & POS0) !== 助詞) {
    return null;
  }
  if (
    !(
      (quoteMarkerRelationAt(tokens, index, { consumers: ["particle_head_dispatch"] })?.canonicalSurface === "と" && (marker.pos & POS1) === 格助詞) ||
      (quoteMarkerRelationAt(tokens, index, { consumers: ["particle_head_dispatch"] })?.canonicalSurface === "って" && (marker.pos & POS1) === 副助詞)
    )
  ) {
    return null;
  }
  const iuIdx = nextNonSpaceIndex(tokens, index + 1, limit) ?? limit;
  const iu = tokens[iuIdx];
  if (
    iu === undefined ||
    iuIdx >= limit ||
    (iu.pos & POS0) !== 動詞 ||
    !IU_LEXEME_FORMS.has(iu.dictionaryForm ?? "")
  ) {
    return null;
  }
  const afterIuIdx = nextNonSpaceIndex(tokens, iuIdx + 1, limit) ?? limit;
  const afterIu = tokens[afterIuIdx];
  if (afterIu !== undefined && afterIuIdx < limit && caseParticleMarkerRelationForToken(afterIu, afterIuIdx, {
    acceptedSurfaces: ["より"],
    consumers: ["particle_head_dispatch"]
  }) !== null) {
    return {
      kind: "functional_marker_adapter",
      markerKind: "toiu_comparative",
      consumed: afterIuIdx - index + 1,
      assembly: {
        korean: "",
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.MULTI_TOKEN,
        allomorphKey: "이라기보다/라기보다"
      }
    };
  }
  if (isToiuYouContinuation(cursor.fork(afterIuIdx))) {
    return null;
  }
  if (!toiuIuStandsAsAttributiveCarrier(tokens, iuIdx)) {
    return null;
  }
  return {
    kind: "functional_marker_adapter",
    markerKind: "toiu_attributive",
    consumed: iuIdx - index + 1,
    assembly: {
      korean: "",
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.MULTI_TOKEN,
      allomorphKey: "이라는/라는"
    }
  };
}

function isToiuYouContinuation(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const { tokens, pos: index, end: limit } = cursor;
  const you = tokens[index];
  if (you === undefined || index >= limit || you.surface !== "よう" || (you.pos & POS0) !== 形状詞) {
    return false;
  }
  const terminalIdx = nextNonSpaceIndex(tokens, index + 1, limit) ?? limit;
  const terminal = tokens[terminalIdx];
  return terminal !== undefined && terminalIdx < limit && (terminal.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ);
}

export function particleHeadDispatchBlockTraceDetail(
  result: ParticleHeadDispatchNoneResult
): { readonly [key: string]: TraceDetailValue } {
  return {
    ...(result.block === null
      ? {}
      : {
        block_kind: result.block.kind,
        block_reason: result.block.reason
      }),
    ...headProfileArbitrationTraceDetail({
      decision: result.dispatchDecision,
      profile: null
    })
  };
}

function particleHeadDispatchMatchedTraceDetail(
  result: ParticleHeadDispatchMatchedResult
): { readonly [key: string]: TraceDetailValue } {
  return {
    ...result.traceDetail,
    ...(result.kind === "functional_marker_adapter"
      ? {
        marker_kind: result.markerKind,
        ...(result.headRewrite === undefined || result.headRewrite === null
          ? {}
          : {
            head_rewrite_target: result.headRewrite.target,
            head_rewrite_rule: result.headRewrite.rule
          })
      }
      : {})
  };
}
