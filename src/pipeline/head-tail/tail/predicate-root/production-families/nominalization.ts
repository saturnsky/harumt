import type { AuxOpKind } from "../grammar.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { PLAIN_PREDICATE_NOMINALIZED_CLAIM, NOUN_COPULA_NOMINALIZED_CLAIM, BARE_NOMINAL_NOMINALIZED_CLAIM, PREDICATE_COPULA_PROJECTION_NOMINALIZED_CLAIM, NOMINAL_COPULA_PROJECTION_NOMINALIZED_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDependencies, ProductionFamilyClaimSequenceAggregateDependency, ProductionOpPattern } from "../production-registry.js";
import { TENSE_CLAIM_DEPENDENCY, claimDependencies } from "./shared.js";
import { ATTRIBUTIVE_OPERATOR_CHAIN_OP_KINDS, ATTRIBUTIVE_OPERATOR_CHAIN_OP_PATTERNS } from "./attributive.js";
import { COPULA_SUFFIX_RANGE, VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS, COPULA_CLAUSE_CHAIN_HOST_CONDITIONS, BARE_NOMINAL_CLAUSE_CHAIN_HOST_CONDITIONS } from "./chain-patterns.js";

const NOMINALIZED_CHAIN_OP_KINDS = ATTRIBUTIVE_OPERATOR_CHAIN_OP_KINDS;

const NOMINALIZED_CHAIN_OP_PATTERNS = ATTRIBUTIVE_OPERATOR_CHAIN_OP_PATTERNS;

const NOMINALIZED_COPULA_PROJECTION_OP_KINDS = [
  ...NOMINALIZED_CHAIN_OP_KINDS,
  "copula"
] as const satisfies readonly AuxOpKind[];

const NOMINALIZED_COPULA_PROJECTION_OP_PATTERNS = [
  ...NOMINALIZED_CHAIN_OP_PATTERNS,
  { kind: "copula" }
] as const satisfies readonly ProductionOpPattern[];

const NOMINALIZED_CLAIM_TERMINAL_DEPENDENCIES = [
  { kind: "terminal_membership", values: ["nominalized"] },
  { kind: "sfp_presence" }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

const NOMINALIZED_TERMINAL_CONDITIONS = {
  kinds: ["nominalized"],
  sfp: "forbidden"
} as const satisfies NonNullable<ProductionFamily["conditions"]>["terminal"];

const nominalizedChainAggregates = (
  idPrefix: string,
  opKinds: readonly AuxOpKind[],
  range?: ProductionFamilyClaimSequenceAggregateDependency["range"]
) => {
  const scope = range === undefined ? {} : { range };
  return [
    {
      id: `${idPrefix}_kinds`,
      kind: "every_kind_in",
      opKinds,
      ...scope
    },
    {
      id: `${idPrefix}_tense_past`,
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] }),
      requireAtLeastOne: false,
      ...scope
    }
  ] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];
};

export const PLAIN_PREDICATE_NOMINALIZED_FAMILY: ProductionFamily = {
  id: "plain_predicate_nominalized",
  legacyFallback: "retired",
  conditions: {
    terminal: NOMINALIZED_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "plain_predicate_nominalized",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...NOMINALIZED_CHAIN_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: NOMINALIZED_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: nominalizedChainAggregates(
          "plain_predicate_nominalized",
          NOMINALIZED_CHAIN_OP_KINDS
        )
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      NOMINALIZED_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_NOMINALIZED_CLAIM,
  records: [
    {
      id: "plain_predicate_nominalized",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: NOMINALIZED_CHAIN_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: NOMINALIZED_TERMINAL_CONDITIONS
      },
      loweringKey: "nominalized_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_NOMINALIZED_FAMILY: ProductionFamily = {
  id: "noun_copula_nominalized",
  legacyFallback: "retired",
  conditions: {
    terminal: NOMINALIZED_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "noun_copula_nominalized",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "chain",
          opKinds: [...NOMINALIZED_CHAIN_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: NOMINALIZED_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: nominalizedChainAggregates(
          "noun_copula_nominalized",
          NOMINALIZED_CHAIN_OP_KINDS,
          COPULA_SUFFIX_RANGE
        )
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      NOMINALIZED_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_NOMINALIZED_CLAIM,
  records: [
    {
      id: "noun_copula_nominalized",
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
            patterns: NOMINALIZED_CHAIN_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: NOMINALIZED_TERMINAL_CONDITIONS
      },
      loweringKey: "nominalized_render"
    }
  ],
  nonAdmission: "reject"
};

export const BARE_NOMINAL_NOMINALIZED_FAMILY: ProductionFamily = {
  id: "bare_nominal_nominalized",
  legacyFallback: "retired",
  conditions: {
    terminal: NOMINALIZED_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "bare_nominal_nominalized",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...NOMINALIZED_CHAIN_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: NOMINALIZED_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: nominalizedChainAggregates(
          "bare_nominal_nominalized",
          NOMINALIZED_CHAIN_OP_KINDS
        ),
        familyClaimRefs: [
          { familyId: "adverbial_change_attributive", polarity: "excludes" }
        ]
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      NOMINALIZED_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: BARE_NOMINAL_NOMINALIZED_CLAIM,
  records: [
    {
      id: "bare_nominal_nominalized",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: NOMINALIZED_CHAIN_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          }
        ]
      },
      conditions: {
        host: BARE_NOMINAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: NOMINALIZED_TERMINAL_CONDITIONS
      },
      loweringKey: "nominalized_render"
    }
  ],
  nonAdmission: "reject"
};

export const PREDICATE_COPULA_PROJECTION_NOMINALIZED_FAMILY: ProductionFamily = {
  id: "predicate_copula_projection_nominalized",
  legacyFallback: "retired",
  conditions: {
    terminal: NOMINALIZED_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "predicate_copula_projection_nominalized",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...NOMINALIZED_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: NOMINALIZED_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: [
          ...nominalizedChainAggregates(
            "predicate_copula_projection_nominalized",
            NOMINALIZED_COPULA_PROJECTION_OP_KINDS
          ),
          {
            id: "predicate_copula_projection_nominalized_copula_present",
            kind: "some_kind",
            opKinds: ["copula"]
          }
        ]
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      NOMINALIZED_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_COPULA_PROJECTION_NOMINALIZED_CLAIM,
  records: [
    {
      id: "predicate_copula_projection_nominalized",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: NOMINALIZED_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: NOMINALIZED_TERMINAL_CONDITIONS
      },
      loweringKey: "nominalized_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOMINAL_COPULA_PROJECTION_NOMINALIZED_FAMILY: ProductionFamily = {
  id: "nominal_copula_projection_nominalized",
  legacyFallback: "retired",
  conditions: {
    terminal: NOMINALIZED_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "nominal_copula_projection_nominalized",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...NOMINALIZED_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 2, max: null }
        }
      ],
      terminal: NOMINALIZED_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: [
          ...nominalizedChainAggregates(
            "nominal_copula_projection_nominalized",
            NOMINALIZED_COPULA_PROJECTION_OP_KINDS
          ),
          {
            id: "nominal_copula_projection_nominalized_suffix_copula_present",
            kind: "some_kind",
            opKinds: ["copula"],
            range: COPULA_SUFFIX_RANGE
          }
        ]
      },
      [TENSE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      NOMINALIZED_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOMINAL_COPULA_PROJECTION_NOMINALIZED_CLAIM,
  records: [
    {
      id: "nominal_copula_projection_nominalized",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: NOMINALIZED_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 2, max: null }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: NOMINALIZED_TERMINAL_CONDITIONS
      },
      loweringKey: "nominalized_render"
    }
  ],
  nonAdmission: "reject"
};
