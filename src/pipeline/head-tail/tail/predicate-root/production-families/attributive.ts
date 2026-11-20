import type { AuxOpKind, HeadProjectionKind } from "../grammar.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { NOUN_COPULA_BARE_ATTRIBUTIVE_CLAIM, NOUN_COPULA_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM, NOMINAL_FOCUS_PREFIX_ATTRIBUTIVE_CLAIM, NOMINAL_EXPLICIT_NO_ATTRIBUTIVE_CLAIM, NOMINAL_BARE_ATTRIBUTIVE_CLAIM, KEIJOUJI_BARE_ATTRIBUTIVE_CLAIM, NOUN_COPULA_SEMANTIC_OPERATOR_ATTRIBUTIVE_CLAIM, NOUN_COPULA_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM, ATTRIBUTIVE_HOST_STEM_KINDS, ATTRIBUTIVE_HOST_SOURCE_SHAPES, ATTRIBUTIVE_COPULA_LANE_SOURCE_SHAPES, NOUN_COPULA_BARE_ATTRIBUTIVE_COPULA_VARIANTS, PLAIN_PREDICATE_OPERATOR_CHAIN_ATTRIBUTIVE_CLAIM, NOUN_COPULA_OPERATOR_CHAIN_ATTRIBUTIVE_CLAIM, COPULA_PROJECTION_ATTRIBUTIVE_CLAIM, PLAIN_PREDICATE_ATTRIBUTIVE_CLAIM, PLAIN_PREDICATE_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM, PLAIN_PREDICATE_SEMANTIC_OPERATOR_ATTRIBUTIVE_CLAIM, PLAIN_PREDICATE_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDependencies, ProductionFamilyClaimSequenceAggregateDependency, ProductionOpPattern, ProductionOpSlot, ProductionRecord } from "../production-registry.js";
import { TENSE_CLAIM_DEPENDENCY, claimDependencies, SEMANTIC_OPERATOR_OP_KINDS } from "./shared.js";
import { COPULA_SUFFIX_RANGE } from "./chain-patterns.js";

const PLAIN_ATTRIBUTIVE_CORE_OP_PATTERNS = [
  productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] }),
  { kind: "aspect" },
  { kind: "voice" },
  { kind: "negation" },
  { kind: "polite" }
] as const satisfies readonly ProductionOpPattern[];

const PLAIN_ATTRIBUTIVE_CORE_OP_KINDS = [
  "tense",
  "aspect",
  "voice",
  "negation",
  "polite"
] as const satisfies readonly AuxOpKind[];

const PLAIN_ATTRIBUTIVE_SEQUENCE_AGGREGATES = [
  {
    id: "plain_attributive_core_kinds",
    kind: "every_kind_in",
    opKinds: PLAIN_ATTRIBUTIVE_CORE_OP_KINDS
  },
  {
    id: "plain_attributive_core_tense_past",
    kind: "every_filtered_pattern",
    pattern: productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] }),
    requireAtLeastOne: false
  }
] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];

const ATTRIBUTIVE_TERMINAL_CONDITIONS = {
  kinds: ["attributive"],
  sfp: "any"
} as const satisfies NonNullable<ProductionFamily["conditions"]>["terminal"];

export const PLAIN_PREDICATE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "plain_predicate_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "plain_predicate_attributive",
      root: "aux_layer",
      ops: [
        {
          id: "core",
          opKinds: [...PLAIN_ATTRIBUTIVE_CORE_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: PLAIN_ATTRIBUTIVE_SEQUENCE_AGGREGATES
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "plain_predicate_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "core",
            role: "core",
            patterns: PLAIN_ATTRIBUTIVE_CORE_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          }
        ]
      },
      conditions: {
        host: {
          stemKinds: ["verb", "adj", "noun", "candidateSet"],
          sourceShapes: ["verb", "i_adjective", "sahen_verbalization"]
        },
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "plain_predicate_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

const NOUN_COPULA_BARE_ATTRIBUTIVE_COPULA_PATTERN = productionOpPattern(
  "copula",
  "copula_fields",
  { variantIn: [...NOUN_COPULA_BARE_ATTRIBUTIVE_COPULA_VARIANTS] }
);

const NOUN_COPULA_BARE_ATTRIBUTIVE_SUFFIX_AGGREGATES = [
  {
    id: "noun_copula_bare_attributive_suffix_core_kinds",
    kind: "every_kind_in",
    opKinds: PLAIN_ATTRIBUTIVE_CORE_OP_KINDS,
    range: COPULA_SUFFIX_RANGE
  },
  {
    id: "noun_copula_bare_attributive_suffix_tense_past",
    kind: "every_filtered_pattern",
    pattern: productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] }),
    requireAtLeastOne: false,
    range: COPULA_SUFFIX_RANGE
  }
] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];

const SEMANTIC_OPERATOR_ATTRIBUTIVE_COPULA_HOST_CONDITIONS = {
  stemKinds: [...ATTRIBUTIVE_HOST_STEM_KINDS],
  sourceShapes: [...ATTRIBUTIVE_COPULA_LANE_SOURCE_SHAPES]
} as const satisfies NonNullable<ProductionRecord["conditions"]["host"]>;

export const NOUN_COPULA_BARE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "noun_copula_bare_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "noun_copula_bare_attributive",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "core",
          opKinds: [...PLAIN_ATTRIBUTIVE_CORE_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: NOUN_COPULA_BARE_ATTRIBUTIVE_SUFFIX_AGGREGATES
      },
      [{ kind: "copula", fields: ["variant"] }, TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_BARE_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "noun_copula_bare_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [NOUN_COPULA_BARE_ATTRIBUTIVE_COPULA_PATTERN],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "core",
            role: "core",
            patterns: PLAIN_ATTRIBUTIVE_CORE_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          }
        ]
      },
      conditions: {
        host: SEMANTIC_OPERATOR_ATTRIBUTIVE_COPULA_HOST_CONDITIONS,
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "noun_copula_bare_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOMINAL_FOCUS_PREFIX_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "nominal_focus_prefix_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: {
      ...ATTRIBUTIVE_TERMINAL_CONDITIONS,
      explicitAdnominalMarker: "forbidden",
      bareDirectAttributive: "forbidden"
    }
  },
  claimDomains: [
    {
      id: "nominal_focus_prefix_attributive",
      root: "aux_layer",
      ops: [],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      { lengthThresholds: [0] },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOMINAL_FOCUS_PREFIX_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "nominal_focus_prefix_attributive",
      shape: {
        root: "aux_layer",
        ops: []
      },
      conditions: {
        host: {
          stemKinds: ["noun", "candidateSet"],
          sourceShapes: ["nominal"]
        },
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "nominal_focus_prefix_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

const ATTRIBUTIVE_REALIZABLE_PROJECTION_KINDS = [
  "direct_adjectival",
  "projected_nominal_adjectival",
  "direct_verbal",
  "sahen_verbalized_nominal",
  "direct_nominal",
  "nominalized_predicate"
] as const satisfies readonly HeadProjectionKind[];

const EXPLICIT_ADNOMINAL_NO_REALIZABLE_PROJECTION_KINDS = [
  "direct_adjectival",
  "direct_verbal"
] as const satisfies readonly HeadProjectionKind[];

export const KEIJOUJI_BARE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "keijouji_bare_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "keijouji_bare_attributive",
      root: "aux_layer",
      ops: [],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      { lengthThresholds: [0] },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: KEIJOUJI_BARE_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "keijouji_bare_attributive",
      shape: {
        root: "aux_layer",
        ops: []
      },
      conditions: {
        host: {
          stemKinds: ["adj", "verb", "noun", "candidateSet"],
          sourceShapes: ["na_adjective"],
          projectionKinds: [...ATTRIBUTIVE_REALIZABLE_PROJECTION_KINDS],
          projectionKindMode: "any"
        },
        terminal: {
          ...ATTRIBUTIVE_TERMINAL_CONDITIONS,
          bareKeijoujiKatakanaRun: "forbidden",
          explicitAdnominalMarker: "forbidden"
        }
      },
      loweringKey: "keijouji_bare_attributive_render"
    },
    {
      id: "keijouji_explicit_no_attributive",
      shape: {
        root: "aux_layer",
        ops: []
      },
      conditions: {
        host: {
          stemKinds: ["adj", "verb", "noun", "candidateSet"],
          sourceShapes: ["na_adjective"],
          projectionKinds: [...EXPLICIT_ADNOMINAL_NO_REALIZABLE_PROJECTION_KINDS],
          projectionKindMode: "any"
        },
        terminal: {
          ...ATTRIBUTIVE_TERMINAL_CONDITIONS,
          bareKeijoujiKatakanaRun: "forbidden",
          explicitAdnominalMarker: "required"
        }
      },
      loweringKey: "keijouji_bare_attributive_render"
    },
    {
      id: "keijouji_bare_attributive_katakana",
      shape: {
        root: "aux_layer",
        ops: []
      },
      conditions: {
        host: {
          stemKinds: ["adj", "verb", "noun", "candidateSet"],
          sourceShapes: ["na_adjective"],
          projectionKinds: ["direct_nominal"],
          projectionKindMode: "any"
        },
        terminal: {
          ...ATTRIBUTIVE_TERMINAL_CONDITIONS,
          bareKeijoujiKatakanaRun: "required",
          explicitAdnominalMarker: "forbidden"
        }
      },
      loweringKey: "keijouji_bare_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOMINAL_EXPLICIT_NO_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "nominal_explicit_no_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: {
      ...ATTRIBUTIVE_TERMINAL_CONDITIONS,
      explicitAdnominalMarker: "required"
    }
  },
  claimDomains: [
    {
      id: "nominal_explicit_no_attributive",
      root: "aux_layer",
      ops: [],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      { lengthThresholds: [0] },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOMINAL_EXPLICIT_NO_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "nominal_explicit_no_attributive",
      shape: {
        root: "aux_layer",
        ops: []
      },
      conditions: {
        host: {
          stemKinds: ["adj", "verb", "noun", "candidateSet"],
          sourceShapes: ["nominal"],
          projectionKinds: [...EXPLICIT_ADNOMINAL_NO_REALIZABLE_PROJECTION_KINDS],
          projectionKindMode: "any"
        },
        terminal: {
          ...ATTRIBUTIVE_TERMINAL_CONDITIONS,
          explicitAdnominalMarker: "required"
        }
      },
      loweringKey: "keijouji_bare_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOMINAL_BARE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "nominal_bare_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: {
      ...ATTRIBUTIVE_TERMINAL_CONDITIONS,
      explicitAdnominalMarker: "forbidden",
      bareDirectAttributive: "required"
    }
  },
  claimDomains: [
    {
      id: "nominal_bare_attributive",
      root: "aux_layer",
      ops: [],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      { lengthThresholds: [0] },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOMINAL_BARE_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "nominal_bare_attributive",
      shape: {
        root: "aux_layer",
        ops: []
      },
      conditions: {
        host: {
          stemKinds: ["adj", "verb", "noun", "candidateSet"],
          sourceShapes: ["nominal"],
          projectionKinds: [...ATTRIBUTIVE_REALIZABLE_PROJECTION_KINDS],
          projectionKindMode: "any"
        },
        terminal: {
          ...ATTRIBUTIVE_TERMINAL_CONDITIONS,
          bareKeijoujiKatakanaRun: "forbidden",
          explicitAdnominalMarker: "forbidden",
          bareDirectAttributive: "required"
        }
      },
      loweringKey: "keijouji_bare_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

const quoteCarrierPrefixAggregates = (
  idPrefix: string,
  start: number
) => [
  {
    id: `${idPrefix}_prefix_core_kinds`,
    kind: "every_kind_in",
    opKinds: PLAIN_ATTRIBUTIVE_CORE_OP_KINDS,
    range: {
      start: { kind: "absolute", index: start },
      end: { kind: "relative", offset: -1 }
    }
  },
  {
    id: `${idPrefix}_prefix_tense_past`,
    kind: "every_filtered_pattern",
    pattern: productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] }),
    requireAtLeastOne: false,
    range: {
      start: { kind: "absolute", index: start },
      end: { kind: "relative", offset: -1 }
    }
  }
] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];

const QUOTE_CARRIER_ATTRIBUTIVE_SLOT_PATTERNS = [
  { kind: "predicateQuoteCarrier" }
] as const satisfies readonly ProductionOpPattern[];

export const PLAIN_PREDICATE_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "plain_predicate_quote_carrier_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "plain_predicate_quote_carrier_attributive",
      root: "aux_layer",
      ops: [
        {
          id: "core",
          opKinds: [...PLAIN_ATTRIBUTIVE_CORE_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        {
          id: "quote_carrier",
          opKinds: ["predicateQuoteCarrier"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: quoteCarrierPrefixAggregates("plain_quote_carrier", 0),
        familyClaimRefs: [
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "plain_predicate_quote_carrier_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "core",
            role: "core",
            patterns: PLAIN_ATTRIBUTIVE_CORE_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "quote_carrier",
            role: "core",
            patterns: QUOTE_CARRIER_ATTRIBUTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: {
          stemKinds: ["verb", "adj", "noun", "candidateSet"],
          sourceShapes: [
            "verb",
            "sahen_verbalization",
            "i_adjective",
            "na_adjective",
            "nominal"
          ]
        },
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "plain_predicate_quote_carrier_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "noun_copula_quote_carrier_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "noun_copula_quote_carrier_attributive",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "core",
          opKinds: [...PLAIN_ATTRIBUTIVE_CORE_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        {
          id: "quote_carrier",
          opKinds: ["predicateQuoteCarrier"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "relative", offset: -1 }
        ],
        aggregates: quoteCarrierPrefixAggregates("noun_copula_quote_carrier", 1)
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "noun_copula_quote_carrier_attributive",
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
            id: "core",
            role: "core",
            patterns: PLAIN_ATTRIBUTIVE_CORE_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "quote_carrier",
            role: "core",
            patterns: QUOTE_CARRIER_ATTRIBUTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: {
          stemKinds: ["verb", "adj", "noun", "candidateSet"],
          sourceShapes: [
            "verb",
            "sahen_verbalization",
            "i_adjective",
            "na_adjective",
            "nominal",
            "lexical_adverb"
          ]
        },
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "noun_copula_quote_carrier_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

const SEMANTIC_OPERATOR_ATTRIBUTIVE_OP_KINDS = [
  ...PLAIN_ATTRIBUTIVE_CORE_OP_KINDS,
  ...SEMANTIC_OPERATOR_OP_KINDS
] as const satisfies readonly AuxOpKind[];

const SEMANTIC_OPERATOR_ATTRIBUTIVE_OP_PATTERNS = [
  ...PLAIN_ATTRIBUTIVE_CORE_OP_PATTERNS,
  { kind: "modal" },
  { kind: "idiom" },
  { kind: "desire" },
  { kind: "postverbAuxiliary" }
] as const satisfies readonly ProductionOpPattern[];

const semanticOperatorAggregates = (
  idPrefix: string,
  start: number,
  endOffset: number
) => {
  const range = {
    start: { kind: "absolute", index: start },
    end: { kind: "relative", offset: endOffset }
  } as const;
  return [
    {
      id: `${idPrefix}_core_kinds`,
      kind: "every_kind_in",
      opKinds: SEMANTIC_OPERATOR_ATTRIBUTIVE_OP_KINDS,
      range
    },
    {
      id: `${idPrefix}_tense_past`,
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] }),
      requireAtLeastOne: false,
      range
    },
    {
      id: `${idPrefix}_present`,
      kind: "some_kind",
      opKinds: SEMANTIC_OPERATOR_OP_KINDS,
      range
    }
  ] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];
};

const SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST_CONDITIONS = {
  stemKinds: [...ATTRIBUTIVE_HOST_STEM_KINDS],
  sourceShapes: [...ATTRIBUTIVE_HOST_SOURCE_SHAPES]
} as const satisfies NonNullable<ProductionRecord["conditions"]["host"]>;

const SEMANTIC_OPERATOR_CORE_SLOT = {
  id: "core",
  role: "core",
  patterns: SEMANTIC_OPERATOR_ATTRIBUTIVE_OP_PATTERNS,
  cardinality: { min: 1, max: null }
} as const satisfies ProductionOpSlot;

export const PLAIN_PREDICATE_SEMANTIC_OPERATOR_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "plain_predicate_semantic_operator_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "plain_predicate_semantic_operator_attributive",
      root: "aux_layer",
      ops: [
        {
          id: "core",
          opKinds: [...SEMANTIC_OPERATOR_ATTRIBUTIVE_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: semanticOperatorAggregates("plain_semantic_operator", 0, 0),
        familyClaimRefs: [
          { familyId: "accustomed_past_attributive", polarity: "excludes" },
          { familyId: "reinforced_potential_composition", polarity: "excludes" }
        ]
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_SEMANTIC_OPERATOR_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "plain_predicate_semantic_operator_attributive",
      shape: {
        root: "aux_layer",
        ops: [SEMANTIC_OPERATOR_CORE_SLOT]
      },
      conditions: {
        host: SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST_CONDITIONS,
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "plain_predicate_semantic_operator_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

export const PLAIN_PREDICATE_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "plain_predicate_semantic_operator_quote_carrier_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "plain_predicate_semantic_operator_quote_carrier_attributive",
      root: "aux_layer",
      ops: [
        {
          id: "core",
          opKinds: [...SEMANTIC_OPERATOR_ATTRIBUTIVE_OP_KINDS],
          cardinality: { min: 1, max: null }
        },
        {
          id: "quote_carrier",
          opKinds: ["predicateQuoteCarrier"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: semanticOperatorAggregates(
          "plain_semantic_operator_quote_carrier_prefix",
          0,
          -1
        ),
        familyClaimRefs: [
          { familyId: "reinforced_potential_composition", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "plain_predicate_semantic_operator_quote_carrier_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          SEMANTIC_OPERATOR_CORE_SLOT,
          {
            id: "quote_carrier",
            role: "core",
            patterns: QUOTE_CARRIER_ATTRIBUTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST_CONDITIONS,
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "plain_predicate_semantic_operator_quote_carrier_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_SEMANTIC_OPERATOR_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "noun_copula_semantic_operator_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "noun_copula_semantic_operator_attributive",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "core",
          opKinds: [...SEMANTIC_OPERATOR_ATTRIBUTIVE_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: semanticOperatorAggregates("noun_copula_semantic_operator", 1, 0),
        familyClaimRefs: [
          { familyId: "noun_copula_negative_likeness", polarity: "excludes" },
          { familyId: "noun_copula_reported_attributive", polarity: "excludes" }
        ]
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_SEMANTIC_OPERATOR_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "noun_copula_semantic_operator_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [{ kind: "copula" }],
            cardinality: { min: 1, max: 1 }
          },
          SEMANTIC_OPERATOR_CORE_SLOT
        ]
      },
      conditions: {
        host: SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST_CONDITIONS,
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "noun_copula_semantic_operator_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "noun_copula_semantic_operator_quote_carrier_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "noun_copula_semantic_operator_quote_carrier_attributive",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "core",
          opKinds: [...SEMANTIC_OPERATOR_ATTRIBUTIVE_OP_KINDS],
          cardinality: { min: 1, max: null }
        },
        {
          id: "quote_carrier",
          opKinds: ["predicateQuoteCarrier"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "relative", offset: -1 }
        ],
        aggregates: semanticOperatorAggregates(
          "noun_copula_semantic_operator_quote_carrier_prefix",
          1,
          -1
        ),
        familyClaimRefs: [
          { familyId: "noun_copula_desire", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "noun_copula_semantic_operator_quote_carrier_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [{ kind: "copula" }],
            cardinality: { min: 1, max: 1 }
          },
          SEMANTIC_OPERATOR_CORE_SLOT,
          {
            id: "quote_carrier",
            role: "core",
            patterns: QUOTE_CARRIER_ATTRIBUTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST_CONDITIONS,
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "noun_copula_semantic_operator_quote_carrier_attributive_render"
    }
  ],
  nonAdmission: "reject"
};

const ATTRIBUTIVE_OPERATOR_CHAIN_SEMANTIC_OP_KINDS = [
  "modal",
  "desire",
  "idiom",
  "postverbAuxiliary",
  "scopeBridge",
  "conjecture",
  "predicateQuoteCarrier",
  "predicateSuffix",
  "predicateProjectionCarrier",
  "adjCopulaBridge",
  "classicalAuxResidue"
] as const satisfies readonly AuxOpKind[];

const _attributiveOperatorChainOpKindPartition: [AuxOpKind] extends [
  (typeof PLAIN_ATTRIBUTIVE_CORE_OP_KINDS)[number] |
  (typeof ATTRIBUTIVE_OPERATOR_CHAIN_SEMANTIC_OP_KINDS)[number] |
  "copula" |
  "connective"
] ? true : never = true;
void _attributiveOperatorChainOpKindPartition;

const ATTRIBUTIVE_OPERATOR_CHAIN_EXTENDED_OP_KINDS = ATTRIBUTIVE_OPERATOR_CHAIN_SEMANTIC_OP_KINDS
  .filter((opKind): opKind is Exclude<
    (typeof ATTRIBUTIVE_OPERATOR_CHAIN_SEMANTIC_OP_KINDS)[number],
    (typeof SEMANTIC_OPERATOR_OP_KINDS)[number]
  > => !(SEMANTIC_OPERATOR_OP_KINDS as readonly AuxOpKind[]).includes(opKind));

export const ATTRIBUTIVE_OPERATOR_CHAIN_OP_KINDS = [
  ...PLAIN_ATTRIBUTIVE_CORE_OP_KINDS,
  ...ATTRIBUTIVE_OPERATOR_CHAIN_SEMANTIC_OP_KINDS
] as const satisfies readonly AuxOpKind[];

export const ATTRIBUTIVE_OPERATOR_CHAIN_OP_PATTERNS = [
  ...PLAIN_ATTRIBUTIVE_CORE_OP_PATTERNS,
  { kind: "modal" },
  { kind: "desire" },
  { kind: "idiom" },
  { kind: "postverbAuxiliary" },
  { kind: "scopeBridge" },
  { kind: "conjecture" },
  { kind: "predicateQuoteCarrier" },
  { kind: "predicateSuffix" },
  { kind: "predicateProjectionCarrier" },
  { kind: "adjCopulaBridge" },
  { kind: "classicalAuxResidue" }
] as const satisfies readonly ProductionOpPattern[];

const ATTRIBUTIVE_COPULA_PROJECTION_OP_KINDS = [
  ...ATTRIBUTIVE_OPERATOR_CHAIN_OP_KINDS,
  "copula"
] as const satisfies readonly AuxOpKind[];

const ATTRIBUTIVE_COPULA_PROJECTION_OP_PATTERNS = [
  ...ATTRIBUTIVE_OPERATOR_CHAIN_OP_PATTERNS,
  { kind: "copula" }
] as const satisfies readonly ProductionOpPattern[];

const attributiveOperatorChainAggregates = (
  idPrefix: string,
  range?: ProductionFamilyClaimSequenceAggregateDependency["range"]
) => {
  const scope = range === undefined ? {} : { range };
  return [
    {
      id: `${idPrefix}_kinds`,
      kind: "every_kind_in",
      opKinds: ATTRIBUTIVE_OPERATOR_CHAIN_OP_KINDS,
      ...scope
    },
    {
      id: `${idPrefix}_tense_past`,
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] }),
      requireAtLeastOne: false,
      ...scope
    },
    {
      id: `${idPrefix}_extended_present`,
      kind: "some_kind",
      opKinds: ATTRIBUTIVE_OPERATOR_CHAIN_EXTENDED_OP_KINDS,
      ...scope
    }
  ] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];
};

const ATTRIBUTIVE_OPERATOR_CHAIN_EXCLUDES = [
  { familyId: "plain_predicate_quote_carrier_attributive", polarity: "excludes" },
  { familyId: "noun_copula_quote_carrier_attributive", polarity: "excludes" },
  {
    familyId: "plain_predicate_semantic_operator_quote_carrier_attributive",
    polarity: "excludes"
  },
  {
    familyId: "noun_copula_semantic_operator_quote_carrier_attributive",
    polarity: "excludes"
  },
  { familyId: "noun_scope_bridge_attributive", polarity: "excludes" },
  { familyId: "noun_copula_desire", polarity: "excludes" },
  { familyId: "reinforced_potential_composition", polarity: "excludes" },
  { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
] as const satisfies NonNullable<
  ProductionFamily["claimDependencies"]["sequence"]["familyClaimRefs"]
>;

const ATTRIBUTIVE_CLAIM_TERMINAL_DEPENDENCIES = [
  { kind: "terminal_membership", values: ["attributive"] },
  { kind: "sfp_presence" }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

export const PLAIN_PREDICATE_OPERATOR_CHAIN_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "plain_predicate_operator_chain_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "plain_predicate_operator_chain_attributive",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...ATTRIBUTIVE_OPERATOR_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: attributiveOperatorChainAggregates("plain_operator_chain_attributive"),
        familyClaimRefs: ATTRIBUTIVE_OPERATOR_CHAIN_EXCLUDES
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      ATTRIBUTIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_OPERATOR_CHAIN_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "plain_predicate_operator_chain_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: ATTRIBUTIVE_OPERATOR_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST_CONDITIONS,
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "attributive_operator_chain_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_OPERATOR_CHAIN_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "noun_copula_operator_chain_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "noun_copula_operator_chain_attributive",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "chain",
          opKinds: [...ATTRIBUTIVE_OPERATOR_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: attributiveOperatorChainAggregates(
          "noun_copula_operator_chain_attributive",
          COPULA_SUFFIX_RANGE
        ),
        familyClaimRefs: ATTRIBUTIVE_OPERATOR_CHAIN_EXCLUDES
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      ATTRIBUTIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_OPERATOR_CHAIN_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "noun_copula_operator_chain_attributive",
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
            id: "chain",
            role: "core",
            patterns: ATTRIBUTIVE_OPERATOR_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: SEMANTIC_OPERATOR_ATTRIBUTIVE_COPULA_HOST_CONDITIONS,
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "attributive_operator_chain_render"
    }
  ],
  nonAdmission: "reject"
};

export const COPULA_PROJECTION_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "copula_projection_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "copula_projection_attributive",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...ATTRIBUTIVE_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 2, max: null }
        }
      ],
      terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: [
          {
            id: "copula_projection_attributive_kinds",
            kind: "every_kind_in",
            opKinds: ATTRIBUTIVE_COPULA_PROJECTION_OP_KINDS
          },
          {
            id: "copula_projection_attributive_tense_past",
            kind: "every_filtered_pattern",
            pattern: productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] }),
            requireAtLeastOne: false
          },
          {
            id: "copula_projection_attributive_suffix_copula_present",
            kind: "some_kind",
            opKinds: ["copula"],
            range: COPULA_SUFFIX_RANGE
          }
        ],
        familyClaimRefs: ATTRIBUTIVE_OPERATOR_CHAIN_EXCLUDES
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      ATTRIBUTIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: COPULA_PROJECTION_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "copula_projection_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: ATTRIBUTIVE_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 2, max: null }
          }
        ]
      },
      conditions: {
        host: SEMANTIC_OPERATOR_ATTRIBUTIVE_COPULA_HOST_CONDITIONS,
        terminal: ATTRIBUTIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "attributive_operator_chain_render"
    }
  ],
  nonAdmission: "reject"
};
