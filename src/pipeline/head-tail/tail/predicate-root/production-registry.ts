import {
  STRUCTURAL_RELATION_KIND_VALUES,
  type StructuralRelation
} from "../../../structural-relation/types.js";
import type { ClauseLayout } from "../../../clause-layout/index.js";
import type { UtteranceClosureKind } from "../../../clause-layout/utterance-closure.js";
import type { ClauseRoleEnvelope } from "../../grammar.js";
import type { ClauseBoundary, ClauseTailIR } from "./commit.js";
import type { Warning } from "../../../../types/warning.js";
import type {
  AuxLayerNode,
  AuxOpKind,
  AuxOpNode,
  HeadProjectionKind,
  KoreanRealizationCategory,
  SfpEffect,
  SfpNode,
  SourcePredicateShape,
  StemMood,
  StemNode,
  TailRoot,
  TerminalKind
} from "./grammar.js";
import {
  AUX_OP_INVENTORY,
  HEAD_PROJECTION_KIND_VALUES,
  KOREAN_REALIZATION_CATEGORY_VALUES,
  QUOTE_BINDING_VALUES,
  SFP_INVENTORY,
  SOURCE_PREDICATE_SHAPE_VALUES,
  STEM_KIND_VALUES,
  STEM_MOOD_VALUES,
  TERMINAL_KIND_VALUES
} from "./grammar.js";
import {
  stemSupportsProjectionCategory,
  stemSupportsProjectionKind
} from "./inspect.js";
import {
  PRODUCTION_LOWERING_KEYS,
  type ProductionLoweringKey
} from "./production-lowering-contract.js";
import {
  evaluateProductionOpPredicate,
  productionOpPredicateFields,
  productionOpPredicateKind,
  productionOpPredicateRequiredFields,
  validateProductionOpPredicate,
  type ProductionOpPredicatePattern,
  type ProductionOpPredicateSpec,
  type ProductionOpPredicateSpecForKind
} from "./production-admission-contract.js";
import {
  compileProductionClaimExpression,
  createProductionClaimView,
  type CompiledProductionClaim,
  type ProductionClaimExpression
} from "./production-claim-access.js";

export { PRODUCTION_LOWERING_KEYS, type ProductionLoweringKey } from "./production-lowering-contract.js";
export * from "./production-admission-contract.js";
export * from "./production-claim-access.js";

export {
  isConditionalQuoteProductionMatch,
  normalizeCarrierInternalConnectives,
  PRODUCTION_REGISTRY,
  tailRootHasMidChainConnective
} from "./production-families.js";

export type ProductionNonAdmissionPolicy = "split" | "preserve" | "reject";

export interface ProductionCardinality {
  readonly min: number;
  readonly max: number | null;
}

export type ProductionOpPattern = ProductionOpPredicatePattern;

export interface ProductionOpSlot {
  readonly id: string;
  readonly role: "core" | "wrapper";
  readonly patterns: readonly ProductionOpPattern[];
  readonly cardinality: ProductionCardinality;
}

export interface ProductionShape {
  readonly root: "aux_layer";
  readonly ops: readonly ProductionOpSlot[];
}

export interface ProductionHostConditions {
  readonly stemKinds?: readonly StemNode["kind"][];
  readonly stemMoods?: readonly StemMood[];
  readonly sourceShapes?: readonly SourcePredicateShape[];
  readonly projectionKinds?: readonly HeadProjectionKind[];
  readonly projectionKindMode?: "any" | "all";
  readonly projectionCategories?: readonly KoreanRealizationCategory[];
  readonly projectionCategoryMode?: "any" | "all";
}

export interface ProductionTerminalConditions {
  readonly kinds?: readonly (TerminalKind | null)[];
  readonly sfp?: "any" | "required" | "forbidden";
  readonly sfpEffects?: readonly (SfpEffect | null)[];
  readonly sfpEmphaticQuestion?: boolean;
  readonly terminalPunctuationQuestion?: "required" | "forbidden";
  readonly utteranceClosureIn?: readonly UtteranceClosureKind[];
  readonly bareKeijoujiKatakanaRun?: "required" | "forbidden";
  readonly explicitAdnominalMarker?: "required" | "forbidden";
  readonly bareDirectAttributive?: "required" | "forbidden";
}

export interface ProductionConditions {
  readonly host?: ProductionHostConditions;
  readonly terminal?: ProductionTerminalConditions;
  readonly clause?: ProductionClauseConditions;
}

export type ProductionClauseRole = ClauseRoleEnvelope<ClauseBoundary, ClauseTailIR, ClauseLayout>;

export type ProductionClauseContext =
  | { readonly kind: "boundary"; readonly outgoingBoundary: ClauseBoundary }
  | { readonly kind: "clause_role"; readonly clauseRole: ProductionClauseRole };

export type ProductionIntakeSite =
  | "candidate_scan"
  | "quote_prefix"
  | "assembler_resumable_prefix"
  | "external_nominalizer"
  | "elliptic_quote"
  | "elliptic_modal"
  | "committed_render";

export interface ProductionIntakeContext {
  readonly site: ProductionIntakeSite;
  readonly partial: boolean;
  readonly conditionalCompactQuoteManner?: boolean;
}

export interface ProductionClauseConditions {
  readonly boundaryKinds?: readonly ClauseBoundary["kind"][];
  readonly connectiveKinds?: readonly Exclude<ClauseBoundary, { readonly kind: "terminal" }>["connectiveKind"][];
  readonly clauseContext?: "any" | "required" | "forbidden";
  readonly intakeSites?: readonly ProductionIntakeSite[];
  readonly partial?: boolean;
  readonly conditionalCompactQuoteManner?: "required" | "forbidden";
}

export interface ProductionMatchContext {
  readonly relations?: readonly StructuralRelation[];
  readonly clause?: ProductionClauseContext;
  readonly intake?: ProductionIntakeContext;
}

export type ResolvedProductionMatchContext = Omit<ProductionMatchContext, "relations"> & {
  readonly relations: readonly StructuralRelation[];
};

export interface ProductionShapeMatch {
  readonly layer: AuxLayerNode;
  readonly slots: ReadonlyMap<string, readonly AuxOpNode[]>;
}

export interface ProductionEvidenceInput {
  readonly root: TailRoot;
  readonly shape: ProductionShapeMatch;
  readonly context: ResolvedProductionMatchContext;
}

export type NonEmptyProductionEvidenceRelations = readonly [
  StructuralRelation,
  ...StructuralRelation[]
];

export type ProductionEvidenceWitnessInput = ProductionEvidenceInput;

export type ProductionEvidenceSelectorSpec =
  | {
      readonly key: "context_relation_kind";
      readonly args: { readonly kind: StructuralRelation["kind"] };
    }
  | {
      readonly key: "context_relation_at";
      readonly args: { readonly index: number };
    }
  | {
      readonly key: "context_relation_at_when_slot_count";
      readonly args: {
        readonly slotId: string;
        readonly count: number;
        readonly relationIndex: number;
      };
    };

export type ProductionEvidencePositiveWitnessSpec = {
  readonly key: "literal_relations";
  readonly args: { readonly relations: NonEmptyProductionEvidenceRelations };
};

export interface ProductionEvidenceRequirement {
  readonly id: string;
  readonly selector: ProductionEvidenceSelectorSpec;
  readonly positiveWitness: ProductionEvidencePositiveWitnessSpec;
}

type ProductionEvidenceSelectorBindings = {
  readonly [K in ProductionEvidenceSelectorSpec["key"]]: (
    input: ProductionEvidenceInput,
    args: Extract<ProductionEvidenceSelectorSpec, { readonly key: K }>["args"]
  ) => StructuralRelation | readonly StructuralRelation[] | null;
};

const PRODUCTION_EVIDENCE_SELECTOR_BINDINGS = {
  context_relation_kind: ({ context }, { kind }) =>
    context.relations.find((relation) => relation.kind === kind) ?? null,
  context_relation_at: ({ context }, { index }) => context.relations[index] ?? null,
  context_relation_at_when_slot_count: ({ shape, context }, args) =>
    shape.slots.get(args.slotId)?.length === args.count
      ? context.relations[args.relationIndex] ?? null
      : null
} satisfies ProductionEvidenceSelectorBindings;

type ProductionEvidencePositiveWitnessBindings = {
  readonly [K in ProductionEvidencePositiveWitnessSpec["key"]]: (
    input: ProductionEvidenceWitnessInput,
    args: Extract<ProductionEvidencePositiveWitnessSpec, { readonly key: K }>["args"]
  ) => NonEmptyProductionEvidenceRelations;
};

const PRODUCTION_EVIDENCE_POSITIVE_WITNESS_BINDINGS = {
  literal_relations: (_input, { relations }) => relations
} satisfies ProductionEvidencePositiveWitnessBindings;

function selectProductionEvidence(
  requirement: ProductionEvidenceRequirement,
  input: ProductionEvidenceInput
): StructuralRelation | readonly StructuralRelation[] | null {
  const binding = PRODUCTION_EVIDENCE_SELECTOR_BINDINGS[requirement.selector.key] as (
    candidate: ProductionEvidenceInput,
    args: typeof requirement.selector.args
  ) => StructuralRelation | readonly StructuralRelation[] | null;
  return binding(input, requirement.selector.args);
}

function positiveProductionEvidenceWitness(
  requirement: ProductionEvidenceRequirement,
  input: ProductionEvidenceWitnessInput
): NonEmptyProductionEvidenceRelations {
  const binding = PRODUCTION_EVIDENCE_POSITIVE_WITNESS_BINDINGS[
    requirement.positiveWitness.key
  ] as (
    candidate: ProductionEvidenceWitnessInput,
    args: typeof requirement.positiveWitness.args
  ) => NonEmptyProductionEvidenceRelations;
  return binding(input, requirement.positiveWitness.args);
}

export function materializeProductionEvidenceRelations(
  requirements: readonly ProductionEvidenceRequirement[],
  input: ProductionEvidenceWitnessInput
): readonly StructuralRelation[] {
  return requirements.flatMap((requirement) => {
    const relations = positiveProductionEvidenceWitness(requirement, input);
    if (relations.length === 0) {
      throw new Error(`empty positive production evidence witness: ${requirement.id}`);
    }
    return relations;
  });
}

export interface ProductionNormalizationInput {
  readonly root: TailRoot;
  readonly match: ProductionRegistryMatch;
}

export interface ProductionNormalization {
  readonly id: string;
  readonly normalize: (input: ProductionNormalizationInput) => TailRoot;
}

export interface ProductionRecord {
  readonly id: string;
  readonly shape: ProductionShape;
  readonly conditions: ProductionConditions;
  readonly evidence?: readonly ProductionEvidenceRequirement[];
  readonly normalization?: ProductionNormalization;
  readonly loweringKey: ProductionLoweringKey;
}

export interface ProductionFamilyConditions {
  readonly terminal?: ProductionTerminalConditions;
}

export interface ProductionFamilyClaimDomainSlot {
  readonly id: string;
  readonly opKinds: readonly AuxOpKind[];
  readonly cardinality: ProductionCardinality;
}

export interface ProductionFamilyClaimDomain {
  readonly id: string;
  readonly root: "aux_layer";
  readonly ops: readonly ProductionFamilyClaimDomainSlot[];
  readonly terminal?: ProductionTerminalConditions;
}

export type ProductionFamilyClaimTerminalDependency =
  | {
      readonly kind: "terminal_membership";
      readonly values: readonly (TerminalKind | null)[];
    }
  | { readonly kind: "sfp_presence" }
  | {
      readonly kind: "sfp_effect_membership";
      readonly values: readonly (SfpEffect | null)[];
    };

type DistributedKeys<T> = T extends unknown ? keyof T : never;

export type ProductionFamilyClaimOpDependency = {
  readonly [K in AuxOpKind]: {
    readonly kind: K;
    readonly fields: readonly Exclude<
      DistributedKeys<Extract<AuxOpNode, { readonly kind: K }>>,
      "kind" | "source"
    >[];
  }
}[AuxOpKind];

export type ProductionFamilyClaimSequencePositionDependency =
  | { readonly kind: "absolute"; readonly index: number }
  | { readonly kind: "relative"; readonly offset: number }
  | {
      readonly kind: "first_of_kinds";
      readonly opKinds: readonly AuxOpKind[];
      readonly startIndex?: number;
      readonly offsets: readonly number[];
      readonly relativeMatches?: readonly number[];
    };

export type ProductionFamilyClaimSequenceRangeBoundary =
  | { readonly kind: "absolute"; readonly index: number }
  | { readonly kind: "relative"; readonly offset: number }
  | {
      readonly kind: "first_of_kinds";
      readonly opKinds: readonly AuxOpKind[];
      readonly startIndex?: number;
      readonly offset: number;
    };

export interface ProductionFamilyClaimSequenceKindCountDependency {
  readonly opKinds: readonly AuxOpKind[];
  readonly cap: number;
}

interface ProductionFamilyClaimSequenceAggregateBase {
  readonly id: string;
  readonly range?: {
    readonly start: ProductionFamilyClaimSequenceRangeBoundary;
    readonly end: ProductionFamilyClaimSequenceRangeBoundary;
  };
}

export type ProductionFamilyClaimSequenceAggregateDependency =
  | (ProductionFamilyClaimSequenceAggregateBase & {
      readonly kind: "some_kind";
      readonly opKinds: readonly AuxOpKind[];
    })
  | (ProductionFamilyClaimSequenceAggregateBase & {
      readonly kind: "every_kind_in";
      readonly opKinds: readonly AuxOpKind[];
    })
  | (ProductionFamilyClaimSequenceAggregateBase & {
      readonly kind: "some_pattern";
      readonly patterns: readonly ProductionOpPattern[];
    })
  | (ProductionFamilyClaimSequenceAggregateBase & {
      readonly kind: "every_filtered_pattern";
      readonly pattern: ProductionOpPattern;
      readonly requireAtLeastOne: boolean;
    })
  | (ProductionFamilyClaimSequenceAggregateBase & {
      readonly kind: "last_closes_clause";
    });

export interface ProductionFamilyClaimSequenceDependencies {
  readonly lengthThresholds?: readonly number[];
  readonly positions?: readonly ProductionFamilyClaimSequencePositionDependency[];
  readonly aggregates?: readonly ProductionFamilyClaimSequenceAggregateDependency[];
  readonly kindCounts?: readonly ProductionFamilyClaimSequenceKindCountDependency[];
  readonly familyClaimRefs?: readonly ProductionFamilyClaimReference[];
}

export interface ProductionFamilyClaimReference {
  readonly familyId: string;
  readonly polarity: "requires" | "excludes";
}

export interface ProductionFamilyClaimDependencies {
  readonly root?: {
    readonly quoteBinding?: true;
  };
  readonly host?: {
    readonly stemKind?: boolean;
    readonly stemMood?: boolean;
    readonly sourcePredicateShape?: boolean;
    readonly sourceClauseClosing?: boolean;
    readonly projectionKinds?: readonly HeadProjectionKind[];
    readonly projectionCategories?: readonly KoreanRealizationCategory[];
    readonly admittedOnlyProjectionCategories?: readonly KoreanRealizationCategory[];
  };
  readonly terminal?: readonly ProductionFamilyClaimTerminalDependency[];
  readonly ops?: readonly ProductionFamilyClaimOpDependency[];
  readonly sequence: ProductionFamilyClaimSequenceDependencies;
}

export interface ProductionFamily {
  readonly id: string;
  readonly legacyFallback?: "retired";
  readonly conditions?: ProductionFamilyConditions;
  readonly claimDomains: readonly ProductionFamilyClaimDomain[];
  readonly claimDependencies: ProductionFamilyClaimDependencies;
  readonly claimState?: "invariant";
  readonly claim: ProductionClaimExpression;
  readonly records: readonly ProductionRecord[];
  readonly nonAdmission: ProductionNonAdmissionPolicy;
}

function assertFunctionFreeAdmissionProjection(
  value: unknown,
  owner: string,
  seen = new WeakSet<object>()
): void {
  if (typeof value === "symbol") {
    throw new Error(`symbol-valued production admission declaration in ${owner}: ${String(value)}`);
  }
  if (typeof value === "function") {
    throw new Error(`function-valued production admission declaration in ${owner}`);
  }
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  for (const symbol of Object.getOwnPropertySymbols(value)) {
    throw new Error(`symbol-valued production admission declaration in ${owner}: ${String(symbol)}`);
  }
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new Error(`accessor production admission declaration in ${owner}: ${key}`);
    }
    assertFunctionFreeAdmissionProjection(descriptor.value, `${owner}.${key}`, seen);
  }
}

function assertFunctionFreeAdmissionDeclaration(
  declaration: Readonly<Record<string, unknown>>,
  excluded: (key: string) => boolean,
  owner: string
): void {
  for (const symbol of Object.getOwnPropertySymbols(declaration)) {
    throw new Error(`symbol-valued production admission declaration in ${owner}: ${String(symbol)}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(declaration);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new Error(`accessor production admission declaration in ${owner}: ${key}`);
    }
  }
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (excluded(key)) continue;
    assertFunctionFreeAdmissionProjection(descriptor.value, `${owner}.${key}`);
  }
}

function assertPlainProductionDeclaration(
  declaration: Readonly<Record<string, unknown>>,
  requiredFields: readonly string[],
  owner: string
): void {
  const prototype = Object.getPrototypeOf(declaration);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`non-plain production admission declaration in ${owner}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(declaration);
  for (const field of requiredFields) {
    const descriptor = descriptors[field];
    if (descriptor === undefined) {
      throw new Error(`missing own production admission field in ${owner}: ${field}`);
    }
    if (!("value" in descriptor)) {
      throw new Error(`accessor production admission declaration in ${owner}: ${field}`);
    }
  }
}

function postAdmissionDeclarationKey(owner: "family" | "record", key: string): boolean {
  return owner === "family"
    ? key === "records" || key === "nonAdmission" || key === "legacyFallback"
    : key === "normalization" || key === "loweringKey";
}

export interface ProductionRegistryMatch {
  readonly familyId: string;
  readonly record: ProductionRecord;
  readonly shape: ProductionShapeMatch;
  readonly context: ResolvedProductionMatchContext;
  readonly evidence: ReadonlyMap<string, readonly StructuralRelation[]>;
  readonly warnings?: readonly Warning[];
}

export type ProductionDispatchResolution =
  | { readonly kind: "registry"; readonly match: ProductionRegistryMatch }
  | {
      readonly kind: "non_admission";
      readonly familyId: string;
      readonly policy: ProductionNonAdmissionPolicy;
    }
  | { readonly kind: "legacy_dispatch" };

export const PRODUCTION_REGISTRY_MISS = { kind: "legacy_dispatch" } as const;

export function installProductionFamilyDeclarations(
  families: readonly ProductionFamily[]
): void {
  const installer = installProductionFamilyDeclarations as ProductionFamilyDeclarationInstaller;
  if (installer.registry !== undefined) {
    throw new Error("production family declarations are already installed");
  }
  installer.registry = families;
}

type ProductionFamilyDeclarationInstaller = typeof installProductionFamilyDeclarations & {
  registry?: readonly ProductionFamily[];
};

function installedProductionRegistry(): readonly ProductionFamily[] {
  const registry = (installProductionFamilyDeclarations as ProductionFamilyDeclarationInstaller).registry;
  if (registry === undefined) {
    throw new Error("production family declarations are not installed");
  }
  return registry;
}

export function defineProductionRegistry(
  families: readonly ProductionFamily[]
): readonly ProductionFamily[] {
  for (const family of families) {
    assertPlainProductionDeclaration(
      family as unknown as Readonly<Record<string, unknown>>,
      ["id", "claimDomains", "claimDependencies", "claim", "records", "nonAdmission"],
      "production family"
    );
    assertFunctionFreeAdmissionDeclaration(
      family as unknown as Readonly<Record<string, unknown>>,
      (key) => postAdmissionDeclarationKey("family", key),
      "production family"
    );
    for (const record of family.records) {
      assertPlainProductionDeclaration(
        record as unknown as Readonly<Record<string, unknown>>,
        ["id", "shape", "conditions", "loweringKey"],
        "production record"
      );
      assertFunctionFreeAdmissionDeclaration(
        record as unknown as Readonly<Record<string, unknown>>,
        (key) => postAdmissionDeclarationKey("record", key),
        "production record"
      );
    }
  }
  const familyIds = new Set<string>();
  const recordIds = new Set<string>();
  for (const family of families) {
    if (familyIds.has(family.id)) {
      throw new Error(`duplicate production family id: ${family.id}`);
    }
    familyIds.add(family.id);
    validateFamilyClaimContract(family);
    for (const record of family.records) {
      if (recordIds.has(record.id)) {
        throw new Error(`duplicate production record id: ${record.id}`);
      }
      recordIds.add(record.id);
      validateRecord(record);
      if (
        family.legacyFallback === "retired" &&
        (
          record.loweringKey === "carrier_context_legacy" ||
          record.loweringKey === "exemplification_legacy_render"
        )
      ) {
        throw new Error(
          `legacy-retired production family cannot use legacy lowering: ` +
          `${family.id}/${record.id}/${record.loweringKey}`
        );
      }
    }
  }
  for (const family of families) {
    const references = family.claimDependencies.sequence.familyClaimRefs ?? [];
    const referenceKeys = new Set<string>();
    for (const reference of references) {
      if (reference.polarity !== "requires" && reference.polarity !== "excludes") {
        throw new Error(
          `invalid production claim sequence family reference polarity in ${family.id}: ` +
          `${String(reference.polarity)}`
        );
      }
      if (reference.familyId === family.id) {
        throw new Error(`self production claim sequence family reference in ${family.id}`);
      }
      const key = reference.familyId;
      if (referenceKeys.has(key)) {
        throw new Error(`duplicate production claim sequence family reference in ${family.id}: ${key}`);
      }
      referenceKeys.add(key);
      if (!familyIds.has(reference.familyId)) {
        throw new Error(
          `unknown production claim sequence family reference in ${family.id}: ${reference.familyId}`
        );
      }
    }
  }
  const indegree = new Map(families.map((family) => [family.id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const family of families) {
    for (const { familyId } of family.claimDependencies.sequence.familyClaimRefs ?? []) {
      const targets = outgoing.get(family.id) ?? [];
      targets.push(familyId);
      outgoing.set(family.id, targets);
      indegree.set(familyId, indegree.get(familyId)! + 1);
    }
  }
  const ready = families.flatMap((family) => indegree.get(family.id) === 0 ? [family.id] : []);
  let visited = 0;
  while (ready.length > 0) {
    const familyId = ready.pop()!;
    visited++;
    for (const targetId of outgoing.get(familyId) ?? []) {
      const next = indegree.get(targetId)! - 1;
      indegree.set(targetId, next);
      if (next === 0) ready.push(targetId);
    }
  }
  if (visited !== families.length) {
    throw new Error("cyclic production family claim reference");
  }
  return families;
}

function validateFamilyClaimContract(family: ProductionFamily): void {
  if (family.claimDomains.length === 0) {
    throw new Error(`empty production family claim domain: ${family.id}`);
  }
  const domainIds = new Set<string>();
  for (const domain of family.claimDomains) {
    if (domainIds.has(domain.id)) {
      throw new Error(`duplicate production family claim domain id in ${family.id}: ${domain.id}`);
    }
    domainIds.add(domain.id);
    const slotIds = new Set<string>();
    for (const slot of domain.ops) {
      if (slotIds.has(slot.id)) {
        throw new Error(`duplicate production claim-domain slot id in ${domain.id}: ${slot.id}`);
      }
      slotIds.add(slot.id);
      if (slot.opKinds.length === 0) {
        throw new Error(`empty production claim-domain op kinds in ${domain.id}: ${slot.id}`);
      }
      if (new Set(slot.opKinds).size !== slot.opKinds.length) {
        throw new Error(`duplicate production claim-domain op kind in ${domain.id}: ${slot.id}`);
      }
      validateCardinality(slot.cardinality, `production claim-domain ${domain.id}/${slot.id}`);
    }
  }
  const dependencyKinds = new Set<AuxOpKind>();
  const rootDependency = family.claimDependencies.root;
  if (rootDependency !== undefined) {
    const keys = Object.keys(rootDependency);
    if (
      keys.some((key) => key !== "quoteBinding") ||
      !Object.hasOwn(rootDependency, "quoteBinding") ||
      rootDependency.quoteBinding !== true
    ) {
      throw new Error(`invalid production claim root dependency in ${family.id}`);
    }
  }
  for (const dependency of family.claimDependencies.ops ?? []) {
    if (dependencyKinds.has(dependency.kind)) {
      throw new Error(`duplicate production claim dependency kind in ${family.id}: ${dependency.kind}`);
    }
    dependencyKinds.add(dependency.kind);
    if (new Set<PropertyKey>(dependency.fields).size !== dependency.fields.length) {
      throw new Error(`duplicate production claim dependency field in ${family.id}: ${dependency.kind}`);
    }
  }
  const terminalDependencyKeys = new Set<string>();
  for (const dependency of family.claimDependencies.terminal ?? []) {
    const values = "values" in dependency ? dependency.values : undefined;
    if (values !== undefined && (values.length === 0 || new Set(values).size !== values.length)) {
      throw new Error(`invalid production claim terminal dependency in ${family.id}`);
    }
    const key = values === undefined
      ? dependency.kind
      : `${dependency.kind}:${[...values].map((value) => value ?? "<null>").sort().join("|")}`;
    if (terminalDependencyKeys.has(key)) {
      throw new Error(`duplicate production claim terminal dependency in ${family.id}: ${key}`);
    }
    terminalDependencyKeys.add(key);
  }
  const sequence = family.claimDependencies.sequence;
  for (const threshold of sequence.lengthThresholds ?? []) {
    if (!Number.isInteger(threshold) || threshold < 0) {
      throw new Error(`invalid production claim sequence length threshold in ${family.id}`);
    }
  }
  for (const dependency of sequence.positions ?? []) {
    if (dependency.kind === "absolute" && (!Number.isInteger(dependency.index) || dependency.index < 0)) {
      throw new Error(`invalid production claim absolute position in ${family.id}`);
    }
    if (dependency.kind === "relative" && (!Number.isInteger(dependency.offset) || dependency.offset >= 0)) {
      throw new Error(`invalid production claim relative position in ${family.id}`);
    }
    if (dependency.kind === "first_of_kinds") {
      if (dependency.opKinds.length === 0 || dependency.offsets.length === 0 ||
        dependency.offsets.some((offset) => !Number.isInteger(offset)) ||
        (dependency.relativeMatches ?? []).some((offset) =>
          !Number.isInteger(offset) || offset >= 0
        ) ||
        new Set(dependency.relativeMatches ?? []).size !==
          (dependency.relativeMatches ?? []).length ||
        (dependency.startIndex !== undefined &&
          (!Number.isInteger(dependency.startIndex) || dependency.startIndex < 0))) {
        throw new Error(`invalid production claim first-kind dependency in ${family.id}`);
      }
    }
    if ("opKinds" in dependency && new Set(dependency.opKinds).size !== dependency.opKinds.length) {
      throw new Error(`duplicate production claim sequence op kind in ${family.id}`);
    }
  }
  const aggregateIds = new Set<string>();
  for (const aggregate of sequence.aggregates ?? []) {
    if (aggregate.id.length === 0 || aggregateIds.has(aggregate.id)) {
      throw new Error(`invalid production claim aggregate id in ${family.id}: ${aggregate.id}`);
    }
    aggregateIds.add(aggregate.id);
    if ("opKinds" in aggregate && (aggregate.opKinds.length === 0 ||
      new Set(aggregate.opKinds).size !== aggregate.opKinds.length)) {
      throw new Error(`invalid production claim aggregate kinds in ${family.id}: ${aggregate.id}`);
    }
    const aggregatePatterns = aggregate.kind === "some_pattern"
      ? aggregate.patterns
      : aggregate.kind === "every_filtered_pattern"
        ? [aggregate.pattern]
        : [];
    if (aggregate.kind === "some_pattern" && aggregate.patterns.length === 0) {
      throw new Error(`empty production claim aggregate patterns in ${family.id}: ${aggregate.id}`);
    }
    for (const pattern of aggregatePatterns) {
      if (pattern.predicate === undefined) continue;
      validateProductionOpPredicate(pattern.predicate);
      const opDependency = family.claimDependencies.ops?.find(({ kind }) => kind === pattern.kind);
      for (const field of productionOpPredicateFields(pattern.predicate)) {
        if (opDependency === undefined ||
          !(opDependency.fields as readonly string[]).includes(field)) {
          throw new Error(`invalid production claim aggregate field in ${family.id}: ${aggregate.id}`);
        }
      }
    }
    for (const boundary of aggregate.range === undefined
      ? []
      : [aggregate.range.start, aggregate.range.end]) {
      if (boundary.kind === "absolute" &&
        (!Number.isInteger(boundary.index) || boundary.index < 0)) {
        throw new Error(`invalid production claim aggregate range in ${family.id}: ${aggregate.id}`);
      }
      if (boundary.kind === "relative" && !Number.isInteger(boundary.offset)) {
        throw new Error(`invalid production claim aggregate range in ${family.id}: ${aggregate.id}`);
      }
      if (boundary.kind === "first_of_kinds" &&
        (boundary.opKinds.length === 0 || !Number.isInteger(boundary.offset) ||
          (boundary.startIndex !== undefined &&
            (!Number.isInteger(boundary.startIndex) || boundary.startIndex < 0)) ||
          new Set(boundary.opKinds).size !== boundary.opKinds.length)) {
        throw new Error(`invalid production claim aggregate range in ${family.id}: ${aggregate.id}`);
      }
    }
    if (aggregate.range !== undefined) {
      const rangeKind = `${aggregate.range.start.kind}->${aggregate.range.end.kind}`;
      if (![
        "absolute->absolute",
        "absolute->relative",
        "absolute->first_of_kinds",
        "first_of_kinds->relative",
        "relative->relative"
      ].includes(rangeKind)) {
        throw new Error(
          `unsupported finite production claim aggregate range in ` +
          `${family.id}/${aggregate.id}: ${rangeKind}`
        );
      }
    }
  }
  for (const dependency of sequence.kindCounts ?? []) {
    if (dependency.opKinds.length === 0 || new Set(dependency.opKinds).size !== dependency.opKinds.length ||
      !Number.isInteger(dependency.cap) || dependency.cap < 1) {
      throw new Error(`invalid production claim sequence kind-count dependency in ${family.id}`);
    }
  }
  validateProductionClaimExpression(family, family.claim);
  validateClaimExpressionDependencies(family, family.claim);
}

function normalizedClaimKinds(opKinds: readonly AuxOpKind[]): string {
  return [...new Set(opKinds)].sort().join("|");
}

function validateClaimSelectorDependency(
  family: ProductionFamily,
  selector: import("./production-claim-access.js").ProductionClaimOpSelector
): void {
  const positions = family.claimDependencies.sequence.positions ?? [];
  const declared = positions.some((dependency) => {
    switch (selector.kind) {
      case "absolute":
        return dependency.kind === "absolute" && dependency.index === selector.index;
      case "relative":
        return dependency.kind === "relative" && dependency.offset === selector.offset;
      case "first_of_kinds":
        return dependency.kind === "first_of_kinds" &&
          normalizedClaimKinds(dependency.opKinds) === normalizedClaimKinds(selector.opKinds) &&
          (dependency.startIndex ?? 0) === (selector.startIndex ?? 0) &&
          dependency.offsets.includes(selector.offset);
    }
  });
  if (!declared) {
    throw new Error(`undeclared production claim sequence selector in ${family.id}`);
  }
}

function invalidClaimExpression(family: ProductionFamily, detail: string): never {
  throw new Error(`invalid production claim expression in ${family.id}: ${detail}`);
}

function validateClaimObjectKeys(
  family: ProductionFamily,
  value: unknown,
  allowedKeys: readonly string[],
  owner: string
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalidClaimExpression(family, `${owner} must be an object`);
  }
  const node = value as Readonly<Record<string, unknown>>;
  for (const key of Object.keys(node)) {
    if (!allowedKeys.includes(key)) {
      return invalidClaimExpression(family, `${owner} has unknown field ${key}`);
    }
  }
  return node;
}

function validateClaimInteger(
  family: ProductionFamily,
  value: unknown,
  owner: string,
  minimum: number,
  maximum = Number.POSITIVE_INFINITY
): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    return invalidClaimExpression(family, `${owner} must be a safe integer in [${minimum}, ${maximum}]`);
  }
  return value as number;
}

function validateClaimValues(
  family: ProductionFamily,
  value: unknown,
  allowed: ReadonlySet<unknown>,
  owner: string
): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0 || new Set(value).size !== value.length) {
    return invalidClaimExpression(family, `${owner} must be a non-empty unique array`);
  }
  if (value.some((item) => !allowed.has(item))) {
    return invalidClaimExpression(family, `${owner} contains an unknown value`);
  }
  return value;
}

function productionClaimOpKinds(): ReadonlySet<unknown> {
  return new Set(AUX_OP_INVENTORY.map(({ opKind }) => opKind));
}

function productionClaimTerminalValues(): ReadonlySet<unknown> {
  return new Set([null, ...TERMINAL_KIND_VALUES]);
}

function productionClaimSfpEffectValues(): ReadonlySet<unknown> {
  return new Set([null, ...SFP_INVENTORY.map(({ effect }) => effect)]);
}

function validateProductionClaimSelector(
  family: ProductionFamily,
  value: unknown
): void {
  const selector = validateClaimObjectKeys(
    family,
    value,
    ["kind", "index", "offset", "opKinds", "startIndex"],
    "selector"
  );
  switch (selector.kind) {
    case "absolute":
      validateClaimObjectKeys(family, value, ["kind", "index"], "absolute selector");
      validateClaimInteger(family, selector.index, "absolute selector index", 0);
      return;
    case "relative":
      validateClaimObjectKeys(family, value, ["kind", "offset"], "relative selector");
      validateClaimInteger(family, selector.offset, "relative selector offset", -Number.MAX_SAFE_INTEGER, -1);
      return;
    case "first_of_kinds":
      validateClaimObjectKeys(
        family,
        value,
        ["kind", "opKinds", "offset", "startIndex"],
        "first-of-kinds selector"
      );
      validateClaimValues(family, selector.opKinds, productionClaimOpKinds(), "selector opKinds");
      validateClaimInteger(
        family,
        selector.offset,
        "first-of-kinds selector offset",
        -Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER
      );
      if (selector.startIndex !== undefined) {
        validateClaimInteger(family, selector.startIndex, "first-of-kinds selector startIndex", 0);
      }
      return;
    default:
      return invalidClaimExpression(family, `unknown selector kind ${String(selector.kind)}`);
  }
}

function validateProductionClaimPatterns(
  family: ProductionFamily,
  value: unknown,
  owner: string
): void {
  if (!Array.isArray(value) || value.length === 0) {
    return invalidClaimExpression(family, `${owner} must be a non-empty array`);
  }
  for (const candidate of value) {
    const pattern = validateClaimObjectKeys(family, candidate, ["kind", "predicate"], owner);
    if (!productionClaimOpKinds().has(pattern.kind)) {
      return invalidClaimExpression(family, `${owner} has unknown op kind ${String(pattern.kind)}`);
    }
    if (pattern.predicate !== undefined) {
      const predicate = validateClaimObjectKeys(
        family,
        pattern.predicate,
        ["key", "args"],
        `${owner} predicate`
      ) as unknown as ProductionOpPredicateSpec;
      validateProductionOpPredicate(predicate);
      if (productionOpPredicateKind(predicate) !== pattern.kind) {
        return invalidClaimExpression(family, `${owner} predicate kind mismatch`);
      }
    }
  }
}

function validateProductionClaimExpression(
  family: ProductionFamily,
  value: unknown
): void {
  const node = validateClaimObjectKeys(family, value, [
    "kind", "value", "terms", "term", "comparison", "selector", "patterns", "present",
    "opKinds", "relativeOffset", "startIndex", "id", "cap", "values", "axis", "mode"
  ], "expression");
  switch (node.kind) {
    case "constant":
      validateClaimObjectKeys(family, value, ["kind", "value"], "constant expression");
      if (typeof node.value !== "boolean") invalidClaimExpression(family, "constant value must be boolean");
      return;
    case "all":
    case "any":
      validateClaimObjectKeys(family, value, ["kind", "terms"], `${node.kind} expression`);
      if (!Array.isArray(node.terms)) invalidClaimExpression(family, `${node.kind} terms must be an array`);
      node.terms.forEach((term) => validateProductionClaimExpression(family, term));
      return;
    case "not":
      validateClaimObjectKeys(family, value, ["kind", "term"], "not expression");
      validateProductionClaimExpression(family, node.term);
      return;
    case "sequence_length":
      validateClaimObjectKeys(family, value, ["kind", "comparison", "value"], "sequence-length expression");
      if (node.comparison !== "equals" && node.comparison !== "at_least") {
        invalidClaimExpression(family, "invalid sequence-length comparison");
      }
      validateClaimInteger(family, node.value, "sequence-length value", 0);
      return;
    case "sequence_op":
      validateClaimObjectKeys(family, value, ["kind", "selector", "patterns"], "sequence-op expression");
      validateProductionClaimSelector(family, node.selector);
      validateProductionClaimPatterns(family, node.patterns, "sequence-op patterns");
      return;
    case "sequence_op_presence":
      validateClaimObjectKeys(
        family,
        value,
        ["kind", "selector", "present"],
        "sequence-op-presence expression"
      );
      validateProductionClaimSelector(family, node.selector);
      if (typeof node.present !== "boolean") invalidClaimExpression(family, "presence value must be boolean");
      return;
    case "first_of_kinds_at_relative":
      validateClaimObjectKeys(
        family,
        value,
        ["kind", "opKinds", "relativeOffset", "startIndex"],
        "first-relative expression"
      );
      validateClaimValues(family, node.opKinds, productionClaimOpKinds(), "first-relative opKinds");
      validateClaimInteger(
        family,
        node.relativeOffset,
        "first-relative offset",
        -Number.MAX_SAFE_INTEGER,
        -1
      );
      if (node.startIndex !== undefined) {
        validateClaimInteger(family, node.startIndex, "first-relative startIndex", 0);
      }
      return;
    case "aggregate":
      validateClaimObjectKeys(family, value, ["kind", "id"], "aggregate expression");
      if (typeof node.id !== "string" || node.id.length === 0) {
        invalidClaimExpression(family, "aggregate id must be a non-empty string");
      }
      return;
    case "kind_count":
      validateClaimObjectKeys(
        family,
        value,
        ["kind", "opKinds", "cap", "comparison", "value"],
        "kind-count expression"
      );
      validateClaimValues(family, node.opKinds, productionClaimOpKinds(), "kind-count opKinds");
      validateClaimInteger(family, node.cap, "kind-count cap", 1);
      validateClaimInteger(family, node.value, "kind-count value", 0);
      if (node.comparison !== "equals" && node.comparison !== "greater_than") {
        invalidClaimExpression(family, "invalid kind-count comparison");
      }
      return;
    case "terminal_membership":
      validateClaimObjectKeys(family, value, ["kind", "values"], "terminal-membership expression");
      validateClaimValues(family, node.values, productionClaimTerminalValues(), "terminal values");
      return;
    case "sfp_presence":
      validateClaimObjectKeys(family, value, ["kind", "present"], "SFP-presence expression");
      if (typeof node.present !== "boolean") invalidClaimExpression(family, "SFP presence must be boolean");
      return;
    case "sfp_effect_membership":
      validateClaimObjectKeys(family, value, ["kind", "values"], "SFP-effect expression");
      validateClaimValues(family, node.values, productionClaimSfpEffectValues(), "SFP effect values");
      return;
    case "root_membership":
      validateClaimObjectKeys(family, value, ["kind", "axis", "values"], "root-membership expression");
      if (node.axis !== "quote_binding") {
        invalidClaimExpression(family, `unknown root axis ${String(node.axis)}`);
      }
      validateClaimValues(family, node.values, new Set<unknown>(QUOTE_BINDING_VALUES), "root values");
      return;
    case "host_membership": {
      validateClaimObjectKeys(family, value, ["kind", "axis", "values"], "host-membership expression");
      const allowed = node.axis === "stem_kind"
        ? new Set<unknown>(STEM_KIND_VALUES)
        : node.axis === "stem_mood"
          ? new Set<unknown>([undefined, ...STEM_MOOD_VALUES])
          : node.axis === "source_predicate_shape"
            ? new Set<unknown>([undefined, ...SOURCE_PREDICATE_SHAPE_VALUES])
            : node.axis === "source_clause_closing"
              ? new Set<unknown>([true, false])
              : null;
      if (allowed === null) invalidClaimExpression(family, `unknown host axis ${String(node.axis)}`);
      validateClaimValues(family, node.values, allowed, "host values");
      return;
    }
    case "projection": {
      validateClaimObjectKeys(family, value, ["kind", "mode", "value"], "projection expression");
      const allowed = node.mode === "supports_kind"
        ? new Set<unknown>(HEAD_PROJECTION_KIND_VALUES)
        : node.mode === "supports_category" || node.mode === "admits_only_category"
          ? new Set<unknown>(KOREAN_REALIZATION_CATEGORY_VALUES)
          : null;
      if (allowed === null) invalidClaimExpression(family, `unknown projection mode ${String(node.mode)}`);
      if (!allowed.has(node.value)) invalidClaimExpression(family, "unknown projection value");
      return;
    }
    default:
      return invalidClaimExpression(family, `unknown kind ${String(node.kind)}`);
  }
}

function validateClaimExpressionDependencies(
  family: ProductionFamily,
  expression: ProductionClaimExpression
): void {
  const sequence = family.claimDependencies.sequence;
  switch (expression.kind) {
    case "constant":
      return;
    case "all":
    case "any":
      expression.terms.forEach((term) => validateClaimExpressionDependencies(family, term));
      return;
    case "not":
      validateClaimExpressionDependencies(family, expression.term);
      return;
    case "sequence_length":
      if (!(sequence.lengthThresholds ?? []).includes(expression.value)) {
        throw new Error(`undeclared production claim length threshold in ${family.id}: ${expression.value}`);
      }
      return;
    case "sequence_op":
      validateClaimSelectorDependency(family, expression.selector);
      for (const pattern of expression.patterns) {
        if (pattern.predicate === undefined) continue;
        validateProductionOpPredicate(pattern.predicate);
        const dependency = family.claimDependencies.ops?.find(({ kind }) => kind === pattern.kind);
        for (const field of productionOpPredicateFields(pattern.predicate)) {
          if (dependency === undefined || !(dependency.fields as readonly string[]).includes(field)) {
            throw new Error(`undeclared production claim op field in ${family.id}: ${pattern.kind}.${field}`);
          }
        }
      }
      return;
    case "sequence_op_presence":
      validateClaimSelectorDependency(family, expression.selector);
      return;
    case "first_of_kinds_at_relative": {
      const declared = (sequence.positions ?? []).some((dependency) =>
        dependency.kind === "first_of_kinds" &&
        normalizedClaimKinds(dependency.opKinds) === normalizedClaimKinds(expression.opKinds) &&
        (dependency.startIndex ?? 0) === (expression.startIndex ?? 0) &&
        (dependency.relativeMatches ?? []).includes(expression.relativeOffset)
      );
      if (!declared) {
        throw new Error(`undeclared production claim first-relative selector in ${family.id}`);
      }
      return;
    }
    case "aggregate":
      if (!(sequence.aggregates ?? []).some(({ id }) => id === expression.id)) {
        throw new Error(`undeclared production claim aggregate in ${family.id}: ${expression.id}`);
      }
      return;
    case "kind_count":
      if (!(sequence.kindCounts ?? []).some((dependency) =>
        dependency.cap === expression.cap &&
        normalizedClaimKinds(dependency.opKinds) === normalizedClaimKinds(expression.opKinds)
      )) {
        throw new Error(`undeclared production claim kind count in ${family.id}`);
      }
      return;
    case "terminal_membership":
      if (!(family.claimDependencies.terminal ?? []).some((dependency) =>
        dependency.kind === "terminal_membership" &&
        JSON.stringify(dependency.values) === JSON.stringify(expression.values)
      )) {
        throw new Error(`undeclared production claim terminal membership in ${family.id}`);
      }
      return;
    case "sfp_presence":
      if (!(family.claimDependencies.terminal ?? []).some(({ kind }) => kind === "sfp_presence")) {
        throw new Error(`undeclared production claim SFP presence in ${family.id}`);
      }
      return;
    case "sfp_effect_membership":
      if (!(family.claimDependencies.terminal ?? []).some((dependency) =>
        dependency.kind === "sfp_effect_membership" &&
        JSON.stringify(dependency.values) === JSON.stringify(expression.values)
      )) {
        throw new Error(`undeclared production claim SFP effect in ${family.id}`);
      }
      return;
    case "root_membership":
      if (expression.axis !== "quote_binding" || family.claimDependencies.root?.quoteBinding !== true) {
        throw new Error(`undeclared production claim root axis in ${family.id}: ${expression.axis}`);
      }
      return;
    case "host_membership": {
      const host = family.claimDependencies.host;
      const declared = expression.axis === "stem_kind"
        ? host?.stemKind === true
        : expression.axis === "stem_mood"
          ? host?.stemMood === true
          : host?.sourcePredicateShape === true;
      if (!declared) throw new Error(`undeclared production claim host axis in ${family.id}: ${expression.axis}`);
      return;
    }
    case "projection": {
      const host = family.claimDependencies.host;
      const declared = expression.mode === "supports_kind"
        ? (host?.projectionKinds ?? []).includes(expression.value as HeadProjectionKind)
        : expression.mode === "supports_category"
          ? (host?.projectionCategories ?? []).includes(expression.value as KoreanRealizationCategory)
          : (host?.admittedOnlyProjectionCategories ?? []).includes(
            expression.value as KoreanRealizationCategory
          );
      if (!declared) {
        throw new Error(`undeclared production claim projection in ${family.id}: ${expression.value}`);
      }
      return;
    }
    default:
      throw new Error(
        `invalid production claim expression kind in ${family.id}: ` +
        `${String((expression as { readonly kind?: unknown }).kind)}`
      );
  }
}

function validateCardinality(cardinality: ProductionCardinality, owner: string): void {
  if (
    !Number.isInteger(cardinality.min) ||
    cardinality.min < 0 ||
    (cardinality.max !== null && (
      !Number.isInteger(cardinality.max) ||
      cardinality.max < cardinality.min
    ))
  ) {
    throw new Error(`invalid ${owner} cardinality`);
  }
}

interface PreparedProductionRecordOpAxis {
  readonly record: ProductionRecord;
  readonly slotCaptures: readonly ReadonlyMap<string, readonly AuxOpNode[]>[];
}

interface PreparedProductionFamilyOpAxis {
  readonly family: ProductionFamily;
  readonly matchingDomains: readonly ProductionFamilyClaimDomain[];
  readonly invariantClaim: boolean | undefined;
}

export interface ProductionDispatchState {
  readonly terminal: TerminalKind | null;
  readonly sfp: SfpNode | null;
}

function rootWithProductionDispatchState(
  root: TailRoot,
  state: ProductionDispatchState
): TailRoot {
  if (
    root.sfp === state.sfp &&
    (root.tail.kind !== "auxLayer" || root.tail.terminal === state.terminal)
  ) {
    return root;
  }
  return root.tail.kind === "auxLayer"
    ? { ...root, tail: { ...root.tail, terminal: state.terminal }, sfp: state.sfp }
    : { ...root, sfp: state.sfp };
}

function prepareProductionFamilyOpAxis(
  root: TailRoot,
  family: ProductionFamily,
  registry: readonly ProductionFamily[]
): PreparedProductionFamilyOpAxis {
  if (root.tail.kind !== "auxLayer") {
    return { family, matchingDomains: [], invariantClaim: undefined };
  }
  const layer = root.tail;
  const matchingDomains = family.claimDomains.filter((domain) =>
    matchClaimDomainSlots(layer.ops, domain.ops)
  );
  const invariantClaim = matchingDomains.length > 0 &&
    family.claimState === "invariant" &&
    (family.claimDependencies.sequence.familyClaimRefs ?? []).length === 0
    ? evaluateProductionFamilyClaim(root, family, registry)
    : undefined;
  return { family, matchingDomains, invariantClaim };
}

function prepareProductionRecordsOpAxis(
  root: TailRoot,
  family: ProductionFamily,
  context: ResolvedProductionMatchContext
): readonly PreparedProductionRecordOpAxis[] {
  if (root.tail.kind !== "auxLayer") return [];
  const layer = root.tail;
  return family.records.flatMap((record) => {
    if (
      !hostConditionsMatch(layer.stem, record.conditions.host) ||
      !clauseConditionsMatch(context, record.conditions.clause)
    ) {
      return [];
    }
    const slotCaptures = matchShapes(root, record.shape).map(({ slots }) => slots);
    return slotCaptures.length === 0 ? [] : [{ record, slotCaptures }];
  });
}

function preparedFamilyClaims(
  root: TailRoot,
  prepared: PreparedProductionFamilyOpAxis,
  registry: readonly ProductionFamily[]
): boolean {
  if (root.tail.kind !== "auxLayer") return false;
  return productionFamilyConditionsMatch(root, prepared.family.conditions) &&
    prepared.matchingDomains.some((domain) =>
      terminalConditionsMatch(root, root.tail as AuxLayerNode, domain.terminal)
    ) &&
    (prepared.invariantClaim ?? evaluateProductionFamilyClaim(root, prepared.family, registry));
}

function preparedProductionMatchesInFamily(
  root: TailRoot,
  prepared: PreparedProductionFamilyOpAxis,
  records: readonly PreparedProductionRecordOpAxis[],
  context: ResolvedProductionMatchContext
): readonly ProductionRegistryMatch[] {
  if (root.tail.kind !== "auxLayer") return [];
  const matches: ProductionRegistryMatch[] = [];
  for (const { record, slotCaptures } of records) {
    if (!terminalConditionsMatch(root, root.tail, record.conditions.terminal)) continue;
    for (const slots of slotCaptures) {
      const shape: ProductionShapeMatch = { layer: root.tail, slots };
      const evidenceInput: ProductionEvidenceInput = {
        root,
        shape,
        context
      };
      const evidence = captureEvidence(record.evidence, evidenceInput);
      if (evidence === null) {
        continue;
      }
      matches.push({ familyId: prepared.family.id, record, shape, context, evidence });
    }
  }
  if (new Set(matches.map(({ record }) => record.id)).size !== matches.length) {
    throw new Error(
      `ambiguous production record slot partition: ` +
      matches.map(({ record }) => record.id).join(", ")
    );
  }
  return matches;
}

function compareProductionMatches(
  left: ProductionRegistryMatch,
  right: ProductionRegistryMatch
): number {
  if (left.familyId !== right.familyId) return left.familyId < right.familyId ? -1 : 1;
  if (left.record.id === right.record.id) return 0;
  return left.record.id < right.record.id ? -1 : 1;
}

function productionRootSourceSpan(root: TailRoot): Warning["span"] {
  if (root.tail.kind !== "auxLayer") return undefined;
  const indices = [
    ...root.tail.stem.source.tokenIndices,
    ...root.tail.ops.flatMap((op) => op.source.tokenIndices),
    ...(root.sfp?.source.tokenIndices ?? [])
  ];
  if (indices.length === 0) return undefined;
  return { start: Math.min(...indices), end: Math.max(...indices) };
}

function selectProductionMatch(
  root: TailRoot,
  matches: readonly ProductionRegistryMatch[]
): ProductionRegistryMatch | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;
  const ordered = [...matches].sort(compareProductionMatches);
  const selected = ordered[0]!;
  const familyIds = [...new Set(ordered.map(({ familyId }) => familyId))].sort();
  const winner = `${selected.familyId}/${selected.record.id}`;
  const span = productionRootSourceSpan(root);
  const warning: Warning = {
    type: "production_ownership_overlap",
    severity: "warning",
    opKind: "production_ownership_overlap",
    candidates: familyIds,
    winner,
    ...(span === undefined ? {} : { span }),
    message: `undeclared production ownership overlap among [${familyIds.join(", ")}]; ` +
      `selected ${winner} by family-id/record-id lexical order.`
  };
  return {
    ...selected,
    warnings: [...(selected.warnings ?? []), warning]
  };
}

export function resolveProductionDispatchBatch(
  root: TailRoot,
  states: readonly ProductionDispatchState[],
  context: ProductionMatchContext = {},
  registry: readonly ProductionFamily[] = installedProductionRegistry()
): readonly ProductionDispatchResolution[] {
  const resolvedContext: ResolvedProductionMatchContext = {
    ...context,
    relations: context.relations ?? []
  };
  const ops = root.tail.kind === "auxLayer" ? root.tail.ops : null;
  const preparedFamilies = ops === null
    ? []
    : registry
      .filter((family) => productionFamilyOpKindPrefilter(family, ops))
      .map((family) => prepareProductionFamilyOpAxis(root, family, registry))
      .filter((prepared) => prepared.matchingDomains.length > 0);
  const stateRoots = states.map((state) => rootWithProductionDispatchState(root, state));
  const claimedByState = stateRoots.map((stateRoot) => {
    return preparedFamilies.filter((prepared) =>
      preparedFamilyClaims(stateRoot, prepared, registry)
    );
  });
  const recordsByFamily = new Map<
    PreparedProductionFamilyOpAxis,
    readonly PreparedProductionRecordOpAxis[]
  >();
  for (const claimed of claimedByState) {
    for (const prepared of claimed) {
      if (!recordsByFamily.has(prepared)) {
        recordsByFamily.set(
          prepared,
          prepareProductionRecordsOpAxis(root, prepared.family, resolvedContext)
        );
      }
    }
  }
  return stateRoots.map((stateRoot, stateIndex) => {
    const claimed = claimedByState[stateIndex] ?? [];
    if (claimed.length === 0) {
      return PRODUCTION_REGISTRY_MISS;
    }
    const match = selectProductionMatch(
      stateRoot,
      claimed.flatMap((prepared) => preparedProductionMatchesInFamily(
        stateRoot,
        prepared,
        recordsByFamily.get(prepared) ?? [],
        resolvedContext
      ))
    );
    if (match !== null) return { kind: "registry" as const, match };
    const prepared = [...claimed].sort((left, right) =>
      left.family.id < right.family.id ? -1 : left.family.id === right.family.id ? 0 : 1
    )[0]!;
    return {
      kind: "non_admission" as const,
      familyId: prepared.family.id,
      policy: prepared.family.nonAdmission
    };
  });
}

type ProductionDispatchMemo = WeakMap<
  readonly ProductionFamily[],
  Map<
    ProductionMatchContext["relations"],
    Map<ProductionMatchContext["clause"], Map<string, ProductionDispatchResolution>>
  >
>;

const productionDispatchMemo = new WeakMap<TailRoot, ProductionDispatchMemo>();

function productionIntakeMemoKey(intake: ProductionIntakeContext | undefined): string {
  return intake === undefined
    ? ""
    : `${intake.site}|${String(intake.partial)}|${String(intake.conditionalCompactQuoteManner)}`;
}

export function resolveProductionDispatch(
  root: TailRoot,
  context: ProductionMatchContext = {},
  registry: readonly ProductionFamily[] = installedProductionRegistry()
): ProductionDispatchResolution {
  let byRegistry = productionDispatchMemo.get(root);
  if (byRegistry === undefined) {
    byRegistry = new WeakMap();
    productionDispatchMemo.set(root, byRegistry);
  }
  let byRelations = byRegistry.get(registry);
  if (byRelations === undefined) {
    byRelations = new Map();
    byRegistry.set(registry, byRelations);
  }
  let byClause = byRelations.get(context.relations);
  if (byClause === undefined) {
    byClause = new Map();
    byRelations.set(context.relations, byClause);
  }
  let byIntake = byClause.get(context.clause);
  if (byIntake === undefined) {
    byIntake = new Map();
    byClause.set(context.clause, byIntake);
  }
  const intakeKey = productionIntakeMemoKey(context.intake);
  const cached = byIntake.get(intakeKey);
  if (cached !== undefined) return cached;
  const state: ProductionDispatchState = {
    terminal: root.tail.kind === "auxLayer" ? root.tail.terminal : null,
    sfp: root.sfp
  };
  const resolution = resolveProductionDispatchBatch(root, [state], context, registry)[0]!;
  byIntake.set(intakeKey, resolution);
  return resolution;
}

export function probeProductionDispatch(
  root: TailRoot,
  context: ProductionMatchContext = {}
): ProductionDispatchResolution {
  return resolveProductionDispatch(root, context);
}

export function retiredLegacyProductionFamilyId(
  root: TailRoot,
  context: ProductionMatchContext = {},
  registry: readonly ProductionFamily[] = installedProductionRegistry()
): string | null {
  const dispatch = resolveProductionDispatch(root, context, registry);
  const familyId = dispatch.kind === "registry"
    ? dispatch.match.familyId
    : dispatch.kind === "non_admission"
      ? dispatch.familyId
      : null;
  if (familyId === null) return null;
  return registry.find(({ id }) => id === familyId)?.legacyFallback === "retired"
    ? familyId
    : null;
}

export function normalizeProductionMatch(
  root: TailRoot,
  match: ProductionRegistryMatch
): TailRoot {
  return match.record.normalization?.normalize({ root, match }) ?? root;
}

function captureEvidence(
  requirements: readonly ProductionEvidenceRequirement[] | undefined,
  input: ProductionEvidenceInput
): ReadonlyMap<string, readonly StructuralRelation[]> | null {
  const captures = new Map<string, readonly StructuralRelation[]>();
  for (const requirement of requirements ?? []) {
    const selected = selectProductionEvidence(requirement, input);
    if (selected === null) {
      return null;
    }
    const relations = Array.isArray(selected) ? selected : [selected];
    if (relations.length === 0) {
      return null;
    }
    captures.set(requirement.id, relations);
  }
  return captures;
}

function validateWitnessTokenSpan(value: unknown, owner: string): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`invalid production evidence witness span in ${owner}`);
  }
  const span = value as Readonly<Record<string, unknown>>;
  if (!Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.endExclusive) ||
    (span.start as number) < 0 || (span.endExclusive as number) < (span.start as number)) {
    throw new Error(`invalid production evidence witness span in ${owner}`);
  }
}

function validateWitnessAnchor(value: unknown, owner: string): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`invalid production evidence witness anchor in ${owner}`);
  }
  const anchor = value as Readonly<Record<string, unknown>>;
  validateWitnessTokenSpan(anchor.span, owner);
  const nullableString = (candidate: unknown): boolean => candidate === null || typeof candidate === "string";
  const nullableIndex = (candidate: unknown): boolean => candidate === null ||
    (Number.isSafeInteger(candidate) && (candidate as number) >= 0);
  switch (anchor.kind) {
    case "clause":
      if (typeof anchor.clauseId !== "string" || !nullableIndex(anchor.predicateIdx)) {
        throw new Error(`invalid production evidence witness clause anchor in ${owner}`);
      }
      return;
    case "predicate":
      if (!Number.isSafeInteger(anchor.predicateIdx) || (anchor.predicateIdx as number) < 0 ||
        !nullableString(anchor.clauseId)) {
        throw new Error(`invalid production evidence witness predicate anchor in ${owner}`);
      }
      return;
    case "span":
      if (!nullableString(anchor.clauseId)) {
        throw new Error(`invalid production evidence witness span anchor in ${owner}`);
      }
      return;
    case "noun_phrase":
      if (!nullableIndex(anchor.headIdx)) {
        throw new Error(`invalid production evidence witness noun anchor in ${owner}`);
      }
      return;
    default:
      throw new Error(`invalid production evidence witness anchor kind in ${owner}`);
  }
}

function validatePositiveWitnessRelation(value: unknown, owner: string): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`invalid production evidence positive witness relation in ${owner}`);
  }
  const relation = value as Readonly<Record<string, unknown>>;
  if (!(STRUCTURAL_RELATION_KIND_VALUES as readonly unknown[]).includes(relation.kind)) {
    throw new Error(`invalid production evidence witness relation kind in ${owner}`);
  }
  validateWitnessAnchor(relation.source, owner);
  if (relation.target !== null) validateWitnessAnchor(relation.target, owner);
  if (!Array.isArray(relation.markerSpans)) {
    throw new Error(`invalid production evidence witness marker spans in ${owner}`);
  }
  for (const marker of relation.markerSpans) {
    validateWitnessTokenSpan(marker, owner);
    const row = marker as Readonly<Record<string, unknown>>;
    if (typeof row.surface !== "string" ||
      (row.role !== undefined && typeof row.role !== "string")) {
      throw new Error(`invalid production evidence witness marker span in ${owner}`);
    }
  }
  if (relation.projection === null || typeof relation.projection !== "object" ||
    Array.isArray(relation.projection)) {
    throw new Error(`invalid production evidence witness projection in ${owner}`);
  }
  const projection = relation.projection as Readonly<Record<string, unknown>>;
  if (![
    "terminal", "connective", "adversative", "reason", "attributive", "nominalized",
    "listing", "purpose_attributive", "correlative_degree"
  ].includes(projection.sourceForm as string) ||
    (projection.connectiveKind !== undefined && typeof projection.connectiveKind !== "string") ||
    (projection.targetSlot !== undefined && ![
      "clause_prefix", "noun_modifier", "coordination", "sentence_suffix"
    ].includes(projection.targetSlot as string))) {
    throw new Error(`invalid production evidence witness projection in ${owner}`);
  }
  if (relation.confidence !== "strict" && relation.confidence !== "probable" &&
    relation.confidence !== "weak") {
    throw new Error(`invalid production evidence witness confidence in ${owner}`);
  }
  if (relation.provenance !== "structural_relation_owner") {
    throw new Error(`invalid production evidence witness provenance in ${owner}`);
  }
}

function validateProductionEvidencePositiveWitness(
  requirement: ProductionEvidenceRequirement,
  record: ProductionRecord
): void {
  const owner = `${record.id}/${requirement.id}`;
  const witness = requirement.positiveWitness as unknown as Readonly<Record<string, unknown>>;
  if (witness === null || typeof witness !== "object" || Array.isArray(witness) ||
    !Object.hasOwn(witness, "key") || !Object.hasOwn(witness, "args") ||
    Object.keys(witness).some((key) => key !== "key" && key !== "args") ||
    witness.key !== "literal_relations") {
    throw new Error(`invalid production evidence positive witness in ${owner}`);
  }
  const args = witness.args as Readonly<Record<string, unknown>> | undefined;
  if (args === undefined || args === null || typeof args !== "object" || Array.isArray(args) ||
    !Object.hasOwn(args, "relations") || Object.keys(args).some((key) => key !== "relations") ||
    !Array.isArray(args.relations) || args.relations.length === 0) {
    throw new Error(`invalid production evidence positive witness relations in ${owner}`);
  }
  for (const relation of args.relations) {
    validatePositiveWitnessRelation(relation, owner);
  }
}

function validateRecord(record: ProductionRecord): void {
  if (!(PRODUCTION_LOWERING_KEYS as readonly string[]).includes(record.loweringKey)) {
    throw new Error(`unknown production lowering key in ${record.id}: ${record.loweringKey}`);
  }
  const slotIds = new Set<string>();
  for (const slot of record.shape.ops) {
    if (slotIds.has(slot.id)) {
      throw new Error(`duplicate production slot id in ${record.id}: ${slot.id}`);
    }
    slotIds.add(slot.id);
    if (slot.patterns.length === 0) {
      throw new Error(`empty production slot patterns in ${record.id}: ${slot.id}`);
    }
    for (const pattern of slot.patterns) {
      if (pattern.predicate !== undefined &&
        productionOpPredicateKind(pattern.predicate) !== pattern.kind) {
        throw new Error(
          `production op predicate kind mismatch in ${record.id}/${slot.id}: ` +
          `${pattern.kind}/${pattern.predicate.key}`
        );
      }
      if (pattern.predicate !== undefined) validateProductionOpPredicate(pattern.predicate);
    }
    validateCardinality(slot.cardinality, `production slot ${record.id}/${slot.id}`);
  }
  const evidenceIds = new Set<string>();
  for (const requirement of record.evidence ?? []) {
    if (requirement.id.length === 0) {
      throw new Error(`empty production evidence id in ${record.id}`);
    }
    if (evidenceIds.has(requirement.id)) {
      throw new Error(`duplicate production evidence id in ${record.id}: ${requirement.id}`);
    }
    if (requirement.selector === undefined) {
      throw new Error(`invalid production evidence selector in ${record.id}: ${requirement.id}`);
    }
    const nonNegativeInteger = (value: number, field: string): void => {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(
          `invalid production evidence ${field} in ${record.id}: ${requirement.id}`
        );
      }
    };
    switch (requirement.selector.key) {
      case "context_relation_kind":
        if (!STRUCTURAL_RELATION_KIND_VALUES.includes(requirement.selector.args.kind)) {
          throw new Error(
            `invalid production evidence relation kind in ${record.id}: ${requirement.id}`
          );
        }
        break;
      case "context_relation_at":
        nonNegativeInteger(requirement.selector.args.index, "relation index");
        break;
      case "context_relation_at_when_slot_count": {
        const { slotId, count, relationIndex } = requirement.selector.args;
        const slot = record.shape.ops.find(({ id }) => id === slotId);
        if (slot === undefined) {
          throw new Error(
            `unknown production evidence slot in ${record.id}: ${requirement.id}/${slotId}`
          );
        }
        nonNegativeInteger(count, "slot count");
        nonNegativeInteger(relationIndex, "relation index");
        if (count < slot.cardinality.min ||
          (slot.cardinality.max !== null && count > slot.cardinality.max)) {
          throw new Error(
            `unreachable production evidence slot count in ${record.id}: ` +
            `${requirement.id}/${slotId}/${count}`
          );
        }
        break;
      }
      default:
        throw new Error(`invalid production evidence selector in ${record.id}: ${requirement.id}`);
    }
    if (requirement.positiveWitness === undefined) {
      throw new Error(`missing positive production evidence witness in ${record.id}: ${requirement.id}`);
    }
    validateProductionEvidencePositiveWitness(requirement, record);
    evidenceIds.add(requirement.id);
  }
}

function matchShapes(root: TailRoot, shape: ProductionShape): readonly ProductionShapeMatch[] {
  if (shape.root !== "aux_layer" || root.tail.kind !== "auxLayer") {
    return [];
  }
  return matchSlotPartitions(root.tail.ops, shape.ops, 0, 0, new Map()).map((slots) => ({
    layer: root.tail as AuxLayerNode,
    slots
  }));
}

function matchSlotPartitions(
  ops: readonly AuxOpNode[],
  slots: readonly ProductionOpSlot[],
  opIndex: number,
  slotIndex: number,
  captures: ReadonlyMap<string, readonly AuxOpNode[]>
): readonly ReadonlyMap<string, readonly AuxOpNode[]>[] {
  if (slotIndex === slots.length) {
    return opIndex === ops.length ? [captures] : [];
  }

  const slot = slots[slotIndex];
  if (slot === undefined) {
    return [];
  }
  const remaining = ops.length - opIndex;
  const upper = Math.min(slot.cardinality.max ?? remaining, remaining);
  const partitions: ReadonlyMap<string, readonly AuxOpNode[]>[] = [];
  for (let count = upper; count >= slot.cardinality.min; count -= 1) {
    const candidate = ops.slice(opIndex, opIndex + count);
    if (!candidate.every((op) => slot.patterns.some((pattern) => opMatchesPattern(op, pattern)))) {
      continue;
    }
    const nextCaptures = new Map(captures);
    nextCaptures.set(slot.id, candidate);
    partitions.push(...matchSlotPartitions(
      ops,
      slots,
      opIndex + count,
      slotIndex + 1,
      nextCaptures
    ));
  }
  return partitions;
}

function opMatchesPattern(op: AuxOpNode, pattern: ProductionOpPattern): boolean {
  if (op.kind !== pattern.kind) {
    return false;
  }
  if (pattern.predicate === undefined) return true;
  if (productionOpPredicateKind(pattern.predicate) !== pattern.kind) {
    throw new Error(
      `production op predicate kind mismatch: ${pattern.kind}/${pattern.predicate.key}`
    );
  }
  const observedFields = op as unknown as Readonly<Record<string, unknown>>;
  for (const field of productionOpPredicateRequiredFields(pattern.predicate, observedFields)) {
    if (!Object.hasOwn(op, field)) {
      throw new Error(
        `missing required production op predicate field: ` +
        `${pattern.kind}/${pattern.predicate.key}.${field}`
      );
    }
  }
  return evaluateProductionOpPredicate(op, pattern.predicate);
}

function hostConditionsMatch(
  stem: StemNode,
  conditions: ProductionHostConditions | undefined
): boolean {
  if (conditions === undefined) {
    return true;
  }
  if (conditions.stemKinds !== undefined && !conditions.stemKinds.includes(stem.kind)) {
    return false;
  }
  if (
    conditions.stemMoods !== undefined &&
    (stem.stemMood === undefined || !conditions.stemMoods.includes(stem.stemMood))
  ) {
    return false;
  }
  if (
    conditions.sourceShapes !== undefined &&
    (stem.sourcePredicateShape === undefined || !conditions.sourceShapes.includes(stem.sourcePredicateShape))
  ) {
    return false;
  }
  if (!projectionKindsMatch(stem, conditions)) {
    return false;
  }
  return projectionCategoriesMatch(stem, conditions);
}

function projectionKindsMatch(stem: StemNode, conditions: ProductionHostConditions): boolean {
  const values = conditions.projectionKinds;
  if (values === undefined) {
    return true;
  }
  const matches = (value: HeadProjectionKind): boolean => stemSupportsProjectionKind(stem, value);
  return conditions.projectionKindMode === "all" ? values.every(matches) : values.some(matches);
}

function projectionCategoriesMatch(stem: StemNode, conditions: ProductionHostConditions): boolean {
  const values = conditions.projectionCategories;
  if (values === undefined) {
    return true;
  }
  const matches = (value: KoreanRealizationCategory): boolean =>
    stemSupportsProjectionCategory(stem, value);
  return conditions.projectionCategoryMode === "all" ? values.every(matches) : values.some(matches);
}

function terminalConditionsMatch(
  root: TailRoot,
  layer: AuxLayerNode,
  conditions: ProductionTerminalConditions | undefined
): boolean {
  if (conditions === undefined) {
    return true;
  }
  if (conditions.kinds !== undefined && !conditions.kinds.includes(layer.terminal)) {
    return false;
  }
  if (conditions.sfp === "required" && root.sfp === null) {
    return false;
  }
  if (conditions.sfp === "forbidden" && root.sfp !== null) {
    return false;
  }
  if (
    conditions.sfpEffects !== undefined &&
    (root.sfp === null || !conditions.sfpEffects.includes(root.sfp.effect))
  ) {
    return false;
  }
  if (
    conditions.sfpEmphaticQuestion !== undefined &&
    (root.sfp?.emphaticQuestion === true) !== conditions.sfpEmphaticQuestion
  ) {
    return false;
  }
  const hasQuestionPunctuation =
    root.terminalPunctuationRun?.units.includes("question") === true;
  if (
    conditions.terminalPunctuationQuestion === "required" &&
    !hasQuestionPunctuation
  ) {
    return false;
  }
  if (
    conditions.terminalPunctuationQuestion === "forbidden" &&
    hasQuestionPunctuation
  ) {
    return false;
  }
  if (
    conditions.utteranceClosureIn !== undefined &&
    (root.utteranceClosure === undefined || !conditions.utteranceClosureIn.includes(root.utteranceClosure))
  ) {
    return false;
  }
  if (conditions.bareKeijoujiKatakanaRun !== undefined) {
    const payload = layer.terminalPayload;
    const katakanaRun = payload !== undefined &&
      payload.kind === "attributiveBoundary" &&
      payload.bareKeijoujiKatakanaRun === true;
    if ((conditions.bareKeijoujiKatakanaRun === "required") !== katakanaRun) {
      return false;
    }
  }
  if (conditions.explicitAdnominalMarker !== undefined) {
    const payload = layer.terminalPayload;
    const marked = payload !== undefined &&
      payload.kind === "attributiveBoundary" &&
      payload.explicitAdnominalMarker !== undefined;
    if ((conditions.explicitAdnominalMarker === "required") !== marked) {
      return false;
    }
  }
  if (conditions.bareDirectAttributive !== undefined) {
    const payload = layer.terminalPayload;
    const bare = payload !== undefined &&
      payload.kind === "attributiveBoundary" &&
      payload.bareKeijoujiDirectAttributive === true;
    if ((conditions.bareDirectAttributive === "required") !== bare) {
      return false;
    }
  }
  return true;
}

export function productionFamilyConditionsMatch(
  root: TailRoot,
  conditions: ProductionFamilyConditions | undefined
): boolean {
  if (conditions === undefined) {
    return true;
  }
  if (root.tail.kind !== "auxLayer") {
    return false;
  }
  return terminalConditionsMatch(root, root.tail, conditions.terminal);
}

export function productionFamilyClaimDomainMatches(
  root: TailRoot,
  family: ProductionFamily
): boolean {
  if (root.tail.kind !== "auxLayer") {
    return false;
  }
  const layer = root.tail;
  return familyClaimDomainMatchesLayer(root, layer, family);
}

function familyClaimDomainMatchesLayer(
  root: TailRoot,
  layer: AuxLayerNode,
  family: ProductionFamily
): boolean {
  return family.claimDomains.some((domain) =>
    terminalConditionsMatch(root, layer, domain.terminal) &&
    matchClaimDomainSlots(layer.ops, domain.ops)
  );
}

const productionClaimCache = new WeakMap<
  TailRoot,
  WeakMap<readonly ProductionFamily[], Map<ProductionFamily, boolean>>
>();
const compiledProductionClaimCache = new WeakMap<ProductionFamily, CompiledProductionClaim>();

function compiledProductionClaim(family: ProductionFamily): CompiledProductionClaim {
  let compiled = compiledProductionClaimCache.get(family);
  if (compiled === undefined) {
    compiled = compileProductionClaimExpression(family.claim);
    compiledProductionClaimCache.set(family, compiled);
  }
  return compiled;
}

export function evaluateProductionFamilyClaim(
  root: TailRoot,
  family: ProductionFamily,
  registry: readonly ProductionFamily[],
  evaluating = new Set<string>()
): boolean {
  const cached = productionClaimCache.get(root)?.get(registry)?.get(family);
  if (cached !== undefined) return cached;
  if (evaluating.has(family.id)) {
    throw new Error(`cyclic production family claim reference: ${family.id}`);
  }
  evaluating.add(family.id);
  try {
    const referencedClaims = new Map<string, boolean>();
    const view = createProductionClaimView(root, family, (familyId) => {
      const referenced = registry.find(({ id }) => id === familyId) ??
        installedProductionRegistry().find(({ id }) => id === familyId);
      if (referenced === undefined) {
        throw new Error(`unknown production family claim reference: ${familyId}`);
      }
      const result = productionFamilyConditionsMatch(root, referenced.conditions) &&
        productionFamilyClaimDomainMatches(root, referenced) &&
        evaluateProductionFamilyClaim(root, referenced, registry, evaluating);
      referencedClaims.set(familyId, result);
      return result;
    });
    const base = compiledProductionClaim(family)(view);
    const result = base && (family.claimDependencies.sequence.familyClaimRefs ?? []).every(
      ({ familyId, polarity }) => polarity === "requires"
        ? referencedClaims.get(familyId) === true
        : referencedClaims.get(familyId) !== true
    );
    let registryCache = productionClaimCache.get(root);
    if (registryCache === undefined) {
      registryCache = new WeakMap();
      productionClaimCache.set(root, registryCache);
    }
    let familyCache = registryCache.get(registry);
    if (familyCache === undefined) {
      familyCache = new Map();
      registryCache.set(registry, familyCache);
    }
    familyCache.set(family, result);
    return result;
  } finally {
    evaluating.delete(family.id);
  }
}

const claimDomainSlotKindSetCache = new WeakMap<
  ProductionFamilyClaimDomainSlot,
  ReadonlySet<AuxOpKind>
>();

function claimDomainSlotKindSet(
  slot: ProductionFamilyClaimDomainSlot
): ReadonlySet<AuxOpKind> {
  let kinds = claimDomainSlotKindSetCache.get(slot);
  if (kinds === undefined) {
    kinds = new Set(slot.opKinds);
    claimDomainSlotKindSetCache.set(slot, kinds);
  }
  return kinds;
}

interface ClaimDomainOpRequirements {
  readonly admittedKinds: ReadonlySet<AuxOpKind>;
  readonly requiredKindSets: readonly ReadonlySet<AuxOpKind>[];
  readonly minOps: number;
  readonly maxOps: number | null;
}

const claimDomainOpRequirementsCache = new WeakMap<
  readonly ProductionFamilyClaimDomainSlot[],
  ClaimDomainOpRequirements
>();

function claimDomainOpRequirements(
  slots: readonly ProductionFamilyClaimDomainSlot[]
): ClaimDomainOpRequirements {
  let requirements = claimDomainOpRequirementsCache.get(slots);
  if (requirements === undefined) {
    const admittedKinds = new Set<AuxOpKind>();
    const requiredKindSets: ReadonlySet<AuxOpKind>[] = [];
    let minOps = 0;
    let maxOps: number | null = 0;
    for (const slot of slots) {
      const kinds = claimDomainSlotKindSet(slot);
      for (const kind of kinds) admittedKinds.add(kind);
      if (slot.cardinality.min >= 1) requiredKindSets.push(kinds);
      minOps += slot.cardinality.min;
      maxOps = maxOps === null || slot.cardinality.max === null ? null : maxOps + slot.cardinality.max;
    }
    requirements = { admittedKinds, requiredKindSets, minOps, maxOps };
    claimDomainOpRequirementsCache.set(slots, requirements);
  }
  return requirements;
}

function claimDomainOpRequirementsMet(
  ops: readonly AuxOpNode[],
  slots: readonly ProductionFamilyClaimDomainSlot[]
): boolean {
  const { admittedKinds, requiredKindSets, minOps, maxOps } = claimDomainOpRequirements(slots);
  if (ops.length < minOps || (maxOps !== null && ops.length > maxOps)) return false;
  for (const op of ops) {
    if (!admittedKinds.has(op.kind)) return false;
  }
  for (const kinds of requiredKindSets) {
    let present = false;
    for (const op of ops) {
      if (kinds.has(op.kind)) {
        present = true;
        break;
      }
    }
    if (!present) return false;
  }
  return true;
}

export function productionFamilyOpKindPrefilter(
  family: ProductionFamily,
  ops: readonly AuxOpNode[]
): boolean {
  return family.claimDomains.some((domain) => claimDomainOpRequirementsMet(ops, domain.ops));
}

function matchClaimDomainSlots(
  ops: readonly AuxOpNode[],
  slots: readonly ProductionFamilyClaimDomainSlot[]
): boolean {
  if (!claimDomainOpRequirementsMet(ops, slots)) return false;
  const width = slots.length + 1;
  const memo = new Int8Array((ops.length + 1) * width);
  memo.fill(-1);
  const visit = (opIndex: number, slotIndex: number): boolean => {
    const memoIndex = opIndex * width + slotIndex;
    const cached = memo[memoIndex];
    if (cached !== -1) return cached === 1;
    if (slotIndex === slots.length) {
      const matched = opIndex === ops.length;
      memo[memoIndex] = matched ? 1 : 0;
      return matched;
    }
    const slot = slots[slotIndex];
    if (slot === undefined) {
      memo[memoIndex] = 0;
      return false;
    }
    const remaining = ops.length - opIndex;
    const upper = Math.min(slot.cardinality.max ?? remaining, remaining);
    const kinds = claimDomainSlotKindSet(slot);
    for (let count = upper; count >= slot.cardinality.min; count -= 1) {
      let candidateMatches = true;
      for (let offset = 0; offset < count; offset += 1) {
        if (!kinds.has(ops[opIndex + offset]!.kind)) {
          candidateMatches = false;
          break;
        }
      }
      if (candidateMatches && visit(opIndex + count, slotIndex + 1)) {
        memo[memoIndex] = 1;
        return true;
      }
    }
    memo[memoIndex] = 0;
    return false;
  };
  return visit(0, 0);
}

export function productionFamilyClaims(
  root: TailRoot,
  family: ProductionFamily,
  registry: readonly ProductionFamily[] = installedProductionRegistry()
): boolean {
  if (root.tail.kind !== "auxLayer") return false;
  const admitted = productionFamilyConditionsMatch(root, family.conditions) &&
    familyClaimDomainMatchesLayer(root, root.tail as AuxLayerNode, family);
  return admitted && evaluateProductionFamilyClaim(root, family, registry);
}

function clauseConditionsMatch(
  context: ResolvedProductionMatchContext,
  conditions: ProductionClauseConditions | undefined
): boolean {
  if (conditions === undefined) {
    return true;
  }
  if (conditions.clauseContext === "required" && context.clause === undefined) {
    return false;
  }
  if (conditions.clauseContext === "forbidden" && context.clause !== undefined) {
    return false;
  }
  const boundary = context.clause?.kind === "boundary"
    ? context.clause.outgoingBoundary
    : context.clause?.clauseRole.outgoingBoundary;
  if (
    conditions.boundaryKinds !== undefined &&
    (boundary === undefined || !conditions.boundaryKinds.includes(boundary.kind))
  ) {
    return false;
  }
  if (conditions.connectiveKinds !== undefined) {
    if (
      boundary === undefined ||
      boundary.kind === "terminal" ||
      !conditions.connectiveKinds.includes(boundary.connectiveKind)
    ) {
      return false;
    }
  }
  if (
    conditions.intakeSites !== undefined &&
    (context.intake === undefined || !conditions.intakeSites.includes(context.intake.site))
  ) {
    return false;
  }
  if (conditions.partial !== undefined && context.intake?.partial !== conditions.partial) {
    return false;
  }
  if (
    conditions.conditionalCompactQuoteManner === "required" &&
    context.intake?.conditionalCompactQuoteManner !== true
  ) {
    return false;
  }
  if (
    conditions.conditionalCompactQuoteManner === "forbidden" &&
    context.intake?.conditionalCompactQuoteManner === true
  ) {
    return false;
  }
  return true;
}
