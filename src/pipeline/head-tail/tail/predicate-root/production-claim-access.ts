import type {
  AuxOpKind,
  AuxOpNode,
  HeadProjectionKind,
  KoreanRealizationCategory,
  QuoteBinding,
  SfpEffect,
  SourcePredicateShape,
  StemMood,
  StemNode,
  TailRoot,
  TerminalKind
} from "./grammar.js";
import {
  auxOpClosesClause,
  stemClosesClause,
  stemSupportsProjectionCategory,
  stemSupportsProjectionKind,
  tailRootAdmitsOnlyProjectionCategory
} from "./inspect.js";
import {
  evaluateProductionOpPredicate,
  productionOpPredicateFields,
  productionOpPredicateRequiredFields
} from "./production-admission-contract.js";
import type {
  ProductionFamily,
  ProductionFamilyClaimSequenceRangeBoundary,
  ProductionOpPattern
} from "./production-registry.js";

type DistributedKeys<T> = T extends unknown ? keyof T : never;
type ClaimOpField<K extends AuxOpKind> = Exclude<
  DistributedKeys<Extract<AuxOpNode, { readonly kind: K }>>,
  "kind" | "source"
>;
type FieldValueFromOp<Op, F extends PropertyKey> = Op extends unknown
  ? F extends keyof Op ? Op[F] : never
  : never;
type ClaimOpFieldValue<
  K extends AuxOpKind,
  F extends ClaimOpField<K>
> = FieldValueFromOp<Extract<AuxOpNode, { readonly kind: K }>, F>;

export interface ProductionClaimOpView {
  readonly kind: AuxOpKind;
  matches(pattern: ProductionOpPattern): boolean;
  read<K extends AuxOpKind, F extends ClaimOpField<K>>(
    kind: K,
    field: F
  ): ClaimOpFieldValue<K, F> | undefined;
}

export interface ProductionClaimSequenceView {
  lengthEquals(threshold: number): boolean;
  lengthAtLeast(threshold: number): boolean;
  atAbsolute(index: number): ProductionClaimOpView | undefined;
  atRelative(offset: number): ProductionClaimOpView | undefined;
  firstOfKindsAtRelative(
    opKinds: readonly AuxOpKind[],
    relativeOffset: number,
    startIndex?: number
  ): boolean;
  atFirstOffset(
    opKinds: readonly AuxOpKind[],
    offset: number,
    startIndex?: number
  ): ProductionClaimOpView | undefined;
  aggregate(id: string): boolean;
  kindCount(opKinds: readonly AuxOpKind[], cap: number): number;
}

export interface ProductionClaimView {
  readonly sequence: ProductionClaimSequenceView;
  terminalIs(values: readonly (TerminalKind | null)[]): boolean;
  sfpPresent(): boolean;
  sfpEffectIs(values: readonly (SfpEffect | null)[]): boolean;
  quoteBinding(): QuoteBinding;
  stemKind(): StemNode["kind"];
  stemMood(): StemMood | undefined;
  sourcePredicateShape(): SourcePredicateShape | undefined;
  sourceClauseClosing(): boolean;
  supportsProjectionKind(kind: HeadProjectionKind): boolean;
  supportsProjectionCategory(category: KoreanRealizationCategory): boolean;
  admitsOnlyProjectionCategory(category: KoreanRealizationCategory): boolean;
}

export type ProductionClaimOpSelector =
  | { readonly kind: "absolute"; readonly index: number }
  | { readonly kind: "relative"; readonly offset: number }
  | {
      readonly kind: "first_of_kinds";
      readonly opKinds: readonly AuxOpKind[];
      readonly offset: number;
      readonly startIndex?: number;
    };

export type ProductionClaimExpression =
  | { readonly kind: "constant"; readonly value: boolean }
  | { readonly kind: "all" | "any"; readonly terms: readonly ProductionClaimExpression[] }
  | { readonly kind: "not"; readonly term: ProductionClaimExpression }
  | {
      readonly kind: "sequence_length";
      readonly comparison: "equals" | "at_least";
      readonly value: number;
    }
  | {
      readonly kind: "sequence_op";
      readonly selector: ProductionClaimOpSelector;
      readonly patterns: readonly ProductionOpPattern[];
    }
  | {
      readonly kind: "sequence_op_presence";
      readonly selector: ProductionClaimOpSelector;
      readonly present: boolean;
    }
  | {
      readonly kind: "first_of_kinds_at_relative";
      readonly opKinds: readonly AuxOpKind[];
      readonly relativeOffset: number;
      readonly startIndex?: number;
    }
  | { readonly kind: "aggregate"; readonly id: string }
  | {
      readonly kind: "kind_count";
      readonly opKinds: readonly AuxOpKind[];
      readonly cap: number;
      readonly comparison: "equals" | "greater_than";
      readonly value: number;
    }
  | {
      readonly kind: "terminal_membership";
      readonly values: readonly (TerminalKind | null)[];
    }
  | { readonly kind: "sfp_presence"; readonly present: boolean }
  | {
      readonly kind: "sfp_effect_membership";
      readonly values: readonly (SfpEffect | null)[];
    }
  | {
      readonly kind: "root_membership";
      readonly axis: "quote_binding";
      readonly values: readonly QuoteBinding[];
    }
  | {
      readonly kind: "host_membership";
      readonly axis: "stem_kind";
      readonly values: readonly StemNode["kind"][];
    }
  | {
      readonly kind: "host_membership";
      readonly axis: "stem_mood";
      readonly values: readonly (StemMood | undefined)[];
    }
  | {
      readonly kind: "host_membership";
      readonly axis: "source_predicate_shape";
      readonly values: readonly (SourcePredicateShape | undefined)[];
    }
  | {
      readonly kind: "host_membership";
      readonly axis: "source_clause_closing";
      readonly values: readonly boolean[];
    }
  | {
      readonly kind: "projection";
      readonly mode: "supports_kind" | "supports_category" | "admits_only_category";
      readonly value: HeadProjectionKind | KoreanRealizationCategory;
    };

export type CompiledProductionClaim = (view: ProductionClaimView) => boolean;

function selectedClaimOp(
  view: ProductionClaimView,
  selector: ProductionClaimOpSelector
): ProductionClaimOpView | undefined {
  switch (selector.kind) {
    case "absolute":
      return view.sequence.atAbsolute(selector.index);
    case "relative":
      return view.sequence.atRelative(selector.offset);
    case "first_of_kinds":
      return view.sequence.atFirstOffset(
        selector.opKinds,
        selector.offset,
        selector.startIndex
      );
  }
}

export function compileProductionClaimExpression(
  expression: ProductionClaimExpression
): CompiledProductionClaim {
  switch (expression.kind) {
    case "constant":
      return () => expression.value;
    case "all": {
      const terms = expression.terms.map(compileProductionClaimExpression);
      return (view) => terms.every((term) => term(view));
    }
    case "any": {
      const terms = expression.terms.map(compileProductionClaimExpression);
      return (view) => terms.some((term) => term(view));
    }
    case "not": {
      const term = compileProductionClaimExpression(expression.term);
      return (view) => !term(view);
    }
    case "sequence_length":
      return expression.comparison === "equals"
        ? (view) => view.sequence.lengthEquals(expression.value)
        : (view) => view.sequence.lengthAtLeast(expression.value);
    case "sequence_op":
      return (view) => {
        const op = selectedClaimOp(view, expression.selector);
        return op !== undefined && expression.patterns.some((pattern) => op.matches(pattern));
      };
    case "sequence_op_presence":
      return expression.present
        ? (view) => selectedClaimOp(view, expression.selector) !== undefined
        : (view) => selectedClaimOp(view, expression.selector) === undefined;
    case "first_of_kinds_at_relative":
      return (view) => view.sequence.firstOfKindsAtRelative(
        expression.opKinds,
        expression.relativeOffset,
        expression.startIndex
      );
    case "aggregate":
      return (view) => view.sequence.aggregate(expression.id);
    case "kind_count":
      return expression.comparison === "equals"
        ? (view) => view.sequence.kindCount(expression.opKinds, expression.cap) === expression.value
        : (view) => view.sequence.kindCount(expression.opKinds, expression.cap) > expression.value;
    case "terminal_membership":
      return (view) => view.terminalIs(expression.values);
    case "sfp_presence":
      return expression.present ? (view) => view.sfpPresent() : (view) => !view.sfpPresent();
    case "sfp_effect_membership":
      return (view) => view.sfpEffectIs(expression.values);
    case "root_membership":
      return (view) => expression.values.includes(view.quoteBinding());
    case "host_membership":
      switch (expression.axis) {
        case "stem_kind":
          return (view) => expression.values.includes(view.stemKind());
        case "stem_mood":
          return (view) => expression.values.includes(view.stemMood());
        case "source_predicate_shape":
          return (view) => expression.values.includes(view.sourcePredicateShape());
        case "source_clause_closing":
          return (view) => expression.values.includes(view.sourceClauseClosing());
      }
    case "projection":
      switch (expression.mode) {
        case "supports_kind":
          return (view) => view.supportsProjectionKind(expression.value as HeadProjectionKind);
        case "supports_category":
          return (view) => view.supportsProjectionCategory(
            expression.value as KoreanRealizationCategory
          );
        case "admits_only_category":
          return (view) => view.admitsOnlyProjectionCategory(
            expression.value as KoreanRealizationCategory
          );
      }
  }
}

export function readProductionClaimOp<
  K extends AuxOpKind,
  F extends ClaimOpField<K>
>(
  op: ProductionClaimOpView | undefined,
  kind: K,
  field: F
): ClaimOpFieldValue<K, F> | undefined {
  return op?.read(kind, field);
}

function normalizedKinds(opKinds: readonly AuxOpKind[]): string {
  return [...new Set(opKinds)].sort().join("|");
}

function firstSelectorKey(opKinds: readonly AuxOpKind[], startIndex = 0): string {
  return `${normalizedKinds(opKinds)}@${startIndex}`;
}

function selectorKey(opKinds: readonly AuxOpKind[]): string {
  return normalizedKinds(opKinds);
}

function valueSelectorKey(values: readonly (string | null)[]): string {
  return [...new Set(values)].map((value) => value ?? "<null>").sort().join("|");
}

function cloneClaimValue<T>(value: T): T {
  if (typeof value === "function") {
    throw new Error("function-valued production claim payload");
  }
  if (typeof value === "symbol") {
    throw new Error("symbol-valued production claim payload");
  }
  if (value === null || typeof value !== "object") return value;
  const symbols = Object.getOwnPropertySymbols(value);
  if (symbols.length > 0) {
    throw new Error(`symbol-keyed production claim payload: ${String(symbols[0])}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new Error(`accessor production claim payload: ${key}`);
    }
  }
  if (Array.isArray(value)) {
    const copy = new Array(value.length);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (key === "length") continue;
      Object.defineProperty(copy, key, {
        ...descriptor,
        value: cloneClaimValue(descriptor.value)
      });
    }
    return Object.freeze(copy) as T;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("unsupported non-plain production claim payload");
  }
  const copy: Record<string, unknown> = Object.create(null);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    Object.defineProperty(copy, key, {
      ...descriptor,
      value: cloneClaimValue(descriptor.value)
    });
  }
  return Object.freeze(copy) as T;
}

function claimOpDescriptors(op: AuxOpNode): PropertyDescriptorMap {
  const symbols = Object.getOwnPropertySymbols(op);
  if (symbols.length > 0) {
    throw new Error(`symbol-keyed production claim op: ${String(symbols[0])}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(op);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new Error(`accessor production claim op: ${key}`);
    }
  }
  return descriptors;
}

class ClaimOpView implements ProductionClaimOpView {
  readonly kind: AuxOpKind;
  readonly #fields: ReadonlyMap<string, unknown>;
  readonly #presentFields: ReadonlySet<string>;

  constructor(op: AuxOpNode, fields: readonly string[]) {
    const descriptors = claimOpDescriptors(op);
    const kind = descriptors.kind?.value as AuxOpKind | undefined;
    if (kind === undefined) throw new Error("production claim op has no own kind");
    this.kind = kind;
    this.#presentFields = new Set(fields.filter((field) => descriptors[field] !== undefined));
    const copiedFields = fields.map((field) => [
      field,
      cloneClaimValue(descriptors[field]?.value)
    ] as const);
    this.#fields = new Map(copiedFields);
    Object.freeze(this);
  }

  read<K extends AuxOpKind, F extends ClaimOpField<K>>(
    kind: K,
    field: F
  ): ClaimOpFieldValue<K, F> | undefined {
    if (this.kind !== kind) return undefined;
    if (!this.#fields.has(field as string)) {
      throw new Error(`undeclared production claim op field: ${kind}.${String(field)}`);
    }
    return this.#fields.get(field as string) as ClaimOpFieldValue<K, F> | undefined;
  }

  matches(pattern: ProductionOpPattern): boolean {
    if (pattern.kind !== this.kind) return false;
    if (pattern.predicate === undefined) return true;
    for (const field of productionOpPredicateFields(pattern.predicate)) {
      if (!this.#fields.has(field)) {
        throw new Error(`undeclared production claim op field: ${this.kind}.${field}`);
      }
    }
    const observedFields = Object.fromEntries(this.#fields);
    for (const field of productionOpPredicateRequiredFields(pattern.predicate, observedFields)) {
      if (!this.#presentFields.has(field)) {
        throw new Error(`missing required production claim op field: ${this.kind}.${field}`);
      }
    }
    const candidate = {
      kind: this.kind,
      source: { tokens: [], tokenIndices: [] },
      ...observedFields
    } as unknown as AuxOpNode;
    return evaluateProductionOpPredicate(candidate, pattern.predicate);
  }
}

function resolveBoundary(
  ops: readonly AuxOpNode[],
  boundary: ProductionFamilyClaimSequenceRangeBoundary
): number | null {
  switch (boundary.kind) {
    case "absolute":
      return Math.min(ops.length, Math.max(0, boundary.index));
    case "relative":
      return Math.min(ops.length, Math.max(0, ops.length + boundary.offset));
    case "first_of_kinds": {
      const startIndex = boundary.startIndex ?? 0;
      const relativeIndex = ops.slice(startIndex)
        .findIndex((op) => boundary.opKinds.includes(op.kind));
      const index = relativeIndex < 0 ? -1 : startIndex + relativeIndex;
      return index < 0 ? null : Math.min(ops.length, Math.max(0, index + boundary.offset));
    }
  }
}

function hostDependencyError(access: string): never {
  throw new Error(`undeclared production claim host access: ${access}`);
}

function rootDependencyError(access: string): never {
  throw new Error(`undeclared production claim root access: ${access}`);
}

function terminalDependencyError(access: string): never {
  throw new Error(`undeclared production claim terminal access: ${access}`);
}

function sequenceDependencyError(access: string): never {
  throw new Error(`undeclared production claim sequence access: ${access}`);
}

export function createProductionClaimView(
  root: TailRoot,
  family: ProductionFamily,
  resolveFamilyClaim: (familyId: string) => boolean
): ProductionClaimView {
  if (root.tail.kind !== "auxLayer") {
    throw new Error("production claim view requires an aux-layer root");
  }
  const layer = root.tail;
  const dependencies = family.claimDependencies;
  const sequenceDependencies = dependencies.sequence;
  const opFields = new Map<AuxOpKind, readonly string[]>(
    (dependencies.ops ?? []).map((dependency) => [dependency.kind, dependency.fields])
  );
  const projectedOps = new Map<number, ProductionClaimOpView>();
  const project = (index: number): ProductionClaimOpView | undefined => {
    const op = layer.ops[index];
    if (op === undefined) return undefined;
    const cached = projectedOps.get(index);
    if (cached !== undefined) return cached;
    const projected = new ClaimOpView(op, opFields.get(op.kind) ?? []);
    projectedOps.set(index, projected);
    return projected;
  };

  const lengthComparisons = new Map<number, number>(
    (sequenceDependencies.lengthThresholds ?? []).map((threshold) => [
      threshold,
      Math.sign(layer.ops.length - threshold)
    ])
  );
  const absolute = new Map<number, ProductionClaimOpView | undefined>();
  const relative = new Map<number, ProductionClaimOpView | undefined>();
  const firstRelativeMatches = new Map<string, boolean>();
  const firstOffsets = new Map<string, ProductionClaimOpView | undefined>();

  for (const dependency of sequenceDependencies.positions ?? []) {
    switch (dependency.kind) {
      case "absolute":
        absolute.set(dependency.index, project(dependency.index));
        break;
      case "relative":
        relative.set(dependency.offset, project(layer.ops.length + dependency.offset));
        break;
      case "first_of_kinds": {
        const startIndex = dependency.startIndex ?? 0;
        const key = firstSelectorKey(dependency.opKinds, startIndex);
        const relativeAnchor = layer.ops.slice(startIndex)
          .findIndex((op) => dependency.opKinds.includes(op.kind));
        const anchor = relativeAnchor < 0 ? -1 : startIndex + relativeAnchor;
        for (const offset of dependency.offsets) {
          firstOffsets.set(`${key}:${offset}`, anchor < 0 ? undefined : project(anchor + offset));
        }
        for (const relativeOffset of dependency.relativeMatches ?? []) {
          firstRelativeMatches.set(
            `${key}:${relativeOffset}`,
            anchor >= 0 && anchor === layer.ops.length + relativeOffset
          );
        }
        break;
      }
    }
  }

  const aggregates = new Map<string, boolean>();
  for (const aggregate of sequenceDependencies.aggregates ?? []) {
    const start = aggregate.range === undefined
      ? 0
      : resolveBoundary(layer.ops, aggregate.range.start);
    const end = aggregate.range === undefined
      ? layer.ops.length
      : resolveBoundary(layer.ops, aggregate.range.end);
    const lower = start === null || end === null || end <= start ? 0 : start;
    const upper = start === null || end === null || end <= start ? 0 : end;
    const selected = layer.ops.slice(lower, upper);
    let result: boolean;
    switch (aggregate.kind) {
      case "some_kind":
        result = selected.some((op) => aggregate.opKinds.includes(op.kind));
        break;
      case "every_kind_in":
        result = selected.every((op) => aggregate.opKinds.includes(op.kind));
        break;
      case "some_pattern":
        result = selected.some((_, index) => {
          const claimOp = project(lower + index);
          return claimOp !== undefined && aggregate.patterns.some((pattern) =>
            claimOp.matches(pattern)
          );
        });
        break;
      case "every_filtered_pattern": {
        const filtered = selected.flatMap((op, index) =>
          op.kind === aggregate.pattern.kind ? [project(lower + index)!] : []
        );
        result = (!aggregate.requireAtLeastOne || filtered.length > 0) &&
          filtered.every((claimOp) => claimOp.matches(aggregate.pattern));
        break;
      }
      case "last_closes_clause": {
        const last = selected.at(-1);
        result = last !== undefined && auxOpClosesClause(last);
        break;
      }
    }
    aggregates.set(aggregate.id, result);
  }

  const kindCounts = new Map<string, number>();
  for (const dependency of sequenceDependencies.kindCounts ?? []) {
    kindCounts.set(
      `${selectorKey(dependency.opKinds)}:${dependency.cap}`,
      Math.min(
        dependency.cap,
        layer.ops.filter((op) => dependency.opKinds.includes(op.kind)).length
      )
    );
  }

  const terminalMemberships = new Map<string, boolean>();
  const sfpEffectMemberships = new Map<string, boolean>();
  let exposesSfpPresence = false;
  const host = dependencies.host;
  const rootDependencies = dependencies.root;
  const quoteBinding = root.quoteBinding;
  const terminalValue = layer.terminal;
  const sfpPresent = root.sfp !== null;
  const sfpEffect = root.sfp?.effect;
  for (const dependency of dependencies.terminal ?? []) {
    switch (dependency.kind) {
      case "terminal_membership":
        terminalMemberships.set(
          valueSelectorKey(dependency.values),
          dependency.values.includes(terminalValue)
        );
        break;
      case "sfp_presence":
        exposesSfpPresence = true;
        break;
      case "sfp_effect_membership":
        sfpEffectMemberships.set(
          valueSelectorKey(dependency.values),
          root.sfp !== null && dependency.values.includes(sfpEffect ?? null)
        );
        break;
    }
  }
  const stemKind = layer.stem.kind;
  const stemMood = layer.stem.stemMood;
  const sourcePredicateShape = layer.stem.sourcePredicateShape;
  const sourceClauseClosing = stemClosesClause(layer.stem);
  const projectionKinds = new Map((host?.projectionKinds ?? []).map((kind) => [
    kind,
    stemSupportsProjectionKind(layer.stem, kind)
  ]));
  const projectionCategories = new Map((host?.projectionCategories ?? []).map((category) => [
    category,
    stemSupportsProjectionCategory(layer.stem, category)
  ]));
  const admittedOnlyProjectionCategories = new Map(
    (host?.admittedOnlyProjectionCategories ?? []).map((category) => [
      category,
      tailRootAdmitsOnlyProjectionCategory(root, category)
    ])
  );
  for (const { familyId } of sequenceDependencies.familyClaimRefs ?? []) {
    resolveFamilyClaim(familyId);
  }
  const sequence: ProductionClaimSequenceView = Object.freeze({
    lengthEquals(threshold: number): boolean {
      const comparison = lengthComparisons.get(threshold);
      if (comparison === undefined) return sequenceDependencyError(`length[${threshold}]`);
      return comparison === 0;
    },
    lengthAtLeast(threshold: number): boolean {
      const comparison = lengthComparisons.get(threshold);
      if (comparison === undefined) return sequenceDependencyError(`length[${threshold}]`);
      return comparison >= 0;
    },
    atAbsolute(index: number): ProductionClaimOpView | undefined {
      if (!absolute.has(index)) return sequenceDependencyError(`absolute[${index}]`);
      return absolute.get(index);
    },
    atRelative(offset: number): ProductionClaimOpView | undefined {
      if (!relative.has(offset)) return sequenceDependencyError(`relative[${offset}]`);
      return relative.get(offset);
    },
    firstOfKindsAtRelative(
      opKinds: readonly AuxOpKind[],
      relativeOffset: number,
      startIndex = 0
    ): boolean {
      const key = `${firstSelectorKey(opKinds, startIndex)}:${relativeOffset}`;
      if (!firstRelativeMatches.has(key)) {
        return sequenceDependencyError(`first-relative[${key}]`);
      }
      return firstRelativeMatches.get(key)!;
    },
    atFirstOffset(
      opKinds: readonly AuxOpKind[],
      offset: number,
      startIndex = 0
    ): ProductionClaimOpView | undefined {
      const key = `${firstSelectorKey(opKinds, startIndex)}:${offset}`;
      if (!firstOffsets.has(key)) return sequenceDependencyError(`first-offset[${key}]`);
      return firstOffsets.get(key);
    },
    aggregate(id: string): boolean {
      if (!aggregates.has(id)) return sequenceDependencyError(`aggregate[${id}]`);
      return aggregates.get(id)!;
    },
    kindCount(opKinds: readonly AuxOpKind[], cap: number): number {
      const key = `${selectorKey(opKinds)}:${cap}`;
      const value = kindCounts.get(key);
      if (value === undefined) return sequenceDependencyError(`kind-count[${key}]`);
      return value;
    }
  });

  return Object.freeze({
    sequence,
    terminalIs: (values: readonly (TerminalKind | null)[]) => {
      const key = valueSelectorKey(values);
      return terminalMemberships.has(key)
        ? terminalMemberships.get(key)!
        : terminalDependencyError(`terminal-membership[${key}]`);
    },
    sfpPresent: () => exposesSfpPresence
      ? sfpPresent
      : terminalDependencyError("sfp_presence"),
    sfpEffectIs: (values: readonly (SfpEffect | null)[]) => {
      const key = valueSelectorKey(values);
      return sfpEffectMemberships.has(key)
        ? sfpEffectMemberships.get(key)!
        : terminalDependencyError(`sfp-effect-membership[${key}]`);
    },
    quoteBinding: () => rootDependencies?.quoteBinding === true
      ? quoteBinding
      : rootDependencyError("quoteBinding"),
    stemKind: () => host?.stemKind === true
      ? stemKind
      : hostDependencyError("stemKind"),
    stemMood: () => host?.stemMood === true
      ? stemMood
      : hostDependencyError("stemMood"),
    sourcePredicateShape: () => host?.sourcePredicateShape === true
      ? sourcePredicateShape
      : hostDependencyError("sourcePredicateShape"),
    sourceClauseClosing: () => host?.sourceClauseClosing === true
      ? sourceClauseClosing
      : hostDependencyError("sourceClauseClosing"),
    supportsProjectionKind: (kind: HeadProjectionKind) =>
      projectionKinds.has(kind)
        ? projectionKinds.get(kind)!
        : hostDependencyError(`projectionKind[${kind}]`),
    supportsProjectionCategory: (category: KoreanRealizationCategory) =>
      projectionCategories.has(category)
        ? projectionCategories.get(category)!
        : hostDependencyError(`projectionCategory[${category}]`),
    admitsOnlyProjectionCategory: (category: KoreanRealizationCategory) =>
      admittedOnlyProjectionCategories.has(category)
        ? admittedOnlyProjectionCategories.get(category)!
        : hostDependencyError(`admittedOnlyProjectionCategory[${category}]`)
  });
}


export function claimSequenceIndexFromEnd(
  ops: readonly AuxOpNode[],
  offset: number
): number {
  return ops.length + offset;
}

export function claimSequenceFindIndexOfKinds(
  ops: readonly AuxOpNode[],
  opKinds: readonly AuxOpKind[],
  predicate?: (op: AuxOpNode, index: number) => boolean
): number {
  return ops.findIndex((op, index) =>
    opKinds.includes(op.kind) && (predicate?.(op, index) ?? true)
  );
}

function normalizeSequenceBoundary(
  length: number,
  boundary: number,
  fallback: number
): number {
  if (!Number.isFinite(boundary)) return fallback;
  const integer = Math.trunc(boundary);
  return integer < 0
    ? Math.max(0, length + integer)
    : Math.min(length, integer);
}

export function claimSequenceSomeOfKinds(
  ops: readonly AuxOpNode[],
  opKinds: readonly AuxOpKind[],
  predicate?: (op: AuxOpNode, index: number) => boolean,
  start = 0,
  end = Number.POSITIVE_INFINITY
): boolean {
  const lower = normalizeSequenceBoundary(ops.length, start, 0);
  const upper = Math.max(lower, normalizeSequenceBoundary(ops.length, end, ops.length));
  for (let index = lower; index < upper; index++) {
    const op = ops[index]!;
    if (opKinds.includes(op.kind) && (predicate?.(op, index) ?? true)) return true;
  }
  return false;
}
