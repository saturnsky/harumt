import type { AuxOpKind } from "../grammar.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { PREDICATE_COPULA_NEGATIVE_CONFIRM_CLAIM, PREDICATE_COPULA_PROGRESSIVE_CONFIRM_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionOpPattern, ProductionOpSlot, ProductionRecord, ProductionTerminalConditions } from "../production-registry.js";
import { ALL_CLAIM_OP_KINDS, claimDependencies } from "./shared.js";

const PREDICATE_CONFIRM_QUESTION_COPULA_SLOT: ProductionOpSlot = {
  id: "confirm_copula",
  role: "core",
  patterns: [productionOpPattern("copula", "copula_fields", {
    variantIn: ["basic"],
    polarityIn: ["negative"],
    basicForm: "absent",
    negativeBridgeFormIn: ["ja"],
    politeIn: [false, true]
  })],
  cardinality: { min: 1, max: 1 }
};

const PREDICATE_CONFIRM_MARKER_POLITE_SLOT: ProductionOpSlot = {
  id: "confirm_polite",
  role: "wrapper",
  patterns: [{ kind: "polite" }],
  cardinality: { min: 0, max: 1 }
};

const PREDICATE_CONFIRM_ADJ_BRIDGE_SLOT: ProductionOpSlot = {
  id: "confirm_bridge",
  role: "core",
  patterns: [{ kind: "adjCopulaBridge" }],
  cardinality: { min: 1, max: 1 }
};

const PREDICATE_CONFIRM_BARE_ADJ_BRIDGE_SLOT: ProductionOpSlot = {
  id: "confirm_bridge",
  role: "core",
  patterns: [productionOpPattern("adjCopulaBridge", "adj_copula_bridge_fields", {
    formIn: ["ja"]
  })],
  cardinality: { min: 1, max: 1 }
};

const PREDICATE_CONFIRM_ADJ_BRIDGE_NEGATION_SLOT: ProductionOpSlot = {
  id: "confirm_negation",
  role: "core",
  patterns: [productionOpPattern("negation", "negation_fields", {
    chainDepthIn: [1],
    chainPastIn: [false]
  })],
  cardinality: { min: 1, max: 1 }
};

const PREDICATE_COPULA_CONFIRM_QUESTION_TERMINAL = {
  kinds: [null],
  sfp: "required",
  sfpEffects: ["ka", "polite_q", "neg_confirm_q", "neg_plain_q"]
} as const;

const PREDICATE_COPULA_CONFIRM_BARE_TERMINALS = [
  { variant: "bare", terminal: { kinds: [null], sfp: "forbidden" } },
  { variant: "bare_punctuated", terminal: { kinds: [null], sfpEffects: ["plain_q"] } }
] as const;

const PREDICATE_CONFIRM_DISCOURSE_COPULA_SLOT: ProductionOpSlot = {
  id: "confirm_copula",
  role: "core",
  patterns: [productionOpPattern("copula", "copula_fields", {
    variantIn: ["basic"],
    polarityIn: ["negative"],
    basicForm: "absent",
    negativeBridgeFormIn: ["ja"],
    politeIn: [false, true]
  })],
  cardinality: { min: 1, max: 1 }
};

const PREDICATE_CONFIRM_HOST_CHAIN_OP_KINDS = ALL_CLAIM_OP_KINDS
  .filter((kind) => kind !== "connective" && kind !== "polite");

const PREDICATE_CONFIRM_HOST_CHAIN_PATTERNS = PREDICATE_CONFIRM_HOST_CHAIN_OP_KINDS
  .map((kind) => ({ kind })) as readonly ProductionOpPattern[];

const PREDICATE_CONFIRM_HOST_CHAIN_SLOT: ProductionOpSlot = {
  id: "host_chain",
  role: "wrapper",
  patterns: PREDICATE_CONFIRM_HOST_CHAIN_PATTERNS,
  cardinality: { min: 1, max: null }
};

const PREDICATE_CONFIRM_QUESTION_HOST_CHAIN_SLOT: ProductionOpSlot = {
  ...PREDICATE_CONFIRM_HOST_CHAIN_SLOT,
  cardinality: { min: 0, max: null }
};

const PREDICATE_CONFIRM_BARE_HOST_CHAIN_OP_KINDS = PREDICATE_CONFIRM_HOST_CHAIN_OP_KINDS
  .filter((kind) => kind !== "scopeBridge");

const PREDICATE_CONFIRM_BARE_HOST_CHAIN_SLOT: ProductionOpSlot = {
  id: "host_chain",
  role: "wrapper",
  patterns: PREDICATE_CONFIRM_BARE_HOST_CHAIN_OP_KINDS
    .map((kind) => ({ kind })) as readonly ProductionOpPattern[],
  cardinality: { min: 0, max: null }
};

const PREDICATE_COPULA_CONFIRM_DISCOURSE_TERMINAL = {
  kinds: [null],
  sfp: "required",
  sfpEffects: ["ne", "na_excl", "yone_confirm"],
  sfpEmphaticQuestion: false
} as const;

const PREDICATE_COPULA_PROGRESSIVE_CONFIRM_DOMAINS: readonly ProductionFamilyClaimDomain[] = [
  {
    id: "predicate_copula_confirm_discourse_core",
    root: "aux_layer",
    ops: [
      {
        id: "host_chain",
        opKinds: PREDICATE_CONFIRM_HOST_CHAIN_OP_KINDS,
        cardinality: { min: 1, max: null }
      },
      { id: "confirm_copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } }
    ],
    terminal: PREDICATE_COPULA_CONFIRM_DISCOURSE_TERMINAL
  }
];

const PREDICATE_COPULA_CONFIRM_HOST_CONDITIONS = {
  sourceShapes: ["verb", "i_adjective", "sahen_verbalization"],
  projectionCategories: ["verbal_predicate", "adjectival_predicate", "nominal"]
} as const;

interface PredicateConfirmMarkerShape {
  readonly id: string;
  readonly markerSlots: (bridge: ProductionOpSlot) => readonly ProductionOpSlot[];
  readonly markerDomainOps: ProductionFamilyClaimDomain["ops"];
}

const PREDICATE_COPULA_CONFIRM_MARKER_SHAPES: readonly PredicateConfirmMarkerShape[] = [
  {
    id: "predicate_copula_confirm",
    markerSlots: () => [
      PREDICATE_CONFIRM_QUESTION_COPULA_SLOT,
      PREDICATE_CONFIRM_MARKER_POLITE_SLOT
    ],
    markerDomainOps: [
      { id: "confirm_copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
      { id: "confirm_polite", opKinds: ["polite"], cardinality: { min: 0, max: 1 } }
    ]
  },
  {
    id: "predicate_copula_confirm_adj_bridge",
    markerSlots: (bridge) => [
      bridge,
      PREDICATE_CONFIRM_ADJ_BRIDGE_NEGATION_SLOT,
      PREDICATE_CONFIRM_MARKER_POLITE_SLOT
    ],
    markerDomainOps: [
      { id: "confirm_bridge", opKinds: ["adjCopulaBridge"], cardinality: { min: 1, max: 1 } },
      { id: "confirm_negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
      { id: "confirm_polite", opKinds: ["polite"], cardinality: { min: 0, max: 1 } }
    ]
  },
  {
    id: "predicate_copula_confirm_adj_bridge_polite",
    markerSlots: (bridge) => [
      bridge,
      { ...PREDICATE_CONFIRM_MARKER_POLITE_SLOT, cardinality: { min: 1, max: 1 } },
      PREDICATE_CONFIRM_ADJ_BRIDGE_NEGATION_SLOT
    ],
    markerDomainOps: [
      { id: "confirm_bridge", opKinds: ["adjCopulaBridge"], cardinality: { min: 1, max: 1 } },
      { id: "confirm_polite", opKinds: ["polite"], cardinality: { min: 1, max: 1 } },
      { id: "confirm_negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } }
    ]
  }
];

interface PredicateConfirmQuestionAxisVariant {
  readonly variant: string;
  readonly terminal: ProductionTerminalConditions;
  readonly hostChainSlot: ProductionOpSlot;
  readonly hostChainOpKinds: readonly AuxOpKind[];
  readonly bridgeSlot: ProductionOpSlot;
}


const PREDICATE_COPULA_CONFIRM_VARIANTS: readonly PredicateConfirmQuestionAxisVariant[] = [
  {
    variant: "question",
    terminal: PREDICATE_COPULA_CONFIRM_QUESTION_TERMINAL,
    hostChainSlot: PREDICATE_CONFIRM_QUESTION_HOST_CHAIN_SLOT,
    hostChainOpKinds: PREDICATE_CONFIRM_HOST_CHAIN_OP_KINDS,
    bridgeSlot: PREDICATE_CONFIRM_ADJ_BRIDGE_SLOT
  },
  ...PREDICATE_COPULA_CONFIRM_BARE_TERMINALS.map(({ variant, terminal }) => ({
    variant,
    terminal,
    hostChainSlot: PREDICATE_CONFIRM_BARE_HOST_CHAIN_SLOT,
    hostChainOpKinds: PREDICATE_CONFIRM_BARE_HOST_CHAIN_OP_KINDS,
    bridgeSlot: PREDICATE_CONFIRM_BARE_ADJ_BRIDGE_SLOT
  }))
];

const PREDICATE_COPULA_NEGATIVE_CONFIRM_DOMAINS: readonly ProductionFamilyClaimDomain[] =
  PREDICATE_COPULA_CONFIRM_VARIANTS.flatMap((axis) =>
    PREDICATE_COPULA_CONFIRM_MARKER_SHAPES.map((shape) => ({
      id: `${shape.id}_${axis.variant}_core`,
      root: "aux_layer" as const,
      ops: [
        {
          id: "host_chain",
          opKinds: axis.hostChainOpKinds,
          cardinality: { min: 0, max: null }
        },
        ...shape.markerDomainOps
      ],
      terminal: axis.terminal
    }))
  );

const PREDICATE_COPULA_NEGATIVE_CONFIRM_RECORDS: readonly ProductionRecord[] =
  PREDICATE_COPULA_CONFIRM_VARIANTS.flatMap((axis) =>
    PREDICATE_COPULA_CONFIRM_MARKER_SHAPES.map((shape) => ({
      id: `${shape.id}_${axis.variant}`,
      shape: {
        root: "aux_layer" as const,
        ops: [axis.hostChainSlot, ...shape.markerSlots(axis.bridgeSlot)]
      },
      conditions: {
        host: PREDICATE_COPULA_CONFIRM_HOST_CONDITIONS,
        terminal: axis.terminal
      },
      loweringKey: "predicate_copula_negative_confirm" as const
    }))
  );

const PREDICATE_COPULA_PROGRESSIVE_CONFIRM_RECORDS: readonly ProductionRecord[] = [
  {
    id: "predicate_copula_confirm_discourse",
    shape: {
      root: "aux_layer",
      ops: [PREDICATE_CONFIRM_HOST_CHAIN_SLOT, PREDICATE_CONFIRM_DISCOURSE_COPULA_SLOT]
    },
    conditions: { terminal: PREDICATE_COPULA_CONFIRM_DISCOURSE_TERMINAL },
    loweringKey: "predicate_copula_negative_confirm"
  }
];

export const PREDICATE_COPULA_NEGATIVE_CONFIRM_FAMILY: ProductionFamily = {
  id: "predicate_copula_negative_confirm",
  legacyFallback: "retired",
  conditions: { terminal: { kinds: [null] } },
  claimDomains: PREDICATE_COPULA_NEGATIVE_CONFIRM_DOMAINS,
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [1, 2, 3, 4],
      familyClaimRefs: [
        { familyId: "volitional_negative_invite", polarity: "excludes" as const }
      ],
      positions: [
        { kind: "relative", offset: -1 },
        { kind: "relative", offset: -2 },
        { kind: "relative", offset: -3 }
      ],
      aggregates: [1, 2, 3].flatMap((width) => {
        const hostChain = {
          start: { kind: "absolute" as const, index: 0 },
          end: { kind: "relative" as const, offset: -width }
        };
        return [
          {
            id: `predicate_confirm_question_host_chain_kinds_${width}`,
            kind: "every_kind_in" as const,
            opKinds: PREDICATE_CONFIRM_HOST_CHAIN_OP_KINDS,
            range: hostChain
          },
          {
            id: `predicate_confirm_host_chain_closes_${width}`,
            kind: "last_closes_clause" as const,
            range: hostChain
          }
        ];
      })
    },
    [
      {
        kind: "copula",
        fields: ["variant", "polarity", "basicForm", "negativeBridgeForm", "polite"]
      },
      { kind: "adjCopulaBridge", fields: ["form"] },
      { kind: "negation", fields: ["chainDepth", "chainPast"] }
    ],
    {
      sourcePredicateShape: true,
      sourceClauseClosing: true,
      projectionCategories: ["verbal_predicate", "adjectival_predicate", "nominal"]
    },
    [
      { kind: "sfp_presence" },
      {
        kind: "sfp_effect_membership",
        values: ["ka", "polite_q", "neg_confirm_q", "neg_plain_q"]
      },
      { kind: "sfp_effect_membership", values: ["plain_q"] }
    ]
  ),
  claim: PREDICATE_COPULA_NEGATIVE_CONFIRM_CLAIM,
  records: PREDICATE_COPULA_NEGATIVE_CONFIRM_RECORDS,
  nonAdmission: "reject"
};

export const PREDICATE_COPULA_PROGRESSIVE_CONFIRM_FAMILY: ProductionFamily = {
  id: "predicate_copula_progressive_confirm",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: { terminal: PREDICATE_COPULA_CONFIRM_DISCOURSE_TERMINAL },
  claimDomains: PREDICATE_COPULA_PROGRESSIVE_CONFIRM_DOMAINS,
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [2],
      positions: [{ kind: "relative", offset: -1 }],
      aggregates: [{
        id: "predicate_confirm_host_chain_kinds",
        kind: "every_kind_in",
        opKinds: PREDICATE_CONFIRM_HOST_CHAIN_OP_KINDS,
        range: {
          start: { kind: "absolute", index: 0 },
          end: { kind: "relative", offset: -1 }
        }
      }]
    },
    [
      {
        kind: "copula",
        fields: ["variant", "polarity", "basicForm", "negativeBridgeForm", "polite"]
      }
    ]
  ),
  claim: PREDICATE_COPULA_PROGRESSIVE_CONFIRM_CLAIM,
  records: PREDICATE_COPULA_PROGRESSIVE_CONFIRM_RECORDS,
  nonAdmission: "reject"
};
