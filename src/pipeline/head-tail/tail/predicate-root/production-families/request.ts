import type { AuxOpKind } from "../grammar.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { BENEFACTIVE_NODA_TERMINAL_CLAIM, REQUEST_ON_COMPOSED_PREDICATE_BASE_CLAIM, REQUEST_TERMINAL_BOUNDARY_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionFamilyClaimSequenceDependencies, ProductionIntakeSite, ProductionOpPattern, ProductionOpSlot, ProductionRecord } from "../production-registry.js";
import { claimDependencies } from "./shared.js";

const REQUEST_TERMINAL_INTAKE_SITES = [
  "candidate_scan",
  "quote_prefix",
  "assembler_resumable_prefix",
  "committed_render"
] as const satisfies readonly ProductionIntakeSite[];

const REQUEST_COMPOSED_BASE_PREFIX_KINDS = [
  "aspect",
  "postverbAuxiliary",
  "voice",
  "copula"
] as const satisfies readonly AuxOpKind[];

const REQUEST_COMPOSED_HEAD_PATTERNS: readonly ProductionOpPattern[] = [
  productionOpPattern("aspect", "request_command_base_aspect", {}),
  { kind: "postverbAuxiliary" },
  { kind: "voice" }
];

const REQUEST_COMPOSED_BASE_PATTERNS: readonly ProductionOpPattern[] = [
  ...REQUEST_COMPOSED_HEAD_PATTERNS,
  productionOpPattern("copula", "copula_fields", {
    variantIn: ["basic"],
    polarityIn: ["affirmative"],
    politeIn: [false]
  })
];

const REQUEST_ON_COMPOSED_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "command_base",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      cardinality: { min: 1, max: null }
    },
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null] }
};

const REQUEST_ON_COMPOSED_COMPLEMENT_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_complement_core",
  root: "aux_layer",
  ops: [
    {
      id: "command_base",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      cardinality: { min: 1, max: null }
    },
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "request_complement", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_REPORTED_REQUEST_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_reported_request_core",
  root: "aux_layer",
  ops: [
    {
      id: "command_base",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      cardinality: { min: 1, max: null }
    },
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "reported_request", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_WRAPPED_TERMINAL_CLAIM_DOMAINS = [
  {
    id: "request_on_composed_pre_head_negation_terminal_core",
    root: "aux_layer",
    ops: [
      { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
      { id: "command_base", opKinds: ["aspect", "postverbAuxiliary", "voice"], cardinality: { min: 1, max: 1 } },
      { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } }
    ],
    terminal: { kinds: [null] }
  },
  {
    id: "request_on_composed_inter_head_negation_terminal_core",
    root: "aux_layer",
    ops: [
      { id: "command_base_before", opKinds: ["aspect", "postverbAuxiliary", "voice"], cardinality: { min: 1, max: 1 } },
      { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
      { id: "command_base", opKinds: ["aspect", "postverbAuxiliary", "voice"], cardinality: { min: 1, max: 1 } },
      { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } }
    ],
    terminal: { kinds: [null] }
  }
] as const satisfies readonly ProductionFamilyClaimDomain[];

const REQUEST_ON_COMPOSED_QUOTE_ATTRIBUTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_quote_attributive_core",
  root: "aux_layer",
  ops: [
    {
      id: "command_base",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      cardinality: { min: 1, max: null }
    },
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "quote_carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: ["attributive", null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_NOMINALIZED_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_nominalized_terminal_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "nominalizer_copula", opKinds: ["copula"], cardinality: { min: 0, max: 1 } },
    { id: "noda", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_HEARSAY_CHAIN_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_hearsay_chain_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "hearsay", opKinds: ["modal"], cardinality: { min: 1, max: 1 } },
    { id: "chain_connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_QUOTE_CARRIER_CHAIN_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_quote_carrier_chain_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "quote_carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } },
    { id: "wake", opKinds: ["modal"], cardinality: { min: 0, max: 1 } },
    { id: "chain_connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_LIKENESS_FRAGMENT_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_likeness_fragment_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "likeness", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_COMPOSED_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2, 3, 4],
  positions: [
    { kind: "absolute", index: 0 },
    { kind: "absolute", index: 1 },
    { kind: "absolute", index: 2 },
    { kind: "absolute", index: 3 },
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 }
  ],
  aggregates: [
    {
      id: "request_composed_terminal_prefix_kinds",
      kind: "every_kind_in",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "request_composed_complement_prefix_kinds",
      kind: "every_kind_in",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -2 }
      }
    },
    {
      id: "request_composed_terminal_aspects",
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("aspect", "request_command_base_aspect", {}),
      requireAtLeastOne: false,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "request_composed_complement_aspects",
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("aspect", "request_command_base_aspect", {}),
      requireAtLeastOne: false,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -2 }
      }
    },
    {
      id: "request_composed_terminal_has_head",
      kind: "some_pattern",
      patterns: REQUEST_COMPOSED_HEAD_PATTERNS,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "request_composed_complement_has_head",
      kind: "some_pattern",
      patterns: REQUEST_COMPOSED_HEAD_PATTERNS,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -2 }
      }
    }
  ],
  kindCounts: [{ opKinds: ["copula"], cap: 2 }]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const REQUEST_COMPOSED_HOST_CONDITIONS = {
  sourceShapes: ["verb", "sahen_verbalization", "i_adjective", "na_adjective"],
  projectionCategories: ["verbal_predicate", "adjectival_predicate"]
} as const;

const REQUEST_COMPOSED_BASE_SLOT: ProductionOpSlot = {
  id: "command_base",
  role: "core",
  patterns: REQUEST_COMPOSED_BASE_PATTERNS,
  cardinality: { min: 1, max: null }
};

const REQUEST_COMPOSED_REQUEST_SLOT: ProductionOpSlot = {
  id: "request",
  role: "core",
  patterns: [productionOpPattern("aspect", "request_aspect", {})],
  cardinality: { min: 1, max: 1 }
};

const REQUEST_COMPOSED_POLITE_REQUEST_SLOT: ProductionOpSlot = {
  id: "request",
  role: "core",
  patterns: [productionOpPattern("aspect", "request_aspect", {
    aspectIn: ["te_kudasai"]
  })],
  cardinality: { min: 1, max: 1 }
};

const REQUEST_COMPOSED_TERMINAL_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_terminal",
  shape: {
    root: "aux_layer",
    ops: [REQUEST_COMPOSED_BASE_SLOT, REQUEST_COMPOSED_REQUEST_SLOT]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_PRE_HEAD_NEGATION_OPS = [
  {
    id: "command_wrapper",
    role: "wrapper",
    patterns: [{ kind: "negation" }],
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "command_base",
    role: "core",
    patterns: REQUEST_COMPOSED_HEAD_PATTERNS,
    cardinality: { min: 1, max: 1 }
  },
  REQUEST_COMPOSED_REQUEST_SLOT
] as const satisfies ProductionRecord["shape"]["ops"];

const REQUEST_COMPOSED_INTER_HEAD_NEGATION_OPS = [
  {
    id: "command_base_before",
    role: "core",
    patterns: REQUEST_COMPOSED_HEAD_PATTERNS,
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "command_wrapper",
    role: "wrapper",
    patterns: [{ kind: "negation" }],
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "command_base",
    role: "core",
    patterns: REQUEST_COMPOSED_HEAD_PATTERNS,
    cardinality: { min: 1, max: 1 }
  },
  REQUEST_COMPOSED_REQUEST_SLOT
] as const satisfies ProductionRecord["shape"]["ops"];

const REQUEST_COMPOSED_PRE_HEAD_NEGATION_TERMINAL_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_pre_head_negation_terminal",
  shape: {
    root: "aux_layer",
    ops: REQUEST_COMPOSED_PRE_HEAD_NEGATION_OPS
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_INTER_HEAD_NEGATION_TERMINAL_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_inter_head_negation_terminal",
  shape: {
    root: "aux_layer",
    ops: REQUEST_COMPOSED_INTER_HEAD_NEGATION_OPS
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_PRE_HEAD_NEGATION_NEUTRAL_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_pre_head_negation_neutral_sfp",
  shape: { root: "aux_layer", ops: REQUEST_COMPOSED_PRE_HEAD_NEGATION_OPS },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: [null] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_PRE_HEAD_NEGATION_DISCURSIVE_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_pre_head_negation_discursive_sfp",
  shape: { root: "aux_layer", ops: REQUEST_COMPOSED_PRE_HEAD_NEGATION_OPS },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: ["ne", "na_excl"] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_discursive_sfp"
};

const REQUEST_COMPOSED_INTER_HEAD_NEGATION_NEUTRAL_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_inter_head_negation_neutral_sfp",
  shape: { root: "aux_layer", ops: REQUEST_COMPOSED_INTER_HEAD_NEGATION_OPS },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: [null] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_INTER_HEAD_NEGATION_DISCURSIVE_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_inter_head_negation_discursive_sfp",
  shape: { root: "aux_layer", ops: REQUEST_COMPOSED_INTER_HEAD_NEGATION_OPS },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: ["ne", "na_excl"] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_discursive_sfp"
};

const REQUEST_COMPOSED_NEUTRAL_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_neutral_sfp",
  shape: {
    root: "aux_layer",
    ops: [REQUEST_COMPOSED_BASE_SLOT, REQUEST_COMPOSED_REQUEST_SLOT]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: [null] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_DISCURSIVE_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_discursive_sfp",
  shape: {
    root: "aux_layer",
    ops: [REQUEST_COMPOSED_BASE_SLOT, REQUEST_COMPOSED_REQUEST_SLOT]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: ["ne", "na_excl"] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_discursive_sfp"
};

const REQUEST_COMPOSED_COMPLEMENT_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_complement",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_BASE_SLOT,
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "request_complement",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["request_complement"],
          surfaceAllomorphIn: ["to", "tte"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_composed_base_request_complement"
};

const REQUEST_COMPOSED_PROJECTION_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_projection",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_BASE_SLOT,
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "request_projection",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["wish_complement", "quoted_concessive"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_projection_connective"
};

const REQUEST_COMPOSED_REPORTED_REQUEST_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_reported_request",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_BASE_SLOT,
      REQUEST_COMPOSED_POLITE_REQUEST_SLOT,
      {
        id: "reported_request",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["other"],
          quotativeMoodIn: ["imperative"],
          quotativeClosureIn: ["reported_request"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_reported_terminal"
};

const REQUEST_COMPOSED_QUOTE_ATTRIBUTIVE_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_quote_attributive",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_BASE_SLOT,
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "quote_carrier",
        role: "core",
        patterns: [productionOpPattern("predicateQuoteCarrier", "predicate_quote_carrier_fields", {
          styleIn: ["compact_toiu"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: ["attributive", null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_projection_quote_attributive"
};

const REQUEST_COMPOSED_NOMINALIZED_TERMINAL_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_nominalized_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "nominalizer_copula",
        role: "wrapper",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"],
          polarityIn: ["affirmative"],
          politeIn: [false]
        })],
        cardinality: { min: 0, max: 1 }
      },
      {
        id: "noda",
        role: "core",
        patterns: [productionOpPattern("modal", "modal_fields", {
          modalIn: ["noda"],
          politeIn: [false],
          pastIn: [false],
          inner: "absent"
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_nominalized_terminal"
};

const REQUEST_COMPOSED_LIKENESS_FRAGMENT_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_likeness_fragment",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "likeness",
        role: "core",
        patterns: [productionOpPattern("modal", "youda_modal_fields", {
          formIn: ["youda", "mitai"],
          terminalIn: ["attributive_na"],
          readingIn: ["likeness"],
          politeIn: [false],
          pastIn: [false],
          inner: "absent"
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_likeness_fragment"
};

const REQUEST_CHAIN_CONNECTIVE_SLOT: ProductionOpSlot = {
  id: "chain_connective",
  role: "core",
  patterns: [productionOpPattern("connective", "connective_fields", {})],
  cardinality: { min: 1, max: 1 }
};

const REQUEST_COMPOSED_HEARSAY_CHAIN_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_hearsay_chain",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "hearsay",
        role: "core",
        patterns: [productionOpPattern("modal", "souda_hearsay_modal_fields", {
          readingIn: ["hearsay"],
          inner: "absent"
        })],
        cardinality: { min: 1, max: 1 }
      },
      REQUEST_CHAIN_CONNECTIVE_SLOT
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_carrier_chain_connective"
};

const REQUEST_COMPOSED_QUOTE_CARRIER_CHAIN_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_quote_carrier_chain",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "quote_carrier",
        role: "core",
        patterns: [productionOpPattern("predicateQuoteCarrier", "predicate_quote_carrier_fields", {
          styleIn: ["compact_toiu"]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "wake",
        role: "core",
        patterns: [productionOpPattern("modal", "modal_fields", {
          modalIn: ["wake"],
          inner: "absent"
        })],
        cardinality: { min: 0, max: 1 }
      },
      REQUEST_CHAIN_CONNECTIVE_SLOT
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_carrier_chain_connective"
};

export const REQUEST_ON_COMPOSED_PREDICATE_BASE_FAMILY: ProductionFamily = {
  id: "request_on_composed_predicate_base",
  legacyFallback: "retired",
  claimDomains: [
    REQUEST_ON_COMPOSED_TERMINAL_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_COMPLEMENT_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_REPORTED_REQUEST_CLAIM_DOMAIN,
    ...REQUEST_ON_COMPOSED_WRAPPED_TERMINAL_CLAIM_DOMAINS,
    REQUEST_ON_COMPOSED_QUOTE_ATTRIBUTIVE_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_NOMINALIZED_TERMINAL_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_LIKENESS_FRAGMENT_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_HEARSAY_CHAIN_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_QUOTE_CARRIER_CHAIN_CLAIM_DOMAIN
  ],
  claimDependencies: claimDependencies(
    REQUEST_COMPOSED_SEQUENCE_DEPENDENCIES,
    [
      { kind: "aspect", fields: ["aspect"] },
      { kind: "copula", fields: ["variant", "polarity", "polite"] },
      {
        kind: "connective",
        fields: ["connective", "allomorph", "quotativeMood", "quotativeClosure"]
      },
      { kind: "predicateQuoteCarrier", fields: ["style"] },
      {
        kind: "modal",
        fields: ["modal", "form", "terminal", "reading", "polite", "past", "inner"]
      }
    ],
    {
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate", "adjectival_predicate"]
    },
    [
      { kind: "terminal_membership", values: [null] },
      { kind: "terminal_membership", values: ["attributive"] },
      { kind: "sfp_presence" },
      { kind: "sfp_effect_membership", values: [null, "ne", "na_excl"] }
    ]
  ),
  claim: REQUEST_ON_COMPOSED_PREDICATE_BASE_CLAIM,
  records: [
    REQUEST_COMPOSED_TERMINAL_RECORD,
    REQUEST_COMPOSED_PRE_HEAD_NEGATION_TERMINAL_RECORD,
    REQUEST_COMPOSED_INTER_HEAD_NEGATION_TERMINAL_RECORD,
    REQUEST_COMPOSED_PRE_HEAD_NEGATION_NEUTRAL_SFP_RECORD,
    REQUEST_COMPOSED_PRE_HEAD_NEGATION_DISCURSIVE_SFP_RECORD,
    REQUEST_COMPOSED_INTER_HEAD_NEGATION_NEUTRAL_SFP_RECORD,
    REQUEST_COMPOSED_INTER_HEAD_NEGATION_DISCURSIVE_SFP_RECORD,
    REQUEST_COMPOSED_NEUTRAL_SFP_RECORD,
    REQUEST_COMPOSED_DISCURSIVE_SFP_RECORD,
    REQUEST_COMPOSED_COMPLEMENT_RECORD,
    REQUEST_COMPOSED_PROJECTION_RECORD,
    REQUEST_COMPOSED_REPORTED_REQUEST_RECORD,
    REQUEST_COMPOSED_QUOTE_ATTRIBUTIVE_RECORD,
    REQUEST_COMPOSED_NOMINALIZED_TERMINAL_RECORD,
    REQUEST_COMPOSED_LIKENESS_FRAGMENT_RECORD,
    REQUEST_COMPOSED_HEARSAY_CHAIN_RECORD,
    REQUEST_COMPOSED_QUOTE_CARRIER_CHAIN_RECORD
  ],
  nonAdmission: "preserve"
};

const BENEFACTIVE_NODA_DIRECT_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "benefactive_noda_direct_terminal_core",
  root: "aux_layer",
  ops: [
    { id: "benefactive", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "noda", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: {
    kinds: [null],
    sfp: "required",
    sfpEffects: [null, "ka"],
    sfpEmphaticQuestion: false
  }
};

const BENEFACTIVE_NODA_VOICE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "benefactive_noda_voice_terminal_core",
  root: "aux_layer",
  ops: [
    { id: "voice", opKinds: ["voice"], cardinality: { min: 1, max: 1 } },
    { id: "benefactive", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "noda", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: {
    kinds: [null],
    sfp: "required",
    sfpEffects: [null, "ka"],
    sfpEmphaticQuestion: false
  }
};

const BENEFACTIVE_NODA_COPULA_STATE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "benefactive_noda_copula_state_terminal_core",
  root: "aux_layer",
  ops: [
    { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
    { id: "state_change", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
    { id: "benefactive", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "noda", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: {
    kinds: [null],
    sfp: "required",
    sfpEffects: [null, "ka"],
    sfpEmphaticQuestion: false
  }
};

const BENEFACTIVE_NODA_PREFIX_SLOT: ProductionOpSlot = {
  id: "benefactive_prefix",
  role: "core",
  patterns: [
    productionOpPattern("copula", "copula_fields", {
      variantIn: ["basic"],
      polarityIn: ["affirmative"],
      politeIn: [false]
    }),
    productionOpPattern("postverbAuxiliary", "postverb_auxiliary_fields", {
      auxiliaryKindIn: ["make_state_change"]
    }),
    productionOpPattern("voice", "voice_fields", { voiceIn: ["causative"] })
  ],
  cardinality: { min: 0, max: 2 }
};

const BENEFACTIVE_NODA_CORE_SLOTS = [
  BENEFACTIVE_NODA_PREFIX_SLOT,
  {
    id: "benefactive",
    role: "core",
    patterns: [productionOpPattern("aspect", "benefactive_aspect", {
      aspectIn: ["te_kureru"]
    })],
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "noda",
    role: "core",
    patterns: [productionOpPattern("modal", "modal_fields", { modalIn: ["noda"] })],
    cardinality: { min: 1, max: 1 }
  }
] as const satisfies readonly ProductionOpSlot[];

function benefactiveNodaTerminalRecord(
  id: string,
  sfpEffects: readonly ("ka" | null)[]
): ProductionRecord {
  return {
    id,
    shape: { root: "aux_layer", ops: BENEFACTIVE_NODA_CORE_SLOTS },
    conditions: {
      host: {
        sourceShapes: ["verb", "sahen_verbalization", "na_adjective"],
        projectionCategories: ["verbal_predicate", "adjectival_predicate"]
      },
      terminal: {
        kinds: [null],
        sfp: "required",
        sfpEffects,
        sfpEmphaticQuestion: false
      },
      clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
    },
    loweringKey: "benefactive_noda_terminal"
  };
}

export const BENEFACTIVE_NODA_TERMINAL_FAMILY: ProductionFamily = {
  id: "benefactive_noda_terminal",
  legacyFallback: "retired",
  claimDomains: [
    BENEFACTIVE_NODA_DIRECT_CLAIM_DOMAIN,
    BENEFACTIVE_NODA_VOICE_CLAIM_DOMAIN,
    BENEFACTIVE_NODA_COPULA_STATE_CLAIM_DOMAIN
  ],
  claimDependencies: {
    terminal: [
      { kind: "terminal_membership", values: [null] },
      { kind: "sfp_presence" },
      { kind: "sfp_effect_membership", values: [null, "ka"] }
    ],
    host: {
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate", "adjectival_predicate"]
    },
    ops: [
      { kind: "aspect", fields: ["aspect"] },
      { kind: "modal", fields: ["modal"] },
      { kind: "copula", fields: ["variant", "polarity", "polite"] },
      { kind: "voice", fields: ["voice"] },
      { kind: "postverbAuxiliary", fields: ["auxiliary"] }
    ],
    sequence: {
      lengthThresholds: [2, 3, 4],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 },
        { kind: "absolute", index: 2 },
        { kind: "absolute", index: 3 }
      ]
    }
  },
  claim: BENEFACTIVE_NODA_TERMINAL_CLAIM,
  records: [
    benefactiveNodaTerminalRecord("benefactive_noda_terminal_statement", [null]),
    benefactiveNodaTerminalRecord("benefactive_noda_terminal_question", ["ka"])
  ],
  nonAdmission: "reject"
};

const REQUEST_TERMINAL_QUOTATIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_terminal_quotative_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "quotative", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const DIRECT_REQUEST_TERMINAL_KA_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "direct_request_terminal_ka_core",
  root: "aux_layer",
  ops: [{ id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } }],
  terminal: { kinds: [null], sfp: "required", sfpEffects: ["ka"] }
};

const DIRECT_REQUEST_PROJECTION_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "direct_request_projection_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "request_projection", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const DIRECT_REQUEST_REPORTED_REQUEST_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "direct_request_reported_request_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "reported_request", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_TERMINAL_QUOTATIVE_RECORD: ProductionRecord = {
  id: "request_terminal_quotative",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "request",
        role: "core",
        patterns: [productionOpPattern("aspect", "request_aspect", {})],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "quotative",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["to"],
          quotativeMoodIn: ["imperative"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["verb", "sahen_verbalization"],
      projectionCategories: ["verbal_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_terminal_quotative"
};

const DIRECT_REQUEST_TERMINAL_KA_RECORD: ProductionRecord = {
  id: "direct_request_terminal_ka",
  shape: {
    root: "aux_layer",
    ops: [{
      id: "request",
      role: "core",
      patterns: [productionOpPattern("aspect", "request_aspect", {})],
      cardinality: { min: 1, max: 1 }
    }]
  },
  conditions: {
    host: {
      sourceShapes: ["verb"],
      projectionCategories: ["verbal_predicate"]
    },
    terminal: { kinds: [null], sfp: "required", sfpEffects: ["ka"] },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_terminal_question"
};

const DIRECT_REQUEST_PROJECTION_RECORD: ProductionRecord = {
  id: "direct_request_projection",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "request",
        role: "core",
        patterns: [productionOpPattern("aspect", "request_aspect", {})],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "request_projection",
        role: "core",
        patterns: [
          productionOpPattern("connective", "connective_fields", {
            connectiveIn: ["wish_complement", "quoted_concessive"]
          }),
          productionOpPattern("connective", "connective_fields", {
            connectiveIn: ["request_complement"],
            surfaceAllomorphIn: ["to"]
          })
        ],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["verb", "sahen_verbalization"],
      projectionCategories: ["verbal_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_projection_connective"
};

const DIRECT_REQUEST_REPORTED_REQUEST_RECORD: ProductionRecord = {
  id: "direct_request_reported_request",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "request",
        role: "core",
        patterns: [productionOpPattern("aspect", "request_aspect", {
          aspectIn: ["te_kudasai"]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "reported_request",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["other"],
          quotativeMoodIn: ["imperative"],
          quotativeClosureIn: ["reported_request"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["verb", "sahen_verbalization"],
      projectionCategories: ["verbal_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_reported_terminal"
};

export const REQUEST_TERMINAL_BOUNDARY_FAMILY: ProductionFamily = {
  id: "request_terminal_boundary",
  legacyFallback: "retired",
  claimDomains: [
    REQUEST_TERMINAL_QUOTATIVE_CLAIM_DOMAIN,
    DIRECT_REQUEST_TERMINAL_KA_CLAIM_DOMAIN,
    DIRECT_REQUEST_PROJECTION_CLAIM_DOMAIN,
    DIRECT_REQUEST_REPORTED_REQUEST_CLAIM_DOMAIN
  ],
  claimDependencies: {
    terminal: [
      { kind: "terminal_membership", values: [null] },
      { kind: "sfp_presence" },
      { kind: "sfp_effect_membership", values: ["ka"] }
    ],
    host: {
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate"]
    },
    ops: [
      { kind: "aspect", fields: ["aspect"] },
      {
        kind: "connective",
        fields: ["connective", "allomorph", "quotativeMood", "quotativeClosure"]
      }
    ],
    sequence: {
      lengthThresholds: [1, 2],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 }
      ],
      kindCounts: [
        { opKinds: ["aspect"], cap: 1 },
        { opKinds: ["connective"], cap: 1 }
      ]
    }
  },
  claim: REQUEST_TERMINAL_BOUNDARY_CLAIM,
  records: [
    REQUEST_TERMINAL_QUOTATIVE_RECORD,
    DIRECT_REQUEST_TERMINAL_KA_RECORD,
    DIRECT_REQUEST_PROJECTION_RECORD,
    DIRECT_REQUEST_REPORTED_REQUEST_RECORD
  ],
  nonAdmission: "reject"
};
