import type { RuntimeHaruToken, SourceTokenSpan } from "../../types/token.js";
import { isPredicateHeadTailChainRenderPlan, type ReasonBecausePayload, type RenderPlan } from "../../types/render-plan.js";
import type { LookupTables } from "../lookup-tables.js";
import { attachParticleRenderPlan } from "../rendering/particle-plan.js";
import { resolveCandidateSetStem } from "../head-tail/tail/predicate-root/commit.js";
import type { AuxLayerNode, AuxOpNode, StemNode } from "../head-tail/tail/predicate-root/grammar.js";
import { REASON_BECAUSE_BOUND_NOUN } from "../rendering/render-plan.js";
import { type TranslationUnit, UnitType } from "../translation/unit.js";
import type { StructuralRelation, StructuralReasonCopulaSfp, StructuralRelationTokenSpan } from "./types.js";
import { 동사, 명사, 형용사, 구 } from "../../types/pos.js";
import { reasonCopulaQuoteContentMatchBeforeMarker, type ReasonCopulaQuoteContentMatch } from "./quote-reason-copula.js";
import { createConjectureOp } from "../head-tail/tail/predicate-root/op-builders.js";
import { nounCopulaDiscursiveSfpEnding } from "../head-tail/tail/predicate-root/renderers/sfp-question.js";
import { type RelationRenderOperation, sourceUnitIndexesWithToken, projectionEdgeAttachment, sourceSpanForStructuralTokenSpan, unitFullyCoveredBySpans, uniqueSorted } from "./render-unit-spans.js";
import { composeRelationSourceUnitPlans, structuralRelationSequencePlan } from "./render-source-sequence.js";

export function buildReasonCopulaQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const relation = options.relation;
  const quote = relation.quote;
  if (
    quote === undefined ||
    quote.slotKind !== "quoted_content" ||
    quote.contentSpan.endExclusive !== quote.markerIdx
  ) {
    return null;
  }
  const match = reasonCopulaQuoteContentMatchBeforeMarker(options.tokens, quote.contentSpan, quote.markerIdx);
  if (match === null) {
    return null;
  }
  const predicateUnitIndex = sourceUnitIndexesWithToken(options.units, options.sourceUnitIndexes, match.reasonMarkerIdx)
    .find((unitIndex) => options.units[unitIndex]?.renderPlan?.kind === "headTailChain") ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined || predicateUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const reasonPlan = reasonBecauseNominalPlanFromUnit(predicateUnit, match.reasonMarkerIdx);
  if (reasonPlan === null) {
    return null;
  }
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    sourceUnitIndexesExcludingFullyCoveredSpans(options.units, options.sourceUnitIndexes, [
      { start: match.reasonMarkerIdx, endExclusive: match.reasonMarkerIdx + 1 },
      { start: match.copulaStart, endExclusive: match.copulaEndExclusive },
    ]),
    new Map([[predicateUnitIndex, reasonPlan]])
  );
  if (sourcePlan === null) {
    return null;
  }
  const quotedPlan = reasonCopulaQuotedRenderPlan(sourcePlan, match, sourceSpanForStructuralTokenSpan(options.tokens, quote.markerSpan));
  if (quotedPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes])
    .filter((unitIndex) => options.units[unitIndex]?.unitType !== UnitType.SYMBOL);
  return {
    relation,
    insertBeforeUnitIndex: options.sourceUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan: quotedPlan,
  };
}

export function buildReasonCopulaExplanationStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly sourceSpanUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const reasonMarker = options.relation.markerSpans.find((span) => span.role === "reason_marker") ?? null;
  const copulaMarker = options.relation.markerSpans.find((span) => span.role === "explanatory_copula") ?? null;
  const reasonCopula = options.relation.reasonCopula;
  if (reasonMarker === null || copulaMarker === null || reasonCopula === undefined) {
    return null;
  }
  const predicateUnitIndex = sourceUnitIndexesWithToken(options.units, options.sourceUnitIndexes, reasonMarker.start)
    .find((unitIndex) => options.units[unitIndex]?.renderPlan?.kind === "headTailChain") ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined || predicateUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const reasonPlan = reasonBecauseNominalPlanFromUnit(predicateUnit, reasonMarker.start);
  if (reasonPlan === null) {
    return null;
  }
  const match: ReasonCopulaQuoteContentMatch = {
    reasonMarkerIdx: reasonMarker.start,
    copulaStart: copulaMarker.start,
    copulaEndExclusive: copulaMarker.endExclusive,
    past: reasonCopula.past,
    polite: reasonCopula.polite,
    conjunctive: reasonCopula.connective,
    negative: reasonCopula.negative,
    additiveMo: reasonCopula.additiveMo,
    conjecture: reasonCopula.conjecture,
  };
  const projectedUnitIndexes = options.sourceSpanUnitIndexes;
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    projectedUnitIndexes,
    new Map([[predicateUnitIndex, reasonPlan]])
  );
  if (sourcePlan === null) {
    return null;
  }
  const quoteMarker = options.relation.markerSpans.find((span) => span.role === "quotative_marker") ?? null;
  const renderPlan = quoteMarker === null
    ? reasonCopulaTerminalRenderPlan(sourcePlan, match, sourceSpanForStructuralTokenSpan(options.tokens, copulaMarker), reasonCopula.sfp)
    : reasonCopulaQuotedRenderPlan(sourcePlan, match, sourceSpanForStructuralTokenSpan(options.tokens, quoteMarker));
  if (renderPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([...projectedUnitIndexes, ...options.markerUnitIndexes]);
  const edgeAttachment = projectionEdgeAttachment(options.units, projectedUnitIndexes);
  return {
    relation: options.relation,
    insertBeforeUnitIndex: projectedUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    ...edgeAttachment,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan,
  };
}

function reasonBecauseNominalPlanFromUnit(
  unit: TranslationUnit,
  reasonMarkerIdx: number,
): RenderPlan | null {
  const plan = unit.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const layer = plan.realization.root.tail;
  const stem = layer.stem.kind === "candidateSet"
    ? layer.stem.committedSense === undefined
      ? null
      : resolveCandidateSetStem(layer.stem)
    : layer.stem;
  if (stem === null) {
    return null;
  }
  if (stem.kind !== "verb" && stem.kind !== "adj" && stem.kind !== "noun") {
    return null;
  }
  const ops = layer.ops.filter((op) => (
    op.kind !== "connective" &&
    op.source.tokenIndices.every((tokenIndex) => tokenIndex < reasonMarkerIdx)
  ));
  const voiceOp = [...ops].reverse().find((op) => op.kind === "voice") ?? null;
  const voice = voiceOp?.kind === "voice"
    ? voiceFromTailVoice(voiceOp.voice)
    : "active";
  const projectionOps = reasonProjectionOpsWithStemMood(ops, stem);
  const payload: ReasonBecausePayload = {
    entry: plan.realization.entry ?? null,
    koreanLemma: stem.lemma,
    irregular: stem.kind === "noun" ? null : stem.irregular,
    auxTokens: auxTokensForOps(ops.filter((op) => op.kind !== "adjCopulaBridge")),
    koreanPos: stem.kind === "verb" ? 동사 : stem.kind === "adj" ? 형용사 : 명사,
    projection: "nominal",
    voice,
    jpDictForm: stem.source.tokens[stem.semanticAnchors[0] ?? 0]?.dictionaryForm ?? null,
    sahenCompound: false,
    sahenNoun: stem.kind === "noun" && stem.sahen ? stem.lemma : null,
    negative: ops.some((op) =>
      op.kind === "negation" || ("polarity" in op && op.polarity === "negative")
    ),
    past: ops.some((op) =>
      (op.kind === "tense" && op.tense === "past") ||
      (op.kind === "negation" && op.chainPast)
    ),
    predicateRoot: {
      ...plan.realization.root,
      tail: {
        ...layer,
        ops: projectionOps,
        terminal: null
      },
      sfp: null
    },
    ...(plan.realization.hostProjection === undefined
      ? {}
      : { predicateHostProjection: plan.realization.hostProjection }),
    ...(voiceOp?.kind === "voice" && voiceOp.passiveClass !== undefined
      ? { passiveClass: voiceOp.passiveClass }
      : {}),
  };
  return {
    kind: "reasonBecause",
    payload,
  };
}

function reasonProjectionOpsWithStemMood(
  ops: readonly AuxOpNode[],
  stem: StemNode,
): readonly AuxOpNode[] {
  if (stem.stemMood !== "conjectural" || ops.some((op) => op.kind === "conjecture")) {
    return ops;
  }
  const moodToken = stem.source.tokens[stem.conjugationAnchor];
  if (moodToken === undefined) {
    return ops;
  }
  return [
    ...ops,
    createConjectureOp({
      polite: false,
      source: {
        tokens: [moodToken],
        tokenIndices: [stem.source.tokenIndices[stem.conjugationAnchor] ?? -1],
      },
    }),
  ];
}

function reasonCopulaQuotedRenderPlan(
  reasonPlan: RenderPlan,
  match: ReasonCopulaQuoteContentMatch,
  sourceSpan: SourceTokenSpan | null,
): RenderPlan | null {
  if (match.negative || match.conjecture !== null) {
    return null;
  }
  if (!match.past) {
    return attachParticleRenderPlan(reasonPlan, "이라고/라고");
  }
  return structuralRelationSequencePlan([
    reasonPlan,
    {
      kind: "structuralText",
      text: "이었다고",
      koreanPos: 구,
      sourceSpan,
    },
  ]);
}

function reasonCopulaTerminalRenderPlan(
  reasonPlan: RenderPlan,
  match: ReasonCopulaQuoteContentMatch,
  _sourceSpan: SourceTokenSpan | null,
  sfp: StructuralReasonCopulaSfp | null = null,
): RenderPlan | null {
  if (match.negative) {
    if (match.conjecture !== null) {
      const focusedPlan = attachParticleRenderPlan(reasonPlan, match.additiveMo ? "도" : "은/는");
      if (focusedPlan === null) return null;
      const suffix = match.conjecture.polite
        ? match.past ? "아니었겠죠" : "아니겠죠"
        : match.past ? "아니었겠지" : "아니겠지";
      return structuralRelationSequencePlan([
        focusedPlan,
        {
          kind: "structuralText",
          text: ` ${suffix}`,
          koreanPos: 구,
        },
      ]);
    }
    const particle = match.additiveMo ? "도" : match.conjunctive ? "이/가" : "은/는";
    const focusedPlan = attachParticleRenderPlan(reasonPlan, particle);
    if (focusedPlan === null) {
      return null;
    }
    const suffix = match.conjunctive
      ? match.past
        ? { casual: "아니었고", formal: "아니었고" }
        : { casual: "아니고", formal: "아니고" }
      : match.past && match.polite
        ? { casual: "아니었어요", formal: "아니었습니다" }
      : match.past
        ? { casual: "아니었어", formal: "아니었다" }
      : match.polite
        ? { casual: "아니에요", formal: "아닙니다" }
        : { casual: "아니야", formal: "아니다" };
    return structuralRelationSequencePlan([
      focusedPlan,
      {
        kind: "registerText",
        casual: ` ${suffix.casual}`,
        formal: ` ${suffix.formal}`,
        koreanPos: 구,
      },
    ]);
  }
  if (match.conjunctive) {
    return structuralRelationSequencePlan([
      reasonPlan,
      {
        kind: "structuralText",
        text: "이고",
        koreanPos: 구,
      },
    ]);
  }
  const suffix = reasonCopulaTerminalSuffix(match, sfp);
  if (suffix === null) {
    return null;
  }
  return structuralRelationSequencePlan([
    reasonPlan,
    {
      kind: "registerText",
      casual: suffix.casual,
      formal: suffix.formal,
      koreanPos: 구,
    },
  ]);
}

function reasonCopulaTerminalSuffix(
  match: ReasonCopulaQuoteContentMatch,
  sfp: StructuralReasonCopulaSfp | null,
): { readonly casual: string; readonly formal: string } | null {
  const effect = sfp?.effect ?? null;
  const conjecture = match.conjecture !== null;
  const polite = match.conjecture?.polite ?? match.polite;
  if (effect !== null) {
    const casual = nounCopulaDiscursiveSfpEnding(REASON_BECAUSE_BOUND_NOUN, match.past, false, polite, effect, conjecture);
    const formal = nounCopulaDiscursiveSfpEnding(REASON_BECAUSE_BOUND_NOUN, match.past, true, polite, effect, conjecture);
    return casual === null || formal === null ? null : { casual, formal };
  }
  if (conjecture) {
    const suffix = polite
      ? match.past ? "이었겠죠" : "이겠죠"
      : match.past ? "이었겠지" : "이겠지";
    return { casual: suffix, formal: suffix };
  }
  return match.past && match.polite
    ? { casual: "이었어요", formal: "이었습니다" }
    : match.past
      ? { casual: "이었어", formal: "이었다" }
    : match.polite
      ? { casual: "이에요", formal: "입니다" }
      : { casual: "이야", formal: "이다" };
}

function voiceFromTailVoice(voice: string): NonNullable<ReasonBecausePayload["voice"]> {
  if (voice === "potential") {
    return "potential";
  }
  if (voice === "passive" || voice === "causative_passive" || voice === "honorific") {
    return "passive";
  }
  return "active";
}

function auxTokensForOps(ops: readonly AuxLayerNode["ops"][number][]): readonly RuntimeHaruToken[] {
  const byIndex = new Map<number, RuntimeHaruToken>();
  for (const op of ops) {
    for (const [offset, tokenIndex] of op.source.tokenIndices.entries()) {
      const token = op.source.tokens[offset];
      if (token !== undefined) {
        byIndex.set(tokenIndex, token);
      }
    }
  }
  return [...byIndex.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, token]) => token);
}

function sourceUnitIndexesExcludingFullyCoveredSpans(
  units: readonly TranslationUnit[],
  sourceUnitIndexes: readonly number[],
  spans: readonly StructuralRelationTokenSpan[],
): readonly number[] {
  return sourceUnitIndexes.filter((unitIndex) => {
    const unit = units[unitIndex];
    return unit !== undefined && !unitFullyCoveredBySpans(unit, spans);
  });
}
