import type { AuxOpKind } from "../grammar.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { PLAIN_PREDICATE_TERMINAL_CLAIM, NOUN_COPULA_ADVERBIAL_MODIFIER_CLAIM, PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_CLAIM, PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_CLAIM, NOUN_COPULA_TERMINAL_CLAIM, BARE_NOMINAL_TERMINAL_CLAIM, PREDICATE_COPULA_PROJECTION_TERMINAL_CLAIM, NOMINAL_COPULA_PROJECTION_TERMINAL_CLAIM, PLAIN_PREDICATE_SEMANTIC_OPERATOR_TERMINAL_CLAIM, NOUN_COPULA_SEMANTIC_OPERATOR_TERMINAL_CLAIM, BARE_NOMINAL_SEMANTIC_OPERATOR_TERMINAL_CLAIM, PREDICATE_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_CLAIM, NOMINAL_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDependencies, ProductionFamilyClaimOpDependency, ProductionFamilyClaimSequenceAggregateDependency, ProductionOpPattern, ProductionRecord } from "../production-registry.js";
import { claimDependencies } from "./shared.js";
import { COPULA_SUFFIX_RANGE, CLAUSE_CHAIN_BASIC_OP_KINDS, CLAUSE_CHAIN_BASIC_OP_PATTERNS, basicOpKindsAggregate, clauseConnectivePrefixRange, CLAUSE_CHAIN_SEMANTIC_OP_KINDS, CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS, CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS, semanticClauseChainAggregates, CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS, CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS, copulaProjectionChainAggregates, VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS, COPULA_CLAUSE_CHAIN_HOST_CONDITIONS, BARE_NOMINAL_CLAUSE_CHAIN_HOST_CONDITIONS } from "./chain-patterns.js";


const ADVERBIAL_MODIFIER_HOST_CONDITIONS = {
  stemKinds: ["noun", "adj", "verb", "candidateSet", "adverb"],
  sourceShapes: ["na_adjective", "nominal", "particle_phrase", "lexical_adverb"]
} as const satisfies ProductionRecord["conditions"]["host"];

const I_ADJECTIVE_ADVERBIAL_MODIFIER_HOST_CONDITIONS = {
  stemKinds: ["adj", "verb", "candidateSet", "adverb"],
  sourceShapes: ["i_adjective"]
} as const satisfies ProductionRecord["conditions"]["host"];

const PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_HOST_CONDITIONS = {
  stemKinds: ["verb", "adj", "noun", "candidateSet"],
  sourceShapes: ["verb", "sahen_verbalization", "i_adjective", "na_adjective", "nominal"]
} as const satisfies ProductionRecord["conditions"]["host"];

const TERMINAL_CHAIN_BASIC_COPULA_OP_KINDS = [
  ...CLAUSE_CHAIN_BASIC_OP_KINDS,
  "copula"
] as const satisfies readonly AuxOpKind[];

const TERMINAL_CHAIN_BASIC_COPULA_OP_PATTERNS = [
  ...CLAUSE_CHAIN_BASIC_OP_PATTERNS,
  { kind: "copula" }
] as const satisfies readonly ProductionOpPattern[];

const terminalCopulaProjectionAggregates = (
  idPrefix: string,
  ranges: {
    readonly copula?: ProductionFamilyClaimSequenceAggregateDependency["range"];
    readonly copulaId?: string;
  } = {}
) => {
  const copulaScope = ranges.copula === undefined ? {} : { range: ranges.copula };
  return [
    {
      id: `${idPrefix}_kinds`,
      kind: "every_kind_in",
      opKinds: TERMINAL_CHAIN_BASIC_COPULA_OP_KINDS
    },
    {
      id: `${idPrefix}_${ranges.copulaId ?? "copula_present"}`,
      kind: "some_kind",
      opKinds: ["copula"],
      ...copulaScope
    }
  ] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];
};

const ADVERBIAL_MODIFIER_CLAIM_TERMINAL_DEPENDENCIES = [
  { kind: "terminal_membership", values: ["adverbial_modifier"] },
  { kind: "sfp_presence" }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

const TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES = [
  { kind: "terminal_membership", values: [null] },
  { kind: "sfp_presence" }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

export const PLAIN_PREDICATE_TERMINAL_FAMILY: ProductionFamily = {
  id: "plain_predicate_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "plain_predicate_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: [basicOpKindsAggregate("plain_predicate_terminal_basic_kinds")],
        familyClaimRefs: [
          { familyId: "quotative_insistent_terminal", polarity: "excludes" },
          { familyId: "request_terminal_boundary", polarity: "excludes" },
          { familyId: "source_verbal_adjectival_desiderative", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_TERMINAL_CLAIM,
  records: [
    {
      id: "plain_predicate_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "basic",
            role: "core",
            patterns: CLAUSE_CHAIN_BASIC_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_TERMINAL_FAMILY: ProductionFamily = {
  id: "noun_copula_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "noun_copula_terminal",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: [
          basicOpKindsAggregate("noun_copula_terminal_basic_kinds", COPULA_SUFFIX_RANGE)
        ],
        familyClaimRefs: [
          { familyId: "copular_te_hoshii", polarity: "excludes" },
          { familyId: "copular_benefactive_request", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_TERMINAL_CLAIM,
  records: [
    {
      id: "noun_copula_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [{ kind: "copula" }],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "basic",
            role: "core",
            patterns: CLAUSE_CHAIN_BASIC_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_ADVERBIAL_MODIFIER_FAMILY: ProductionFamily = {
  id: "noun_copula_adverbial_modifier",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "noun_copula_adverbial_modifier",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 0, max: 1 } },
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [0],
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: [
          basicOpKindsAggregate("noun_copula_adverbial_modifier_basic_kinds", COPULA_SUFFIX_RANGE)
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      ADVERBIAL_MODIFIER_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_ADVERBIAL_MODIFIER_CLAIM,
  records: [
    {
      id: "noun_copula_adverbial_modifier",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [{ kind: "copula" }],
            cardinality: { min: 0, max: 1 }
          },
          {
            id: "basic",
            role: "core",
            patterns: CLAUSE_CHAIN_BASIC_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          }
        ]
      },
      conditions: {
        host: ADVERBIAL_MODIFIER_HOST_CONDITIONS,
        terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
      },
      loweringKey: "adverbial_modifier_render"
    },
    {
      id: "i_adjective_adverbial_modifier",
      shape: { root: "aux_layer", ops: [] },
      conditions: {
        host: I_ADJECTIVE_ADVERBIAL_MODIFIER_HOST_CONDITIONS,
        terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
      },
      loweringKey: "adverbial_modifier_render"
    }
  ],
  nonAdmission: "reject"
};

const PREDICATE_APPEARANCE_PREFIX_OP_PATTERNS = [
  ...CLAUSE_CHAIN_BASIC_OP_PATTERNS,
  { kind: "predicateSuffix" }
] as const satisfies readonly ProductionOpPattern[];

const PREDICATE_APPEARANCE_PREFIX_OP_KINDS: readonly AuxOpKind[] =
  PREDICATE_APPEARANCE_PREFIX_OP_PATTERNS.map((pattern) => pattern.kind);

export const PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_FAMILY: ProductionFamily = {
  id: "predicate_appearance_adverbial_modifier",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "predicate_appearance_adverbial_modifier",
      root: "aux_layer",
      ops: [
        {
          id: "prefix",
          opKinds: [...PREDICATE_APPEARANCE_PREFIX_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        { id: "appearance", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: [
          {
            id: "predicate_appearance_adverbial_modifier_prefix_kinds",
            kind: "every_kind_in",
            opKinds: PREDICATE_APPEARANCE_PREFIX_OP_KINDS,
            range: clauseConnectivePrefixRange(0)
          }
        ]
      },
      [
        {
          kind: "modal",
          fields: ["modal", "reading", "polite", "past", "inner"]
        }
      ],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      ADVERBIAL_MODIFIER_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_CLAIM,
  records: [
    {
      id: "predicate_appearance_adverbial_modifier",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "prefix",
            role: "core",
            patterns: PREDICATE_APPEARANCE_PREFIX_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "appearance",
            role: "core",
            patterns: [productionOpPattern("modal", "souda_hearsay_modal_fields", {
              readingIn: ["yotai"],
              inner: "absent"
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_HOST_CONDITIONS,
        terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
      },
      loweringKey: "adverbial_modifier_render"
    }
  ],
  nonAdmission: "reject"
};

const PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_HOST_CONDITIONS = {
  stemKinds: ["verb", "candidateSet"],
  sourceShapes: ["verb", "sahen_verbalization"]
} as const satisfies ProductionRecord["conditions"]["host"];

export const PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_FAMILY: ProductionFamily = {
  id: "predicate_projection_carrier_adverbial_modifier",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "predicate_projection_carrier_adverbial_modifier",
      root: "aux_layer",
      ops: [
        {
          id: "prefix",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        { id: "carrier", opKinds: ["predicateProjectionCarrier"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: [
          {
            id: "predicate_projection_carrier_adverbial_modifier_prefix_kinds",
            kind: "every_kind_in",
            opKinds: CLAUSE_CHAIN_BASIC_OP_KINDS,
            range: clauseConnectivePrefixRange(0)
          }
        ]
      },
      [
        {
          kind: "predicateProjectionCarrier",
          fields: ["carrier"]
        }
      ],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      ADVERBIAL_MODIFIER_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_CLAIM,
  records: [
    {
      id: "predicate_projection_carrier_adverbial_modifier",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "prefix",
            role: "core",
            patterns: CLAUSE_CHAIN_BASIC_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "carrier",
            role: "core",
            patterns: [productionOpPattern("predicateProjectionCarrier", "predicate_projection_carrier_fields", {
              carrierIn: ["imminent_nbakari"]
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_HOST_CONDITIONS,
        terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
      },
      loweringKey: "adverbial_modifier_render"
    }
  ],
  nonAdmission: "reject"
};

export const BARE_NOMINAL_TERMINAL_FAMILY: ProductionFamily = {
  id: "bare_nominal_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "bare_nominal_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: [basicOpKindsAggregate("bare_nominal_terminal_basic_kinds")],
        familyClaimRefs: [
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: BARE_NOMINAL_TERMINAL_CLAIM,
  records: [
    {
      id: "bare_nominal_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "basic",
            role: "core",
            patterns: CLAUSE_CHAIN_BASIC_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          }
        ]
      },
      conditions: {
        host: BARE_NOMINAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

export const PREDICATE_COPULA_PROJECTION_TERMINAL_FAMILY: ProductionFamily = {
  id: "predicate_copula_projection_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "predicate_copula_projection_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...TERMINAL_CHAIN_BASIC_COPULA_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: terminalCopulaProjectionAggregates(
          "predicate_copula_projection_terminal"
        ),
        familyClaimRefs: [
          { familyId: "predicate_copula_negative_confirm", polarity: "excludes" },
          { familyId: "predicate_copula_progressive_confirm", polarity: "excludes" },
          { familyId: "volitional_negative_invite", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_COPULA_PROJECTION_TERMINAL_CLAIM,
  records: [
    {
      id: "predicate_copula_projection_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: TERMINAL_CHAIN_BASIC_COPULA_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOMINAL_COPULA_PROJECTION_TERMINAL_FAMILY: ProductionFamily = {
  id: "nominal_copula_projection_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "nominal_copula_projection_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...TERMINAL_CHAIN_BASIC_COPULA_OP_KINDS],
          cardinality: { min: 2, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: terminalCopulaProjectionAggregates(
          "nominal_copula_projection_terminal",
          { copula: COPULA_SUFFIX_RANGE, copulaId: "suffix_copula_present" }
        ),
        familyClaimRefs: [
          { familyId: "predicate_copula_progressive_confirm", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOMINAL_COPULA_PROJECTION_TERMINAL_CLAIM,
  records: [
    {
      id: "nominal_copula_projection_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: TERMINAL_CHAIN_BASIC_COPULA_OP_PATTERNS,
            cardinality: { min: 2, max: null }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

const COPULA_HOST_SEMANTIC_OP_KINDS = [
  "modal",
  "desire",
  "idiom",
  "postverbAuxiliary",
  "scopeBridge",
  "conjecture",
  "predicateQuoteCarrier",
  "predicateProjectionCarrier"
] as const satisfies readonly AuxOpKind[];

const _copulaHostSemanticOpSubset: readonly (
  (typeof CLAUSE_CHAIN_SEMANTIC_OP_KINDS)[number]
)[] = COPULA_HOST_SEMANTIC_OP_KINDS;
void _copulaHostSemanticOpSubset;

const COPULA_HOST_COPULA_PATTERN: ProductionOpPattern = productionOpPattern(
  "copula",
  "copula_fields",
  { variantIn: ["basic", "conjecture"] }
);

const COPULA_HOST_SEMANTIC_CHAIN_OP_KINDS = [
  ...CLAUSE_CHAIN_BASIC_OP_KINDS,
  ...COPULA_HOST_SEMANTIC_OP_KINDS
] as const satisfies readonly AuxOpKind[];

const COPULA_HOST_SEMANTIC_CHAIN_OP_PATTERNS = [
  ...CLAUSE_CHAIN_BASIC_OP_PATTERNS,
  { kind: "modal" },
  { kind: "desire" },
  { kind: "idiom" },
  { kind: "postverbAuxiliary" },
  { kind: "scopeBridge" },
  { kind: "conjecture" },
  { kind: "predicateQuoteCarrier" },
  { kind: "predicateProjectionCarrier" }
] as const satisfies readonly ProductionOpPattern[];

const COPULA_HOST_PROJECTION_OP_KINDS = [
  ...COPULA_HOST_SEMANTIC_CHAIN_OP_KINDS,
  "copula"
] as const satisfies readonly AuxOpKind[];

const COPULA_HOST_PROJECTION_OP_PATTERNS = [
  ...COPULA_HOST_SEMANTIC_CHAIN_OP_PATTERNS,
  COPULA_HOST_COPULA_PATTERN
] as const satisfies readonly ProductionOpPattern[];

const copulaHostPayloadAggregates = (
  idPrefix: string
): readonly ProductionFamilyClaimSequenceAggregateDependency[] => [
  {
    id: `${idPrefix}_copula_variant`,
    kind: "every_filtered_pattern",
    pattern: COPULA_HOST_COPULA_PATTERN,
    requireAtLeastOne: false
  }
];

const copulaHostSemanticAggregates = (
  idPrefix: string,
  range?: ProductionFamilyClaimSequenceAggregateDependency["range"]
): readonly ProductionFamilyClaimSequenceAggregateDependency[] => {
  const scope = range === undefined ? {} : { range };
  return [
    {
      id: `${idPrefix}_kinds`,
      kind: "every_kind_in",
      opKinds: COPULA_HOST_SEMANTIC_CHAIN_OP_KINDS,
      ...scope
    },
    {
      id: `${idPrefix}_semantic_present`,
      kind: "some_kind",
      opKinds: COPULA_HOST_SEMANTIC_OP_KINDS,
      ...scope
    },
    ...copulaHostPayloadAggregates(idPrefix)
  ];
};

const copulaHostProjectionAggregates = (
  idPrefix: string,
  copulaRange: NonNullable<ProductionFamilyClaimSequenceAggregateDependency["range"]>,
  copulaId: string
): readonly ProductionFamilyClaimSequenceAggregateDependency[] => [
  {
    id: `${idPrefix}_kinds`,
    kind: "every_kind_in",
    opKinds: COPULA_HOST_PROJECTION_OP_KINDS
  },
  {
    id: `${idPrefix}_${copulaId}`,
    kind: "some_kind",
    opKinds: ["copula"],
    range: copulaRange
  },
  {
    id: `${idPrefix}_semantic_present`,
    kind: "some_kind",
    opKinds: COPULA_HOST_SEMANTIC_OP_KINDS
  },
  ...copulaHostPayloadAggregates(idPrefix)
];

const COPULA_HOST_CLAIM_OP_DEPENDENCIES = [
  { kind: "copula", fields: ["variant"] }
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const NOMINAL_COPULA_PROJECTION_SEMANTIC_HOST_CONDITIONS = {
  stemKinds: ["adj", "verb", "candidateSet"],
  sourceShapes: ["na_adjective", "nominal", "particle_phrase", "lexical_adverb"]
} as const satisfies ProductionRecord["conditions"]["host"];

const terminalCopulaProjectionSemanticAggregates = (
  idPrefix: string,
  ranges: {
    readonly copula?: ProductionFamilyClaimSequenceAggregateDependency["range"];
    readonly copulaId?: string;
  } = {}
) => [
  ...copulaProjectionChainAggregates(idPrefix, ranges),
  {
    id: `${idPrefix}_semantic_present`,
    kind: "some_kind",
    opKinds: CLAUSE_CHAIN_SEMANTIC_OP_KINDS
  }
] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];

export const PLAIN_PREDICATE_SEMANTIC_OPERATOR_TERMINAL_FAMILY: ProductionFamily = {
  id: "plain_predicate_semantic_operator_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "plain_predicate_semantic_operator_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: semanticClauseChainAggregates("plain_semantic_terminal"),
        familyClaimRefs: [
          { familyId: "benefactive_noda_terminal", polarity: "excludes" },
          { familyId: "predicate_copula_negative_confirm", polarity: "excludes" },
          { familyId: "reinforced_potential_composition", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  records: [
    {
      id: "plain_predicate_semantic_operator_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_SEMANTIC_OPERATOR_TERMINAL_FAMILY: ProductionFamily = {
  id: "noun_copula_semantic_operator_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "noun_copula_semantic_operator_terminal",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "chain",
          opKinds: [...COPULA_HOST_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: copulaHostSemanticAggregates(
          "noun_copula_semantic_terminal",
          COPULA_SUFFIX_RANGE
        ),
        familyClaimRefs: [
          { familyId: "benefactive_noda_terminal", polarity: "excludes" },
          { familyId: "noun_copula_desire", polarity: "excludes" },
          { familyId: "noun_copula_forbidden", polarity: "excludes" },
          { familyId: "noun_copula_permission", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      COPULA_HOST_CLAIM_OP_DEPENDENCIES,
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  records: [
    {
      id: "noun_copula_semantic_operator_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [COPULA_HOST_COPULA_PATTERN],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "chain",
            role: "core",
            patterns: COPULA_HOST_SEMANTIC_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

export const BARE_NOMINAL_SEMANTIC_OPERATOR_TERMINAL_FAMILY: ProductionFamily = {
  id: "bare_nominal_semantic_operator_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "bare_nominal_semantic_operator_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: semanticClauseChainAggregates("bare_nominal_semantic_terminal"),
        familyClaimRefs: [
          { familyId: "benefactive_noda_terminal", polarity: "excludes" },
          { familyId: "copular_te_hoshii", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: BARE_NOMINAL_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  records: [
    {
      id: "bare_nominal_semantic_operator_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: BARE_NOMINAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

export const PREDICATE_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_FAMILY: ProductionFamily = {
  id: "predicate_copula_projection_semantic_operator_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "predicate_copula_projection_semantic_operator_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 2, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: terminalCopulaProjectionSemanticAggregates(
          "predicate_copula_projection_semantic_terminal"
        ),
        familyClaimRefs: [
          { familyId: "benefactive_noda_terminal", polarity: "excludes" },
          { familyId: "predicate_copula_negative_confirm", polarity: "excludes" },
          { familyId: "predicate_copula_progressive_confirm", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  records: [
    {
      id: "predicate_copula_projection_semantic_operator_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 2, max: null }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOMINAL_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_FAMILY: ProductionFamily = {
  id: "nominal_copula_projection_semantic_operator_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "nominal_copula_projection_semantic_operator_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...COPULA_HOST_PROJECTION_OP_KINDS],
          cardinality: { min: 2, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: copulaHostProjectionAggregates(
          "nominal_copula_projection_semantic_terminal",
          COPULA_SUFFIX_RANGE,
          "suffix_copula_present"
        ),
        familyClaimRefs: [
          { familyId: "predicate_copula_progressive_confirm", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      COPULA_HOST_CLAIM_OP_DEPENDENCIES,
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOMINAL_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  records: [
    {
      id: "nominal_copula_projection_semantic_operator_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: COPULA_HOST_PROJECTION_OP_PATTERNS,
            cardinality: { min: 2, max: null }
          }
        ]
      },
      conditions: {
        host: NOMINAL_COPULA_PROJECTION_SEMANTIC_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};
