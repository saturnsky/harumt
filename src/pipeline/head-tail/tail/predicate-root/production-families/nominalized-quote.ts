import type { ConnectiveOp } from "../grammar.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { PREDICATE_QUOTE_TTE_NOMINALIZED_CLAIM, ZUNI_SUMU_QUOTE_TTE_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionFamilyClaimDomain, ProductionOpSlot } from "../production-registry.js";
import { claimDependencies } from "./shared.js";

const PREDICATE_QUOTE_TTE_NOMINALIZED_CONNECTIVE_SLOT: ProductionOpSlot = {
  id: "quotative",
  role: "core",
  patterns: [productionOpPattern("connective", "connective_fields", {
    connectiveIn: ["quotative"],
    surfaceAllomorphIn: ["tte"]
  })],
  cardinality: { min: 1, max: 1 }
};

const PREDICATE_QUOTE_TTE_OBLIGATION_VARIANTS = [
  "standard_nakute_wa",
  "standard_nakereba",
  "colloquial_nakya",
  "colloquial_nakucha",
  "colloquial_naito"
] as const;

const PREDICATE_QUOTE_TTE_NOMINALIZED_HOST = {
  stemKinds: ["verb", "adj"],
  sourceShapes: ["verb", "i_adjective"],
  projectionCategories: ["verbal_predicate", "adjectival_predicate"]
} as const;

export const PREDICATE_QUOTE_TTE_NOMINALIZED_FAMILY: ProductionFamily = {
  id: "predicate_quote_tte_nominalized",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["nominalized"], sfp: "forbidden" }
  },
  claimDomains: [
    {
      id: "predicate_quote_tte_nominalized_plain",
      root: "aux_layer",
      ops: [
        { id: "quotative", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["nominalized"], sfp: "forbidden" }
    },
    {
      id: "predicate_quote_tte_nominalized_negation",
      root: "aux_layer",
      ops: [
        { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
        { id: "quotative", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["nominalized"], sfp: "forbidden" }
    },
    {
      id: "predicate_quote_tte_nominalized_obligation",
      root: "aux_layer",
      ops: [
        { id: "obligation", opKinds: ["idiom"], cardinality: { min: 1, max: 1 } },
        { id: "quotative", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["nominalized"], sfp: "forbidden" }
    },
    {
      id: "predicate_quote_tte_nominalized_wrapped",
      root: "aux_layer",
      ops: [
        { id: "te_shimau", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
        { id: "polite", opKinds: ["polite"], cardinality: { min: 1, max: 1 } },
        { id: "past", opKinds: ["tense"], cardinality: { min: 1, max: 1 } },
        { id: "quotative", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["nominalized"], sfp: "forbidden" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [1, 2, 4],
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "absolute", index: 1 },
          { kind: "absolute", index: 2 },
          { kind: "absolute", index: 3 }
        ]
      },
      [
        {
          kind: "aspect",
          fields: [
            "aspect",
            "teFocusParticle",
            "teFocusTarget",
            "ellipticTeIruSourceHost",
            "terminalMood",
            "semantic",
            "collapsed",
            "followingRareruReading"
          ]
        },
        { kind: "idiom", fields: ["idiom", "variant", "polarity", "polite", "past", "inner"] },
        { kind: "negation", fields: [] },
        { kind: "tense", fields: ["tense"] },
        { kind: "connective", fields: ["connective", "allomorph"] }
      ],
      {
        stemKind: true,
        sourcePredicateShape: true,
        projectionCategories: ["verbal_predicate", "adjectival_predicate"]
      },
      [
        { kind: "terminal_membership", values: ["nominalized"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_QUOTE_TTE_NOMINALIZED_CLAIM,
  records: [
    {
      id: "plain_predicate_quote_tte_nominalized",
      shape: {
        root: "aux_layer",
        ops: [PREDICATE_QUOTE_TTE_NOMINALIZED_CONNECTIVE_SLOT]
      },
      conditions: {
        host: PREDICATE_QUOTE_TTE_NOMINALIZED_HOST,
        terminal: { kinds: ["nominalized"], sfp: "forbidden" }
      },
      loweringKey: "predicate_quote_tte_nominalized"
    },
    {
      id: "negation_quote_tte_nominalized",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "negation",
            role: "wrapper",
            patterns: [{ kind: "negation" }],
            cardinality: { min: 1, max: 1 }
          },
          PREDICATE_QUOTE_TTE_NOMINALIZED_CONNECTIVE_SLOT
        ]
      },
      conditions: {
        host: PREDICATE_QUOTE_TTE_NOMINALIZED_HOST,
        terminal: { kinds: ["nominalized"], sfp: "forbidden" }
      },
      loweringKey: "predicate_quote_tte_nominalized"
    },
    {
      id: "obligation_quote_tte_nominalized",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "obligation",
            role: "core",
            patterns: [productionOpPattern("idiom", "obligation_idiom_fields", {
              variantIn: PREDICATE_QUOTE_TTE_OBLIGATION_VARIANTS,
              polarityIn: ["affirmative"],
              politeIn: [false],
              pastIn: [false],
              inner: "absent"
            })],
            cardinality: { min: 1, max: 1 }
          },
          PREDICATE_QUOTE_TTE_NOMINALIZED_CONNECTIVE_SLOT
        ]
      },
      conditions: {
        host: PREDICATE_QUOTE_TTE_NOMINALIZED_HOST,
        terminal: { kinds: ["nominalized"], sfp: "forbidden" }
      },
      loweringKey: "predicate_quote_tte_nominalized"
    },
    {
      id: "te_shimau_polite_past_quote_tte_nominalized",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "te_shimau",
            role: "wrapper",
            patterns: [productionOpPattern("aspect", "aspect_fields", {
              aspectIn: ["te_shimau"],
              teFocusParticle: "absent",
              teFocusTarget: "absent",
              ellipticTeIruSourceHost: "absent",
              terminalMood: "absent",
              semantic: "absent",
              collapsed: "absent",
              followingRareruReading: "absent"
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "polite",
            role: "wrapper",
            patterns: [{ kind: "polite" }],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "past",
            role: "wrapper",
            patterns: [productionOpPattern("tense", "tense_fields", {
              tenseIn: ["past"]
            })],
            cardinality: { min: 1, max: 1 }
          },
          PREDICATE_QUOTE_TTE_NOMINALIZED_CONNECTIVE_SLOT
        ]
      },
      conditions: {
        host: {
          stemKinds: ["verb"],
          sourceShapes: ["verb"],
          projectionCategories: ["verbal_predicate"]
        },
        terminal: { kinds: ["nominalized"], sfp: "forbidden" }
      },
      loweringKey: "predicate_quote_tte_nominalized"
    }
  ],
  nonAdmission: "reject"
};

const ZUNI_SUMU_NEGATION_SLOT: ProductionOpSlot = {
  id: "negation",
  role: "wrapper",
  patterns: [{ kind: "negation" }],
  cardinality: { min: 1, max: 1 }
};

const ZUNI_SUMU_IDIOM_SLOT: ProductionOpSlot = {
  id: "negative_necessity_sumu",
  role: "core",
  patterns: [productionOpPattern("idiom", "negative_necessity_sumu_idiom_fields", {
    variantIn: ["zuni_sumu"],
    polarityIn: ["affirmative"],
    politeIn: [false],
    pastIn: [false]
  })],
  cardinality: { min: 1, max: 1 }
};

const ZUNI_SUMU_PAST_SLOT: ProductionOpSlot = {
  id: "past",
  role: "wrapper",
  patterns: [productionOpPattern("tense", "tense_fields", {
    tenseIn: ["past"]
  })],
  cardinality: { min: 1, max: 1 }
};

const zuniSumuConnectiveSlot = (
  id: string,
  connectiveIn: ConnectiveOp["connective"],
  allomorph?: ConnectiveOp["allomorph"]
): ProductionOpSlot => ({
  id,
  role: "core",
  patterns: [productionOpPattern("connective", "connective_fields", {
    connectiveIn: [connectiveIn],
    ...(allomorph === undefined ? {} : { surfaceAllomorphIn: [allomorph] })
  })],
  cardinality: { min: 1, max: 1 }
});

const ZUNI_SUMU_QUOTE_TTE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "zuni_sumu_quote_tte_core",
  root: "aux_layer",
  ops: [
    {
      id: "wrapper",
      opKinds: ["postverbAuxiliary", "voice"],
      cardinality: { min: 1, max: 1 }
    },
    { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
    {
      id: "negative_necessity_sumu",
      opKinds: ["idiom"],
      cardinality: { min: 1, max: 1 }
    },
    { id: "past", opKinds: ["tense"], cardinality: { min: 1, max: 1 } },
    { id: "connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

export const ZUNI_SUMU_QUOTE_TTE_FAMILY: ProductionFamily = {
  id: "zuni_sumu_quote_tte",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "forbidden" }
  },
  claimDomains: [ZUNI_SUMU_QUOTE_TTE_CLAIM_DOMAIN],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [5],
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "absolute", index: 1 },
          { kind: "absolute", index: 2 },
          { kind: "absolute", index: 3 },
          { kind: "absolute", index: 4 }
        ]
      },
      [
        { kind: "postverbAuxiliary", fields: ["auxiliary"] },
        { kind: "voice", fields: ["voice"] },
        { kind: "idiom", fields: ["idiom", "variant", "polarity", "polite", "past"] },
        { kind: "tense", fields: ["tense"] },
        { kind: "connective", fields: ["connective", "allomorph"] }
      ],
      {
        stemKind: true,
        sourcePredicateShape: true,
        projectionCategories: ["verbal_predicate", "adjectival_predicate"]
      },
      [
        { kind: "terminal_membership", values: [null] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: ZUNI_SUMU_QUOTE_TTE_CLAIM,
  records: [
    {
      id: "zuni_sumu_state_change_quotative",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "wrapper",
            role: "core",
            patterns: [productionOpPattern(
              "postverbAuxiliary",
              "postverb_auxiliary_fields",
              { auxiliaryKindIn: ["state_change"] }
            )],
            cardinality: { min: 1, max: 1 }
          },
          ZUNI_SUMU_NEGATION_SLOT,
          ZUNI_SUMU_IDIOM_SLOT,
          ZUNI_SUMU_PAST_SLOT,
          zuniSumuConnectiveSlot("connective", "quotative", "to")
        ]
      },
      conditions: {
        host: {
          stemKinds: ["adj"],
          sourceShapes: ["i_adjective"],
          projectionCategories: ["adjectival_predicate"]
        },
        terminal: { kinds: [null], sfp: "forbidden" }
      },
      loweringKey: "wrapped_negative_necessity_sumu"
    },
    {
      id: "zuni_sumu_passive_quote_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "wrapper",
            role: "core",
            patterns: [productionOpPattern("voice", "voice_fields", {
              voiceIn: ["passive"]
            })],
            cardinality: { min: 1, max: 1 }
          },
          ZUNI_SUMU_NEGATION_SLOT,
          ZUNI_SUMU_IDIOM_SLOT,
          ZUNI_SUMU_PAST_SLOT,
          zuniSumuConnectiveSlot("connective", "predicate_projection_quote_attributive")
        ]
      },
      conditions: {
        host: {
          stemKinds: ["verb"],
          sourceShapes: ["verb", "sahen_verbalization"],
          projectionCategories: ["verbal_predicate"]
        },
        terminal: { kinds: [null], sfp: "forbidden" }
      },
      loweringKey: "wrapped_negative_necessity_sumu"
    },
    {
      id: "zuni_sumu_causative_adversative",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "wrapper",
            role: "core",
            patterns: [productionOpPattern("voice", "voice_fields", {
              voiceIn: ["causative"]
            })],
            cardinality: { min: 1, max: 1 }
          },
          ZUNI_SUMU_NEGATION_SLOT,
          ZUNI_SUMU_IDIOM_SLOT,
          ZUNI_SUMU_PAST_SLOT,
          zuniSumuConnectiveSlot("connective", "adversative")
        ]
      },
      conditions: {
        host: {
          stemKinds: ["verb"],
          sourceShapes: ["verb", "sahen_verbalization"],
          projectionCategories: ["verbal_predicate"]
        },
        terminal: { kinds: [null], sfp: "forbidden" }
      },
      loweringKey: "wrapped_negative_necessity_sumu"
    }
  ],
  nonAdmission: "reject"
};
