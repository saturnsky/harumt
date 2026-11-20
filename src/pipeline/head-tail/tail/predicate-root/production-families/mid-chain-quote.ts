import type { ConnectiveOp } from "../grammar.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { EMBEDDED_QUESTION_MID_CHAIN_CLAIM, QUOTE_MID_CHAIN_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionFamilyClaimOpDependency, ProductionFamilyClaimSequenceDependencies, ProductionIntakeSite, ProductionNormalization, ProductionOpPattern, ProductionOpSlot, ProductionRecord, ProductionRegistryMatch, ProductionShape } from "../production-registry.js";
import { ALL_CLAIM_OP_KINDS, COPULA_CLAIM_DEPENDENCY, KIND_PRESENCE_DEPENDENCIES, claimDependencies, NON_CONNECTIVE_OP_PATTERNS } from "./shared.js";
import { CARRIER_CONTEXT_RENDER_SHAPE } from "./normalization.js";

const QUOTE_OP_DEPENDENCIES = [
  {
    kind: "connective",
    fields: ["connective", "conditionalFlavor", "conditionalQuoteEllipsis"]
  },
  COPULA_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const EMBEDDED_QUESTION_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] },
  COPULA_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const QUOTE_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [1, 2, 3],
  positions: [
    { kind: "absolute", index: 0 },
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    { kind: "relative", offset: -3 },
    {
      kind: "first_of_kinds",
      opKinds: ["connective"],
      offsets: [-1, 0, 1],
      relativeMatches: [-2]
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
      id: "quote_prefix_has_connective",
      kind: "some_kind",
      opKinds: ["connective"],
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "quote_prefix_has_listing_te",
      kind: "some_pattern",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["listing", "te_form"]
      })],
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "noun_quote_wrappers_allowed",
      kind: "every_kind_in",
      opKinds: ["tense", "negation", "polite", "classicalAuxResidue"],
      range: {
        start: { kind: "absolute", index: 1 },
        end: { kind: "first_of_kinds", opKinds: ["connective"], offset: 0 }
      }
    }
  ],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const EMBEDDED_QUESTION_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2],
  positions: [
    { kind: "absolute", index: 0 },
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-2, -1, 0]
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
      id: "embedded_prefix_has_connective",
      kind: "some_kind",
      opKinds: ["connective"],
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "legacy_reason_wrappers_allowed",
      kind: "every_kind_in",
      opKinds: ["polite", "classicalAuxResidue"],
      range: {
        start: { kind: "absolute", index: 1 },
        end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
      }
    }
  ],
  kindCounts: KIND_PRESENCE_DEPENDENCIES,
  familyClaimRefs: [{ familyId: "carrier_internal_connective", polarity: "excludes" }]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const FINAL_CONNECTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "final_connective",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 1, max: null } },
    { id: "final_connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ]
};

const QUOTE_MID_CHAIN_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "quote_mid_chain_final_connective",
  root: "aux_layer",
  ops: [
    {
      id: "prefix",
      opKinds: ALL_CLAIM_OP_KINDS.filter((kind) => kind !== "predicateQuoteCarrier"),
      cardinality: { min: 1, max: null }
    },
    { id: "final_connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ]
};

const QUOTE_INTERNAL_CONNECTIVE_PATTERNS: readonly ProductionOpPattern[] = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: ["listing", "te_form"]
  })
];

const QUOTE_INTERNAL_RESIDUAL_PATTERNS: readonly ProductionOpPattern[] = [
  ...NON_CONNECTIVE_OP_PATTERNS,
  ...QUOTE_INTERNAL_CONNECTIVE_PATTERNS
];


function quoteInternalConnectiveNormalization(): ProductionNormalization {
  return {
    id: "drop_quote_internal_listing_te",
    normalize: ({ root, match }) => {
      if (root.tail.kind !== "auxLayer") return root;
      const internal = new Set([
        ...(match.shape.slots.get("internal_connective") ?? []),
        ...(match.shape.slots.get("quote_residual") ?? []).filter((op) =>
          op.kind === "connective"
        )
      ]);
      return {
        ...root,
        tail: { ...root.tail, ops: root.tail.ops.filter((op) => !internal.has(op)) }
      };
    }
  };
}

const QUOTE_RECORD_INTAKE_SITES: readonly ProductionIntakeSite[] = [
  "quote_prefix",
  "committed_render"
];

const HOSTLESS_QUOTE_RECORD_INTAKE_SITES: readonly ProductionIntakeSite[] = [
  "candidate_scan",
  ...QUOTE_RECORD_INTAKE_SITES
];

const CONDITIONAL_QUOTE_TERMINAL_NORMALIZATION: ProductionNormalization = {
  id: "restore_conditional_alias_and_drop_quote_terminal",
  normalize: ({ root, match }) => {
    if (root.tail.kind !== "auxLayer") return root;
    const conditionalAliases = new Set([
      ...(match.shape.slots.get("conditional") ?? []),
      ...(match.shape.slots.get("conditional_alias") ?? []),
    ].filter((op): op is ConnectiveOp =>
      op.kind === "connective" && op.connective === "quotative"
    ));
    const ops = root.tail.ops.slice(0, -1).map((op) => {
      if (op.kind !== "connective" || !conditionalAliases.has(op)) return op;
      const {
        quotativeClosure: _quotativeClosure,
        quotativeMood: _quotativeMood,
        cognitiveComplementParticle: _cognitiveComplementParticle,
        ...conditional
      } = op;
      return {
        ...conditional,
        connective: "conditional" as const,
        conditionalFlavor: op.conditionalFlavor ?? "plain",
      };
    });
    return { ...root, tail: { ...root.tail, ops } };
  }
};

const QUOTE_INTERNAL_LISTING_TE_RECORD: ProductionRecord = {
  id: "quote_internal_listing_te",
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
        id: "internal_connective",
        role: "core",
        patterns: QUOTE_INTERNAL_CONNECTIVE_PATTERNS,
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "quote_residual",
        role: "wrapper",
        patterns: QUOTE_INTERNAL_RESIDUAL_PATTERNS,
        cardinality: { min: 0, max: null }
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
  },
  conditions: { clause: { intakeSites: QUOTE_RECORD_INTAKE_SITES } },
  normalization: quoteInternalConnectiveNormalization(),
  loweringKey: "normalized_root"
};

function conditionalQuoteRecord(options: {
  readonly id: string;
  readonly terminal: "quote" | "hostless_quote" | "wish";
  readonly negatedToAlias?: boolean;
}): ProductionRecord {
  const hostless = options.terminal === "hostless_quote";
  const terminalPattern: ProductionOpPattern = options.terminal === "wish"
    ? productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["wish_complement"]
      })
    : productionOpPattern("connective", "connective_fields", hostless
      ? {
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["to"],
          quotativeClosureIn: ["hostless_source_terminal"]
        }
      : {
          connectiveIn: ["quotative", "question_quotative"],
          quotativeClosureNotIn: ["hostless_source_terminal"]
        });
  const prefix: ProductionOpSlot = {
    id: "predicate_prefix",
    role: "wrapper",
    patterns: NON_CONNECTIVE_OP_PATTERNS,
    cardinality: { min: 0, max: null }
  };
  const conditionalSlots: readonly ProductionOpSlot[] = options.negatedToAlias === true
    ? [
        {
          id: "conditional_negation",
          role: "core",
          patterns: [{ kind: "negation" }],
          cardinality: { min: 1, max: 1 }
        },
        {
          id: "conditional_alias",
          role: "core",
          patterns: [productionOpPattern("connective", "connective_fields", {
            connectiveIn: ["quotative"],
            conditionalFlavor: "absent",
            conditionalQuoteEllipsisNotIn: ["prohibitive_concern"]
          })],
          cardinality: { min: 1, max: 1 }
        }
      ]
    : [{
        id: "conditional",
        role: "core",
        patterns: [productionOpPattern("connective", "typed_conditional_quote", {})],
        cardinality: { min: 1, max: 1 }
      }];
  return {
    id: options.id,
    shape: {
      root: "aux_layer",
      ops: [
        prefix,
        ...conditionalSlots,
        {
          id: hostless ? "quote" : options.terminal,
          role: "core",
          patterns: [terminalPattern],
          cardinality: { min: 1, max: 1 }
        }
      ]
    },
    conditions: {
      ...(hostless
        ? { terminal: { kinds: [null] as const, sfp: "forbidden" as const } }
        : {}),
      clause: {
        intakeSites: hostless
          ? HOSTLESS_QUOTE_RECORD_INTAKE_SITES
          : QUOTE_RECORD_INTAKE_SITES
      }
    },
    normalization: CONDITIONAL_QUOTE_TERMINAL_NORMALIZATION,
    loweringKey: options.terminal === "wish"
      ? "conditional_wish_complement"
      : "conditional_quote_terminal"
  };
}

const HOSTLESS_CONDITIONAL_QUOTE_RECORD = conditionalQuoteRecord({
  id: "hostless_conditional_quote",
  terminal: "hostless_quote"
});

const HOSTLESS_CONDITIONAL_QUOTE_ALIAS_RECORD = conditionalQuoteRecord({
  id: "hostless_conditional_quote_negated_to_alias",
  terminal: "hostless_quote",
  negatedToAlias: true
});

const CONDITIONAL_HOSTED_QUOTE_RECORD = conditionalQuoteRecord({
  id: "conditional_hosted_quote",
  terminal: "quote"
});

const CONDITIONAL_HOSTED_QUOTE_ALIAS_RECORD = conditionalQuoteRecord({
  id: "conditional_hosted_quote_negated_to_alias",
  terminal: "quote",
  negatedToAlias: true
});

const CONDITIONAL_WISH_COMPLEMENT_RECORD = conditionalQuoteRecord({
  id: "conditional_wish_complement",
  terminal: "wish"
});

const CONDITIONAL_WISH_COMPLEMENT_ALIAS_RECORD = conditionalQuoteRecord({
  id: "conditional_wish_complement_negated_to_alias",
  terminal: "wish",
  negatedToAlias: true
});

function copulaConditionalQuoteRecord(options: {
  readonly id: string;
  readonly terminal: "hosted_quote" | "hostless_quote" | "wish";
}): ProductionRecord {
  const terminalPattern: ProductionOpPattern = options.terminal === "wish"
    ? productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["wish_complement"]
      })
    : productionOpPattern(
        "connective",
        "connective_fields",
        options.terminal === "hostless_quote"
          ? {
              connectiveIn: ["quotative"],
              surfaceAllomorphIn: ["to"],
              quotativeClosureIn: ["hostless_source_terminal"]
            }
          : {
              connectiveIn: ["quotative", "question_quotative"],
              quotativeClosureNotIn: ["hostless_source_terminal"]
            }
      );
  return {
    id: options.id,
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
          id: "conditional_copula",
          role: "core",
          patterns: [productionOpPattern("copula", "copula_fields", {
            variantIn: ["conditional_nara"],
            polarityIn: ["affirmative"]
          })],
          cardinality: { min: 1, max: 1 }
        },
        {
          id: "quote",
          role: "core",
          patterns: [terminalPattern],
          cardinality: { min: 1, max: 1 }
        }
      ]
    },
    conditions: {
      ...(options.terminal === "hostless_quote"
        ? { terminal: { kinds: [null] as const, sfp: "forbidden" as const } }
        : {}),
      clause: {
        intakeSites: options.terminal === "hostless_quote"
          ? HOSTLESS_QUOTE_RECORD_INTAKE_SITES
          : options.terminal === "hosted_quote"
            ? HOSTLESS_QUOTE_RECORD_INTAKE_SITES
            : QUOTE_RECORD_INTAKE_SITES
      }
    },
    normalization: CONDITIONAL_QUOTE_TERMINAL_NORMALIZATION,
    loweringKey: options.terminal === "wish"
      ? "conditional_wish_complement"
      : "conditional_quote_terminal"
  };
}

const COPULA_CONDITIONAL_HOSTED_QUOTE_RECORD = copulaConditionalQuoteRecord({
  id: "copula_conditional_hosted_quote",
  terminal: "hosted_quote"
});

const COPULA_CONDITIONAL_HOSTLESS_QUOTE_RECORD = copulaConditionalQuoteRecord({
  id: "copula_conditional_hostless_quote",
  terminal: "hostless_quote"
});

const COPULA_CONDITIONAL_WISH_COMPLEMENT_RECORD = copulaConditionalQuoteRecord({
  id: "copula_conditional_wish_complement",
  terminal: "wish"
});

const CONDITIONAL_QUOTE_RECORD_IDS = new Set([
  CONDITIONAL_HOSTED_QUOTE_RECORD.id,
  CONDITIONAL_HOSTED_QUOTE_ALIAS_RECORD.id,
  CONDITIONAL_WISH_COMPLEMENT_RECORD.id,
  CONDITIONAL_WISH_COMPLEMENT_ALIAS_RECORD.id,
  COPULA_CONDITIONAL_HOSTED_QUOTE_RECORD.id,
  COPULA_CONDITIONAL_WISH_COMPLEMENT_RECORD.id
]);

const NOUN_COPULA_REASON_QUOTE_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      role: "core",
      patterns: [productionOpPattern("copula", "copula_fields", {
        variantIn: ["basic"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "copula_wrappers",
      role: "wrapper",
      patterns: [
        { kind: "tense" },
        { kind: "negation" },
        { kind: "polite" },
        { kind: "classicalAuxResidue" }
      ],
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
      id: "quote",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["quotative"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const DROP_NOUN_COPULA_REASON_BEFORE_QUOTE: ProductionNormalization = {
  id: "drop_noun_copula_reason_before_quote",
  normalize: ({ root, match }) => {
    if (root.tail.kind !== "auxLayer") return root;
    const reason = match.shape.slots.get("reason")?.[0];
    return reason === undefined
      ? root
      : { ...root, tail: { ...root.tail, ops: root.tail.ops.filter((op) => op !== reason) } };
  }
};

function nounCopulaReasonQuoteRecord(
  id: string,
  intakeSite: "quote_prefix" | "committed_render",
  partial: boolean,
): ProductionRecord {
  return {
    id,
    shape: NOUN_COPULA_REASON_QUOTE_SHAPE,
    conditions: {
      host: { projectionCategories: ["nominal", "adjectival_predicate"] },
      terminal: { kinds: [null] },
      clause: { intakeSites: [intakeSite], partial }
    },
    normalization: DROP_NOUN_COPULA_REASON_BEFORE_QUOTE,
    loweringKey: "normalized_root"
  };
}

const NOUN_COPULA_REASON_QUOTE_PREFIX_RECORD = nounCopulaReasonQuoteRecord(
  "noun_copula_reason_quote_prefix",
  "quote_prefix",
  true
);

const NOUN_COPULA_REASON_QUOTE_RENDER_RECORD = nounCopulaReasonQuoteRecord(
  "noun_copula_reason_quote_render",
  "committed_render",
  false
);

export function isConditionalQuoteProductionMatch(
  match: ProductionRegistryMatch
): boolean {
  return match.familyId === "quote_mid_chain" &&
    CONDITIONAL_QUOTE_RECORD_IDS.has(match.record.id);
}

export const QUOTE_MID_CHAIN_FAMILY: ProductionFamily = {
  id: "quote_mid_chain",
  claimDomains: [QUOTE_MID_CHAIN_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    QUOTE_SEQUENCE_DEPENDENCIES,
    QUOTE_OP_DEPENDENCIES,
    { projectionCategories: ["nominal", "adjectival_predicate"] },
    [
      { kind: "terminal_membership", values: [null] },
      { kind: "terminal_membership", values: ["attributive", "nominalized"] }
    ]
  ),
  claim: QUOTE_MID_CHAIN_CLAIM,
  records: [
    HOSTLESS_CONDITIONAL_QUOTE_RECORD,
    HOSTLESS_CONDITIONAL_QUOTE_ALIAS_RECORD,
    CONDITIONAL_HOSTED_QUOTE_RECORD,
    CONDITIONAL_HOSTED_QUOTE_ALIAS_RECORD,
    CONDITIONAL_WISH_COMPLEMENT_RECORD,
    CONDITIONAL_WISH_COMPLEMENT_ALIAS_RECORD,
    COPULA_CONDITIONAL_HOSTED_QUOTE_RECORD,
    COPULA_CONDITIONAL_HOSTLESS_QUOTE_RECORD,
    COPULA_CONDITIONAL_WISH_COMPLEMENT_RECORD,
    QUOTE_INTERNAL_LISTING_TE_RECORD,
    NOUN_COPULA_REASON_QUOTE_PREFIX_RECORD,
    NOUN_COPULA_REASON_QUOTE_RENDER_RECORD
  ],
  nonAdmission: "split"
};




const EMBEDDED_QUESTION_PREFIX_SHAPE: ProductionShape = {
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

export const EMBEDDED_QUESTION_MID_CHAIN_FAMILY: ProductionFamily = {
  id: "embedded_question_mid_chain",
  claimState: "invariant",
  claimDomains: [FINAL_CONNECTIVE_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    EMBEDDED_QUESTION_SEQUENCE_DEPENDENCIES,
    EMBEDDED_QUESTION_OP_DEPENDENCIES,
    { projectionCategories: ["nominal"] }
  ),
  claim: EMBEDDED_QUESTION_MID_CHAIN_CLAIM,
  records: [
    {
      id: "embedded_question_chain_final_prefix",
      shape: EMBEDDED_QUESTION_PREFIX_SHAPE,
      conditions: {
        clause: { intakeSites: ["quote_prefix"], partial: true }
      },
      loweringKey: "normalized_root"
    },
    {
      id: "embedded_question_legacy_render",
      shape: CARRIER_CONTEXT_RENDER_SHAPE,
      conditions: {
        clause: { intakeSites: ["committed_render"], partial: false }
      },
      loweringKey: "carrier_context_legacy"
    }
  ],
  nonAdmission: "split"
};
