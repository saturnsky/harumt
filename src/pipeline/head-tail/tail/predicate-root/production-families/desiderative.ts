import { productionOpPattern } from "../production-admission-contract.js";
import { COPULAR_TE_HOSHII_CLAIM, SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionIntakeSite, ProductionRecord } from "../production-registry.js";
import { claimDependencies } from "./shared.js";

const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "source_verbal_adjectival_desiderative_core",
  root: "aux_layer",
  ops: [{
    id: "desiderative",
    opKinds: ["aspect"],
    cardinality: { min: 1, max: 1 }
  }],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_WISH_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "source_verbal_adjectival_desiderative_wish_core",
  root: "aux_layer",
  ops: [
    {
      id: "desiderative",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "wish_complement",
      opKinds: ["connective"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

export const DESIDERATIVE_INTAKE_SITES: readonly ProductionIntakeSite[] = [
  "candidate_scan",
  "quote_prefix",
  "assembler_resumable_prefix",
  "committed_render"
];

const COPULAR_DESIDERATIVE_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "copular_desiderative_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "desiderative",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    },
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const COPULAR_DESIDERATIVE_PAST_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "copular_desiderative_past_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "desiderative",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "past",
      opKinds: ["tense"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const COPULAR_DESIDERATIVE_CONNECTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "copular_desiderative_connective_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "desiderative",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "connective",
      opKinds: ["connective"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const NOMINAL_LIMIT_DESIDERATIVE_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "nominal_limit_desiderative_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "limit",
      opKinds: ["predicateProjectionCarrier"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "desiderative",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};


const NOUN_COPULA_DESIDERATIVE_TERMINAL_RECORD: ProductionRecord = {
  id: "noun_copula_desiderative_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"], polarityIn: ["affirmative"], basicForm: "absent", politeIn: [false]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["nominal"],
      projectionCategories: ["nominal"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
  },
  loweringKey: "noun_copula_desiderative_terminal"
};

const NOUN_COPULA_DESIDERATIVE_PAST_TERMINAL_RECORD: ProductionRecord = {
  id: "noun_copula_desiderative_past_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"], polarityIn: ["affirmative"], basicForm: "absent", politeIn: [false]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "past",
        role: "core",
        patterns: [productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["nominal"],
      projectionCategories: ["nominal"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
  },
  loweringKey: "noun_copula_desiderative_past_terminal"
};

const NOUN_COPULA_DESIDERATIVE_CONNECTIVE_RECORD: ProductionRecord = {
  id: "noun_copula_desiderative_connective",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"], polarityIn: ["affirmative"], basicForm: "absent", politeIn: [false]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "connective",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["adversative", "quotative", "wish_complement"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["nominal"],
      projectionCategories: ["nominal"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
  },
  loweringKey: "noun_copula_desiderative_connective"
};

const NOUN_LIMIT_DESIDERATIVE_TERMINAL_RECORD: ProductionRecord = {
  id: "noun_limit_desiderative_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "limit",
        role: "core",
        patterns: [productionOpPattern(
          "predicateProjectionCarrier",
          "predicate_projection_carrier_fields",
          { carrierIn: ["limit_dake"], politeNotTrue: true, pastNotTrue: true }
        )],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["nominal"],
      projectionCategories: ["nominal"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
  },
  loweringKey: "noun_limit_desiderative_terminal"
};

const NA_ADJECTIVE_COPULA_DESIDERATIVE_TERMINAL_RECORD: ProductionRecord = {
  id: "na_adjective_copula_desiderative_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"], polarityIn: ["affirmative"], basicForm: "absent", politeIn: [false]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["na_adjective"],
      projectionCategories: ["adjectival_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
  },
  loweringKey: "na_adjective_copula_desiderative_terminal"
};

export const COPULAR_TE_HOSHII_FAMILY: ProductionFamily = {
  id: "copular_te_hoshii",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [
    COPULAR_DESIDERATIVE_TERMINAL_CLAIM_DOMAIN,
    COPULAR_DESIDERATIVE_PAST_TERMINAL_CLAIM_DOMAIN,
    COPULAR_DESIDERATIVE_CONNECTIVE_CLAIM_DOMAIN,
    NOMINAL_LIMIT_DESIDERATIVE_TERMINAL_CLAIM_DOMAIN
  ],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [2, 3],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 },
        { kind: "absolute", index: 2 }
      ],
      kindCounts: [
        { opKinds: ["copula"], cap: 1 },
        { opKinds: ["aspect"], cap: 1 },
        { opKinds: ["connective"], cap: 1 },
        { opKinds: ["tense"], cap: 1 },
        { opKinds: ["predicateProjectionCarrier"], cap: 1 }
      ]
    },
    [
      { kind: "copula", fields: ["variant", "basicForm", "polarity", "polite"] },
      { kind: "aspect", fields: ["aspect", "desiderative"] },
      { kind: "connective", fields: ["connective"] },
      { kind: "tense", fields: ["tense"] },
      { kind: "predicateProjectionCarrier", fields: ["carrier", "polite", "past"] }
    ],
    {
      sourcePredicateShape: true,
      projectionCategories: ["nominal", "adjectival_predicate"]
    }
  ),
  claim: COPULAR_TE_HOSHII_CLAIM,
  records: [
    NOUN_COPULA_DESIDERATIVE_TERMINAL_RECORD,
    NOUN_COPULA_DESIDERATIVE_PAST_TERMINAL_RECORD,
    NOUN_COPULA_DESIDERATIVE_CONNECTIVE_RECORD,
    NOUN_LIMIT_DESIDERATIVE_TERMINAL_RECORD,
    NA_ADJECTIVE_COPULA_DESIDERATIVE_TERMINAL_RECORD
  ],
  nonAdmission: "reject"
};


const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_RECORD: ProductionRecord = {
  id: "source_verbal_adjectival_desiderative_terminal",
  shape: {
    root: "aux_layer",
    ops: [{
      id: "desiderative",
      role: "core",
      patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
      cardinality: { min: 1, max: 1 }
    }]
  },
  conditions: {
    host: {
      sourceShapes: ["verb"],
      projectionCategories: ["adjectival_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: {
      intakeSites: DESIDERATIVE_INTAKE_SITES
    }
  },
  loweringKey: "source_verbal_adjectival_desiderative"
};

const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_WISH_RECORD: ProductionRecord = {
  id: "source_verbal_adjectival_desiderative_wish_complement",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "wish_complement",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["wish_complement"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["verb"],
      projectionCategories: ["adjectival_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: {
      intakeSites: DESIDERATIVE_INTAKE_SITES
    }
  },
  loweringKey: "source_verbal_adjectival_desiderative_wish_complement"
};

export const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_FAMILY: ProductionFamily = {
  id: "source_verbal_adjectival_desiderative",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [
    SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_CLAIM_DOMAIN,
    SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_WISH_CLAIM_DOMAIN
  ],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [1, 2],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 }
      ],
      kindCounts: [
        { opKinds: ["aspect"], cap: 1 },
        { opKinds: ["connective"], cap: 1 }
      ]
    },
    [
      { kind: "aspect", fields: ["aspect", "desiderative"] },
      { kind: "connective", fields: ["connective"] }
    ],
    {
      sourcePredicateShape: true,
      admittedOnlyProjectionCategories: ["adjectival_predicate"]
    }
  ),
  claim: SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_CLAIM,
  records: [
    SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_RECORD,
    SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_WISH_RECORD
  ],
  nonAdmission: "reject"
};
