import type { AuxOpKind } from "../grammar.js";
import { AUX_OP_INVENTORY } from "../grammar.js";
import type { UtteranceClosureKind } from "../../../../clause-layout/utterance-closure.js";
import type { ProductionFamilyClaimDependencies, ProductionFamilyClaimDomain, ProductionFamilyClaimOpDependency, ProductionFamilyClaimSequenceDependencies, ProductionFamilyClaimSequenceKindCountDependency, ProductionOpPattern } from "../production-registry.js";

export const ALL_OP_PATTERNS = AUX_OP_INVENTORY
  .map(({ opKind }) => ({ kind: opKind })) as readonly ProductionOpPattern[];

export const ALL_CLAIM_OP_KINDS = AUX_OP_INVENTORY.map(({ opKind }) => opKind);
export const COPULA_CLAIM_DEPENDENCY = {
  kind: "copula",
  fields: ["variant", "polarity"]
} as const satisfies ProductionFamilyClaimOpDependency;
export const TENSE_CLAIM_DEPENDENCY = {
  kind: "tense",
  fields: ["tense"]
} as const satisfies ProductionFamilyClaimOpDependency;
export const ASPECT_CLAIM_DEPENDENCY = {
  kind: "aspect",
  fields: ["aspect"]
} as const satisfies ProductionFamilyClaimOpDependency;

export const KIND_PRESENCE_DEPENDENCIES = ALL_CLAIM_OP_KINDS.map((kind) => ({
  opKinds: [kind],
  cap: 1
})) satisfies readonly ProductionFamilyClaimSequenceKindCountDependency[];

export const claimDependencies = (
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

export const CONNECTIVE_THEN_CARRIER_CLAIM_DOMAIN: ProductionFamilyClaimDomain = {
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

export const NON_CONNECTIVE_OP_PATTERNS = AUX_OP_INVENTORY
  .filter(({ opKind }) => opKind !== "connective")
  .map(({ opKind }) => ({ kind: opKind })) as readonly ProductionOpPattern[];

export const NON_CONNECTIVE_NON_CARRIER_OP_PATTERNS = AUX_OP_INVENTORY
  .filter(({ opKind }) => opKind !== "connective" && opKind !== "predicateQuoteCarrier")
  .map(({ opKind }) => ({ kind: opKind })) as readonly ProductionOpPattern[];

export const EXEMPLIFICATION_UTTERANCE_FINAL_CLOSURES = [
  "hard_terminal",
  "eos"
] as const satisfies readonly UtteranceClosureKind[];

export const SEMANTIC_OPERATOR_OP_KINDS = [
  "modal",
  "idiom",
  "desire",
  "postverbAuxiliary"
] as const satisfies readonly AuxOpKind[];
