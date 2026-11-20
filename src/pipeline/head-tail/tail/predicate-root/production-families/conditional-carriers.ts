import { AUX_OP_INVENTORY } from "../grammar.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { ADVERSATIVE_QUOTE_CARRIER_CLAIM, CONDITIONAL_QUOTE_CARRIER_CLAIM, CONDITIONAL_QUOTE_ELLIPSIS_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimOpDependency, ProductionFamilyClaimSequenceDependencies, ProductionIntakeSite, ProductionNormalization, ProductionOpPattern, ProductionRecord, ProductionShape } from "../production-registry.js";
import { claimDependencies, CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN, NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS } from "./shared.js";
import { CARRIER_CONTEXT_RENDER_SHAPE } from "./normalization.js";

const MODAL_CLAIM_DEPENDENCY = {
  kind: "modal",
  fields: ["modal"]
} as const satisfies ProductionFamilyClaimOpDependency;

const CONDITIONAL_CARRIER_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective", "conditionalQuoteEllipsis"] },
  { kind: "predicateQuoteCarrier", fields: ["style", "allomorph"] },
  MODAL_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const ADVERSATIVE_CARRIER_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] },
  { kind: "predicateQuoteCarrier", fields: ["style", "sourceTerminal"] },
  MODAL_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const CONDITIONAL_QUOTE_ELLIPSIS_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective", "allomorph", "conditionalQuoteEllipsis"] },
  { kind: "predicateQuoteCarrier", fields: ["style", "allomorph", "sourceTerminal"] }
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const CONDITIONAL_CARRIER_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2, 3],
  positions: [
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-1, 0, 1, 2],
      relativeMatches: [-1]
    }
  ],
  aggregates: [{
    id: "conditional_carrier_has_earlier_connective",
    kind: "some_kind",
    opKinds: ["connective"],
    range: {
      start: { kind: "absolute", index: 0 },
      end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
    }
  }],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 }
  ],
  familyClaimRefs: [
    { familyId: "exemplification_mid_chain", polarity: "excludes" }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const ADVERSATIVE_CARRIER_SEQUENCE_DEPENDENCIES = {
  positions: [
    { kind: "absolute", index: 0 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-1, 0],
      relativeMatches: [-1]
    }
  ],
  aggregates: [{
    id: "adversative_carrier_has_earlier_connective",
    kind: "some_kind",
    opKinds: ["connective"],
    range: {
      start: { kind: "absolute", index: 0 },
      end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
    }
  }],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const CONDITIONAL_QUOTE_PREFIX_OP_PATTERNS = AUX_OP_INVENTORY
  .filter(({ opKind }) =>
    opKind !== "connective" && opKind !== "predicateQuoteCarrier" && opKind !== "negation"
  )
  .map(({ opKind }) => ({ kind: opKind })) as readonly ProductionOpPattern[];

const CONDITIONAL_QUOTE_ELLIPSIS_ALLOMORPHS = ["ba", "tara"] as const;

const CONDITIONAL_QUOTE_CARRIER_YOUDA_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "conditional",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["conditional"]
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

function conditionalQuoteEllipsisShape(
  carrierAllomorphs: readonly ("other" | "toiu" | "tteiu")[],
  conditionalAllomorph: "ba" | "tara",
  sourceTerminal?: boolean
): ProductionShape {
  return {
    root: "aux_layer",
    ops: [
      {
        id: "predicate_prefix",
        role: "wrapper",
        patterns: conditionalAllomorph === "ba"
          ? CONDITIONAL_QUOTE_PREFIX_OP_PATTERNS
          : NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
        cardinality: { min: 0, max: null }
      },
      {
        id: "conditional",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["conditional"],
          surfaceAllomorphIn: [conditionalAllomorph],
          conditionalQuoteEllipsisNotIn: ["prohibitive_concern"]
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
            allomorphIn: carrierAllomorphs,
            ...(sourceTerminal === undefined ? {} : { sourceTerminal })
          }
        )],
        cardinality: { min: 1, max: 1 }
      }
    ]
  };
}

const CONDITIONAL_QUOTE_ELLIPSIS_SHAPES = CONDITIONAL_QUOTE_ELLIPSIS_ALLOMORPHS.map(
  (allomorph) => conditionalQuoteEllipsisShape(["other"], allomorph, true)
);
const CONDITIONAL_QUOTE_GENERAL_HEAD_SHAPES = CONDITIONAL_QUOTE_ELLIPSIS_ALLOMORPHS.map(
  (allomorph) => conditionalQuoteEllipsisShape(["toiu", "tteiu"], allomorph)
);

const CONDITIONAL_COMPACT_QUOTE_MANNER_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "conditional",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["conditional"],
        conditionalQuoteEllipsisNotIn: ["prohibitive_concern"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      role: "core",
      patterns: [productionOpPattern(
        "predicateQuoteCarrier",
        "predicate_quote_carrier_fields",
        { styleIn: ["compact_toiu"] }
      )],
      cardinality: { min: 1, max: 1 }
    }
  ]
};




const CONDITIONAL_QUOTE_ELLIPSIS_NORMALIZATION: ProductionNormalization = {
  id: "drop_conditional_quote_ellipsis_carrier",
  normalize: ({ root }) => {
    if (root.tail.kind !== "auxLayer") return root;
    return { ...root, tail: { ...root.tail, ops: root.tail.ops.slice(0, -1) } };
  }
};

const CONDITIONAL_QUOTE_CARRIER_RECORDS: readonly ProductionRecord[] = [
  ...CONDITIONAL_QUOTE_GENERAL_HEAD_SHAPES.map((shape, index) => ({
    id: `conditional_compact_quote_general_head_prefix_${CONDITIONAL_QUOTE_ELLIPSIS_ALLOMORPHS[index]}`,
    shape,
    conditions: {
      terminal: { kinds: ["attributive"] as const },
      clause: {
        intakeSites: ["assembler_resumable_prefix"] as const,
        partial: true,
        conditionalCompactQuoteManner: "forbidden" as const
      }
    },
    loweringKey: "normalized_root" as const
  })),
  {
    id: "conditional_quote_carrier_youda_prefix",
    shape: CONDITIONAL_QUOTE_CARRIER_YOUDA_SHAPE,
    conditions: {
      clause: {
        intakeSites: ["quote_prefix", "assembler_resumable_prefix"],
        partial: true
      }
    },
    loweringKey: "normalized_root"
  },
  {
    id: "conditional_compact_quote_manner_prefix",
    shape: CONDITIONAL_COMPACT_QUOTE_MANNER_SHAPE,
    conditions: {
      terminal: { kinds: ["attributive"] },
      clause: {
        intakeSites: ["assembler_resumable_prefix"],
        partial: true,
        conditionalCompactQuoteManner: "required"
      }
    },
    loweringKey: "normalized_root"
  },
  {
    id: "conditional_quote_carrier_legacy_render",
    shape: CARRIER_CONTEXT_RENDER_SHAPE,
    conditions: {
      clause: { intakeSites: ["committed_render"], partial: false }
    },
    loweringKey: "carrier_context_legacy"
  }
];


function conditionalQuoteEllipsisRecords(
  idPrefix: string,
  intakeSites: readonly ProductionIntakeSite[]
): readonly ProductionRecord[] {
  return CONDITIONAL_QUOTE_ELLIPSIS_SHAPES.map((shape, index) => ({
    id: `${idPrefix}_${CONDITIONAL_QUOTE_ELLIPSIS_ALLOMORPHS[index]}`,
    shape,
    conditions: {
      terminal: { kinds: [null] as const, sfp: "forbidden" as const },
      clause: { intakeSites }
    },
    normalization: CONDITIONAL_QUOTE_ELLIPSIS_NORMALIZATION,
    loweringKey: "conditional_quote_ellipsis_terminal" as const
  }));
}

const CONDITIONAL_QUOTE_ELLIPSIS_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2, 3],
  positions: [
    { kind: "relative", offset: -1 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-1, 0],
      relativeMatches: [-1]
    }
  ],
  aggregates: [{
    id: "conditional_quote_ellipsis_has_negation_prefix",
    kind: "some_kind",
    opKinds: ["negation"],
    range: {
      start: { kind: "absolute", index: 0 },
      end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
    }
  }],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 },
    { opKinds: ["negation"], cap: 1 }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

export const CONDITIONAL_QUOTE_ELLIPSIS_FAMILY: ProductionFamily = {
  id: "conditional_quote_ellipsis",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    CONDITIONAL_QUOTE_ELLIPSIS_SEQUENCE_DEPENDENCIES,
    CONDITIONAL_QUOTE_ELLIPSIS_OP_DEPENDENCIES,
    undefined,
    [{ kind: "terminal_membership", values: [null] }]
  ),
  claim: CONDITIONAL_QUOTE_ELLIPSIS_CLAIM,
  records: [
    ...conditionalQuoteEllipsisRecords("conditional_quote_ellipsis_candidate", ["candidate_scan"]),
    ...conditionalQuoteEllipsisRecords("conditional_quote_ellipsis_render", ["committed_render"])
  ],
  nonAdmission: "split"
};

export const CONDITIONAL_QUOTE_CARRIER_FAMILY: ProductionFamily = {
  id: "conditional_quote_carrier",
  claimDomains: [CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    CONDITIONAL_CARRIER_SEQUENCE_DEPENDENCIES,
    CONDITIONAL_CARRIER_OP_DEPENDENCIES,
    undefined,
    [{ kind: "terminal_membership", values: ["attributive"] }]
  ),
  claim: CONDITIONAL_QUOTE_CARRIER_CLAIM,
  records: CONDITIONAL_QUOTE_CARRIER_RECORDS,
  nonAdmission: "split"
};


const ADVERSATIVE_QUOTE_CARRIER_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "adversative",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["adversative"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      role: "core",
      patterns: [productionOpPattern(
        "predicateQuoteCarrier",
        "predicate_quote_carrier_fields",
        { styleIn: ["compact_toiu"] }
      )],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

export const ADVERSATIVE_QUOTE_CARRIER_FAMILY: ProductionFamily = {
  id: "adversative_quote_carrier",
  conditions: { terminal: { kinds: ["attributive", null], sfp: "forbidden" } },
  claimDomains: [CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    ADVERSATIVE_CARRIER_SEQUENCE_DEPENDENCIES,
    ADVERSATIVE_CARRIER_OP_DEPENDENCIES,
    { stemKind: true },
    [
      { kind: "terminal_membership", values: ["attributive"] },
      { kind: "terminal_membership", values: [null] }
    ]
  ),
  claim: ADVERSATIVE_QUOTE_CARRIER_CLAIM,
  records: [
    {
      id: "adversative_quote_carrier_prefix",
      shape: ADVERSATIVE_QUOTE_CARRIER_SHAPE,
      conditions: {
        terminal: { kinds: ["attributive"], sfp: "forbidden" },
        clause: {
          intakeSites: ["assembler_resumable_prefix"],
          partial: true
        }
      },
      loweringKey: "normalized_root"
    },
    {
      id: "adversative_quote_carrier_render",
      shape: ADVERSATIVE_QUOTE_CARRIER_SHAPE,
      conditions: {
        terminal: { kinds: ["attributive"], sfp: "forbidden" },
        clause: { intakeSites: ["committed_render"], partial: false }
      },
      loweringKey: "adversative_quote_carrier_attributive_render"
    },
    {
      id: "adversative_quote_carrier_terminal_candidate",
      shape: ADVERSATIVE_QUOTE_CARRIER_SHAPE,
      conditions: {
        terminal: { kinds: [null], sfp: "forbidden" },
        clause: { intakeSites: ["candidate_scan"] }
      },
      loweringKey: "adversative_quote_carrier_terminal_render"
    },
    {
      id: "adversative_quote_carrier_terminal_render",
      shape: ADVERSATIVE_QUOTE_CARRIER_SHAPE,
      conditions: {
        terminal: { kinds: [null], sfp: "forbidden" },
        clause: { intakeSites: ["committed_render"] }
      },
      loweringKey: "adversative_quote_carrier_terminal_render"
    }
  ],
  nonAdmission: "split"
};
