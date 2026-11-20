import { productionOpPattern } from "../production-admission-contract.js";
import { IMPERATIVE_HOST_STEM_KINDS, IMPERATIVE_HOST_SOURCE_SHAPES, IMPERATIVE_COPULA_LANE_STEM_KINDS, IMPERATIVE_COPULA_LANE_SOURCE_SHAPES, IMPERATIVE_CHAIN_OP_KINDS, IMPERATIVE_CHAIN_HEAD_OP_KINDS, IMPERATIVE_CHAIN_OP_PATTERNS, IMPERATIVE_STATE_CHANGE_AUX_KINDS, IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_ARGS, IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_AUX_KINDS, IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_STEM_KINDS, IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_SOURCE_SHAPES, PLAIN_PREDICATE_IMPERATIVE_TERMINAL_CLAIM, PLAIN_PREDICATE_OPERATOR_CHAIN_IMPERATIVE_TERMINAL_CLAIM, COPULA_IMPERATIVE_TERMINAL_CLAIM, NOUN_COPULA_STATE_CHANGE_IMPERATIVE_TERMINAL_CLAIM, PREDICATE_NEGATION_COMPLEMENT_IMPERATIVE_TERMINAL_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDependencies, ProductionFamilyClaimOpDependency, ProductionRecord } from "../production-registry.js";
import { ASPECT_CLAIM_DEPENDENCY, claimDependencies } from "./shared.js";

const IMPERATIVE_TERMINAL_CONDITIONS = {
  kinds: ["imperative"],
  sfp: "any"
} as const satisfies NonNullable<ProductionFamily["conditions"]>["terminal"];

const IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES = [
  { kind: "terminal_membership", values: ["imperative"] },
  { kind: "sfp_presence" }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

const IMPERATIVE_HOST_CONDITIONS = {
  stemKinds: [...IMPERATIVE_HOST_STEM_KINDS],
  sourceShapes: [...IMPERATIVE_HOST_SOURCE_SHAPES]
} as const satisfies ProductionRecord["conditions"]["host"];

const IMPERATIVE_COPULA_LANE_HOST_CONDITIONS = {
  stemKinds: [...IMPERATIVE_COPULA_LANE_STEM_KINDS],
  sourceShapes: [...IMPERATIVE_COPULA_LANE_SOURCE_SHAPES]
} as const satisfies ProductionRecord["conditions"]["host"];

const IMPERATIVE_COPULA_CLAIM_DEPENDENCY = {
  kind: "copula",
  fields: ["variant", "polarity", "polite"]
} as const satisfies ProductionFamilyClaimOpDependency;

export const PLAIN_PREDICATE_IMPERATIVE_TERMINAL_FAMILY: ProductionFamily = {
  id: "plain_predicate_imperative_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: IMPERATIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "plain_predicate_imperative_terminal",
      root: "aux_layer",
      ops: [],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [0],
        familyClaimRefs: [
          { familyId: "quotative_insistent_terminal", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_IMPERATIVE_TERMINAL_CLAIM,
  records: [
    {
      id: "plain_predicate_imperative_terminal",
      shape: { root: "aux_layer", ops: [] },
      conditions: {
        host: IMPERATIVE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    }
  ],
  nonAdmission: "reject"
};

export const PLAIN_PREDICATE_OPERATOR_CHAIN_IMPERATIVE_TERMINAL_FAMILY: ProductionFamily = {
  id: "plain_predicate_operator_chain_imperative_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: IMPERATIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "plain_predicate_operator_chain_imperative_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...IMPERATIVE_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [0, 1],
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: [
          {
            id: "plain_operator_chain_imperative_kinds",
            kind: "every_kind_in",
            opKinds: [...IMPERATIVE_CHAIN_OP_KINDS]
          },
          {
            id: "plain_operator_chain_imperative_chainable_aspect",
            kind: "every_filtered_pattern",
            pattern: productionOpPattern("aspect", "chainable_aspect", {}),
            requireAtLeastOne: false
          },
          {
            id: "plain_operator_chain_imperative_head_present",
            kind: "some_kind",
            opKinds: [...IMPERATIVE_CHAIN_HEAD_OP_KINDS]
          }
        ]
      },
      [ASPECT_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_OPERATOR_CHAIN_IMPERATIVE_TERMINAL_CLAIM,
  records: [
    {
      id: "plain_predicate_operator_chain_imperative_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: IMPERATIVE_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    }
  ],
  nonAdmission: "reject"
};

export const COPULA_IMPERATIVE_TERMINAL_FAMILY: ProductionFamily = {
  id: "copula_imperative_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: IMPERATIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "copula_imperative_terminal",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [1],
        positions: [{ kind: "absolute", index: 0 }]
      },
      [IMPERATIVE_COPULA_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: COPULA_IMPERATIVE_TERMINAL_CLAIM,
  records: [
    {
      id: "copula_imperative_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [productionOpPattern("copula", "copula_fields", {
              variantIn: ["basic"],
              polarityIn: ["affirmative"],
              politeIn: [false]
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_COPULA_LANE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_STATE_CHANGE_IMPERATIVE_TERMINAL_FAMILY: ProductionFamily = {
  id: "noun_copula_state_change_imperative_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: IMPERATIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "noun_copula_state_change_imperative_terminal",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "state_change",
          opKinds: ["postverbAuxiliary"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [2],
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "absolute", index: 1 }
        ]
      },
      [
        IMPERATIVE_COPULA_CLAIM_DEPENDENCY,
        { kind: "postverbAuxiliary", fields: ["auxiliary"] }
      ],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_STATE_CHANGE_IMPERATIVE_TERMINAL_CLAIM,
  records: [
    {
      id: "noun_copula_state_change_imperative_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [productionOpPattern("copula", "copula_fields", {
              variantIn: ["basic"],
              polarityIn: ["affirmative"],
              politeIn: [false]
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "state_change",
            role: "core",
            patterns: [productionOpPattern("postverbAuxiliary", "postverb_auxiliary_fields", {
              auxiliaryKindIn: [...IMPERATIVE_STATE_CHANGE_AUX_KINDS]
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_COPULA_LANE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    }
  ],
  nonAdmission: "reject"
};

const IMPERATIVE_NEGATION_COMPLEMENT_TERMINAL_DEPENDENCIES = [
  ...IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES,
  { kind: "sfp_effect_membership", values: ["quotative_command"] }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

const IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_PATTERN = productionOpPattern(
  "negation",
  "negation_fields",
  IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_ARGS
);

const IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_PATTERN = productionOpPattern(
  "postverbAuxiliary",
  "postverb_auxiliary_fields",
  { auxiliaryKindIn: [...IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_AUX_KINDS] }
);

const IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_HOST_CONDITIONS = {
  stemKinds: [...IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_STEM_KINDS],
  sourceShapes: [...IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_SOURCE_SHAPES]
} as const satisfies ProductionRecord["conditions"]["host"];

export const PREDICATE_NEGATION_COMPLEMENT_IMPERATIVE_TERMINAL_FAMILY: ProductionFamily = {
  id: "predicate_negation_complement_imperative_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: IMPERATIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "predicate_negation_complement_scope_control_imperative",
      root: "aux_layer",
      ops: [
        { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
        { id: "carrier", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    },
    {
      id: "predicate_negation_complement_polite_request_imperative",
      root: "aux_layer",
      ops: [
        { id: "voice", opKinds: ["voice"], cardinality: { min: 0, max: null } },
        { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
        { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
        { id: "polite", opKinds: ["polite"], cardinality: { min: 1, max: null } }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    },
    {
      id: "predicate_negation_complement_noun_copula_imperative",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        { id: "state_change", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
        { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
        { id: "carrier", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [2, 4],
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "absolute", index: 1 },
          { kind: "absolute", index: 2 },
          { kind: "absolute", index: 3 },
          { kind: "first_of_kinds", opKinds: ["negation"], offsets: [0, 1] }
        ],
        aggregates: [
          {
            id: "imperative_negation_complement_voice_prefix",
            kind: "every_kind_in",
            opKinds: ["voice"],
            range: {
              start: { kind: "absolute", index: 0 },
              end: { kind: "first_of_kinds", opKinds: ["negation"], offset: 0 }
            }
          },
          {
            id: "imperative_negation_complement_polite_suffix",
            kind: "every_kind_in",
            opKinds: ["polite"],
            range: {
              start: { kind: "first_of_kinds", opKinds: ["negation"], offset: 2 },
              end: { kind: "relative", offset: 0 }
            }
          }
        ],
        kindCounts: [
          { opKinds: ["negation"], cap: 2 },
          { opKinds: ["polite"], cap: 1 }
        ]
      },
      [
        IMPERATIVE_COPULA_CLAIM_DEPENDENCY,
        { kind: "postverbAuxiliary", fields: ["auxiliary"] },
        { kind: "negation", fields: ["chainDepth", "chainPast"] },
        ASPECT_CLAIM_DEPENDENCY
      ],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      IMPERATIVE_NEGATION_COMPLEMENT_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_NEGATION_COMPLEMENT_IMPERATIVE_TERMINAL_CLAIM,
  records: [
    {
      id: "predicate_negation_complement_scope_control_imperative",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "negation",
            role: "core",
            patterns: [IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_PATTERN],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "carrier",
            role: "core",
            patterns: [IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_PATTERN],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    },
    {
      id: "predicate_negation_complement_polite_request_imperative",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "voice",
            role: "core",
            patterns: [{ kind: "voice" }],
            cardinality: { min: 0, max: null }
          },
          {
            id: "negation",
            role: "core",
            patterns: [IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_PATTERN],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "request",
            role: "core",
            patterns: [productionOpPattern("aspect", "benefactive_aspect", {
              aspectIn: ["te_kudasaru"]
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "polite",
            role: "core",
            patterns: [{ kind: "polite" }],
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    },
    {
      id: "predicate_negation_complement_noun_copula_imperative",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [productionOpPattern("copula", "copula_fields", {
              variantIn: ["basic"],
              polarityIn: ["affirmative"],
              politeIn: [false]
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "state_change",
            role: "core",
            patterns: [productionOpPattern("postverbAuxiliary", "postverb_auxiliary_fields", {
              auxiliaryKindIn: [...IMPERATIVE_STATE_CHANGE_AUX_KINDS]
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "negation",
            role: "core",
            patterns: [IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_PATTERN],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "carrier",
            role: "core",
            patterns: [IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_PATTERN],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    }
  ],
  nonAdmission: "reject"
};
