import type { RuntimeHaruToken } from "../../types/token.js";
import { isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan, type AttributiveRealization, type LemmaRealization, type RenderPlan, type PredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { LookupTables } from "../lookup-tables.js";
import type { NominalHeadTailChainPlan } from "../head-tail/lifecycle/head-tail-render-plan.js";
import { type TranslationUnit, UnitType } from "../translation/unit.js";
import { selectPlainVerbAttributiveEnding } from "../attributive.js";
import type { StructuralRelation, StructuralNominalExemplificationPayload } from "./types.js";
import { POS0, POS5A, 動詞, 連用形_, 동사, 구 } from "../../types/pos.js";
import { type RelationRenderOperation, relationSourcePredicateIdx, uniqueSorted } from "./render-unit-spans.js";

export function buildPunctuatedAttributiveStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  if (options.relation.nominalExemplification !== undefined) {
    return buildNominalExemplificationAttributiveRenderOperation({
      ...options,
      exemplification: options.relation.nominalExemplification,
    });
  }
  const unitIndex = sourcePredicateUnitIndexForRelation(options.units, options.relation, options.sourceUnitIndexes);
  if (unitIndex === null) {
    return null;
  }
  const unit = options.units[unitIndex];
  if (unit === undefined || unit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const projectedPlan = projectUnitAttributivePlan(unit, targetHeadToken(options.tokens, options.relation), {
    tokens: options.tokens,
    lookups: options.lookups,
  });
  if (projectedPlan === null) {
    return null;
  }
  return {
    relation: options.relation,
    insertBeforeUnitIndex: unitIndex,
    suppressUnitIndexes: [unitIndex],
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: [...unit.jpIndices],
    renderPlan: projectedPlan,
  };
}

function buildNominalExemplificationAttributiveRenderOperation(options: {
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly exemplification: StructuralNominalExemplificationPayload;
}): RelationRenderOperation | null {
  const exemplification = options.exemplification;
  const hostUnitIndex = sourcePredicateUnitIndexForRelation(options.units, options.relation, options.sourceUnitIndexes);
  if (hostUnitIndex === null) {
    return null;
  }
  const absorbedStart = exemplification.exemplificationMarkerSpan?.start ?? exemplification.quoteMarkerSpan.start;
  const carrierUnitIndexes = uniqueSorted([hostUnitIndex, ...options.markerUnitIndexes])
    .filter((unitIndex) => options.units[unitIndex]?.unitType !== UnitType.SYMBOL);
  if (carrierUnitIndexes.some((unitIndex) =>
    options.units[unitIndex]?.jpIndices.every((jpIndex) => absorbedStart <= jpIndex) !== true
  )) {
    return null;
  }
  return {
    relation: options.relation,
    insertBeforeUnitIndex: carrierUnitIndexes[0] ?? hostUnitIndex,
    suppressUnitIndexes: carrierUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(carrierUnitIndexes.flatMap((unitIndex) => options.units[unitIndex]?.jpIndices ?? [])),
    renderPlan: {
      kind: "fixedText",
      text: exemplification.exemplificationMarkerSpan === null ? "같은" : "등의",
      koreanPos: 구,
    },
  };
}

export function buildPurposeModifierStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  for (let index = options.sourceUnitIndexes.length - 1; index >= 0; index -= 1) {
    const unitIndex = options.sourceUnitIndexes[index];
    const unit = unitIndex === undefined ? undefined : options.units[unitIndex];
    if (unitIndex === undefined || unit === undefined || unit.unitType === UnitType.SYMBOL) {
      continue;
    }
    const projectedPlan = projectUnitPurposeAttributivePlan(unit);
    if (projectedPlan === null) {
      continue;
    }
    const suppressUnitIndexes = uniqueSorted([unitIndex, ...options.markerUnitIndexes])
      .filter((candidateIndex) => options.units[candidateIndex]?.unitType !== UnitType.SYMBOL);
    return {
      relation: options.relation,
      insertBeforeUnitIndex: unitIndex,
      suppressUnitIndexes,
      sourceUnitIndexes: options.sourceUnitIndexes,
      targetUnitIndexes: options.targetUnitIndexes,
      projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
        options.units[candidateIndex]?.jpIndices ?? []
      ))),
      renderPlan: projectedPlan,
    };
  }
  return null;
}

function sourcePredicateUnitIndexForRelation(
  units: readonly TranslationUnit[],
  relation: StructuralRelation,
  sourceUnitIndexes: readonly number[],
): number | null {
  const predicateIdx = relationSourcePredicateIdx(relation);
  if (predicateIdx === null) {
    return null;
  }
  return sourceUnitIndexes.find((unitIndex) => units[unitIndex]?.jpIndices.includes(predicateIdx) === true) ?? null;
}

function projectUnitAttributivePlan(
  unit: TranslationUnit,
  headNounToken: RuntimeHaruToken | null,
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly lookups: LookupTables;
  },
): RenderPlan | null {
  const plan = unit.renderPlan;
  if (plan === null) {
    return null;
  }
  if (plan.kind === "attributive") {
    return plan;
  }
  if (plan.kind === "lemma") {
    return projectLemmaAttributivePlan(plan, unit, headNounToken, options);
  }
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return projectPredicateHeadTailAttributivePlan(plan);
  }
  return null;
}

function projectLemmaAttributivePlan(
  plan: LemmaRealization,
  unit: TranslationUnit,
  headNounToken: RuntimeHaruToken | null,
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly lookups: LookupTables;
  },
): AttributiveRealization | null {
  if (plan.prefix !== undefined && typeof plan.prefix !== "string") {
    return null;
  }
  const plainVerbEnding = plainVerbAttributiveEndingForProjection(plan, unit, headNounToken, options);
  return {
    kind: "attributive",
    koreanLemma: plan.koreanLemma,
    irregular: plan.irregular,
    koreanPos: plan.koreanPos,
    auxTokens: plan.auxTokens,
    contentToken: unit.jpHead,
    ...(plan.prefix === undefined ? {} : { prefix: plan.prefix }),
    ...(plan.sahenNoun === undefined ? {} : { sahenNoun: plan.sahenNoun }),
    ...(headNounToken === null ? {} : { headNounToken }),
    ...(plainVerbEnding === null ? {} : { plainVerbEnding }),
    ...(plan.voice === undefined ? {} : { voice: plan.voice }),
    ...(plan.passiveClass === undefined ? {} : { passiveClass: plan.passiveClass }),
    ...(isRenyouLemmaProjectionHost(unit.jpHead) ? { tailLemmaMode: true } : {}),
    ...(plan.teIruContractToPast === undefined ? {} : { teIruContractToPast: plan.teIruContractToPast }),
  };
}

function isRenyouLemmaProjectionHost(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS5A)) === (動詞 | 連用形_);
}

function plainVerbAttributiveEndingForProjection(
  plan: LemmaRealization,
  unit: TranslationUnit,
  headNounToken: RuntimeHaruToken | null,
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly lookups: LookupTables;
  },
): string | null {
  if (plan.koreanPos !== 동사 || plan.auxTokens.length !== 0) {
    return null;
  }
  const contentIdx = unit.jpIndices[0] ?? null;
  if (contentIdx === null) {
    return null;
  }
  return selectPlainVerbAttributiveEnding(plan.koreanLemma, unit.jpHead, headNounToken, {
    tokens: options.tokens,
    contentIdx,
    lookups: options.lookups,
  });
}

export function projectPredicateHeadTailAttributivePlan(
  plan: PredicateHeadTailChainRenderPlan,
): PredicateHeadTailChainRenderPlan | null {
  if (plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  if (plan.realization.root.tail.ops.some((op) => op.kind === "connective")) {
    return null;
  }
  if (plan.realization.root.tail.terminal === "attributive") {
    return plan;
  }
  const sfp = plan.realization.root.sfp;
  const projectedRoot = {
    ...plan.realization.root,
    ...(sfp !== null && sfp.source.tokenIndices.length === 0 ? { sfp: null } : {}),
    tail: {
      ...plan.realization.root.tail,
      terminal: "attributive" as const,
    },
  };
  const {
    headTailCandidate: _headTailCandidate,
    headTailSourceCandidate: _headTailSourceCandidate,
    ...planWithoutOriginalSourceCandidate
  } = plan;
  return {
    ...planWithoutOriginalSourceCandidate,
    realization: { ...plan.realization, root: projectedRoot },
  };
}

function targetHeadToken(
  tokens: readonly RuntimeHaruToken[],
  relation: StructuralRelation,
): RuntimeHaruToken | null {
  if (relation.target?.kind !== "noun_phrase") {
    return null;
  }
  const headIdx = relation.target.headIdx;
  if (headIdx === null) {
    return null;
  }
  return tokens[headIdx] ?? null;
}

function projectUnitPurposeAttributivePlan(unit: TranslationUnit): NominalHeadTailChainPlan | null {
  const plan = unit.renderPlan;
  if (!isNominalHeadTailChainRenderPlan(plan)) {
    return null;
  }
  return {
    ...plan,
    realization: { ...plan.realization, projection: { kind: "purpose_attributive" } }
  };
}
