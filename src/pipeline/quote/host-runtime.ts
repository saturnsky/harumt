import type {
  ConjectureThoughtQuotePlan,
  QuoteCognitionHostPlan,
  QuoteHostReportingPassivePlan,
  RenderPlan
} from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import { replaceLemmaRenderPlan } from "../rendering/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { TokenCursor } from "../token-cursor.js";
import { previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { predicateMorphologyFromAuxTokens, predicateMorphologyFromUnit, type PredicateMorphology } from "../predicate-morphology.js";
import {
  quoteRelationContentLooksLabelIsh,
  quoteRelationLooksBareNominalLabel,
  quoteReportingPassiveHostRealizesBeTold,
  quoteStructuralRelationAt,
  quoteStructuralRelationIndex,
  type QuoteStructuralRelation
} from "../structural-relation/quote.js";
import type { QuoteBoundaryKoreanClauseForm, StemNode, TailNode, TailRoot } from "../head-tail/tail/predicate-root/grammar.js";
import { FunctionalKind, TranslationUnit, UnitType } from "../translation/unit.js";

import { POS4, 동사, 구 } from "../../types/pos.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
export function applyQuoteHostFrameRendering(
  units: readonly TranslationUnit[],
  tokens: readonly RuntimeHaruToken[],
  options: { readonly lookups: LookupTables }
): void {
  const cursor = new TokenCursor(tokens, 0, tokens.length);
  for (const relation of quoteStructuralRelationIndex(cursor, options.lookups).winners()) {
    const hostUnitIndex = unitIndexCoveringToken(units, relation.quote.hostMatch.hostIdx, 0);
    if (hostUnitIndex === undefined) {
      continue;
    }
    const hostUnit = units[hostUnitIndex];
    if (hostUnit === undefined || hostUnit.suppressed) {
      continue;
    }
    if (predicateTailUnitAlreadyOwnsQuoteHostFrame(hostUnit, relation)) {
      continue;
    }
    applyPredicateQuoteQuestionHostRendering(units, tokens, relation, hostUnitIndex);
    const frame = quoteHostFrameFromRelation(units, tokens, relation, hostUnit, options.lookups);
    if (frame === null) {
      continue;
    }
    if (tryApplyStructuredQuoteHostFrame(hostUnit, frame)) {
      applyQuoteHostFrameMarkerRendering(units, tokens, relation, hostUnitIndex, frame);
      continue;
    }
    const plan = quoteHostFrameRenderPlan(
      frame,
      hostUnit.renderPlan,
      quoteHostReportingPassiveTraceTokens(tokens, relation, hostUnit, frame)
    );
    hostUnit.setRenderPlan(plan, { rule: "quote_host_frame", cacheValue: "" });
    applyQuoteHostFrameMarkerRendering(units, tokens, relation, hostUnitIndex, frame);
  }
}

function predicateTailUnitAlreadyOwnsQuoteHostFrame(
  hostUnit: TranslationUnit,
  relation: QuoteStructuralRelation
): boolean {
  if (!isPredicateHeadTailChainRenderPlan(hostUnit.renderPlan)) {
    return false;
  }
  if (!hostUnit.jpIndices.includes(relation.quote.hostMatch.hostIdx)) {
    return false;
  }
  return hostUnit.jpIndices.some((index) =>
    index >= relation.quote.contentSpan.start && index <= relation.quote.markerIdx
  );
}

export function conjectureThoughtQuotePlanFromRoot(root: TailRoot): ConjectureThoughtQuotePlan | null {
  const layer = root.tail.kind === "auxLayer" ? root.tail : root.tail.inner;
  const committedStemKind = layer.stem.kind === "candidateSet"
    ? committedCandidateSetStemKind(layer.stem)
    : layer.stem.kind;
  const quoteIdx = layer.ops.findIndex((op) => op.kind === "connective" && op.connective === "quotative");
  if (quoteIdx < 0) {
    return null;
  }
  const beforeQuote = layer.ops.slice(0, quoteIdx);
  if (
    committedStemKind === "noun" &&
    beforeQuote.some((op) => op.kind === "copula" && op.variant === "conjecture")
  ) {
    return { kind: "conjectureThoughtQuote", root, koreanPos: 구 };
  }
  if (
    (committedStemKind === "verb" || committedStemKind === "adj") &&
    beforeQuote.some((op) => op.kind === "conjecture")
  ) {
    return { kind: "conjectureThoughtQuote", root, koreanPos: 구 };
  }
  return null;
}

function committedCandidateSetStemKind(
  stem: Extract<StemNode, { readonly kind: "candidateSet" }>
): "noun" | "verb" | "adj" | null {
  const category = stem.committedSenseRealization?.category;
  if (category !== undefined) {
    return category === "nominal"
      ? "noun"
      : category === "verbal_predicate"
        ? "verb"
        : category === "adjectival_predicate" ? "adj" : null;
  }
  switch (stem.sourcePredicateShape) {
    case "i_adjective":
    case "na_adjective":
      return "adj";
    case "verb":
    case "sahen_verbalization":
      return "verb";
    case "nominal":
    case "particle_phrase":
      return "noun";
    case "lexical_adverb":
    case undefined:
      return null;
  }
  return null;
}

type QuoteHostFrame =
  | {
    readonly kind: "reporting_passive";
    readonly lemma: "알려지다" | "생각되다" | "보이다" | "불리다" | "여겨지다";
    readonly resultativeState: boolean;
    readonly hasTeIru: boolean;
    readonly past: boolean;
    readonly negative: boolean;
  };

function tryApplyStructuredQuoteHostFrame(
  hostUnit: TranslationUnit,
  frame: QuoteHostFrame
): boolean {
  if (frame.kind !== "reporting_passive") {
    return false;
  }
  const sourcePlan = hostUnit.renderPlan;
  const planKindSupported = sourcePlan !== null && (
    isPredicateHeadTailChainRenderPlan(sourcePlan) ||
    sourcePlan.kind === "attributive" ||
    (sourcePlan.kind === "lemma" && !frame.hasTeIru)
  );
  if (sourcePlan === null || !planKindSupported) {
    return false;
  }
  const rewritten = replaceLemmaRenderPlan(sourcePlan, {
    koreanLemma: frame.lemma,
    koreanPos: 동사,
    irregular: null,
    dropFirstPassiveAux: true,
    absorbedPassiveAux: true
  });
  if (rewritten === undefined) {
    return false;
  }
  hostUnit.setRenderPlan(rewritten, { rule: "quote_host_frame", cacheValue: "" });
  return true;
}

function quoteHostFrameRenderPlan(
  frame: QuoteHostFrame,
  sourcePlan: RenderPlan | null,
  traceTokens: QuoteHostReportingPassiveTraceTokens | null
): QuoteHostReportingPassivePlan {
  return {
    kind: "quoteHostReportingPassive",
    lemma: frame.lemma,
    resultativeState: frame.resultativeState,
    hasTeIru: frame.hasTeIru,
    past: frame.past,
    negative: frame.negative,
    koreanPos: 동사,
    ...(isPredicateHeadTailChainRenderPlan(sourcePlan) ? { root: sourcePlan.realization.root } : {}),
    ...(traceTokens === null
      ? {}
      : {
        stateStemTokens: traceTokens.stemTokens,
        stateAuxTokens: traceTokens.auxTokens
      })
  };
}

function applyPredicateQuoteQuestionHostRendering(
  units: readonly TranslationUnit[],
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  hostUnitIndex: number
): void {
  applyCognitionQuoteMarkerRendering(units, tokens, relation, hostUnitIndex);
  applyCognitionAttributivePotentialRendering(units[hostUnitIndex], tokens, relation);
}

function applyCognitionQuoteMarkerRendering(
  units: readonly TranslationUnit[],
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  hostUnitIndex: number
): void {
  if (relation.quote.slotKind !== "quoted_content" || !isKizukuThoughtHost(relation)) {
    return;
  }
  if (!quoteRelationLooksBareNominalLabel(tokens, relation)) {
    return;
  }
  const markerUnitIndex = unitIndexCoveringToken(units, relation.quote.markerIdx, 0);
  if (markerUnitIndex === undefined || markerUnitIndex === hostUnitIndex) {
    return;
  }
  const markerUnit = units[markerUnitIndex];
  const markerToken = tokens[relation.quote.markerIdx];
  if (
    markerUnit === undefined ||
    markerUnit.suppressed ||
    markerUnit.unitType !== UnitType.FUNCTIONAL ||
    markerUnit.jpIndices.length !== 1 ||
    markerUnit.jpIndices[0] !== relation.quote.markerIdx ||
    markerToken?.surface !== "だって"
  ) {
    return;
  }
  markerUnit.setKorean("", { rule: "quote_cognition_marker" });
  markerUnit.koreanBase = "";
  markerUnit.allomorphKey = "이라고/라고";
  markerUnit.functionalKind = FunctionalKind.PARTICLE;
  markerUnit.attachLeft = true;
  markerUnit.provenance = "structural_relation_owner";
  markerUnit.provenanceReason = "quote_cognition_marker";
}

function applyCognitionAttributivePotentialRendering(
  hostUnit: TranslationUnit | undefined,
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): void {
  if (
    hostUnit === undefined ||
    hostUnit.suppressed ||
    relation.quote.slotKind !== "quoted_content" ||
    !isWakaruThoughtHost(relation) ||
    tokens[relation.quote.markerIdx]?.surface !== "と" ||
    previousNonSpaceIndex(tokens, relation.quote.hostMatch.hostIdx) !== relation.quote.markerIdx
  ) {
    return;
  }
  const sourcePlan = hostUnit.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(sourcePlan)) {
    return;
  }
  const tail = sourcePlan.realization.root.tail;
  if (tail.kind !== "auxLayer" || tail.terminal !== "attributive" || tail.ops.length !== 0) {
    return;
  }
  if (
    tail.terminalPayload?.kind !== "attributiveBoundary" ||
    tail.terminalPayload.projection !== "ordinary_nominal" ||
    tail.terminalPayload.headKind !== "ordinary_nominal"
  ) {
    return;
  }
  const plan: QuoteCognitionHostPlan = {
    kind: "quoteCognitionHost",
    host: "wakaru",
    mode: "attributive_potential",
    koreanPos: 동사
  };
  hostUnit.setRenderPlan(plan, { rule: "quote_cognition_host", cacheValue: "" });
  hostUnit.provenance = "structural_relation_owner";
  hostUnit.provenanceReason = "quote_cognition_host";
}

function isWakaruThoughtHost(relation: QuoteStructuralRelation): boolean {
  if (relation.quote.hostMatch.kind !== "thought") {
    return false;
  }
  const hostForm = relation.quote.hostMatch.hostForm;
  return hostForm === "分かる" || hostForm === "わかる";
}

function isKizukuThoughtHost(relation: QuoteStructuralRelation): boolean {
  if (relation.quote.hostMatch.kind !== "thought") {
    return false;
  }
  const hostForm = relation.quote.hostMatch.hostForm;
  return hostForm === "気づく" || hostForm === "気付く";
}

function applyQuoteHostFrameMarkerRendering(
  units: readonly TranslationUnit[],
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  hostUnitIndex: number,
  frame: QuoteHostFrame
): void {
  if (frame.kind !== "reporting_passive" || relation.quote.slotKind !== "quoted_content") {
    return;
  }
  if (!quoteRelationLooksBareNominalLabel(tokens, relation)) {
    return;
  }
  const markerUnitIndex = unitIndexCoveringToken(units, relation.quote.markerIdx, 0);
  if (markerUnitIndex === undefined || markerUnitIndex === hostUnitIndex) {
    return;
  }
  const markerUnit = units[markerUnitIndex];
  const markerToken = tokens[relation.quote.markerIdx];
  if (
    markerUnit === undefined ||
    markerUnit.suppressed ||
    markerUnit.unitType !== UnitType.FUNCTIONAL ||
    markerUnit.jpIndices.length !== 1 ||
    markerUnit.jpIndices[0] !== relation.quote.markerIdx ||
    markerToken?.surface !== "だって"
  ) {
    return;
  }
  markerUnit.setKorean("", { rule: "quote_host_frame_marker" });
  markerUnit.koreanBase = "";
  markerUnit.allomorphKey = "이라고/라고";
  markerUnit.functionalKind = FunctionalKind.PARTICLE;
  markerUnit.attachLeft = true;
  markerUnit.provenance = "structural_relation_owner";
  markerUnit.provenanceReason = "quote_host_frame_marker";
}

interface QuoteHostReportingPassiveTraceTokens {
  readonly stemTokens: readonly RuntimeHaruToken[];
  readonly auxTokens: readonly RuntimeHaruToken[];
}

function quoteHostReportingPassiveTraceTokens(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  hostUnit: TranslationUnit,
  frame: QuoteHostFrame
): QuoteHostReportingPassiveTraceTokens | null {
  if (frame.kind !== "reporting_passive" || !frame.hasTeIru) {
    return null;
  }
  const hostTokenIndexes = [...hostUnit.jpIndices]
    .filter((index) => index >= relation.quote.hostMatch.hostIdx)
    .sort((left, right) => left - right);
  const hostTokens = hostTokenIndexes
    .map((index) => tokens[index])
    .filter((token): token is RuntimeHaruToken => token !== undefined);
  const auxStart = hostTokens.findIndex(isQuoteHostReportingPassiveStateAuxToken);
  if (auxStart <= 0) {
    return null;
  }
  const stemTokens = hostTokens.slice(0, auxStart);
  const auxTokens = hostTokens.slice(auxStart);
  if (stemTokens.length === 0 || auxTokens.length === 0) {
    return null;
  }
  return { stemTokens, auxTokens };
}

function isQuoteHostReportingPassiveStateAuxToken(token: RuntimeHaruToken): boolean {
  return token.dictionaryForm === "いる" ||
    token.dictionaryForm === "てる" ||
    token.dictionaryForm === "おる" ||
    token.dictionaryForm === "居る" ||
    token.surface === "いる" ||
    token.surface === "てる" ||
    token.surface === "おり" ||
    token.surface === "おる";
}


function quoteHostFrameFromRelation(
  units: readonly TranslationUnit[],
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  hostUnit: TranslationUnit,
  lookups: LookupTables
): QuoteHostFrame | null {
  if (relation.quote.slotKind !== "quoted_content") {
    return null;
  }
  if (predicateTailPlanHasExperienceIdiom(hostUnit.renderPlan)) {
    return null;
  }
  const morphology = quoteHostMorphologyFromUnit(hostUnit, lookups);
  if (morphology === null || !morphology.passive) {
    return null;
  }
  const hostForm = relation.quote.hostMatch.hostForm;
  if (IU_LEXEME_FORMS.has(hostForm)) {
    const contentEndIdx = previousNonSpaceIndex(tokens, relation.quote.contentSpan.endExclusive, relation.quote.contentSpan.start);
    const contentEndForm = contentEndIdx === null ? null : tokens[contentEndIdx]?.dictionaryForm || tokens[contentEndIdx]?.surface;
    if (relation.quote.request !== undefined || contentEndForm === "ほしい" || contentEndForm === "欲しい") return null;
    if (quoteReportingPassiveHostRealizesBeTold(tokens, relation, lookups, relationContentCommittedBeTold(units, relation))) {
      return null;
    }
    const label = morphology.hasTeIru
      ? quoteRelationLooksBareNominalLabel(tokens, relation)
      : quoteRelationContentLooksLabelIsh(tokens, relation);
    return {
      kind: "reporting_passive",
      lemma: label ? "불리다" : "알려지다",
      resultativeState: !label,
      hasTeIru: morphology.hasTeIru,
      past: morphology.past,
      negative: morphology.negative
    };
  }
  if (hostForm === "考える") {
    return {
      kind: "reporting_passive",
      lemma: "생각되다",
      resultativeState: false,
      hasTeIru: morphology.hasTeIru,
      past: morphology.past,
      negative: morphology.negative
    };
  }
  if (hostForm === "見る" || hostForm === "みる") {
    return {
      kind: "reporting_passive",
      lemma: "보이다",
      resultativeState: false,
      hasTeIru: morphology.hasTeIru,
      past: morphology.past,
      negative: morphology.negative
    };
  }
  if (hostForm === "する") {
    return {
      kind: "reporting_passive",
      lemma: "여겨지다",
      resultativeState: false,
      hasTeIru: morphology.hasTeIru,
      past: morphology.past,
      negative: morphology.negative
    };
  }
  return null;
}

const BE_TOLD_COMMITTED_CLAUSE_FORMS: ReadonlySet<QuoteBoundaryKoreanClauseForm> = new Set([
  "다는 말을",
  "달라는 말을"
]);

function relationContentCommittedBeTold(
  units: readonly TranslationUnit[],
  relation: QuoteStructuralRelation
): boolean | null {
  for (const unit of units) {
    if (unit.suppressed) {
      continue;
    }
    const plan = unit.renderPlan;
    if (!isPredicateHeadTailChainRenderPlan(plan)) {
      continue;
    }
    const form = quoteBoundaryClauseFormForMarker(plan.realization.root.tail, relation.quote.markerIdx);
    if (form !== null) {
      return BE_TOLD_COMMITTED_CLAUSE_FORMS.has(form);
    }
  }
  return null;
}

function quoteBoundaryClauseFormForMarker(
  node: TailNode,
  markerIdx: number
): QuoteBoundaryKoreanClauseForm | null {
  if (node.kind !== "connective") {
    return null;
  }
  if (node.quoteBoundary !== undefined && node.source.tokenIndices.includes(markerIdx)) {
    return node.quoteBoundary.koreanClauseForm;
  }
  return quoteBoundaryClauseFormForMarker(node.inner, markerIdx) ??
    quoteBoundaryClauseFormForMarker(node.outer, markerIdx);
}

function predicateTailPlanHasExperienceIdiom(plan: RenderPlan | null): boolean {
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  const layer = plan.realization.root.tail.kind === "auxLayer" ? plan.realization.root.tail : plan.realization.root.tail.inner;
  return layer.ops.some((op) => op.kind === "idiom" && op.idiom === "experience_koto_ga_aru");
}

function quoteHostMorphologyFromUnit(unit: TranslationUnit, lookups: LookupTables): Pick<PredicateMorphology, "passive" | "past" | "negative"> & { readonly hasTeIru: boolean } | null {
  const morphology = predicateMorphologyFromUnit(unit, { forcePassive: true }, lookups);
  if (morphology !== null) {
    return {
      passive: morphology.passive,
      hasTeIru: morphology.progressive,
      past: morphology.past,
      negative: morphology.negative
    };
  }
  const plan = unit.renderPlan;
  if (plan?.kind === "attributive") {
    const aux = predicateMorphologyFromAuxTokens(
      plan.auxTokens,
      { forcePassive: true, jpDictForm: unit.jpHead.dictionaryForm, verbConjType: unit.jpHead.pos & POS4 },
      lookups
    );
    return {
      passive: aux.passive,
      hasTeIru: aux.progressive,
      past: aux.past,
      negative: aux.negative
    };
  }
  return null;
}

function unitIndexCoveringToken(units: readonly TranslationUnit[], tokenIndex: number, start: number): number | undefined {
  for (let index = start; index < units.length; index += 1) {
    if (units[index]?.jpIndices.includes(tokenIndex) === true) {
      return index;
    }
  }
  return undefined;
}
