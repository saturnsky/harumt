import { productionOpPattern } from "../production-admission-contract.js";
import { COMPLEMENT_INCORPORATION_CLAUSE_CONNECTIVE_CLAIM, COMPLEMENT_INCORPORATION_CONNECTIVE_KINDS, DERIVED_MARKER_SUBORDINATION_CLAUSE_CONNECTIVE_CLAIM, DERIVED_MARKER_SUBORDINATION_CONNECTIVE_KINDS, PROJECTION_SUBORDINATION_CLAUSE_CONNECTIVE_CLAIM, PROJECTION_SUBORDINATION_CONNECTIVE_KINDS, QUOTATIVE_DERIVED_MARKER_CLAUSE_CONNECTIVE_CLAIM, QUOTATIVE_DERIVED_MARKER_CONNECTIVE_KINDS } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDependencies, ProductionFamilyClaimReference, ProductionFamilyClaimSequenceAggregateDependency, ProductionOpPattern } from "../production-registry.js";
import { claimDependencies } from "./shared.js";
import { CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY, clauseConnectivePrefixRange, CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS, CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS } from "./chain-patterns.js";

const SUBORDINATION_CONNECTIVE_CLAIM_TERMINAL_DEPENDENCIES = [
  { kind: "terminal_membership", values: [null] },
  { kind: "sfp_presence" }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

const subordinationPrefixKindsAggregate = (id: string) => ({
  id,
  kind: "every_kind_in",
  opKinds: CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS,
  range: clauseConnectivePrefixRange(0)
}) as const satisfies ProductionFamilyClaimSequenceAggregateDependency;

const PROJECTION_SUBORDINATION_SLOT_PATTERNS = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: [...PROJECTION_SUBORDINATION_CONNECTIVE_KINDS]
  })
] as const satisfies readonly ProductionOpPattern[];

const DERIVED_MARKER_SUBORDINATION_SLOT_PATTERNS = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: [...DERIVED_MARKER_SUBORDINATION_CONNECTIVE_KINDS]
  })
] as const satisfies readonly ProductionOpPattern[];

export const PROJECTION_SUBORDINATION_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "projection_subordination_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "projection_subordination_clause_connective",
      root: "aux_layer",
      ops: [
        {
          id: "prefix",
          opKinds: [...CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        {
          id: "subordinating_connective",
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
          subordinationPrefixKindsAggregate(
            "projection_subordination_connective_prefix_kinds"
          )
        ],
        familyClaimRefs: [
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      undefined,
      SUBORDINATION_CONNECTIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PROJECTION_SUBORDINATION_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "projection_subordination_clause_connective",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "prefix",
            role: "core",
            patterns: CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "subordinating_connective",
            role: "core",
            patterns: PROJECTION_SUBORDINATION_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

export const DERIVED_MARKER_SUBORDINATION_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "derived_marker_subordination_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "derived_marker_subordination_clause_connective",
      root: "aux_layer",
      ops: [
        {
          id: "prefix",
          opKinds: [...CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        {
          id: "subordinating_connective",
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
          subordinationPrefixKindsAggregate(
            "derived_marker_subordination_connective_prefix_kinds"
          )
        ],
        familyClaimRefs: [
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      undefined,
      SUBORDINATION_CONNECTIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: DERIVED_MARKER_SUBORDINATION_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "derived_marker_subordination_clause_connective",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "prefix",
            role: "core",
            patterns: CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "subordinating_connective",
            role: "core",
            patterns: DERIVED_MARKER_SUBORDINATION_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

const COMPLEMENT_INCORPORATION_EXCLUDES = [
  { familyId: "volitional_wish_complement", polarity: "excludes" },
  { familyId: "volitional_request_complement", polarity: "excludes" },
  { familyId: "volitional_question_quotative", polarity: "excludes" },
  { familyId: "volitional_negative_invite", polarity: "excludes" },
  { familyId: "conjectural_quotative", polarity: "excludes" },
  { familyId: "noun_copula_desire", polarity: "excludes" },
  { familyId: "noun_copula_permission", polarity: "excludes" },
  { familyId: "noun_copula_forbidden", polarity: "excludes" },
  { familyId: "quote_mid_chain", polarity: "excludes" },
  { familyId: "request_terminal_boundary", polarity: "excludes" },
  { familyId: "request_on_composed_predicate_base", polarity: "excludes" },
  { familyId: "source_verbal_adjectival_desiderative", polarity: "excludes" },
  { familyId: "copular_te_hoshii", polarity: "excludes" },
  { familyId: "zuni_sumu_quote_tte", polarity: "excludes" }
] as const satisfies readonly ProductionFamilyClaimReference[];

const QUOTATIVE_DERIVED_MARKER_EXCLUDES = [
  { familyId: "volitional_retrospective_quotative", polarity: "excludes" },
  { familyId: "volitional_reformulation_question", polarity: "excludes" },
  { familyId: "volitional_quote_attributive", polarity: "excludes" },
  { familyId: "request_terminal_boundary", polarity: "excludes" },
  { familyId: "request_on_composed_predicate_base", polarity: "excludes" },
  { familyId: "zuni_sumu_quote_tte", polarity: "excludes" }
] as const satisfies readonly ProductionFamilyClaimReference[];

const COMPLEMENT_INCORPORATION_SLOT_PATTERNS = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: [...COMPLEMENT_INCORPORATION_CONNECTIVE_KINDS]
  })
] as const satisfies readonly ProductionOpPattern[];

const QUOTATIVE_DERIVED_MARKER_SLOT_PATTERNS = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: [...QUOTATIVE_DERIVED_MARKER_CONNECTIVE_KINDS]
  })
] as const satisfies readonly ProductionOpPattern[];

export const COMPLEMENT_INCORPORATION_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "complement_incorporation_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "complement_incorporation_clause_connective",
      root: "aux_layer",
      ops: [
        {
          id: "prefix",
          opKinds: [...CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        {
          id: "incorporating_connective",
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
          subordinationPrefixKindsAggregate(
            "complement_incorporation_connective_prefix_kinds"
          )
        ],
        familyClaimRefs: COMPLEMENT_INCORPORATION_EXCLUDES
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      undefined,
      SUBORDINATION_CONNECTIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: COMPLEMENT_INCORPORATION_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "complement_incorporation_clause_connective",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "prefix",
            role: "core",
            patterns: CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "incorporating_connective",
            role: "core",
            patterns: COMPLEMENT_INCORPORATION_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};

export const QUOTATIVE_DERIVED_MARKER_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "quotative_derived_marker_clause_connective",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "quotative_derived_marker_clause_connective",
      root: "aux_layer",
      ops: [
        {
          id: "prefix",
          opKinds: [...CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        {
          id: "incorporating_connective",
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
          subordinationPrefixKindsAggregate(
            "quotative_derived_marker_connective_prefix_kinds"
          )
        ],
        familyClaimRefs: QUOTATIVE_DERIVED_MARKER_EXCLUDES
      },
      [CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY],
      undefined,
      SUBORDINATION_CONNECTIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: QUOTATIVE_DERIVED_MARKER_CLAUSE_CONNECTIVE_CLAIM,
  records: [
    {
      id: "quotative_derived_marker_clause_connective",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "prefix",
            role: "core",
            patterns: CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "incorporating_connective",
            role: "core",
            patterns: QUOTATIVE_DERIVED_MARKER_SLOT_PATTERNS,
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "clause_connective_render"
    }
  ],
  nonAdmission: "reject"
};
