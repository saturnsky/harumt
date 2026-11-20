import { productionOpPattern } from "../production-admission-contract.js";
import { EXEMPLIFICATION_MID_CHAIN_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionFamilyClaimOpDependency, ProductionFamilyClaimSequenceDependencies, ProductionIntakeSite, ProductionOpPattern, ProductionRecord, ProductionShape } from "../production-registry.js";
import { ALL_OP_PATTERNS, ALL_CLAIM_OP_KINDS, claimDependencies, NON_CONNECTIVE_OP_PATTERNS, NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS, EXEMPLIFICATION_UTTERANCE_FINAL_CLOSURES } from "./shared.js";

const EXEMPLIFICATION_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] }
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const EXEMPLIFICATION_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [1, 2],
  positions: [
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
  ],
  aggregates: [{
    id: "has_exemplification",
    kind: "some_pattern",
    patterns: [productionOpPattern("connective", "connective_fields", {
      connectiveIn: ["exemplification"]
    })]
  }],
  kindCounts: [{ opKinds: ["connective"], cap: 1 }],
  familyClaimRefs: [
    { familyId: "quote_mid_chain", polarity: "excludes" },
    { familyId: "copula_reason_quote_carrier", polarity: "excludes" },
    { familyId: "attributive_operator_host_internal_te", polarity: "excludes" },
    { familyId: "reason_copula_conditional", polarity: "excludes" }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const ANY_CONNECTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "any_connective",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "suffix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } }
  ]
};

const EXEMPLIFICATION_FINAL_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "chain_final_connective",
      role: "core",
      patterns: [{ kind: "connective" }],
      cardinality: { min: 0, max: 1 }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const EXEMPLIFICATION_SINGLE_FINAL_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const EXEMPLIFICATION_TE_TERMINAL_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "te_host",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["te_form"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const EXEMPLIFICATION_CARRIER_RESIDUAL_PATTERNS: readonly ProductionOpPattern[] = [
  { kind: "polite" },
  { kind: "classicalAuxResidue" },
  { kind: "negation" },
  { kind: "tense" }
];

const EXEMPLIFICATION_CARRIER_WRAPPER_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      role: "core",
      patterns: [{ kind: "predicateQuoteCarrier" }],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier_residual",
      role: "wrapper",
      patterns: EXEMPLIFICATION_CARRIER_RESIDUAL_PATTERNS,
      cardinality: { min: 0, max: null }
    }
  ]
};

const EXEMPLIFICATION_CARRIER_YOUDA_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      role: "core",
      patterns: [{ kind: "predicateQuoteCarrier" }],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "likeness",
      role: "core",
      patterns: [productionOpPattern("modal", "modal_fields", {
        modalIn: ["youda"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const UNNORMALIZED_TOKA_FINAL_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "quotative",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["quotative"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "question_content",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["question_content"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const EXEMPLIFICATION_EMBEDDED_QUESTION_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "question_content",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["question_content", "question_content_alternative"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const EXEMPLIFICATION_LEGACY_RENDER_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [{
    id: "ops",
    role: "core",
    patterns: ALL_OP_PATTERNS,
    cardinality: { min: 0, max: null }
  }]
};

const EXEMPLIFICATION_PREFIX_SITES: readonly ProductionIntakeSite[] = [
  "quote_prefix",
  "assembler_resumable_prefix"
];

function exemplificationIntakeRecord(
  id: string,
  shape: ProductionShape,
  intakeSites: readonly ProductionIntakeSite[],
  partial?: boolean,
): ProductionRecord {
  return {
    id,
    shape,
    conditions: {
      clause: {
        intakeSites,
        ...(partial === undefined ? {} : { partial })
      }
    },
    loweringKey: "normalized_root"
  };
}

const EXEMPLIFICATION_RECORDS: readonly ProductionRecord[] = [
  exemplificationIntakeRecord(
    "exemplification_final_prefix",
    EXEMPLIFICATION_FINAL_PREFIX_SHAPE,
    EXEMPLIFICATION_PREFIX_SITES,
    true
  ),
  exemplificationIntakeRecord(
    "exemplification_single_final_candidate",
    EXEMPLIFICATION_SINGLE_FINAL_SHAPE,
    ["candidate_scan"]
  ),
  {
    id: "exemplification_te_utterance_final_candidate",
    shape: EXEMPLIFICATION_TE_TERMINAL_SHAPE,
    conditions: {
      terminal: { sfp: "forbidden", utteranceClosureIn: EXEMPLIFICATION_UTTERANCE_FINAL_CLOSURES },
      clause: { intakeSites: ["candidate_scan"], partial: false }
    },
    loweringKey: "normalized_root"
  },
  exemplificationIntakeRecord(
    "exemplification_carrier_wrapper_prefix",
    EXEMPLIFICATION_CARRIER_WRAPPER_SHAPE,
    EXEMPLIFICATION_PREFIX_SITES,
    true
  ),
  exemplificationIntakeRecord(
    "exemplification_carrier_youda_prefix",
    EXEMPLIFICATION_CARRIER_YOUDA_SHAPE,
    EXEMPLIFICATION_PREFIX_SITES,
    true
  ),
  exemplificationIntakeRecord(
    "unnormalized_toka_quote_prefix",
    UNNORMALIZED_TOKA_FINAL_SHAPE,
    ["quote_prefix"],
    true
  ),
  exemplificationIntakeRecord(
    "exemplification_embedded_question_prefix",
    EXEMPLIFICATION_EMBEDDED_QUESTION_SHAPE,
    ["quote_prefix"],
    true
  ),
  {
    id: "exemplification_legacy_render",
    shape: EXEMPLIFICATION_LEGACY_RENDER_SHAPE,
    conditions: {
      clause: { intakeSites: ["committed_render"], partial: false }
    },
    loweringKey: "exemplification_legacy_render"
  }
];

export const EXEMPLIFICATION_MID_CHAIN_FAMILY: ProductionFamily = {
  id: "exemplification_mid_chain",
  claimDomains: [ANY_CONNECTIVE_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    EXEMPLIFICATION_SEQUENCE_DEPENDENCIES,
    EXEMPLIFICATION_OP_DEPENDENCIES
  ),
  claim: EXEMPLIFICATION_MID_CHAIN_CLAIM,
  records: EXEMPLIFICATION_RECORDS,
  nonAdmission: "split"
};
