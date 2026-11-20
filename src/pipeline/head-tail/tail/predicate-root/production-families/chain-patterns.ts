import type { AuxOpKind } from "../grammar.js";
import { productionOpPattern } from "../production-admission-contract.js";
import { CLAUSE_CONNECTIVE_KINDS } from "../production-family-claims.js";
import type { ProductionFamilyClaimOpDependency, ProductionFamilyClaimSequenceAggregateDependency, ProductionOpPattern, ProductionRecord } from "../production-registry.js";

export const COPULA_SUFFIX_RANGE = {
  start: { kind: "absolute", index: 1 },
  end: { kind: "relative", offset: 0 }
} as const satisfies ProductionFamilyClaimSequenceAggregateDependency["range"];

export const CLAUSE_CHAIN_BASIC_OP_KINDS = [
  "tense",
  "aspect",
  "voice",
  "negation",
  "polite"
] as const satisfies readonly AuxOpKind[];

export const CLAUSE_CHAIN_BASIC_OP_PATTERNS = [
  { kind: "tense" },
  { kind: "aspect" },
  { kind: "voice" },
  { kind: "negation" },
  { kind: "polite" }
] as const satisfies readonly ProductionOpPattern[];

export const CLAUSE_CONNECTIVE_SLOT_PATTERNS = [
  productionOpPattern("connective", "connective_fields", {
    connectiveIn: [...CLAUSE_CONNECTIVE_KINDS]
  })
] as const satisfies readonly ProductionOpPattern[];

export const CLAUSE_CONNECTIVE_CLAIM_DEPENDENCY = {
  kind: "connective",
  fields: ["connective"]
} as const satisfies ProductionFamilyClaimOpDependency;

export const basicOpKindsAggregate = (
  id: string,
  range?: ProductionFamilyClaimSequenceAggregateDependency["range"]
) => ({
  id,
  kind: "every_kind_in",
  opKinds: CLAUSE_CHAIN_BASIC_OP_KINDS,
  ...(range === undefined ? {} : { range })
}) as const satisfies ProductionFamilyClaimSequenceAggregateDependency;

export const clauseConnectivePrefixRange = (start: number) => ({
  start: { kind: "absolute", index: start },
  end: { kind: "relative", offset: -1 }
}) as const satisfies ProductionFamilyClaimSequenceAggregateDependency["range"];

export const CLAUSE_CHAIN_SEMANTIC_OP_KINDS = [
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

export const CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS = [
  ...CLAUSE_CHAIN_BASIC_OP_KINDS,
  ...CLAUSE_CHAIN_SEMANTIC_OP_KINDS
] as const satisfies readonly AuxOpKind[];

const _clauseChainOpKindPartition: [AuxOpKind] extends [
  (typeof CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS)[number] | "copula" | "connective"
] ? true : never = true;
void _clauseChainOpKindPartition;

export const CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS = [
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

export const semanticClauseChainAggregates = (
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

export const CLAUSE_CHAIN_COPULA_PROJECTION_OP_KINDS = [
  ...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_KINDS,
  "copula"
] as const satisfies readonly AuxOpKind[];

export const CLAUSE_CHAIN_COPULA_PROJECTION_OP_PATTERNS = [
  ...CLAUSE_CHAIN_SEMANTIC_CHAIN_OP_PATTERNS,
  { kind: "copula" }
] as const satisfies readonly ProductionOpPattern[];

export const copulaProjectionChainAggregates = (
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

export const VERBAL_CLAUSE_CHAIN_HOST_CONDITIONS = {
  stemKinds: ["verb", "adj", "noun", "candidateSet"],
  sourceShapes: ["verb", "i_adjective", "sahen_verbalization"]
} as const satisfies ProductionRecord["conditions"]["host"];

export const COPULA_CLAUSE_CHAIN_HOST_CONDITIONS = {
  stemKinds: ["noun", "adj", "verb", "candidateSet"],
  sourceShapes: ["na_adjective", "nominal", "particle_phrase", "lexical_adverb"]
} as const satisfies ProductionRecord["conditions"]["host"];

export const BARE_NOMINAL_CLAUSE_CHAIN_HOST_CONDITIONS = {
  stemKinds: ["noun", "adj", "verb", "candidateSet", "adverb"],
  sourceShapes: ["na_adjective", "nominal", "lexical_adverb"]
} as const satisfies ProductionRecord["conditions"]["host"];
