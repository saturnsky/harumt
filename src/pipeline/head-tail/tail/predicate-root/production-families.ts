import type {
  AuxLayerNode,
  AuxOpKind,
  AuxOpNode,
  ConnectiveOp,
  CopulaOp,
  HeadProjectionKind,
  KoreanRealizationCategory,
  SourcePredicateShape,
  TailRoot,
  TerminalKind
} from "./grammar.js";
import { AUX_OP_INVENTORY } from "./grammar.js";
import type { UtteranceClosureKind } from "../../../clause-layout/utterance-closure.js";
import { isRequestAspectOp } from "./inspect.js";
import { HEAD_AUX_OP_KINDS } from "./operator-head.js";
import { createConnectiveOp } from "./op-builders.js";
import { isPlainTeHoshiiAspect } from "./production-admission-helpers.js";
import { productionOpPattern } from "./production-admission-contract.js";
import {
  ACCUSTOMED_PAST_ATTRIBUTIVE_CLAIM,
  ADVERBIAL_CHANGE_ATTRIBUTIVE_CLAIM,
  ADVERSATIVE_QUOTE_CARRIER_CLAIM,
  ATTRIBUTIVE_INTERNAL_TE_CLAIM,
  BARE_NOMINAL_CLAUSE_CONNECTIVE_CLAIM,
  BARE_NOMINAL_RENYOU_CHUUSHI_CLAIM,
  BARE_NOMINAL_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM,
  BARE_NOMINAL_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM,
  BENEFACTIVE_NODA_TERMINAL_CLAIM,
  CARRIER_INTERNAL_CONNECTIVE_CLAIM,
  CLAUSE_CONNECTIVE_KINDS,
  COMPLEMENT_INCORPORATION_CLAUSE_CONNECTIVE_CLAIM,
  COMPLEMENT_INCORPORATION_CONNECTIVE_KINDS,
  CONDITIONAL_QUOTE_CARRIER_CLAIM,
  CONDITIONAL_QUOTE_ELLIPSIS_CLAIM,
  DERIVED_MARKER_SUBORDINATION_CLAUSE_CONNECTIVE_CLAIM,
  DERIVED_MARKER_SUBORDINATION_CONNECTIVE_KINDS,
  COPULA_REASON_QUOTE_CARRIER_CLAIM,
  VERBAL_REASON_QUOTE_CARRIER_CLAIM,
  COPULAR_TE_HOSHII_CLAIM,
  COPULAR_BENEFACTIVE_REQUEST_CLAIM,
  CONJECTURAL_QUOTATIVE_CLAIM,
  EMBEDDED_QUESTION_MID_CHAIN_CLAIM,
  EXEMPLIFICATION_MID_CHAIN_CLAIM,
  NOUN_COPULA_DESIRE_CLAIM,
  NOUN_COPULA_FORBIDDEN_CLAIM,
  NOUN_COPULA_NEGATIVE_LIKENESS_CLAIM,
  NOUN_COPULA_BARE_ATTRIBUTIVE_CLAIM,
  NOUN_COPULA_CLAUSE_CONNECTIVE_CLAIM,
  NOUN_COPULA_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM,
  NOUN_COPULA_RENYOU_CHUUSHI_CLAIM,
  NOMINAL_FOCUS_PREFIX_ATTRIBUTIVE_CLAIM,
  NOMINAL_EXPLICIT_NO_ATTRIBUTIVE_CLAIM,
  NOMINAL_BARE_ATTRIBUTIVE_CLAIM,
  KEIJOUJI_BARE_ATTRIBUTIVE_CLAIM,
  NOUN_COPULA_REPORTED_ATTRIBUTIVE_CLAIM,
  NOUN_COPULA_PERMISSION_CLAIM,
  NOUN_COPULA_SEMANTIC_OPERATOR_ATTRIBUTIVE_CLAIM,
  NOUN_COPULA_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM,
  NOUN_COPULA_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM,
  ATTRIBUTIVE_HOST_STEM_KINDS,
  ATTRIBUTIVE_HOST_SOURCE_SHAPES,
  ATTRIBUTIVE_COPULA_LANE_SOURCE_SHAPES,
  NOUN_COPULA_BARE_ATTRIBUTIVE_COPULA_VARIANTS,
  PLAIN_PREDICATE_OPERATOR_CHAIN_ATTRIBUTIVE_CLAIM,
  NOUN_COPULA_OPERATOR_CHAIN_ATTRIBUTIVE_CLAIM,
  COPULA_PROJECTION_ATTRIBUTIVE_CLAIM,
  NOUN_COPULA_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM,
  NOMINAL_COPULA_PROJECTION_CLAUSE_CONNECTIVE_CLAIM,
  NOMINAL_COPULA_PROJECTION_RENYOU_CHUUSHI_CLAIM,
  PLAIN_PREDICATE_TERMINAL_CLAIM,
  NOUN_COPULA_ADVERBIAL_MODIFIER_CLAIM,
  PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_CLAIM,
  PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_CLAIM,
  NOUN_COPULA_TERMINAL_CLAIM,
  BARE_NOMINAL_TERMINAL_CLAIM,
  PREDICATE_COPULA_PROJECTION_TERMINAL_CLAIM,
  NOMINAL_COPULA_PROJECTION_TERMINAL_CLAIM,
  IMPERATIVE_HOST_STEM_KINDS,
  IMPERATIVE_HOST_SOURCE_SHAPES,
  IMPERATIVE_COPULA_LANE_STEM_KINDS,
  IMPERATIVE_COPULA_LANE_SOURCE_SHAPES,
  IMPERATIVE_CHAIN_OP_KINDS,
  IMPERATIVE_CHAIN_HEAD_OP_KINDS,
  IMPERATIVE_CHAIN_OP_PATTERNS,
  IMPERATIVE_STATE_CHANGE_AUX_KINDS,
  IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_ARGS,
  IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_AUX_KINDS,
  IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_STEM_KINDS,
  IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_SOURCE_SHAPES,
  PLAIN_PREDICATE_IMPERATIVE_TERMINAL_CLAIM,
  PLAIN_PREDICATE_OPERATOR_CHAIN_IMPERATIVE_TERMINAL_CLAIM,
  COPULA_IMPERATIVE_TERMINAL_CLAIM,
  NOUN_COPULA_STATE_CHANGE_IMPERATIVE_TERMINAL_CLAIM,
  PREDICATE_NEGATION_COMPLEMENT_IMPERATIVE_TERMINAL_CLAIM,
  PLAIN_PREDICATE_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  NOUN_COPULA_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  BARE_NOMINAL_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  PREDICATE_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  NOMINAL_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  PLAIN_PREDICATE_NOMINALIZED_CLAIM,
  NOUN_COPULA_NOMINALIZED_CLAIM,
  BARE_NOMINAL_NOMINALIZED_CLAIM,
  PREDICATE_COPULA_PROJECTION_NOMINALIZED_CLAIM,
  NOMINAL_COPULA_PROJECTION_NOMINALIZED_CLAIM,
  PLAIN_PREDICATE_ATTRIBUTIVE_CLAIM,
  PLAIN_PREDICATE_CLAUSE_CONNECTIVE_CLAIM,
  PLAIN_PREDICATE_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM,
  PLAIN_PREDICATE_RENYOU_CHUUSHI_CLAIM,
  PLAIN_PREDICATE_SEMANTIC_OPERATOR_ATTRIBUTIVE_CLAIM,
  PLAIN_PREDICATE_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM,
  PLAIN_PREDICATE_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM,
  PLAIN_PREDICATE_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM,
  NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_BRIDGE_ARGS,
  NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_CLAIM,
  PREDICATE_COPULA_NEGATIVE_CONFIRM_CLAIM,
  PREDICATE_COPULA_PROGRESSIVE_CONFIRM_CLAIM,
  PREDICATE_COPULA_PROJECTION_CLAUSE_CONNECTIVE_CLAIM,
  PREDICATE_COPULA_PROJECTION_RENYOU_CHUUSHI_CLAIM,
  PREDICATE_QUOTE_TTE_NOMINALIZED_CLAIM,
  PROJECTION_SUBORDINATION_CLAUSE_CONNECTIVE_CLAIM,
  PROJECTION_SUBORDINATION_CONNECTIVE_KINDS,
  PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_CLAIM,
  QUOTATIVE_DERIVED_MARKER_CLAUSE_CONNECTIVE_CLAIM,
  QUOTATIVE_DERIVED_MARKER_CONNECTIVE_KINDS,
  QUOTATIVE_INSISTENT_TERMINAL_CLAIM,
  QUOTE_MID_CHAIN_CLAIM,
  REINFORCED_POTENTIAL_COMPOSITION_CLAIM,
  REASON_COPULA_CONDITIONAL_CLAIM,
  SEQUENCE_AFTER_COPULA_CLAIM,
  REASON_QUOTE_CARRIER_RESIDUAL_CLAIM,
  REQUEST_ON_COMPOSED_PREDICATE_BASE_CLAIM,
  REQUEST_TERMINAL_BOUNDARY_CLAIM,
  SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_CLAIM,
  VOLITIONAL_NEGATIVE_INVITE_CLAIM,
  VOLITIONAL_QUESTION_QUOTATIVE_CLAIM,
  VOLITIONAL_REFORMULATION_QUESTION_CLAIM,
  VOLITIONAL_QUOTE_ATTRIBUTIVE_CLAIM,
  VOLITIONAL_REQUEST_COMPLEMENT_CLAIM,
  VOLITIONAL_RETROSPECTIVE_QUOTATIVE_CLAIM,
  VOLITIONAL_WISH_COMPLEMENT_CLAIM,
  ZUNI_SUMU_QUOTE_TTE_CLAIM
} from "./production-family-claims.js";
import {
  claimSequenceFindIndexOfKinds,
  claimSequenceIndexFromEnd,
  claimSequenceSomeOfKinds
} from "./production-claim-access.js";
import {
  defineProductionRegistry,
  installProductionFamilyDeclarations,
  type ProductionFamily,
  type ProductionFamilyClaimDependencies,
  type ProductionFamilyClaimDomain,
  type ProductionFamilyClaimOpDependency,
  type ProductionFamilyClaimReference,
  type ProductionFamilyClaimSequenceAggregateDependency,
  type ProductionFamilyClaimSequenceDependencies,
  type ProductionFamilyClaimSequenceKindCountDependency,
  type ProductionIntakeSite,
  type ProductionNormalization,
  type ProductionOpPattern,
  type ProductionOpSlot,
  type ProductionRecord,
  type ProductionRegistryMatch,
  type ProductionShape,
  type ProductionTerminalConditions
} from "./production-registry.js";

const ALL_OP_PATTERNS = AUX_OP_INVENTORY
  .map(({ opKind }) => ({ kind: opKind })) as readonly ProductionOpPattern[];

const ALL_CLAIM_OP_KINDS = AUX_OP_INVENTORY.map(({ opKind }) => opKind);
const NON_CONNECTIVE_CLAIM_OP_KINDS = ALL_CLAIM_OP_KINDS.filter((kind) => kind !== "connective");

const CONNECTIVE_CLAIM_DEPENDENCY = {
  kind: "connective",
  fields: ["connective", "allomorph", "conditionalFlavor", "conditionalQuoteEllipsis"]
} as const satisfies ProductionFamilyClaimOpDependency;
const COPULA_CLAIM_DEPENDENCY = {
  kind: "copula",
  fields: ["variant", "polarity"]
} as const satisfies ProductionFamilyClaimOpDependency;
const QUOTE_CARRIER_CLAIM_DEPENDENCY = {
  kind: "predicateQuoteCarrier",
  fields: ["style", "allomorph"]
} as const satisfies ProductionFamilyClaimOpDependency;
const PROJECTION_CARRIER_CLAIM_DEPENDENCY = {
  kind: "predicateProjectionCarrier",
  fields: ["carrier"]
} as const satisfies ProductionFamilyClaimOpDependency;
const TENSE_CLAIM_DEPENDENCY = {
  kind: "tense",
  fields: ["tense"]
} as const satisfies ProductionFamilyClaimOpDependency;
const MODAL_CLAIM_DEPENDENCY = {
  kind: "modal",
  fields: ["modal"]
} as const satisfies ProductionFamilyClaimOpDependency;
const ASPECT_CLAIM_DEPENDENCY = {
  kind: "aspect",
  fields: ["aspect"]
} as const satisfies ProductionFamilyClaimOpDependency;
const IDIOM_CLAIM_DEPENDENCY = {
  kind: "idiom",
  fields: ["idiom"]
} as const satisfies ProductionFamilyClaimOpDependency;

const ATTRIBUTIVE_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] },
  ASPECT_CLAIM_DEPENDENCY,
  IDIOM_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const CARRIER_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] }
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const QUOTE_OP_DEPENDENCIES = [
  {
    kind: "connective",
    fields: ["connective", "conditionalFlavor", "conditionalQuoteEllipsis"]
  },
  COPULA_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const COPULA_REASON_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective", "allomorph"] },
  COPULA_CLAIM_DEPENDENCY,
  QUOTE_CARRIER_CLAIM_DEPENDENCY,
  PROJECTION_CARRIER_CLAIM_DEPENDENCY,
  TENSE_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const REASON_CONDITIONAL_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective", "allomorph"] },
  COPULA_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const SEQUENCE_AFTER_COPULA_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] },
  COPULA_CLAIM_DEPENDENCY,
  { kind: "scopeBridge", fields: ["head", "polarity"] }
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const CONDITIONAL_CARRIER_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective", "conditionalQuoteEllipsis"] },
  { kind: "predicateQuoteCarrier", fields: ["style", "allomorph"] },
  MODAL_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const ADVERSATIVE_CARRIER_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] },
  { kind: "predicateQuoteCarrier", fields: ["style", "sourceTerminal"] },
  MODAL_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const CONDITIONAL_QUOTE_ELLIPSIS_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective", "allomorph", "conditionalQuoteEllipsis"] },
  { kind: "predicateQuoteCarrier", fields: ["style", "allomorph", "sourceTerminal"] }
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const EXEMPLIFICATION_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] }
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const EMBEDDED_QUESTION_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] },
  COPULA_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const REASON_RESIDUAL_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective"] },
  COPULA_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const HEAD_CLAIM_OP_KINDS = HEAD_AUX_OP_KINDS satisfies readonly AuxOpKind[];

const CORE_SEQUENCE_CLAIM_OP_KINDS = [
  "connective",
  "copula",
  "negation",
  "tense",
  "polite",
  "classicalAuxResidue",
  ...HEAD_CLAIM_OP_KINDS
] as const satisfies readonly AuxOpKind[];

const KIND_PRESENCE_DEPENDENCIES = ALL_CLAIM_OP_KINDS.map((kind) => ({
  opKinds: [kind],
  cap: 1
})) satisfies readonly ProductionFamilyClaimSequenceKindCountDependency[];

const ATTRIBUTIVE_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [1, 2],
  positions: [
    { kind: "first_of_kinds", opKinds: HEAD_CLAIM_OP_KINDS, offsets: [-1, 0] }
  ],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const CARRIER_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [1, 2, 3],
  positions: [
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-1, 0, 1]
    },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      startIndex: 1,
      offsets: [0]
    }
  ],
  aggregates: [
    {
      id: "has_exemplification",
      kind: "some_pattern",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })]
    },
    {
      id: "carrier_normalization_listing_te",
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["listing", "te_form"]
      }),
      requireAtLeastOne: true,
      range: {
        start: { kind: "absolute", index: 0 },
        end: {
          kind: "first_of_kinds",
          opKinds: ["predicateQuoteCarrier"],
          startIndex: 1,
          offset: 0
        }
      }
    },
    {
      id: "carrier_quote_prefix_listing_te",
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["listing", "te_form"]
      }),
      requireAtLeastOne: true,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "carrier_preceding_prefix_has_connective",
      kind: "some_kind",
      opKinds: ["connective"],
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
      }
    },
    {
      id: "carrier_suffix_wrappers_allowed",
      kind: "every_kind_in",
      opKinds: ["polite", "classicalAuxResidue", "negation", "tense"],
      range: {
        start: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: 1 },
        end: { kind: "relative", offset: 0 }
      }
    }
  ],
  kindCounts: KIND_PRESENCE_DEPENDENCIES,
  familyClaimRefs: [
    { familyId: "reason_copula_conditional", polarity: "excludes" },
    { familyId: "conditional_quote_carrier", polarity: "excludes" }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const QUOTE_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [1, 2, 3],
  positions: [
    { kind: "absolute", index: 0 },
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    { kind: "relative", offset: -3 },
    {
      kind: "first_of_kinds",
      opKinds: ["connective"],
      offsets: [-1, 0, 1],
      relativeMatches: [-2]
    }
  ],
  aggregates: [
    {
      id: "has_exemplification",
      kind: "some_pattern",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })]
    },
    {
      id: "quote_prefix_has_connective",
      kind: "some_kind",
      opKinds: ["connective"],
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "quote_prefix_has_listing_te",
      kind: "some_pattern",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["listing", "te_form"]
      })],
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "noun_quote_wrappers_allowed",
      kind: "every_kind_in",
      opKinds: ["tense", "negation", "polite", "classicalAuxResidue"],
      range: {
        start: { kind: "absolute", index: 1 },
        end: { kind: "first_of_kinds", opKinds: ["connective"], offset: 0 }
      }
    }
  ],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const COPULA_REASON_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [3, 4, 5, 6],
  positions: [
    { kind: "absolute", index: 0 },
    { kind: "absolute", index: 1 },
    { kind: "absolute", index: 2 },
    { kind: "absolute", index: 3 },
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    { kind: "relative", offset: -3 },
  ],
  kindCounts: KIND_PRESENCE_DEPENDENCIES
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const REASON_CONDITIONAL_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [3],
  positions: [
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    { kind: "relative", offset: -3 },
    {
      kind: "first_of_kinds",
      opKinds: ["connective"],
      offsets: [0, 1, 2],
      relativeMatches: [-3]
    }
  ],
  kindCounts: [{ opKinds: ["connective"], cap: 2 }]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const SEQUENCE_AFTER_COPULA_SHELL_OP_KINDS = [
  "copula",
  "polite",
  "tense",
  "conjecture",
  "scopeBridge"
] as const satisfies readonly AuxOpKind[];

const SEQUENCE_AFTER_COPULA_SHELL_SCOPE_BRIDGE_PATTERN = productionOpPattern(
  "scopeBridge",
  "scope_bridge_fields",
  { headIn: [null], polarityIn: ["negative"] }
);

const SEQUENCE_AFTER_COPULA_SHELL_PATTERNS = [
  productionOpPattern("copula", "copula_fields", { variantIn: ["basic"] }),
  { kind: "polite" },
  { kind: "tense" },
  { kind: "conjecture" },
  SEQUENCE_AFTER_COPULA_SHELL_SCOPE_BRIDGE_PATTERN
] as const satisfies readonly ProductionOpPattern[];

const SEQUENCE_AFTER_COPULA_SHELL_RANGE = {
  start: { kind: "first_of_kinds", opKinds: ["connective"], offset: 1 },
  end: { kind: "relative", offset: 0 }
} as const satisfies ProductionFamilyClaimSequenceAggregateDependency["range"];

const SEQUENCE_AFTER_COPULA_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2],
  positions: [
    { kind: "relative", offset: -1 },
    { kind: "first_of_kinds", opKinds: ["connective"], offsets: [0] }
  ],
  aggregates: [
    {
      id: "sequence_after_copula_shell_kinds",
      kind: "every_kind_in",
      opKinds: SEQUENCE_AFTER_COPULA_SHELL_OP_KINDS,
      range: SEQUENCE_AFTER_COPULA_SHELL_RANGE
    },
    {
      id: "sequence_after_copula_shell_basic_copula",
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("copula", "copula_fields", { variantIn: ["basic"] }),
      requireAtLeastOne: false,
      range: SEQUENCE_AFTER_COPULA_SHELL_RANGE
    },
    {
      id: "sequence_after_copula_shell_bare_negative_bridge",
      kind: "every_filtered_pattern",
      pattern: SEQUENCE_AFTER_COPULA_SHELL_SCOPE_BRIDGE_PATTERN,
      requireAtLeastOne: false,
      range: SEQUENCE_AFTER_COPULA_SHELL_RANGE
    }
  ],
  kindCounts: [{ opKinds: ["connective"], cap: 2 }]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const CONDITIONAL_CARRIER_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2, 3],
  positions: [
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-1, 0, 1, 2],
      relativeMatches: [-1]
    }
  ],
  aggregates: [{
    id: "conditional_carrier_has_earlier_connective",
    kind: "some_kind",
    opKinds: ["connective"],
    range: {
      start: { kind: "absolute", index: 0 },
      end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
    }
  }],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 }
  ],
  familyClaimRefs: [
    { familyId: "exemplification_mid_chain", polarity: "excludes" }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const ADVERSATIVE_CARRIER_SEQUENCE_DEPENDENCIES = {
  positions: [
    { kind: "absolute", index: 0 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-1, 0],
      relativeMatches: [-1]
    }
  ],
  aggregates: [{
    id: "adversative_carrier_has_earlier_connective",
    kind: "some_kind",
    opKinds: ["connective"],
    range: {
      start: { kind: "absolute", index: 0 },
      end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
    }
  }],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const EXEMPLIFICATION_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [1, 2],
  positions: [
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
  ],
  aggregates: [{
    id: "has_exemplification",
    kind: "some_pattern",
    patterns: [productionOpPattern("connective", "connective_fields", {
      connectiveIn: ["exemplification"]
    })]
  }],
  kindCounts: [{ opKinds: ["connective"], cap: 1 }],
  familyClaimRefs: [
    { familyId: "quote_mid_chain", polarity: "excludes" },
    { familyId: "copula_reason_quote_carrier", polarity: "excludes" },
    { familyId: "attributive_operator_host_internal_te", polarity: "excludes" },
    { familyId: "reason_copula_conditional", polarity: "excludes" }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const EMBEDDED_QUESTION_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2],
  positions: [
    { kind: "absolute", index: 0 },
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-2, -1, 0]
    }
  ],
  aggregates: [
    {
      id: "has_exemplification",
      kind: "some_pattern",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })]
    },
    {
      id: "embedded_prefix_has_connective",
      kind: "some_kind",
      opKinds: ["connective"],
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "legacy_reason_wrappers_allowed",
      kind: "every_kind_in",
      opKinds: ["polite", "classicalAuxResidue"],
      range: {
        start: { kind: "absolute", index: 1 },
        end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
      }
    }
  ],
  kindCounts: KIND_PRESENCE_DEPENDENCIES,
  familyClaimRefs: [{ familyId: "carrier_internal_connective", polarity: "excludes" }]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const REASON_RESIDUAL_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2, 3],
  positions: [
    { kind: "absolute", index: 0 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-2, -1, 0]
    },
  ],
  aggregates: [{
    id: "legacy_reason_wrappers_allowed",
    kind: "every_kind_in",
    opKinds: ["polite", "classicalAuxResidue"],
    range: {
      start: { kind: "absolute", index: 1 },
      end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
    }
  }],
  kindCounts: KIND_PRESENCE_DEPENDENCIES,
  familyClaimRefs: [
    { familyId: "quote_mid_chain", polarity: "excludes" },
    { familyId: "copula_reason_quote_carrier", polarity: "excludes" },
    { familyId: "attributive_operator_host_internal_te", polarity: "excludes" },
    { familyId: "carrier_internal_connective", polarity: "excludes" },
    { familyId: "conditional_quote_carrier", polarity: "excludes" },
    { familyId: "exemplification_mid_chain", polarity: "excludes" },
    { familyId: "reason_copula_conditional", polarity: "excludes" },
    { familyId: "embedded_question_mid_chain", polarity: "excludes" }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const claimDependencies = (
  sequence: ProductionFamilyClaimSequenceDependencies,
  ops: readonly ProductionFamilyClaimOpDependency[],
  host?: ProductionFamilyClaimDependencies["host"],
  terminal?: ProductionFamilyClaimDependencies["terminal"]
): ProductionFamilyClaimDependencies => ({
  ...(terminal === undefined ? {} : { terminal }),
  ...(host === undefined ? {} : { host }),
  ops,
  sequence
});

const FINAL_CONNECTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "final_connective",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 1, max: null } },
    { id: "final_connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ]
};

const QUOTE_MID_CHAIN_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "quote_mid_chain_final_connective",
  root: "aux_layer",
  ops: [
    {
      id: "prefix",
      opKinds: ALL_CLAIM_OP_KINDS.filter((kind) => kind !== "predicateQuoteCarrier"),
      cardinality: { min: 1, max: null }
    },
    { id: "final_connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ]
};

const ANY_CONNECTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "any_connective",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "suffix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } }
  ]
};

const REASON_COPULA_CONDITIONAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "reason_copula_conditional",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "reason", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
    { id: "conditional", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ]
};

const SEQUENCE_AFTER_COPULA_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "sequence_after_copula",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "sequence_after", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    {
      id: "copula_shell",
      opKinds: [...SEQUENCE_AFTER_COPULA_SHELL_OP_KINDS],
      cardinality: { min: 1, max: null }
    }
  ],
  terminal: { kinds: [null], sfp: "any" }
};

const CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "connective_then_carrier",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "middle", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } },
    { id: "residual", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } }
  ]
};

const CARRIER_THEN_CONNECTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "carrier_then_connective",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } },
    { id: "middle", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "residual", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } }
  ]
};

const COPULA_REASON_CARRIER_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "copula_reason_carrier",
  root: "aux_layer",
  ops: [
    { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
    { id: "wrappers", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "reason", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } },
    { id: "residual", opKinds: ALL_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } }
  ]
};

const NON_CONNECTIVE_OP_PATTERNS = AUX_OP_INVENTORY
  .filter(({ opKind }) => opKind !== "connective")
  .map(({ opKind }) => ({ kind: opKind })) as readonly ProductionOpPattern[];

const NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS = AUX_OP_INVENTORY
  .filter(({ opKind }) => opKind !== "connective" && opKind !== "predicateQuoteCarrier")
  .map(({ opKind }) => ({ kind: opKind })) as readonly ProductionOpPattern[];

const CONDITIONAL_QUOTE_PREFIX_OP_PATTERNS = AUX_OP_INVENTORY
  .filter(({ opKind }) =>
    opKind !== "connective" && opKind !== "predicateQuoteCarrier" && opKind !== "negation"
  )
  .map(({ opKind }) => ({ kind: opKind })) as readonly ProductionOpPattern[];

const CONDITIONAL_QUOTE_ELLIPSIS_ALLOMORPHS = ["ba", "tara"] as const;

const QUOTE_INTERNAL_CONNECTIVE_PATTERNS: readonly ProductionOpPattern[] = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: ["listing", "te_form"]
  })
];

const QUOTE_INTERNAL_RESIDUAL_PATTERNS: readonly ProductionOpPattern[] = [
  ...NON_CONNECTIVE_OP_PATTERNS,
  ...QUOTE_INTERNAL_CONNECTIVE_PATTERNS
];

const CARRIER_INTERNAL_CONNECTIVE_PATTERNS: readonly ProductionOpPattern[] = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: ["te_form", "listing", "sequence_after"]
  })
];

const CARRIER_INTERNAL_LISTING_TE_PATTERNS: readonly ProductionOpPattern[] = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: ["te_form", "listing"]
  })
];

const CARRIER_CONTEXT_RESIDUAL_PATTERNS: readonly ProductionOpPattern[] = [
  { kind: "polite" },
  { kind: "classicalAuxResidue" },
  { kind: "negation" },
  { kind: "tense" }
];

function firstConnectiveIndex(ops: readonly AuxOpNode[]): number {
  return claimSequenceFindIndexOfKinds(ops, ["connective"]);
}

export function tailRootHasMidChainConnective(root: TailRoot): boolean {
  if (root.tail.kind !== "auxLayer") return false;
  const index = firstConnectiveIndex(root.tail.ops);
  return index >= 0 && index < claimSequenceIndexFromEnd(root.tail.ops, -1);
}


function quoteInternalConnectiveNormalization(): ProductionNormalization {
  return {
    id: "drop_quote_internal_listing_te",
    normalize: ({ root, match }) => {
      if (root.tail.kind !== "auxLayer") return root;
      const internal = new Set([
        ...(match.shape.slots.get("internal_connective") ?? []),
        ...(match.shape.slots.get("quote_residual") ?? []).filter((op) =>
          op.kind === "connective"
        )
      ]);
      return {
        ...root,
        tail: { ...root.tail, ops: root.tail.ops.filter((op) => !internal.has(op)) }
      };
    }
  };
}

const ATTRIBUTIVE_INTERNAL_TE_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "internal_te",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["te_form"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "operator_tail",
      role: "core",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 1, max: null }
    }
  ]
};

const ATTRIBUTIVE_INTERNAL_TE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "attributive_internal_connective",
  root: "aux_layer",
  ops: [
    { id: "prefix", opKinds: NON_CONNECTIVE_CLAIM_OP_KINDS, cardinality: { min: 0, max: null } },
    { id: "internal_connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } },
    { id: "operator_tail", opKinds: NON_CONNECTIVE_CLAIM_OP_KINDS, cardinality: { min: 1, max: null } }
  ]
};

function attributiveInternalTeRecord(
  id: string,
  intakeSite: "assembler_resumable_prefix" | "committed_render",
  partial: boolean,
): ProductionRecord {
  return {
    id,
    shape: ATTRIBUTIVE_INTERNAL_TE_SHAPE,
    conditions: {
      host: { projectionKinds: ["direct_verbal", "direct_adjectival"] },
      terminal: { kinds: ["attributive"], sfp: "forbidden" },
      clause: { intakeSites: [intakeSite], partial }
    },
    normalization: {
      id: "drop_attributive_operator_host_internal_te",
      normalize: ({ root, match }) => {
        if (root.tail.kind !== "auxLayer") return root;
        const internal = new Set(match.shape.slots.get("internal_te") ?? []);
        return {
          ...root,
          tail: { ...root.tail, ops: root.tail.ops.filter((op) => !internal.has(op)) }
        };
      }
    },
    loweringKey: "normalized_root"
  };
}

const ATTRIBUTIVE_INTERNAL_TE_FAMILY: ProductionFamily = {
  id: "attributive_operator_host_internal_te",
  claimState: "invariant",
  conditions: {
    terminal: { kinds: ["attributive"], sfp: "forbidden" }
  },
  claimDomains: [ATTRIBUTIVE_INTERNAL_TE_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    ATTRIBUTIVE_SEQUENCE_DEPENDENCIES,
    ATTRIBUTIVE_OP_DEPENDENCIES,
    {
      projectionKinds: ["direct_verbal", "direct_adjectival"]
    }
  ),
  claim: ATTRIBUTIVE_INTERNAL_TE_CLAIM,
  records: [
    attributiveInternalTeRecord(
      "attributive_operator_host_internal_te_prefix",
      "assembler_resumable_prefix",
      true
    ),
    attributiveInternalTeRecord(
      "attributive_operator_host_internal_te_render",
      "committed_render",
      false
    )
  ],
  nonAdmission: "split"
};

function carrierInternalConnectivesAreListingTe(
  ops: readonly AuxOpNode[],
  endExclusive: number,
): boolean {
  return claimSequenceSomeOfKinds(
    ops,
    ["connective"],
    undefined,
    0,
    endExclusive
  ) && !claimSequenceSomeOfKinds(
    ops,
    ["connective"],
    (op) => op.kind === "connective" &&
      op.connective !== "listing" && op.connective !== "te_form",
    0,
    endExclusive
  );
}

function carrierInternalConnectiveNormalizationIndex(layer: AuxLayerNode): number {
  const carrierIndex = claimSequenceFindIndexOfKinds(
    layer.ops,
    ["predicateQuoteCarrier"],
    (_, index) => index > 0
  );
  return carrierIndex >= 1 && carrierInternalConnectivesAreListingTe(layer.ops, carrierIndex)
    ? carrierIndex
    : -1;
}

export function normalizeCarrierInternalConnectives(
  layer: AuxLayerNode,
): AuxLayerNode | null {
  const carrierIndex = carrierInternalConnectiveNormalizationIndex(layer);
  if (carrierIndex < 0) return null;
  const internal = layer.ops.slice(0, carrierIndex)
    .filter((op): op is ConnectiveOp => op.kind === "connective");
  const internalSet = new Set<AuxOpNode>(internal);
  return { ...layer, ops: layer.ops.filter((op) => !internalSet.has(op)) };
}

const CARRIER_CONTEXT_DIRECT_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "internal_connective",
      role: "core",
      patterns: CARRIER_INTERNAL_CONNECTIVE_PATTERNS,
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      role: "core",
      patterns: [{ kind: "predicateQuoteCarrier" }],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier_residual",
      role: "wrapper",
      patterns: CARRIER_CONTEXT_RESIDUAL_PATTERNS,
      cardinality: { min: 0, max: null }
    }
  ]
};

const CARRIER_CONTEXT_QUOTE_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "quote_body",
      role: "wrapper",
      patterns: [
        ...NON_CONNECTIVE_OP_PATTERNS,
        ...CARRIER_INTERNAL_LISTING_TE_PATTERNS
      ],
      cardinality: { min: 1, max: null }
    },
    {
      id: "quote",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["quotative", "question_quotative"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const CARRIER_CONTEXT_RENDER_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [{
    id: "legacy_ops",
    role: "core",
    patterns: ALL_OP_PATTERNS,
    cardinality: { min: 1, max: null }
  }]
};

function carrierContextPrefixRecord(
  id: string,
  shape: ProductionShape,
): ProductionRecord {
  return {
    id,
    shape,
    conditions: {
      clause: {
        intakeSites: ["quote_prefix", "assembler_resumable_prefix"],
        partial: true
      }
    },
    loweringKey: "normalized_root"
  };
}

const CARRIER_INTERNAL_CONNECTIVE_FAMILY: ProductionFamily = {
  id: "carrier_internal_connective",
  claimState: "invariant",
  claimDomains: [
    CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN,
    CARRIER_THEN_CONNECTIVE_CLAIM_DOMAIN
  ],
  claimDependencies: claimDependencies(CARRIER_SEQUENCE_DEPENDENCIES, CARRIER_OP_DEPENDENCIES),
  claim: CARRIER_INTERNAL_CONNECTIVE_CLAIM,
  records: [
    carrierContextPrefixRecord(
      "carrier_internal_connective_prefix",
      CARRIER_CONTEXT_DIRECT_PREFIX_SHAPE
    ),
    carrierContextPrefixRecord(
      "carrier_internal_listing_te_quote_prefix",
      CARRIER_CONTEXT_QUOTE_PREFIX_SHAPE
    ),
    {
      id: "carrier_internal_connective_legacy_render",
      shape: CARRIER_CONTEXT_RENDER_SHAPE,
      conditions: {
        clause: { intakeSites: ["committed_render"], partial: false }
      },
      loweringKey: "carrier_context_legacy"
    }
  ],
  nonAdmission: "split"
};

const EXEMPLIFICATION_FINAL_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "chain_final_connective",
      role: "core",
      patterns: [{ kind: "connective" }],
      cardinality: { min: 0, max: 1 }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const EXEMPLIFICATION_SINGLE_FINAL_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const EXEMPLIFICATION_TE_TERMINAL_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "te_host",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["te_form"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

export const EXEMPLIFICATION_UTTERANCE_FINAL_CLOSURES = [
  "hard_terminal",
  "eos"
] as const satisfies readonly UtteranceClosureKind[];

const EXEMPLIFICATION_CARRIER_RESIDUAL_PATTERNS: readonly ProductionOpPattern[] = [
  { kind: "polite" },
  { kind: "classicalAuxResidue" },
  { kind: "negation" },
  { kind: "tense" }
];

const EXEMPLIFICATION_CARRIER_WRAPPER_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      role: "core",
      patterns: [{ kind: "predicateQuoteCarrier" }],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier_residual",
      role: "wrapper",
      patterns: EXEMPLIFICATION_CARRIER_RESIDUAL_PATTERNS,
      cardinality: { min: 0, max: null }
    }
  ]
};

const EXEMPLIFICATION_CARRIER_YOUDA_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      role: "core",
      patterns: [{ kind: "predicateQuoteCarrier" }],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "likeness",
      role: "core",
      patterns: [productionOpPattern("modal", "modal_fields", {
        modalIn: ["youda"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const UNNORMALIZED_TOKA_FINAL_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "quotative",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["quotative"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "question_content",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["question_content"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const EXEMPLIFICATION_EMBEDDED_QUESTION_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "exemplification",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["exemplification"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "question_content",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["question_content", "question_content_alternative"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const EXEMPLIFICATION_LEGACY_RENDER_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [{
    id: "ops",
    role: "core",
    patterns: ALL_OP_PATTERNS,
    cardinality: { min: 0, max: null }
  }]
};

const EXEMPLIFICATION_PREFIX_SITES: readonly ProductionIntakeSite[] = [
  "quote_prefix",
  "assembler_resumable_prefix"
];

function exemplificationIntakeRecord(
  id: string,
  shape: ProductionShape,
  intakeSites: readonly ProductionIntakeSite[],
  partial?: boolean,
): ProductionRecord {
  return {
    id,
    shape,
    conditions: {
      clause: {
        intakeSites,
        ...(partial === undefined ? {} : { partial })
      }
    },
    loweringKey: "normalized_root"
  };
}

const EXEMPLIFICATION_RECORDS: readonly ProductionRecord[] = [
  exemplificationIntakeRecord(
    "exemplification_final_prefix",
    EXEMPLIFICATION_FINAL_PREFIX_SHAPE,
    EXEMPLIFICATION_PREFIX_SITES,
    true
  ),
  exemplificationIntakeRecord(
    "exemplification_single_final_candidate",
    EXEMPLIFICATION_SINGLE_FINAL_SHAPE,
    ["candidate_scan"]
  ),
  {
    id: "exemplification_te_utterance_final_candidate",
    shape: EXEMPLIFICATION_TE_TERMINAL_SHAPE,
    conditions: {
      terminal: { sfp: "forbidden", utteranceClosureIn: EXEMPLIFICATION_UTTERANCE_FINAL_CLOSURES },
      clause: { intakeSites: ["candidate_scan"], partial: false }
    },
    loweringKey: "normalized_root"
  },
  exemplificationIntakeRecord(
    "exemplification_carrier_wrapper_prefix",
    EXEMPLIFICATION_CARRIER_WRAPPER_SHAPE,
    EXEMPLIFICATION_PREFIX_SITES,
    true
  ),
  exemplificationIntakeRecord(
    "exemplification_carrier_youda_prefix",
    EXEMPLIFICATION_CARRIER_YOUDA_SHAPE,
    EXEMPLIFICATION_PREFIX_SITES,
    true
  ),
  exemplificationIntakeRecord(
    "unnormalized_toka_quote_prefix",
    UNNORMALIZED_TOKA_FINAL_SHAPE,
    ["quote_prefix"],
    true
  ),
  exemplificationIntakeRecord(
    "exemplification_embedded_question_prefix",
    EXEMPLIFICATION_EMBEDDED_QUESTION_SHAPE,
    ["quote_prefix"],
    true
  ),
  {
    id: "exemplification_legacy_render",
    shape: EXEMPLIFICATION_LEGACY_RENDER_SHAPE,
    conditions: {
      clause: { intakeSites: ["committed_render"], partial: false }
    },
    loweringKey: "exemplification_legacy_render"
  }
];

const QUOTE_RECORD_INTAKE_SITES: readonly ProductionIntakeSite[] = [
  "quote_prefix",
  "committed_render"
];

const HOSTLESS_QUOTE_RECORD_INTAKE_SITES: readonly ProductionIntakeSite[] = [
  "candidate_scan",
  ...QUOTE_RECORD_INTAKE_SITES
];

const CONDITIONAL_QUOTE_TERMINAL_NORMALIZATION: ProductionNormalization = {
  id: "restore_conditional_alias_and_drop_quote_terminal",
  normalize: ({ root, match }) => {
    if (root.tail.kind !== "auxLayer") return root;
    const conditionalAliases = new Set([
      ...(match.shape.slots.get("conditional") ?? []),
      ...(match.shape.slots.get("conditional_alias") ?? []),
    ].filter((op): op is ConnectiveOp =>
      op.kind === "connective" && op.connective === "quotative"
    ));
    const ops = root.tail.ops.slice(0, -1).map((op) => {
      if (op.kind !== "connective" || !conditionalAliases.has(op)) return op;
      const {
        quotativeClosure: _quotativeClosure,
        quotativeMood: _quotativeMood,
        cognitiveComplementParticle: _cognitiveComplementParticle,
        ...conditional
      } = op;
      return {
        ...conditional,
        connective: "conditional" as const,
        conditionalFlavor: op.conditionalFlavor ?? "plain",
      };
    });
    return { ...root, tail: { ...root.tail, ops } };
  }
};

const QUOTE_INTERNAL_LISTING_TE_RECORD: ProductionRecord = {
  id: "quote_internal_listing_te",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "predicate_prefix",
        role: "wrapper",
        patterns: NON_CONNECTIVE_OP_PATTERNS,
        cardinality: { min: 0, max: null }
      },
      {
        id: "internal_connective",
        role: "core",
        patterns: QUOTE_INTERNAL_CONNECTIVE_PATTERNS,
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "quote_residual",
        role: "wrapper",
        patterns: QUOTE_INTERNAL_RESIDUAL_PATTERNS,
        cardinality: { min: 0, max: null }
      },
      {
        id: "quote",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["quotative", "question_quotative"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: { clause: { intakeSites: QUOTE_RECORD_INTAKE_SITES } },
  normalization: quoteInternalConnectiveNormalization(),
  loweringKey: "normalized_root"
};

function conditionalQuoteRecord(options: {
  readonly id: string;
  readonly terminal: "quote" | "hostless_quote" | "wish";
  readonly negatedToAlias?: boolean;
}): ProductionRecord {
  const hostless = options.terminal === "hostless_quote";
  const terminalPattern: ProductionOpPattern = options.terminal === "wish"
    ? productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["wish_complement"]
      })
    : productionOpPattern("connective", "connective_fields", hostless
      ? {
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["to"],
          quotativeClosureIn: ["hostless_source_terminal"]
        }
      : {
          connectiveIn: ["quotative", "question_quotative"],
          quotativeClosureNotIn: ["hostless_source_terminal"]
        });
  const prefix: ProductionOpSlot = {
    id: "predicate_prefix",
    role: "wrapper",
    patterns: NON_CONNECTIVE_OP_PATTERNS,
    cardinality: { min: 0, max: null }
  };
  const conditionalSlots: readonly ProductionOpSlot[] = options.negatedToAlias === true
    ? [
        {
          id: "conditional_negation",
          role: "core",
          patterns: [{ kind: "negation" }],
          cardinality: { min: 1, max: 1 }
        },
        {
          id: "conditional_alias",
          role: "core",
          patterns: [productionOpPattern("connective", "connective_fields", {
            connectiveIn: ["quotative"],
            conditionalFlavor: "absent",
            conditionalQuoteEllipsisNotIn: ["prohibitive_concern"]
          })],
          cardinality: { min: 1, max: 1 }
        }
      ]
    : [{
        id: "conditional",
        role: "core",
        patterns: [productionOpPattern("connective", "typed_conditional_quote", {})],
        cardinality: { min: 1, max: 1 }
      }];
  return {
    id: options.id,
    shape: {
      root: "aux_layer",
      ops: [
        prefix,
        ...conditionalSlots,
        {
          id: hostless ? "quote" : options.terminal,
          role: "core",
          patterns: [terminalPattern],
          cardinality: { min: 1, max: 1 }
        }
      ]
    },
    conditions: {
      ...(hostless
        ? { terminal: { kinds: [null] as const, sfp: "forbidden" as const } }
        : {}),
      clause: {
        intakeSites: hostless
          ? HOSTLESS_QUOTE_RECORD_INTAKE_SITES
          : QUOTE_RECORD_INTAKE_SITES
      }
    },
    normalization: CONDITIONAL_QUOTE_TERMINAL_NORMALIZATION,
    loweringKey: options.terminal === "wish"
      ? "conditional_wish_complement"
      : "conditional_quote_terminal"
  };
}

const HOSTLESS_CONDITIONAL_QUOTE_RECORD = conditionalQuoteRecord({
  id: "hostless_conditional_quote",
  terminal: "hostless_quote"
});

const HOSTLESS_CONDITIONAL_QUOTE_ALIAS_RECORD = conditionalQuoteRecord({
  id: "hostless_conditional_quote_negated_to_alias",
  terminal: "hostless_quote",
  negatedToAlias: true
});

const CONDITIONAL_HOSTED_QUOTE_RECORD = conditionalQuoteRecord({
  id: "conditional_hosted_quote",
  terminal: "quote"
});

const CONDITIONAL_HOSTED_QUOTE_ALIAS_RECORD = conditionalQuoteRecord({
  id: "conditional_hosted_quote_negated_to_alias",
  terminal: "quote",
  negatedToAlias: true
});

const CONDITIONAL_WISH_COMPLEMENT_RECORD = conditionalQuoteRecord({
  id: "conditional_wish_complement",
  terminal: "wish"
});

const CONDITIONAL_WISH_COMPLEMENT_ALIAS_RECORD = conditionalQuoteRecord({
  id: "conditional_wish_complement_negated_to_alias",
  terminal: "wish",
  negatedToAlias: true
});

function copulaConditionalQuoteRecord(options: {
  readonly id: string;
  readonly terminal: "hosted_quote" | "hostless_quote" | "wish";
}): ProductionRecord {
  const terminalPattern: ProductionOpPattern = options.terminal === "wish"
    ? productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["wish_complement"]
      })
    : productionOpPattern(
        "connective",
        "connective_fields",
        options.terminal === "hostless_quote"
          ? {
              connectiveIn: ["quotative"],
              surfaceAllomorphIn: ["to"],
              quotativeClosureIn: ["hostless_source_terminal"]
            }
          : {
              connectiveIn: ["quotative", "question_quotative"],
              quotativeClosureNotIn: ["hostless_source_terminal"]
            }
      );
  return {
    id: options.id,
    shape: {
      root: "aux_layer",
      ops: [
        {
          id: "predicate_prefix",
          role: "wrapper",
          patterns: NON_CONNECTIVE_OP_PATTERNS,
          cardinality: { min: 0, max: null }
        },
        {
          id: "conditional_copula",
          role: "core",
          patterns: [productionOpPattern("copula", "copula_fields", {
            variantIn: ["conditional_nara"],
            polarityIn: ["affirmative"]
          })],
          cardinality: { min: 1, max: 1 }
        },
        {
          id: "quote",
          role: "core",
          patterns: [terminalPattern],
          cardinality: { min: 1, max: 1 }
        }
      ]
    },
    conditions: {
      ...(options.terminal === "hostless_quote"
        ? { terminal: { kinds: [null] as const, sfp: "forbidden" as const } }
        : {}),
      clause: {
        intakeSites: options.terminal === "hostless_quote"
          ? HOSTLESS_QUOTE_RECORD_INTAKE_SITES
          : options.terminal === "hosted_quote"
            ? HOSTLESS_QUOTE_RECORD_INTAKE_SITES
            : QUOTE_RECORD_INTAKE_SITES
      }
    },
    normalization: CONDITIONAL_QUOTE_TERMINAL_NORMALIZATION,
    loweringKey: options.terminal === "wish"
      ? "conditional_wish_complement"
      : "conditional_quote_terminal"
  };
}

const COPULA_CONDITIONAL_HOSTED_QUOTE_RECORD = copulaConditionalQuoteRecord({
  id: "copula_conditional_hosted_quote",
  terminal: "hosted_quote"
});

const COPULA_CONDITIONAL_HOSTLESS_QUOTE_RECORD = copulaConditionalQuoteRecord({
  id: "copula_conditional_hostless_quote",
  terminal: "hostless_quote"
});

const COPULA_CONDITIONAL_WISH_COMPLEMENT_RECORD = copulaConditionalQuoteRecord({
  id: "copula_conditional_wish_complement",
  terminal: "wish"
});

const CONDITIONAL_QUOTE_RECORD_IDS = new Set([
  CONDITIONAL_HOSTED_QUOTE_RECORD.id,
  CONDITIONAL_HOSTED_QUOTE_ALIAS_RECORD.id,
  CONDITIONAL_WISH_COMPLEMENT_RECORD.id,
  CONDITIONAL_WISH_COMPLEMENT_ALIAS_RECORD.id,
  COPULA_CONDITIONAL_HOSTED_QUOTE_RECORD.id,
  COPULA_CONDITIONAL_WISH_COMPLEMENT_RECORD.id
]);

const NOUN_COPULA_REASON_QUOTE_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      role: "core",
      patterns: [productionOpPattern("copula", "copula_fields", {
        variantIn: ["basic"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "copula_wrappers",
      role: "wrapper",
      patterns: [
        { kind: "tense" },
        { kind: "negation" },
        { kind: "polite" },
        { kind: "classicalAuxResidue" }
      ],
      cardinality: { min: 0, max: null }
    },
    {
      id: "reason",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["reason"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "quote",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["quotative"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const DROP_NOUN_COPULA_REASON_BEFORE_QUOTE: ProductionNormalization = {
  id: "drop_noun_copula_reason_before_quote",
  normalize: ({ root, match }) => {
    if (root.tail.kind !== "auxLayer") return root;
    const reason = match.shape.slots.get("reason")?.[0];
    return reason === undefined
      ? root
      : { ...root, tail: { ...root.tail, ops: root.tail.ops.filter((op) => op !== reason) } };
  }
};

function nounCopulaReasonQuoteRecord(
  id: string,
  intakeSite: "quote_prefix" | "committed_render",
  partial: boolean,
): ProductionRecord {
  return {
    id,
    shape: NOUN_COPULA_REASON_QUOTE_SHAPE,
    conditions: {
      host: { projectionCategories: ["nominal", "adjectival_predicate"] },
      terminal: { kinds: [null] },
      clause: { intakeSites: [intakeSite], partial }
    },
    normalization: DROP_NOUN_COPULA_REASON_BEFORE_QUOTE,
    loweringKey: "normalized_root"
  };
}

const NOUN_COPULA_REASON_QUOTE_PREFIX_RECORD = nounCopulaReasonQuoteRecord(
  "noun_copula_reason_quote_prefix",
  "quote_prefix",
  true
);

const NOUN_COPULA_REASON_QUOTE_RENDER_RECORD = nounCopulaReasonQuoteRecord(
  "noun_copula_reason_quote_render",
  "committed_render",
  false
);

export function isConditionalQuoteProductionMatch(
  match: ProductionRegistryMatch
): boolean {
  return match.familyId === "quote_mid_chain" &&
    CONDITIONAL_QUOTE_RECORD_IDS.has(match.record.id);
}

const QUOTE_MID_CHAIN_FAMILY: ProductionFamily = {
  id: "quote_mid_chain",
  claimDomains: [QUOTE_MID_CHAIN_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    QUOTE_SEQUENCE_DEPENDENCIES,
    QUOTE_OP_DEPENDENCIES,
    { projectionCategories: ["nominal", "adjectival_predicate"] },
    [
      { kind: "terminal_membership", values: [null] },
      { kind: "terminal_membership", values: ["attributive", "nominalized"] }
    ]
  ),
  claim: QUOTE_MID_CHAIN_CLAIM,
  records: [
    HOSTLESS_CONDITIONAL_QUOTE_RECORD,
    HOSTLESS_CONDITIONAL_QUOTE_ALIAS_RECORD,
    CONDITIONAL_HOSTED_QUOTE_RECORD,
    CONDITIONAL_HOSTED_QUOTE_ALIAS_RECORD,
    CONDITIONAL_WISH_COMPLEMENT_RECORD,
    CONDITIONAL_WISH_COMPLEMENT_ALIAS_RECORD,
    COPULA_CONDITIONAL_HOSTED_QUOTE_RECORD,
    COPULA_CONDITIONAL_HOSTLESS_QUOTE_RECORD,
    COPULA_CONDITIONAL_WISH_COMPLEMENT_RECORD,
    QUOTE_INTERNAL_LISTING_TE_RECORD,
    NOUN_COPULA_REASON_QUOTE_PREFIX_RECORD,
    NOUN_COPULA_REASON_QUOTE_RENDER_RECORD
  ],
  nonAdmission: "split"
};

const COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES: readonly ProductionIntakeSite[] = [
  "quote_prefix",
  "assembler_resumable_prefix"
];

const REASON_QUOTE_CARRIER_TERMINALS: readonly TerminalKind[] = [
  "attributive",
  "nominalized"
];

const PAST_WRAPPER_SLOT: ProductionOpSlot = {
  id: "past",
  role: "wrapper",
  patterns: [productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] })],
  cardinality: { min: 1, max: 1 }
};

const OPTIONAL_PAST_WRAPPER_SLOT: ProductionOpSlot = {
  ...PAST_WRAPPER_SLOT,
  cardinality: { min: 0, max: 1 }
};

const POLITE_WRAPPER_SLOT: ProductionOpSlot = {
  id: "polite",
  role: "wrapper",
  patterns: [{ kind: "polite" }],
  cardinality: { min: 1, max: 1 }
};

function copulaReasonQuoteCarrierRecord(options: {
  readonly id: string;
  readonly intakeSites: readonly ProductionIntakeSite[];
  readonly sourceShapes: readonly SourcePredicateShape[];
  readonly projectionCategories: readonly KoreanRealizationCategory[];
  readonly polarity: CopulaOp["polarity"];
  readonly wrappers?: readonly ProductionOpSlot[];
  readonly exactKara?: boolean;
  readonly wrapped?: boolean;
  readonly carrierSurface?: "という" | "っていう";
}): ProductionRecord {
  return {
    id: options.id,
    shape: {
      root: "aux_layer",
      ops: [
        {
          id: "copula",
          role: "core",
          patterns: [productionOpPattern("copula", "copula_fields", {
            variantIn: ["basic"],
            polarityIn: [options.polarity]
          })],
          cardinality: { min: 1, max: 1 }
        },
        ...(options.wrappers ?? []),
        {
          id: "reason",
          role: "core",
          patterns: [productionOpPattern("connective", "connective_fields", {
            connectiveIn: ["reason"],
            ...(options.exactKara === true ? { surfaceAllomorphIn: ["kara"] } : {})
          })],
          cardinality: { min: 1, max: 1 }
        },
        {
          id: "carrier",
          role: "core",
          patterns: [productionOpPattern(
            "predicateQuoteCarrier",
            "predicate_quote_carrier_fields",
            {
              styleIn: ["compact_toiu"],
              allomorphIn: [options.carrierSurface === "っていう" ? "tteiu" : "toiu"]
            }
          )],
          cardinality: { min: 1, max: 1 }
        }
      ]
    },
    conditions: {
      host: {
        sourceShapes: options.sourceShapes,
        projectionCategories: options.projectionCategories
      },
      terminal: { kinds: REASON_QUOTE_CARRIER_TERMINALS, sfp: "forbidden" },
      clause: { intakeSites: options.intakeSites }
    },
    loweringKey: options.wrapped === true
      ? "wrapped_copula_reason_quote_carrier"
      : "noun_copula_reason_quote_carrier"
  };
}

const COPULA_REASON_QUOTE_CARRIER_PREFIX_RECORD = copulaReasonQuoteCarrierRecord({
  id: "copula_reason_quote_carrier_prefix",
  intakeSites: COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES,
  sourceShapes: ["nominal"],
  projectionCategories: ["nominal"],
  polarity: "affirmative"
});

const COPULA_REASON_QUOTE_CARRIER_RENDER_RECORD = copulaReasonQuoteCarrierRecord({
  id: "copula_reason_quote_carrier_render",
  intakeSites: ["committed_render"],
  sourceShapes: ["nominal"],
  projectionCategories: ["nominal"],
  polarity: "affirmative"
});

const TTEIU_REASON_QUOTE_CARRIER_PREFIX_RECORD = copulaReasonQuoteCarrierRecord({
  id: "tteiu_reason_quote_carrier_prefix",
  intakeSites: COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES,
  sourceShapes: ["nominal"],
  projectionCategories: ["nominal"],
  polarity: "affirmative",
  carrierSurface: "っていう"
});

const TTEIU_REASON_QUOTE_CARRIER_RENDER_RECORD = copulaReasonQuoteCarrierRecord({
  id: "tteiu_reason_quote_carrier_render",
  intakeSites: ["committed_render"],
  sourceShapes: ["nominal"],
  projectionCategories: ["nominal"],
  polarity: "affirmative",
  carrierSurface: "っていう"
});

function wrappedReasonQuoteCarrierRecords(
  id: string,
  options: Omit<Parameters<typeof copulaReasonQuoteCarrierRecord>[0], "id" | "intakeSites" | "wrapped">
): readonly ProductionRecord[] {
  return [
    copulaReasonQuoteCarrierRecord({
      ...options,
      id: `${id}_prefix`,
      intakeSites: COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES,
      wrapped: true
    }),
    copulaReasonQuoteCarrierRecord({
      ...options,
      id: `${id}_render`,
      intakeSites: ["committed_render"],
      wrapped: true
    })
  ];
}

function wrappedReasonQuoteCarrierSurfaceRecords(
  id: string,
  options: Omit<Parameters<typeof copulaReasonQuoteCarrierRecord>[0], "id" | "intakeSites" | "wrapped" | "carrierSurface">
): readonly ProductionRecord[] {
  return [
    ...wrappedReasonQuoteCarrierRecords(id, options),
    ...wrappedReasonQuoteCarrierRecords(`${id}_tteiu`, {
      ...options,
      carrierSurface: "っていう"
    })
  ];
}

const WRAPPED_REASON_QUOTE_CARRIER_RECORDS = [
  ...wrappedReasonQuoteCarrierSurfaceRecords("na_reason_quote_carrier", {
    sourceShapes: ["na_adjective"],
    projectionCategories: ["adjectival_predicate", "verbal_predicate", "nominal"],
    polarity: "affirmative",
    exactKara: true
  }),
  ...wrappedReasonQuoteCarrierSurfaceRecords("noun_past_reason_quote_carrier", {
    sourceShapes: ["nominal"],
    projectionCategories: ["nominal"],
    polarity: "affirmative",
    wrappers: [PAST_WRAPPER_SLOT],
    exactKara: true
  }),
  ...wrappedReasonQuoteCarrierSurfaceRecords("noun_negative_reason_quote_carrier", {
    sourceShapes: ["nominal"],
    projectionCategories: ["nominal"],
    polarity: "negative",
    wrappers: [OPTIONAL_PAST_WRAPPER_SLOT],
    exactKara: true
  }),
  ...wrappedReasonQuoteCarrierSurfaceRecords("noun_negative_polite_past_reason_quote_carrier", {
    sourceShapes: ["nominal"],
    projectionCategories: ["nominal"],
    polarity: "negative",
    wrappers: [POLITE_WRAPPER_SLOT, PAST_WRAPPER_SLOT],
    exactKara: true
  })
] as const;

const COPULA_REASON_QUOTE_CARRIER_FAMILY: ProductionFamily = {
  id: "copula_reason_quote_carrier",
  conditions: { terminal: { sfp: "forbidden" } },
  claimDomains: [COPULA_REASON_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    COPULA_REASON_SEQUENCE_DEPENDENCIES,
    COPULA_REASON_OP_DEPENDENCIES,
    {
      sourcePredicateShape: true,
      projectionCategories: ["adjectival_predicate", "verbal_predicate", "nominal"]
    },
    [{ kind: "terminal_membership", values: ["attributive", "nominalized"] }]
  ),
  claim: COPULA_REASON_QUOTE_CARRIER_CLAIM,
  records: [
    COPULA_REASON_QUOTE_CARRIER_PREFIX_RECORD,
    COPULA_REASON_QUOTE_CARRIER_RENDER_RECORD,
    TTEIU_REASON_QUOTE_CARRIER_PREFIX_RECORD,
    TTEIU_REASON_QUOTE_CARRIER_RENDER_RECORD,
    ...WRAPPED_REASON_QUOTE_CARRIER_RECORDS
  ],
  nonAdmission: "split"
};

function verbalReasonQuoteCarrierRecord(options: {
  readonly id: string;
  readonly intakeSites: readonly ProductionIntakeSite[];
  readonly carrierSurface?: "という" | "っていう";
}): ProductionRecord {
  return {
    id: options.id,
    shape: {
      root: "aux_layer",
      ops: [
        {
          id: "predicate_prefix",
          role: "wrapper",
          patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
          cardinality: { min: 0, max: null }
        },
        {
          id: "reason",
          role: "core",
          patterns: [productionOpPattern("connective", "connective_fields", {
            connectiveIn: ["reason"]
          })],
          cardinality: { min: 1, max: 1 }
        },
        {
          id: "carrier",
          role: "core",
          patterns: [productionOpPattern(
            "predicateQuoteCarrier",
            "predicate_quote_carrier_fields",
            {
              styleIn: ["compact_toiu"],
              allomorphIn: [options.carrierSurface === "っていう" ? "tteiu" : "toiu"]
            }
          )],
          cardinality: { min: 1, max: 1 }
        }
      ]
    },
    conditions: {
      host: {
        sourceShapes: ["verb", "i_adjective", "sahen_verbalization"],
        projectionCategories: ["verbal_predicate", "adjectival_predicate"]
      },
      terminal: { kinds: REASON_QUOTE_CARRIER_TERMINALS, sfp: "forbidden" },
      clause: { intakeSites: options.intakeSites }
    },
    loweringKey: "normalized_root"
  };
}

const VERBAL_REASON_QUOTE_CARRIER_RECORDS: readonly ProductionRecord[] = [
  verbalReasonQuoteCarrierRecord({
    id: "verbal_reason_quote_carrier_prefix",
    intakeSites: COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES
  }),
  verbalReasonQuoteCarrierRecord({
    id: "verbal_reason_quote_carrier_render",
    intakeSites: ["committed_render"]
  }),
  verbalReasonQuoteCarrierRecord({
    id: "verbal_reason_quote_carrier_tteiu_prefix",
    intakeSites: COPULA_REASON_QUOTE_CARRIER_PREFIX_SITES,
    carrierSurface: "っていう"
  }),
  verbalReasonQuoteCarrierRecord({
    id: "verbal_reason_quote_carrier_tteiu_render",
    intakeSites: ["committed_render"],
    carrierSurface: "っていう"
  })
];

const VERBAL_REASON_CARRIER_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2, 3],
  positions: [
    { kind: "absolute", index: 0 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-1, 0, 1]
    }
  ],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 },
    { opKinds: ["copula"], cap: 1 }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const VERBAL_REASON_CARRIER_OP_DEPENDENCIES = [
  { kind: "connective", fields: ["connective", "allomorph"] },
  COPULA_CLAIM_DEPENDENCY,
  QUOTE_CARRIER_CLAIM_DEPENDENCY
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const VERBAL_REASON_QUOTE_CARRIER_FAMILY: ProductionFamily = {
  id: "verbal_reason_quote_carrier",
  conditions: { terminal: { sfp: "forbidden" } },
  claimDomains: [CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    VERBAL_REASON_CARRIER_SEQUENCE_DEPENDENCIES,
    VERBAL_REASON_CARRIER_OP_DEPENDENCIES,
    {
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate", "adjectival_predicate"]
    },
    [{ kind: "terminal_membership", values: ["attributive", "nominalized"] }]
  ),
  claim: VERBAL_REASON_QUOTE_CARRIER_CLAIM,
  records: VERBAL_REASON_QUOTE_CARRIER_RECORDS,
  nonAdmission: "split"
};

const REASON_COPULA_CONDITIONAL_RECORD: ProductionRecord = {
  id: "reason_copula_conditional",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "predicate_prefix",
        role: "wrapper",
        patterns: NON_CONNECTIVE_OP_PATTERNS,
        cardinality: { min: 0, max: null }
      },
      {
        id: "reason",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["reason"],
          surfaceAllomorphIn: ["kara"]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "reason_copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"],
          polarityIn: ["affirmative"]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "conditional",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["conditional"],
          surfaceAllomorphIn: ["tara"],
          structuralContinuationNotIn: ["quote_marker"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  normalization: {
    id: "lower_reason_copula_to_bound_nominal_reason",
    normalize: ({ root, match }) => {
      if (root.tail.kind !== "auxLayer") return root;
      const reason = match.shape.slots.get("reason")?.[0];
      const copula = match.shape.slots.get("reason_copula")?.[0];
      const conditional = match.shape.slots.get("conditional")?.[0];
      if (
        reason?.kind !== "connective" ||
        copula?.kind !== "copula" ||
        conditional?.kind !== "connective"
      ) return root;
      const prefixLength = root.tail.ops.length - 3;
      const sourceTokens = [
        ...reason.source.tokens,
        ...copula.source.tokens,
        ...conditional.source.tokens
      ];
      const sourceTokenIndices = [
        ...reason.source.tokenIndices,
        ...copula.source.tokenIndices,
        ...conditional.source.tokenIndices
      ];
      return {
        ...root,
        tail: {
          ...root.tail,
          ops: [
            ...root.tail.ops.slice(0, prefixLength),
            createConnectiveOp({

              connective: "bound_nominal_reason",
              surface: "ことから",
              boundNominalReasonClosure: "conditional",
              source: { tokens: sourceTokens, tokenIndices: sourceTokenIndices }
            })
          ]
        }
      };
    }
  },
  loweringKey: "reason_copula_conditional"
};

const REASON_COPULA_CONDITIONAL_FAMILY: ProductionFamily = {
  id: "reason_copula_conditional",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null] } },
  claimDomains: [REASON_COPULA_CONDITIONAL_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    REASON_CONDITIONAL_SEQUENCE_DEPENDENCIES,
    REASON_CONDITIONAL_OP_DEPENDENCIES
  ),
  claim: REASON_COPULA_CONDITIONAL_CLAIM,
  records: [REASON_COPULA_CONDITIONAL_RECORD],
  nonAdmission: "split"
};

const SEQUENCE_AFTER_COPULA_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "sequence_after",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["sequence_after"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "copula_shell",
      role: "core",
      patterns: SEQUENCE_AFTER_COPULA_SHELL_PATTERNS,
      cardinality: { min: 1, max: null }
    }
  ]
};

const SEQUENCE_AFTER_COPULA_RECORDS: readonly ProductionRecord[] = [
  {
    id: "sequence_after_copula_terminal",
    shape: SEQUENCE_AFTER_COPULA_SHAPE,
    conditions: { terminal: { kinds: [null], sfp: "any" } },
    loweringKey: "sequence_after_copula_terminal"
  }
];

const SEQUENCE_AFTER_COPULA_FAMILY: ProductionFamily = {
  id: "sequence_after_copula",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "any" } },
  claimDomains: [SEQUENCE_AFTER_COPULA_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    SEQUENCE_AFTER_COPULA_SEQUENCE_DEPENDENCIES,
    SEQUENCE_AFTER_COPULA_OP_DEPENDENCIES
  ),
  claim: SEQUENCE_AFTER_COPULA_CLAIM,
  records: SEQUENCE_AFTER_COPULA_RECORDS,
  nonAdmission: "split"
};

const CONDITIONAL_QUOTE_CARRIER_YOUDA_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "conditional",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["conditional"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      role: "core",
      patterns: [{ kind: "predicateQuoteCarrier" }],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "likeness",
      role: "core",
      patterns: [productionOpPattern("modal", "modal_fields", {
        modalIn: ["youda"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

function conditionalQuoteEllipsisShape(
  carrierAllomorphs: readonly ("other" | "toiu" | "tteiu")[],
  conditionalAllomorph: "ba" | "tara",
  sourceTerminal?: boolean
): ProductionShape {
  return {
    root: "aux_layer",
    ops: [
      {
        id: "predicate_prefix",
        role: "wrapper",
        patterns: conditionalAllomorph === "ba"
          ? CONDITIONAL_QUOTE_PREFIX_OP_PATTERNS
          : NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
        cardinality: { min: 0, max: null }
      },
      {
        id: "conditional",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["conditional"],
          surfaceAllomorphIn: [conditionalAllomorph],
          conditionalQuoteEllipsisNotIn: ["prohibitive_concern"]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "carrier",
        role: "core",
        patterns: [productionOpPattern(
          "predicateQuoteCarrier",
          "predicate_quote_carrier_fields",
          {
            styleIn: ["compact_toiu"],
            allomorphIn: carrierAllomorphs,
            ...(sourceTerminal === undefined ? {} : { sourceTerminal })
          }
        )],
        cardinality: { min: 1, max: 1 }
      }
    ]
  };
}

const CONDITIONAL_QUOTE_ELLIPSIS_SHAPES = CONDITIONAL_QUOTE_ELLIPSIS_ALLOMORPHS.map(
  (allomorph) => conditionalQuoteEllipsisShape(["other"], allomorph, true)
);
const CONDITIONAL_QUOTE_GENERAL_HEAD_SHAPES = CONDITIONAL_QUOTE_ELLIPSIS_ALLOMORPHS.map(
  (allomorph) => conditionalQuoteEllipsisShape(["toiu", "tteiu"], allomorph)
);

const CONDITIONAL_COMPACT_QUOTE_MANNER_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "conditional",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["conditional"],
        conditionalQuoteEllipsisNotIn: ["prohibitive_concern"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      role: "core",
      patterns: [productionOpPattern(
        "predicateQuoteCarrier",
        "predicate_quote_carrier_fields",
        { styleIn: ["compact_toiu"] }
      )],
      cardinality: { min: 1, max: 1 }
    }
  ]
};




const CONDITIONAL_QUOTE_ELLIPSIS_NORMALIZATION: ProductionNormalization = {
  id: "drop_conditional_quote_ellipsis_carrier",
  normalize: ({ root }) => {
    if (root.tail.kind !== "auxLayer") return root;
    return { ...root, tail: { ...root.tail, ops: root.tail.ops.slice(0, -1) } };
  }
};

const CONDITIONAL_QUOTE_CARRIER_RECORDS: readonly ProductionRecord[] = [
  ...CONDITIONAL_QUOTE_GENERAL_HEAD_SHAPES.map((shape, index) => ({
    id: `conditional_compact_quote_general_head_prefix_${CONDITIONAL_QUOTE_ELLIPSIS_ALLOMORPHS[index]}`,
    shape,
    conditions: {
      terminal: { kinds: ["attributive"] as const },
      clause: {
        intakeSites: ["assembler_resumable_prefix"] as const,
        partial: true,
        conditionalCompactQuoteManner: "forbidden" as const
      }
    },
    loweringKey: "normalized_root" as const
  })),
  {
    id: "conditional_quote_carrier_youda_prefix",
    shape: CONDITIONAL_QUOTE_CARRIER_YOUDA_SHAPE,
    conditions: {
      clause: {
        intakeSites: ["quote_prefix", "assembler_resumable_prefix"],
        partial: true
      }
    },
    loweringKey: "normalized_root"
  },
  {
    id: "conditional_compact_quote_manner_prefix",
    shape: CONDITIONAL_COMPACT_QUOTE_MANNER_SHAPE,
    conditions: {
      terminal: { kinds: ["attributive"] },
      clause: {
        intakeSites: ["assembler_resumable_prefix"],
        partial: true,
        conditionalCompactQuoteManner: "required"
      }
    },
    loweringKey: "normalized_root"
  },
  {
    id: "conditional_quote_carrier_legacy_render",
    shape: CARRIER_CONTEXT_RENDER_SHAPE,
    conditions: {
      clause: { intakeSites: ["committed_render"], partial: false }
    },
    loweringKey: "carrier_context_legacy"
  }
];


function conditionalQuoteEllipsisRecords(
  idPrefix: string,
  intakeSites: readonly ProductionIntakeSite[]
): readonly ProductionRecord[] {
  return CONDITIONAL_QUOTE_ELLIPSIS_SHAPES.map((shape, index) => ({
    id: `${idPrefix}_${CONDITIONAL_QUOTE_ELLIPSIS_ALLOMORPHS[index]}`,
    shape,
    conditions: {
      terminal: { kinds: [null] as const, sfp: "forbidden" as const },
      clause: { intakeSites }
    },
    normalization: CONDITIONAL_QUOTE_ELLIPSIS_NORMALIZATION,
    loweringKey: "conditional_quote_ellipsis_terminal" as const
  }));
}

const CONDITIONAL_QUOTE_ELLIPSIS_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2, 3],
  positions: [
    { kind: "relative", offset: -1 },
    {
      kind: "first_of_kinds",
      opKinds: ["predicateQuoteCarrier"],
      offsets: [-1, 0],
      relativeMatches: [-1]
    }
  ],
  aggregates: [{
    id: "conditional_quote_ellipsis_has_negation_prefix",
    kind: "some_kind",
    opKinds: ["negation"],
    range: {
      start: { kind: "absolute", index: 0 },
      end: { kind: "first_of_kinds", opKinds: ["predicateQuoteCarrier"], offset: -1 }
    }
  }],
  kindCounts: [
    { opKinds: ["connective"], cap: 2 },
    { opKinds: ["predicateQuoteCarrier"], cap: 1 },
    { opKinds: ["negation"], cap: 1 }
  ]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const CONDITIONAL_QUOTE_ELLIPSIS_FAMILY: ProductionFamily = {
  id: "conditional_quote_ellipsis",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    CONDITIONAL_QUOTE_ELLIPSIS_SEQUENCE_DEPENDENCIES,
    CONDITIONAL_QUOTE_ELLIPSIS_OP_DEPENDENCIES,
    undefined,
    [{ kind: "terminal_membership", values: [null] }]
  ),
  claim: CONDITIONAL_QUOTE_ELLIPSIS_CLAIM,
  records: [
    ...conditionalQuoteEllipsisRecords("conditional_quote_ellipsis_candidate", ["candidate_scan"]),
    ...conditionalQuoteEllipsisRecords("conditional_quote_ellipsis_render", ["committed_render"])
  ],
  nonAdmission: "split"
};

const CONDITIONAL_QUOTE_CARRIER_FAMILY: ProductionFamily = {
  id: "conditional_quote_carrier",
  claimDomains: [CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    CONDITIONAL_CARRIER_SEQUENCE_DEPENDENCIES,
    CONDITIONAL_CARRIER_OP_DEPENDENCIES,
    undefined,
    [{ kind: "terminal_membership", values: ["attributive"] }]
  ),
  claim: CONDITIONAL_QUOTE_CARRIER_CLAIM,
  records: CONDITIONAL_QUOTE_CARRIER_RECORDS,
  nonAdmission: "split"
};


const ADVERSATIVE_QUOTE_CARRIER_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "adversative",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["adversative"]
      })],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "carrier",
      role: "core",
      patterns: [productionOpPattern(
        "predicateQuoteCarrier",
        "predicate_quote_carrier_fields",
        { styleIn: ["compact_toiu"] }
      )],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const ADVERSATIVE_QUOTE_CARRIER_FAMILY: ProductionFamily = {
  id: "adversative_quote_carrier",
  conditions: { terminal: { kinds: ["attributive", null], sfp: "forbidden" } },
  claimDomains: [CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    ADVERSATIVE_CARRIER_SEQUENCE_DEPENDENCIES,
    ADVERSATIVE_CARRIER_OP_DEPENDENCIES,
    { stemKind: true },
    [
      { kind: "terminal_membership", values: ["attributive"] },
      { kind: "terminal_membership", values: [null] }
    ]
  ),
  claim: ADVERSATIVE_QUOTE_CARRIER_CLAIM,
  records: [
    {
      id: "adversative_quote_carrier_prefix",
      shape: ADVERSATIVE_QUOTE_CARRIER_SHAPE,
      conditions: {
        terminal: { kinds: ["attributive"], sfp: "forbidden" },
        clause: {
          intakeSites: ["assembler_resumable_prefix"],
          partial: true
        }
      },
      loweringKey: "normalized_root"
    },
    {
      id: "adversative_quote_carrier_render",
      shape: ADVERSATIVE_QUOTE_CARRIER_SHAPE,
      conditions: {
        terminal: { kinds: ["attributive"], sfp: "forbidden" },
        clause: { intakeSites: ["committed_render"], partial: false }
      },
      loweringKey: "adversative_quote_carrier_attributive_render"
    },
    {
      id: "adversative_quote_carrier_terminal_candidate",
      shape: ADVERSATIVE_QUOTE_CARRIER_SHAPE,
      conditions: {
        terminal: { kinds: [null], sfp: "forbidden" },
        clause: { intakeSites: ["candidate_scan"] }
      },
      loweringKey: "adversative_quote_carrier_terminal_render"
    },
    {
      id: "adversative_quote_carrier_terminal_render",
      shape: ADVERSATIVE_QUOTE_CARRIER_SHAPE,
      conditions: {
        terminal: { kinds: [null], sfp: "forbidden" },
        clause: { intakeSites: ["committed_render"] }
      },
      loweringKey: "adversative_quote_carrier_terminal_render"
    }
  ],
  nonAdmission: "split"
};

const EXEMPLIFICATION_MID_CHAIN_FAMILY: ProductionFamily = {
  id: "exemplification_mid_chain",
  claimDomains: [ANY_CONNECTIVE_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    EXEMPLIFICATION_SEQUENCE_DEPENDENCIES,
    EXEMPLIFICATION_OP_DEPENDENCIES
  ),
  claim: EXEMPLIFICATION_MID_CHAIN_CLAIM,
  records: EXEMPLIFICATION_RECORDS,
  nonAdmission: "split"
};




const EMBEDDED_QUESTION_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    {
      id: "predicate_prefix",
      role: "wrapper",
      patterns: NON_CONNECTIVE_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "chain_final_connective",
      role: "core",
      patterns: [{ kind: "connective" }],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "question_content",
      role: "core",
      patterns: [productionOpPattern("connective", "connective_fields", {
        connectiveIn: ["question_content", "question_content_alternative"]
      })],
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const EMBEDDED_QUESTION_MID_CHAIN_FAMILY: ProductionFamily = {
  id: "embedded_question_mid_chain",
  claimState: "invariant",
  claimDomains: [FINAL_CONNECTIVE_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    EMBEDDED_QUESTION_SEQUENCE_DEPENDENCIES,
    EMBEDDED_QUESTION_OP_DEPENDENCIES,
    { projectionCategories: ["nominal"] }
  ),
  claim: EMBEDDED_QUESTION_MID_CHAIN_CLAIM,
  records: [
    {
      id: "embedded_question_chain_final_prefix",
      shape: EMBEDDED_QUESTION_PREFIX_SHAPE,
      conditions: {
        clause: { intakeSites: ["quote_prefix"], partial: true }
      },
      loweringKey: "normalized_root"
    },
    {
      id: "embedded_question_legacy_render",
      shape: CARRIER_CONTEXT_RENDER_SHAPE,
      conditions: {
        clause: { intakeSites: ["committed_render"], partial: false }
      },
      loweringKey: "carrier_context_legacy"
    }
  ],
  nonAdmission: "split"
};



const NON_EMBEDDED_QUESTION_OP_PATTERNS = AUX_OP_INVENTORY.map(({ opKind }) =>
  opKind === "connective"
    ? productionOpPattern("connective", "connective_fields", {
        connectiveNotIn: ["question_content", "question_content_alternative"]
      })
    : { kind: opKind }
) as readonly ProductionOpPattern[];

const REASON_QUOTE_CARRIER_RESIDUAL_PREFIX_BASE_SLOTS: readonly ProductionOpSlot[] = [
  {
    id: "copula",
    role: "core",
    patterns: [productionOpPattern("copula", "copula_fields", {
      variantIn: ["basic"],
      polarityIn: ["affirmative"]
    })],
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "copula_wrappers",
    role: "wrapper",
    patterns: [{ kind: "polite" }, { kind: "classicalAuxResidue" }],
    cardinality: { min: 0, max: null }
  },
  {
    id: "reason",
    role: "core",
    patterns: [productionOpPattern("connective", "connective_fields", {
      connectiveIn: ["reason"]
    })],
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "carrier",
    role: "core",
    patterns: [{ kind: "predicateQuoteCarrier" }],
    cardinality: { min: 1, max: 1 }
  }
];

const REASON_QUOTE_CARRIER_NO_RESIDUAL_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: REASON_QUOTE_CARRIER_RESIDUAL_PREFIX_BASE_SLOTS
};

const REASON_QUOTE_CARRIER_NON_QUESTION_RESIDUAL_PREFIX_SHAPE: ProductionShape = {
  root: "aux_layer",
  ops: [
    ...REASON_QUOTE_CARRIER_RESIDUAL_PREFIX_BASE_SLOTS,
    {
      id: "residual_prefix",
      role: "wrapper",
      patterns: ALL_OP_PATTERNS,
      cardinality: { min: 0, max: null }
    },
    {
      id: "residual_final",
      role: "wrapper",
      patterns: NON_EMBEDDED_QUESTION_OP_PATTERNS,
      cardinality: { min: 1, max: 1 }
    }
  ]
};

const REASON_QUOTE_CARRIER_LEGACY_RESIDUAL_FAMILY: ProductionFamily = {
  id: "reason_quote_carrier_legacy_residual",
  claimDomains: [COPULA_REASON_CARRIER_CLAIM_DOMAIN],
  claimDependencies: claimDependencies(
    REASON_RESIDUAL_SEQUENCE_DEPENDENCIES,
    REASON_RESIDUAL_OP_DEPENDENCIES,
    { projectionCategories: ["nominal"] }
  ),
  claim: REASON_QUOTE_CARRIER_RESIDUAL_CLAIM,
  records: [
    {
      id: "reason_quote_carrier_legacy_residual_quote_prefix",
      shape: REASON_QUOTE_CARRIER_NO_RESIDUAL_PREFIX_SHAPE,
      conditions: {
        host: { projectionCategories: ["nominal"] },
        clause: { intakeSites: ["quote_prefix"], partial: true }
      },
      loweringKey: "normalized_root"
    },
    {
      id: "reason_quote_carrier_legacy_residual_quote_prefix_with_residual",
      shape: REASON_QUOTE_CARRIER_NON_QUESTION_RESIDUAL_PREFIX_SHAPE,
      conditions: {
        host: { projectionCategories: ["nominal"] },
        clause: { intakeSites: ["quote_prefix"], partial: true }
      },
      loweringKey: "normalized_root"
    },
    {
      id: "reason_quote_carrier_legacy_residual_attributive_prefix",
      shape: CARRIER_CONTEXT_RENDER_SHAPE,
      conditions: {
        clause: { intakeSites: ["assembler_resumable_prefix"], partial: true }
      },
      loweringKey: "normalized_root"
    },
    {
      id: "reason_quote_carrier_legacy_residual_render",
      shape: CARRIER_CONTEXT_RENDER_SHAPE,
      conditions: {
        clause: { intakeSites: ["committed_render"], partial: false }
      },
      loweringKey: "carrier_context_legacy"
    }
  ],
  nonAdmission: "split"
};

const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "source_verbal_adjectival_desiderative_core",
  root: "aux_layer",
  ops: [{
    id: "desiderative",
    opKinds: ["aspect"],
    cardinality: { min: 1, max: 1 }
  }],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_WISH_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "source_verbal_adjectival_desiderative_wish_core",
  root: "aux_layer",
  ops: [
    {
      id: "desiderative",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "wish_complement",
      opKinds: ["connective"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const DESIDERATIVE_INTAKE_SITES: readonly ProductionIntakeSite[] = [
  "candidate_scan",
  "quote_prefix",
  "assembler_resumable_prefix",
  "committed_render"
];

const COPULAR_DESIDERATIVE_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "copular_desiderative_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "desiderative",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    },
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const COPULAR_DESIDERATIVE_PAST_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "copular_desiderative_past_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "desiderative",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "past",
      opKinds: ["tense"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const COPULAR_DESIDERATIVE_CONNECTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "copular_desiderative_connective_core",
  root: "aux_layer",
  ops: [
    {
      id: "copula",
      opKinds: ["copula"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "desiderative",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "connective",
      opKinds: ["connective"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const NOMINAL_LIMIT_DESIDERATIVE_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "nominal_limit_desiderative_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "limit",
      opKinds: ["predicateProjectionCarrier"],
      cardinality: { min: 1, max: 1 }
    },
    {
      id: "desiderative",
      opKinds: ["aspect"],
      cardinality: { min: 1, max: 1 }
    }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};


const NOUN_COPULA_DESIDERATIVE_TERMINAL_RECORD: ProductionRecord = {
  id: "noun_copula_desiderative_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"], polarityIn: ["affirmative"], basicForm: "absent", politeIn: [false]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
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
  loweringKey: "noun_copula_desiderative_terminal"
};

const NOUN_COPULA_DESIDERATIVE_PAST_TERMINAL_RECORD: ProductionRecord = {
  id: "noun_copula_desiderative_past_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"], polarityIn: ["affirmative"], basicForm: "absent", politeIn: [false]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "past",
        role: "core",
        patterns: [productionOpPattern("tense", "tense_fields", { tenseIn: ["past"] })],
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
  loweringKey: "noun_copula_desiderative_past_terminal"
};

const NOUN_COPULA_DESIDERATIVE_CONNECTIVE_RECORD: ProductionRecord = {
  id: "noun_copula_desiderative_connective",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"], polarityIn: ["affirmative"], basicForm: "absent", politeIn: [false]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "connective",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["adversative", "quotative", "wish_complement"]
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
  loweringKey: "noun_copula_desiderative_connective"
};

const NOUN_LIMIT_DESIDERATIVE_TERMINAL_RECORD: ProductionRecord = {
  id: "noun_limit_desiderative_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "limit",
        role: "core",
        patterns: [productionOpPattern(
          "predicateProjectionCarrier",
          "predicate_projection_carrier_fields",
          { carrierIn: ["limit_dake"], politeNotTrue: true, pastNotTrue: true }
        )],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
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
  loweringKey: "noun_limit_desiderative_terminal"
};

const NA_ADJECTIVE_COPULA_DESIDERATIVE_TERMINAL_RECORD: ProductionRecord = {
  id: "na_adjective_copula_desiderative_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "copula",
        role: "core",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"], polarityIn: ["affirmative"], basicForm: "absent", politeIn: [false]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["na_adjective"],
      projectionCategories: ["adjectival_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: DESIDERATIVE_INTAKE_SITES }
  },
  loweringKey: "na_adjective_copula_desiderative_terminal"
};

const COPULAR_TE_HOSHII_FAMILY: ProductionFamily = {
  id: "copular_te_hoshii",
  legacyFallback: "retired",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [
    COPULAR_DESIDERATIVE_TERMINAL_CLAIM_DOMAIN,
    COPULAR_DESIDERATIVE_PAST_TERMINAL_CLAIM_DOMAIN,
    COPULAR_DESIDERATIVE_CONNECTIVE_CLAIM_DOMAIN,
    NOMINAL_LIMIT_DESIDERATIVE_TERMINAL_CLAIM_DOMAIN
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
        { opKinds: ["aspect"], cap: 1 },
        { opKinds: ["connective"], cap: 1 },
        { opKinds: ["tense"], cap: 1 },
        { opKinds: ["predicateProjectionCarrier"], cap: 1 }
      ]
    },
    [
      { kind: "copula", fields: ["variant", "basicForm", "polarity", "polite"] },
      { kind: "aspect", fields: ["aspect", "desiderative"] },
      { kind: "connective", fields: ["connective"] },
      { kind: "tense", fields: ["tense"] },
      { kind: "predicateProjectionCarrier", fields: ["carrier", "polite", "past"] }
    ],
    {
      sourcePredicateShape: true,
      projectionCategories: ["nominal", "adjectival_predicate"]
    }
  ),
  claim: COPULAR_TE_HOSHII_CLAIM,
  records: [
    NOUN_COPULA_DESIDERATIVE_TERMINAL_RECORD,
    NOUN_COPULA_DESIDERATIVE_PAST_TERMINAL_RECORD,
    NOUN_COPULA_DESIDERATIVE_CONNECTIVE_RECORD,
    NOUN_LIMIT_DESIDERATIVE_TERMINAL_RECORD,
    NA_ADJECTIVE_COPULA_DESIDERATIVE_TERMINAL_RECORD
  ],
  nonAdmission: "reject"
};

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

const COPULAR_BENEFACTIVE_REQUEST_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_DESIRE_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_PERMISSION_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_FORBIDDEN_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_NEGATIVE_LIKENESS_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_REPORTED_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const PREDICATE_COPULA_NEGATIVE_CONFIRM_FAMILY: ProductionFamily = {
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

const PREDICATE_COPULA_PROGRESSIVE_CONFIRM_FAMILY: ProductionFamily = {
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

const VOLITIONAL_NEGATIVE_INVITE_FAMILY: ProductionFamily = {
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

const VOLITIONAL_QUESTION_QUOTATIVE_FAMILY: ProductionFamily = {
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

const VOLITIONAL_REFORMULATION_QUESTION_FAMILY: ProductionFamily = {
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

const PREDICATE_QUOTE_TTE_NOMINALIZED_FAMILY: ProductionFamily = {
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

const ACCUSTOMED_PAST_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const ADVERBIAL_CHANGE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const ZUNI_SUMU_QUOTE_TTE_FAMILY: ProductionFamily = {
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


const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_RECORD: ProductionRecord = {
  id: "source_verbal_adjectival_desiderative_terminal",
  shape: {
    root: "aux_layer",
    ops: [{
      id: "desiderative",
      role: "core",
      patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
      cardinality: { min: 1, max: 1 }
    }]
  },
  conditions: {
    host: {
      sourceShapes: ["verb"],
      projectionCategories: ["adjectival_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: {
      intakeSites: DESIDERATIVE_INTAKE_SITES
    }
  },
  loweringKey: "source_verbal_adjectival_desiderative"
};

const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_WISH_RECORD: ProductionRecord = {
  id: "source_verbal_adjectival_desiderative_wish_complement",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "desiderative",
        role: "core",
        patterns: [productionOpPattern("aspect", "plain_te_hoshii", {})],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "wish_complement",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["wish_complement"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["verb"],
      projectionCategories: ["adjectival_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: {
      intakeSites: DESIDERATIVE_INTAKE_SITES
    }
  },
  loweringKey: "source_verbal_adjectival_desiderative_wish_complement"
};

const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_FAMILY: ProductionFamily = {
  id: "source_verbal_adjectival_desiderative",
  claimState: "invariant",
  conditions: { terminal: { kinds: [null], sfp: "forbidden" } },
  claimDomains: [
    SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_CLAIM_DOMAIN,
    SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_WISH_CLAIM_DOMAIN
  ],
  claimDependencies: claimDependencies(
    {
      lengthThresholds: [1, 2],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 }
      ],
      kindCounts: [
        { opKinds: ["aspect"], cap: 1 },
        { opKinds: ["connective"], cap: 1 }
      ]
    },
    [
      { kind: "aspect", fields: ["aspect", "desiderative"] },
      { kind: "connective", fields: ["connective"] }
    ],
    {
      sourcePredicateShape: true,
      admittedOnlyProjectionCategories: ["adjectival_predicate"]
    }
  ),
  claim: SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_CLAIM,
  records: [
    SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_RECORD,
    SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_WISH_RECORD
  ],
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

const VOLITIONAL_RETROSPECTIVE_QUOTATIVE_FAMILY: ProductionFamily = {
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

const CONJECTURAL_QUOTATIVE_FAMILY: ProductionFamily = {
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

const QUOTATIVE_INSISTENT_TERMINAL_FAMILY: ProductionFamily = {
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

const PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_FAMILY: ProductionFamily = {
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

const REINFORCED_POTENTIAL_COMPOSITION_FAMILY: ProductionFamily = {
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

const VOLITIONAL_WISH_COMPLEMENT_FAMILY: ProductionFamily = {
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

const VOLITIONAL_QUOTE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const VOLITIONAL_REQUEST_COMPLEMENT_FAMILY: ProductionFamily = {
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

const REQUEST_TERMINAL_INTAKE_SITES = [
  "candidate_scan",
  "quote_prefix",
  "assembler_resumable_prefix",
  "committed_render"
] as const satisfies readonly ProductionIntakeSite[];

const REQUEST_COMPOSED_BASE_PREFIX_KINDS = [
  "aspect",
  "postverbAuxiliary",
  "voice",
  "copula"
] as const satisfies readonly AuxOpKind[];

const REQUEST_COMPOSED_HEAD_PATTERNS: readonly ProductionOpPattern[] = [
  productionOpPattern("aspect", "request_command_base_aspect", {}),
  { kind: "postverbAuxiliary" },
  { kind: "voice" }
];

const REQUEST_COMPOSED_BASE_PATTERNS: readonly ProductionOpPattern[] = [
  ...REQUEST_COMPOSED_HEAD_PATTERNS,
  productionOpPattern("copula", "copula_fields", {
    variantIn: ["basic"],
    polarityIn: ["affirmative"],
    politeIn: [false]
  })
];

const REQUEST_ON_COMPOSED_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_terminal_core",
  root: "aux_layer",
  ops: [
    {
      id: "command_base",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      cardinality: { min: 1, max: null }
    },
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null] }
};

const REQUEST_ON_COMPOSED_COMPLEMENT_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_complement_core",
  root: "aux_layer",
  ops: [
    {
      id: "command_base",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      cardinality: { min: 1, max: null }
    },
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "request_complement", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_REPORTED_REQUEST_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_reported_request_core",
  root: "aux_layer",
  ops: [
    {
      id: "command_base",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      cardinality: { min: 1, max: null }
    },
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "reported_request", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_WRAPPED_TERMINAL_CLAIM_DOMAINS = [
  {
    id: "request_on_composed_pre_head_negation_terminal_core",
    root: "aux_layer",
    ops: [
      { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
      { id: "command_base", opKinds: ["aspect", "postverbAuxiliary", "voice"], cardinality: { min: 1, max: 1 } },
      { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } }
    ],
    terminal: { kinds: [null] }
  },
  {
    id: "request_on_composed_inter_head_negation_terminal_core",
    root: "aux_layer",
    ops: [
      { id: "command_base_before", opKinds: ["aspect", "postverbAuxiliary", "voice"], cardinality: { min: 1, max: 1 } },
      { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
      { id: "command_base", opKinds: ["aspect", "postverbAuxiliary", "voice"], cardinality: { min: 1, max: 1 } },
      { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } }
    ],
    terminal: { kinds: [null] }
  }
] as const satisfies readonly ProductionFamilyClaimDomain[];

const REQUEST_ON_COMPOSED_QUOTE_ATTRIBUTIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_quote_attributive_core",
  root: "aux_layer",
  ops: [
    {
      id: "command_base",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      cardinality: { min: 1, max: null }
    },
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "quote_carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: ["attributive", null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_NOMINALIZED_TERMINAL_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_nominalized_terminal_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "nominalizer_copula", opKinds: ["copula"], cardinality: { min: 0, max: 1 } },
    { id: "noda", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_HEARSAY_CHAIN_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_hearsay_chain_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "hearsay", opKinds: ["modal"], cardinality: { min: 1, max: 1 } },
    { id: "chain_connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_QUOTE_CARRIER_CHAIN_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_quote_carrier_chain_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "quote_carrier", opKinds: ["predicateQuoteCarrier"], cardinality: { min: 1, max: 1 } },
    { id: "wake", opKinds: ["modal"], cardinality: { min: 0, max: 1 } },
    { id: "chain_connective", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_ON_COMPOSED_LIKENESS_FRAGMENT_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_on_composed_likeness_fragment_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "likeness", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_COMPOSED_SEQUENCE_DEPENDENCIES = {
  lengthThresholds: [2, 3, 4],
  positions: [
    { kind: "absolute", index: 0 },
    { kind: "absolute", index: 1 },
    { kind: "absolute", index: 2 },
    { kind: "absolute", index: 3 },
    { kind: "relative", offset: -1 },
    { kind: "relative", offset: -2 }
  ],
  aggregates: [
    {
      id: "request_composed_terminal_prefix_kinds",
      kind: "every_kind_in",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "request_composed_complement_prefix_kinds",
      kind: "every_kind_in",
      opKinds: REQUEST_COMPOSED_BASE_PREFIX_KINDS,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -2 }
      }
    },
    {
      id: "request_composed_terminal_aspects",
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("aspect", "request_command_base_aspect", {}),
      requireAtLeastOne: false,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "request_composed_complement_aspects",
      kind: "every_filtered_pattern",
      pattern: productionOpPattern("aspect", "request_command_base_aspect", {}),
      requireAtLeastOne: false,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -2 }
      }
    },
    {
      id: "request_composed_terminal_has_head",
      kind: "some_pattern",
      patterns: REQUEST_COMPOSED_HEAD_PATTERNS,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -1 }
      }
    },
    {
      id: "request_composed_complement_has_head",
      kind: "some_pattern",
      patterns: REQUEST_COMPOSED_HEAD_PATTERNS,
      range: {
        start: { kind: "absolute", index: 0 },
        end: { kind: "relative", offset: -2 }
      }
    }
  ],
  kindCounts: [{ opKinds: ["copula"], cap: 2 }]
} as const satisfies ProductionFamilyClaimSequenceDependencies;

const REQUEST_COMPOSED_HOST_CONDITIONS = {
  sourceShapes: ["verb", "sahen_verbalization", "i_adjective", "na_adjective"],
  projectionCategories: ["verbal_predicate", "adjectival_predicate"]
} as const;

const REQUEST_COMPOSED_BASE_SLOT: ProductionOpSlot = {
  id: "command_base",
  role: "core",
  patterns: REQUEST_COMPOSED_BASE_PATTERNS,
  cardinality: { min: 1, max: null }
};

const REQUEST_COMPOSED_REQUEST_SLOT: ProductionOpSlot = {
  id: "request",
  role: "core",
  patterns: [productionOpPattern("aspect", "request_aspect", {})],
  cardinality: { min: 1, max: 1 }
};

const REQUEST_COMPOSED_POLITE_REQUEST_SLOT: ProductionOpSlot = {
  id: "request",
  role: "core",
  patterns: [productionOpPattern("aspect", "request_aspect", {
    aspectIn: ["te_kudasai"]
  })],
  cardinality: { min: 1, max: 1 }
};

const REQUEST_COMPOSED_TERMINAL_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_terminal",
  shape: {
    root: "aux_layer",
    ops: [REQUEST_COMPOSED_BASE_SLOT, REQUEST_COMPOSED_REQUEST_SLOT]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_PRE_HEAD_NEGATION_OPS = [
  {
    id: "command_wrapper",
    role: "wrapper",
    patterns: [{ kind: "negation" }],
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "command_base",
    role: "core",
    patterns: REQUEST_COMPOSED_HEAD_PATTERNS,
    cardinality: { min: 1, max: 1 }
  },
  REQUEST_COMPOSED_REQUEST_SLOT
] as const satisfies ProductionRecord["shape"]["ops"];

const REQUEST_COMPOSED_INTER_HEAD_NEGATION_OPS = [
  {
    id: "command_base_before",
    role: "core",
    patterns: REQUEST_COMPOSED_HEAD_PATTERNS,
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "command_wrapper",
    role: "wrapper",
    patterns: [{ kind: "negation" }],
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "command_base",
    role: "core",
    patterns: REQUEST_COMPOSED_HEAD_PATTERNS,
    cardinality: { min: 1, max: 1 }
  },
  REQUEST_COMPOSED_REQUEST_SLOT
] as const satisfies ProductionRecord["shape"]["ops"];

const REQUEST_COMPOSED_PRE_HEAD_NEGATION_TERMINAL_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_pre_head_negation_terminal",
  shape: {
    root: "aux_layer",
    ops: REQUEST_COMPOSED_PRE_HEAD_NEGATION_OPS
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_INTER_HEAD_NEGATION_TERMINAL_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_inter_head_negation_terminal",
  shape: {
    root: "aux_layer",
    ops: REQUEST_COMPOSED_INTER_HEAD_NEGATION_OPS
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_PRE_HEAD_NEGATION_NEUTRAL_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_pre_head_negation_neutral_sfp",
  shape: { root: "aux_layer", ops: REQUEST_COMPOSED_PRE_HEAD_NEGATION_OPS },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: [null] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_PRE_HEAD_NEGATION_DISCURSIVE_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_pre_head_negation_discursive_sfp",
  shape: { root: "aux_layer", ops: REQUEST_COMPOSED_PRE_HEAD_NEGATION_OPS },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: ["ne", "na_excl"] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_discursive_sfp"
};

const REQUEST_COMPOSED_INTER_HEAD_NEGATION_NEUTRAL_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_inter_head_negation_neutral_sfp",
  shape: { root: "aux_layer", ops: REQUEST_COMPOSED_INTER_HEAD_NEGATION_OPS },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: [null] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_INTER_HEAD_NEGATION_DISCURSIVE_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_inter_head_negation_discursive_sfp",
  shape: { root: "aux_layer", ops: REQUEST_COMPOSED_INTER_HEAD_NEGATION_OPS },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: ["ne", "na_excl"] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_discursive_sfp"
};

const REQUEST_COMPOSED_NEUTRAL_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_neutral_sfp",
  shape: {
    root: "aux_layer",
    ops: [REQUEST_COMPOSED_BASE_SLOT, REQUEST_COMPOSED_REQUEST_SLOT]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: [null] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_terminal"
};

const REQUEST_COMPOSED_DISCURSIVE_SFP_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_discursive_sfp",
  shape: {
    root: "aux_layer",
    ops: [REQUEST_COMPOSED_BASE_SLOT, REQUEST_COMPOSED_REQUEST_SLOT]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "required", sfpEffects: ["ne", "na_excl"] },
    clause: { intakeSites: ["candidate_scan", "committed_render"], partial: false }
  },
  loweringKey: "request_composed_base_discursive_sfp"
};

const REQUEST_COMPOSED_COMPLEMENT_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_complement",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_BASE_SLOT,
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "request_complement",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["request_complement"],
          surfaceAllomorphIn: ["to", "tte"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_composed_base_request_complement"
};

const REQUEST_COMPOSED_PROJECTION_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_projection",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_BASE_SLOT,
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "request_projection",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["wish_complement", "quoted_concessive"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_projection_connective"
};

const REQUEST_COMPOSED_REPORTED_REQUEST_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_reported_request",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_BASE_SLOT,
      REQUEST_COMPOSED_POLITE_REQUEST_SLOT,
      {
        id: "reported_request",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["other"],
          quotativeMoodIn: ["imperative"],
          quotativeClosureIn: ["reported_request"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_reported_terminal"
};

const REQUEST_COMPOSED_QUOTE_ATTRIBUTIVE_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_quote_attributive",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_BASE_SLOT,
      REQUEST_COMPOSED_REQUEST_SLOT,
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
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: ["attributive", null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_projection_quote_attributive"
};

const REQUEST_COMPOSED_NOMINALIZED_TERMINAL_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_nominalized_terminal",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "nominalizer_copula",
        role: "wrapper",
        patterns: [productionOpPattern("copula", "copula_fields", {
          variantIn: ["basic"],
          polarityIn: ["affirmative"],
          politeIn: [false]
        })],
        cardinality: { min: 0, max: 1 }
      },
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
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_nominalized_terminal"
};

const REQUEST_COMPOSED_LIKENESS_FRAGMENT_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_likeness_fragment",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "likeness",
        role: "core",
        patterns: [productionOpPattern("modal", "youda_modal_fields", {
          formIn: ["youda", "mitai"],
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
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_likeness_fragment"
};

const REQUEST_CHAIN_CONNECTIVE_SLOT: ProductionOpSlot = {
  id: "chain_connective",
  role: "core",
  patterns: [productionOpPattern("connective", "connective_fields", {})],
  cardinality: { min: 1, max: 1 }
};

const REQUEST_COMPOSED_HEARSAY_CHAIN_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_hearsay_chain",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "hearsay",
        role: "core",
        patterns: [productionOpPattern("modal", "souda_hearsay_modal_fields", {
          readingIn: ["hearsay"],
          inner: "absent"
        })],
        cardinality: { min: 1, max: 1 }
      },
      REQUEST_CHAIN_CONNECTIVE_SLOT
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_carrier_chain_connective"
};

const REQUEST_COMPOSED_QUOTE_CARRIER_CHAIN_RECORD: ProductionRecord = {
  id: "request_on_composed_predicate_base_quote_carrier_chain",
  shape: {
    root: "aux_layer",
    ops: [
      REQUEST_COMPOSED_REQUEST_SLOT,
      {
        id: "quote_carrier",
        role: "core",
        patterns: [productionOpPattern("predicateQuoteCarrier", "predicate_quote_carrier_fields", {
          styleIn: ["compact_toiu"]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "wake",
        role: "core",
        patterns: [productionOpPattern("modal", "modal_fields", {
          modalIn: ["wake"],
          inner: "absent"
        })],
        cardinality: { min: 0, max: 1 }
      },
      REQUEST_CHAIN_CONNECTIVE_SLOT
    ]
  },
  conditions: {
    host: REQUEST_COMPOSED_HOST_CONDITIONS,
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_carrier_chain_connective"
};

const REQUEST_ON_COMPOSED_PREDICATE_BASE_FAMILY: ProductionFamily = {
  id: "request_on_composed_predicate_base",
  legacyFallback: "retired",
  claimDomains: [
    REQUEST_ON_COMPOSED_TERMINAL_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_COMPLEMENT_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_REPORTED_REQUEST_CLAIM_DOMAIN,
    ...REQUEST_ON_COMPOSED_WRAPPED_TERMINAL_CLAIM_DOMAINS,
    REQUEST_ON_COMPOSED_QUOTE_ATTRIBUTIVE_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_NOMINALIZED_TERMINAL_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_LIKENESS_FRAGMENT_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_HEARSAY_CHAIN_CLAIM_DOMAIN,
    REQUEST_ON_COMPOSED_QUOTE_CARRIER_CHAIN_CLAIM_DOMAIN
  ],
  claimDependencies: claimDependencies(
    REQUEST_COMPOSED_SEQUENCE_DEPENDENCIES,
    [
      { kind: "aspect", fields: ["aspect"] },
      { kind: "copula", fields: ["variant", "polarity", "polite"] },
      {
        kind: "connective",
        fields: ["connective", "allomorph", "quotativeMood", "quotativeClosure"]
      },
      { kind: "predicateQuoteCarrier", fields: ["style"] },
      {
        kind: "modal",
        fields: ["modal", "form", "terminal", "reading", "polite", "past", "inner"]
      }
    ],
    {
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate", "adjectival_predicate"]
    },
    [
      { kind: "terminal_membership", values: [null] },
      { kind: "terminal_membership", values: ["attributive"] },
      { kind: "sfp_presence" },
      { kind: "sfp_effect_membership", values: [null, "ne", "na_excl"] }
    ]
  ),
  claim: REQUEST_ON_COMPOSED_PREDICATE_BASE_CLAIM,
  records: [
    REQUEST_COMPOSED_TERMINAL_RECORD,
    REQUEST_COMPOSED_PRE_HEAD_NEGATION_TERMINAL_RECORD,
    REQUEST_COMPOSED_INTER_HEAD_NEGATION_TERMINAL_RECORD,
    REQUEST_COMPOSED_PRE_HEAD_NEGATION_NEUTRAL_SFP_RECORD,
    REQUEST_COMPOSED_PRE_HEAD_NEGATION_DISCURSIVE_SFP_RECORD,
    REQUEST_COMPOSED_INTER_HEAD_NEGATION_NEUTRAL_SFP_RECORD,
    REQUEST_COMPOSED_INTER_HEAD_NEGATION_DISCURSIVE_SFP_RECORD,
    REQUEST_COMPOSED_NEUTRAL_SFP_RECORD,
    REQUEST_COMPOSED_DISCURSIVE_SFP_RECORD,
    REQUEST_COMPOSED_COMPLEMENT_RECORD,
    REQUEST_COMPOSED_PROJECTION_RECORD,
    REQUEST_COMPOSED_REPORTED_REQUEST_RECORD,
    REQUEST_COMPOSED_QUOTE_ATTRIBUTIVE_RECORD,
    REQUEST_COMPOSED_NOMINALIZED_TERMINAL_RECORD,
    REQUEST_COMPOSED_LIKENESS_FRAGMENT_RECORD,
    REQUEST_COMPOSED_HEARSAY_CHAIN_RECORD,
    REQUEST_COMPOSED_QUOTE_CARRIER_CHAIN_RECORD
  ],
  nonAdmission: "preserve"
};

const BENEFACTIVE_NODA_DIRECT_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "benefactive_noda_direct_terminal_core",
  root: "aux_layer",
  ops: [
    { id: "benefactive", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "noda", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: {
    kinds: [null],
    sfp: "required",
    sfpEffects: [null, "ka"],
    sfpEmphaticQuestion: false
  }
};

const BENEFACTIVE_NODA_VOICE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "benefactive_noda_voice_terminal_core",
  root: "aux_layer",
  ops: [
    { id: "voice", opKinds: ["voice"], cardinality: { min: 1, max: 1 } },
    { id: "benefactive", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "noda", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: {
    kinds: [null],
    sfp: "required",
    sfpEffects: [null, "ka"],
    sfpEmphaticQuestion: false
  }
};

const BENEFACTIVE_NODA_COPULA_STATE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "benefactive_noda_copula_state_terminal_core",
  root: "aux_layer",
  ops: [
    { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
    { id: "state_change", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
    { id: "benefactive", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "noda", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: {
    kinds: [null],
    sfp: "required",
    sfpEffects: [null, "ka"],
    sfpEmphaticQuestion: false
  }
};

const BENEFACTIVE_NODA_PREFIX_SLOT: ProductionOpSlot = {
  id: "benefactive_prefix",
  role: "core",
  patterns: [
    productionOpPattern("copula", "copula_fields", {
      variantIn: ["basic"],
      polarityIn: ["affirmative"],
      politeIn: [false]
    }),
    productionOpPattern("postverbAuxiliary", "postverb_auxiliary_fields", {
      auxiliaryKindIn: ["make_state_change"]
    }),
    productionOpPattern("voice", "voice_fields", { voiceIn: ["causative"] })
  ],
  cardinality: { min: 0, max: 2 }
};

const BENEFACTIVE_NODA_CORE_SLOTS = [
  BENEFACTIVE_NODA_PREFIX_SLOT,
  {
    id: "benefactive",
    role: "core",
    patterns: [productionOpPattern("aspect", "benefactive_aspect", {
      aspectIn: ["te_kureru"]
    })],
    cardinality: { min: 1, max: 1 }
  },
  {
    id: "noda",
    role: "core",
    patterns: [productionOpPattern("modal", "modal_fields", { modalIn: ["noda"] })],
    cardinality: { min: 1, max: 1 }
  }
] as const satisfies readonly ProductionOpSlot[];

function benefactiveNodaTerminalRecord(
  id: string,
  sfpEffects: readonly ("ka" | null)[]
): ProductionRecord {
  return {
    id,
    shape: { root: "aux_layer", ops: BENEFACTIVE_NODA_CORE_SLOTS },
    conditions: {
      host: {
        sourceShapes: ["verb", "sahen_verbalization", "na_adjective"],
        projectionCategories: ["verbal_predicate", "adjectival_predicate"]
      },
      terminal: {
        kinds: [null],
        sfp: "required",
        sfpEffects,
        sfpEmphaticQuestion: false
      },
      clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
    },
    loweringKey: "benefactive_noda_terminal"
  };
}

const BENEFACTIVE_NODA_TERMINAL_FAMILY: ProductionFamily = {
  id: "benefactive_noda_terminal",
  legacyFallback: "retired",
  claimDomains: [
    BENEFACTIVE_NODA_DIRECT_CLAIM_DOMAIN,
    BENEFACTIVE_NODA_VOICE_CLAIM_DOMAIN,
    BENEFACTIVE_NODA_COPULA_STATE_CLAIM_DOMAIN
  ],
  claimDependencies: {
    terminal: [
      { kind: "terminal_membership", values: [null] },
      { kind: "sfp_presence" },
      { kind: "sfp_effect_membership", values: [null, "ka"] }
    ],
    host: {
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate", "adjectival_predicate"]
    },
    ops: [
      { kind: "aspect", fields: ["aspect"] },
      { kind: "modal", fields: ["modal"] },
      { kind: "copula", fields: ["variant", "polarity", "polite"] },
      { kind: "voice", fields: ["voice"] },
      { kind: "postverbAuxiliary", fields: ["auxiliary"] }
    ],
    sequence: {
      lengthThresholds: [2, 3, 4],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 },
        { kind: "absolute", index: 2 },
        { kind: "absolute", index: 3 }
      ]
    }
  },
  claim: BENEFACTIVE_NODA_TERMINAL_CLAIM,
  records: [
    benefactiveNodaTerminalRecord("benefactive_noda_terminal_statement", [null]),
    benefactiveNodaTerminalRecord("benefactive_noda_terminal_question", ["ka"])
  ],
  nonAdmission: "reject"
};

const REQUEST_TERMINAL_QUOTATIVE_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "request_terminal_quotative_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "quotative", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const DIRECT_REQUEST_TERMINAL_KA_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "direct_request_terminal_ka_core",
  root: "aux_layer",
  ops: [{ id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } }],
  terminal: { kinds: [null], sfp: "required", sfpEffects: ["ka"] }
};

const DIRECT_REQUEST_PROJECTION_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "direct_request_projection_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "request_projection", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const DIRECT_REQUEST_REPORTED_REQUEST_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
  id: "direct_request_reported_request_core",
  root: "aux_layer",
  ops: [
    { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
    { id: "reported_request", opKinds: ["connective"], cardinality: { min: 1, max: 1 } }
  ],
  terminal: { kinds: [null], sfp: "forbidden" }
};

const REQUEST_TERMINAL_QUOTATIVE_RECORD: ProductionRecord = {
  id: "request_terminal_quotative",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "request",
        role: "core",
        patterns: [productionOpPattern("aspect", "request_aspect", {})],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "quotative",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["to"],
          quotativeMoodIn: ["imperative"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["verb", "sahen_verbalization"],
      projectionCategories: ["verbal_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_terminal_quotative"
};

const DIRECT_REQUEST_TERMINAL_KA_RECORD: ProductionRecord = {
  id: "direct_request_terminal_ka",
  shape: {
    root: "aux_layer",
    ops: [{
      id: "request",
      role: "core",
      patterns: [productionOpPattern("aspect", "request_aspect", {})],
      cardinality: { min: 1, max: 1 }
    }]
  },
  conditions: {
    host: {
      sourceShapes: ["verb"],
      projectionCategories: ["verbal_predicate"]
    },
    terminal: { kinds: [null], sfp: "required", sfpEffects: ["ka"] },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_terminal_question"
};

const DIRECT_REQUEST_PROJECTION_RECORD: ProductionRecord = {
  id: "direct_request_projection",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "request",
        role: "core",
        patterns: [productionOpPattern("aspect", "request_aspect", {})],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "request_projection",
        role: "core",
        patterns: [
          productionOpPattern("connective", "connective_fields", {
            connectiveIn: ["wish_complement", "quoted_concessive"]
          }),
          productionOpPattern("connective", "connective_fields", {
            connectiveIn: ["request_complement"],
            surfaceAllomorphIn: ["to"]
          })
        ],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["verb", "sahen_verbalization"],
      projectionCategories: ["verbal_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_projection_connective"
};

const DIRECT_REQUEST_REPORTED_REQUEST_RECORD: ProductionRecord = {
  id: "direct_request_reported_request",
  shape: {
    root: "aux_layer",
    ops: [
      {
        id: "request",
        role: "core",
        patterns: [productionOpPattern("aspect", "request_aspect", {
          aspectIn: ["te_kudasai"]
        })],
        cardinality: { min: 1, max: 1 }
      },
      {
        id: "reported_request",
        role: "core",
        patterns: [productionOpPattern("connective", "connective_fields", {
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["other"],
          quotativeMoodIn: ["imperative"],
          quotativeClosureIn: ["reported_request"]
        })],
        cardinality: { min: 1, max: 1 }
      }
    ]
  },
  conditions: {
    host: {
      sourceShapes: ["verb", "sahen_verbalization"],
      projectionCategories: ["verbal_predicate"]
    },
    terminal: { kinds: [null], sfp: "forbidden" },
    clause: { intakeSites: REQUEST_TERMINAL_INTAKE_SITES }
  },
  loweringKey: "request_reported_terminal"
};

const REQUEST_TERMINAL_BOUNDARY_FAMILY: ProductionFamily = {
  id: "request_terminal_boundary",
  legacyFallback: "retired",
  claimDomains: [
    REQUEST_TERMINAL_QUOTATIVE_CLAIM_DOMAIN,
    DIRECT_REQUEST_TERMINAL_KA_CLAIM_DOMAIN,
    DIRECT_REQUEST_PROJECTION_CLAIM_DOMAIN,
    DIRECT_REQUEST_REPORTED_REQUEST_CLAIM_DOMAIN
  ],
  claimDependencies: {
    terminal: [
      { kind: "terminal_membership", values: [null] },
      { kind: "sfp_presence" },
      { kind: "sfp_effect_membership", values: ["ka"] }
    ],
    host: {
      sourcePredicateShape: true,
      projectionCategories: ["verbal_predicate"]
    },
    ops: [
      { kind: "aspect", fields: ["aspect"] },
      {
        kind: "connective",
        fields: ["connective", "allomorph", "quotativeMood", "quotativeClosure"]
      }
    ],
    sequence: {
      lengthThresholds: [1, 2],
      positions: [
        { kind: "absolute", index: 0 },
        { kind: "absolute", index: 1 }
      ],
      kindCounts: [
        { opKinds: ["aspect"], cap: 1 },
        { opKinds: ["connective"], cap: 1 }
      ]
    }
  },
  claim: REQUEST_TERMINAL_BOUNDARY_CLAIM,
  records: [
    REQUEST_TERMINAL_QUOTATIVE_RECORD,
    DIRECT_REQUEST_TERMINAL_KA_RECORD,
    DIRECT_REQUEST_PROJECTION_RECORD,
    DIRECT_REQUEST_REPORTED_REQUEST_RECORD
  ],
  nonAdmission: "reject"
};

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

const PLAIN_PREDICATE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const COPULA_SUFFIX_RANGE = {
  start: { kind: "absolute", index: 1 },
  end: { kind: "relative", offset: 0 }
} as const satisfies ProductionFamilyClaimSequenceAggregateDependency["range"];

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

const NOUN_COPULA_BARE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const NOMINAL_FOCUS_PREFIX_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const KEIJOUJI_BARE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const NOMINAL_EXPLICIT_NO_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const NOMINAL_BARE_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const PLAIN_PREDICATE_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

export const SEMANTIC_OPERATOR_OP_KINDS = [
  "modal",
  "idiom",
  "desire",
  "postverbAuxiliary"
] as const satisfies readonly AuxOpKind[];

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

const PLAIN_PREDICATE_SEMANTIC_OPERATOR_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const PLAIN_PREDICATE_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_SEMANTIC_OPERATOR_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const ATTRIBUTIVE_OPERATOR_CHAIN_OP_KINDS = [
  ...PLAIN_ATTRIBUTIVE_CORE_OP_KINDS,
  ...ATTRIBUTIVE_OPERATOR_CHAIN_SEMANTIC_OP_KINDS
] as const satisfies readonly AuxOpKind[];

const ATTRIBUTIVE_OPERATOR_CHAIN_OP_PATTERNS = [
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

const PLAIN_PREDICATE_OPERATOR_CHAIN_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_OPERATOR_CHAIN_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const COPULA_PROJECTION_ATTRIBUTIVE_FAMILY: ProductionFamily = {
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

const CLAUSE_CHAIN_BASIC_OP_KINDS = [
  "tense",
  "aspect",
  "voice",
  "negation",
  "polite"
] as const satisfies readonly AuxOpKind[];

const CLAUSE_CHAIN_BASIC_OP_PATTERNS = [
  { kind: "tense" },
  { kind: "aspect" },
  { kind: "voice" },
  { kind: "negation" },
  { kind: "polite" }
] as const satisfies readonly ProductionOpPattern[];

const CLAUSE_CONNECTIVE_SLOT_PATTERNS = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: [...CLAUSE_CONNECTIVE_KINDS]
  })
] as const satisfies readonly ProductionOpPattern[];

const CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY = {
  kind: "connective",
  fields: ["connective"]
} as const satisfies ProductionFamilyClaimOpDependency;

const basicOpKindsAggregate = (
  id: string,
  range?: ProductionFamilyClaimSequenceAggregateDependency["range"]
) => ({
  id,
  kind: "every_kind_in",
  opKinds: CLAUSE_CHAIN_BASIC_OP_KINDS,
  ...(range === undefined ? {} : { range })
}) as const satisfies ProductionFamilyClaimSequenceAggregateDependency;

const clauseConnectivePrefixRange = (start: number) => ({
  start: { kind: "absolute", index: start },
  end: { kind: "relative", offset: -1 }
}) as const satisfies ProductionFamilyClaimSequenceAggregateDependency["range"];

const CLAUSE_CHAIN_SEMANTIC_OP_KINDS = [
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

const CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS = [
  ...CLAUSE_CHAIN_BASIC_OP_KINDS,
  ...CLAUSE_CHAIN_SEMANTIC_OP_KINDS
] as const satisfies readonly AuxOpKind[];

const _clauseChainOpKindPartition: [AuxOpKind] extends [
  (typeof CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS)[number] | "copula" | "connective"
] ? true : never = true;
void _clauseChainOpKindPartition;

const CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS = [
  ...CLAUSE_CHAIN_BASIC_OP_PATTERNS,
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

const semanticClauseChainAggregates = (
  idPrefix: string,
  range?: ProductionFamilyClaimSequenceAggregateDependency["range"]
) => {
  const scope = range === undefined ? {} : { range };
  return [
    {
      id: `${idPrefix}_kinds`,
      kind: "every_kind_in",
      opKinds: CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS,
      ...scope
    },
    {
      id: `${idPrefix}_semantic_present`,
      kind: "some_kind",
      opKinds: CLAUSE_CHAIN_SEMANTIC_OP_KINDS,
      ...scope
    }
  ] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];
};

const CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS = [
  ...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS,
  "copula"
] as const satisfies readonly AuxOpKind[];

const CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS = [
  ...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS,
  { kind: "copula" }
] as const satisfies readonly ProductionOpPattern[];

const copulaProjectionChainAggregates = (
  idPrefix: string,
  ranges: {
    readonly chain?: ProductionFamilyClaimSequenceAggregateDependency["range"];
    readonly copula?: ProductionFamilyClaimSequenceAggregateDependency["range"];
    readonly copulaId?: string;
  } = {}
) => {
  const chainScope = ranges.chain === undefined ? {} : { range: ranges.chain };
  const copulaScope = ranges.copula === undefined ? {} : { range: ranges.copula };
  return [
    {
      id: `${idPrefix}_kinds`,
      kind: "every_kind_in",
      opKinds: CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS,
      ...chainScope
    },
    {
      id: `${idPrefix}_${ranges.copulaId ?? "copula_present"}`,
      kind: "some_kind",
      opKinds: ["copula"],
      ...copulaScope
    }
  ] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];
};

const VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS = {
  stemKinds: ["verb", "adj", "noun", "candidateSet"],
  sourceShapes: ["verb", "i_adjective", "sahen_verbalization"]
} as const satisfies ProductionRecord["conditions"]["host"];

const COPULA_CLAUSE_CHAIN_HOST_CONDITIONS = {
  stemKinds: ["noun", "adj", "verb", "candidateSet"],
  sourceShapes: ["na_adjective", "nominal", "particle_phrase", "lexical_adverb"]
} as const satisfies ProductionRecord["conditions"]["host"];


const ADVERBIAL_MODIFIER_HOST_CONDITIONS = {
  stemKinds: ["noun", "adj", "verb", "candidateSet", "adverb"],
  sourceShapes: ["na_adjective", "nominal", "particle_phrase", "lexical_adverb"]
} as const satisfies ProductionRecord["conditions"]["host"];

const I_ADJECTIVE_ADVERBIAL_MODIFIER_HOST_CONDITIONS = {
  stemKinds: ["adj", "verb", "candidateSet", "adverb"],
  sourceShapes: ["i_adjective"]
} as const satisfies ProductionRecord["conditions"]["host"];

const PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_HOST_CONDITIONS = {
  stemKinds: ["verb", "adj", "noun", "candidateSet"],
  sourceShapes: ["verb", "sahen_verbalization", "i_adjective", "na_adjective", "nominal"]
} as const satisfies ProductionRecord["conditions"]["host"];

const BARE_NOMINAL_CLAUSE_CHAIN_HOST_CONDITIONS = {
  stemKinds: ["noun", "adj", "verb", "candidateSet", "adverb"],
  sourceShapes: ["na_adjective", "nominal", "lexical_adverb"]
} as const satisfies ProductionRecord["conditions"]["host"];



const PLAIN_PREDICATE_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const PLAIN_PREDICATE_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
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

const PLAIN_PREDICATE_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const PLAIN_PREDICATE_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
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

const BARE_NOMINAL_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const BARE_NOMINAL_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const BARE_NOMINAL_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
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

const BARE_NOMINAL_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
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

const PREDICATE_COPULA_PROJECTION_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const PREDICATE_COPULA_PROJECTION_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
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

const NOMINAL_COPULA_PROJECTION_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const NOMINAL_COPULA_PROJECTION_RENYOU_CHUUSHI_FAMILY: ProductionFamily = {
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

const TERMINAL_CHAIN_BASIC_COPULA_OP_KINDS = [
  ...CLAUSE_CHAIN_BASIC_OP_KINDS,
  "copula"
] as const satisfies readonly AuxOpKind[];

const TERMINAL_CHAIN_BASIC_COPULA_OP_PATTERNS = [
  ...CLAUSE_CHAIN_BASIC_OP_PATTERNS,
  { kind: "copula" }
] as const satisfies readonly ProductionOpPattern[];

const terminalCopulaProjectionAggregates = (
  idPrefix: string,
  ranges: {
    readonly copula?: ProductionFamilyClaimSequenceAggregateDependency["range"];
    readonly copulaId?: string;
  } = {}
) => {
  const copulaScope = ranges.copula === undefined ? {} : { range: ranges.copula };
  return [
    {
      id: `${idPrefix}_kinds`,
      kind: "every_kind_in",
      opKinds: TERMINAL_CHAIN_BASIC_COPULA_OP_KINDS
    },
    {
      id: `${idPrefix}_${ranges.copulaId ?? "copula_present"}`,
      kind: "some_kind",
      opKinds: ["copula"],
      ...copulaScope
    }
  ] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];
};

const ADVERBIAL_MODIFIER_CLAIM_TERMINAL_DEPENDENCIES = [
  { kind: "terminal_membership", values: ["adverbial_modifier"] },
  { kind: "sfp_presence" }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

const TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES = [
  { kind: "terminal_membership", values: [null] },
  { kind: "sfp_presence" }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

const PLAIN_PREDICATE_TERMINAL_FAMILY: ProductionFamily = {
  id: "plain_predicate_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "plain_predicate_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: [basicOpKindsAggregate("plain_predicate_terminal_basic_kinds")],
        familyClaimRefs: [
          { familyId: "quotative_insistent_terminal", polarity: "excludes" },
          { familyId: "request_terminal_boundary", polarity: "excludes" },
          { familyId: "source_verbal_adjectival_desiderative", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_TERMINAL_CLAIM,
  records: [
    {
      id: "plain_predicate_terminal",
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
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

const NOUN_COPULA_TERMINAL_FAMILY: ProductionFamily = {
  id: "noun_copula_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "noun_copula_terminal",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: [
          basicOpKindsAggregate("noun_copula_terminal_basic_kinds", COPULA_SUFFIX_RANGE)
        ],
        familyClaimRefs: [
          { familyId: "copular_te_hoshii", polarity: "excludes" },
          { familyId: "copular_benefactive_request", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_TERMINAL_CLAIM,
  records: [
    {
      id: "noun_copula_terminal",
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
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

const NOUN_COPULA_ADVERBIAL_MODIFIER_FAMILY: ProductionFamily = {
  id: "noun_copula_adverbial_modifier",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "noun_copula_adverbial_modifier",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 0, max: 1 } },
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [0],
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: [
          basicOpKindsAggregate("noun_copula_adverbial_modifier_basic_kinds", COPULA_SUFFIX_RANGE)
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      ADVERBIAL_MODIFIER_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_ADVERBIAL_MODIFIER_CLAIM,
  records: [
    {
      id: "noun_copula_adverbial_modifier",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [{ kind: "copula" }],
            cardinality: { min: 0, max: 1 }
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
        host: ADVERBIAL_MODIFIER_HOST_CONDITIONS,
        terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
      },
      loweringKey: "adverbial_modifier_render"
    },
    {
      id: "i_adjective_adverbial_modifier",
      shape: { root: "aux_layer", ops: [] },
      conditions: {
        host: I_ADJECTIVE_ADVERBIAL_MODIFIER_HOST_CONDITIONS,
        terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
      },
      loweringKey: "adverbial_modifier_render"
    }
  ],
  nonAdmission: "reject"
};

const PREDICATE_APPEARANCE_PREFIX_OP_PATTERNS = [
  ...CLAUSE_CHAIN_BASIC_OP_PATTERNS,
  { kind: "predicateSuffix" }
] as const satisfies readonly ProductionOpPattern[];

const PREDICATE_APPEARANCE_PREFIX_OP_KINDS: readonly AuxOpKind[] =
  PREDICATE_APPEARANCE_PREFIX_OP_PATTERNS.map((pattern) => pattern.kind);

const PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_FAMILY: ProductionFamily = {
  id: "predicate_appearance_adverbial_modifier",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "predicate_appearance_adverbial_modifier",
      root: "aux_layer",
      ops: [
        {
          id: "prefix",
          opKinds: [...PREDICATE_APPEARANCE_PREFIX_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        { id: "appearance", opKinds: ["modal"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: [
          {
            id: "predicate_appearance_adverbial_modifier_prefix_kinds",
            kind: "every_kind_in",
            opKinds: PREDICATE_APPEARANCE_PREFIX_OP_KINDS,
            range: clauseConnectivePrefixRange(0)
          }
        ]
      },
      [
        {
          kind: "modal",
          fields: ["modal", "reading", "polite", "past", "inner"]
        }
      ],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      ADVERBIAL_MODIFIER_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_CLAIM,
  records: [
    {
      id: "predicate_appearance_adverbial_modifier",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "prefix",
            role: "core",
            patterns: PREDICATE_APPEARANCE_PREFIX_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "appearance",
            role: "core",
            patterns: [productionOpPattern("modal", "souda_hearsay_modal_fields", {
              readingIn: ["yotai"],
              inner: "absent"
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_HOST_CONDITIONS,
        terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
      },
      loweringKey: "adverbial_modifier_render"
    }
  ],
  nonAdmission: "reject"
};

const PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_HOST_CONDITIONS = {
  stemKinds: ["verb", "candidateSet"],
  sourceShapes: ["verb", "sahen_verbalization"]
} as const satisfies ProductionRecord["conditions"]["host"];

const PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_FAMILY: ProductionFamily = {
  id: "predicate_projection_carrier_adverbial_modifier",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
  },
  claimDomains: [
    {
      id: "predicate_projection_carrier_adverbial_modifier",
      root: "aux_layer",
      ops: [
        {
          id: "prefix",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        },
        { id: "carrier", opKinds: ["predicateProjectionCarrier"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "relative", offset: -1 }],
        aggregates: [
          {
            id: "predicate_projection_carrier_adverbial_modifier_prefix_kinds",
            kind: "every_kind_in",
            opKinds: CLAUSE_CHAIN_BASIC_OP_KINDS,
            range: clauseConnectivePrefixRange(0)
          }
        ]
      },
      [
        {
          kind: "predicateProjectionCarrier",
          fields: ["carrier"]
        }
      ],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      ADVERBIAL_MODIFIER_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_CLAIM,
  records: [
    {
      id: "predicate_projection_carrier_adverbial_modifier",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "prefix",
            role: "core",
            patterns: CLAUSE_CHAIN_BASIC_OP_PATTERNS,
            cardinality: { min: 0, max: null }
          },
          {
            id: "carrier",
            role: "core",
            patterns: [productionOpPattern("predicateProjectionCarrier", "predicate_projection_carrier_fields", {
              carrierIn: ["imminent_nbakari"]
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_HOST_CONDITIONS,
        terminal: { kinds: ["adverbial_modifier"], sfp: "any" }
      },
      loweringKey: "adverbial_modifier_render"
    }
  ],
  nonAdmission: "reject"
};

const BARE_NOMINAL_TERMINAL_FAMILY: ProductionFamily = {
  id: "bare_nominal_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "bare_nominal_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "basic",
          opKinds: [...CLAUSE_CHAIN_BASIC_OP_KINDS],
          cardinality: { min: 0, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: [basicOpKindsAggregate("bare_nominal_terminal_basic_kinds")],
        familyClaimRefs: [
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: BARE_NOMINAL_TERMINAL_CLAIM,
  records: [
    {
      id: "bare_nominal_terminal",
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
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

const PREDICATE_COPULA_PROJECTION_TERMINAL_FAMILY: ProductionFamily = {
  id: "predicate_copula_projection_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "predicate_copula_projection_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...TERMINAL_CHAIN_BASIC_COPULA_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: terminalCopulaProjectionAggregates(
          "predicate_copula_projection_terminal"
        ),
        familyClaimRefs: [
          { familyId: "predicate_copula_negative_confirm", polarity: "excludes" },
          { familyId: "predicate_copula_progressive_confirm", polarity: "excludes" },
          { familyId: "volitional_negative_invite", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_COPULA_PROJECTION_TERMINAL_CLAIM,
  records: [
    {
      id: "predicate_copula_projection_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: TERMINAL_CHAIN_BASIC_COPULA_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

const NOMINAL_COPULA_PROJECTION_TERMINAL_FAMILY: ProductionFamily = {
  id: "nominal_copula_projection_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "nominal_copula_projection_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...TERMINAL_CHAIN_BASIC_COPULA_OP_KINDS],
          cardinality: { min: 2, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: terminalCopulaProjectionAggregates(
          "nominal_copula_projection_terminal",
          { copula: COPULA_SUFFIX_RANGE, copulaId: "suffix_copula_present" }
        ),
        familyClaimRefs: [
          { familyId: "predicate_copula_progressive_confirm", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOMINAL_COPULA_PROJECTION_TERMINAL_CLAIM,
  records: [
    {
      id: "nominal_copula_projection_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: TERMINAL_CHAIN_BASIC_COPULA_OP_PATTERNS,
            cardinality: { min: 2, max: null }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

const IMPERATIVE_TERMINAL_CONDITIONS = {
  kinds: ["imperative"],
  sfp: "any"
} as const satisfies NonNullable<ProductionFamily["conditions"]>["terminal"];

const IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES = [
  { kind: "terminal_membership", values: ["imperative"] },
  { kind: "sfp_presence" }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

const IMPERATIVE_HOST_CONDITIONS = {
  stemKinds: [...IMPERATIVE_HOST_STEM_KINDS],
  sourceShapes: [...IMPERATIVE_HOST_SOURCE_SHAPES]
} as const satisfies ProductionRecord["conditions"]["host"];

const IMPERATIVE_COPULA_LANE_HOST_CONDITIONS = {
  stemKinds: [...IMPERATIVE_COPULA_LANE_STEM_KINDS],
  sourceShapes: [...IMPERATIVE_COPULA_LANE_SOURCE_SHAPES]
} as const satisfies ProductionRecord["conditions"]["host"];

const IMPERATIVE_COPULA_CLAIM_DEPENDENCY = {
  kind: "copula",
  fields: ["variant", "polarity", "polite"]
} as const satisfies ProductionFamilyClaimOpDependency;

const PLAIN_PREDICATE_IMPERATIVE_TERMINAL_FAMILY: ProductionFamily = {
  id: "plain_predicate_imperative_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: IMPERATIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "plain_predicate_imperative_terminal",
      root: "aux_layer",
      ops: [],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [0],
        familyClaimRefs: [
          { familyId: "quotative_insistent_terminal", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_IMPERATIVE_TERMINAL_CLAIM,
  records: [
    {
      id: "plain_predicate_imperative_terminal",
      shape: { root: "aux_layer", ops: [] },
      conditions: {
        host: IMPERATIVE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    }
  ],
  nonAdmission: "reject"
};

const PLAIN_PREDICATE_OPERATOR_CHAIN_IMPERATIVE_TERMINAL_FAMILY: ProductionFamily = {
  id: "plain_predicate_operator_chain_imperative_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: IMPERATIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "plain_predicate_operator_chain_imperative_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...IMPERATIVE_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [0, 1],
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: [
          {
            id: "plain_operator_chain_imperative_kinds",
            kind: "every_kind_in",
            opKinds: [...IMPERATIVE_CHAIN_OP_KINDS]
          },
          {
            id: "plain_operator_chain_imperative_chainable_aspect",
            kind: "every_filtered_pattern",
            pattern: productionOpPattern("aspect", "chainable_aspect", {}),
            requireAtLeastOne: false
          },
          {
            id: "plain_operator_chain_imperative_head_present",
            kind: "some_kind",
            opKinds: [...IMPERATIVE_CHAIN_HEAD_OP_KINDS]
          }
        ]
      },
      [ASPECT_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_OPERATOR_CHAIN_IMPERATIVE_TERMINAL_CLAIM,
  records: [
    {
      id: "plain_predicate_operator_chain_imperative_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: IMPERATIVE_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    }
  ],
  nonAdmission: "reject"
};

const COPULA_IMPERATIVE_TERMINAL_FAMILY: ProductionFamily = {
  id: "copula_imperative_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: IMPERATIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "copula_imperative_terminal",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [1],
        positions: [{ kind: "absolute", index: 0 }]
      },
      [IMPERATIVE_COPULA_CLAIM_DEPENDENCY],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: COPULA_IMPERATIVE_TERMINAL_CLAIM,
  records: [
    {
      id: "copula_imperative_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [productionOpPattern("copula", "copula_fields", {
              variantIn: ["basic"],
              polarityIn: ["affirmative"],
              politeIn: [false]
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_COPULA_LANE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    }
  ],
  nonAdmission: "reject"
};

const NOUN_COPULA_STATE_CHANGE_IMPERATIVE_TERMINAL_FAMILY: ProductionFamily = {
  id: "noun_copula_state_change_imperative_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: IMPERATIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "noun_copula_state_change_imperative_terminal",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "state_change",
          opKinds: ["postverbAuxiliary"],
          cardinality: { min: 1, max: 1 }
        }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
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
        IMPERATIVE_COPULA_CLAIM_DEPENDENCY,
        { kind: "postverbAuxiliary", fields: ["auxiliary"] }
      ],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_STATE_CHANGE_IMPERATIVE_TERMINAL_CLAIM,
  records: [
    {
      id: "noun_copula_state_change_imperative_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [productionOpPattern("copula", "copula_fields", {
              variantIn: ["basic"],
              polarityIn: ["affirmative"],
              politeIn: [false]
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "state_change",
            role: "core",
            patterns: [productionOpPattern("postverbAuxiliary", "postverb_auxiliary_fields", {
              auxiliaryKindIn: [...IMPERATIVE_STATE_CHANGE_AUX_KINDS]
            })],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_COPULA_LANE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    }
  ],
  nonAdmission: "reject"
};

const IMPERATIVE_NEGATION_COMPLEMENT_TERMINAL_DEPENDENCIES = [
  ...IMPERATIVE_CLAIM_TERMINAL_DEPENDENCIES,
  { kind: "sfp_effect_membership", values: ["quotative_command"] }
] as const satisfies ProductionFamilyClaimDependencies["terminal"];

const IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_PATTERN = productionOpPattern(
  "negation",
  "negation_fields",
  IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_ARGS
);

const IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_PATTERN = productionOpPattern(
  "postverbAuxiliary",
  "postverb_auxiliary_fields",
  { auxiliaryKindIn: [...IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_AUX_KINDS] }
);

const IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_HOST_CONDITIONS = {
  stemKinds: [...IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_STEM_KINDS],
  sourceShapes: [...IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_SOURCE_SHAPES]
} as const satisfies ProductionRecord["conditions"]["host"];

const PREDICATE_NEGATION_COMPLEMENT_IMPERATIVE_TERMINAL_FAMILY: ProductionFamily = {
  id: "predicate_negation_complement_imperative_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: IMPERATIVE_TERMINAL_CONDITIONS
  },
  claimDomains: [
    {
      id: "predicate_negation_complement_scope_control_imperative",
      root: "aux_layer",
      ops: [
        { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
        { id: "carrier", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    },
    {
      id: "predicate_negation_complement_polite_request_imperative",
      root: "aux_layer",
      ops: [
        { id: "voice", opKinds: ["voice"], cardinality: { min: 0, max: null } },
        { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
        { id: "request", opKinds: ["aspect"], cardinality: { min: 1, max: 1 } },
        { id: "polite", opKinds: ["polite"], cardinality: { min: 1, max: null } }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    },
    {
      id: "predicate_negation_complement_noun_copula_imperative",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        { id: "state_change", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } },
        { id: "negation", opKinds: ["negation"], cardinality: { min: 1, max: 1 } },
        { id: "carrier", opKinds: ["postverbAuxiliary"], cardinality: { min: 1, max: 1 } }
      ],
      terminal: IMPERATIVE_TERMINAL_CONDITIONS
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        lengthThresholds: [2, 4],
        positions: [
          { kind: "absolute", index: 0 },
          { kind: "absolute", index: 1 },
          { kind: "absolute", index: 2 },
          { kind: "absolute", index: 3 },
          { kind: "first_of_kinds", opKinds: ["negation"], offsets: [0, 1] }
        ],
        aggregates: [
          {
            id: "imperative_negation_complement_voice_prefix",
            kind: "every_kind_in",
            opKinds: ["voice"],
            range: {
              start: { kind: "absolute", index: 0 },
              end: { kind: "first_of_kinds", opKinds: ["negation"], offset: 0 }
            }
          },
          {
            id: "imperative_negation_complement_polite_suffix",
            kind: "every_kind_in",
            opKinds: ["polite"],
            range: {
              start: { kind: "first_of_kinds", opKinds: ["negation"], offset: 2 },
              end: { kind: "relative", offset: 0 }
            }
          }
        ],
        kindCounts: [
          { opKinds: ["negation"], cap: 2 },
          { opKinds: ["polite"], cap: 1 }
        ]
      },
      [
        IMPERATIVE_COPULA_CLAIM_DEPENDENCY,
        { kind: "postverbAuxiliary", fields: ["auxiliary"] },
        { kind: "negation", fields: ["chainDepth", "chainPast"] },
        ASPECT_CLAIM_DEPENDENCY
      ],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      IMPERATIVE_NEGATION_COMPLEMENT_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_NEGATION_COMPLEMENT_IMPERATIVE_TERMINAL_CLAIM,
  records: [
    {
      id: "predicate_negation_complement_scope_control_imperative",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "negation",
            role: "core",
            patterns: [IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_PATTERN],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "carrier",
            role: "core",
            patterns: [IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_PATTERN],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    },
    {
      id: "predicate_negation_complement_polite_request_imperative",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "voice",
            role: "core",
            patterns: [{ kind: "voice" }],
            cardinality: { min: 0, max: null }
          },
          {
            id: "negation",
            role: "core",
            patterns: [IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_PATTERN],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "request",
            role: "core",
            patterns: [productionOpPattern("aspect", "benefactive_aspect", {
              aspectIn: ["te_kudasaru"]
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "polite",
            role: "core",
            patterns: [{ kind: "polite" }],
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    },
    {
      id: "predicate_negation_complement_noun_copula_imperative",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [productionOpPattern("copula", "copula_fields", {
              variantIn: ["basic"],
              polarityIn: ["affirmative"],
              politeIn: [false]
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "state_change",
            role: "core",
            patterns: [productionOpPattern("postverbAuxiliary", "postverb_auxiliary_fields", {
              auxiliaryKindIn: [...IMPERATIVE_STATE_CHANGE_AUX_KINDS]
            })],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "negation",
            role: "core",
            patterns: [IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_PATTERN],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "carrier",
            role: "core",
            patterns: [IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_PATTERN],
            cardinality: { min: 1, max: 1 }
          }
        ]
      },
      conditions: {
        host: IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_HOST_CONDITIONS,
        terminal: IMPERATIVE_TERMINAL_CONDITIONS
      },
      loweringKey: "imperative_render"
    }
  ],
  nonAdmission: "reject"
};

const COPULA_HOST_SEMANTIC_OP_KINDS = [
  "modal",
  "desire",
  "idiom",
  "postverbAuxiliary",
  "scopeBridge",
  "conjecture",
  "predicateQuoteCarrier",
  "predicateProjectionCarrier"
] as const satisfies readonly AuxOpKind[];

const _copulaHostSemanticOpSubset: readonly (
  (typeof CLAUSE_CHAIN_SEMANTIC_OP_KINDS)[number]
)[] = COPULA_HOST_SEMANTIC_OP_KINDS;
void _copulaHostSemanticOpSubset;

const COPULA_HOST_COPULA_PATTERN: ProductionOpPattern = productionOpPattern(
  "copula",
  "copula_fields",
  { variantIn: ["basic", "conjecture"] }
);

const COPULA_HOST_SEMANTIC_CHAIN_OP_KINDS = [
  ...CLAUSE_CHAIN_BASIC_OP_KINDS,
  ...COPULA_HOST_SEMANTIC_OP_KINDS
] as const satisfies readonly AuxOpKind[];

const COPULA_HOST_SEMANTIC_CHAIN_OP_PATTERNS = [
  ...CLAUSE_CHAIN_BASIC_OP_PATTERNS,
  { kind: "modal" },
  { kind: "desire" },
  { kind: "idiom" },
  { kind: "postverbAuxiliary" },
  { kind: "scopeBridge" },
  { kind: "conjecture" },
  { kind: "predicateQuoteCarrier" },
  { kind: "predicateProjectionCarrier" }
] as const satisfies readonly ProductionOpPattern[];

const COPULA_HOST_PROJECTION_OP_KINDS = [
  ...COPULA_HOST_SEMANTIC_CHAIN_OP_KINDS,
  "copula"
] as const satisfies readonly AuxOpKind[];

const COPULA_HOST_PROJECTION_OP_PATTERNS = [
  ...COPULA_HOST_SEMANTIC_CHAIN_OP_PATTERNS,
  COPULA_HOST_COPULA_PATTERN
] as const satisfies readonly ProductionOpPattern[];

const copulaHostPayloadAggregates = (
  idPrefix: string
): readonly ProductionFamilyClaimSequenceAggregateDependency[] => [
  {
    id: `${idPrefix}_copula_variant`,
    kind: "every_filtered_pattern",
    pattern: COPULA_HOST_COPULA_PATTERN,
    requireAtLeastOne: false
  }
];

const copulaHostSemanticAggregates = (
  idPrefix: string,
  range?: ProductionFamilyClaimSequenceAggregateDependency["range"]
): readonly ProductionFamilyClaimSequenceAggregateDependency[] => {
  const scope = range === undefined ? {} : { range };
  return [
    {
      id: `${idPrefix}_kinds`,
      kind: "every_kind_in",
      opKinds: COPULA_HOST_SEMANTIC_CHAIN_OP_KINDS,
      ...scope
    },
    {
      id: `${idPrefix}_semantic_present`,
      kind: "some_kind",
      opKinds: COPULA_HOST_SEMANTIC_OP_KINDS,
      ...scope
    },
    ...copulaHostPayloadAggregates(idPrefix)
  ];
};

const copulaHostProjectionAggregates = (
  idPrefix: string,
  copulaRange: NonNullable<ProductionFamilyClaimSequenceAggregateDependency["range"]>,
  copulaId: string
): readonly ProductionFamilyClaimSequenceAggregateDependency[] => [
  {
    id: `${idPrefix}_kinds`,
    kind: "every_kind_in",
    opKinds: COPULA_HOST_PROJECTION_OP_KINDS
  },
  {
    id: `${idPrefix}_${copulaId}`,
    kind: "some_kind",
    opKinds: ["copula"],
    range: copulaRange
  },
  {
    id: `${idPrefix}_semantic_present`,
    kind: "some_kind",
    opKinds: COPULA_HOST_SEMANTIC_OP_KINDS
  },
  ...copulaHostPayloadAggregates(idPrefix)
];

const COPULA_HOST_CLAIM_OP_DEPENDENCIES = [
  { kind: "copula", fields: ["variant"] }
] as const satisfies readonly ProductionFamilyClaimOpDependency[];

const NOMINAL_COPULA_PROJECTION_SEMANTIC_HOST_CONDITIONS = {
  stemKinds: ["adj", "verb", "candidateSet"],
  sourceShapes: ["na_adjective", "nominal", "particle_phrase", "lexical_adverb"]
} as const satisfies ProductionRecord["conditions"]["host"];

const terminalCopulaProjectionSemanticAggregates = (
  idPrefix: string,
  ranges: {
    readonly copula?: ProductionFamilyClaimSequenceAggregateDependency["range"];
    readonly copulaId?: string;
  } = {}
) => [
  ...copulaProjectionChainAggregates(idPrefix, ranges),
  {
    id: `${idPrefix}_semantic_present`,
    kind: "some_kind",
    opKinds: CLAUSE_CHAIN_SEMANTIC_OP_KINDS
  }
] as const satisfies readonly ProductionFamilyClaimSequenceAggregateDependency[];

const PLAIN_PREDICATE_SEMANTIC_OPERATOR_TERMINAL_FAMILY: ProductionFamily = {
  id: "plain_predicate_semantic_operator_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "plain_predicate_semantic_operator_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: semanticClauseChainAggregates("plain_semantic_terminal"),
        familyClaimRefs: [
          { familyId: "benefactive_noda_terminal", polarity: "excludes" },
          { familyId: "predicate_copula_negative_confirm", polarity: "excludes" },
          { familyId: "reinforced_potential_composition", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PLAIN_PREDICATE_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  records: [
    {
      id: "plain_predicate_semantic_operator_terminal",
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
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

const NOUN_COPULA_SEMANTIC_OPERATOR_TERMINAL_FAMILY: ProductionFamily = {
  id: "noun_copula_semantic_operator_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "noun_copula_semantic_operator_terminal",
      root: "aux_layer",
      ops: [
        { id: "copula", opKinds: ["copula"], cardinality: { min: 1, max: 1 } },
        {
          id: "chain",
          opKinds: [...COPULA_HOST_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        positions: [{ kind: "absolute", index: 0 }],
        aggregates: copulaHostSemanticAggregates(
          "noun_copula_semantic_terminal",
          COPULA_SUFFIX_RANGE
        ),
        familyClaimRefs: [
          { familyId: "benefactive_noda_terminal", polarity: "excludes" },
          { familyId: "noun_copula_desire", polarity: "excludes" },
          { familyId: "noun_copula_forbidden", polarity: "excludes" },
          { familyId: "noun_copula_permission", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      COPULA_HOST_CLAIM_OP_DEPENDENCIES,
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOUN_COPULA_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  records: [
    {
      id: "noun_copula_semantic_operator_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "copula",
            role: "core",
            patterns: [COPULA_HOST_COPULA_PATTERN],
            cardinality: { min: 1, max: 1 }
          },
          {
            id: "chain",
            role: "core",
            patterns: COPULA_HOST_SEMANTIC_CHAIN_OP_PATTERNS,
            cardinality: { min: 1, max: null }
          }
        ]
      },
      conditions: {
        host: COPULA_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

const BARE_NOMINAL_SEMANTIC_OPERATOR_TERMINAL_FAMILY: ProductionFamily = {
  id: "bare_nominal_semantic_operator_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "bare_nominal_semantic_operator_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS],
          cardinality: { min: 1, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: semanticClauseChainAggregates("bare_nominal_semantic_terminal"),
        familyClaimRefs: [
          { familyId: "benefactive_noda_terminal", polarity: "excludes" },
          { familyId: "copular_te_hoshii", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: BARE_NOMINAL_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  records: [
    {
      id: "bare_nominal_semantic_operator_terminal",
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
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

const PREDICATE_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_FAMILY: ProductionFamily = {
  id: "predicate_copula_projection_semantic_operator_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "predicate_copula_projection_semantic_operator_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS],
          cardinality: { min: 2, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: terminalCopulaProjectionSemanticAggregates(
          "predicate_copula_projection_semantic_terminal"
        ),
        familyClaimRefs: [
          { familyId: "benefactive_noda_terminal", polarity: "excludes" },
          { familyId: "predicate_copula_negative_confirm", polarity: "excludes" },
          { familyId: "predicate_copula_progressive_confirm", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      [],
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: PREDICATE_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  records: [
    {
      id: "predicate_copula_projection_semantic_operator_terminal",
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
        host: VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

const NOMINAL_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_FAMILY: ProductionFamily = {
  id: "nominal_copula_projection_semantic_operator_terminal",
  legacyFallback: "retired",
  conditions: {
    terminal: { kinds: [null], sfp: "any" }
  },
  claimDomains: [
    {
      id: "nominal_copula_projection_semantic_operator_terminal",
      root: "aux_layer",
      ops: [
        {
          id: "chain",
          opKinds: [...COPULA_HOST_PROJECTION_OP_KINDS],
          cardinality: { min: 2, max: null }
        }
      ],
      terminal: { kinds: [null], sfp: "any" }
    }
  ],
  claimDependencies: {
    ...claimDependencies(
      {
        aggregates: copulaHostProjectionAggregates(
          "nominal_copula_projection_semantic_terminal",
          COPULA_SUFFIX_RANGE,
          "suffix_copula_present"
        ),
        familyClaimRefs: [
          { familyId: "predicate_copula_progressive_confirm", polarity: "excludes" },
          { familyId: "request_on_composed_predicate_base", polarity: "excludes" }
        ]
      },
      COPULA_HOST_CLAIM_OP_DEPENDENCIES,
      {
        stemKind: true,
        sourcePredicateShape: true
      },
      TERMINAL_CHAIN_CLAIM_TERMINAL_DEPENDENCIES
    ),
    root: { quoteBinding: true }
  },
  claim: NOMINAL_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_CLAIM,
  records: [
    {
      id: "nominal_copula_projection_semantic_operator_terminal",
      shape: {
        root: "aux_layer",
        ops: [
          {
            id: "chain",
            role: "core",
            patterns: COPULA_HOST_PROJECTION_OP_PATTERNS,
            cardinality: { min: 2, max: null }
          }
        ]
      },
      conditions: {
        host: NOMINAL_COPULA_PROJECTION_SEMANTIC_HOST_CONDITIONS,
        terminal: { kinds: [null], sfp: "any" }
      },
      loweringKey: "terminal_render"
    }
  ],
  nonAdmission: "reject"
};

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

const PLAIN_PREDICATE_NOMINALIZED_FAMILY: ProductionFamily = {
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

const NOUN_COPULA_NOMINALIZED_FAMILY: ProductionFamily = {
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

const BARE_NOMINAL_NOMINALIZED_FAMILY: ProductionFamily = {
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

const PREDICATE_COPULA_PROJECTION_NOMINALIZED_FAMILY: ProductionFamily = {
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

const NOMINAL_COPULA_PROJECTION_NOMINALIZED_FAMILY: ProductionFamily = {
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

const PROJECTION_SUBORDINATION_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const DERIVED_MARKER_SUBORDINATION_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const COMPLEMENT_INCORPORATION_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

const QUOTATIVE_DERIVED_MARKER_CLAUSE_CONNECTIVE_FAMILY: ProductionFamily = {
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

export const PRODUCTION_REGISTRY = defineProductionRegistry([
  QUOTE_MID_CHAIN_FAMILY,
  COPULA_REASON_QUOTE_CARRIER_FAMILY,
  VERBAL_REASON_QUOTE_CARRIER_FAMILY,
  ATTRIBUTIVE_INTERNAL_TE_FAMILY,
  CARRIER_INTERNAL_CONNECTIVE_FAMILY,
  CONDITIONAL_QUOTE_CARRIER_FAMILY,
  CONDITIONAL_QUOTE_ELLIPSIS_FAMILY,
  ADVERSATIVE_QUOTE_CARRIER_FAMILY,
  EXEMPLIFICATION_MID_CHAIN_FAMILY,
  REASON_COPULA_CONDITIONAL_FAMILY,
  SEQUENCE_AFTER_COPULA_FAMILY,
  EMBEDDED_QUESTION_MID_CHAIN_FAMILY,
  COPULAR_TE_HOSHII_FAMILY,
  COPULAR_BENEFACTIVE_REQUEST_FAMILY,
  NOUN_COPULA_DESIRE_FAMILY,
  NOUN_COPULA_PERMISSION_FAMILY,
  NOUN_COPULA_FORBIDDEN_FAMILY,
  NOUN_COPULA_NEGATIVE_LIKENESS_FAMILY,
  NOUN_COPULA_REPORTED_ATTRIBUTIVE_FAMILY,
  NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_FAMILY,
  PREDICATE_COPULA_NEGATIVE_CONFIRM_FAMILY,
  PREDICATE_COPULA_PROGRESSIVE_CONFIRM_FAMILY,
  VOLITIONAL_NEGATIVE_INVITE_FAMILY,
  VOLITIONAL_QUESTION_QUOTATIVE_FAMILY,
  VOLITIONAL_REFORMULATION_QUESTION_FAMILY,
  PREDICATE_QUOTE_TTE_NOMINALIZED_FAMILY,
  ACCUSTOMED_PAST_ATTRIBUTIVE_FAMILY,
  ADVERBIAL_CHANGE_ATTRIBUTIVE_FAMILY,
  PLAIN_PREDICATE_ATTRIBUTIVE_FAMILY,
  NOUN_COPULA_BARE_ATTRIBUTIVE_FAMILY,
  NOMINAL_FOCUS_PREFIX_ATTRIBUTIVE_FAMILY,
  KEIJOUJI_BARE_ATTRIBUTIVE_FAMILY,
  NOMINAL_EXPLICIT_NO_ATTRIBUTIVE_FAMILY,
  NOMINAL_BARE_ATTRIBUTIVE_FAMILY,
  PLAIN_PREDICATE_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY,
  NOUN_COPULA_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY,
  PLAIN_PREDICATE_SEMANTIC_OPERATOR_ATTRIBUTIVE_FAMILY,
  PLAIN_PREDICATE_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY,
  NOUN_COPULA_SEMANTIC_OPERATOR_ATTRIBUTIVE_FAMILY,
  NOUN_COPULA_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_FAMILY,
  PLAIN_PREDICATE_OPERATOR_CHAIN_ATTRIBUTIVE_FAMILY,
  NOUN_COPULA_OPERATOR_CHAIN_ATTRIBUTIVE_FAMILY,
  COPULA_PROJECTION_ATTRIBUTIVE_FAMILY,
  PLAIN_PREDICATE_CLAUSE_CONNECTIVE_FAMILY,
  NOUN_COPULA_CLAUSE_CONNECTIVE_FAMILY,
  PLAIN_PREDICATE_RENYOU_CHUUSHI_FAMILY,
  NOUN_COPULA_RENYOU_CHUUSHI_FAMILY,
  PLAIN_PREDICATE_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_FAMILY,
  NOUN_COPULA_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_FAMILY,
  PLAIN_PREDICATE_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_FAMILY,
  NOUN_COPULA_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_FAMILY,
  BARE_NOMINAL_CLAUSE_CONNECTIVE_FAMILY,
  BARE_NOMINAL_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_FAMILY,
  BARE_NOMINAL_RENYOU_CHUUSHI_FAMILY,
  BARE_NOMINAL_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_FAMILY,
  PREDICATE_COPULA_PROJECTION_CLAUSE_CONNECTIVE_FAMILY,
  PREDICATE_COPULA_PROJECTION_RENYOU_CHUUSHI_FAMILY,
  NOMINAL_COPULA_PROJECTION_CLAUSE_CONNECTIVE_FAMILY,
  NOMINAL_COPULA_PROJECTION_RENYOU_CHUUSHI_FAMILY,
  PLAIN_PREDICATE_TERMINAL_FAMILY,
  NOUN_COPULA_TERMINAL_FAMILY,
  NOUN_COPULA_ADVERBIAL_MODIFIER_FAMILY,
  PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_FAMILY,
  PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_FAMILY,
  BARE_NOMINAL_TERMINAL_FAMILY,
  PREDICATE_COPULA_PROJECTION_TERMINAL_FAMILY,
  NOMINAL_COPULA_PROJECTION_TERMINAL_FAMILY,
  PLAIN_PREDICATE_IMPERATIVE_TERMINAL_FAMILY,
  PLAIN_PREDICATE_OPERATOR_CHAIN_IMPERATIVE_TERMINAL_FAMILY,
  COPULA_IMPERATIVE_TERMINAL_FAMILY,
  NOUN_COPULA_STATE_CHANGE_IMPERATIVE_TERMINAL_FAMILY,
  PREDICATE_NEGATION_COMPLEMENT_IMPERATIVE_TERMINAL_FAMILY,
  PLAIN_PREDICATE_SEMANTIC_OPERATOR_TERMINAL_FAMILY,
  NOUN_COPULA_SEMANTIC_OPERATOR_TERMINAL_FAMILY,
  BARE_NOMINAL_SEMANTIC_OPERATOR_TERMINAL_FAMILY,
  PREDICATE_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_FAMILY,
  NOMINAL_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_FAMILY,
  PLAIN_PREDICATE_NOMINALIZED_FAMILY,
  NOUN_COPULA_NOMINALIZED_FAMILY,
  BARE_NOMINAL_NOMINALIZED_FAMILY,
  PREDICATE_COPULA_PROJECTION_NOMINALIZED_FAMILY,
  NOMINAL_COPULA_PROJECTION_NOMINALIZED_FAMILY,
  PROJECTION_SUBORDINATION_CLAUSE_CONNECTIVE_FAMILY,
  DERIVED_MARKER_SUBORDINATION_CLAUSE_CONNECTIVE_FAMILY,
  COMPLEMENT_INCORPORATION_CLAUSE_CONNECTIVE_FAMILY,
  QUOTATIVE_DERIVED_MARKER_CLAUSE_CONNECTIVE_FAMILY,
  ZUNI_SUMU_QUOTE_TTE_FAMILY,
  SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_FAMILY,
  VOLITIONAL_RETROSPECTIVE_QUOTATIVE_FAMILY,
  CONJECTURAL_QUOTATIVE_FAMILY,
  QUOTATIVE_INSISTENT_TERMINAL_FAMILY,
  PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_FAMILY,
  REINFORCED_POTENTIAL_COMPOSITION_FAMILY,
  VOLITIONAL_WISH_COMPLEMENT_FAMILY,
  VOLITIONAL_QUOTE_ATTRIBUTIVE_FAMILY,
  VOLITIONAL_REQUEST_COMPLEMENT_FAMILY,
  REQUEST_ON_COMPOSED_PREDICATE_BASE_FAMILY,
  BENEFACTIVE_NODA_TERMINAL_FAMILY,
  REQUEST_TERMINAL_BOUNDARY_FAMILY,
  REASON_QUOTE_CARRIER_LEGACY_RESIDUAL_FAMILY
]);

installProductionFamilyDeclarations(PRODUCTION_REGISTRY);
