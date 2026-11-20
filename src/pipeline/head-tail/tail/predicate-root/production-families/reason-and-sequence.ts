import type { AuxOpKind, CopulaOp, KoreanRealizationCategory, SourcePredicateShape, TerminalKind } from "../grammar.js";
import { AUX_OP_INVENTORY } from "../grammar.js";
import { createConnectiveOp } from "../op-builders.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { COPULA_REASON_QUOTE_CARRIER_CLAIM, VERBAL_REASON_QUOTE_CARRIER_CLAIM, REASON_COPULA_CONDITIONAL_CLAIM, SEQUENCE_AFTER_COPULA_CLAIM, REASON_QUOTE_CARRIER_RESIDUAL_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionFamilyClaimOpDependency, ProductionFamilyClaimSequenceAggregateDependency, ProductionFamilyClaimSequenceDependencies, ProductionIntakeSite, ProductionOpPattern, ProductionOpSlot, ProductionRecord, ProductionShape } from "../production-registry.js";
import { ALL_OP_PATTERNS, ALL_CLAIM_OP_KINDS, COPULA_CLAIM_DEPENDENCY, TENSE_CLAIM_DEPENDENCY, KIND_PRESENCE_DEPENDENCIES, claimDependencies, CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN, NON_CONNECTIVE_OP_PATTERNS, NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS } from "./shared.js";
import { CARRIER_CONTEXT_RENDER_SHAPE } from "./normalization.js";

const QUOTE_CARRIER_CLAIM_DEPENDENCY = {
  kind: "predicateQuoteCarrier",
  fields: ["style", "allomorph"]
} as const satisfies ProductionFamilyClaimOpDependency;
const PROJECTION_CARRIER_CLAIM_DEPENDENCY = {
  kind: "predicateProjectionCarrier",
  fields: ["carrier"]
} as const satisfies ProductionFamilyClaimOpDependency;

const COPULA_REASON_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective", "allomorph"] },
  COPULA_CLAIM_DEPENDENCY,
  QUOTE_CARRIER_CLAIM_DEPENDENCY,
  PROJECTION_CARRIER_CLAIM_DEPENDENCY,
  TENSE_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const REASON_CONDITIONAL_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective", "allomorph"] },
  COPULA_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const SEQUENCE_AFTER_COPULA_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] },
  COPULA_CLAIM_DEPENDENCY,
  { kind: "scopeBridge", fields: ["head", "polarity"] }
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const REASON_RESIDUAL_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] },
  COPULA_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const COPULA_REASON_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [3, 4, 5, 6],
  positions: [
    { kind: "absolute", index: 0 },
    { kind: "absolute", index: 1 },
    { kind: "absolute", index: 2 },
    { kind: "absolute", index: 3 },
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    { kind: "relative", offset: -3 },
  ],
  kindCounts: KIND_PRESENCE_DEPENDENCIES
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const REASON_CONDITIONAL_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [3],
  positions: [
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    { kind: "relative", offset: -3 },
    {
      kind: "first_of_kinds",
      opKinds: ["connective"],
      offsets: [0, 1, 2],
      relativeMatches: [-3]
    }
  ],
  kindCounts: [{ opKinds: ["connective"], cap: 2 }]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const SEQUENCE_AFTER_COPULA_SHELL_OP_KINDS = [
  "copula",
  "polite",
  "tense",
  "conjecture",
  "scopeBridge"
] as const satisfies readonly AuxOpKind[];

const SEQUENCE_AFTER_COPULA_SHELL_SCOPE_BRIDGE_PATTERN = productionOpPattern(
  "scopeBridge",
  "scope_bridge_fields",
  { headIn: [null], polarityIn: ["negative"] }
);

const SEQUENCE_AFTER_COPULA_SHELL_PATTERNS = [
  productionOpPattern("copula", "copula_fields", { variantIn: ["basic"] }),
  { kind: "polite" },
  { kind: "tense" },
  { kind: "conjecture" },
  SEQUENCE_AFTER_COPULA_SHELL_SCOPE_BRIDGE_PATTERN
] as const satisfies readonly ProductionOpPattern[];

const SEQUENCE_AFTER_COPULA_SHELL_RANGE = {
  start: { kind: "first_of_kinds", opKinds: ["connective"], offset: 1 },
  end: { kind: "relative", offset: 0 }
} as const satisfies ProductionFamilyClaimSequenceAggregateDependency["range"];

const SEQUENCE_AFTER_COPULA_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2],
  positions: [
    { kind: "relative", offset: -1 },
    { kind: "first_of_kinds", opKinds: ["connective"], offsets: [0] }
  ],
  aggregates: [
    {
      id: "sequence_after_copula_shell_kinds",
      kind: "every_kind_in",
      opKinds: SEQUENCE_AFTER_COPULA_SHELL_OP_KINDS,
      range: SEQUENCE_AFTER_COPULA_SHELL_RANGE
    },
    {
      id: "sequence_after_copula_shell_basic_copula",
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("copula", "copula_fields", { variantIn: ["basic"] }),
      requireAtLeastOne: false,
      range: SEQUENCE_AFTER_COPULA_SHELL_RANGE
    },
    {
      id: "sequence_after_copula_shell_bare_negative_bridge",
      kind: "every_filtered_pattern",
      pattern: SEQUENCE_AFTER_COPULA_SHELL_SCOPE_BRIDGE_PATTERN,
      requireAtLeastOne: false,
      range: SEQUENCE_AFTER_COPULA_SHELL_RANGE
    }
  ],
  kindCounts: [{ opKinds: ["connective"], cap: 2 }]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const REASON_RESIDUAL_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2, 3],
  positions: [
    { kind: "absolute", index: 0 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-2, -1, 0]
    },
  ],
  aggregates: [{
    id: "legacy_reason_wrappers_allowed",
    kind: "every_kind_in",
    opKinds: ["polite", "classicalAuxResidue"],
    range: {
      start: { kind: "absolute", index: 1 },
      end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
    }
  }],
  kindCounts: KIND_PRESENCE_DEPENDENCIES,
  familyClaimRefs: [
    { familyId: "quote_mid_chain", polarity: "excludes" },
    { familyId: "copula_reason_quote_carrier", polarity: "excludes" },
    { familyId: "attributive_operator_host_internal_te", polarity: "excludes" },
    { familyId: "carrier_internal_connective", polarity: "excludes" },
    { familyId: "conditional_quote_carrier", polarity: "excludes" },
    { familyId: "exemplification_mid_chain", polarity: "excludes" },
    { familyId: "reason_copula_conditional", polarity: "excludes" },
    { familyId: "embedded_question_mid_chain", polarity: "excludes" }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const REASON_COPULA_CONDITIONAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "reason_copula_conditional",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "reason", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
    { id: "conditional", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ]
};

const SEQUENCE_AFTER_COPULA_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "sequence_after_copula",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "sequence_after", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    {
      id: "copula_shell",
      opKinds: [...SEQUENCE_AFTER_COPULA_SHELL_OP_KINDS],
      cardinality: { min: 1, max: null }
    }
  ],
  terminal: { kinds: [null], sfp: "any" }
};

const COPULA_REASON_CARRIER_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "copula_reason_carrier",
  root: "aux_layer",
  ops: [
    { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
    { id: "wrappers", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "reason", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } },
    { id: "residual", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } }
  ]
};

const COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES: readonly ProductionIntakeSite[] = [
  "quote_prefix",
  "assembler_resumable_prefix"
];

const REASON_QUOTE_CARRIER_TERMINALS: readonly TerminalKind[] = [
  "attributive",
  "nominalized"
];

const PAST_WRAPPER_SLOT: ProductionOpSlot = {
  id: "past",
  role: "wrapper",
  patterns: [productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] })],
  cardinality: { min: 1, max: 1 }
};

const OPTIONAL_PAST_WRAPPER_SLOT: ProductionOpSlot = {
  ...PAST_WRAPPER_SLOT,
  cardinality: { min: 0, max: 1 }
};

const POLITE_WRAPPER_SLOT: ProductionOpSlot = {
  id: "polite",
  role: "wrapper",
  patterns: [{ kind: "polite" }],
  cardinality: { min: 1, max: 1 }
};

function copulaReasonQuoteCarrierRecord(options: {
  readonly id: string;
  readonly intakeSites: readonly ProductionIntakeSite[];
  readonly sourceShapes: readonly SourcePredicateShape[];
  readonly projectionCategories: readonly KoreanRealizationCategory[];
  readonly polarity: CopulaOp["polarity"];
  readonly wrappers?: readonly ProductionOpSlot[];
  readonly exactKara?: boolean;
  readonly wrapped?: boolean;
  readonly carrierSurface?: "という" | "っていう";
}): ProductionRecord {
  return {
    id: options.id,
    shape: {
      root: "aux_layer",
      ops: [
        {
          id: "copula",
          role: "core",
          patterns: [productionOpPattern("copula", "copula_fields", {
            variantIn: ["basic"],
            polarityIn: [options.polarity]
          })],
          cardinality: { min: 1, max: 1 }
        },
        ...(options.wrappers ?? []),
        {
          id: "reason",
          role: "core",
          patterns: [productionOpPattern("connective", "connective_fields", {
            connectiveIn: ["reason"],
            ...(options.exactKara === true ? { surfaceAllomorphIn: ["kara"] } : {})
          })],
          cardinality: { min: 1, max: 1 }
        },
        {
          id: "carrier",
          role: "core",
          patterns: [productionOpPattern(
            "predicateQuoteCarrier",
            "predicate_quote_carrier_fields",
            {
              styleIn: ["compact_toiu"],
              allomorphIn: [options.carrierSurface === "っていう" ? "tteiu" : "toiu"]
            }
          )],
          cardinality: { min: 1, max: 1 }
        }
      ]
    },
    conditions: {
      host: {
        sourceShapes: options.sourceShapes,
        projectionCategories: options.projectionCategories
      },
      terminal: { kinds: REASON_QUOTE_CARRIER_TERMINALS, sfp: "forbidden" },
      clause: { intakeSites: options.intakeSites }
    },
    loweringKey: options.wrapped === true
      ? "wrapped_copula_reason_quote_carrier"
      : "noun_copula_reason_quote_carrier"
  };
}

const COPULA_REASON_QUOTE_CARRIER_PREFIX_RECORD = copulaReasonQuoteCarrierRecord({
  id: "copula_reason_quote_carrier_prefix",
  intakeSites: COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES,
  sourceShapes: ["nominal"],
  projectionCategories: ["nominal"],
  polarity: "affirmative"
});

const COPULA_REASON_QUOTE_CARRIER_RENDER_RECORD = copulaReasonQuoteCarrierRecord({
  id: "copula_reason_quote_carrier_render",
  intakeSites: ["committed_render"],
  sourceShapes: ["nominal"],
  projectionCategories: ["nominal"],
  polarity: "affirmative"
});

const TTEIU_REASON_QUOTE_CARRIER_PREFIX_RECORD = copulaReasonQuoteCarrierRecord({
  id: "tteiu_reason_quote_carrier_prefix",
  intakeSites: COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES,
  sourceShapes: ["nominal"],
  projectionCategories: ["nominal"],
  polarity: "affirmative",
  carrierSurface: "っていう"
});

const TTEIU_REASON_QUOTE_CARRIER_RENDER_RECORD = copulaReasonQuoteCarrierRecord({
  id: "tteiu_reason_quote_carrier_render",
  intakeSites: ["committed_render"],
  sourceShapes: ["nominal"],
  projectionCategories: ["nominal"],
  polarity: "affirmative",
  carrierSurface: "っていう"
});

function wrappedReasonQuoteCarrierRecords(
  id: string,
  options: Omit<Parameters<typeof copulaReasonQuoteCarrierRecord>[0], "id" | "intakeSites" | "wrapped">
): readonly ProductionRecord[] {
  return [
    copulaReasonQuoteCarrierRecord({
      ...options,
      id: `${id}_prefix`,
      intakeSites: COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES,
      wrapped: true
    }),
    copulaReasonQuoteCarrierRecord({
      ...options,
      id: `${id}_render`,
      intakeSites: ["committed_render"],
      wrapped: true
    })
  ];
}

function wrappedReasonQuoteCarrierSurfaceRecords(
  id: string,
  options: Omit<Parameters<typeof copulaReasonQuoteCarrierRecord>[0], "id" | "intakeSites" | "wrapped" | "carrierSurface">
): readonly ProductionRecord[] {
  return [
    ...wrappedReasonQuoteCarrierRecords(id, options),
    ...wrappedReasonQuoteCarrierRecords(`${id}_tteiu`, {
      ...options,
      carrierSurface: "っていう"
    })
  ];
}

const WRAPPED_REASON_QUOTE_CARRIER_RECORDS = [
  ...wrappedReasonQuoteCarrierSurfaceRecords("na_reason_quote_carrier", {
    sourceShapes: ["na_adjective"],
    projectionCategories: ["adjectival_predicate", "verbal_predicate", "nominal"],
    polarity: "affirmative",
    exactKara: true
  }),
  ...wrappedReasonQuoteCarrierSurfaceRecords("noun_past_reason_quote_carrier", {
    sourceShapes: ["nominal"],
    projectionCategories: ["nominal"],
    polarity: "affirmative",
    wrappers: [PAST_WRAPPER_SLOT],
    exactKara: true
  }),
  ...wrappedReasonQuoteCarrierSurfaceRecords("noun_negative_reason_quote_carrier", {
    sourceShapes: ["nominal"],
    projectionCategories: ["nominal"],
    polarity: "negative",
    wrappers: [OPTIONAL_PAST_WRAPPER_SLOT],
    exactKara: true
  }),
  ...wrappedReasonQuoteCarrierSurfaceRecords("noun_negative_polite_past_reason_quote_carrier", {
    sourceShapes: ["nominal"],
    projectionCategories: ["nominal"],
    polarity: "negative",
    wrappers: [POLITE_WRAPPER_SLOT, PAST_WRAPPER_SLOT],
    exactKara: true
  })
] as const;

export const COPULA_REASON_QUOTE_CARRIER_FAMILY: ProductionFamily = {
  id: "copula_reason_quote_carrier",
  conditions: { terminal: { sfp: "forbidden" } },
  claimDomains: [COPULA_REASON_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    COPULA_REASON_SEQUENCE_DEPENDENCIES,
    COPULA_REASON_OP_DEPENDENCIES,
    {
      sourcePredicateShape: true,
      projectionCategories: ["adjectival_predicate", "verbal_predicate", "nominal"]
    },
    [{ kind: "terminal_membership", values: ["attributive", "nominalized"] }]
  ),
  claim: COPULA_REASON_QUOTE_CARRIER_CLAIM,
  records: [
    COPULA_REASON_QUOTE_CARRIER_PREFIX_RECORD,
    COPULA_REASON_QUOTE_CARRIER_RENDER_RECORD,
    TTEIU_REASON_QUOTE_CARRIER_PREFIX_RECORD,
    TTEIU_REASON_QUOTE_CARRIER_RENDER_RECORD,
    ...WRAPPED_REASON_QUOTE_CARRIER_RECORDS
  ],
  nonAdmission: "split"
};

function verbalReasonQuoteCarrierRecord(options: {
  readonly id: string;
  readonly intakeSites: readonly ProductionIntakeSite[];
  readonly carrierSurface?: "という" | "っていう";
}): ProductionRecord {
  return {
    id: options.id,
    shape: {
      root: "aux_layer",
      ops: [
        {
          id: "predicate_prefix",
          role: "wrapper",
          patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
          cardinality: { min: 0, max: null }
        },
        {
          id: "reason",
          role: "core",
          patterns: [productionOpPattern("connective", "connective_fields", {
            connectiveIn: ["reason"]
          })],
          cardinality: { min: 1, max: 1 }
        },
        {
          id: "carrier",
          role: "core",
          patterns: [productionOpPattern(
            "predicateQuoteCarrier",
            "predicate_quote_carrier_fields",
            {
              styleIn: ["compact_toiu"],
              allomorphIn: [options.carrierSurface === "っていう" ? "tteiu" : "toiu"]
            }
          )],
          cardinality: { min: 1, max: 1 }
        }
      ]
    },
    conditions: {
      host: {
        sourceShapes: ["verb", "i_adjective", "sahen_verbalization"],
        projectionCategories: ["verbal_predicate", "adjectival_predicate"]
      },
      terminal: { kinds: REASON_QUOTE_CARRIER_TERMINALS, sfp: "forbidden" },
      clause: { intakeSites: options.intakeSites }
    },
    loweringKey: "normalized_root"
  };
}

const VERBAL_REASON_QUOTE_CARRIER_RECORDS: readonly ProductionRecord[] = [
  verbalReasonQuoteCarrierRecord({
    id: "verbal_reason_quote_carrier_prefix",
    intakeSites: COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES
  }),
  verbalReasonQuoteCarrierRecord({
    id: "verbal_reason_quote_carrier_render",
    intakeSites: ["committed_render"]
  }),
  verbalReasonQuoteCarrierRecord({
    id: "verbal_reason_quote_carrier_tteiu_prefix",
    intakeSites: COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES,
    carrierSurface: "っていう"
  }),
  verbalReasonQuoteCarrierRecord({
    id: "verbal_reason_quote_carrier_tteiu_render",
    intakeSites: ["committed_render"],
    carrierSurface: "っていう"
  })
];

const VERBAL_REASON_CARRIER_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2, 3],
  positions: [
    { kind: "absolute", index: 0 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-1, 0, 1]
    }
  ],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 },
    { opKinds: ["copula"], cap: 1 }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const VERBAL_REASON_CARRIER_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective", "allomorph"] },
  COPULA_CLAIM_DEPENDENCY,
  QUOTE_CARRIER_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

export const VERBAL_REASON_QUOTE_CARRIER_FAMILY: ProductionFamily = {
  id: "verbal_reason_quote_carrier",
  conditions: { terminal: { sfp: "forbidden" } },
  claimDomains: [CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    VERBAL_REASON_CARRIER_SEQUENCE_DEPENDENCIES,
    VERBAL_REASON_CARRIER_OP_DEPENDENCIES,
    {
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate", "adjectival_predicate"]
    },
    [{ kind: "terminal_membership", values: ["attributive", "nominalized"] }]
  ),
  claim: VERBAL_REASON_QUOTE_CARRIER_CLAIM,
  records: VERBAL_REASON_QUOTE_CARRIER_RECORDS,
  nonAdmission: "split"
};

const REASON_COPULA_CONDITIONAL_RECORD: ProductionRecord = {
  id: "reason_copula_conditional",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "predicate_prefix",
        role: "wrapper",
        patterns: NON_CONNECTIVE_OP_PATTERNS,
        cardinality: { min: 0, max: null }
      },
      {
        id: "reason",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["reason"],
          surfaceAllomorphIn: ["kara"]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "reason_copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"],
          polarityIn: ["affirmative"]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "conditional",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["conditional"],
          surfaceAllomorphIn: ["tara"],
          structuralContinuationNotIn: ["quote_marker"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  normalization: {
    id: "lower_reason_copula_to_bound_nominal_reason",
    normalize: ({ root, match }) => {
      if (root.tail.kind !== "auxLayer") return root;
      const reason = match.shape.slots.get("reason")?.[0];
      const copula = match.shape.slots.get("reason_copula")?.[0];
      const conditional = match.shape.slots.get("conditional")?.[0];
      if (
        reason?.kind !== "connective" ||
        copula?.kind !== "copula" ||
        conditional?.kind !== "connective"
      ) return root;
      const prefixLength = root.tail.ops.length - 3;
      const sourceTokens = [
        ...reason.source.tokens,
        ...copula.source.tokens,
        ...conditional.source.tokens
      ];
      const sourceTokenIndices = [
        ...reason.source.tokenIndices,
        ...copula.source.tokenIndices,
        ...conditional.source.tokenIndices
      ];
      return {
        ...root,
        tail: {
          ...root.tail,
          ops: [
            ...root.tail.ops.slice(0, prefixLength),
            createConnectiveOp({

              connective: "bound_nominal_reason",
              surface: "ことから",
              boundNominalReasonClosure: "conditional",
              source: { tokens: sourceTokens, tokenIndices: sourceTokenIndices }
            })
          ]
        }
      };
    }
  },
  loweringKey: "reason_copula_conditional"
};

export const REASON_COPULA_CONDITIONAL_FAMILY: ProductionFamily = {
  id: "reason_copula_conditional",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null] } },
  claimDomains: [REASON_COPULA_CONDITIONAL_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    REASON_CONDITIONAL_SEQUENCE_DEPENDENCIES,
    REASON_CONDITIONAL_OP_DEPENDENCIES
  ),
  claim: REASON_COPULA_CONDITIONAL_CLAIM,
  records: [REASON_COPULA_CONDITIONAL_RECORD],
  nonAdmission: "split"
};

const SEQUENCE_AFTER_COPULA_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "sequence_after",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["sequence_after"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "copula_shell",
      role: "core",
      patterns: SEQUENCE_AFTER_COPULA_SHELL_PATTERNS,
      cardinality: { min: 1, max: null }
    }
  ]
};

const SEQUENCE_AFTER_COPULA_RECORDS: readonly ProductionRecord[] = [
  {
    id: "sequence_after_copula_terminal",
    shape: SEQUENCE_AFTER_COPULA_SHAPE,
    conditions: { terminal: { kinds: [null], sfp: "any" } },
    loweringKey: "sequence_after_copula_terminal"
  }
];

export const SEQUENCE_AFTER_COPULA_FAMILY: ProductionFamily = {
  id: "sequence_after_copula",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "any" } },
  claimDomains: [SEQUENCE_AFTER_COPULA_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    SEQUENCE_AFTER_COPULA_SEQUENCE_DEPENDENCIES,
    SEQUENCE_AFTER_COPULA_OP_DEPENDENCIES
  ),
  claim: SEQUENCE_AFTER_COPULA_CLAIM,
  records: SEQUENCE_AFTER_COPULA_RECORDS,
  nonAdmission: "split"
};



const NON_EMBEDDED_QUESTION_OP_PATTERNS = AUX_OP_INVENTORY.map(({ opKind }) =>
  opKind === "connective"
    ? productionOpPattern("connective", "connective_fields", {
        connectiveNotIn: ["question_content", "question_content_alternative"]
      })
    : { kind: opKind }
) as readonly ProductionOpPattern[];

const REASON_QUOTE_CARRIER_RESIDUAL_PREFIX_BASE_SLOTS: readonly ProductionOpSlot[] = [
  {
    id: "copula",
    role: "core",
    patterns: [productionOpPattern("copula", "copula_fields", {
      variantIn: ["basic"],
      polarityIn: ["affirmative"]
    })],
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "copula_wrappers",
    role: "wrapper",
    patterns: [{ kind: "polite" }, { kind: "classicalAuxResidue" }],
    cardinality: { min: 0, max: null }
  },
  {
    id: "reason",
    role: "core",
    patterns: [productionOpPattern("connective", "connective_fields", {
      connectiveIn: ["reason"]
    })],
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "carrier",
    role: "core",
    patterns: [{ kind: "predicateQuoteCarrier" }],
    cardinality: { min: 1, max: 1 }
  }
];

const REASON_QUOTE_CARRIER_NO_RESIDUAL_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: REASON_QUOTE_CARRIER_RESIDUAL_PREFIX_BASE_SLOTS
};

const REASON_QUOTE_CARRIER_NON_QUESTION_RESIDUAL_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    ...REASON_QUOTE_CARRIER_RESIDUAL_PREFIX_BASE_SLOTS,
    {
      id: "residual_prefix",
      role: "wrapper",
      patterns: ALL_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "residual_final",
      role: "wrapper",
      patterns: NON_EMBEDDED_QUESTION_OP_PATTERNS,
      cardinality: { min: 1, max: 1 }
    }
  ]
};

export const REASON_QUOTE_CARRIER_LEGACY_RESIDUAL_FAMILY: ProductionFamily = {
  id: "reason_quote_carrier_legacy_residual",
  claimDomains: [COPULA_REASON_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    REASON_RESIDUAL_SEQUENCE_DEPENDENCIES,
    REASON_RESIDUAL_OP_DEPENDENCIES,
    { projectionCategories: ["nominal"] }
  ),
  claim: REASON_QUOTE_CARRIER_RESIDUAL_CLAIM,
  records: [
    {
      id: "reason_quote_carrier_legacy_residual_quote_prefix",
      shape: REASON_QUOTE_CARRIER_NO_RESIDUAL_PREFIX_SHAPE,
      conditions: {
        host: { projectionCategories: ["nominal"] },
        clause: { intakeSites: ["quote_prefix"], partial: true }
      },
      loweringKey: "normalized_root"
    },
    {
      id: "reason_quote_carrier_legacy_residual_quote_prefix_with_residual",
      shape: REASON_QUOTE_CARRIER_NON_QUESTION_RESIDUAL_PREFIX_SHAPE,
      conditions: {
        host: { projectionCategories: ["nominal"] },
        clause: { intakeSites: ["quote_prefix"], partial: true }
      },
      loweringKey: "normalized_root"
    },
    {
      id: "reason_quote_carrier_legacy_residual_attributive_prefix",
      shape: CARRIER_CONTEXT_RENDER_SHAPE,
      conditions: {
        clause: { intakeSites: ["assembler_resumable_prefix"], partial: true }
      },
      loweringKey: "normalized_root"
    },
    {
      id: "reason_quote_carrier_legacy_residual_render",
      shape: CARRIER_CONTEXT_RENDER_SHAPE,
      conditions: {
        clause: { intakeSites: ["committed_render"], partial: false }
      },
      loweringKey: "carrier_context_legacy"
    }
  ],
  nonAdmission: "split"
};
