import type { AuxOpKind, ConnectiveOp } from "../grammar.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { COPULAR_BENEFACTIVE_REQUEST_CLAIM, NOUN_COPULA_DESIRE_CLAIM, NOUN_COPULA_FORBIDDEN_CLAIM, NOUN_COPULA_NEGATIVE_LIKENESS_CLAIM, NOUN_COPULA_REPORTED_ATTRIBUTIVE_CLAIM, NOUN_COPULA_PERMISSION_CLAIM, NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_BRIDGE_ARGS, NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionIntakeSite, ProductionOpSlot, ProductionRecord } from "../production-registry.js";
import { claimDependencies } from "./shared.js";
import { DESIDERATIVE_INTAKE_SITES } from "./desiderative.js";

const COPULAR_BENEFACTIVE_REQUEST_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "copular_benefactive_request_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const COPULAR_BENEFACTIVE_REQUEST_COPULA_SLOT: ProductionOpSlot = {
  id: "copula",
  role: "core",
  patterns: [productionOpPattern("copula", "copula_fields", {
    variantIn: ["basic"], polarityIn: ["affirmative"], basicForm: "absent", politeIn: [false]
  })],
  cardinality: { min: 1, max: 1 }
};

const NOUN_COPULA_REQUEST_TERMINAL_RECORD: ProductionRecord = {
  id: "noun_copula_request_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      COPULAR_BENEFACTIVE_REQUEST_COPULA_SLOT,
      {
        id: "carrier",
        role: "core",
        patterns: [productionOpPattern("aspect", "request_aspect", {
          aspectIn: ["te_kure_tanomu"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["nominal"],
      projectionCategories: ["nominal"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
  },
  loweringKey: "noun_copula_request_terminal"
};

const NOUN_COPULA_BENEFACTIVE_TERMINAL_RECORD: ProductionRecord = {
  id: "noun_copula_benefactive_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      COPULAR_BENEFACTIVE_REQUEST_COPULA_SLOT,
      {
        id: "carrier",
        role: "core",
        patterns: [productionOpPattern("aspect", "benefactive_aspect", {
          aspectIn: ["te_moraeru"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["nominal"],
      projectionCategories: ["nominal"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
  },
  loweringKey: "noun_copula_benefactive_terminal"
};

export const COPULAR_BENEFACTIVE_REQUEST_FAMILY: ProductionFamily = {
  id: "copular_benefactive_request",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [COPULAR_BENEFACTIVE_REQUEST_TERMINAL_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [2],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 }
      ],
      kindCounts: [
        { opKinds: ["copula"], cap: 1 },
        { opKinds: ["aspect"], cap: 1 }
      ]
    },
    [
      { kind: "copula", fields: ["variant", "basicForm", "polarity", "polite"] },
      { kind: "aspect", fields: ["aspect"] }
    ],
    {
      sourcePredicateShape: true,
      projectionCategories: ["nominal"]
    }
  ),
  claim: COPULAR_BENEFACTIVE_REQUEST_CLAIM,
  records: [
    NOUN_COPULA_REQUEST_TERMINAL_RECORD,
    NOUN_COPULA_BENEFACTIVE_TERMINAL_RECORD
  ],
  nonAdmission: "reject"
};

const NOUN_COPULA_DESIRE_WRAPPER_KINDS = [
  "tense",
  "negation",
  "polite"
] as const satisfies readonly AuxOpKind[];

const NOUN_COPULA_DESIRE_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "noun_copula_desire_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "desire",
      opKinds: ["desire"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "wrappers",
      opKinds: NOUN_COPULA_DESIRE_WRAPPER_KINDS,
      cardinality: { min: 0, max: null }
    }
  ],
  terminal: { kinds: [null], sfp: "any" }
};

const NOUN_COPULA_DESIRE_CONNECTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "noun_copula_desire_connective_core",
  root: "aux_layer",
  ops: [
    ...NOUN_COPULA_DESIRE_TERMINAL_CLAIM_DOMAIN.ops,
    {
      id: "connective",
      opKinds: ["connective"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const NOUN_COPULA_DESIRE_ATTRIBUTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "noun_copula_desire_attributive_core",
  root: "aux_layer",
  ops: [
    ...NOUN_COPULA_DESIRE_TERMINAL_CLAIM_DOMAIN.ops,
    {
      id: "quote_carrier",
      opKinds: ["predicateQuoteCarrier"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: ["attributive"], sfp: "forbidden" }
};

const NOUN_COPULA_DESIRE_COPULA_SLOT: ProductionOpSlot = {
  id: "copula",
  role: "core",
  patterns: [productionOpPattern("copula", "copula_fields", {
    variantIn: ["basic"],
    polarityIn: ["affirmative"],
    basicForm: "absent",
    politeIn: [false]
  })],
  cardinality: { min: 1, max: 1 }
};

const NOUN_COPULA_DESIRE_SLOT: ProductionOpSlot = {
  id: "desire",
  role: "core",
  patterns: [{ kind: "desire" }],
  cardinality: { min: 1, max: 1 }
};

const NOUN_COPULA_DESIRE_WRAPPER_SLOT: ProductionOpSlot = {
  id: "wrappers",
  role: "wrapper",
  patterns: NOUN_COPULA_DESIRE_WRAPPER_KINDS.map((kind) => ({ kind })),
  cardinality: { min: 0, max: null }
};

const NOUN_COPULA_DESIRE_HOST_CONDITIONS = {
  sourceShapes: ["nominal", "na_adjective"],
  projectionCategories: ["nominal", "adjectival_predicate"]
} as const;

function nounCopulaDesireTerminalRecord(
  id: "noun_copula_desire_terminal" | "noun_copula_desire_terminal_sfp",
  sfp: "forbidden" | "required"
): ProductionRecord {
  return {
    id,
    shape: {
      root: "aux_layer",
      ops: [
        NOUN_COPULA_DESIRE_COPULA_SLOT,
        NOUN_COPULA_DESIRE_SLOT,
        NOUN_COPULA_DESIRE_WRAPPER_SLOT
      ]
    },
    conditions: {
      host: NOUN_COPULA_DESIRE_HOST_CONDITIONS,
      terminal: sfp === "required"
        ? {
            kinds: [null],
            sfp,
            sfpEffects: ["ka", "plain_q", "polite_q", "ne", "na_excl", "kana", "yone_confirm", "explanatory"]
          }
        : { kinds: [null], sfp },
      clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
    },
    loweringKey: "noun_copula_desire"
  };
}

function nounCopulaDesireConnectiveRecord(
  id: "noun_copula_desire_quote" | "noun_copula_desire_connective",
  connectiveIn: readonly ConnectiveOp["connective"][]
): ProductionRecord {
  return {
    id,
    shape: {
      root: "aux_layer",
      ops: [
        NOUN_COPULA_DESIRE_COPULA_SLOT,
        NOUN_COPULA_DESIRE_SLOT,
        NOUN_COPULA_DESIRE_WRAPPER_SLOT,
        {
          id: "connective",
          role: "core",
          patterns: [productionOpPattern("connective", "connective_fields", {
            connectiveIn
          })],
          cardinality: { min: 1, max: 1 }
        }
      ]
    },
    conditions: {
      host: NOUN_COPULA_DESIRE_HOST_CONDITIONS,
      terminal: { kinds: [null], sfp: "forbidden" },
      clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
    },
    loweringKey: "noun_copula_desire"
  };
}

const NOUN_COPULA_DESIRE_ATTRIBUTIVE_RECORD: ProductionRecord = {
  id: "noun_copula_desire_quote_attributive",
  shape: {
    root: "aux_layer",
    ops: [
      NOUN_COPULA_DESIRE_COPULA_SLOT,
      NOUN_COPULA_DESIRE_SLOT,
      NOUN_COPULA_DESIRE_WRAPPER_SLOT,
      {
        id: "quote_carrier",
        role: "core",
        patterns: [productionOpPattern("predicateQuoteCarrier", "predicate_quote_carrier_fields", {
          styleIn: ["compact_toiu"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: NOUN_COPULA_DESIRE_HOST_CONDITIONS,
    terminal: { kinds: ["attributive"], sfp: "forbidden" },
    clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
  },
  loweringKey: "noun_copula_desire"
};

export const NOUN_COPULA_DESIRE_FAMILY: ProductionFamily = {
  id: "noun_copula_desire",
  legacyFallback: "retired",
  claimDomains: [
    NOUN_COPULA_DESIRE_TERMINAL_CLAIM_DOMAIN,
    NOUN_COPULA_DESIRE_CONNECTIVE_CLAIM_DOMAIN,
    NOUN_COPULA_DESIRE_ATTRIBUTIVE_CLAIM_DOMAIN
  ],
  claimDependencies: {
    root: { quoteBinding: true },
    terminal: [
      { kind: "terminal_membership", values: [null] },
      { kind: "terminal_membership", values: ["attributive"] },
      { kind: "sfp_presence" },
      {
        kind: "sfp_effect_membership",
        values: ["ka", "plain_q", "polite_q", "ne", "na_excl", "kana", "yone_confirm", "explanatory"]
      }
    ],
    host: {
      sourcePredicateShape: true,
      projectionCategories: ["nominal", "adjectival_predicate"]
    },
    ops: [
      { kind: "copula", fields: ["variant", "polarity", "basicForm", "polite"] },
      { kind: "connective", fields: ["connective"] },
      { kind: "predicateQuoteCarrier", fields: ["style"] }
    ],
    sequence: {
      lengthThresholds: [2, 3, 4],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 },
        { kind: "absolute", index: 2 },
        { kind: "relative", offset: -1 }
      ],
      aggregates: [
        {
          id: "noun_copula_desire_terminal_wrappers",
          kind: "every_kind_in",
          opKinds: NOUN_COPULA_DESIRE_WRAPPER_KINDS,
          range: {
            start: { kind: "absolute", index: 2 },
            end: { kind: "relative", offset: 0 }
          }
        },
        {
          id: "noun_copula_desire_pre_final_wrappers",
          kind: "every_kind_in",
          opKinds: NOUN_COPULA_DESIRE_WRAPPER_KINDS,
          range: {
            start: { kind: "absolute", index: 2 },
            end: { kind: "relative", offset: -1 }
          }
        }
      ],
      kindCounts: [
        { opKinds: ["copula"], cap: 1 },
        { opKinds: ["desire"], cap: 1 },
        { opKinds: ["tense"], cap: 2 },
        { opKinds: ["negation"], cap: 2 },
        { opKinds: ["polite"], cap: 3 },
        { opKinds: ["connective"], cap: 1 },
        { opKinds: ["predicateQuoteCarrier"], cap: 1 }
      ]
    }
  },
  claim: NOUN_COPULA_DESIRE_CLAIM,
  records: [
    nounCopulaDesireTerminalRecord("noun_copula_desire_terminal", "forbidden"),
    nounCopulaDesireTerminalRecord("noun_copula_desire_terminal_sfp", "required"),
    nounCopulaDesireConnectiveRecord("noun_copula_desire_quote", ["quotative"]),
    nounCopulaDesireConnectiveRecord(
      "noun_copula_desire_connective",
      ["adversative", "conditional", "reason"]
    ),
    NOUN_COPULA_DESIRE_ATTRIBUTIVE_RECORD
  ],
  nonAdmission: "reject"
};

const NOUN_COPULA_PERMISSION_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "noun_copula_permission_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "permission",
      opKinds: ["idiom"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const NOUN_COPULA_PERMISSION_CONNECTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "noun_copula_permission_connective_core",
  root: "aux_layer",
  ops: [
    ...NOUN_COPULA_PERMISSION_TERMINAL_CLAIM_DOMAIN.ops,
    {
      id: "connective",
      opKinds: ["connective"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const NOUN_COPULA_SINGLE_HEAD_INTAKE_SITES: readonly ProductionIntakeSite[] = [
  "candidate_scan",
  "quote_prefix",
  "assembler_resumable_prefix",
  "committed_render"
];

const NOUN_COPULA_PERMISSION_COPULA_SLOT: ProductionOpSlot = {
  id: "copula",
  role: "core",
  patterns: [productionOpPattern("copula", "copula_fields", {
    variantIn: ["basic"],
    polarityIn: ["negative"],
    basicForm: "absent",
    negativeBridgeFormIn: ["absent", "ja"],
    politeIn: [false]
  })],
  cardinality: { min: 1, max: 1 }
};

const NOUN_COPULA_PERMISSION_IDIOM_SLOT: ProductionOpSlot = {
  id: "permission",
  role: "core",
  patterns: [productionOpPattern("idiom", "permission_idiom_fields", {
    variantIn: ["ii"],
    connectiveSurfaceIn: ["ても"]
  })],
  cardinality: { min: 1, max: 1 }
};

function nounCopulaPermissionRecord(
  id: string,
  connective?: {
    readonly connective: ConnectiveOp["connective"];
    readonly allomorph: ConnectiveOp["allomorph"];
  }
): ProductionRecord {
  const connectiveSlots: readonly ProductionOpSlot[] = connective === undefined
    ? []
    : [{
        id: "connective",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: [connective.connective],
          surfaceAllomorphIn: [connective.allomorph]
        })],
        cardinality: { min: 1, max: 1 }
      }];
  return {
    id,
    shape: {
      root: "aux_layer",
      ops: [
        NOUN_COPULA_PERMISSION_COPULA_SLOT,
        NOUN_COPULA_PERMISSION_IDIOM_SLOT,
        ...connectiveSlots
      ]
    },
    conditions: {
      host: {
        sourceShapes: ["nominal"],
        projectionCategories: ["nominal"]
      },
      terminal: { kinds: [null], sfp: "forbidden" },
      clause: { intakeSites: NOUN_COPULA_SINGLE_HEAD_INTAKE_SITES }
    },
    loweringKey: "noun_copula_permission"
  };
}

export const NOUN_COPULA_PERMISSION_FAMILY: ProductionFamily = {
  id: "noun_copula_permission",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [
    NOUN_COPULA_PERMISSION_TERMINAL_CLAIM_DOMAIN,
    NOUN_COPULA_PERMISSION_CONNECTIVE_CLAIM_DOMAIN
  ],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [2, 3],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 },
        { kind: "absolute", index: 2 }
      ],
      kindCounts: [
        { opKinds: ["copula"], cap: 1 },
        { opKinds: ["idiom"], cap: 1 },
        { opKinds: ["connective"], cap: 1 }
      ]
    },
    [
      {
        kind: "copula",
        fields: ["variant", "basicForm", "polarity", "negativeBridgeForm", "polite"]
      },
      { kind: "idiom", fields: ["idiom", "variant", "connectiveSurface"] },
      { kind: "connective", fields: ["connective", "allomorph"] }
    ],
    {
      sourcePredicateShape: true,
      projectionCategories: ["nominal"]
    }
  ),
  claim: NOUN_COPULA_PERMISSION_CLAIM,
  records: [
    nounCopulaPermissionRecord("noun_copula_permission_terminal"),
    nounCopulaPermissionRecord("noun_copula_permission_conditional", {
      connective: "conditional",
      allomorph: "to"
    }),
    nounCopulaPermissionRecord("noun_copula_permission_quotative", {
      connective: "quotative",
      allomorph: "to"
    }),
    nounCopulaPermissionRecord("noun_copula_permission_adversative", {
      connective: "adversative",
      allomorph: "other"
    })
  ],
  nonAdmission: "reject"
};

const NOUN_COPULA_FORBIDDEN_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "noun_copula_forbidden_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "forbidden",
      opKinds: ["idiom"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const NOUN_COPULA_FORBIDDEN_QUOTATIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "noun_copula_forbidden_quotative_core",
  root: "aux_layer",
  ops: [
    ...NOUN_COPULA_FORBIDDEN_TERMINAL_CLAIM_DOMAIN.ops,
    {
      id: "connective",
      opKinds: ["connective"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const NOUN_COPULA_FORBIDDEN_COPULA_SLOT: ProductionOpSlot = {
  id: "copula",
  role: "core",
  patterns: [productionOpPattern("copula", "copula_fields", {
    variantIn: ["basic"],
    polarityIn: ["affirmative"],
    basicForm: "absent",
    negativeBridgeFormIn: ["absent"],
    politeIn: [false]
  })],
  cardinality: { min: 1, max: 1 }
};

const NOUN_COPULA_FORBIDDEN_IDIOM_SLOT: ProductionOpSlot = {
  id: "forbidden",
  role: "core",
  patterns: [productionOpPattern("idiom", "forbidden_idiom_fields", {
    polarityIn: ["negative"],
    politeIn: [false],
    pastIn: [false],
    inner: "absent"
  })],
  cardinality: { min: 1, max: 1 }
};

function nounCopulaForbiddenRecord(
  id: string,
  quotative: boolean,
  host: {
    readonly sourceShape: "nominal" | "na_adjective";
    readonly projectionCategory: "nominal" | "adjectival_predicate";
  } = {
    sourceShape: "nominal",
    projectionCategory: "nominal"
  }
): ProductionRecord {
  const connectiveSlots: readonly ProductionOpSlot[] = quotative
    ? [{
        id: "connective",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["to"]
        })],
        cardinality: { min: 1, max: 1 }
      }]
    : [];
  return {
    id,
    shape: {
      root: "aux_layer",
      ops: [
        NOUN_COPULA_FORBIDDEN_COPULA_SLOT,
        NOUN_COPULA_FORBIDDEN_IDIOM_SLOT,
        ...connectiveSlots
      ]
    },
    conditions: {
      host: {
        sourceShapes: [host.sourceShape],
        projectionCategories: [host.projectionCategory]
      },
      terminal: { kinds: [null], sfp: "forbidden" },
      clause: { intakeSites: NOUN_COPULA_SINGLE_HEAD_INTAKE_SITES }
    },
    loweringKey: "noun_copula_forbidden"
  };
}

export const NOUN_COPULA_FORBIDDEN_FAMILY: ProductionFamily = {
  id: "noun_copula_forbidden",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [
    NOUN_COPULA_FORBIDDEN_TERMINAL_CLAIM_DOMAIN,
    NOUN_COPULA_FORBIDDEN_QUOTATIVE_CLAIM_DOMAIN
  ],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [2, 3],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 },
        { kind: "absolute", index: 2 }
      ],
      kindCounts: [
        { opKinds: ["copula"], cap: 1 },
        { opKinds: ["idiom"], cap: 1 },
        { opKinds: ["connective"], cap: 1 }
      ]
    },
    [
      {
        kind: "copula",
        fields: ["variant", "basicForm", "polarity", "negativeBridgeForm", "polite"]
      },
      { kind: "idiom", fields: ["idiom", "polarity", "polite", "past", "inner"] },
      { kind: "connective", fields: ["connective", "allomorph"] }
    ],
    {
      sourcePredicateShape: true,
      projectionCategories: ["nominal", "adjectival_predicate"]
    }
  ),
  claim: NOUN_COPULA_FORBIDDEN_CLAIM,
  records: [
    nounCopulaForbiddenRecord("noun_copula_forbidden_terminal", false),
    nounCopulaForbiddenRecord("noun_copula_forbidden_quotative", true),
    nounCopulaForbiddenRecord(
      "na_adjective_copula_forbidden_quotative",
      true,
      {
        sourceShape: "na_adjective",
        projectionCategory: "adjectival_predicate"
      }
    )
  ],
  nonAdmission: "reject"
};

const NOUN_COPULA_NEGATIVE_LIKENESS_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "noun_copula_negative_likeness_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "likeness",
      opKinds: ["modal"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: ["attributive"], sfp: "forbidden" }
};

const NOUN_COPULA_NEGATIVE_LIKENESS_RECORD: ProductionRecord = {
  id: "noun_copula_negative_likeness_attributive",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"],
          polarityIn: ["negative"],
          basicForm: "absent",
          negativeBridgeFormIn: ["absent", "dewa", "ja"],
          politeIn: [false]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "likeness",
        role: "core",
        patterns: [productionOpPattern("modal", "youda_modal_fields", {
          formIn: ["youda"],
          terminalIn: ["attributive_na"],
          readingIn: ["likeness"],
          politeIn: [false],
          pastIn: [false],
          inner: "absent"
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["nominal"],
      projectionCategories: ["nominal"]
    },
    terminal: { kinds: ["attributive"], sfp: "forbidden" },
    clause: { intakeSites: NOUN_COPULA_SINGLE_HEAD_INTAKE_SITES }
  },
  loweringKey: "noun_copula_negative_likeness"
};

export const NOUN_COPULA_NEGATIVE_LIKENESS_FAMILY: ProductionFamily = {
  id: "noun_copula_negative_likeness",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: { terminal: { kinds: ["attributive"], sfp: "forbidden" } },
  claimDomains: [NOUN_COPULA_NEGATIVE_LIKENESS_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [2],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 }
      ],
      kindCounts: [
        { opKinds: ["copula"], cap: 1 },
        { opKinds: ["modal"], cap: 1 }
      ]
    },
    [
      {
        kind: "copula",
        fields: ["variant", "basicForm", "polarity", "negativeBridgeForm", "polite"]
      },
      {
        kind: "modal",
        fields: ["modal", "form", "terminal", "reading", "polite", "past", "inner"]
      }
    ],
    {
      sourcePredicateShape: true,
      projectionCategories: ["nominal"]
    }
  ),
  claim: NOUN_COPULA_NEGATIVE_LIKENESS_CLAIM,
  records: [NOUN_COPULA_NEGATIVE_LIKENESS_RECORD],
  nonAdmission: "reject"
};

const NOUN_COPULA_REPORTED_ATTRIBUTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "noun_copula_reported_attributive_core",
  root: "aux_layer",
  ops: [
    { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
    { id: "reported", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: ["attributive"], sfp: "forbidden" }
};

const NOUN_COPULA_REPORTED_ATTRIBUTIVE_RECORD: ProductionRecord = {
  id: "noun_copula_reported_attributive",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"],
          polarityIn: ["affirmative"],
          basicForm: "absent",
          negativeBridgeFormIn: ["absent"],
          politeIn: [false]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "reported",
        role: "core",
        patterns: [productionOpPattern("modal", "souda_hearsay_modal_fields", {
          readingIn: ["hearsay"],
          politeIn: [false],
          pastIn: [false],
          inner: "absent"
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: { sourceShapes: ["nominal"], projectionCategories: ["nominal"] },
    terminal: { kinds: ["attributive"], sfp: "forbidden" },
    clause: { intakeSites: NOUN_COPULA_SINGLE_HEAD_INTAKE_SITES }
  },
  loweringKey: "noun_copula_reported_attributive"
};

export const NOUN_COPULA_REPORTED_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "noun_copula_reported_attributive",
  legacyFallback: "retired",
  conditions: { terminal: { kinds: ["attributive"], sfp: "forbidden" } },
  claimDomains: [NOUN_COPULA_REPORTED_ATTRIBUTIVE_CLAIM_DOMAIN],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [2],
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "absolute", index: 1 }
        ],
        kindCounts: [
          { opKinds: ["copula"], cap: 1 },
          { opKinds: ["modal"], cap: 1 }
        ]
      },
      [
        {
          kind: "copula",
          fields: ["variant", "basicForm", "polarity", "negativeBridgeForm", "polite"]
        },
        { kind: "modal", fields: ["modal", "reading", "polite", "past", "inner"] }
      ],
      { sourcePredicateShape: true, projectionCategories: ["nominal"] },
      [{ kind: "terminal_membership", values: ["attributive"] }]
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_REPORTED_ATTRIBUTIVE_CLAIM,
  records: [NOUN_COPULA_REPORTED_ATTRIBUTIVE_RECORD],
  nonAdmission: "reject"
};

const NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "noun_scope_bridge_attributive_core",
  root: "aux_layer",
  ops: [
    {
      id: "scope_bridge",
      opKinds: ["scopeBridge"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "projection_wrapper",
      opKinds: ["polite", "tense"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: ["attributive"], sfp: "forbidden" }
};

const NOUN_SCOPE_BRIDGE_SLOT: ProductionOpSlot = {
  id: "scope_bridge",
  role: "core",
  patterns: NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_BRIDGE_ARGS.map(
    (args) => productionOpPattern("scopeBridge", "scope_bridge_fields", args)
  ),
  cardinality: { min: 1, max: 1 }
};

function nounScopeBridgeAttributiveRecord(
  id: string,
  wrapper: "polite" | "tense"
): ProductionRecord {
  return {
    id,
    shape: {
      root: "aux_layer",
      ops: [
        NOUN_SCOPE_BRIDGE_SLOT,
        {
          id: "projection_wrapper",
          role: "core",
          patterns: wrapper === "polite"
            ? [{ kind: "polite" }]
            : [productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] })],
          cardinality: { min: 1, max: 1 }
        }
      ]
    },
    conditions: {
      host: {
        sourceShapes: ["nominal", "lexical_adverb"],
        projectionCategories: ["nominal"]
      },
      terminal: { kinds: ["attributive"], sfp: "forbidden" },
      clause: { intakeSites: NOUN_COPULA_SINGLE_HEAD_INTAKE_SITES }
    },
    loweringKey: "noun_scope_bridge_attributive"
  };
}

export const NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "noun_scope_bridge_attributive",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: { terminal: { kinds: ["attributive"], sfp: "forbidden" } },
  claimDomains: [NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [2],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 }
      ],
      kindCounts: [
        { opKinds: ["scopeBridge"], cap: 1 },
        { opKinds: ["polite", "tense"], cap: 1 }
      ]
    },
    [
      {
        kind: "scopeBridge",
        fields: ["head", "form", "particle", "polarity", "chainDepth", "polite"]
      },
      { kind: "tense", fields: ["tense"] }
    ],
    {
      sourcePredicateShape: true,
      projectionCategories: ["nominal"]
    }
  ),
  claim: NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_CLAIM,
  records: [
    nounScopeBridgeAttributiveRecord("noun_scope_bridge_attributive_present_polite", "polite"),
    nounScopeBridgeAttributiveRecord("noun_scope_bridge_attributive_past", "tense")
  ],
  nonAdmission: "reject"
};
