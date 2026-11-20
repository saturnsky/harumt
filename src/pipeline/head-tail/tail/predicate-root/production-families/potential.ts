import { productionOpPattern } from "../production-admission-contract.js";
import { PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_CLAIM, REINFORCED_POTENTIAL_COMPOSITION_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionOpSlot, ProductionRecord } from "../production-registry.js";

const REINFORCED_POTENTIAL_SLOT: ProductionOpSlot = {
  id: "reinforced_potential",
  role: "core",
  patterns: [productionOpPattern(
    "postverbAuxiliary",
    "postverb_auxiliary_fields",
    {
      auxiliaryKindIn: ["potential"],
      potentialCompositionIn: ["reinforce_existing"]
    }
  )],
  cardinality: { min: 1, max: 1 }
};

const PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_DOMAIN: ProductionFamilyClaimDomain = {
  id: "proposition_assertability_koto_dekiru_core",
  root: "aux_layer",
  ops: [
    {
      id: "quote_carrier",
      opKinds: ["predicateQuoteCarrier"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "potential",
      opKinds: ["idiom"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "negation",
      opKinds: ["negation"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "adversative",
      opKinds: ["connective"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_RECORD: ProductionRecord = {
  id: "i_adjective_proposition_assertability_koto_dekiru",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "quote_carrier",
        role: "core",
        patterns: [productionOpPattern(
          "predicateQuoteCarrier",
          "predicate_quote_carrier_fields",
          { styleIn: ["compact_toiu"], allomorphIn: ["toiu"] }
        )],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "potential",
        role: "core",
        patterns: [productionOpPattern(
          "idiom",
          "potential_koto_dekiru_fields",
          {
            particleKindIn: ["wa"],
            focusParticle: "absent",
            polarityIn: ["affirmative"],
            politeIn: [false],
            pastIn: [false]
          }
        )],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "negation",
        role: "core",
        patterns: [productionOpPattern("negation", "negation_fields", {
          chainDepthIn: [1],
          chainPastIn: [false],
          sourceSplit: "absent"
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "adversative",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["adversative"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["i_adjective"],
      projectionCategories: ["adjectival_predicate", "verbal_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" }
  },
  loweringKey: "proposition_assertability_koto_dekiru"
};

export const PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_FAMILY: ProductionFamily = {
  id: "proposition_assertability_koto_dekiru",
  legacyFallback: "retired",
  claimDomains: [PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_DOMAIN],
  claimDependencies: {
    terminal: [
      { kind: "terminal_membership", values: [null] },
      { kind: "sfp_presence" }
    ],
    host: {
      stemMood: true,
      sourcePredicateShape: true,
      projectionCategories: ["adjectival_predicate", "verbal_predicate"]
    },
    root: { quoteBinding: true },
    ops: [
      { kind: "predicateQuoteCarrier", fields: ["style", "allomorph"] },
      {
        kind: "idiom",
        fields: ["idiom", "particleKind", "focusParticle", "polarity", "polite", "past"]
      },
      { kind: "negation", fields: ["chainDepth", "chainPast", "sourceSplit"] },
      { kind: "connective", fields: ["connective"] }
    ],
    sequence: {
      lengthThresholds: [4],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 },
        { kind: "absolute", index: 2 },
        { kind: "absolute", index: 3 }
      ]
    }
  },
  claim: PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_CLAIM,
  records: [PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_RECORD],
  nonAdmission: "reject"
};

const REINFORCED_POTENTIAL_CONDITIONAL_DOMAIN: ProductionFamilyClaimDomain = {
  id: "reinforced_potential_conditional_core",
  root: "aux_layer",
  ops: [
    { id: "reinforced_potential", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
    { id: "conditional", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden", sfpEmphaticQuestion: false }
};

const REINFORCED_POTENTIAL_ATTRIBUTIVE_DOMAIN: ProductionFamilyClaimDomain = {
  id: "reinforced_potential_attributive_core",
  root: "aux_layer",
  ops: [
    { id: "reinforced_potential", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: ["attributive"], sfp: "forbidden", sfpEmphaticQuestion: false }
};

const REINFORCED_POTENTIAL_NODA_QUESTION_DOMAIN: ProductionFamilyClaimDomain = {
  id: "reinforced_potential_noda_question_core",
  root: "aux_layer",
  ops: [
    { id: "reinforced_potential", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
    { id: "noda", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: {
    kinds: [null],
    sfp: "required",
    sfpEffects: ["ka"],
    sfpEmphaticQuestion: false
  }
};

const REINFORCED_POTENTIAL_QUOTE_ATTRIBUTIVE_DOMAIN: ProductionFamilyClaimDomain = {
  id: "reinforced_potential_quote_attributive_core",
  root: "aux_layer",
  ops: [
    { id: "reinforced_potential", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
    { id: "quote_carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: ["attributive"], sfp: "forbidden", sfpEmphaticQuestion: false }
};

const REINFORCED_POTENTIAL_HOST_CONDITIONS = {
  sourceShapes: ["verb"],
  projectionCategories: ["verbal_predicate"]
} as const;

const REINFORCED_POTENTIAL_CONDITIONAL_RECORD: ProductionRecord = {
  id: "reinforced_potential_conditional",
  shape: {
    root: "aux_layer",
    ops: [
      REINFORCED_POTENTIAL_SLOT,
      {
        id: "conditional",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["conditional"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REINFORCED_POTENTIAL_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: ["committed_render"] }
  },
  loweringKey: "reinforced_potential_connective"
};

const REINFORCED_POTENTIAL_ATTRIBUTIVE_RECORD: ProductionRecord = {
  id: "reinforced_potential_attributive",
  shape: { root: "aux_layer", ops: [REINFORCED_POTENTIAL_SLOT] },
  conditions: {
    host: REINFORCED_POTENTIAL_HOST_CONDITIONS,
    terminal: { kinds: ["attributive"], sfp: "forbidden" },
    clause: { intakeSites: ["committed_render"] }
  },
  loweringKey: "reinforced_potential_attributive"
};

const REINFORCED_POTENTIAL_NODA_QUESTION_RECORD: ProductionRecord = {
  id: "reinforced_potential_noda_question",
  shape: {
    root: "aux_layer",
    ops: [
      REINFORCED_POTENTIAL_SLOT,
      {
        id: "noda",
        role: "core",
        patterns: [productionOpPattern("modal", "modal_fields", {
          modalIn: ["noda"],
          politeIn: [false],
          pastIn: [false],
          inner: "absent"
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REINFORCED_POTENTIAL_HOST_CONDITIONS,
    terminal: {
      kinds: [null],
      sfp: "required",
      sfpEffects: ["ka"],
      sfpEmphaticQuestion: false
    },
    clause: { intakeSites: ["committed_render"] }
  },
  loweringKey: "reinforced_potential_noda_question"
};

const REINFORCED_POTENTIAL_QUOTE_ATTRIBUTIVE_RECORD: ProductionRecord = {
  id: "reinforced_potential_quote_attributive",
  shape: {
    root: "aux_layer",
    ops: [
      REINFORCED_POTENTIAL_SLOT,
      {
        id: "quote_carrier",
        role: "core",
        patterns: [productionOpPattern(
          "predicateQuoteCarrier",
          "predicate_quote_carrier_fields",
          { styleIn: ["compact_toiu"], allomorphIn: ["toiu"] }
        )],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REINFORCED_POTENTIAL_HOST_CONDITIONS,
    terminal: { kinds: ["attributive"], sfp: "forbidden" },
    clause: { intakeSites: ["committed_render"] }
  },
  loweringKey: "reinforced_potential_attributive"
};

export const REINFORCED_POTENTIAL_COMPOSITION_FAMILY: ProductionFamily = {
  id: "reinforced_potential_composition",
  legacyFallback: "retired",
  claimDomains: [
    REINFORCED_POTENTIAL_CONDITIONAL_DOMAIN,
    REINFORCED_POTENTIAL_ATTRIBUTIVE_DOMAIN,
    REINFORCED_POTENTIAL_NODA_QUESTION_DOMAIN,
    REINFORCED_POTENTIAL_QUOTE_ATTRIBUTIVE_DOMAIN
  ],
  claimDependencies: {
    terminal: [
      { kind: "terminal_membership", values: [null] },
      { kind: "terminal_membership", values: ["attributive"] },
      { kind: "sfp_presence" },
      { kind: "sfp_effect_membership", values: ["ka"] }
    ],
    host: {
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate"]
    },
    root: { quoteBinding: true },
    ops: [
      {
        kind: "postverbAuxiliary",
        fields: ["auxiliary", "potentialComposition"]
      },
      { kind: "connective", fields: ["connective"] },
      { kind: "modal", fields: ["modal", "polite", "past", "inner"] },
      { kind: "predicateQuoteCarrier", fields: ["style", "allomorph"] }
    ],
    sequence: {
      lengthThresholds: [1, 2],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 }
      ]
    }
  },
  claim: REINFORCED_POTENTIAL_COMPOSITION_CLAIM,
  records: [
    REINFORCED_POTENTIAL_CONDITIONAL_RECORD,
    REINFORCED_POTENTIAL_ATTRIBUTIVE_RECORD,
    REINFORCED_POTENTIAL_NODA_QUESTION_RECORD,
    REINFORCED_POTENTIAL_QUOTE_ATTRIBUTIVE_RECORD
  ],
  nonAdmission: "reject"
};
