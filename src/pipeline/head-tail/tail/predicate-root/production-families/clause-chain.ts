import { BARE_NOMINAL_CLAUSE_CONNECTIVE_CLAIM, BARE_NOMINAL_RENYOU_CHUUSHI_CLAIM, BARE_NOMINAL_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM, BARE_NOMINAL_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM, NOUN_COPULA_CLAUSE_CONNECTIVE_CLAIM, NOUN_COPULA_RENYOU_CHUUSHI_CLAIM, NOUN_COPULA_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM, NOUN_COPULA_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM, NOMINAL_COPULA_PROJECTION_CLAUSE_CONNECTIVE_CLAIM, NOMINAL_COPULA_PROJECTION_RENYOU_CHUUSHI_CLAIM, PLAIN_PREDICATE_CLAUSE_CONNECTIVE_CLAIM, PLAIN_PREDICATE_RENYOU_CHUUSHI_CLAIM, PLAIN_PREDICATE_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM, PLAIN_PREDICATE_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM, PREDICATE_COPULA_PROJECTION_CLAUSE_CONNECTIVE_CLAIM, PREDICATE_COPULA_PROJECTION_RENYOU_CHUUSHI_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily } from "../production-registry.js";
import { claimDependencies } from "./shared.js";
import { COPULA_SUFFIX_RANGE, CLAUSE_CHAIN_BASIC_OP_KINDS, CLAUSE_CHAIN_BASIC_OP_PATTERNS, CLAUSE_CONNECTIVE_SLOT_PATTERNS, CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY, basicOpKindsAggregate, clauseConnectivePrefixRange, CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS, CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS, semanticClauseChainAggregates, CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS, CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS, copulaProjectionChainAggregates, VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS, COPULA_CLAUSE_CHAIN_HOST_CONDITIONS, BARE_NOMINAL_CLAUSE_CHAIN_HOST_CONDITIONS } from "./chain-patterns.js";



export const PLAIN_PREDICATE_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "plain_predicate_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "plain_predicate_clause_connective",
      root: "aux_layer",
      ops: [
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        {
          id: "clause_connective",
          opKinds: ["connective"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: [
          basicOpKindsAggregate(
            "plain_clause_connective_prefix_basic_kinds",
            clauseConnectivePrefixRange(0)
          )
        ]
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: [null] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "plain_predicate_clause_connective",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "basic",
            role: "core",
            patterns: CLAUSE_CHAIN_BASIC_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "clause_connective",
            role: "core",
            patterns: CLAUSE_CONNECTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "noun_copula_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "noun_copula_clause_connective",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        {
          id: "clause_connective",
          opKinds: ["connective"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "relative", offset: -1 }
        ],
        aggregates: [
          basicOpKindsAggregate(
            "noun_copula_clause_connective_prefix_basic_kinds",
            clauseConnectivePrefixRange(1)
          )
        ],
        familyClaimRefs: [
          { familyId: "copular_te_hoshii", polarity: "excludes" }
        ]
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: [null] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "noun_copula_clause_connective",
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
          },
          {
            id: "clause_connective",
            role: "core",
            patterns: CLAUSE_CONNECTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

export const PLAIN_PREDICATE_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
  id: "plain_predicate_renyou_chuushi",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "plain_predicate_renyou_chuushi",
      root: "aux_layer",
      ops: [
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: [basicOpKindsAggregate("plain_renyou_chuushi_basic_kinds")]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["renyou_chuushi"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_RENYOU_CHUUSHI_CLAIM,
  records: [
    {
      id: "plain_predicate_renyou_chuushi",
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
        terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
      },
      loweringKey: "renyou_chuushi_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
  id: "noun_copula_renyou_chuushi",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "noun_copula_renyou_chuushi",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: [
          basicOpKindsAggregate("noun_copula_renyou_chuushi_basic_kinds", {
            start: { kind: "absolute", index: 1 },
            end: { kind: "relative", offset: 0 }
          })
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["renyou_chuushi"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_RENYOU_CHUUSHI_CLAIM,
  records: [
    {
      id: "noun_copula_renyou_chuushi",
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
        terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
      },
      loweringKey: "renyou_chuushi_render"
    }
  ],
  nonAdmission: "reject"
};

export const PLAIN_PREDICATE_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "plain_predicate_semantic_operator_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "plain_predicate_semantic_operator_clause_connective",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        },
        {
          id: "clause_connective",
          opKinds: ["connective"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: semanticClauseChainAggregates(
          "plain_semantic_clause_connective_prefix",
          clauseConnectivePrefixRange(0)
        ),
        familyClaimRefs: [
          { familyId: "zuni_sumu_quote_tte", polarity: "excludes" },
          {
            familyId: "proposition_assertability_koto_dekiru",
            polarity: "excludes"
          },
          { familyId: "reinforced_potential_composition", polarity: "excludes" },
          {
            familyId: "request_on_composed_predicate_base",
            polarity: "excludes"
          }
        ]
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: [null] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "plain_predicate_semantic_operator_clause_connective",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          },
          {
            id: "clause_connective",
            role: "core",
            patterns: CLAUSE_CONNECTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "noun_copula_semantic_operator_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "noun_copula_semantic_operator_clause_connective",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        },
        {
          id: "clause_connective",
          opKinds: ["connective"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "relative", offset: -1 }
        ],
        aggregates: semanticClauseChainAggregates(
          "noun_copula_semantic_clause_connective_prefix",
          clauseConnectivePrefixRange(1)
        ),
        familyClaimRefs: [
          { familyId: "noun_copula_desire", polarity: "excludes" },
          { familyId: "noun_copula_permission", polarity: "excludes" }
        ]
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: [null] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "noun_copula_semantic_operator_clause_connective",
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
            patterns: CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          },
          {
            id: "clause_connective",
            role: "core",
            patterns: CLAUSE_CONNECTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

export const PLAIN_PREDICATE_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
  id: "plain_predicate_semantic_operator_renyou_chuushi",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "plain_predicate_semantic_operator_renyou_chuushi",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: semanticClauseChainAggregates("plain_semantic_renyou_chuushi")
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["renyou_chuushi"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM,
  records: [
    {
      id: "plain_predicate_semantic_operator_renyou_chuushi",
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
        terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
      },
      loweringKey: "renyou_chuushi_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOUN_COPULA_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
  id: "noun_copula_semantic_operator_renyou_chuushi",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "noun_copula_semantic_operator_renyou_chuushi",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: semanticClauseChainAggregates(
          "noun_copula_semantic_renyou_chuushi",
          COPULA_SUFFIX_RANGE
        )
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["renyou_chuushi"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM,
  records: [
    {
      id: "noun_copula_semantic_operator_renyou_chuushi",
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
            patterns: CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
      },
      loweringKey: "renyou_chuushi_render"
    }
  ],
  nonAdmission: "reject"
};

export const BARE_NOMINAL_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "bare_nominal_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "bare_nominal_clause_connective",
      root: "aux_layer",
      ops: [
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        {
          id: "clause_connective",
          opKinds: ["connective"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: [
          basicOpKindsAggregate(
            "bare_nominal_clause_connective_prefix_basic_kinds",
            clauseConnectivePrefixRange(0)
          )
        ]
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: [null] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: BARE_NOMINAL_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "bare_nominal_clause_connective",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "basic",
            role: "core",
            patterns: CLAUSE_CHAIN_BASIC_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "clause_connective",
            role: "core",
            patterns: CLAUSE_CONNECTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: BARE_NOMINAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

export const BARE_NOMINAL_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "bare_nominal_semantic_operator_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "bare_nominal_semantic_operator_clause_connective",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        },
        {
          id: "clause_connective",
          opKinds: ["connective"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: semanticClauseChainAggregates(
          "bare_nominal_semantic_clause_connective_prefix",
          clauseConnectivePrefixRange(0)
        ),
        familyClaimRefs: [
          {
            familyId: "request_on_composed_predicate_base",
            polarity: "excludes"
          }
        ]
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: [null] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: BARE_NOMINAL_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "bare_nominal_semantic_operator_clause_connective",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          },
          {
            id: "clause_connective",
            role: "core",
            patterns: CLAUSE_CONNECTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: BARE_NOMINAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

export const BARE_NOMINAL_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
  id: "bare_nominal_renyou_chuushi",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "bare_nominal_renyou_chuushi",
      root: "aux_layer",
      ops: [
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: [basicOpKindsAggregate("bare_nominal_renyou_chuushi_basic_kinds")]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["renyou_chuushi"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: BARE_NOMINAL_RENYOU_CHUUSHI_CLAIM,
  records: [
    {
      id: "bare_nominal_renyou_chuushi",
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
        terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
      },
      loweringKey: "renyou_chuushi_render"
    }
  ],
  nonAdmission: "reject"
};

export const BARE_NOMINAL_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
  id: "bare_nominal_semantic_operator_renyou_chuushi",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "bare_nominal_semantic_operator_renyou_chuushi",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: semanticClauseChainAggregates("bare_nominal_semantic_renyou_chuushi")
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["renyou_chuushi"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: BARE_NOMINAL_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM,
  records: [
    {
      id: "bare_nominal_semantic_operator_renyou_chuushi",
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
        terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
      },
      loweringKey: "renyou_chuushi_render"
    }
  ],
  nonAdmission: "reject"
};

export const PREDICATE_COPULA_PROJECTION_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "predicate_copula_projection_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "predicate_copula_projection_clause_connective",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 1, max: null }
        },
        {
          id: "clause_connective",
          opKinds: ["connective"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: copulaProjectionChainAggregates(
          "predicate_copula_projection_clause_connective_prefix",
          { chain: clauseConnectivePrefixRange(0), copula: clauseConnectivePrefixRange(0) }
        )
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: [null] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_COPULA_PROJECTION_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "predicate_copula_projection_clause_connective",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          },
          {
            id: "clause_connective",
            role: "core",
            patterns: CLAUSE_CONNECTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

export const PREDICATE_COPULA_PROJECTION_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
  id: "predicate_copula_projection_renyou_chuushi",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "predicate_copula_projection_renyou_chuushi",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: copulaProjectionChainAggregates(
          "predicate_copula_projection_renyou_chuushi"
        )
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["renyou_chuushi"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_COPULA_PROJECTION_RENYOU_CHUUSHI_CLAIM,
  records: [
    {
      id: "predicate_copula_projection_renyou_chuushi",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
      },
      loweringKey: "renyou_chuushi_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOMINAL_COPULA_PROJECTION_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "nominal_copula_projection_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "nominal_copula_projection_clause_connective",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 2, max: null }
        },
        {
          id: "clause_connective",
          opKinds: ["connective"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: copulaProjectionChainAggregates(
          "nominal_copula_projection_clause_connective",
          {
            chain: clauseConnectivePrefixRange(0),
            copula: clauseConnectivePrefixRange(1),
            copulaId: "suffix_copula_present"
          }
        )
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: [null] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOMINAL_COPULA_PROJECTION_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "nominal_copula_projection_clause_connective",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 2, max: null }
          },
          {
            id: "clause_connective",
            role: "core",
            patterns: CLAUSE_CONNECTIVE_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

export const NOMINAL_COPULA_PROJECTION_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
  id: "nominal_copula_projection_renyou_chuushi",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "nominal_copula_projection_renyou_chuushi",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 2, max: null }
        }
      ],
      terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: copulaProjectionChainAggregates(
          "nominal_copula_projection_renyou_chuushi",
          { copula: COPULA_SUFFIX_RANGE, copulaId: "suffix_copula_present" }
        )
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      [
        { kind: "terminal_membership", values: ["renyou_chuushi"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: NOMINAL_COPULA_PROJECTION_RENYOU_CHUUSHI_CLAIM,
  records: [
    {
      id: "nominal_copula_projection_renyou_chuushi",
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
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: ["renyou_chuushi"], sfp: "any" }
      },
      loweringKey: "renyou_chuushi_render"
    }
  ],
  nonAdmission: "reject"
};
