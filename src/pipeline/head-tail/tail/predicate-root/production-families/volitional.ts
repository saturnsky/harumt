import { productionOpPattern } from "../production-admission-contract.js";
import { CONJECTURAL_QUOTATIVE_CLAIM, QUOTATIVE_INSISTENT_TERMINAL_CLAIM, VOLITIONAL_NEGATIVE_INVITE_CLAIM, VOLITIONAL_QUESTION_QUOTATIVE_CLAIM, VOLITIONAL_REFORMULATION_QUESTION_CLAIM, VOLITIONAL_QUOTE_ATTRIBUTIVE_CLAIM, VOLITIONAL_REQUEST_COMPLEMENT_CLAIM, VOLITIONAL_RETROSPECTIVE_QUOTATIVE_CLAIM, VOLITIONAL_WISH_COMPLEMENT_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionOpSlot, ProductionRecord } from "../production-registry.js";
import { claimDependencies } from "./shared.js";

const VOLITIONAL_NEGATIVE_INVITE_COPULA_SLOT: ProductionOpSlot = {
  id: "invite_copula",
  role: "core",
  patterns: [productionOpPattern("copula", "copula_fields", {
    variantIn: ["basic"],
    polarityIn: ["negative"],
    basicForm: "absent",
    negativeBridgeFormIn: ["ja"],
    politeIn: [false]
  })],
  cardinality: { min: 1, max: 1 }
};

const VOLITIONAL_NEGATIVE_INVITE_HOST = {
  stemKinds: ["verb"],
  stemMoods: ["volitional"],
  sourceShapes: ["verb", "sahen_verbalization"],
  projectionCategories: ["verbal_predicate"]
} as const;

export const VOLITIONAL_NEGATIVE_INVITE_FAMILY: ProductionFamily = {
  id: "volitional_negative_invite",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: {
    terminal: {
      kinds: [null],
      sfp: "forbidden",
      terminalPunctuationQuestion: "forbidden"
    }
  },
  claimDomains: [
    {
      id: "volitional_negative_invite_terminal_core",
      root: "aux_layer",
      ops: [
        { id: "invite_copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: {
        kinds: [null],
        sfp: "forbidden",
        terminalPunctuationQuestion: "forbidden"
      }
    },
    {
      id: "volitional_negative_invite_question_quotative_core",
      root: "aux_layer",
      ops: [
        { id: "invite_copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        { id: "question_quotative", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: {
        kinds: [null],
        sfp: "forbidden",
        terminalPunctuationQuestion: "forbidden"
      }
    }
  ],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [1, 2],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 }
      ]
    },
    [
      {
        kind: "copula",
        fields: ["variant", "polarity", "basicForm", "negativeBridgeForm", "polite"]
      },
      { kind: "connective", fields: ["connective", "allomorph"] }
    ],
    {
      stemKind: true,
      stemMood: true,
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate"]
    }
  ),
  claim: VOLITIONAL_NEGATIVE_INVITE_CLAIM,
  records: [
    {
      id: "volitional_negative_invite_terminal",
      shape: { root: "aux_layer", ops: [VOLITIONAL_NEGATIVE_INVITE_COPULA_SLOT] },
      conditions: {
        host: VOLITIONAL_NEGATIVE_INVITE_HOST,
        terminal: {
          kinds: [null],
          sfp: "forbidden",
          terminalPunctuationQuestion: "forbidden"
        }
      },
      loweringKey: "volitional_negative_invite"
    },
    {
      id: "volitional_negative_invite_question_quotative",
      shape: {
        root: "aux_layer",
        ops: [
          VOLITIONAL_NEGATIVE_INVITE_COPULA_SLOT,
          {
            id: "question_quotative",
            role: "core",
            patterns: [productionOpPattern("connective", "connective_fields", {
              connectiveIn: ["question_quotative"],
              surfaceAllomorphIn: ["to"]
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: VOLITIONAL_NEGATIVE_INVITE_HOST,
        terminal: {
          kinds: [null],
          sfp: "forbidden",
          terminalPunctuationQuestion: "forbidden"
        }
      },
      loweringKey: "volitional_negative_invite"
    }
  ],
  nonAdmission: "reject"
};

export const VOLITIONAL_QUESTION_QUOTATIVE_FAMILY: ProductionFamily = {
  id: "volitional_question_quotative",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: {
    terminal: {
      kinds: [null],
      sfp: "forbidden",
      terminalPunctuationQuestion: "forbidden"
    }
  },
  claimDomains: [{
    id: "volitional_question_quotative_core",
    root: "aux_layer",
    ops: [{
      id: "question_quotative",
      opKinds: ["connective"],
      cardinality: { min: 1, max: 1 }
    }],
    terminal: {
      kinds: [null],
      sfp: "forbidden",
      terminalPunctuationQuestion: "forbidden"
    }
  }],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [1],
        positions: [{ kind: "absolute", index: 0 }]
      },
      [{ kind: "connective", fields: ["connective", "allomorph"] }],
      {
        stemKind: true,
        stemMood: true,
        sourcePredicateShape: true,
        projectionCategories: ["verbal_predicate"]
      }
    ),
    root: { quoteBinding: true }
  },
  claim: VOLITIONAL_QUESTION_QUOTATIVE_CLAIM,
  records: [{
    id: "volitional_question_quotative_terminal",
    shape: {
      root: "aux_layer",
      ops: [{
        id: "question_quotative",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["question_quotative"],
          surfaceAllomorphIn: ["tte"]
        })],
        cardinality: { min: 1, max: 1 }
      }]
    },
    conditions: {
      host: {
        stemKinds: ["verb"],
        stemMoods: ["volitional"],
        sourceShapes: ["verb"],
        projectionCategories: ["verbal_predicate"]
      },
      terminal: {
        kinds: [null],
        sfp: "forbidden",
        terminalPunctuationQuestion: "forbidden"
      }
    },
    loweringKey: "volitional_question_quotative"
  }],
  nonAdmission: "reject"
};

export const VOLITIONAL_REFORMULATION_QUESTION_FAMILY: ProductionFamily = {
  id: "volitional_reformulation_question",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: {
    terminal: {
      kinds: [null],
      sfp: "forbidden",
      terminalPunctuationQuestion: "forbidden"
    }
  },
  claimDomains: [{
    id: "volitional_reformulation_question_core",
    root: "aux_layer",
    ops: [{
      id: "reformulation",
      opKinds: ["connective"],
      cardinality: { min: 1, max: 1 }
    }],
    terminal: {
      kinds: [null],
      sfp: "forbidden",
      terminalPunctuationQuestion: "forbidden"
    }
  }],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [1],
        positions: [{ kind: "absolute", index: 0 }]
      },
      [{ kind: "connective", fields: ["connective", "allomorph"] }],
      {
        stemKind: true,
        stemMood: true,
        sourcePredicateShape: true,
        projectionCategories: ["verbal_predicate"]
      }
    ),
    root: { quoteBinding: true }
  },
  claim: VOLITIONAL_REFORMULATION_QUESTION_CLAIM,
  records: [{
    id: "volitional_reformulation_question_terminal",
    shape: {
      root: "aux_layer",
      ops: [{
        id: "reformulation",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["reformulation"],
          surfaceAllomorphIn: ["reformulation_ka"]
        })],
        cardinality: { min: 1, max: 1 }
      }]
    },
    conditions: {
      host: {
        stemKinds: ["verb"],
        stemMoods: ["volitional"],
        sourceShapes: ["verb"],
        projectionCategories: ["verbal_predicate"]
      },
      terminal: {
        kinds: [null],
        sfp: "forbidden",
        terminalPunctuationQuestion: "forbidden"
      }
    },
    loweringKey: "volitional_reformulation_question"
  }],
  nonAdmission: "reject"
};

const VOLITIONAL_RETROSPECTIVE_QUOTATIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "volitional_retrospective_quotative_core",
  root: "aux_layer",
  ops: [{
    id: "retrospective_quotative",
    opKinds: ["connective"],
    cardinality: { min: 1, max: 1 }
  }],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const VOLITIONAL_RETROSPECTIVE_QUOTATIVE_RECORD: ProductionRecord = {
  id: "volitional_retrospective_quotative",
  shape: {
    root: "aux_layer",
    ops: [{
      id: "retrospective_quotative",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["retrospective_quotative"],
        retrospectiveQuotativeFlavorIn: ["direct_thought"]
      })],
      cardinality: { min: 1, max: 1 }
    }]
  },
  conditions: {
    host: { stemKinds: ["verb"], stemMoods: ["volitional"] },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: {
      intakeSites: [
        "candidate_scan",
        "quote_prefix",
        "assembler_resumable_prefix",
        "committed_render"
      ]
    }
  },
  loweringKey: "volitional_retrospective_quotative"
};

const VOLITIONAL_DELIBERATIVE_RETROSPECTIVE_QUOTATIVE_RECORD: ProductionRecord = {
  id: "volitional_deliberative_retrospective_quotative",
  shape: {
    root: "aux_layer",
    ops: [{
      id: "retrospective_quotative",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["retrospective_quotative"],
        retrospectiveQuotativeFlavorIn: ["volitional_deliberative"]
      })],
      cardinality: { min: 1, max: 1 }
    }]
  },
  conditions: {
    host: { stemKinds: ["verb"], stemMoods: ["volitional"] },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: {
      intakeSites: [
        "candidate_scan",
        "quote_prefix",
        "assembler_resumable_prefix",
        "committed_render"
      ]
    }
  },
  loweringKey: "volitional_deliberative_retrospective_quotative"
};

export const VOLITIONAL_RETROSPECTIVE_QUOTATIVE_FAMILY: ProductionFamily = {
  id: "volitional_retrospective_quotative",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [VOLITIONAL_RETROSPECTIVE_QUOTATIVE_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [1],
      positions: [{ kind: "absolute", index: 0 }],
      kindCounts: [{ opKinds: ["connective"], cap: 1 }]
    },
    [{ kind: "connective", fields: ["connective", "retrospectiveQuotativeFlavor"] }],
    { stemKind: true, stemMood: true }
  ),
  claim: VOLITIONAL_RETROSPECTIVE_QUOTATIVE_CLAIM,
  records: [
    VOLITIONAL_RETROSPECTIVE_QUOTATIVE_RECORD,
    VOLITIONAL_DELIBERATIVE_RETROSPECTIVE_QUOTATIVE_RECORD
  ],
  nonAdmission: "reject"
};

const CONJECTURAL_QUOTATIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "conjectural_quotative_core",
  root: "aux_layer",
  ops: [{
    id: "quotative",
    opKinds: ["connective"],
    cardinality: { min: 1, max: 1 }
  }],
  terminal: { kinds: [null], sfp: "forbidden" }
};

export const CONJECTURAL_QUOTATIVE_FAMILY: ProductionFamily = {
  id: "conjectural_quotative",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [CONJECTURAL_QUOTATIVE_CLAIM_DOMAIN],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [1],
        positions: [{ kind: "absolute", index: 0 }],
        kindCounts: [{ opKinds: ["connective"], cap: 1 }]
      },
      [{ kind: "connective", fields: ["connective", "allomorph"] }],
      {
        stemKind: true,
        stemMood: true,
        sourcePredicateShape: true,
        projectionCategories: ["adjectival_predicate", "verbal_predicate"]
      }
    ),
    root: { quoteBinding: true }
  },
  claim: CONJECTURAL_QUOTATIVE_CLAIM,
  records: [{
    id: "conjectural_quotative_to",
    shape: {
      root: "aux_layer",
      ops: [{
        id: "quotative",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["to"]
        })],
        cardinality: { min: 1, max: 1 }
      }]
    },
    conditions: {
      host: {
        stemMoods: ["conjectural"],
        sourceShapes: ["i_adjective"],
        projectionCategories: ["adjectival_predicate", "verbal_predicate"]
      },
      terminal: { kinds: [null], sfp: "forbidden" },
      clause: {
        intakeSites: [
          "candidate_scan",
          "quote_prefix",
          "assembler_resumable_prefix",
          "committed_render"
        ]
      }
    },
    loweringKey: "conjectural_quotative"
  }],
  nonAdmission: "reject"
};

const QUOTATIVE_INSISTENT_STATEMENT_DOMAIN: ProductionFamilyClaimDomain = {
  id: "quotative_insistent_statement_core",
  root: "aux_layer",
  ops: [],
  terminal: {
    kinds: [null],
    sfp: "required",
    sfpEffects: ["quotative_insistent"]
  }
};

const QUOTATIVE_INSISTENT_IMPERATIVE_DOMAIN: ProductionFamilyClaimDomain = {
  id: "quotative_insistent_imperative_core",
  root: "aux_layer",
  ops: [],
  terminal: {
    kinds: ["imperative"],
    sfp: "required",
    sfpEffects: ["quotative_insistent"]
  }
};

export const QUOTATIVE_INSISTENT_TERMINAL_FAMILY: ProductionFamily = {
  id: "quotative_insistent_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: {
      kinds: [null, "imperative"],
      sfp: "required",
      sfpEffects: ["quotative_insistent"]
    }
  },
  claimDomains: [
    QUOTATIVE_INSISTENT_STATEMENT_DOMAIN,
    QUOTATIVE_INSISTENT_IMPERATIVE_DOMAIN
  ],
  claimDependencies: {
    terminal: [
      { kind: "terminal_membership", values: [null] },
      { kind: "terminal_membership", values: ["imperative"] },
      { kind: "sfp_effect_membership", values: ["quotative_insistent"] }
    ],
    host: {
      stemMood: true,
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate", "adjectival_predicate"]
    },
    root: { quoteBinding: true },
    sequence: { lengthThresholds: [0] }
  },
  claim: QUOTATIVE_INSISTENT_TERMINAL_CLAIM,
  records: [
    {
      id: "quotative_insistent_statement",
      shape: { root: "aux_layer", ops: [] },
      conditions: {
        host: {
          sourceShapes: ["verb", "i_adjective"],
          projectionCategories: ["verbal_predicate", "adjectival_predicate"]
        },
        terminal: {
          kinds: [null],
          sfp: "required",
          sfpEffects: ["quotative_insistent"]
        }
      },
      loweringKey: "quotative_insistent_terminal"
    },
    {
      id: "quotative_insistent_imperative",
      shape: { root: "aux_layer", ops: [] },
      conditions: {
        host: {
          sourceShapes: ["verb"],
          projectionCategories: ["verbal_predicate"]
        },
        terminal: {
          kinds: ["imperative"],
          sfp: "required",
          sfpEffects: ["quotative_insistent"]
        }
      },
      loweringKey: "quotative_insistent_terminal"
    }
  ],
  nonAdmission: "reject"
};

const VOLITIONAL_WISH_COMPLEMENT_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "volitional_wish_complement_core",
  root: "aux_layer",
  ops: [{
    id: "wish_complement",
    opKinds: ["connective"],
    cardinality: { min: 1, max: 1 }
  }],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const VOLITIONAL_WISH_COMPLEMENT_RECORD: ProductionRecord = {
  id: "volitional_wish_complement",
  shape: {
    root: "aux_layer",
    ops: [{
      id: "wish_complement",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["wish_complement"]
      })],
      cardinality: { min: 1, max: 1 }
    }]
  },
  conditions: {
    host: { stemKinds: ["verb"], stemMoods: ["volitional"] },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: {
      intakeSites: [
        "candidate_scan",
        "quote_prefix",
        "assembler_resumable_prefix",
        "committed_render"
      ]
    }
  },
  loweringKey: "volitional_wish_complement"
};

export const VOLITIONAL_WISH_COMPLEMENT_FAMILY: ProductionFamily = {
  id: "volitional_wish_complement",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [VOLITIONAL_WISH_COMPLEMENT_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [1],
      positions: [{ kind: "absolute", index: 0 }],
      kindCounts: [{ opKinds: ["connective"], cap: 1 }]
    },
    [{ kind: "connective", fields: ["connective"] }],
    { stemKind: true, stemMood: true }
  ),
  claim: VOLITIONAL_WISH_COMPLEMENT_CLAIM,
  records: [VOLITIONAL_WISH_COMPLEMENT_RECORD],
  nonAdmission: "reject"
};

const VOLITIONAL_QUOTE_ATTRIBUTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "volitional_quote_attributive_core",
  root: "aux_layer",
  ops: [{
    id: "quote_attributive",
    opKinds: ["connective"],
    cardinality: { min: 1, max: 1 }
  }],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const VOLITIONAL_INTENT_QUOTE_ATTRIBUTIVE_RECORD: ProductionRecord = {
  id: "volitional_intent_quote_attributive",
  shape: {
    root: "aux_layer",
    ops: [{
      id: "quote_attributive",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["predicate_projection_quote_attributive"],
        quoteAttributiveFlavorIn: ["intentional_modifier"]
      })],
      cardinality: { min: 1, max: 1 }
    }]
  },
  conditions: {
    host: { stemKinds: ["verb"], stemMoods: ["volitional"] },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: {
      intakeSites: [
        "candidate_scan",
        "quote_prefix",
        "assembler_resumable_prefix",
        "committed_render"
      ]
    }
  },
  loweringKey: "volitional_intent_quote_attributive"
};

const VOLITIONAL_COHORTATIVE_QUOTE_ATTRIBUTIVE_RECORD: ProductionRecord = {
  id: "volitional_cohortative_quote_attributive",
  shape: {
    root: "aux_layer",
    ops: [{
      id: "quote_attributive",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["predicate_projection_quote_attributive"],
        quoteAttributiveFlavorIn: ["cohortative_quote"]
      })],
      cardinality: { min: 1, max: 1 }
    }]
  },
  conditions: {
    host: { stemKinds: ["verb"], stemMoods: ["volitional"] },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: {
      intakeSites: [
        "candidate_scan",
        "quote_prefix",
        "assembler_resumable_prefix",
        "committed_render"
      ]
    }
  },
  loweringKey: "volitional_cohortative_quote_attributive"
};

export const VOLITIONAL_QUOTE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "volitional_quote_attributive",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [VOLITIONAL_QUOTE_ATTRIBUTIVE_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [1],
      positions: [{ kind: "absolute", index: 0 }],
      kindCounts: [{ opKinds: ["connective"], cap: 1 }]
    },
    [{ kind: "connective", fields: ["connective", "quoteAttributiveFlavor"] }],
    { stemKind: true, stemMood: true }
  ),
  claim: VOLITIONAL_QUOTE_ATTRIBUTIVE_CLAIM,
  records: [
    VOLITIONAL_INTENT_QUOTE_ATTRIBUTIVE_RECORD,
    VOLITIONAL_COHORTATIVE_QUOTE_ATTRIBUTIVE_RECORD
  ],
  nonAdmission: "reject"
};

const VOLITIONAL_REQUEST_COMPLEMENT_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "volitional_request_complement_core",
  root: "aux_layer",
  ops: [{
    id: "request_complement",
    opKinds: ["connective"],
    cardinality: { min: 1, max: 1 }
  }],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const VOLITIONAL_REQUEST_COMPLEMENT_RECORD: ProductionRecord = {
  id: "volitional_request_complement",
  shape: {
    root: "aux_layer",
    ops: [{
      id: "request_complement",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["request_complement"]
      })],
      cardinality: { min: 1, max: 1 }
    }]
  },
  conditions: {
    host: { stemKinds: ["verb"], stemMoods: ["volitional"] },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: {
      intakeSites: [
        "candidate_scan",
        "quote_prefix",
        "assembler_resumable_prefix",
        "committed_render"
      ]
    }
  },
  loweringKey: "volitional_request_complement"
};

export const VOLITIONAL_REQUEST_COMPLEMENT_FAMILY: ProductionFamily = {
  id: "volitional_request_complement",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [VOLITIONAL_REQUEST_COMPLEMENT_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [1],
      positions: [{ kind: "absolute", index: 0 }],
      kindCounts: [{ opKinds: ["connective"], cap: 1 }]
    },
    [{ kind: "connective", fields: ["connective"] }],
    { stemKind: true, stemMood: true }
  ),
  claim: VOLITIONAL_REQUEST_COMPLEMENT_CLAIM,
  records: [VOLITIONAL_REQUEST_COMPLEMENT_RECORD],
  nonAdmission: "reject"
};
