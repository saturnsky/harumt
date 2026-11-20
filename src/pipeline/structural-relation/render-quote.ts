import type { RuntimeHaruToken } from "../../types/token.js";
import { isPredicateHeadTailChainRenderPlan, type LemmaRealization, type RenderPlan, type PredicateHeadTailChainRenderPlan, type StructuralRelationSequencePart } from "../../types/render-plan.js";
import type { LookupTables } from "../lookup-tables.js";
import { previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { attachParticleRenderPlan } from "../rendering/particle-plan.js";
import { resolveCandidateSetLayer } from "../head-tail/tail/predicate-root/commit.js";
import { normalizeProductionMatch, probeProductionDispatch } from "../head-tail/tail/predicate-root/production-registry.js";
import { isConditionalQuoteProductionMatch } from "../head-tail/tail/predicate-root/production-families/mid-chain-quote.js";
import { SFP_NA_EXCLAMATORY_NOMINALIZERS, TYPIFICATION_QUOTATIVE_HEADS } from "../head-tail/data/semantic-helper-sets.js";
import { quoteProjectionForSfpEffect } from "../semantics/sfp-quote-projection.js";
import type { AuxLayerNode, ConnectiveKind, ConnectiveOp, ObligationIdiomOp, OpSource, QuoteBoundaryFocusParticle, SfpEffect, SfpNode, TailNode, TailRoot } from "../head-tail/tail/predicate-root/grammar.js";
import { firstAuxLayer, isBenefactiveAspectOp, tailRootVoiceOps } from "../head-tail/tail/predicate-root/inspect.js";
import { tailRootHostLayerGovernsCopulaNiComplement } from "../head-tail/tail/predicate-root/postverb-host-attachment.js";
import { tailPredicateHostPrefersTameReason } from "../head-tail/tail/predicate-root/tame-reason-evidence.js";
import { attributiveModifierPlanSourceFacts } from "../rendering/render-plan-inspect.js";
import { type TranslationUnit, UnitType } from "../translation/unit.js";
import type { StructuralRelation, StructuralRelationGraph, StructuralRelationTokenSpan } from "./types.js";
import type { ParticleKey } from "../../generator/particles.js";
import { isTerminalAssertiveCopulaToken, 대명사, 동사, 명사, 형용사, 구 } from "../../types/pos.js";
import { createConnectiveOp, createIdiomOp } from "../head-tail/tail/predicate-root/op-builders.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
import { type RelationRenderOperation, sourceUnitIndexesWithToken, previousNonSpaceTokenIndex, sourceSpanForStructuralTokenSpan, unitIndexesInSpan, uniqueSorted, opSourceForMarkerSpans } from "./render-unit-spans.js";
import { projectPredicateHeadTailAttributivePlan } from "./render-attributive.js";
import { composeRelationSourceUnitPlans, structuralRelationSequencePlan } from "./render-source-sequence.js";
import { projectHeadTailConnectivePlan, resolvedStructuralProjectionWarnings, projectUnitPredicateConnectivePlan, opSourceCoveredBy, connectiveBoundaryForProjection } from "./render-connective-plan.js";

export function buildConjectureQuoteStructuredRenderOperation(options: {
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
}): RelationRenderOperation | null {
  const quote = options.relation.quote;
  if (quote === undefined || quote.slotKind !== "quoted_content") return null;
  const sourceUnitIndex = [...options.sourceUnitIndexes].reverse().find((unitIndex) =>
    isPredicateHeadTailChainRenderPlan(options.units[unitIndex]?.renderPlan)
  );
  if (sourceUnitIndex === undefined) return null;
  const unit = options.units[sourceUnitIndex];
  const sourcePlan = unit?.renderPlan;
  if (unit === undefined || !isPredicateHeadTailChainRenderPlan(sourcePlan)) return null;
  const committed = materializeSfpOwnerStem(sourcePlan);
  const layer = firstAuxLayer(committed.realization.root.tail);
  if (layer === null) return null;
  const quoteIdx = layer.ops.findIndex((op) => op.kind === "connective" && op.connective === "quotative");
  if (quoteIdx < 0) return null;
  const beforeQuote = layer.ops.slice(0, quoteIdx);
  const conjectural = layer.stem.kind === "noun"
    ? beforeQuote.some((op) => op.kind === "copula" && op.variant === "conjecture")
    : (layer.stem.kind === "verb" || layer.stem.kind === "adj") &&
      beforeQuote.some((op) => op.kind === "conjecture");
  if (!conjectural) return null;
  const suppressUnitIndexes = options.markerUnitIndexes.filter((unitIndex) => unitIndex !== sourceUnitIndex);
  return {
    relation: options.relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    replaceUnitIndex: sourceUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted([
      ...unit.jpIndices,
      ...suppressUnitIndexes.flatMap((unitIndex) => options.units[unitIndex]?.jpIndices ?? []),
    ]),
    renderPlan: {
      kind: "conjectureThoughtQuote",
      root: committed.realization.root,
      ...(committed.realization.hostProjection === undefined
        ? {}
        : { hostProjection: committed.realization.hostProjection }),
      koreanPos: 구
    },
  };
}

export function buildAttributiveTypificationQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const quote = options.relation.quote;
  if (quote === undefined || !IU_LEXEME_FORMS.has(quote.hostMatch.hostForm)) {
    return null;
  }
  const hostUnitIndex = options.units.findIndex((unit) => {
    if (!unit.jpIndices.includes(quote.hostMatch.hostIdx)) return false;
    const facts = attributiveModifierPlanSourceFacts(unit.renderPlan);
    return facts !== null && facts.sourcePast &&
      TYPIFICATION_QUOTATIVE_HEADS.has(facts.headDictionaryForm ?? "");
  });
  if (hostUnitIndex < 0) return null;
  const predicateUnitIndex = [...options.sourceUnitIndexes].reverse().find((unitIndex) =>
    isPredicateHeadTailChainRenderPlan(options.units[unitIndex]?.renderPlan)
  ) ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined) return null;
  const unquoted = projectUnitWithoutQuoteMarkerConnectivePlan(
    predicateUnit,
    opSourceForMarkerSpans(options.tokens, options.relation.markerSpans),
  );
  const attributive = unquoted === null ? null : projectPredicateHeadTailAttributivePlan(unquoted);
  if (attributive === null) return null;
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    options.sourceUnitIndexes,
    new Map([[predicateUnitIndex, attributive]]),
  );
  if (sourcePlan === null) return null;
  const renderPlan = structuralRelationSequencePlan([
    sourcePlan,
    { kind: "structuralText", text: " 등의", koreanPos: 구 },
  ]);
  if (renderPlan === null) return null;
  const suppressUnitIndexes = uniqueSorted([
    ...options.sourceUnitIndexes,
    ...options.markerUnitIndexes,
    hostUnitIndex,
  ]).filter((unitIndex) => options.units[unitIndex]?.unitType !== UnitType.SYMBOL);
  return {
    relation: options.relation,
    insertBeforeUnitIndex: options.sourceUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((unitIndex) => options.units[unitIndex]?.jpIndices ?? [])),
    renderPlan,
  };
}

export function buildMarkerAbsorbedContentCopulaRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
}): RelationRenderOperation | null {
  const quote = options.relation.quote;
  const copulaIdx = quote?.markerAbsorbedContentCopulaIdx;
  const contentPredicateIdx = quote?.contentPredicateIdx;
  if (
    quote === undefined ||
    copulaIdx === undefined ||
    contentPredicateIdx === undefined ||
    contentPredicateIdx === null ||
    quote.terminalSfp !== undefined && quote.terminalSfp !== null
  ) {
    return null;
  }
  const sourceUnitIndex = options.sourceUnitIndexes.find((unitIndex) =>
    options.units[unitIndex]?.jpIndices.includes(contentPredicateIdx) === true
  );
  const sourceUnit = sourceUnitIndex === undefined ? undefined : options.units[sourceUnitIndex];
  const plan = sourceUnit?.renderPlan;
  const absorbedAux = plan?.kind === "lemma" ? plan.auxTokens[0] : undefined;
  if (
    sourceUnitIndex === undefined ||
    sourceUnit === undefined ||
    plan?.kind !== "lemma" ||
    (plan.koreanPos !== 명사 && plan.koreanPos !== 대명사) ||
    (plan.terminalSfp !== undefined && plan.terminalSfp !== null) ||
    plan.auxTokens.length !== 1 ||
    absorbedAux === undefined ||
    !sourceUnit.jpIndices.includes(copulaIdx) ||
    absorbedAux.surface !== "だ" ||
    !isTerminalAssertiveCopulaToken(absorbedAux)
  ) {
    return null;
  }
  const quotativeMarkerUnitIndex = options.markerUnitIndexes.find((unitIndex) =>
    unitIndex !== sourceUnitIndex &&
    options.units[unitIndex]?.unitType === UnitType.FUNCTIONAL
  );
  return {
    relation: options.relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    replaceUnitIndex: sourceUnitIndex,
    suppressUnitIndexes: [],
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(sourceUnit.jpIndices),
    renderPlan: { ...plan, auxTokens: [] },
    ...(quotativeMarkerUnitIndex === undefined ? {} : { quotativeMarkerUnitIndex }),
  };
}

export function buildSfpQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const quote = options.relation.quote;
  if (
    quote === undefined ||
    (quote.slotKind !== "quoted_content" && quote.slotKind !== "question_content" && quote.slotKind !== "request_content") ||
    quote.terminalSfp === undefined ||
    quote.terminalSfp === null
  ) {
    return null;
  }
  const sourceUnitIndex = quote.contentPredicateIdx === undefined || quote.contentPredicateIdx === null
    ? null
    : options.sourceUnitIndexes.find((unitIndex) =>
      options.units[unitIndex]?.jpIndices.includes(quote.contentPredicateIdx!) === true
    ) ?? null;
  const sourceUnit = sourceUnitIndex === null ? undefined : options.units[sourceUnitIndex];
  if (sourceUnitIndex === null || sourceUnit === undefined) return null;
  const ownerPlan = sourceUnit.renderPlan;
  if (ownerPlan === null) return null;
  const requestReportedAsSpeech = quote.slotKind === "request_content" && (
    quote.hostMatch.requestReportingRole === "speech" || options.targetUnitIndexes.some((unitIndex) => {
    const targetPlan = options.units[unitIndex]?.renderPlan;
    if (targetPlan?.kind === "quoteHostReportingPassive") return true;
    if (
      targetPlan?.kind === "lemma" &&
      (targetPlan.voice === "passive" || targetPlan.forcePassive === true || targetPlan.passiveClass !== undefined)
    ) return true;
    if (targetPlan?.kind === "attributive" && targetPlan.voice === "passive") return true;
    return isPredicateHeadTailChainRenderPlan(targetPlan) &&
      tailRootVoiceOps(targetPlan.realization.root).some((op) => op.voice === "passive");
  }));
  const requestAttributiveHostUnitIndex = quote.slotKind === "request_content"
    ? options.targetUnitIndexes.find((unitIndex) => {
      const unit = options.units[unitIndex];
      return unit?.jpIndices.includes(quote.hostMatch.hostIdx) === true &&
        attributiveModifierPlanSourceFacts(unit.renderPlan)?.carriesNonTenseOperator === false;
    })
    : undefined;
  const requestAttributive = requestAttributiveHostUnitIndex !== undefined && (
    requestReportedAsSpeech || quote.hostMatch.kind === "report"
  );
  if (quote.slotKind === "request_content") {
    if (quote.terminalSfp.effect !== "na_prohib" && quote.terminalSfp.effect !== "na_soft_imperative") return null;
  }
  const wishProjection = quote.hostMatch.kind === "thought" && quote.terminalSfp.effect === "na_excl"
    ? projectSufficiencyWishQuotePlan(ownerPlan)
    : null;
  const nominalRequestFocus = requestReportedAsSpeech ? quote.focusParticle : undefined;
  const projected = wishProjection ?? quoteSfpOwnerInPlacePlan(
    ownerPlan,
    quote.terminalSfp,
    requestReportedAsSpeech,
    requestAttributive,
    nominalRequestFocus,
    quote.terminalSfpMarkerBridgeSpan != null
  );
  if (projected === null) return null;
  const markerUnitIndex = projected.retainQuotativeMarker
    ? options.markerUnitIndexes.find((unitIndex) => options.units[unitIndex]?.jpIndices.includes(quote.markerIdx) === true)
    : undefined;
  const markerSharesOwnerUnit = markerUnitIndex === sourceUnitIndex;
  const ownerProjection = projected.retainQuotativeMarker && (markerUnitIndex === undefined || markerSharesOwnerUnit)
    ? completeSfpQuoteOwnerPlan(projected.plan, quote.terminalSfp)
    : projected.plan;
  if (ownerProjection === null) return null;
  const retainsSeparateMarker = projected.retainQuotativeMarker && markerUnitIndex !== undefined && !markerSharesOwnerUnit;
  const focusParticleKey: ParticleKey | null =
    quote.focusParticle === "は" ? "은/는"
      : quote.focusParticle === "も" ? "도"
      : quote.focusParticle === "でも" ? "이라도/라도"
      : null;
  const ownerChainRealizesQuoteFocus = isPredicateHeadTailChainRenderPlan(ownerProjection) &&
    ownerProjection.realization.root.sfp?.quoteProjection === "terminal_mood" &&
    ownerProjection.realization.root.sfp.quoteFocusParticle !== undefined;
  const focusedPlan = focusParticleKey === null || retainsSeparateMarker ||
    ownerChainRealizesQuoteFocus ||
    (nominalRequestFocus !== undefined && wishProjection === null)
    ? ownerProjection
    : attachParticleRenderPlan(ownerProjection, focusParticleKey);
  if (focusedPlan === null) return null;
  const quotativeMarkerUnitIndex = retainsSeparateMarker ? markerUnitIndex : undefined;
  const suppressUnitIndexes = options.markerUnitIndexes.filter((unitIndex) =>
    unitIndex !== quotativeMarkerUnitIndex && unitIndex !== sourceUnitIndex
  ).concat(!requestAttributive || requestAttributiveHostUnitIndex === undefined ? [] : [requestAttributiveHostUnitIndex]);
  return {
    relation: options.relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted([
      ...sourceUnit.jpIndices,
      ...suppressUnitIndexes.flatMap((unitIndex) => options.units[unitIndex]?.jpIndices ?? []),
    ]),
    renderPlan: focusedPlan,
    replaceUnitIndex: sourceUnitIndex,
    ...(quotativeMarkerUnitIndex === undefined ? {} : { quotativeMarkerUnitIndex }),
  };
}

function projectSufficiencyWishQuotePlan(
  plan: RenderPlan,
): { readonly plan: RenderPlan; readonly retainQuotativeMarker: boolean } | null {
  if (!isPredicateHeadTailChainRenderPlan(plan)) return null;
  const ownerPlan = materializeSfpOwnerStem(plan);
  const tail = rewriteSufficiencyWishTail(ownerPlan.realization.root.tail);
  if (tail === null) return null;
  const conditionalPlan: PredicateHeadTailChainRenderPlan = {
    ...ownerPlan,
    realization: {
      ...ownerPlan.realization,
      root: { ...ownerPlan.realization.root, tail, sfp: null },
    },
  };
  const renderPlan = structuralRelationSequencePlan([
    conditionalPlan,
    { kind: "structuralText", text: " 좋겠다고", koreanPos: 구 },
  ]);
  return renderPlan === null ? null : { plan: renderPlan, retainQuotativeMarker: false };
}

function rewriteSufficiencyWishTail(node: TailNode): TailNode | null {
  if (node.kind === "connective") {
    const inner = rewriteSufficiencyWishAuxLayer(node.inner);
    if (inner !== null) return { ...node, inner };
    const outer = rewriteSufficiencyWishTail(node.outer);
    return outer === null ? null : { ...node, outer };
  }
  return rewriteSufficiencyWishAuxLayer(node);
}

function rewriteSufficiencyWishAuxLayer(layer: AuxLayerNode): AuxLayerNode | null {
  const index = layer.ops.findIndex((op) => op.kind === "idiom" && op.idiom === "sufficiency_conditional");
  const idiom = index < 0 ? undefined : layer.ops[index];
  if (idiom === undefined) return null;
  const conditional: ConnectiveOp = createConnectiveOp({

    connective: "conditional",
    surface: "ば",
    conditionalFlavor: "plain",
    source: idiom.source,
  });
  const prefixOps = layer.ops.slice(0, index).map((op) => {
    if (op.kind !== "voice" || op.candidates?.includes("potential") !== true) return op;
    const { candidates: _candidates, passiveClass: _passiveClass, ...voice } = op;
    return { ...voice, voice: "potential" as const };
  });
  return {
    ...layer,
    terminal: null,
    ops: [...prefixOps, conditional, ...layer.ops.slice(index + 1)],
  };
}

function completeSfpQuoteOwnerPlan(plan: RenderPlan, sfp: SfpNode): RenderPlan | null {
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return {
      ...plan,
      realization: {
        ...plan.realization,
        root: {
          ...plan.realization.root,
          sfp: { ...(plan.realization.root.sfp ?? sfp), quoteProjection: "terminal_mood" },
        },
      },
    };
  }
  return structuralRelationSequencePlan([
    plan,
    { kind: "structuralText", text: "라고", koreanPos: 구 },
  ]);
}

function quoteSfpOwnerInPlacePlan(
  plan: RenderPlan,
  sfp: SfpNode,
  requestReportedAsSpeech = false,
  requestAttributive = false,
  nominalRequestFocus?: QuoteBoundaryFocusParticle,
  markerSeparatedByPunctuation = false,
): { readonly plan: RenderPlan; readonly retainQuotativeMarker: boolean } | null {
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    const ownerPlan = materializeSfpOwnerStem(plan);
    const terminalStem = firstAuxLayer(ownerPlan.realization.root.tail)?.stem;
    const terminalStemSourceForm = terminalStem?.source.tokens[terminalStem.semanticAnchors[0] ?? 0]?.dictionaryForm ??
      terminalStem?.source.tokens[terminalStem.semanticAnchors[0] ?? 0]?.surface;
    const plainNominalNa = sfp.effect === "na_excl" && sfp.surface === "な" && terminalStem?.kind === "noun" &&
      !tailRootHostLayerGovernsCopulaNiComplement(ownerPlan.realization.root) &&
      !SFP_NA_EXCLAMATORY_NOMINALIZERS.has(terminalStemSourceForm ?? "");
    if (plainNominalNa) {
      const withoutSfp = {
        ...ownerPlan,
        realization: {
          ...ownerPlan.realization,
          root: { ...ownerPlan.realization.root, sfp: null },
        },
      };
      const quoted = projectHeadTailConnectivePlan(
        withoutSfp,
        { connective: "quotative", surface: "" },
        sfp.source,
      );
      return quoted === null ? null : { plan: quoted, retainQuotativeMarker: false };
    }
    const imperative = ownerPlan.realization.root.tail.kind === "auxLayer" &&
      ownerPlan.realization.root.tail.terminal === "imperative";
    if (
      sfp.effect === "na_soft_imperative" &&
      ownerPlan.realization.root.tail.kind === "auxLayer" &&
      ownerPlan.realization.root.tail.stem.kind === "verb" &&
      ownerPlan.realization.root.tail.ops.length === 0
    ) {
      const stem = ownerPlan.realization.root.tail.stem;
      return {
        plan: {
          kind: "conjugatedLemma",
          koreanLemma: stem.lemma,
          irregular: stem.irregular,
          koreanPos: 동사,
          ending: "(으)라고",
          auxTokens: [],
        },
        retainQuotativeMarker: false,
      };
    }
    const quoteProjection = quoteProjectionForSfpEffect(sfp.effect, imperative);
    if (quoteProjection === "assertive") {
      const withoutSfp = {
        ...ownerPlan,
        realization: {
          ...ownerPlan.realization,
          root: { ...ownerPlan.realization.root, sfp: null },
        },
      };
      const quoted = projectHeadTailConnectivePlan(
        withoutSfp,
        { connective: "quotative", surface: "" },
        sfp.source,
      );
      return quoted === null ? null : { plan: quoted, retainQuotativeMarker: false };
    }
    if (quoteProjection === "terminal_mood" && !imperative) {
      if (markerSeparatedByPunctuation) {
        return { plan: ownerPlan, retainQuotativeMarker: true };
      }
      if (sfp.effect === "na_soft_imperative") {
        const withoutSfp = {
          ...ownerPlan,
          realization: {
            ...ownerPlan.realization,
            root: { ...ownerPlan.realization.root, sfp: null },
          },
        };
        const quoted = projectHeadTailConnectivePlan(
          withoutSfp,
          { connective: "quotative", surface: "", quotativeMood: "imperative" },
          sfp.source,
        );
        return quoted === null ? null : { plan: quoted, retainQuotativeMarker: false };
      }
      return {
        plan: {
          ...ownerPlan,
          realization: {
            ...ownerPlan.realization,
            root: {
              ...ownerPlan.realization.root,
              sfp: { ...(ownerPlan.realization.root.sfp ?? sfp), quoteProjection: "terminal_mood" },
            },
          },
        },
        retainQuotativeMarker: false,
      };
    }
    const prohibitiveProjection: SfpNode["quoteProjection"] = requestReportedAsSpeech
      ? "reported_request"
      : requestAttributive
        ? "attributive_request"
        : "prohibitive";
    const projected = {
      ...ownerPlan,
      realization: {
        ...ownerPlan.realization,
        root: {
          ...ownerPlan.realization.root,
          sfp: quoteProjection === "prohibitive"
            ? {
              ...(ownerPlan.realization.root.sfp ?? sfp),
              quoteProjection: prohibitiveProjection,
              ...(prohibitiveProjection === "reported_request" && nominalRequestFocus !== undefined
                ? { quoteFocusParticle: nominalRequestFocus }
                : {}),
            }
            : null,
        },
      },
    };
    if (imperative) {
      const quoted = projectHeadTailConnectivePlan(
        projected,
        { connective: "quotative", surface: "", quotativeMood: "imperative" },
        sfp.source,
      );
      return quoted === null ? null : { plan: quoted, retainQuotativeMarker: false };
    }
    return { plan: projected, retainQuotativeMarker: false };
  }
  if (plan.kind === "lemma") {
    const predicate = plan.koreanPos === 동사 || plan.koreanPos === 형용사;
    if (sfp.effect === "ka") {
      const questionPlan: LemmaRealization = { ...plan, sfp: null, terminalSfp: null, connective: "는지" };
      if (plan.koreanPos === 명사) return { plan: questionPlan, retainQuotativeMarker: false };
      const quotedQuestion = structuralRelationSequencePlan([
        questionPlan,
        { kind: "structuralText", text: "라고", koreanPos: 구 },
      ]);
      return quotedQuestion === null ? null : { plan: quotedQuestion, retainQuotativeMarker: false };
    }
    if (!predicate) {
      const preserve = quoteProjectionForSfpEffect(sfp.effect, false) === "terminal_mood" &&
        (sfp.effect !== "na_excl" || sfp.surface !== "な" || SFP_NA_EXCLAMATORY_NOMINALIZERS.has(plan.jpDictForm ?? ""));
      return {
        plan: preserve ? plan : { ...plan, auxTokens: [], sfp: null, connective: null },
        retainQuotativeMarker: true,
      };
    }
    const projected = quoteLemmaSfpOwnerPlan(plan, sfp.effect);
    if (projected === null) return null;
    const retain = plan.isImperative !== true &&
      sfp.effect !== "na_prohib" &&
      sfp.effect !== "na_soft_imperative" &&
      quoteProjectionForSfpEffect(sfp.effect, false) === "terminal_mood";
    return { plan: retain ? plan : projected, retainQuotativeMarker: retain };
  }
  if (plan.kind === "copulaPredicate") {
    const preserve = quoteProjectionForSfpEffect(sfp.effect, false) === "terminal_mood";
    return preserve
      ? { plan, retainQuotativeMarker: true }
      : { plan: { ...plan, sfp: null, connective: "다고" }, retainQuotativeMarker: false };
  }
  return null;
}

function materializeSfpOwnerStem(plan: PredicateHeadTailChainRenderPlan): PredicateHeadTailChainRenderPlan {
  const materializedTail = clearTailNodeTerminal(materializeTailNodeStem(plan.realization.root.tail));
  return materializedTail === plan.realization.root.tail
    ? plan
    : {
      ...plan,
      realization: {
        ...plan.realization,
        root: { ...plan.realization.root, tail: materializedTail },
      },
    };
}

function clearTailNodeTerminal(node: TailNode): TailNode {
  if (node.kind === "connective") {
    const inner = node.inner.terminal === null ? node.inner : { ...node.inner, terminal: null };
    const outer = clearTailNodeTerminal(node.outer);
    return inner === node.inner && outer === node.outer ? node : { ...node, inner, outer };
  }
  return node.terminal === null ? node : { ...node, terminal: null };
}

function materializeTailNodeStem(node: TailNode): TailNode {
  if (node.kind === "connective") {
    const inner = materializeAuxLayerStem(node.inner);
    const outer = materializeTailNodeStem(node.outer);
    return inner === node.inner && outer === node.outer ? node : { ...node, inner, outer };
  }
  return materializeAuxLayerStem(node);
}

function materializeAuxLayerStem(node: AuxLayerNode): AuxLayerNode {
  return resolveCandidateSetLayer(node);
}

function quoteLemmaSfpOwnerPlan(sourcePlan: LemmaRealization, effect: SfpEffect | null): RenderPlan | null {
  const predicate = sourcePlan.koreanPos === 동사 || sourcePlan.koreanPos === 형용사;
  if (!predicate) {
    return null;
  }
  if (effect === "na_prohib") {
    return {
      kind: "conjugatedLemma",
      koreanLemma: sourcePlan.koreanLemma,
      irregular: sourcePlan.irregular,
      koreanPos: sourcePlan.koreanPos,
      ending: "지 말라고",
      auxTokens: sourcePlan.auxTokens,
      ...(typeof sourcePlan.prefix === "string" ? { prefix: sourcePlan.prefix } : {}),
      ...(sourcePlan.jpDictForm === undefined ? {} : { jpDictForm: sourcePlan.jpDictForm }),
      ...(sourcePlan.verbConjType === undefined ? {} : { verbConjType: sourcePlan.verbConjType }),
      ...(sourcePlan.voice === undefined ? {} : { voice: sourcePlan.voice }),
    };
  }
  if (effect === "na_soft_imperative") {
    return {
      kind: "conjugatedLemma",
      koreanLemma: sourcePlan.koreanLemma,
      irregular: sourcePlan.irregular,
      koreanPos: sourcePlan.koreanPos,
      ending: "(으)라고",
      auxTokens: sourcePlan.auxTokens,
      ...(typeof sourcePlan.prefix === "string" ? { prefix: sourcePlan.prefix } : {}),
      ...(sourcePlan.jpDictForm === undefined ? {} : { jpDictForm: sourcePlan.jpDictForm }),
      ...(sourcePlan.verbConjType === undefined ? {} : { verbConjType: sourcePlan.verbConjType }),
      ...(sourcePlan.voice === undefined ? {} : { voice: sourcePlan.voice }),
    };
  }
  if (sourcePlan.isImperative === true) {
    return {
      kind: "conjugatedLemma",
      koreanLemma: sourcePlan.koreanLemma,
      irregular: sourcePlan.irregular,
      koreanPos: sourcePlan.koreanPos,
      ending: "(으)라고",
      auxTokens: sourcePlan.auxTokens,
      ...(typeof sourcePlan.prefix === "string" ? { prefix: sourcePlan.prefix } : {}),
      ...(sourcePlan.jpDictForm === undefined ? {} : { jpDictForm: sourcePlan.jpDictForm }),
      ...(sourcePlan.verbConjType === undefined ? {} : { verbConjType: sourcePlan.verbConjType }),
      ...(sourcePlan.voice === undefined ? {} : { voice: sourcePlan.voice }),
    };
  }
  if (quoteProjectionForSfpEffect(effect, false) === "terminal_mood") {
    return sourcePlan;
  }
  return {
    ...sourcePlan,
    connective: "다고",
    sfp: null,
  } satisfies LemmaRealization;
}

function conditionalClauseSpanAt(
  graph: StructuralRelationGraph,
  conditionalIdx: number,
): StructuralRelationTokenSpan | null {
  return graph.nodes
    .filter((node) => node.span.start <= conditionalIdx && conditionalIdx < node.span.endExclusive)
    .sort((left, right) =>
      (left.span.endExclusive - left.span.start) - (right.span.endExclusive - right.span.start)
    )[0]?.span ?? null;
}

function conditionalClauseSourceUnitIndexes(
  graph: StructuralRelationGraph,
  units: readonly TranslationUnit[],
  sourceUnitIndexes: readonly number[],
  conditionalIdx: number,
): readonly number[] {
  const span = conditionalClauseSpanAt(graph, conditionalIdx);
  if (span === null) return sourceUnitIndexes;
  return sourceUnitIndexes.filter((unitIndex) =>
    units[unitIndex]?.jpIndices.some((tokenIndex) =>
      span.start <= tokenIndex && tokenIndex < span.endExclusive
    ) === true
  );
}

function rootWithStructuralQuoteMarker(
  root: TailRoot,
  quote: NonNullable<StructuralRelation["quote"]>,
  markerSource: OpSource,
  connective: "quotative" | "wish_complement",
): TailRoot {
  if (root.tail.kind !== "auxLayer") return root;
  const last = root.tail.ops.at(-1);
  if (
    last?.kind === "connective" &&
    (
      last.connective === "quotative" ||
      last.connective === "question_quotative" ||
      last.connective === "wish_complement"
    )
  ) {
    return root;
  }
  const markerConnective: ConnectiveOp = createConnectiveOp({

    connective,
    surface: quote.markerBaseSurface,
    source: markerSource,
  });
  return {
    ...root,
    tail: { ...root.tail, ops: [...root.tail.ops, markerConnective] },
  };
}

function thoughtHostHasConditionalContinuation(options: {
  readonly units: readonly TranslationUnit[];
  readonly targetUnitIndexes: readonly number[];
  readonly hostIdx: number;
}): boolean {
  const hostUnitIndex = sourceUnitIndexesWithToken(
    options.units,
    options.targetUnitIndexes,
    options.hostIdx,
  ).find((unitIndex) => isPredicateHeadTailChainRenderPlan(options.units[unitIndex]?.renderPlan ?? null));
  if (hostUnitIndex === undefined) return false;
  const plan = options.units[hostUnitIndex]?.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return false;
  }
  const finalOp = plan.realization.root.tail.ops.at(-1);
  return finalOp?.kind === "connective" && finalOp.connective === "conditional";
}

function rootHasDirectPositivePotentialRecipientBenefactiveWishEvidence(root: TailRoot): boolean {
  if (root.tail.kind !== "auxLayer") return false;
  return root.tail.ops.some((op, index, ops) => {
    if (
      !isBenefactiveAspectOp(op) ||
      !op.benefactive.potential ||
      (op.benefactive.kind !== "morau" && op.benefactive.kind !== "itadaku")
    ) {
      return false;
    }
    const conditional = ops[index + 1];
    return conditional?.kind === "connective" && conditional.connective === "conditional";
  });
}

function quoteMarkerDirectlyPrecedesHost(
  tokens: readonly RuntimeHaruToken[],
  quote: NonNullable<StructuralRelation["quote"]>,
): boolean {
  const hostStart = quote.hostMatch.supportIdx ?? quote.hostMatch.hostIdx;
  const previous = previousNonSpaceIndex(tokens, hostStart);
  return previous !== null &&
    quote.markerSpan.start <= previous &&
    previous < quote.markerSpan.endExclusive;
}

export function buildConditionalWishQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly graph: StructuralRelationGraph;
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
    !(
      (quote.slotKind === "quoted_content" && quote.hostMatch.kind === "thought") ||
      (quote.slotKind === "wish_content" && quote.hostMatch.kind === "wish")
    ) ||
    quote.contentSpan.endExclusive !== quote.markerIdx
  ) {
    return null;
  }
  if (quote.conditionalContent?.subtype !== "affirmative_wish") {
    return null;
  }
  const thoughtHostConditionalContinuation = quote.hostMatch.kind === "thought" &&
    thoughtHostHasConditionalContinuation({
      units: options.units,
      targetUnitIndexes: options.targetUnitIndexes,
      hostIdx: quote.hostMatch.hostIdx,
    });
  const conditionalIdx = quote.conditionalContent.tokenIdx;
  const predicateUnitIndex = sourceUnitIndexesWithToken(
    options.units,
    uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes]),
    conditionalIdx,
  )
    .find((unitIndex) => options.units[unitIndex]?.renderPlan?.kind === "headTailChain") ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined || predicateUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const predicateRenderPlan = predicateUnit.renderPlan;
  if (
    !isPredicateHeadTailChainRenderPlan(predicateRenderPlan) ||
    predicateRenderPlan.realization.root.tail.kind !== "auxLayer"
  ) {
    return null;
  }
  if (
    thoughtHostConditionalContinuation &&
    !rootHasDirectPositivePotentialRecipientBenefactiveWishEvidence(predicateRenderPlan.realization.root)
  ) {
    return null;
  }
  const quoteMarkerSource = opSourceForMarkerSpans(options.tokens, relation.markerSpans);
  if (quoteMarkerSource === null) {
    return null;
  }
  const productionRoot = rootWithStructuralQuoteMarker(
    predicateRenderPlan.realization.root,
    quote,
    quoteMarkerSource,
    "wish_complement",
  );
  const productionDispatch = probeProductionDispatch(
    productionRoot,
    {
      relations: [relation],
      intake: { site: "committed_render", partial: false }
    }
  );
  if (
    productionDispatch.kind !== "registry" ||
    !isConditionalQuoteProductionMatch(productionDispatch.match)
  ) {
    return null;
  }
  const predicatePlan = projectUnitWithoutQuoteMarkerConnectivePlan(
    predicateUnit,
    quoteMarkerSource,
    rootHasDirectPositivePotentialRecipientBenefactiveWishEvidence(predicateRenderPlan.realization.root) ||
      quoteMarkerDirectlyPrecedesHost(options.tokens, quote),
    normalizeProductionMatch(productionRoot, productionDispatch.match),
  );
  if (predicatePlan === null) {
    return null;
  }
  const localSourceUnitIndexes = conditionalClauseSourceUnitIndexes(
    options.graph,
    options.units,
    options.sourceUnitIndexes,
    conditionalIdx,
  );
  const conditionalClauseSpan = conditionalClauseSpanAt(options.graph, conditionalIdx) ?? quote.contentSpan;
  const internalSymbolUnitIndexes = unitIndexesInSpan(options.units, conditionalClauseSpan)
    .filter((unitIndex) => options.units[unitIndex]?.unitType === UnitType.SYMBOL);
  const wishSourceUnitIndexes = uniqueSorted([
    ...localSourceUnitIndexes,
    ...internalSymbolUnitIndexes,
  ]);
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    wishSourceUnitIndexes,
    new Map([[predicateUnitIndex, predicatePlan]])
  );
  if (sourcePlan === null) {
    return null;
  }
  const thoughtSuffix: StructuralRelationSequencePart = {
    kind: "structuralText",
    text: " 좋겠다고",
    koreanPos: 구,
    sourceSpan: sourceSpanForStructuralTokenSpan(options.tokens, relation.markerSpans[0] ?? quote.markerSpan),
  };
  const renderPlan = structuralRelationSequencePlan([sourcePlan, thoughtSuffix]);
  if (renderPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([...wishSourceUnitIndexes, ...options.markerUnitIndexes]);
  return {
    relation,
    insertBeforeUnitIndex: wishSourceUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: wishSourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan,
  };
}

export function buildConditionalThoughtQuoteMarkerStructuredRenderOperation(options: {
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
  const conditionalContent = quote?.conditionalContent;
  const conditionalSubtype = conditionalContent?.subtype;
  const continuationHandoff = quote !== undefined &&
    conditionalSubtype === "affirmative_wish" &&
    thoughtHostHasConditionalContinuation({
      units: options.units,
      targetUnitIndexes: options.targetUnitIndexes,
      hostIdx: quote.hostMatch.hostIdx,
    });
  if (
    quote === undefined ||
    quote.slotKind !== "quoted_content" ||
    quote.hostMatch.kind !== "thought" ||
    quote.contentSpan.endExclusive !== quote.markerIdx ||
    conditionalContent === undefined ||
    !(conditionalSubtype === "conditional" || continuationHandoff)
  ) {
    return null;
  }
  const conditionalIdx = conditionalContent.tokenIdx;
  const predicateUnitIndex = sourceUnitIndexesWithToken(
    options.units,
    uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes]),
    conditionalIdx,
  )
    .find((unitIndex) => options.units[unitIndex]?.renderPlan?.kind === "headTailChain") ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined || predicateUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const quoteMarkerSource = opSourceForMarkerSpans(options.tokens, relation.markerSpans);
  const predicateRenderPlan = predicateUnit.renderPlan;
  if (
    !isPredicateHeadTailChainRenderPlan(predicateRenderPlan) ||
    predicateRenderPlan.realization.root.tail.kind !== "auxLayer" ||
    quoteMarkerSource === null
  ) {
    return null;
  }
  const productionRoot = rootWithStructuralQuoteMarker(
    predicateRenderPlan.realization.root,
    quote,
    quoteMarkerSource,
    "quotative",
  );
  const productionDispatch = probeProductionDispatch(productionRoot, {
    relations: [relation],
    intake: { site: "committed_render", partial: false },
  });
  if (
    productionDispatch.kind !== "registry" ||
    !isConditionalQuoteProductionMatch(productionDispatch.match)
  ) {
    return null;
  }
  if (
    continuationHandoff &&
    rootHasDirectPositivePotentialRecipientBenefactiveWishEvidence(predicateRenderPlan.realization.root)
  ) {
    return null;
  }
  const predicatePlan = projectUnitWithoutQuoteMarkerConnectivePlan(
    predicateUnit,
    quoteMarkerSource,
    continuationHandoff,
    normalizeProductionMatch(productionRoot, productionDispatch.match),
  );
  const obligationPlan = predicatePlan === null
    ? null
    : continuationHandoff
      ? predicatePlan
      : projectNegativeConditionalObligationPlan(predicatePlan, options.tokens, conditionalIdx) ?? predicatePlan;
  const quotedPredicatePlan = obligationPlan === null
    ? null
    : projectHeadTailConnectivePlan(
      obligationPlan,
      { connective: "quotative", surface: quote.markerBaseSurface },
      quoteMarkerSource,
      false,
      null,
      "append",
    );
  if (quotedPredicatePlan === null) {
    return null;
  }
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    options.sourceUnitIndexes,
    new Map([[predicateUnitIndex, quotedPredicatePlan]])
  );
  if (sourcePlan === null) {
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
    renderPlan: sourcePlan,
  };
}

export function buildConditionalReportQuoteStructuredRenderOperation(options: {
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
    quote.contentSpan.endExclusive !== quote.markerIdx ||
    quote.hostMatch.kind !== "report" ||
    quote.conditionalContent === undefined
  ) {
    return null;
  }
  const conditionalIdx = quote.conditionalContent.tokenIdx;
  const predicateUnitIndex = sourceUnitIndexesWithToken(
    options.units,
    uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes]),
    conditionalIdx,
  )
    .find((unitIndex) => options.units[unitIndex]?.renderPlan?.kind === "headTailChain") ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined || predicateUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const predicatePlan = projectUnitWithoutQuoteMarkerConnectivePlan(
    predicateUnit,
    opSourceForMarkerSpans(options.tokens, relation.markerSpans),
  );
  if (predicatePlan === null) {
    return null;
  }
  const internalSymbolUnitIndexes = unitIndexesInSpan(options.units, quote.contentSpan)
    .filter((unitIndex) => options.units[unitIndex]?.unitType === UnitType.SYMBOL);
  const reportSourceUnitIndexes = uniqueSorted([
    ...options.sourceUnitIndexes,
    ...internalSymbolUnitIndexes,
  ]);
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    reportSourceUnitIndexes,
    new Map([[predicateUnitIndex, predicatePlan]]),
  );
  if (sourcePlan === null) {
    return null;
  }
  const quoteSuffix: StructuralRelationSequencePart = {
    kind: "structuralText",
    text: " 하고",
    koreanPos: 구,
    sourceSpan: sourceSpanForStructuralTokenSpan(options.tokens, relation.markerSpans[0] ?? quote.markerSpan),
  };
  const renderPlan = structuralRelationSequencePlan([sourcePlan, quoteSuffix]);
  if (renderPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([...reportSourceUnitIndexes, ...options.markerUnitIndexes]);
  return {
    relation,
    insertBeforeUnitIndex: reportSourceUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: reportSourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((unitIndex) => (
      options.units[unitIndex]?.jpIndices ?? []
    ))),
    renderPlan,
  };
}

function projectNegativeConditionalObligationPlan(
  plan: PredicateHeadTailChainRenderPlan,
  tokens: readonly RuntimeHaruToken[],
  conditionalIdx: number,
): PredicateHeadTailChainRenderPlan | null {
  const tail = plan.realization.root.tail;
  if (tail.kind !== "auxLayer") return null;
  const conditionalOpIdx = tail.ops.findIndex((op) =>
    op.kind === "connective" && op.source.tokenIndices.includes(conditionalIdx)
  );
  if (conditionalOpIdx < 0) return null;
  let negationOpIdx = -1;
  for (let index = conditionalOpIdx - 1; index >= 0; index -= 1) {
    if (tail.ops[index]?.kind === "negation") {
      negationOpIdx = index;
      break;
    }
  }
  if (negationOpIdx < 0) return null;
  const negationOp = tail.ops[negationOpIdx]!;
  const sourceIndices = uniqueSorted([...negationOp.source.tokenIndices, conditionalIdx]);
  const obligation: ObligationIdiomOp = createIdiomOp({

    idiom: "obligation",
    variant: tokens[conditionalIdx]?.surface === "ば" ? "standard_nakereba" : "colloquial_naito_elided",
    polarity: "affirmative",
    polite: false,
    past: false,
    source: {
      tokens: sourceIndices.flatMap((index) => tokens[index] === undefined ? [] : [tokens[index]]),
      tokenIndices: sourceIndices,
    },
  });
  const ops = tail.ops.filter((_, index) => index !== negationOpIdx && index !== conditionalOpIdx);
  ops.splice(Math.min(negationOpIdx, ops.length), 0, obligation);
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: { ...tail, ops },
      },
    },
  };
}

export function buildPredicateBoundTameQuoteStructuredRenderOperation(options: {
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
  if (quote === undefined || quote.slotKind !== "quoted_content") {
    return null;
  }
  const tameIdx = previousNonSpaceTokenIndex(options.tokens, quote.markerIdx);
  const tame = tameIdx === null ? undefined : options.tokens[tameIdx];
  const tameForm = tame?.dictionaryForm || tame?.surface;
  if (
    tameIdx === null ||
    tameIdx < quote.contentSpan.start ||
    tameIdx >= quote.contentSpan.endExclusive ||
    (tameForm !== "ため" && tameForm !== "為")
  ) {
    return null;
  }
  const sourceUnitIndex = sourceUnitIndexesWithPredicateBoundTame(options.units, options.sourceUnitIndexes, tameIdx)[0] ?? null;
  const sourceUnit = sourceUnitIndex === null ? undefined : options.units[sourceUnitIndex];
  if (sourceUnitIndex === null || sourceUnit === undefined || sourceUnit.unitType === UnitType.SYMBOL || sourceUnit.renderPlan === null) {
    return null;
  }
  const sourcePlan = projectUnitPredicateConnectivePlan(
    sourceUnit,
    predicateBoundTameQuoteConnective(sourceUnit, options.tokens, tameIdx, tame?.surface ?? "ため", options.lookups)
  ) ?? sourceUnit.renderPlan;
  const quotedPlan = attachParticleRenderPlan(sourcePlan, "이라고/라고");
  if (quotedPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([sourceUnitIndex, ...options.markerUnitIndexes])
    .filter((candidateIndex) => options.units[candidateIndex]?.unitType !== UnitType.SYMBOL);
  return {
    relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan: quotedPlan,
  };
}

function sourceUnitIndexesWithPredicateBoundTame(
  units: readonly TranslationUnit[],
  sourceUnitIndexes: readonly number[],
  tameIdx: number,
): readonly number[] {
  return sourceUnitIndexes.filter((unitIndex) => {
    const unit = units[unitIndex];
    return unit !== undefined &&
      unit.renderPlan?.kind === "headTailChain" &&
      unit.jpIndices.includes(tameIdx);
  });
}

function projectUnitWithoutQuoteMarkerConnectivePlan(
  unit: TranslationUnit,
  quoteMarkerSource: OpSource | null,
  allowSeparatedMarker = false,
  registryNormalizedRoot: TailRoot | null = null,
): PredicateHeadTailChainRenderPlan | null {
  const plan = unit.renderPlan;
  if (
    !isPredicateHeadTailChainRenderPlan(plan) ||
    plan.realization.root.tail.kind !== "auxLayer" ||
    quoteMarkerSource === null ||
    (registryNormalizedRoot !== null && registryNormalizedRoot.tail.kind !== "auxLayer")
  ) {
    return null;
  }
  const layer = plan.realization.root.tail;
  const ownsQuoteMarker = layer.ops.some((op) =>
    op.kind === "connective" && opSourceCoveredBy(op.source, quoteMarkerSource)
  );
  if (!ownsQuoteMarker && !allowSeparatedMarker) {
    return null;
  }
  const normalizedLayer = registryNormalizedRoot?.tail.kind === "auxLayer"
    ? registryNormalizedRoot.tail
    : null;
  const projectedOps = (normalizedLayer?.ops ?? layer.ops.filter((op) => !(
    op.kind === "connective" && opSourceCoveredBy(op.source, quoteMarkerSource)
  ))).map((op) => (
    op.kind === "connective" && op.connective === "conditional" && op.surface === "ば"
      ? { ...op, conditionalFlavor: "plain" as const }
      : op
  ));
  const projectedLayer: AuxLayerNode = {
    ...(normalizedLayer ?? layer),
    ops: projectedOps,
    terminal: null,
  };
  const projectedRoot = {
    ...(registryNormalizedRoot ?? plan.realization.root),
    tail: projectedLayer,
  };
  const lastConnective = [...projectedOps].reverse().find((op): op is ConnectiveOp => op.kind === "connective") ?? null;
  const projectedBoundary = lastConnective === null
    ? { kind: "terminal" as const }
    : connectiveBoundaryForProjection(
      plan,
      { connective: lastConnective.connective, surface: lastConnective.surface },
      lastConnective.source
    );
  const {
    headTailCandidate: _headTailCandidate,
    headTailSourceCandidate: _headTailSourceCandidate,
    ...planWithoutOriginalSourceCandidate
  } = plan;
  const { partial: _partial, ...realizationWithoutPartial } = plan.realization;
  return {
    ...planWithoutOriginalSourceCandidate,
    clauseRole: { ...plan.clauseRole, outgoingBoundary: projectedBoundary },
    realization: {
      ...realizationWithoutPartial,
      root: projectedRoot,
      warnings: resolvedStructuralProjectionWarnings(plan.realization.warnings),
    },
  };
}

function predicateBoundTameQuoteConnective(
  unit: TranslationUnit,
  tokens: readonly RuntimeHaruToken[],
  tameIdx: number,
  surface: string,
  lookups: LookupTables,
): { readonly connective: ConnectiveKind; readonly surface: string } {
  const plan = unit.renderPlan;
  return {
    connective: plan?.kind === "headTailChain" &&
      plan.realization.kind === "predicate" &&
      tailPredicateHostPrefersTameReason({
        root: plan.realization.root,
        tokens,
        tameIndex: tameIdx,
        lookups,
      })
      ? "tame_reason"
      : "tame_purpose",
    surface,
  };
}
