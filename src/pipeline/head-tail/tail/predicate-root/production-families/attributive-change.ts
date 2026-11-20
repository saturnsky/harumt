import { productionOpPattern } from "../production-admission-contract.js";
import { ACCUSTOMED_PAST_ATTRIBUTIVE_CLAIM, ADVERBIAL_CHANGE_ATTRIBUTIVE_CLAIM } from "../production-family-claims.js";
import type { ProductionFamily, ProductionOpSlot } from "../production-registry.js";
import { claimDependencies } from "./shared.js";

const ADVERBIAL_CHANGE_NO_SELECTION_ARGS = {
  teFocusParticle: "absent",
  teFocusTarget: "absent",
  ellipticTeIruSourceHost: "absent",
  terminalMood: "absent",
  semantic: "absent",
  collapsed: "absent",
  followingRareruReading: "absent"
} as const;

const ADVERBIAL_CHANGE_OP_SLOT: ProductionOpSlot = {
  id: "adverbial_change",
  role: "core",
  patterns: [productionOpPattern("postverbAuxiliary", "postverb_auxiliary_fields", {
    auxiliaryKindIn: ["adverbial_change"]
  })],
  cardinality: { min: 1, max: 1 }
};

export const ACCUSTOMED_PAST_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "accustomed_past_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["attributive"], sfp: "forbidden" }
  },
  claimDomains: [
    {
      id: "accustomed_past_attributive",
      root: "aux_layer",
      ops: [
        { id: "accustomed", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
        { id: "past", opKinds: ["tense"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["attributive"], sfp: "forbidden" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [2],
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "absolute", index: 1 }
        ]
      },
      [
        { kind: "postverbAuxiliary", fields: ["auxiliary"] },
        { kind: "tense", fields: ["tense"] }
      ],
      {
        stemKind: true,
        sourcePredicateShape: true,
        projectionCategories: ["verbal_predicate"]
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: ACCUSTOMED_PAST_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "accustomed_past_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "accustomed",
            role: "core",
            patterns: [productionOpPattern(
              "postverbAuxiliary",
              "postverb_auxiliary_fields",
              { auxiliaryKindIn: ["accustomed"] }
            )],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "past",
            role: "wrapper",
            patterns: [productionOpPattern("tense", "tense_fields", {
              tenseIn: ["past"]
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: {
          stemKinds: ["verb"],
          sourceShapes: ["verb", "sahen_verbalization"],
          projectionCategories: ["verbal_predicate"]
        },
        terminal: { kinds: ["attributive"], sfp: "forbidden" }
      },
      loweringKey: "accustomed_past_attributive"
    }
  ],
  nonAdmission: "reject"
};

export const ADVERBIAL_CHANGE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
  id: "adverbial_change_attributive",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["attributive", "nominalized"], sfp: "forbidden" }
  },
  claimDomains: [
    {
      id: "adverbial_change_past_attributive",
      root: "aux_layer",
      ops: [
        { id: "adverbial_change", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
        { id: "past", opKinds: ["tense"], cardinality: { min: 0, max: 1 } }
      ],
      terminal: { kinds: ["attributive", "nominalized"], sfp: "forbidden" }
    },
    {
      id: "adverbial_change_shimau_te_iru_attributive",
      root: "aux_layer",
      ops: [
        { id: "adverbial_change", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
        { id: "te_shimau", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
        { id: "te_iru", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["attributive"], sfp: "forbidden" }
    },
    {
      id: "adverbial_change_shimau_quote_attributive",
      root: "aux_layer",
      ops: [
        { id: "adverbial_change", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
        { id: "te_shimau", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
        { id: "past", opKinds: ["tense"], cardinality: { min: 1, max: 1 } },
        { id: "quote_carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["attributive"], sfp: "forbidden" }
    },
    {
      id: "adverbial_change_resultative_attributive",
      root: "aux_layer",
      ops: [
        { id: "adverbial_change", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
        { id: "te_iru", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
        { id: "past", opKinds: ["tense"], cardinality: { min: 0, max: 1 } }
      ],
      terminal: { kinds: ["attributive"], sfp: "forbidden" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [1, 2, 3, 4],
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "absolute", index: 1 },
          { kind: "absolute", index: 2 },
          { kind: "absolute", index: 3 }
        ]
      },
      [
        { kind: "postverbAuxiliary", fields: ["auxiliary"] },
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
        { kind: "tense", fields: ["tense"] },
        { kind: "predicateQuoteCarrier", fields: ["style", "allomorph"] }
      ],
      {
        stemKind: true,
        sourcePredicateShape: true,
        projectionCategories: ["adverbial"]
      },
      [
        { kind: "terminal_membership", values: ["attributive"] },
        { kind: "terminal_membership", values: ["attributive", "nominalized"] },
        { kind: "sfp_presence" }
      ]
    ),
    root: { quoteBinding: true }
  },
  claim: ADVERBIAL_CHANGE_ATTRIBUTIVE_CLAIM,
  records: [
    {
      id: "adverbial_change_past_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          ADVERBIAL_CHANGE_OP_SLOT,
          {
            id: "past",
            role: "wrapper",
            patterns: [productionOpPattern("tense", "tense_fields", {
              tenseIn: ["past"]
            })],
            cardinality: { min: 0, max: 1 }
          }
        ]
      },
      conditions: {
        host: {
          stemKinds: ["adverb"],
          sourceShapes: ["lexical_adverb", "nominal"],
          projectionCategories: ["adverbial"]
        },
        terminal: { kinds: ["attributive", "nominalized"], sfp: "forbidden" }
      },
      loweringKey: "adverbial_change_attributive"
    },
    {
      id: "adverbial_change_shimau_te_iru_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          ADVERBIAL_CHANGE_OP_SLOT,
          {
            id: "te_shimau",
            role: "core",
            patterns: [productionOpPattern("aspect", "aspect_fields", {
              aspectIn: ["te_shimau"],
              ...ADVERBIAL_CHANGE_NO_SELECTION_ARGS
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "te_iru",
            role: "core",
            patterns: [productionOpPattern("aspect", "aspect_fields", {
              aspectIn: ["te_iru"],
              ...ADVERBIAL_CHANGE_NO_SELECTION_ARGS
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: {
          stemKinds: ["adverb"],
          sourceShapes: ["nominal"],
          projectionCategories: ["adverbial"]
        },
        terminal: { kinds: ["attributive"], sfp: "forbidden" }
      },
      loweringKey: "adverbial_change_attributive"
    },
    {
      id: "adverbial_change_shimau_quote_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          ADVERBIAL_CHANGE_OP_SLOT,
          {
            id: "te_shimau",
            role: "core",
            patterns: [productionOpPattern("aspect", "aspect_fields", {
              aspectIn: ["te_shimau"],
              ...ADVERBIAL_CHANGE_NO_SELECTION_ARGS
            })],
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
        host: {
          stemKinds: ["adverb"],
          sourceShapes: ["lexical_adverb"],
          projectionCategories: ["adverbial"]
        },
        terminal: { kinds: ["attributive"], sfp: "forbidden" }
      },
      loweringKey: "adverbial_change_attributive"
    },
    {
      id: "adverbial_change_resultative_attributive",
      shape: {
        root: "aux_layer",
        ops: [
          ADVERBIAL_CHANGE_OP_SLOT,
          {
            id: "te_iru",
            role: "core",
            patterns: [productionOpPattern("aspect", "aspect_fields", {
              aspectIn: ["te_iru"],
              teFocusParticle: "absent",
              teFocusTarget: "absent",
              ellipticTeIruSourceHost: "absent",
              terminalMood: "absent",
              semanticRenderStrategyIn: ["resultative_state"],
              collapsed: "absent",
              followingRareruReading: "absent"
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "past",
            role: "wrapper",
            patterns: [productionOpPattern("tense", "tense_fields", {
              tenseIn: ["past"]
            })],
            cardinality: { min: 0, max: 1 }
          }
        ]
      },
      conditions: {
        host: {
          stemKinds: ["adverb"],
          sourceShapes: ["lexical_adverb"],
          projectionCategories: ["adverbial"]
        },
        terminal: { kinds: ["attributive"], sfp: "forbidden" }
      },
      loweringKey: "adverbial_change_attributive"
    }
  ],
  nonAdmission: "reject"
};
