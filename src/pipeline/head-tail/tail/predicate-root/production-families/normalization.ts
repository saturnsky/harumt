import type { AuxLayerNode, AuxOpKind, AuxOpNode, ConnectiveOp, TailRoot } from "../grammar.js";
import { HEAD_AUX_OP_KINDS } from "../operator-head.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { ATTRIBUTIVE_INTERNAL_TE_CLAIM, CARRIER_INTERNAL_CONNECTIVE_CLAIM } from "../production-family-claims.js";
import { claimSequenceFindIndexOfKinds, claimSequenceIndexFromEnd, claimSequenceSomeOfKinds } from "../production-claim-access.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionFamilyClaimOpDependency, ProductionFamilyClaimSequenceDependencies, ProductionOpPattern, ProductionRecord, ProductionShape } from "../production-registry.js";
import { ALL_OP_PATTERNS, ALL_CLAIM_OP_KINDS, ASPECT_CLAIM_DEPENDENCY, KIND_PRESENCE_DEPENDENCIES, claimDependencies, CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN, NON_CONNECTIVE_OP_PATTERNS, NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS } from "./shared.js";

const NON_CONNECTIVE_CLAIM_OP_KINDS = ALL_CLAIM_OP_KINDS.filter((kind) => kind !== "connective");
const IDIOM_CLAIM_DEPENDENCY = {
  kind: "idiom",
  fields: ["idiom"]
} as const satisfies ProductionFamilyClaimOpDependency;

const ATTRIBUTIVE_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] },
  ASPECT_CLAIM_DEPENDENCY,
  IDIOM_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const CARRIER_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] }
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const HEAD_CLAIM_OP_KINDS = HEAD_AUX_OP_KINDS satisfies readonly AuxOpKind[];

const ATTRIBUTIVE_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [1, 2],
  positions: [
    { kind: "first_of_kinds", opKinds: HEAD_CLAIM_OP_KINDS, offsets: [-1, 0] }
  ],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const CARRIER_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [1, 2, 3],
  positions: [
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-1, 0, 1]
    },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      startIndex: 1,
      offsets: [0]
    }
  ],
  aggregates: [
    {
      id: "has_exemplification",
      kind: "some_pattern",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })]
    },
    {
      id: "carrier_normalization_listing_te",
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["listing", "te_form"]
      }),
      requireAtLeastOne: true,
      range: {
        start: { kind: "absolute", index: 0 },
        end: {
          kind: "first_of_kinds",
          opKinds: ["predicateQuoteCarrier"],
          startIndex: 1,
          offset: 0
        }
      }
    },
    {
      id: "carrier_quote_prefix_listing_te",
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["listing", "te_form"]
      }),
      requireAtLeastOne: true,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "carrier_preceding_prefix_has_connective",
      kind: "some_kind",
      opKinds: ["connective"],
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
      }
    },
    {
      id: "carrier_suffix_wrappers_allowed",
      kind: "every_kind_in",
      opKinds: ["polite", "classicalAuxResidue", "negation", "tense"],
      range: {
        start: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: 1 },
        end: { kind: "relative", offset: 0 }
      }
    }
  ],
  kindCounts: KIND_PRESENCE_DEPENDENCIES,
  familyClaimRefs: [
    { familyId: "reason_copula_conditional", polarity: "excludes" },
    { familyId: "conditional_quote_carrier", polarity: "excludes" }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const CARRIER_THEN_CONNECTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "carrier_then_connective",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } },
    { id: "middle", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "residual", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } }
  ]
};

const CARRIER_INTERNAL_CONNECTIVE_PATTERNS: readonly ProductionOpPattern[] = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: ["te_form", "listing", "sequence_after"]
  })
];

const CARRIER_INTERNAL_LISTING_TE_PATTERNS: readonly ProductionOpPattern[] = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: ["te_form", "listing"]
  })
];

const CARRIER_CONTEXT_RESIDUAL_PATTERNS: readonly ProductionOpPattern[] = [
  { kind: "polite" },
  { kind: "classicalAuxResidue" },
  { kind: "negation" },
  { kind: "tense" }
];

function firstConnectiveIndex(ops: readonly AuxOpNode[]): number {
  return claimSequenceFindIndexOfKinds(ops, ["connective"]);
}

export function tailRootHasMidChainConnective(root: TailRoot): boolean {
  if (root.tail.kind !== "auxLayer") return false;
  const index = firstConnectiveIndex(root.tail.ops);
  return index >= 0 && index < claimSequenceIndexFromEnd(root.tail.ops, -1);
}

const ATTRIBUTIVE_INTERNAL_TE_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "internal_te",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["te_form"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "operator_tail",
      role: "core",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 1, max: null }
    }
  ]
};

const ATTRIBUTIVE_INTERNAL_TE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "attributive_internal_connective",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: NON_CONNECTIVE_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "internal_connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "operator_tail", opKinds: NON_CONNECTIVE_CLAIM_OP_KINDS, cardinality: { min: 1, max: null } }
  ]
};

function attributiveInternalTeRecord(
  id: string,
  intakeSite: "assembler_resumable_prefix" | "committed_render",
  partial: boolean,
): ProductionRecord {
  return {
    id,
    shape: ATTRIBUTIVE_INTERNAL_TE_SHAPE,
    conditions: {
      host: { projectionKinds: ["direct_verbal", "direct_adjectival"] },
      terminal: { kinds: ["attributive"], sfp: "forbidden" },
      clause: { intakeSites: [intakeSite], partial }
    },
    normalization: {
      id: "drop_attributive_operator_host_internal_te",
      normalize: ({ root, match }) => {
        if (root.tail.kind !== "auxLayer") return root;
        const internal = new Set(match.shape.slots.get("internal_te") ?? []);
        return {
          ...root,
          tail: { ...root.tail, ops: root.tail.ops.filter((op) => !internal.has(op)) }
        };
      }
    },
    loweringKey: "normalized_root"
  };
}

export const ATTRIBUTIVE_INTERNAL_TE_FAMILY: ProductionFamily = {
  id: "attributive_operator_host_internal_te",
  claimState: "invariant",
  conditions: {
    terminal: { kinds: ["attributive"], sfp: "forbidden" }
  },
  claimDomains: [ATTRIBUTIVE_INTERNAL_TE_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    ATTRIBUTIVE_SEQUENCE_DEPENDENCIES,
    ATTRIBUTIVE_OP_DEPENDENCIES,
    {
      projectionKinds: ["direct_verbal", "direct_adjectival"]
    }
  ),
  claim: ATTRIBUTIVE_INTERNAL_TE_CLAIM,
  records: [
    attributiveInternalTeRecord(
      "attributive_operator_host_internal_te_prefix",
      "assembler_resumable_prefix",
      true
    ),
    attributiveInternalTeRecord(
      "attributive_operator_host_internal_te_render",
      "committed_render",
      false
    )
  ],
  nonAdmission: "split"
};

function carrierInternalConnectivesAreListingTe(
  ops: readonly AuxOpNode[],
  endExclusive: number,
): boolean {
  return claimSequenceSomeOfKinds(
    ops,
    ["connective"],
    undefined,
    0,
    endExclusive
  ) && !claimSequenceSomeOfKinds(
    ops,
    ["connective"],
    (op) => op.kind === "connective" &&
      op.connective !== "listing" && op.connective !== "te_form",
    0,
    endExclusive
  );
}

function carrierInternalConnectiveNormalizationIndex(layer: AuxLayerNode): number {
  const carrierIndex = claimSequenceFindIndexOfKinds(
    layer.ops,
    ["predicateQuoteCarrier"],
    (_, index) => index > 0
  );
  return carrierIndex >= 1 && carrierInternalConnectivesAreListingTe(layer.ops, carrierIndex)
    ? carrierIndex
    : -1;
}

export function normalizeCarrierInternalConnectives(
  layer: AuxLayerNode,
): AuxLayerNode | null {
  const carrierIndex = carrierInternalConnectiveNormalizationIndex(layer);
  if (carrierIndex < 0) return null;
  const internal = layer.ops.slice(0, carrierIndex)
    .filter((op): op is ConnectiveOp => op.kind === "connective");
  const internalSet = new Set<AuxOpNode>(internal);
  return { ...layer, ops: layer.ops.filter((op) => !internalSet.has(op)) };
}

const CARRIER_CONTEXT_DIRECT_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "internal_connective",
      role: "core",
      patterns: CARRIER_INTERNAL_CONNECTIVE_PATTERNS,
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
      patterns: CARRIER_CONTEXT_RESIDUAL_PATTERNS,
      cardinality: { min: 0, max: null }
    }
  ]
};

const CARRIER_CONTEXT_QUOTE_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "quote_body",
      role: "wrapper",
      patterns: [
        ...NON_CONNECTIVE_OP_PATTERNS,
        ...CARRIER_INTERNAL_LISTING_TE_PATTERNS
      ],
      cardinality: { min: 1, max: null }
    },
    {
      id: "quote",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["quotative", "question_quotative"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

export const CARRIER_CONTEXT_RENDER_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [{
    id: "legacy_ops",
    role: "core",
    patterns: ALL_OP_PATTERNS,
    cardinality: { min: 1, max: null }
  }]
};

function carrierContextPrefixRecord(
  id: string,
  shape: ProductionShape,
): ProductionRecord {
  return {
    id,
    shape,
    conditions: {
      clause: {
        intakeSites: ["quote_prefix", "assembler_resumable_prefix"],
        partial: true
      }
    },
    loweringKey: "normalized_root"
  };
}

export const CARRIER_INTERNAL_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "carrier_internal_connective",
  claimState: "invariant",
  claimDomains: [
    CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN,
    CARRIER_THEN_CONNECTIVE_CLAIM_DOMAIN
  ],
  claimDependencies: claimDependencies(CARRIER_SEQUENCE_DEPENDENCIES, CARRIER_OP_DEPENDENCIES),
  claim: CARRIER_INTERNAL_CONNECTIVE_CLAIM,
  records: [
    carrierContextPrefixRecord(
      "carrier_internal_connective_prefix",
      CARRIER_CONTEXT_DIRECT_PREFIX_SHAPE
    ),
    carrierContextPrefixRecord(
      "carrier_internal_listing_te_quote_prefix",
      CARRIER_CONTEXT_QUOTE_PREFIX_SHAPE
    ),
    {
      id: "carrier_internal_connective_legacy_render",
      shape: CARRIER_CONTEXT_RENDER_SHAPE,
      conditions: {
        clause: { intakeSites: ["committed_render"], partial: false }
      },
      loweringKey: "carrier_context_legacy"
    }
  ],
  nonAdmission: "split"
};
