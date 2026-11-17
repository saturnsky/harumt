import {
  applyEndingToPastStem,
  koreanPredicateAuxChain,
  nounCopula,
  resolveAdversativePassiveChain,
  resolveAdversativePassiveChainConnective,
  renderKoreanPredicateTerminal,
  renderKoreanPredicateConnective,
  extractFeatures,
  nodaCopula,
  nounCopulaConnective,
  resolvePotentialChain,
  resolvePotentialChainConnective,
  resolvePassiveLemma,
  roleCatNyaCount,
  roleCatNyaSuffix,
  shortNegationPrefix,
  type AuxToken
} from "../../generator/aux-map.js";
import { asIrregular, conjugate, type IrregularType } from "../../generator/conjugator.js";
import { realizeNumeral } from "../../generator/numeral-realization.js";
import { hasBatchim, selectParticle } from "../../generator/particles.js";
import { allomorphReadingForRealizedText, quantityUnitPhraseReading, trailingAllomorphHostText } from "./allomorph-host.js";
import { isNegativeAuxToken, longNegativeLemma, stripFirstNegativeAux } from "./negative-polish.js";
import { rederiveStemDerivation } from "./stem-derivation.js";
import { resolveAttributive, resolveAttributiveForTail } from "../attributive.js";
import { nodaAttributive, renderKamoShirenaiTail } from "../semantics/grammar-runtime.js";
import { resolveCopulaAdj } from "../semantics/copula-tail-runtime.js";
import { normalizeGiveRequest } from "./request-normalization.js";
import { PRONOUN_POSSESSIVE_CONTRACTIONS, PRONOUN_SUBJECT_CONTRACTIONS } from "../pronominal-no-dispatch.js";
import { pronominalNoNominalHeadSurface } from "../nominal-phrase-surface.js";
import { metadataIrregular, metadataKoreanPolite, metadataKoreanPos, metadataTeIruResultative, type MetadataEntry } from "../translation/metadata.js";
import type {
  AttributiveBoundaryPayload,
  AuxLayerNode,
  AuxOpNode,
  StemNode,
  TailRoot,
  TeFormConnectiveRole
} from "../head-tail/tail/predicate-root/grammar.js";
import { renderTail, renderTailPredicateGerundProjection, renderTailWithSourceTargetTrace } from "../head-tail/tail/predicate-root/render.js";
import type { PredicateHeadTailChainHostSequencePart } from "../head-tail/lifecycle/head-tail-render-plan.js";
import {
  buildSharedTailChainRenderResult,
  commitSharedTailParserGerundRoot,
  commitSharedTailParserChain,
  commitSharedTailParserRoot,
  renderHeadTailChainRenderPlan,
  withProjectedHostBase,
  type SharedTailChainRenderResult
} from "../head-tail/lifecycle/render.js";
import { auxOpsInTailNode, firstAuxLayer, layerFinalScopeCarriesSourcePast, tailRootClosesWithAttributiveTerminal } from "../head-tail/tail/predicate-root/inspect.js";
import {
  replaceTailChainConnective,
  replaceTailRootStemLemma,
  lemmaEffectiveConnective
} from "../head-tail/lifecycle/rewrite.js";
import { clauseRoleCommitContext } from "../head-tail/lifecycle/commit-context.js";
import type { HeadTailCandidateTraceDescriptor } from "../head-tail/head/profile.js";
import type { HeadTailCandidate } from "../head-tail/tail/chain.js";
import { commitTail, resolveCandidateSetStem } from "../head-tail/tail/predicate-root/commit.js";
import { renderAniTerminal } from "../head-tail/tail/korean-terminal.js";
import { renderRepeatedFunctionalChainText } from "./functional-chain.js";
import { isWideScopeNegativeSurfaceCarrierAuxiliary } from "../semantics/surface-carrier-auxiliaries.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { RenderedTarget, TargetSegment } from "../../types/projection.js";
import type { AttributiveRealization, ConjugatedLemmaPlan, CopulaPredicatePlan, CompoundNominalSuffixPlan, CompoundNominalSuffixPayload, ConjectureThoughtQuotePlan, DiscourseConnectivePayload, FunctionalChainResidualPlan, GiveRequestPlan, HybridPostAuxPayload, HybridPostAuxPlan, ReasonBecausePlan, ReasonBecausePayload, SimilePredicatePayload, YoudaModalityPlan, YoudaModalityPayload, NominalConnectiveScopePlan, NominalConnectiveScopePayload, NominalDemoAruPlan, NominalDemoAruPayload, LemmaRealization, NodaPlan, ParticleizedLemmaPlan, PredicateNominalScopePlan, PredicateScopeCarrierPlan, PredicateScopePlan, QuoteCognitionHostPlan, QuoteHostReportingPassivePlan, RenderPlan, StemDerivation, StemDerivationHost, StructuralRelationSequencePlan, NominalHeadTailChainPlan, PredicateHeadTailChainRenderPlan, TeConnectiveBoundaryChoice, Voice, WakeExplanationPlan, WakeExplanationPayload, ParticleSourceProvenance } from "../../types/render-plan.js";
import { isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { PassiveClass } from "../voice-class.js";
import type { LookupTables } from "../lookup-tables.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";

export interface RenderTraceOptions {
  readonly formal?: boolean;
  readonly lookups: LookupTables;
  readonly numeric?: NumericTables;
  readonly sourceSpan?: TargetSegment["sourceSpan"];
  readonly unit?: TargetSegment["unit"];
  readonly tokens?: readonly RuntimeHaruToken[];
  readonly precedingNumeralKorean?: string;
  readonly precedingAllomorphKorean?: string;
}

import {
  POS4,
  POS5,
  _撥音便,
  助動詞,
  助動詞_タ,
  助動詞_タイ,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_マス,
  助動詞_レル,
  動詞,
  形容詞0,
  終止形_一般,
  終止形_撥音便,
  連体形_一般,
  감탄사,
  대명사,
  동사,
  명사,
  형용사,
  isAssertiveCopulaFamilyPos,
  isPastAuxiliaryPos,
  isPoliteCopulaPos
} from "../../types/pos.js";
import type { KoreanPoliteForms } from "../../types/dictionary.js";
import { createConnectiveOp } from "../head-tail/tail/predicate-root/op-builders.js";
export function voiceFromFlags(options: { forcePassive?: boolean; isPotential?: boolean } = {}): Voice {
  if (options.forcePassive === true) {
    return "passive";
  }
  if (options.isPotential === true) {
    return "potential";
  }
  return "active";
}

const NOUN_CONNECTIVE_FALLBACKS = new Set(["고", "지만", "면", "라면", "며", "아/어서", "(으)니까", "(으)면서", "(으)면서도"]);

function realizeRenderPlanText(plan: RenderPlan, options: { formal?: boolean; lookups: LookupTables; numeric?: NumericTables; tokens?: readonly RuntimeHaruToken[]; precedingNumeralKorean?: string; precedingAllomorphKorean?: string }): string {
  const lookups = options.lookups;
  const numeric = options.numeric;
  let formal = options.formal ?? false;
  if (plan.kind === "lemma") {
    formal = plan.formalOverride ?? plan.formalOverride ?? formal;
  }

  switch (plan.kind) {
    case "headTailChain":
      return renderHeadTailChainRenderPlan(
        plan,
        {
          formal,
          ...(options.precedingNumeralKorean === undefined ? {} : { precedingNumeralKorean: options.precedingNumeralKorean }),
          ...(options.precedingAllomorphKorean === undefined ? {} : { precedingAllomorphKorean: options.precedingAllomorphKorean }),
          realizeHostPlan: realizeHostRenderPlan
        },
        lookups,
        requireNumericTables(numeric, "headTailChain render plan")
      );
    case "numeral":
      return realizeNumeral(plan);
    case "fixedText":
      return plan.text;
    case "registerText":
      return formal ? plan.formal : plan.casual;
    case "lexicalParticleAdverbial":
      return plan.korean;
    case "structuralRelationSequence":
      return realizeStructuralRelationSequence(plan, formal, lookups, numeric);
    case "kaParallel":
      return realizeKaParallel(plan, formal, lookups, numeric, options.tokens);
    case "kaParallelNegativeAlternative":
      return "아닌지";
    case "nariParallel":
      return realizeNariParallel(plan, formal, lookups, numeric, options.tokens);
    case "functionalChainResidual":
      return realizeFunctionalChainResidual(plan, formal, lookups);
    case "hybridPostAux":
      return realizeHybridPostAux(plan, formal, lookups, numeric);
    case "pronominalNoNominal":
      return pronominalNoNominalHeadSurface({ formal, fullForm: plan.casualNoun === "geot" });
    case "discourseConnective":
      return renderDiscourseConnective(discourseConnectivePayload(plan), formal);
    case "quoteHostReportingPassive":
      return realizeQuoteHostReportingPassive(plan, formal);
    case "quoteCognitionHost":
      return realizeQuoteCognitionHost(plan);
    case "conjectureThoughtQuote":
      return realizeConjectureThoughtQuote(plan, formal, lookups, requireNumericTables(numeric, "conjecture thought quote"));
    case "giveRequest":
      return realizeGiveRequest(plan, formal, lookups, numeric);
    case "lemma":
      return realizeLemma(plan, formal, lookups, options);
    case "attributive":
      return realizeAttributive(plan, lookups);
    case "predicateScope":
      return commitSharedPredicateScopeProjection(plan, formal, lookups, requireNumericTables(numeric, "predicate scope render plan")).korean;
    case "predicateNominalScope":
      return commitSharedPredicateNominalScopeProjection(plan, formal, lookups, requireNumericTables(numeric, "predicate nominal scope render plan")).korean;
    case "predicateScopeCarrier":
      return realizePredicateScopeCarrier(plan, formal, lookups, requireNumericTables(numeric, "predicate scope carrier render plan"));
    case "noda":
      return realizeNoda(plan, formal, lookups, numeric);
    case "copulaPredicate":
      return realizeCopulaPredicate(plan, formal, lookups, numeric, options);
    case "particleizedLemma":
      return "particle" in plan && "koreanLemma" in plan ? realizeParticleizedLemma(plan) : realizeNamedRenderPlan(plan, formal, lookups);
    case "particleizedContent":
      return realizeParticleizedContent(plan, formal, lookups, numeric, options.tokens);
    case "conjugatedLemma":
      return "koreanLemma" in plan && "ending" in plan ? realizeConjugatedLemma(plan, lookups) : realizeNamedRenderPlan(plan, formal, lookups);
    case "keijoujiAdverb":
      if ("stem" in plan && "mode" in plan) {
        return plan.mode === "으로/로" ? `${plan.stem}${selectParticle(plan.stem, "으로/로")}` : `${plan.stem}${plan.mode}`;
      }
      return realizeNamedRenderPlan(plan, formal, lookups);
    case "keijoujiState":
      if ("stem" in plan) {
        return `${plan.stem}한 상태로`;
      }
      return realizeNamedRenderPlan(plan, formal, lookups);
    default:
      return realizeNamedRenderPlan(plan, formal, lookups, numeric);
  }
}

function withHostTextUnit(segment: TargetSegment, unit: TargetSegment["unit"] | undefined): TargetSegment {
  return unit === undefined || unit === null ? segment : { ...segment, unit };
}

export function realizeHostRenderPlan(
  parts: readonly PredicateHeadTailChainHostSequencePart[],
  context: { readonly formal: boolean; readonly lookups: LookupTables; readonly numeric: NumericTables }
): RenderedTarget {
  const segments: TargetSegment[] = [];
  for (const part of parts) {
    if (part.kind === "hostText") {
      if (part.text.length === 0) {
        continue;
      }
      segments.push(withHostTextUnit(syntheticTargetSegment({
        text: part.text,
        sourceSpan: part.sourceSpan ?? null,
        renderPlanKind: "headTailChain",
        kind: part.segmentKind ?? "punctuation",
        projectionConfidence: part.projectionConfidence
          ?? (part.sourceSpan === undefined || part.sourceSpan === null ? "owner" : "exact")
      }), part.unit));
      continue;
    }
    const child = realizeRenderPlanWithTrace(part.plan, {
      formal: context.formal,
      lookups: context.lookups,
      numeric: context.numeric,
      ...(part.sourceSpan === undefined ? {} : { sourceSpan: part.sourceSpan }),
      ...(part.unit === undefined || part.unit === null ? {} : { unit: part.unit })
    });
    segments.push(...attachUnitToRenderedTarget(child, part.unit ?? null).segments);
  }
  return renderedTargetFromSegments(segments);
}

export function realizeRenderPlan(plan: RenderPlan, options: { formal?: boolean; lookups: LookupTables; numeric?: NumericTables }): string {
  return realizeRenderPlanWithTrace(plan, options).text;
}

export function realizeRenderPlanWithTrace(
  plan: RenderPlan,
  options: RenderTraceOptions
): RenderedTarget {
  if (plan.kind === "legacySurfaceComposition") {
    return opaqueLegacyRenderedTarget(plan, options);
  }

  switch (plan.kind) {
    case "headTailChain":
      return realizeHeadTailChainWithTrace(plan, options);
    case "kaParallel":
      return realizeKaParallelWithTrace(plan, options);
    case "nariParallel":
      return realizeNariParallelWithTrace(plan, options);
    case "particleizedLemma":
      return "particle" in plan && "koreanLemma" in plan
        ? realizeParticleizedLemmaWithTrace(plan, options)
        : opaqueLegacyRenderedTarget(plan, options);
    case "numeral":
    case "fixedText":
    case "registerText":
    case "lexicalParticleAdverbial":
    case "structuralRelationSequence":
    case "kaParallelNegativeAlternative":
    case "functionalChainResidual":
      return plan.kind === "structuralRelationSequence"
        ? realizeStructuralRelationSequenceWithTrace(plan, options)
        : atomicRenderedTarget(plan, options);
    case "hybridPostAux":
      return realizeHybridPostAuxWithTrace(plan, options);
    case "pronominalNoNominal":
    case "discourseConnective":
      return atomicRenderedTarget(plan, options);
    case "youdaModality":
      return realizeYoudaModalityWithTrace(plan, options);
    case "reasonBecause":
      return realizeReasonBecauseWithTrace(plan, options);
    case "nominalConnectiveScope":
      return realizeNominalConnectiveScopeWithTrace(plan, options);
    case "nominalDemoAru":
      return realizeNominalDemoAruWithTrace(plan, options);
    case "quoteHostReportingPassive":
      return realizeQuoteHostReportingPassiveWithTrace(plan, options);
    case "quoteCognitionHost":
      return atomicRenderedTarget(plan, options);
    case "conjectureThoughtQuote":
      return realizeConjectureThoughtQuoteWithTrace(plan, options);
    case "giveRequest":
      return realizeGiveRequestWithTrace(plan, options);
    case "lemma":
      return realizeLemmaWithTrace(plan, options);
    case "attributive":
      return realizeAttributiveWithTrace(plan, options);
    case "predicateScope":
      return realizePredicateScopeWithTrace(plan, options);
    case "predicateNominalScope":
      return realizePredicateNominalScopeWithTrace(plan, options);
    case "predicateScopeCarrier":
      return realizePredicateScopeCarrierWithTrace(plan, options);
    case "noda":
      return realizeNodaWithTrace(plan, options);
    case "copulaPredicate":
      return realizeCopulaPredicateWithTrace(plan, options);
    case "particleizedContent":
      return realizeParticleizedContentWithTrace(plan, options);
    case "conjugatedLemma":
      return withFusedParticleSourceSpan(atomicRenderedTarget(plan, options), plan.particleSource);
    case "compoundNominalSuffix":
    case "keijoujiAdverb":
    case "keijoujiState":
      return atomicRenderedTarget(plan, options);
    case "semanticCarrierPredicate":
      return realizeSemanticCarrierPredicateWithTrace(plan, options);
    case "wakeExplanation":
      return realizeWakeExplanationWithTrace(plan, options);
  }
  return assertNeverRenderPlan(plan);
}

function atomicRenderedTarget(plan: RenderPlan, options: RenderTraceOptions): RenderedTarget {
  const text = realizeRenderPlanText(plan, options);
  return {
    text,
    segments: [{
      text,
      sourceSpan: options.sourceSpan ?? null,
      boundaryBefore: sourceBoundaryBefore(options.sourceSpan ?? null),
      boundaryAfter: sourceBoundaryAfter(options.sourceSpan ?? null),
      unit: options.unit ?? null,
      renderPlanKind: plan.kind,
      kind: renderPlanTargetSegmentKind(plan),
      ...(options.sourceSpan === undefined || options.sourceSpan === null
        ? {}
        : { allomorphRole: "source_anchor" as const }),
      projectionConfidence: renderPlanProjectionConfidence(plan),
    }]
  };
}

function fallbackRenderedTarget(plan: RenderPlan, options: RenderTraceOptions): RenderedTarget {
  const text = realizeRenderPlanText(plan, options);
  return {
    text,
    segments: [{
      text,
      sourceSpan: options.sourceSpan ?? null,
      boundaryBefore: sourceBoundaryBefore(options.sourceSpan ?? null),
      boundaryAfter: sourceBoundaryAfter(options.sourceSpan ?? null),
      unit: options.unit ?? null,
      renderPlanKind: plan.kind,
      kind: "fallback",
      projectionConfidence: "fallback",
    }]
  };
}

function opaqueLegacyRenderedTarget(plan: RenderPlan, options: RenderTraceOptions): RenderedTarget {
  const text = realizeRenderPlanText(plan, options);
  return {
    text,
    segments: [{
      text,
      sourceSpan: options.sourceSpan ?? null,
      boundaryBefore: sourceBoundaryBefore(options.sourceSpan ?? null),
      boundaryAfter: sourceBoundaryAfter(options.sourceSpan ?? null),
      unit: options.unit ?? null,
      renderPlanKind: plan.kind,
      kind: "fallback",
      allomorphRole: "transparent",
      projectionConfidence: "fallback",
    }]
  };
}

function realizeHeadTailChainWithTrace(
  plan: Extract<RenderPlan, { kind: "headTailChain" }>,
  options: RenderTraceOptions
): RenderedTarget {
  if (isNominalHeadTailChainRenderPlan(plan)) {
    const traced = realizeNominalHeadTailChainWithTrace(plan, options);
    if (traced !== null) {
      return attachUnitToRenderedTarget(traced, options.unit ?? null);
    }
  }
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    const numeric = requireNumericTables(options.numeric, "headTailChain traced render");
    const committed = commitSharedTailParserChain({
      plan,
      formal: options.formal ?? false,
      lookups: options.lookups,
      numeric,
      ...(options.precedingNumeralKorean === undefined ? {} : { precedingNumeralKorean: options.precedingNumeralKorean }),
      realizeHostPlan: realizeHostRenderPlan
    });
    if (!("ok" in committed) && committed.committedTailRoot !== undefined) {
      const traced = renderTailWithSourceTargetTrace(committed.committedTailRoot, {
        formal: options.formal ?? false,
        lookups: options.lookups,
        ...(options.precedingNumeralKorean === undefined ? {} : { precedingNumeralKorean: options.precedingNumeralKorean })
      });
      if (traced !== null && traced.text === committed.korean) {
        return attachUnitToRenderedTarget(traced, options.unit ?? null);
      }
      const suffixedTrace = traceWithCommittedTailSuffix(traced, committed.korean);
      if (suffixedTrace !== null) {
        return attachUnitToRenderedTarget(suffixedTrace, options.unit ?? null);
      }
    }
  }
  return atomicRenderedTarget(plan, options);
}

function realizeNominalHeadTailChainWithTrace(
  plan: NominalHeadTailChainPlan,
  options: RenderTraceOptions
): RenderedTarget | null {
  const numeric = requireNumericTables(options.numeric, "nominal headTailChain traced render");
  const expected = renderHeadTailChainRenderPlan(
    plan,
    {
      formal: options.formal ?? false,
      ...(options.precedingAllomorphKorean === undefined ? {} : { precedingAllomorphKorean: options.precedingAllomorphKorean }),
      realizeHostPlan: realizeHostRenderPlan
    },
    options.lookups,
    numeric
  );
  const host = nominalHeadTailHostTrace(plan, options, numeric);
  if (host === null || host.text.length === 0 || !expected.startsWith(host.text)) {
    return null;
  }
  const rest = expected.slice(host.text.length);
  if (rest.length === 0) {
    return host.text === expected ? host : null;
  }
  const restSegments = nominalHeadTailRestTraceSegments(plan, rest, options.formal ?? false);
  const rendered = renderedTargetFromSegments([...host.segments, ...restSegments]);
  return rendered.text === expected ? rendered : null;
}

function nominalHeadTailHostTrace(
  plan: NominalHeadTailChainPlan,
  options: RenderTraceOptions,
  numeric: NumericTables
): RenderedTarget | null {
  switch (plan.realization.root.kind) {
    case "predicateNominalHost":
      return predicateNominalHostTrace(plan, options, numeric);
    case "nominalPhrase":
      return nominalPhraseHeadTrace(plan);
    case "hostBearingLikeness":
      return nominalPhraseHeadTraceFromHost(plan.realization.root.frame.host);
    case "productiveAdjectivalSuffix":
      return nominalPhraseHeadTraceFromHost(plan.realization.root.frame.host);
    case "renyouNominalHead":
      return null;
  }
}

function nominalPhraseHeadTrace(plan: NominalHeadTailChainPlan): RenderedTarget | null {
  if (plan.realization.root.kind !== "nominalPhrase") {
    return null;
  }
  return nominalPhraseHeadTraceFromHost(plan.realization.root);
}

function nominalPhraseHeadTraceFromHost(host: Extract<NominalHeadTailChainPlan["realization"]["root"], { readonly kind: "nominalPhrase" }>): RenderedTarget | null {
  const hint = host.head.allomorphHint?.korean;
  if (hint === undefined || hint.length === 0) {
    return null;
  }
  return renderedTargetFromSegments([
    syntheticTargetSegment({
      text: hint,
      sourceSpan: sourceSpanForRuntimeTokens(host.head.source?.tokens ?? [host.head.token]),
      renderPlanKind: "headTailChain",
      kind: "lexeme",
      projectionConfidence: "semantic"
    })
  ]);
}

function predicateNominalHostTrace(
  plan: NominalHeadTailChainPlan,
  options: RenderTraceOptions,
  numeric: NumericTables
): RenderedTarget | null {
  const root = plan.realization.root;
  if (root.kind !== "predicateNominalHost") {
    return null;
  }
  const host = root.host;
  const layout = predicateProjectionHostLayoutForTrace(plan);
  const context = {
    formal: options.formal ?? false,
    outgoingBoundary: host.outgoingBoundary,
    ...(layout === undefined ? {} : { layout }),
    lookups: options.lookups
  };
  const commitContext = clauseRoleCommitContext({
    clauseRole: host,
    root: host.root,
    ...(host.sourceTokens === undefined ? {} : { sourceTokens: host.sourceTokens }),
    ...(host.commitmentGrammar === undefined ? {} : { grammar: host.commitmentGrammar }),
    ...(layout === undefined ? {} : { layoutOverride: layout }),
    lookups: options.lookups,
    numeric
  });
  const committed = host.projection === "gerund_nominalizer"
    ? commitSharedTailParserGerundRoot({
      root: host.root,
      context,
      commitContext,
      fallbackHeadKind: "nominal"
    })
    : commitSharedTailParserRoot({
      root: host.root,
      context,
      commitContext,
      fallbackHeadKind: "nominal"
    });
  if ("ok" in committed) {
    return null;
  }
  if (host.projection === "gerund_nominalizer") {
    const traced = tracePredicateGerundProjectionHost(committed.committedTailRoot, committed.korean, options);
    if (traced !== null) {
      return traced;
    }
    return renderedTargetFromSegments([
      syntheticTargetSegment({
        text: committed.korean,
        sourceSpan: sourceSpanForRuntimeTokens(host.source.tokens),
        renderPlanKind: "headTailChain",
        kind: "lexeme",
        projectionConfidence: "semantic"
      })
    ]);
  }
  if (committed.committedTailRoot === undefined) {
    return null;
  }
  const traced = renderTailWithSourceTargetTrace(committed.committedTailRoot, {
    formal: options.formal ?? false,
    lookups: options.lookups
  });
  if (traced === null || traced.text !== committed.korean) {
    return null;
  }
  if (host.projection !== "attributive_nominalizer" && host.projection !== "quoted_nominalizer") {
    return traced;
  }
  return renderedTargetFromSegments([
    ...traced.segments,
    syntheticTargetSegment({
      text: " 것",
      sourceSpan: sourceSpanForRuntimeTokens(root.nominalizer.source.tokens),
      renderPlanKind: "headTailChain",
      kind: "modal",
      projectionConfidence: "owner"
    })
  ]);
}

function tracePredicateGerundProjectionHost(
  root: TailRoot | undefined,
  renderedText: string,
  options: RenderTraceOptions
): RenderedTarget | null {
  if (root === undefined || root.tail.kind !== "auxLayer") {
    return null;
  }
  const baseTail = root.tail.terminal === "attributive"
    ? { ...root.tail, terminal: null }
    : root.tail;
  const projected: TailRoot = {
    ...root,
    tail: {
      ...baseTail,
      ops: [
        ...baseTail.ops,
        buildPredicateGerundProjectionConnective()
      ]
    },
    sfp: null
  };
  const traced = renderTailWithSourceTargetTrace(projected, {
    formal: options.formal ?? false,
    lookups: options.lookups
  });
  return traced !== null && traced.text === renderedText ? traced : null;
}

function predicateProjectionHostLayoutForTrace(
  plan: NominalHeadTailChainPlan
): Extract<NominalHeadTailChainPlan["realization"]["root"], { readonly kind: "predicateNominalHost" }>["host"]["layout"] | undefined {
  if (plan.realization.root.kind !== "predicateNominalHost") {
    return undefined;
  }
  const hostLayout = plan.realization.root.host.layout;
  if (hostLayout !== undefined) {
    return hostLayout;
  }
  const layout = plan.realization.commitContext?.layout;
  if (
    layout !== undefined &&
    typeof (layout as { readonly ownerPredicateOfParticle?: unknown }).ownerPredicateOfParticle === "function"
  ) {
    return layout as Extract<NominalHeadTailChainPlan["realization"]["root"], { readonly kind: "predicateNominalHost" }>["host"]["layout"];
  }
  return undefined;
}

function nominalHeadTailRestSourceSpan(plan: NominalHeadTailChainPlan): TargetSegment["sourceSpan"] {
  switch (plan.realization.root.kind) {
    case "predicateNominalHost":
      return sourceSpanForRuntimeTokens(plan.realization.frame.source.tokens);
    case "nominalPhrase":
      return sourceSpanForRuntimeTokens(plan.realization.root.source.tokens.slice(1));
    case "hostBearingLikeness":
      return sourceSpanForRuntimeTokens(plan.realization.root.frame.source.tokens.slice(1));
    case "productiveAdjectivalSuffix":
      return sourceSpanForRuntimeTokens(plan.realization.root.frame.source.tokens.slice(1));
    case "renyouNominalHead":
      return sourceSpanForRuntimeTokens(plan.realization.root.source.tokens);
  }
}

function nominalHeadTailRestSegmentKind(plan: NominalHeadTailChainPlan): TargetSegment["kind"] {
  if (plan.realization.root.kind === "productiveAdjectivalSuffix" || plan.realization.root.kind === "hostBearingLikeness") {
    return "modal";
  }
  switch (plan.realization.frame.frameKind) {
    case "lexical_particle":
    case "definition_topic":
    case "host_bearing_likeness":
    case "productive_adjectival_suffix":
      return "modal";
    default:
      return "connective";
  }
}

function nominalHeadTailRestTraceSegments(
  plan: NominalHeadTailChainPlan,
  restText: string,
  formal: boolean
): readonly TargetSegment[] {
  const negativeCopula = nominalHeadTailNegativeCopulaRestSegments(plan, restText, formal);
  if (negativeCopula !== null) {
    return negativeCopula;
  }
  return [
    syntheticTargetSegment({
      text: restText,
      sourceSpan: nominalHeadTailRestSourceSpan(plan),
      renderPlanKind: "headTailChain",
      kind: nominalHeadTailRestSegmentKind(plan),
      projectionConfidence: "owner"
    })
  ];
}

function nominalHeadTailNegativeCopulaRestSegments(
  plan: NominalHeadTailChainPlan,
  restText: string,
  formal: boolean
): readonly TargetSegment[] | null {
  const projection = plan.realization.frame.projection;
  if (projection.kind !== "negativeCopulaPredicate") {
    return null;
  }
  const terminal = renderAniTerminal({
    formal,
    polite: projection.polite,
    past: projection.past
  });
  if (!restText.endsWith(terminal)) {
    return null;
  }
  const prefix = restText.slice(0, -terminal.length);
  if (prefix.length === 0) {
    return null;
  }
  const source = nominalHeadTailNegativeCopulaSourceSplit(plan);
  if (source === null) {
    return null;
  }
  const trimmedPrefix = prefix.trimEnd();
  if (trimmedPrefix.length === 0) {
    return null;
  }
  const spacing = prefix.slice(trimmedPrefix.length);
  const segments: TargetSegment[] = [
    syntheticTargetSegment({
      text: trimmedPrefix,
      sourceSpan: source.prefixSpan,
      renderPlanKind: "headTailChain",
      kind: nominalHeadTailRestSegmentKind(plan),
      projectionConfidence: "owner"
    })
  ];
  if (spacing.length > 0) {
    segments.push(syntheticTargetSegment({
      text: spacing,
      sourceSpan: null,
      renderPlanKind: "headTailChain",
      kind: "punctuation",
      projectionConfidence: "owner"
    }));
  }
  segments.push(...nominalHeadTailNegativeCopulaTerminalSegments(plan, terminal, source.negativeTokens));
  return segments;
}

function nominalHeadTailNegativeCopulaSourceSplit(
  plan: NominalHeadTailChainPlan
): {
  readonly prefixSpan: TargetSegment["sourceSpan"];
  readonly negativeTokens: readonly RuntimeHaruToken[];
} | null {
  const tokens = plan.realization.frame.source.tokens;
  const projection = plan.realization.frame.projection;
  if (projection.kind !== "negativeCopulaPredicate") {
    return null;
  }
  const negativeStart = tokens.findIndex((token) =>
    token.dictionaryForm === "ない" ||
    token.surface === "ない" ||
    token.surface === "ぬ" ||
    token.surface === "ん" ||
    token.surface.startsWith("なかっ") ||
    (projection.polite && token.surface.startsWith("ませ"))
  );
  if (negativeStart < 0) {
    return null;
  }
  return {
    prefixSpan: sourceSpanForRuntimeTokens(tokens.slice(0, negativeStart)),
    negativeTokens: tokens.slice(negativeStart)
  };
}

function nominalHeadTailNegativeCopulaTerminalSegments(
  plan: NominalHeadTailChainPlan,
  terminal: string,
  sourceTokens: readonly RuntimeHaruToken[]
): readonly TargetSegment[] {
  const split = nominalHeadTailNegativeCopulaTerminalSourceSplit(plan, terminal, sourceTokens);
  if (split === null) {
    return [
      syntheticTargetSegment({
        text: terminal,
        sourceSpan: sourceSpanForRuntimeTokens(sourceTokens),
        renderPlanKind: "headTailChain",
        kind: "aux",
        projectionConfidence: "semantic"
      })
    ];
  }
  return [
    syntheticTargetSegment({
      text: split.negativeText,
      sourceSpan: sourceSpanForRuntimeTokens(split.negativeTokens),
      renderPlanKind: "headTailChain",
      kind: "aux",
      projectionConfidence: "semantic"
    }),
    syntheticTargetSegment({
      text: split.tailText,
      sourceSpan: sourceSpanForRuntimeTokens(split.tailTokens),
      renderPlanKind: "headTailChain",
      kind: "aux",
      projectionConfidence: "semantic"
    })
  ];
}

function nominalHeadTailNegativeCopulaTerminalSourceSplit(
  plan: NominalHeadTailChainPlan,
  terminal: string,
  sourceTokens: readonly RuntimeHaruToken[]
): {
  readonly negativeText: string;
  readonly tailText: string;
  readonly negativeTokens: readonly RuntimeHaruToken[];
  readonly tailTokens: readonly RuntimeHaruToken[];
} | null {
  const projection = plan.realization.frame.projection;
  if (projection.kind !== "negativeCopulaPredicate" || !projection.past || !terminal.startsWith("아니")) {
    return null;
  }
  const tailText = terminal.slice("아니".length);
  if (tailText.length === 0) {
    return null;
  }
  const tailStart = nominalHeadTailNegativeCopulaPastSourceStart(sourceTokens, projection.polite);
  if (tailStart <= 0 || tailStart >= sourceTokens.length) {
    return null;
  }
  return {
    negativeText: "아니",
    tailText,
    negativeTokens: sourceTokens.slice(0, tailStart),
    tailTokens: sourceTokens.slice(tailStart)
  };
}

function nominalHeadTailNegativeCopulaPastSourceStart(
  tokens: readonly RuntimeHaruToken[],
  polite: boolean
): number {
  if (polite) {
    const desuIndex = tokens.findIndex((token) =>
      token.dictionaryForm === "です" ||
      token.surface === "でし" ||
      token.surface.startsWith("でし")
    );
    if (desuIndex >= 0) {
      return desuIndex;
    }
  }
  return tokens.findIndex((token) =>
    token.dictionaryForm === "た" ||
    token.surface === "た"
  );
}

function realizeLemmaWithTrace(
  plan: LemmaRealization,
  options: RenderTraceOptions
): RenderedTarget {
  const expected = realizeLemma(plan, options.formal ?? false, options.lookups, options);
  const imperative = realizeImperativeLemmaWithTrace(plan, expected, options);
  if (imperative !== null) {
    return imperative;
  }
  const sfp = realizeLemmaSfpWithTrace(plan, expected, options);
  if (sfp !== null) {
    return sfp;
  }
  if (!isRenderPlan(plan.prefix)) {
    return atomicRenderedTarget(plan, options);
  }
  const prefix = realizeRenderPlanWithTrace(plan.prefix, options);
  if (!expected.startsWith(prefix.text)) {
    return fallbackRenderedTarget(plan, options);
  }
  const suffixText = expected.slice(prefix.text.length);
  const segments: TargetSegment[] = [...prefix.segments];
  if (suffixText.length > 0) {
    segments.push(syntheticTargetSegment({
      text: suffixText,
      sourceSpan: options.sourceSpan ?? null,
      renderPlanKind: plan.kind,
      kind: "lexeme",
      projectionConfidence: "semantic"
    }));
  }
  const rendered = renderedTargetFromSegments(segments);
  return rendered.text === expected
    ? attachUnitToRenderedTarget(rendered, options.unit ?? null)
    : fallbackRenderedTarget(plan, options);
}

function realizeLemmaSfpWithTrace(
  plan: LemmaRealization,
  expected: string,
  options: RenderTraceOptions
): RenderedTarget | null {
  if (
    plan.sfp == null ||
    plan.auxTokens.length > 0 ||
    plan.connective != null ||
    plan.suffix != null ||
    isRenderPlan(plan.prefix)
  ) {
    return null;
  }
  const unit = options.unit;
  const tokens = options.tokens;
  if (unit === null || unit === undefined || tokens === undefined) {
    return null;
  }
  const sfpCount = trailingLemmaSfpTokenCount(unit.jpIndices, tokens, plan.sfp);
  if (sfpCount <= 0 || sfpCount >= unit.jpIndices.length) {
    return null;
  }
  const basePlan: LemmaRealization = { ...plan, sfp: null };
  const baseText = realizeLemma(basePlan, options.formal ?? false, options.lookups, options);
  if (baseText.length === 0 || !expected.startsWith(baseText) || expected.length <= baseText.length) {
    return null;
  }
  const sfpText = expected.slice(baseText.length);
  const baseIndices = unit.jpIndices.slice(0, -sfpCount);
  const sfpIndices = unit.jpIndices.slice(-sfpCount);
  const baseSourceSpan = sourceSpanForRuntimeTokenIndexes(tokens, baseIndices) ?? options.sourceSpan ?? null;
  const sfpSourceSpan = sourceSpanForRuntimeTokenIndexes(tokens, sfpIndices);
  if (sfpSourceSpan === null) {
    return null;
  }
  const prefix = typeof plan.prefix === "string" ? plan.prefix : "";
  const baseSegments: TargetSegment[] = [];
  if (prefix.length > 0) {
    if (!baseText.startsWith(prefix)) {
      return null;
    }
    baseSegments.push(syntheticTargetSegment({
      text: prefix,
      sourceSpan: null,
      renderPlanKind: plan.kind,
      kind: "synthetic",
      projectionConfidence: "semantic"
    }));
    const body = baseText.slice(prefix.length);
    if (body.length > 0) {
      baseSegments.push(syntheticTargetSegment({
        text: body,
        sourceSpan: baseSourceSpan,
        renderPlanKind: plan.kind,
        kind: "lexeme",
        projectionConfidence: "semantic"
      }));
    }
  } else {
    baseSegments.push(syntheticTargetSegment({
      text: baseText,
      sourceSpan: baseSourceSpan,
      renderPlanKind: plan.kind,
      kind: "lexeme",
      projectionConfidence: "semantic"
    }));
  }
  const rendered = renderedTargetFromSegments([
    ...baseSegments,
    syntheticTargetSegment({
      text: sfpText,
      sourceSpan: sfpSourceSpan,
      renderPlanKind: plan.kind,
      kind: "aux",
      projectionConfidence: "semantic"
    })
  ]);
  return rendered.text === expected
    ? attachUnitToRenderedTarget(rendered, unit)
    : null;
}

function trailingLemmaSfpTokenCount(
  jpIndices: readonly number[],
  tokens: readonly RuntimeHaruToken[],
  sfp: string
): number {
  if (jpIndices.length < 2) {
    return 0;
  }
  const trailingSurfaces = (count: number): string =>
    jpIndices.slice(-count)
      .map((index) => tokens[index]?.surface ?? "")
      .join("");
  const expected = expectedLemmaSfpSurface(sfp);
  if (expected === null) {
    return 0;
  }
  const max = Math.min(jpIndices.length - 1, 3);
  for (let count = 1; count <= max; count += 1) {
    if (trailingSurfaces(count) === expected) {
      return count;
    }
  }
  return 0;
}

function expectedLemmaSfpSurface(sfp: string): string | null {
  switch (sfp) {
    case "kana":
      return "かな";
    case "plain_q":
    case "polite_q":
    case "ka":
      return "か";
    case "ne":
      return "ね";
    case "na_excl":
    case "na_prohib":
      return "な";
    case "jan":
      return "じゃん";
    case "role_cat_nya":
      return "にゃ";
    case "sfp_yo":
      return "よ";
    default:
      return null;
  }
}

function realizeImperativeLemmaWithTrace(
  plan: LemmaRealization,
  expected: string,
  options: RenderTraceOptions
): RenderedTarget | null {
  if (
    plan.isImperative !== true ||
    plan.koreanPos !== 동사 ||
    plan.auxTokens.length > 0 ||
    plan.voice === "potential" ||
    plan.voice === "passive" ||
    plan.connective != null ||
    plan.sfp != null ||
    isRenderPlan(plan.prefix)
  ) {
    return null;
  }
  const sourceSpan = options.sourceSpan ?? null;
  if (sourceSpan === null) {
    return null;
  }
  const prefix = typeof plan.prefix === "string" ? plan.prefix : "";
  const suffix = plan.suffix ?? "";
  if (!expected.startsWith(prefix) || (suffix.length > 0 && !expected.endsWith(suffix))) {
    return null;
  }
  const bodyEnd = suffix.length === 0 ? expected.length : expected.length - suffix.length;
  const body = expected.slice(prefix.length, bodyEnd);
  if (body.length === 0) {
    return null;
  }
  const split = imperativeLemmaTraceSplit(plan, body);
  if (split === null) {
    return null;
  }
  const segments: TargetSegment[] = [];
  if (prefix.length > 0) {
    segments.push(syntheticTargetSegment({
      text: prefix,
      sourceSpan: null,
      renderPlanKind: plan.kind,
      kind: "synthetic",
      projectionConfidence: "semantic"
    }));
  }
  segments.push(syntheticTargetSegment({
    text: split.stemText,
    sourceSpan,
    renderPlanKind: plan.kind,
    kind: "lexeme",
    projectionConfidence: "semantic"
  }));
  segments.push(syntheticTargetSegment({
    text: split.imperativeSuffix,
    sourceSpan: null,
    renderPlanKind: plan.kind,
    kind: "aux",
    projectionConfidence: "semantic"
  }));
  if (suffix.length > 0) {
    segments.push(syntheticTargetSegment({
      text: suffix,
      sourceSpan: null,
      renderPlanKind: plan.kind,
      kind: "synthetic",
      projectionConfidence: "semantic"
    }));
  }
  const rendered = renderedTargetFromSegments(segments);
  return rendered.text === expected
    ? attachUnitToRenderedTarget(rendered, options.unit ?? null)
    : null;
}

function imperativeLemmaTraceSplit(
  plan: LemmaRealization,
  body: string
): { readonly stemText: string; readonly imperativeSuffix: string } | null {
  const nominalized = conjugate(plan.koreanLemma, asIrregular(plan.irregular), "기");
  if (!nominalized.endsWith("기")) {
    return null;
  }
  const stableStem = nominalized.slice(0, -"기".length);
  if (stableStem.length > 0 && body.startsWith(stableStem)) {
    const imperativeSuffix = body.slice(stableStem.length);
    return imperativeSuffix.length === 0 ? null : { stemText: stableStem, imperativeSuffix };
  }

  return imperativeEndingSuffixTraceSplit(body);
}

function imperativeEndingSuffixTraceSplit(
  body: string
): { readonly stemText: string; readonly imperativeSuffix: string } | null {
  const suffixes = ["여라", "어라", "아라", "라"];
  for (const imperativeSuffix of suffixes) {
    if (!body.endsWith(imperativeSuffix)) {
      continue;
    }
    const stemText = body.slice(0, -imperativeSuffix.length);
    if (stemText.length === 0) {
      continue;
    }
    return { stemText, imperativeSuffix };
  }
  return null;
}

function realizeAttributiveWithTrace(
  plan: AttributiveRealization,
  options: RenderTraceOptions
): RenderedTarget {
  const expected = realizeAttributive(plan, options.lookups);
  const sourceSpan = combineSourceSpans(
    sourceSpanForRuntimeTokens([plan.contentToken]),
    sourceSpanForRuntimeTokens(plan.auxTokens)
  ) ?? options.sourceSpan ?? null;
  return attachUnitToRenderedTarget(
    semanticRenderedTargetSegment(plan.kind, expected, sourceSpan, "lexeme"),
    options.unit ?? null
  );
}

function attachUnitToRenderedTarget(
  rendered: RenderedTarget,
  unit: TargetSegment["unit"]
): RenderedTarget {
  if (unit === null) {
    return rendered;
  }
  return {
    text: rendered.text,
    segments: rendered.segments.map((segment) => ({
      ...segment,
      unit: segment.unit ?? unit
    }))
  };
}

function traceWithCommittedTailSuffix(
  traced: RenderedTarget | null,
  committedText: string
): RenderedTarget | null {
  if (traced === null || !committedText.startsWith(traced.text)) {
    return null;
  }
  const suffix = committedText.slice(traced.text.length);
  if (suffix !== "요" || traced.segments.length === 0) {
    return null;
  }
  const segments = traced.segments.slice();
  const last = segments[segments.length - 1]!;
  segments[segments.length - 1] = {
    ...last,
    text: `${last.text}${suffix}`
  };
  return renderedTargetFromSegments(segments);
}

function realizeKaParallelWithTrace(
  plan: Extract<RenderPlan, { kind: "kaParallel" }>,
  options: RenderTraceOptions
): RenderedTarget {
  const formal = options.formal ?? false;
  const segments: TargetSegment[] = [];
  const separator = plan.separator === "comma" ? ", " : " ";
  const sourceOwnsQuestion = plan.terminalPunctuationRun.includes("question");
  let lastItemOwnsQuestion = false;
  for (const [index, itemPlan] of plan.itemPlans.entries()) {
    if (index > 0) {
      segments.push(syntheticTargetSegment({
        text: separator,
        kind: "punctuation",
        renderPlanKind: plan.kind,
      }));
    }
    const itemSourceSpan = plan.itemSourceSpans?.[index] ?? options.sourceSpan ?? null;
    const renderedItem = realizeRenderPlanWithTrace(itemPlan, {
      ...options,
      sourceSpan: itemSourceSpan,
    });
    if (index === plan.itemPlans.length - 1) {
      lastItemOwnsQuestion = renderedItem.text.endsWith("?");
    }
    const projectedItem = sourceOwnsQuestion && index === plan.itemPlans.length - 1
      ? trimRenderedTargetSuffix(renderedItem, "?") ?? renderedItem
      : renderedItem;
    segments.push(...projectedItem.segments);
    if (plan.relationKind === "choice") {
      const markerSourceSpan = plan.markerSourceSpans?.[index] ?? itemSourceSpan;
      segments.push(syntheticTargetSegment({
        text: kaParallelChoiceSuffix(allomorphHostOfRenderedTarget(renderedItem, options), formal, plan.terminalPunctuation),
        sourceSpan: markerSourceSpan,
        kind: "connective",
        renderPlanKind: plan.kind,
        projectionConfidence: "semantic",
      }));
    }
  }
  if (plan.suffix !== undefined) {
    if (typeof plan.suffix === "string") {
      segments.push(syntheticTargetSegment({
        text: plan.suffix,
        kind: "connective",
        renderPlanKind: plan.kind,
        projectionConfidence: "semantic",
      }));
    } else {
      segments.push(...realizeRenderPlanWithTrace(plan.suffix, {
        ...options,
        sourceSpan: null,
      }).segments);
    }
  }
  const punctuation = lastItemOwnsQuestion && plan.terminalPunctuation === "period"
    ? ""
    : kaParallelTerminalPunctuationText(plan);
  if (punctuation.length > 0) {
    segments.push(syntheticTargetSegment({
      text: punctuation,
      kind: "punctuation",
      renderPlanKind: plan.kind,
    }));
  }
  return renderedTargetFromSegments(segments);
}

function realizeNariParallelWithTrace(
  plan: Extract<RenderPlan, { kind: "nariParallel" }>,
  options: RenderTraceOptions
): RenderedTarget {
  const segments: TargetSegment[] = [];
  const separator = plan.separator === "comma" ? ", " : " ";
  const itemKinds = plan.itemKinds ?? plan.itemPlans.map(() => plan.itemKind);
  const hasNominalItem = itemKinds.some((kind) => kind === "nominal");
  for (const [index, itemPlan] of plan.itemPlans.entries()) {
    if (index > 0) {
      segments.push(syntheticTargetSegment({
        text: plan.itemSeparatorTexts?.[index - 1] ?? separator,
        sourceSpan: plan.itemSeparatorSourceSpans?.[index - 1] ?? null,
        kind: "punctuation",
        renderPlanKind: plan.kind,
      }));
    }
    const itemSourceSpan = plan.itemSourceSpans?.[index] ?? options.sourceSpan ?? null;
    const renderedItem = realizeRenderPlanWithTrace(itemPlan, {
      ...options,
      sourceSpan: itemSourceSpan,
    });
    segments.push(...renderedItem.segments);
    if (itemKinds[index] === "nominal") {
      const markerSourceSpan = plan.markerSourceSpans?.[index] ?? itemSourceSpan;
      if (plan.nominalListingStyle === "toka") {
        const connective = index < plan.itemPlans.length - 1 || plan.nominalListingClosure === "continues"
          ? selectParticle(allomorphHostOfRenderedTarget(renderedItem, options), "이나/나")
          : plan.nominalListingClosure === "closed" ? " 등" : "";
        if (connective.length > 0) {
          segments.push(syntheticTargetSegment({
            text: connective,
            sourceSpan: markerSourceSpan,
            kind: "connective",
            renderPlanKind: plan.kind,
            projectionConfidence: "semantic",
          }));
        }
        continue;
      }
      if (plan.trailingParticle !== undefined && plan.trailingParticle !== null) {
        if (index < plan.itemPlans.length - 1) {
          segments.push(syntheticTargetSegment({
            text: selectParticle(allomorphHostOfRenderedTarget(renderedItem, options), "이나/나"),
            sourceSpan: markerSourceSpan,
            kind: "connective",
            renderPlanKind: plan.kind,
            projectionConfidence: "semantic",
          }));
        }
      } else {
        segments.push(syntheticTargetSegment({
          text: selectParticle(allomorphHostOfRenderedTarget(renderedItem, options), "이든/든"),
          sourceSpan: markerSourceSpan,
          kind: "connective",
          renderPlanKind: plan.kind,
          projectionConfidence: "semantic",
        }));
      }
    }
  }
  if (hasNominalItem && plan.trailingParticle !== undefined && plan.trailingParticle !== null) {
    segments.push(syntheticTargetSegment({
      text: selectParticle(trailingAllomorphHostText(segments, options.tokens === undefined ? {} : { tokens: options.tokens }), plan.trailingParticle),
      sourceSpan: plan.trailingParticleSourceSpan ??
        plan.markerSourceSpans?.at(-1) ??
        options.sourceSpan ??
        null,
      kind: "particle",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic",
    }));
  }
  return renderedTargetFromSegments(segments);
}

function affirmativeCopulaRenderedTarget(
  plan: Extract<RenderPlan, { kind: "copulaPredicate" }>,
  base: RenderPlan,
  full: string,
  options: RenderTraceOptions
): RenderedTarget {
  const baseTarget = realizeRenderPlanWithTrace(base, {
    ...options,
    sourceSpan: options.sourceSpan ?? null,
    unit: options.unit ?? null
  });
  if (!full.startsWith(baseTarget.text)) {
    return atomicRenderedTarget(plan, options);
  }
  const tailText = full.slice(baseTarget.text.length);
  if (tailText.length === 0) {
    return baseTarget;
  }
  const segments: TargetSegment[] = [
    ...baseTarget.segments,
    syntheticTargetSegment({
      text: tailText,
      renderPlanKind: plan.kind,
      kind: "aux",
      projectionConfidence: "owner"
    })
  ];
  return renderedTargetText(segments) === full
    ? renderedTargetFromSegments(segments)
    : fallbackRenderedTarget(plan, options);
}

function realizeParticleizedLemmaWithTrace(
  plan: ParticleizedLemmaPlan,
  options: RenderTraceOptions
): RenderedTarget {
  const full = realizeParticleizedLemma(plan);
  const particle = selectParticle(plan.koreanLemma, plan.particle, plan.register === undefined ? {} : { register: plan.register });
  const suffix = plan.suffix ?? "";
  const segments: TargetSegment[] = [
    syntheticTargetSegment({
      text: plan.koreanLemma,
      sourceSpan: options.sourceSpan ?? null,
      renderPlanKind: "particleizedLemma",
      kind: "lexeme",
      projectionConfidence: "owner"
    }),
    withParticleSourceProvenance(syntheticTargetSegment({
      text: particle,
      renderPlanKind: "particleizedLemma",
      kind: "particle",
      projectionConfidence: "owner"
    }), plan.particleSource)
  ];
  if (suffix.length > 0) {
    segments.push(syntheticTargetSegment({
      text: suffix,
      renderPlanKind: "particleizedLemma",
      kind: "connective",
      projectionConfidence: "owner"
    }));
  }
  return renderedTargetText(segments) === full
    ? renderedTargetFromSegments(segments)
    : withFusedParticleSourceSpan(fallbackRenderedTarget(plan, options), plan.particleSource);
}

function realizeParticleizedContentWithTrace(
  plan: Extract<RenderPlan, { kind: "particleizedContent" }>,
  options: RenderTraceOptions
): RenderedTarget {
  const content = realizeRenderPlanWithTrace(plan.content, options);
  const particle = selectParticle(allomorphHostOfRenderedTarget(content, options), plan.particle, plan.register === undefined ? {} : { register: plan.register });
  const contracted = particle === "가" ? plan.subjectParticleStem ?? undefined : undefined;
  if (contracted !== undefined) {
    return withFusedParticleSourceSpan(atomicRenderedTarget(plan, options), plan.particleSource);
  }
  const segments: TargetSegment[] = [
    ...content.segments,
    withParticleSourceProvenance(syntheticTargetSegment({
      text: particle,
      renderPlanKind: plan.kind,
      kind: "particle",
      projectionConfidence: "owner"
    }), plan.particleSource)
  ];
  const rendered = renderedTargetFromSegments(segments);
  return rendered.text === realizeRenderPlanText(plan, options)
    ? rendered
    : fallbackRenderedTarget(plan, options);
}

function realizeNominalConnectiveScopeWithTrace(
  plan: Extract<RenderPlan, { kind: "nominalConnectiveScope" }>,
  options: RenderTraceOptions
): RenderedTarget {
  const payload = nominalConnectiveScopePayload(plan);
  return traceExpectedWithChildren(plan, options, realizeRenderPlanText(plan, options), [
    exactChildTrace(payload.content, options)
  ]);
}

function realizeNominalDemoAruWithTrace(
  plan: Extract<RenderPlan, { kind: "nominalDemoAru" }>,
  options: RenderTraceOptions
): RenderedTarget {
  const payload = nominalDemoAruPayload(plan);
  return traceExpectedWithChildren(plan, options, realizeRenderPlanText(plan, options), [
    exactChildTrace(payload.content, options)
  ]);
}

function realizeNodaWithTrace(
  plan: Extract<RenderPlan, { kind: "noda" }>,
  options: RenderTraceOptions
): RenderedTarget {
  const child = isRenderPlan(plan.prefix)
    ? plan.prefix
    : plan.prefix === undefined && isRenderPlan(plan.content)
      ? plan.content
      : null;
  return child === null
    ? atomicRenderedTarget(plan, options)
    : traceExpectedWithChildren(plan, options, realizeRenderPlanText(plan, options), [exactChildTrace(child, options)]);
}

function realizeCopulaPredicateWithTrace(
  plan: Extract<RenderPlan, { kind: "copulaPredicate" }>,
  options: RenderTraceOptions
): RenderedTarget {
  if (plan.polarity === "affirmative" && isRenderPlan(plan.base)) {
    const full = realizeCopulaPredicate(plan, options.formal ?? false, options.lookups, options.numeric, options);
    return affirmativeCopulaRenderedTarget(plan, plan.base, full, options);
  }
  if (isRenderPlan(plan.base)) {
    return traceExpectedWithChildren(plan, options, realizeRenderPlanText(plan, options), [exactChildTrace(plan.base, options)]);
  }
  return copulaNegationSourceTargetTrace(plan, options) ?? atomicRenderedTarget(plan, options);
}

function copulaNegationSourceTargetTrace(
  plan: CopulaPredicatePlan,
  options: RenderTraceOptions
): RenderedTarget | null {
  if (
    (plan.sfp !== undefined && plan.sfp !== null)
  ) {
    return null;
  }
  const source = copulaNegationSourceSpans(plan);
  if (source === null) {
    return null;
  }
  if (plan.focusTailKind !== undefined && plan.focusTailKind !== null) {
    return copulaNegationFocusSourceTargetTrace(plan, options, source);
  }
  if (plan.modalKind === "kamo_shirenai") {
    return copulaNegationKamoSourceTargetTrace(plan, options, source);
  }
  if (plan.conjecture === true) {
    return copulaNegationConjectureSourceTargetTrace(plan, options, source);
  }
  const expected = realizeRenderPlanText(plan, options);
  const baseText = copulaNegationBaseText(plan);
  if (baseText === null || !expected.startsWith(baseText)) {
    return null;
  }
  const tailText = expected.slice(baseText.length);
  if (tailText.length === 0) {
    return null;
  }
  const rendered = renderedTargetFromSegments([
    syntheticTargetSegment({
      text: baseText,
      sourceSpan: source.baseSpan,
      kind: "lexeme",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    }),
    syntheticTargetSegment({
      text: tailText,
      sourceSpan: source.negationSpan,
      kind: "aux",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    })
  ]);
  return rendered.text === expected ? attachUnitToRenderedTarget(rendered, options.unit ?? null) : null;
}

function copulaNegationFocusSourceTargetTrace(
  plan: CopulaPredicatePlan,
  options: RenderTraceOptions,
  source: { readonly baseSpan: TargetSegment["sourceSpan"]; readonly negationSpan: TargetSegment["sourceSpan"] }
): RenderedTarget | null {
  const expected = realizeRenderPlanText(plan, options);
  const baseText = copulaNegationConjectureBaseText(plan);
  const negationText = copulaNegationFocusNegativeText(plan);
  const focusSuffix = copulaNegationFocusSuffix(plan);
  if (
    baseText === null ||
    negationText === null ||
    focusSuffix === null ||
    !expected.startsWith(`${baseText}${negationText}${focusSuffix}`)
  ) {
    return null;
  }
  const focusParticleSpan = sourceSpanForRuntimeTokens(plan.focusParticleTokens ?? []);
  const focusTailSpan = sourceSpanForRuntimeTokens(plan.focusTailTokens ?? []);
  if (focusParticleSpan === null || focusTailSpan === null) {
    return null;
  }
  const tailText = expected.slice(baseText.length + negationText.length + focusSuffix.length);
  if (tailText.length === 0) {
    return null;
  }
  const rendered = renderedTargetFromSegments([
    syntheticTargetSegment({
      text: baseText,
      sourceSpan: source.baseSpan,
      kind: "lexeme",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    }),
    syntheticTargetSegment({
      text: negationText,
      sourceSpan: source.negationSpan,
      kind: "aux",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    }),
    syntheticTargetSegment({
      text: focusSuffix,
      sourceSpan: focusParticleSpan,
      kind: "modal",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    }),
    syntheticTargetSegment({
      text: tailText,
      sourceSpan: focusTailSpan,
      kind: "aux",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    })
  ]);
  return rendered.text === expected ? attachUnitToRenderedTarget(rendered, options.unit ?? null) : null;
}

function copulaNegationConjectureSourceTargetTrace(
  plan: CopulaPredicatePlan,
  options: RenderTraceOptions,
  source: { readonly baseSpan: TargetSegment["sourceSpan"]; readonly negationSpan: TargetSegment["sourceSpan"] }
): RenderedTarget | null {
  const expected = realizeRenderPlanText(plan, options);
  const baseText = copulaNegationConjectureBaseText(plan);
  if (baseText === null || !expected.startsWith(baseText)) {
    return null;
  }
  const conjectureSpan = combineSourceSpans(
    sourceSpanForRuntimeTokens(plan.conjectureTokens ?? []),
    sourceSpanForRuntimeTokens(plan.followTokens ?? [])
  );
  if (conjectureSpan === null) {
    return null;
  }
  const negationTokens = runtimeTokensWithout(plan.negationTailTokens ?? [], plan.conjectureTokens ?? []);
  const negationSpan = sourceSpanForRuntimeTokens(negationTokens) ?? source.negationSpan;
  const split = copulaNegationConjectureTailSplit(plan, expected.slice(baseText.length), options);
  const segments: TargetSegment[] = [
    syntheticTargetSegment({
      text: baseText,
      sourceSpan: source.baseSpan,
      kind: "lexeme",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    })
  ];
  if (split !== null) {
    segments.push(
      syntheticTargetSegment({
        text: split.negationText,
        sourceSpan: negationSpan,
        kind: "aux",
        renderPlanKind: plan.kind,
        projectionConfidence: "semantic"
      }),
      syntheticTargetSegment({
        text: split.modalText,
        sourceSpan: conjectureSpan,
        kind: "modal",
        renderPlanKind: plan.kind,
        projectionConfidence: "semantic"
      })
    );
  } else {
    const restText = expected.slice(baseText.length);
    if (restText.length === 0) {
      return null;
    }
    segments.push(syntheticTargetSegment({
      text: restText,
      sourceSpan: combineSourceSpans(negationSpan, conjectureSpan),
      kind: "modal",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    }));
  }
  const rendered = renderedTargetFromSegments(segments);
  return rendered.text === expected ? attachUnitToRenderedTarget(rendered, options.unit ?? null) : null;
}

function copulaNegationKamoSourceTargetTrace(
  plan: CopulaPredicatePlan,
  options: RenderTraceOptions,
  source: { readonly baseSpan: TargetSegment["sourceSpan"]; readonly negationSpan: TargetSegment["sourceSpan"] }
): RenderedTarget | null {
  const modalTokens = plan.modalTokens ?? [];
  if (modalTokens.length < 3) {
    return null;
  }
  const baseText = copulaNegationBaseText(plan);
  const negationText = copulaNegationPreModalNegativeText(plan);
  if (baseText === null || negationText === null) {
    return null;
  }
  const markerText = "지도";
  const expected = realizeRenderPlanText(plan, options);
  const prefixText = `${baseText}${negationText}${markerText}`;
  if (!expected.startsWith(prefixText)) {
    return null;
  }
  const tailText = expected.slice(prefixText.length);
  if (tailText.length === 0) {
    return null;
  }
  const markerSpan = sourceSpanForRuntimeTokens(modalTokens.slice(0, 2));
  const modalTailSpan = sourceSpanForRuntimeTokens(modalTokens.slice(2)) ?? sourceSpanForRuntimeTokens(modalTokens);
  if (markerSpan === null || modalTailSpan === null) {
    return null;
  }
  const segments: TargetSegment[] = [
    syntheticTargetSegment({
      text: baseText,
      sourceSpan: source.baseSpan,
      kind: "lexeme",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    }),
    syntheticTargetSegment({
      text: negationText,
      sourceSpan: source.negationSpan,
      kind: "aux",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    }),
    syntheticTargetSegment({
      text: markerText,
      sourceSpan: markerSpan,
      kind: "modal",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    })
  ];
  const followSplit = copulaNegationKamoFollowTailSplit(plan, tailText);
  const followSpan = sourceSpanForRuntimeTokens(plan.followTokens ?? []);
  if (followSplit !== null && followSpan !== null) {
    segments.push(
      syntheticTargetSegment({
        text: followSplit.modalTailText,
        sourceSpan: modalTailSpan,
        kind: "modal",
        renderPlanKind: plan.kind,
        projectionConfidence: "semantic"
      }),
      syntheticTargetSegment({
        text: followSplit.followText,
        sourceSpan: followSpan,
        kind: "connective",
        renderPlanKind: plan.kind,
        projectionConfidence: "semantic"
      })
    );
  } else {
    segments.push(syntheticTargetSegment({
      text: tailText,
      sourceSpan: combineSourceSpans(modalTailSpan, followSpan),
      kind: "modal",
      renderPlanKind: plan.kind,
      projectionConfidence: "semantic"
    }));
  }
  const rendered = renderedTargetFromSegments(segments);
  return rendered.text === expected ? attachUnitToRenderedTarget(rendered, options.unit ?? null) : null;
}

function copulaNegationKamoFollowTailSplit(
  plan: CopulaPredicatePlan,
  tailText: string
): { readonly modalTailText: string; readonly followText: string } | null {
  if (plan.followKind === undefined || plan.followKind === null) {
    return null;
  }
  if (plan.followKind === "contrastive" && tailText === " 모르지만") {
    return { modalTailText: " 모르", followText: "지만" };
  }
  if (plan.followKind === "causal" && tailText === " 모르니까") {
    return { modalTailText: " 모르", followText: "니까" };
  }
  if (plan.followKind === "conditional" && tailText === " 모른다면") {
    return { modalTailText: " 모른", followText: "다면" };
  }
  return null;
}

function runtimeTokensWithout(
  tokens: readonly RuntimeHaruToken[],
  excluded: readonly RuntimeHaruToken[]
): readonly RuntimeHaruToken[] {
  if (excluded.length === 0) {
    return tokens;
  }
  return tokens.filter((token) => !excluded.some((candidate) => runtimeTokenSameSource(token, candidate)));
}

function runtimeTokenSameSource(left: RuntimeHaruToken, right: RuntimeHaruToken): boolean {
  const leftSpan = left.sourceSpan ?? (left.sourceOrdinal === undefined ? null : {
    startOrdinal: left.sourceOrdinal,
    endOrdinal: left.sourceOrdinal + 1
  });
  const rightSpan = right.sourceSpan ?? (right.sourceOrdinal === undefined ? null : {
    startOrdinal: right.sourceOrdinal,
    endOrdinal: right.sourceOrdinal + 1
  });
  if (leftSpan !== null && rightSpan !== null) {
    return leftSpan.startOrdinal === rightSpan.startOrdinal &&
      leftSpan.endOrdinal === rightSpan.endOrdinal &&
      left.surface === right.surface &&
      left.dictionaryForm === right.dictionaryForm;
  }
  return left.surface === right.surface &&
    left.dictionaryForm === right.dictionaryForm &&
    left.reading === right.reading;
}

function copulaNegationSourceSpans(plan: CopulaPredicatePlan): {
  readonly baseSpan: TargetSegment["sourceSpan"];
  readonly negationSpan: TargetSegment["sourceSpan"];
} | null {
  const baseSpan = combineSourceSpans(
    sourceSpanForRuntimeTokens(plan.contentTokens ?? []),
    sourceSpanForRuntimeTokens(plan.negationBridgeTokens ?? [])
  );
  const negationSpan = sourceSpanForRuntimeTokens(plan.negationTailTokens ?? []);
  return baseSpan === null || negationSpan === null ? null : { baseSpan, negationSpan };
}

function copulaNegationResolvedBase(plan: CopulaPredicatePlan): {
  readonly lemma: string;
  readonly koreanPos: number;
  readonly irregular: string | null;
} {
  const koreanLemma = plan.koreanLemma ?? "";
  const [lemma, koreanPos, irregular] = resolveCopulaAdj(
    plan.entry ?? null,
    koreanLemma,
    metadataKoreanPos(plan.entry ?? null, koreanLemma),
    asIrregular(plan.irregular ?? null),
    plan.jpPos ?? null
  );
  return { lemma, koreanPos, irregular: irregular ?? null };
}

function copulaSubjectParticle(lemma: string, additiveMo: boolean | undefined): string {
  if (additiveMo === true) return "도";
  return hasBatchim(lemma) ? "이" : "가";
}

function copulaNegationBaseText(plan: CopulaPredicatePlan): string | null {
  const { lemma, koreanPos, irregular } = copulaNegationResolvedBase(plan);
  if (koreanPos === 동사 || koreanPos === 형용사) {
    return `${conjugate(lemma, asIrregular(irregular), "지")}${plan.additiveMo === true ? "도" : ""}`;
  }
  const particle = copulaSubjectParticle(lemma, plan.additiveMo);
  return `${lemma}${particle} `;
}

function copulaNegationConjectureBaseText(plan: CopulaPredicatePlan): string | null {
  const { lemma, koreanPos, irregular } = copulaNegationResolvedBase(plan);
  if (koreanPos === 동사 || koreanPos === 형용사) {
    return `${conjugate(lemma, asIrregular(irregular), "지")}${plan.additiveMo === true ? "도" : ""}`;
  }
  const particle = copulaSubjectParticle(lemma, plan.additiveMo);
  return `${lemma}${particle} `;
}

function copulaNegationFocusNegativeText(plan: CopulaPredicatePlan): string | null {
  const { koreanPos } = copulaNegationResolvedBase(plan);
  return koreanPos === 동사 || koreanPos === 형용사 ? " 않" : "아니";
}

function copulaNegationFocusSuffix(plan: CopulaPredicatePlan): string | null {
  if (
    plan.focusParticle !== "も" &&
    plan.focusParticle !== "は"
  ) {
    return null;
  }
  if (
    plan.focusTailKind !== "positive" &&
    plan.focusTailKind !== "negative"
  ) {
    return null;
  }
  if (plan.focusParticle === "も") {
    return plan.focusTailKind === "positive" ? "기도" : "지도";
  }
  return plan.focusTailKind === "positive" ? "기는" : "지는";
}

function copulaNegationConjectureTailSplit(
  plan: CopulaPredicatePlan,
  tailText: string,
  options: RenderTraceOptions
): { readonly negationText: string; readonly modalText: string } | null {
  const { koreanPos } = copulaNegationResolvedBase(plan);
  if (koreanPos !== 동사 && koreanPos !== 형용사 && (options.formal ?? false)) {
    return null;
  }
  const negationText = koreanPos === 동사 || koreanPos === 형용사
    ? plan.past === true ? " 않았" : " 않"
    : plan.past === true ? "아니었" : "아니";
  if (!tailText.startsWith(negationText)) {
    return null;
  }
  const modalText = tailText.slice(negationText.length);
  return modalText.length === 0 ? null : { negationText, modalText };
}

function copulaNegationPreModalNegativeText(plan: CopulaPredicatePlan): string | null {
  const { koreanPos } = copulaNegationResolvedBase(plan);
  if (koreanPos === 동사 || koreanPos === 형용사) {
    return plan.past === true ? " 않았을" : " 않을";
  }
  return plan.past === true ? "아니었을" : "아닐";
}

function realizeWakeExplanationWithTrace(
  plan: Extract<RenderPlan, { kind: "wakeExplanation" }>,
  options: RenderTraceOptions
): RenderedTarget {
  const payload = wakeExplanationPayload(plan);
  return traceExpectedWithChildren(plan, options, realizeRenderPlanText(plan, options), [
    exactChildTrace(payload.prefix, options)
  ]);
}

function realizeConjectureThoughtQuoteWithTrace(
  plan: ConjectureThoughtQuotePlan,
  options: RenderTraceOptions
): RenderedTarget {
  const numeric = requireNumericTables(options.numeric, "conjecture thought quote trace");
  const committedRoot = commitTail(
    conjectureThoughtQuoteHostedRoot(plan, options.formal ?? false, options.lookups, numeric),
    { lookups: options.lookups, numeric }
  ).root;
  const expected = realizeConjectureThoughtQuote(plan, options.formal ?? false, options.lookups, numeric);
  const layer = auxLayerFromThoughtQuoteRoot(committedRoot);
  const projected = projectConjectureThoughtQuoteAttributive(layer, options.lookups);
  if (projected === null || committedRoot.tail.kind !== "auxLayer") {
    const direct = renderTailWithSourceTargetTrace(committedRoot, {
      formal: options.formal ?? false,
      lookups: options.lookups
    });
    return direct !== null && direct.text === expected
      ? attachUnitToRenderedTarget(direct, options.unit ?? null)
      : fallbackRenderedTarget(plan, options);
  }
  const quoteIdx = layer.ops.findIndex((op) => op.kind === "connective" && op.connective === "quotative");
  if (quoteIdx < 0) {
    const direct = renderTailWithSourceTargetTrace(committedRoot, {
      formal: options.formal ?? false,
      lookups: options.lookups
    });
    return direct !== null && direct.text === expected
      ? attachUnitToRenderedTarget(direct, options.unit ?? null)
      : fallbackRenderedTarget(plan, options);
  }
  const beforeQuote = layer.ops.slice(0, quoteIdx);
  const conjectureIdx = beforeQuote.findIndex(isConjectureThoughtQuoteCarrierOp);
  if (conjectureIdx < 0) {
    return fallbackRenderedTarget(plan, options);
  }
  let projectedText = projected;
  let carrierText = " 거";
  if (
    layer.stem.kind === "noun" &&
    beforeQuote[conjectureIdx]?.kind === "copula" &&
    projectedText.endsWith("일")
  ) {
    projectedText = projectedText.slice(0, -"일".length);
    carrierText = "일 거";
  }
  const projectionTokens = [
    ...layer.stem.source.tokens,
    ...beforeQuote.slice(0, conjectureIdx).flatMap((op) => op.source.tokens)
  ];
  const carrierTokens = beforeQuote[conjectureIdx]?.source.tokens ?? [];
  const quoteTokens = layer.ops[quoteIdx]?.source.tokens ?? [];
  const rendered = renderedTargetFromSegments([
    syntheticTargetSegment({
      text: projectedText,
      sourceSpan: sourceSpanForRuntimeTokens(projectionTokens) ?? options.sourceSpan ?? null,
      renderPlanKind: plan.kind,
      kind: "modal",
      projectionConfidence: "semantic"
    }),
    syntheticTargetSegment({
      text: carrierText,
      sourceSpan: sourceSpanForRuntimeTokens(carrierTokens),
      renderPlanKind: plan.kind,
      kind: "modal",
      projectionConfidence: "semantic"
    }),
    syntheticTargetSegment({
      text: "라고",
      sourceSpan: sourceSpanForRuntimeTokens(quoteTokens),
      renderPlanKind: plan.kind,
      kind: "quote",
      projectionConfidence: "semantic"
    })
  ]);
  if (rendered.text === expected) {
    return attachUnitToRenderedTarget(rendered, options.unit ?? null);
  }
  const direct = renderTailWithSourceTargetTrace(committedRoot, {
    formal: options.formal ?? false,
    lookups: options.lookups
  });
  return direct !== null && direct.text === expected
    ? attachUnitToRenderedTarget(direct, options.unit ?? null)
    : fallbackRenderedTarget(plan, options);
}

function exactChildTrace(plan: RenderPlan, options: RenderTraceOptions): RenderedTarget {
  return realizeRenderPlanWithTrace(plan, {
    ...options,
    unit: options.unit ?? null
  });
}

function semanticRenderedTargetSegment(
  renderPlanKind: RenderPlan["kind"],
  text: string,
  sourceSpan: TargetSegment["sourceSpan"],
  kind: TargetSegment["kind"],
  projectionConfidence: TargetSegment["projectionConfidence"] = "semantic"
): RenderedTarget {
  return renderedTargetFromSegments([
    syntheticTargetSegment({
      text,
      sourceSpan,
      renderPlanKind,
      kind,
      projectionConfidence
    })
  ]);
}

function predicatePayloadSourceSpan(payload: SimilePredicatePayload): TargetSegment["sourceSpan"] {
  return combineSourceSpans(
    sourceSpanForRuntimeTokens([payload.contentToken]),
    sourceSpanForRuntimeTokens(payload.auxTokens)
  );
}

function traceExpectedWithChildren(
  plan: RenderPlan,
  options: RenderTraceOptions,
  expected: string,
  children: readonly RenderedTarget[],
  ownerKind: TargetSegment["kind"] = "connective"
): RenderedTarget {
  if (children.length === 0) {
    return atomicRenderedTarget(plan, options);
  }
  const segments: TargetSegment[] = [];
  let cursor = 0;
  for (const child of children) {
    if (child.text.length === 0) {
      continue;
    }
    const index = expected.indexOf(child.text, cursor);
    if (index < 0) {
      return fallbackRenderedTarget(plan, options);
    }
    appendOwnerTemplateText(segments, plan.kind, expected.slice(cursor, index), ownerKind);
    segments.push(...child.segments);
    cursor = index + child.text.length;
  }
  appendOwnerTemplateText(segments, plan.kind, expected.slice(cursor), ownerKind);
  const rendered = renderedTargetFromSegments(segments);
  return rendered.text === expected
    ? attachUnitToRenderedTarget(rendered, options.unit ?? null)
    : fallbackRenderedTarget(plan, options);
}

function realizeYoudaModalityWithTrace(
  plan: YoudaModalityPlan,
  options: RenderTraceOptions
): RenderedTarget {
  const payload = youdaModalityPayload(plan);
  const expected = realizeRenderPlanText(plan, options);
  const attr = renderNodaPayloadAttributive(payload, options.lookups);
  const modalSourceSpan = sourceSpanForRuntimeTokens(payload.modalAux);
  const suffixPlan: RenderPlan = payload.mode === "attributive"
    ? {
      kind: "attributive",
      koreanLemma: "듯하다",
      irregular: null,
      koreanPos: 형용사,
      auxTokens: payload.modalAux,
      contentToken: syntheticPredicateToken("듯하다", 形容詞0, 連体形_一般)
    }
    : {
      kind: "lemma",
      entry: null,
      koreanLemma: "같다",
      koreanPos: 형용사,
      irregular: null,
      auxTokens: payload.modalAux,
      connective: payload.connective ?? null,
      sfp: payload.sfp ?? null
    };
  const suffix = realizeRenderPlanWithTrace(suffixPlan, {
    ...options,
    sourceSpan: modalSourceSpan,
    unit: options.unit ?? null
  });
  return traceExpectedWithChildren(plan, options, expected, [
    semanticRenderedTargetSegment(plan.kind, attr, predicatePayloadSourceSpan(payload), "lexeme"),
    suffix
  ], "modal");
}

function realizeReasonBecauseWithTrace(
  plan: ReasonBecausePlan,
  options: RenderTraceOptions
): RenderedTarget {
  const payload = reasonBecausePayload(plan);
  const expected = realizeRenderPlanText(plan, options);
  const suffix = payload.projection === "nominal" ? " 때문" : " 때문에";
  if (!expected.endsWith(suffix)) {
    return fallbackRenderedTarget(plan, options);
  }
  const stem = expected.slice(0, expected.length - suffix.length);
  return traceExpectedWithChildren(plan, options, expected, [
    semanticRenderedTargetSegment(
      plan.kind,
      stem,
      combineSourceSpans(sourceSpanForRuntimeTokens(payload.auxTokens), options.sourceSpan ?? null),
      "lexeme"
    )
  ], "connective");
}

function appendOwnerTemplateText(
  segments: TargetSegment[],
  renderPlanKind: RenderPlan["kind"],
  text: string,
  kind: TargetSegment["kind"]
): void {
  if (text.length === 0) {
    return;
  }
  segments.push(syntheticTargetSegment({
    text,
    renderPlanKind,
    kind: /^\s+$/u.test(text) ? "punctuation" : kind,
    projectionConfidence: "owner"
  }));
}

function semanticRenderedTargetSegmentWithTrailingSpaceSplit(
  renderPlanKind: RenderPlan["kind"],
  text: string,
  sourceSpan: TargetSegment["sourceSpan"],
  kind: TargetSegment["kind"],
  projectionConfidence: TargetSegment["projectionConfidence"] = "semantic"
): RenderedTarget {
  const trailingSpace = /\s+$/u.exec(text)?.[0] ?? "";
  if (trailingSpace.length === 0 || trailingSpace.length === text.length) {
    return semanticRenderedTargetSegment(renderPlanKind, text, sourceSpan, kind, projectionConfidence);
  }
  const semanticText = text.slice(0, -trailingSpace.length);
  const segments = [
    ...semanticRenderedTargetSegment(renderPlanKind, semanticText, sourceSpan, kind, projectionConfidence).segments
  ];
  appendOwnerTemplateText(segments, renderPlanKind, trailingSpace, "punctuation");
  return renderedTargetFromSegments(segments);
}

function realizeHybridPostAuxWithTrace(
  plan: HybridPostAuxPlan,
  options: RenderTraceOptions
): RenderedTarget {
  const formal = options.formal ?? false;
  const payload = hybridPostAuxPayload(plan);
  const content = realizeRenderPlanWithTrace(payload.content, options);
  const tailText = payload.modalKind === "kamo_shirenai"
    ? renderKamoShirenaiTail(payload.modalPolite === true, payload.modalPast === true, formal)
    : renderKoreanPredicateTerminal(
      payload.tailLemma,
      asIrregular(payload.tailIrregular),
      payload.tailKoreanPos,
      koreanPredicateAuxChain(payload.tailAuxTokens),
      { lookups: options.lookups, formal }
    ).text;
  const segments: TargetSegment[] = [
    ...content.segments
  ];
  if (payload.middleText.length > 0) {
    segments.push(syntheticTargetSegment({
      text: payload.middleText,
      renderPlanKind: plan.kind,
      kind: "connective",
      projectionConfidence: "owner"
    }));
  }
  segments.push(syntheticTargetSegment({
    text: tailText,
    sourceSpan: sourceSpanForRuntimeTokens(payload.tailAuxTokens),
    renderPlanKind: plan.kind,
    kind: payload.modalKind === "kamo_shirenai" ? "modal" : "aux",
    projectionConfidence: "semantic"
  }));
  const rendered = renderedTargetFromSegments(segments);
  return rendered.text === realizeRenderPlanText(plan, options)
    ? rendered
    : fallbackRenderedTarget(plan, options);
}

function realizeGiveRequestWithTrace(
  plan: GiveRequestPlan,
  options: RenderTraceOptions
): RenderedTarget {
  const base = realizeRenderPlanWithTrace(plan.base, options);
  const tailText = giveRequestTailText(plan.requestKind);
  const expected = realizeRenderPlanText(plan, options);
  const direct = appendOwnerSuffixTrace(plan.kind, base, ` ${tailText}`, "aux");
  if (direct.text === expected) {
    return direct;
  }

  const trimmed = trimRenderedTargetSuffix(base, base.text.endsWith(" 줘") ? " 줘" : base.text.endsWith("줘") ? "줘" : "");
  if (trimmed !== null) {
    const normalized = appendOwnerSuffixTrace(plan.kind, trimmed, tailText, "aux");
    if (normalized.text === expected) {
      return normalized;
    }
  }
  return fallbackRenderedTarget(plan, options);
}

function realizeProjectedScopeWithTrace(
  plan: PredicateScopePlan | PredicateNominalScopePlan,
  projected: string,
  options: RenderTraceOptions
): RenderedTarget {
  const withSuffix = `${projected}${plan.suffix ?? ""}`;
  const baseTrace = realizeRenderPlanWithTrace(plan.base, options);
  const baseSourceSpan = combineSourceSpans(...baseTrace.segments.map((segment) => segment.sourceSpan)) ?? options.sourceSpan ?? null;
  const segments: TargetSegment[] = [
    syntheticTargetSegment({
      text: projected,
      sourceSpan: baseSourceSpan,
      renderPlanKind: plan.kind,
      kind: "connective",
      projectionConfidence: "semantic"
    })
  ];
  if (plan.suffix !== undefined && plan.suffix.length > 0) {
    segments.push(syntheticTargetSegment({
      text: plan.suffix,
      renderPlanKind: plan.kind,
      kind: "connective",
      projectionConfidence: "owner"
    }));
  }
  const rendered = renderedTargetFromSegments(segments);
  return rendered.text === withSuffix
    ? rendered
    : fallbackRenderedTarget(plan, options);
}

function realizePredicateScopeWithTrace(
  plan: PredicateScopePlan,
  options: RenderTraceOptions
): RenderedTarget {
  const numeric = requireNumericTables(options.numeric, "predicate scope traced render plan");
  const projected = realizePredicateScope(plan, options.formal ?? false, options.lookups, numeric);
  return realizeProjectedScopeWithTrace(plan, projected, options);
}

function realizePredicateNominalScopeWithTrace(
  plan: PredicateNominalScopePlan,
  options: RenderTraceOptions
): RenderedTarget {
  const numeric = requireNumericTables(options.numeric, "predicate nominal scope traced render plan");
  const projected = realizePredicateNominalScope(plan, options.formal ?? false, options.lookups, numeric);
  return realizeProjectedScopeWithTrace(plan, projected, options);
}

function realizePredicateScopeCarrierWithTrace(
  plan: PredicateScopeCarrierPlan,
  options: RenderTraceOptions
): RenderedTarget {
  const numeric = requireNumericTables(options.numeric, "predicate scope carrier traced render plan");
  const projection = (() => {
    switch (plan.projection.kind) {
      case "predicateScope":
        return realizePredicateScopeWithTrace({
          kind: "predicateScope",
          base: plan.projection.base,
          ending: plan.projection.ending,
          ...(plan.projection.suffix === undefined ? {} : { suffix: plan.projection.suffix })
        }, options);
      case "predicateNominalScope":
        return realizePredicateNominalScopeWithTrace({
          kind: "predicateNominalScope",
          base: plan.projection.base,
          ...(plan.projection.suffix === undefined ? {} : { suffix: plan.projection.suffix })
        }, options);
      case "direct":
        return realizeRenderPlanWithTrace(plan.projection.base, options);
    }
  })();
  const { suffix: _suffix, ...carrierWithoutSuffix } = plan;
  const expectedProjection = realizePredicateScopeCarrier(
    carrierWithoutSuffix,
    options.formal ?? false,
    options.lookups,
    numeric
  );
  if (projection.text !== expectedProjection) {
    return fallbackRenderedTarget(plan, options);
  }
  const suffix = renderPlanText(plan.suffix, options.formal ?? false, options.lookups, options.numeric);
  const withSuffix = typeof plan.suffix === "string" || plan.suffix === undefined
    ? appendOwnerSuffixTrace(plan.kind, projection, suffix, "connective")
    : appendRenderedTarget(projection, realizeRenderPlanWithTrace(plan.suffix, {
      ...options,
      sourceSpan: null
    }));
  return withSuffix.text === realizeRenderPlanText(plan, options)
    ? withSuffix
    : fallbackRenderedTarget(plan, options);
}

function appendRenderedTarget(base: RenderedTarget, suffix: RenderedTarget): RenderedTarget {
  return renderedTargetFromSegments([...base.segments, ...suffix.segments]);
}

function appendOwnerSuffixTrace(
  renderPlanKind: RenderPlan["kind"],
  base: RenderedTarget,
  suffix: string,
  kind: TargetSegment["kind"]
): RenderedTarget {
  if (suffix.length === 0) {
    return base;
  }
  return renderedTargetFromSegments([
    ...base.segments,
    syntheticTargetSegment({
      text: suffix,
      renderPlanKind,
      kind,
      projectionConfidence: "owner"
    })
  ]);
}

function trimRenderedTargetSuffix(rendered: RenderedTarget, suffix: string): RenderedTarget | null {
  if (suffix.length === 0 || !rendered.text.endsWith(suffix) || rendered.segments.length === 0) {
    return null;
  }
  const segments = rendered.segments.slice();
  let remaining = suffix.length;
  while (remaining > 0 && segments.length > 0) {
    const last = segments[segments.length - 1]!;
    if (last.text.length > remaining) {
      segments[segments.length - 1] = {
        ...last,
        text: last.text.slice(0, last.text.length - remaining)
      };
      remaining = 0;
      break;
    }
    remaining -= last.text.length;
    segments.pop();
  }
  return remaining === 0 ? renderedTargetFromSegments(segments) : null;
}

function renderedTargetFromSegments(segments: readonly TargetSegment[]): RenderedTarget {
  return {
    text: renderedTargetText(segments),
    segments,
  };
}

function renderedTargetText(segments: readonly TargetSegment[]): string {
  return segments.map((segment) => segment.text).join("");
}

function nonIdentityAllomorphHost(surface: string, host: string): string | undefined {
  return host === surface ? undefined : host;
}

function allomorphHostOfRenderedTarget(target: RenderedTarget, options: RenderTraceOptions): string {
  const host = trailingAllomorphHostText(
    target.segments,
    options.tokens === undefined ? {} : { tokens: options.tokens }
  );
  return host.length > 0 ? host : target.text;
}

function withFusedParticleSourceSpan(
  target: RenderedTarget,
  source: ParticleSourceProvenance | undefined
): RenderedTarget {
  const particleSpan = source?.sourceSpan ?? null;
  if (particleSpan === null || target.segments.length === 0) {
    return target;
  }
  const lastIndex = target.segments.length - 1;
  const last = target.segments[lastIndex]!;
  const combined = combineSourceSpans(last.sourceSpan, particleSpan);
  return {
    text: target.text,
    segments: [
      ...target.segments.slice(0, lastIndex),
      {
        ...last,
        sourceSpan: combined,
        boundaryBefore: sourceBoundaryBefore(combined),
        boundaryAfter: sourceBoundaryAfter(combined)
      }
    ]
  };
}

function withParticleSourceProvenance(
  segment: TargetSegment,
  source: ParticleSourceProvenance | undefined
): TargetSegment {
  if (source === undefined) {
    return segment;
  }
  const sourceSpan = source.sourceSpan ?? null;
  return {
    ...segment,
    sourceSpan,
    boundaryBefore: sourceBoundaryBefore(sourceSpan),
    boundaryAfter: sourceBoundaryAfter(sourceSpan),
    unit: source.unit ?? segment.unit
  };
}

function syntheticTargetSegment(options: {
  readonly text: string;
  readonly sourceSpan?: TargetSegment["sourceSpan"];
  readonly kind: TargetSegment["kind"];
  readonly renderPlanKind: RenderPlan["kind"] | string | null;
  readonly projectionConfidence?: TargetSegment["projectionConfidence"];
  readonly allomorphRole?: TargetSegment["allomorphRole"];
}): TargetSegment {
  const sourceSpan = options.sourceSpan ?? null;
  const allomorphRole = options.allomorphRole ?? (
    options.kind === "punctuation" ||
      options.kind === "quote" ||
      options.kind === "parenthetical" ||
      options.kind === "annotation" ||
      options.kind === "fallback" ||
      sourceSpan === null
      ? undefined
      : "source_anchor"
  );
  return {
    text: options.text,
    sourceSpan,
    boundaryBefore: sourceBoundaryBefore(sourceSpan),
    boundaryAfter: sourceBoundaryAfter(sourceSpan),
    unit: null,
    renderPlanKind: options.renderPlanKind,
    kind: options.kind,
    ...(allomorphRole === undefined ? {} : { allomorphRole }),
    projectionConfidence: options.projectionConfidence ?? "exact",
  };
}

function sourceSpanForRuntimeTokens(tokens: readonly RuntimeHaruToken[]): TargetSegment["sourceSpan"] {
  let startOrdinal: number | null = null;
  let endOrdinal: number | null = null;
  for (const token of tokens) {
    const span = token.sourceSpan ?? (token.sourceOrdinal === undefined ? null : {
      startOrdinal: token.sourceOrdinal,
      endOrdinal: token.sourceOrdinal + 1,
    });
    if (span === null) {
      continue;
    }
    startOrdinal = startOrdinal === null ? span.startOrdinal : Math.min(startOrdinal, span.startOrdinal);
    endOrdinal = endOrdinal === null ? span.endOrdinal : Math.max(endOrdinal, span.endOrdinal);
  }
  return startOrdinal === null || endOrdinal === null
    ? null
    : { startOrdinal, endOrdinal };
}

function sourceSpanForRuntimeTokenIndexes(
  tokens: readonly RuntimeHaruToken[],
  indexes: readonly number[]
): TargetSegment["sourceSpan"] {
  return sourceSpanForRuntimeTokens(indexes
    .map((index) => tokens[index])
    .filter((token): token is RuntimeHaruToken => token !== undefined));
}

function combineSourceSpans(
  ...spans: readonly TargetSegment["sourceSpan"][]
): TargetSegment["sourceSpan"] {
  let startOrdinal: number | null = null;
  let endOrdinal: number | null = null;
  for (const span of spans) {
    if (span === null) {
      continue;
    }
    startOrdinal = startOrdinal === null ? span.startOrdinal : Math.min(startOrdinal, span.startOrdinal);
    endOrdinal = endOrdinal === null ? span.endOrdinal : Math.max(endOrdinal, span.endOrdinal);
  }
  return startOrdinal === null || endOrdinal === null
    ? null
    : { startOrdinal, endOrdinal };
}

function renderPlanTargetSegmentKind(plan: RenderPlan): TargetSegment["kind"] {
  switch (plan.kind) {
    case "fixedText":
    case "registerText":
    case "numeral":
    case "lemma":
    case "attributive":
    case "conjugatedLemma":
    case "particleizedLemma":
    case "particleizedContent":
    case "compoundNominalSuffix":
    case "semanticCarrierPredicate":
    case "keijoujiAdverb":
    case "keijoujiState":
      return "lexeme";
    case "lexicalParticleAdverbial":
      return "connective";
    case "structuralRelationSequence":
      return "quote";
    case "copulaPredicate":
      return "aux";
    case "headTailChain":
    case "hybridPostAux":
    case "functionalChainResidual":
    case "noda":
      return "modal";
    case "discourseConnective":
    case "reasonBecause":
    case "nominalConnectiveScope":
      return "connective";
    case "quoteHostReportingPassive":
    case "quoteCognitionHost":
    case "conjectureThoughtQuote":
      return "quote";
    case "kaParallel":
    case "kaParallelNegativeAlternative":
    case "nariParallel":
    case "predicateScope":
    case "predicateNominalScope":
    case "predicateScopeCarrier":
    case "pronominalNoNominal":
    case "youdaModality":
    case "nominalDemoAru":
    case "giveRequest":
    case "wakeExplanation":
      return "synthetic";
    case "legacySurfaceComposition":
      return "fallback";
  }
  return assertNeverSegmentKind(plan);
}

function renderPlanProjectionConfidence(plan: RenderPlan): TargetSegment["projectionConfidence"] {
  if (plan.kind === "fixedText" || plan.kind === "registerText" || plan.kind === "numeral") {
    return "exact";
  }
  if (plan.kind === "legacySurfaceComposition") {
    return "fallback";
  }
  return "owner";
}

function sourceBoundaryBefore(sourceSpan: TargetSegment["sourceSpan"]): TargetSegment["boundaryBefore"] {
  if (sourceSpan === null) {
    return null;
  }
  return {
    beforeOrdinal: sourceSpan.startOrdinal > 0 ? sourceSpan.startOrdinal - 1 : null,
    afterOrdinal: sourceSpan.startOrdinal
  };
}

function sourceBoundaryAfter(sourceSpan: TargetSegment["sourceSpan"]): TargetSegment["boundaryAfter"] {
  if (sourceSpan === null) {
    return null;
  }
  return {
    beforeOrdinal: sourceSpan.endOrdinal - 1,
    afterOrdinal: sourceSpan.endOrdinal
  };
}

function assertNeverRenderPlan(plan: never): never {
  throw new Error(`unhandled render plan kind in traced renderer: ${(plan as RenderPlan).kind}`);
}

function assertNeverSegmentKind(plan: never): never {
  throw new Error(`unhandled render plan kind in segment classifier: ${(plan as RenderPlan).kind}`);
}

function realizeKaParallel(plan: Extract<RenderPlan, { kind: "kaParallel" }>, formal: boolean, lookups: LookupTables, numeric?: NumericTables, tokens?: readonly RuntimeHaruToken[]): string {
  const renderOptions: RenderTraceOptions = {
    formal,
    lookups,
    ...(numeric === undefined ? {} : { numeric }),
    ...(tokens === undefined ? {} : { tokens })
  };
  const rendered = plan.itemPlans.map((itemPlan) => realizeRenderPlanWithTrace(itemPlan, renderOptions));
  const hosts = rendered.map((item) => allomorphHostOfRenderedTarget(item, renderOptions));
  const items = rendered.map((item) => item.text);
  const lastItemOwnsQuestion = items.at(-1)?.endsWith("?") === true;
  if (plan.terminalPunctuationRun.includes("question") && items.at(-1)?.endsWith("?")) {
    items[items.length - 1] = items[items.length - 1]!.slice(0, -1);
  }
  const separator = plan.separator === "comma" ? ", " : " ";
  const body = plan.relationKind === "choice"
    ? items.map((item, index) => kaParallelChoiceItem(item, hosts[index] ?? item, formal, plan.terminalPunctuation)).join(separator)
    : items.join(separator);
  const punctuation = lastItemOwnsQuestion && plan.terminalPunctuation === "period"
    ? ""
    : kaParallelTerminalPunctuationText(plan);
  const suffix = renderPlanText(plan.suffix, formal, lookups, numeric);
  return `${body}${suffix}${punctuation}`;
}

function realizeNariParallel(plan: Extract<RenderPlan, { kind: "nariParallel" }>, formal: boolean, lookups: LookupTables, numeric?: NumericTables, tokens?: readonly RuntimeHaruToken[]): string {
  const renderOptions: RenderTraceOptions = {
    formal,
    lookups,
    ...(numeric === undefined ? {} : { numeric }),
    ...(tokens === undefined ? {} : { tokens })
  };
  const separator = plan.separator === "comma" ? ", " : " ";
  const joinItems = (items: readonly string[]): string => items.map((item, index) => {
    if (index === 0) return item;
    return `${plan.itemSeparatorTexts?.[index - 1] ?? separator}${item}`;
  }).join("");
  const itemKinds = plan.itemKinds ?? plan.itemPlans.map(() => plan.itemKind);
  const items = plan.itemPlans.map((itemPlan) => realizeRenderPlanWithTrace(itemPlan, renderOptions));
  const hosts = items.map((item) => allomorphHostOfRenderedTarget(item, renderOptions));
  const texts = items.map((item) => item.text);
  const lastHost = hosts.at(-1) ?? "";
  if (plan.nominalListingStyle === "toka") {
    const closesWithoutSuffix = plan.nominalListingClosure !== "continues" && plan.nominalListingClosure !== "closed";
    const body = texts.map((item, index) => index < texts.length - 1 || plan.nominalListingClosure === "continues"
        ? `${item}${selectParticle(hosts[index] ?? item, "이나/나")}`
        : plan.nominalListingClosure === "closed" ? `${item} 등` : item);
    const joined = joinItems(body);
    return plan.trailingParticle === undefined || plan.trailingParticle === null
      ? joined
      : `${joined}${selectParticle(closesWithoutSuffix ? lastHost : joined, plan.trailingParticle)}`;
  }
  if (itemKinds.every((kind) => kind === "predicate")) {
    return joinItems(texts);
  }
  if (plan.trailingParticle !== undefined && plan.trailingParticle !== null) {
    const body = texts.map((item, index) => {
        if (index === texts.length - 1) {
          return item;
        }
        return itemKinds[index] === "predicate" ? item : `${item}${selectParticle(hosts[index] ?? item, "이나/나")}`;
      });
    const joined = joinItems(body);
    return `${joined}${selectParticle(lastHost, plan.trailingParticle)}`;
  }
  return joinItems(texts.map((item, index) =>
    itemKinds[index] === "predicate" ? item : `${item}${selectParticle(hosts[index] ?? item, "이든/든")}`
  ));
}

function realizeParticleizedContent(plan: Extract<RenderPlan, { kind: "particleizedContent" }>, formal: boolean, lookups: LookupTables, numeric?: NumericTables, tokens?: readonly RuntimeHaruToken[]): string {
  const renderOptions: RenderTraceOptions = {
    formal,
    lookups,
    ...(numeric === undefined ? {} : { numeric }),
    ...(tokens === undefined ? {} : { tokens })
  };
  const content = realizeRenderPlanWithTrace(plan.content, renderOptions);
  const particle = selectParticle(allomorphHostOfRenderedTarget(content, renderOptions), plan.particle, plan.register === undefined ? {} : { register: plan.register });
  const contracted = particle === "가" ? plan.subjectParticleStem ?? undefined : undefined;
  return `${contracted ?? content.text}${particle}`;
}

function kaParallelChoiceItem(item: string, host: string, formal: boolean, terminalPunctuation: "question" | "exclamation" | "period" | null): string {
  return `${item}${kaParallelChoiceSuffix(host, formal, terminalPunctuation)}`;
}

function kaParallelTerminalPunctuationText(plan: Extract<RenderPlan, { kind: "kaParallel" }>): string {
  if (plan.terminalPunctuationRun.length > 0) {
    return plan.terminalPunctuationRun.map((punctuation) => punctuation === "question"
      ? "?"
      : punctuation === "exclamation"
        ? "!"
        : ".").join("");
  }
  return plan.terminalPunctuation === "question"
    ? "?"
    : plan.terminalPunctuation === "exclamation"
      ? "!"
      : plan.terminalPunctuation === "period"
        ? "."
        : "";
}

function kaParallelChoiceSuffix(host: string, formal: boolean, terminalPunctuation: "question" | "exclamation" | "period" | null): string {
  if (terminalPunctuation === "question" || terminalPunctuation === "exclamation") {
    return formal ? "인가" : hasBatchim(host) ? "이니" : "니";
  }
  return "인지";
}

function realizeFunctionalChainResidual(plan: FunctionalChainResidualPlan, formal: boolean, lookups: LookupTables): string {
  return renderRepeatedFunctionalChainText({
    koreanLemma: plan.koreanLemma,
    irregular: plan.irregular,
    koreanPos: plan.koreanPos,
    chunks: plan.chunks,
    formal,
    question: plan.question,
    ...(plan.jpDictForm === undefined || plan.jpDictForm === null ? {} : { jpDictForm: plan.jpDictForm }),
    ...(plan.verbConjType === undefined || plan.verbConjType === null ? {} : { verbConjType: plan.verbConjType }),
    forcePassive: plan.forcePassive === true,
    lookups
  });
}

function discourseConnectivePayload(plan: Extract<RenderPlan, { readonly kind: "discourseConnective" }>): DiscourseConnectivePayload {
  return "payload" in plan ? plan.payload : plan;
}

function renderDiscourseConnective(payload: DiscourseConnectivePayload, formal: boolean): string {
  switch (payload.id) {
    case "demonstrative_tame_discourse":
      return formal ? "따라서" : "그래서";
  }
}

function hybridPostAuxPayload(plan: HybridPostAuxPlan): HybridPostAuxPayload {
  return "payload" in plan ? plan.payload : plan;
}

function realizeHybridPostAux(plan: HybridPostAuxPlan, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  const payload = hybridPostAuxPayload(plan);
  const content = realizeRenderPlanText(payload.content, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) });
  if (payload.modalKind === "kamo_shirenai") {
    return `${content}${payload.middleText}${renderKamoShirenaiTail(payload.modalPolite === true, payload.modalPast === true, formal)}`;
  }
  const tail = renderKoreanPredicateTerminal(
    payload.tailLemma,
    asIrregular(payload.tailIrregular),
    payload.tailKoreanPos,
    koreanPredicateAuxChain(payload.tailAuxTokens),
    { lookups, formal }
  ).text;
  return `${content}${payload.middleText}${tail}`;
}

export function commitSharedPredicateScopeProjection(
  plan: PredicateScopePlan,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): SharedTailChainRenderResult {
  const source = sharedRenderSourceFromPlan(plan.base);
  return buildSharedTailChainRenderResult({
    korean: `${realizePredicateScope(plan, formal, lookups, numeric)}${plan.suffix ?? ""}`,
    polite: false,
    warnings: [],
    descriptor: source.descriptor,
    sourceCandidate: source.sourceCandidate,
    fallbackTailSourceKind: "scope_projection",
    fallbackHeadKind: sharedRenderFallbackHeadKind(plan.base),
    fallbackTailSegmentKinds: ["scope_bridge"],
    fallbackRequiredContinuationCapabilityIds: ["predicate_tail_scope_bridge"]
  });
}

export function commitSharedPredicateNominalScopeProjection(
  plan: PredicateNominalScopePlan,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): SharedTailChainRenderResult {
  const source = sharedRenderSourceFromPlan(plan.base);
  return buildSharedTailChainRenderResult({
    korean: `${realizePredicateNominalScope(plan, formal, lookups, numeric)}${plan.suffix ?? ""}`,
    polite: false,
    warnings: [],
    descriptor: source.descriptor,
    sourceCandidate: source.sourceCandidate,
    fallbackTailSourceKind: "scope_projection",
    fallbackHeadKind: sharedRenderFallbackHeadKind(plan.base),
    fallbackTailSegmentKinds: ["scope_bridge"],
    fallbackRequiredContinuationCapabilityIds: ["predicate_tail_scope_bridge"]
  });
}

function realizePredicateScopeCarrier(
  plan: PredicateScopeCarrierPlan,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): string {
  const projection = (() => {
    switch (plan.projection.kind) {
      case "predicateScope":
        return commitSharedPredicateScopeProjection({
          kind: "predicateScope",
          base: plan.projection.base,
          ending: plan.projection.ending,
          ...(plan.projection.suffix === undefined ? {} : { suffix: plan.projection.suffix })
        }, formal, lookups, numeric).korean;
      case "predicateNominalScope":
        return commitSharedPredicateNominalScopeProjection({
          kind: "predicateNominalScope",
          base: plan.projection.base,
          ...(plan.projection.suffix === undefined ? {} : { suffix: plan.projection.suffix })
        }, formal, lookups, numeric).korean;
      case "direct":
        return renderPlanText(plan.projection.base, formal, lookups, numeric);
    }
  })();
  return `${projection}${renderPlanText(plan.suffix, formal, lookups, numeric)}`;
}

function sharedRenderSourceFromPlan(plan: RenderPlan): {
  readonly descriptor: HeadTailCandidateTraceDescriptor | undefined;
  readonly sourceCandidate: HeadTailCandidate | undefined;
} {
  if (plan.kind === "headTailChain") {
    return {
      descriptor: plan.headTailCandidate,
      sourceCandidate: plan.headTailSourceCandidate
    };
  }
  if (plan.kind === "legacySurfaceComposition") {
    const suffix = wideScopeNegativeSurfaceSuffix(plan);
    if (isRenderPlan(suffix)) {
      const suffixSource = sharedRenderSourceFromPlan(suffix);
      if (suffixSource.descriptor !== undefined || suffixSource.sourceCandidate !== undefined) {
        return suffixSource;
      }
    }
    if (isRenderPlan(plan.prefix)) {
      return sharedRenderSourceFromPlan(plan.prefix);
    }
  }
  return { descriptor: undefined, sourceCandidate: undefined };
}

function sharedRenderFallbackHeadKind(plan: RenderPlan): string {
  switch (plan.kind) {
    case "headTailChain":
      if (plan.realization.kind === "nominal") {
        return plan.realization.root.kind === "predicateNominalHost" ? "predicate_nominalized" : "nominal";
      }
      return "predicate";
    case "lemma":
    case "predicateScope":
    case "predicateNominalScope":
      return "predicate";
    default:
      return "unknown";
  }
}

function realizeConjugatedLemma(plan: ConjugatedLemmaPlan, lookups: LookupTables): string {
  if (plan.adverbial !== undefined && (plan.auxTokens === undefined || plan.auxTokens.length === 0) && plan.voice !== "potential" && plan.voice !== "passive") {
    return `${plan.prefix ?? ""}${plan.adverbial}${plan.particle === undefined ? "" : selectParticle(plan.adverbial, plan.particle)}${plan.suffix ?? ""}`;
  }
  let base: string;
  if (plan.auxTokens !== undefined && plan.auxTokens.length > 0) {
    base = plan.voice === "potential"
      ? resolvePotentialChainConnective(plan.koreanLemma, asIrregular(plan.irregular), koreanPredicateAuxChain(plan.auxTokens), plan.ending, {}, lookups)
      : renderKoreanPredicateConnective(
        plan.koreanLemma,
        asIrregular(plan.irregular),
        plan.koreanPos,
        koreanPredicateAuxChain(plan.auxTokens),
        plan.ending,
        {
          lookups,
          ...(plan.jpDictForm === undefined || plan.jpDictForm === null ? {} : { jpDictForm: plan.jpDictForm }),
          ...(plan.verbConjType === undefined || plan.verbConjType === null ? {} : { verbConjType: plan.verbConjType }),
          forcePassive: plan.voice === "passive"
        }
      );
  } else if (plan.voice === "potential") {
    base = resolvePotentialChainConnective(plan.koreanLemma, asIrregular(plan.irregular), koreanPredicateAuxChain([]), plan.ending, {}, lookups);
  } else {
    base = conjugate(plan.koreanLemma, asIrregular(plan.irregular), plan.ending);
  }
  return `${plan.prefix ?? ""}${base}${plan.particle === undefined ? "" : selectParticle(base, plan.particle)}${plan.suffix ?? ""}`;
}

type ReplaceLemmaOptions = {
  koreanLemma: string;
  irregular: IrregularType | null;
  koreanPos?: number | null;
  dropFirstPassiveAux?: boolean;
  absorbedPassiveAux?: boolean;
  dropFirstCausativeAux?: boolean;
  dropFirstNegativeAux?: boolean;
};

function replacedStemDerivation(
  derivation: StemDerivation | undefined,
  incoming: StemDerivationHost,
  options: { readonly dropLongNegativeOp: boolean }
): { readonly stem: StemDerivationHost; readonly derivation?: StemDerivation } {
  if (derivation === undefined) {
    return { stem: incoming };
  }
  const rederived = rederiveStemDerivation(derivation, incoming, options);
  return rederived === null
    ? { stem: incoming }
    : { stem: rederived.stem, ...(rederived.derivation === undefined ? {} : { derivation: rederived.derivation }) };
}

function withReplacedStemDerivation<T extends { stemDerivation?: StemDerivation }>(
  plan: T,
  derivation: StemDerivation | undefined
): T {
  if (derivation !== undefined) {
    return { ...plan, stemDerivation: derivation };
  }
  const { stemDerivation: _dropped, ...rest } = plan;
  return rest as T;
}

function shouldDropLongNegativeOp(
  auxTokens: readonly RuntimeHaruToken[],
  options: ReplaceLemmaOptions
): boolean {
  return options.dropFirstNegativeAux === true && !auxTokens.some(isNegativeAuxToken);
}

export function replaceLemmaRenderPlan(
  plan: RenderPlan,
  options: ReplaceLemmaOptions
): RenderPlan | undefined {
  const koreanLemma = options.koreanLemma;
  const koreanPos = options.koreanPos ?? undefined;
  const stripOptions = {
    dropFirstPassiveAux: options.dropFirstPassiveAux ?? false,
    dropFirstCausativeAux: options.dropFirstCausativeAux ?? false,
    dropFirstNegativeAux: options.dropFirstNegativeAux ?? false
  };

  if (plan.kind === "fixedText" && plan.fusedFromLemma === true) {
    return { kind: "fixedText", text: koreanLemma, koreanPos: koreanPos ?? plan.koreanPos ?? null };
  }

  if (plan.kind === "lemma") {
    const planAuxTokens = auxTokensOf(plan);
    const auxTokens = rewriteAuxTokens(planAuxTokens, stripOptions);
    const derived = replacedStemDerivation(
      plan.stemDerivation,
      {
        koreanLemma,
        irregular: options.irregular,
        koreanPos: koreanPos ?? plan.koreanPos
      },
      { dropLongNegativeOp: shouldDropLongNegativeOp(planAuxTokens, options) }
    );
    return withReplacedStemDerivation<LemmaRealization>({
      ...plan,
      koreanLemma: derived.stem.koreanLemma,
      koreanPos: derived.stem.koreanPos,
      irregular: derived.stem.irregular,
      auxTokens,
      voice: "active"
    }, derived.derivation);
  }

  if (plan.kind === "copulaPredicate") {
    if (typeof plan.koreanLemma !== "string") {
      return plan;
    }
    const copulaAdj = resolveCopulaAdj(plan.entry ?? null, koreanLemma, koreanPos ?? 명사, options.irregular, plan.jpPos ?? null);
    return {
      ...plan,
      koreanLemma: copulaAdj[0],
      irregular: asIrregular(copulaAdj[2]) ?? null
    };
  }

  if (plan.kind === "particleizedLemma" && "koreanLemma" in plan && "koreanPos" in plan) {
    return {
      ...plan,
      koreanLemma,
      koreanPos: koreanPos ?? plan.koreanPos,
      irregular: options.irregular
    };
  }

  if (plan.kind === "attributive") {
    const planAuxTokens = auxTokensOf(plan);
    const [auxTokens, replacementToken] = rewriteAuxTokensWithReplacement(planAuxTokens, stripOptions);
    const derived = replacedStemDerivation(
      plan.stemDerivation,
      {
        koreanLemma,
        irregular: options.irregular,
        koreanPos: koreanPos ?? plan.koreanPos
      },
      { dropLongNegativeOp: shouldDropLongNegativeOp(planAuxTokens, options) }
    );
    const nominalEvidence = plan.nominalAttributiveEvidence === "teki_derivation"
      ? { nominalAttributiveEvidence: "teki_derivation" as const }
      : {};
    const { nominalAttributiveEvidence: _staleNominalEvidence, ...withoutNominalEvidence } = plan;
    return withReplacedStemDerivation<AttributiveRealization>({
      ...withoutNominalEvidence,
      ...nominalEvidence,
      koreanLemma: derived.stem.koreanLemma,
      koreanPos: derived.stem.koreanPos,
      irregular: derived.stem.irregular,
      auxTokens,
      contentToken: replacementToken ?? plan.contentToken,
      voice: "active"
    }, derived.derivation);
  }

  if (plan.kind === "conjugatedLemma" && "koreanLemma" in plan && "koreanPos" in plan && "ending" in plan) {
    const auxTokens = rewriteAuxTokens(plan.auxTokens ?? [], stripOptions);
    return {
      ...plan,
      koreanLemma,
      koreanPos: koreanPos ?? plan.koreanPos,
      irregular: options.irregular,
      auxTokens,
      voice: "active"
    };
  }

  if (plan.kind === "legacySurfaceComposition") {
    const rewritePrefix = shouldRewriteSurfacePrefixOnLemma(plan);
    const rewriteSuffix = shouldRewriteSurfaceSuffixOnLemma(plan);
    const prefix = rewritePrefix && isRenderPlan(plan.prefix)
      ? replaceLemmaRenderPlan(plan.prefix, options)
      : plan.prefix;
    if (prefix === undefined && rewritePrefix && isRenderPlan(plan.prefix)) {
      return undefined;
    }
    const suffix = rewriteSuffix && isRenderPlan(plan.suffix)
      ? replaceLemmaRenderPlan(plan.suffix, options)
      : plan.suffix;
    if (suffix === undefined && rewriteSuffix && isRenderPlan(plan.suffix)) {
      return undefined;
    }
    return {
      ...plan,
      ...(prefix === undefined ? {} : { prefix }),
      ...(suffix === undefined ? {} : { suffix })
    };
  }

  if (plan.kind === "predicateScope") {
    const base = replaceLemmaRenderPlan(plan.base, options);
    return base === undefined ? undefined : { ...plan, base };
  }

  if (plan.kind === "noda") {
    if (!isRenderPlan(plan.prefix)) {
      return undefined;
    }
    const prefix = replaceLemmaRenderPlan(plan.prefix, options);
    return prefix === undefined ? undefined : { ...plan, prefix };
  }

  if (plan.kind === "giveRequest") {
    const base = replaceLemmaRenderPlan(plan.base, options);
    return base === undefined ? undefined : { ...plan, base, koreanLemma };
  }

  if (plan.kind === "youdaModality") {
    return rewriteSimilePredicatePayloadLemma(plan, options, stripOptions);
  }

  if (plan.kind === "nominalConnectiveScope") {
    const payload = nominalConnectiveScopePayload(plan);
    const content = replaceLemmaRenderPlan(payload.content, options);
    return content === undefined ? undefined : { kind: "nominalConnectiveScope", payload: { ...payload, content } };
  }

  if (plan.kind === "nominalDemoAru") {
    const payload = nominalDemoAruPayload(plan);
    const content = replaceLemmaRenderPlan(payload.content, options);
    return content === undefined ? undefined : { kind: "nominalDemoAru", payload: { ...payload, content } };
  }

  if (plan.kind === "reasonBecause") {
    const payload = reasonBecausePayload(plan);
    return {
      kind: "reasonBecause",
      payload: {
        ...payload,
        koreanLemma,
        irregular: options.irregular,
        koreanPos: koreanPos ?? payload.koreanPos,
        voice: "active"
      }
    };
  }

  if (isWakeWrapperPlan(plan)) {
    const prefix = wakeWrapperPrefix(plan);
    if (!isRenderPlan(prefix)) {
      return undefined;
    }
    const rewrittenPrefix = replaceLemmaRenderPlan(prefix, options);
    return rewrittenPrefix === undefined ? undefined : withWakeWrapperPrefix(plan, rewrittenPrefix);
  }

  if (plan.kind === "headTailChain" && plan.realization.kind === "predicate") {
    const root = replaceTailRootStemLemma(plan.realization.root, options);
    return root === undefined
      ? undefined
      : { ...plan, realization: { ...plan.realization, root } };
  }

  return undefined;
}

export function renderPlanIsAttributiveModifier(plan: RenderPlan | string | null | undefined): boolean {
  if (plan === undefined || plan === null || typeof plan === "string") {
    return false;
  }
  if (plan.kind === "attributive") {
    return true;
  }
  return isPredicateHeadTailChainRenderPlan(plan) && tailRootClosesWithAttributiveTerminal(plan.realization.root);
}

export function renderPlanContainsAttributiveModifier(plan: RenderPlan | string | null | undefined): boolean {
  if (renderPlanIsAttributiveModifier(plan)) {
    return true;
  }
  if (plan !== undefined && plan !== null && typeof plan !== "string" && plan.kind === "legacySurfaceComposition") {
    return renderPlanContainsAttributiveModifier(plan.prefix) ||
      renderPlanContainsAttributiveModifier(plan.suffix);
  }
  return false;
}

export function attributiveModifierPlanSourceFacts(
  plan: RenderPlan | null | undefined
): {
  readonly headDictionaryForm: string | null;
  readonly sourcePast: boolean;
  readonly carriesNonTenseOperator: boolean;
} | null {
  if (plan === undefined || plan === null) {
    return null;
  }
  if (plan.kind === "attributive") {
    return {
      headDictionaryForm: plan.headNounToken?.dictionaryForm ?? null,
      sourcePast: plan.auxTokens.some((token) => (token.pos & POS4) === 助動詞_タ),
      carriesNonTenseOperator: (plan.voice !== undefined && plan.voice !== "active") ||
        plan.auxTokens.some((token) => (token.pos & POS4) !== 助動詞_タ)
    };
  }
  if (!isPredicateHeadTailChainRenderPlan(plan) || !tailRootClosesWithAttributiveTerminal(plan.realization.root)) {
    return null;
  }
  const layer = firstAuxLayer(plan.realization.root.tail);
  if (layer === null) {
    return null;
  }
  const payload = layer.terminalPayload;
  return {
    headDictionaryForm: payload?.kind === "attributiveBoundary" ? payload.head.dictionaryForm : null,
    sourcePast: layerFinalScopeCarriesSourcePast(layer),
    carriesNonTenseOperator: auxOpsInTailNode(plan.realization.root.tail).some((op) => op.kind !== "tense")
  };
}

export function renderPlanIsPredicateQuoteCarrierAttributive(plan: RenderPlan | null | undefined): plan is PredicateHeadTailChainRenderPlan {
  if (!isPredicateHeadTailChainRenderPlan(plan)) return false;
  const boundary = plan.clauseRole.outgoingBoundary;
  return tailRootHasPredicateQuoteAttributive(plan.realization.root) ||
    (boundary !== undefined && boundary.kind !== "terminal" &&
      boundary.connectiveKind === "cognitive_complement" && boundary.quoteBoundary !== undefined);
}

export function withQuotedKotoTopicContractionRenderPlan(
  plan: RenderPlan,
  options: { readonly enabled?: boolean } = {}
): RenderPlan | undefined {
  if (!renderPlanIsPredicateQuoteCarrierAttributive(plan)) {
    return undefined;
  }
  return {
    ...plan,
    realization: {
      ...plan.realization,
      quotedKotoTopicContraction: options.enabled ?? true
    }
  };
}

export function withCognitiveComplementTopicRenderPlan(plan: RenderPlan): RenderPlan | undefined {
  if (!isPredicateHeadTailChainRenderPlan(plan)) return undefined;
  const tail = mapTailCognitiveComplementTopic(plan.realization.root.tail);
  if (tail === undefined) return undefined;
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: { ...plan.realization.root, tail },
    },
  };
}

function mapTailCognitiveComplementTopic(node: TailRoot["tail"]): TailRoot["tail"] | undefined {
  if (node.kind === "connective") {
    const inner = mapAuxCognitiveComplementTopic(node.inner);
    if (inner !== undefined) return { ...node, inner };
    const outer = mapTailCognitiveComplementTopic(node.outer);
    return outer === undefined ? undefined : { ...node, outer };
  }
  return mapAuxCognitiveComplementTopic(node);
}

function mapAuxCognitiveComplementTopic(layer: AuxLayerNode): AuxLayerNode | undefined {
  const index = layer.ops.findIndex((op) => op.kind === "connective" && op.connective === "cognitive_complement");
  if (index < 0) return undefined;
  return {
    ...layer,
    ops: layer.ops.map((op, opIndex) => opIndex === index && op.kind === "connective"
      ? withCognitiveComplementTopicOp(op)
      : op),
  };
}

export function withCognitiveComplementTopicOp(
  op: Extract<AuxOpNode, { readonly kind: "connective" }>
): Extract<AuxOpNode, { readonly kind: "connective" }> {
  return { ...op, cognitiveComplementParticle: "topic" };
}

export function buildPredicateGerundProjectionConnective(): Extract<AuxOpNode, { readonly kind: "connective" }> {
  return createConnectiveOp({
    connective: "predicate_projection_tame_gerund",
    surface: "",
    source: { tokens: [], tokenIndices: [] }
  });
}

function tailRootHasPredicateQuoteAttributive(root: TailRoot): boolean {
  return tailNodeHasPredicateQuoteAttributive(root.tail);
}

function tailNodeHasPredicateQuoteAttributive(node: TailRoot["tail"]): boolean {
  if (node.kind === "auxLayer") {
    return node.ops.some((op) =>
      op.kind === "predicateQuoteCarrier" || (op.kind === "connective" && op.connective === "quotative")
    );
  }
  return node.connective === "quotative" ||
    tailNodeHasPredicateQuoteAttributive(node.inner) ||
    tailNodeHasPredicateQuoteAttributive(node.outer);
}

export function renderPlanHasKoreanLemma(plan: RenderPlan | null | undefined, koreanLemma: string): boolean {
  if (plan === null || plan === undefined) {
    return false;
  }
  switch (plan.kind) {
    case "lemma":
    case "attributive":
    case "particleizedLemma":
    case "conjugatedLemma":
      return "koreanLemma" in plan && plan.koreanLemma === koreanLemma;
    case "giveRequest":
      return plan.koreanLemma === koreanLemma || renderPlanHasKoreanLemma(plan.base, koreanLemma);
    case "predicateScope":
    case "predicateNominalScope":
      return renderPlanHasKoreanLemma(plan.base, koreanLemma);
    case "noda":
      return isRenderPlan(plan.content) && renderPlanHasKoreanLemma(plan.content, koreanLemma) ||
        isRenderPlan(plan.prefix) && renderPlanHasKoreanLemma(plan.prefix, koreanLemma);
    case "copulaPredicate":
      return plan.koreanLemma === koreanLemma ||
        (isRenderPlan(plan.base) && renderPlanHasKoreanLemma(plan.base, koreanLemma));
    case "quoteHostReportingPassive":
      return plan.lemma === koreanLemma;
    case "quoteCognitionHost":
      return koreanLemma === "알 수 있다";
    case "legacySurfaceComposition":
      return (isRenderPlan(plan.prefix) && renderPlanHasKoreanLemma(plan.prefix, koreanLemma)) ||
        (isRenderPlan(plan.suffix) && renderPlanHasKoreanLemma(plan.suffix, koreanLemma));
    case "semanticCarrierPredicate":
      return tailRootHasKoreanLemma(plan.root, koreanLemma);
    case "youdaModality": {
      const payload = youdaModalityPayload(plan);
      return payload.koreanLemma === koreanLemma || koreanLemma === "같다" || koreanLemma === "듯하다";
    }
    case "reasonBecause": {
      const payload = reasonBecausePayload(plan);
      return payload.koreanLemma === koreanLemma;
    }
    case "nominalConnectiveScope": {
      const payload = nominalConnectiveScopePayload(plan);
      return renderPlanHasKoreanLemma(payload.content, koreanLemma);
    }
    case "nominalDemoAru": {
      const payload = nominalDemoAruPayload(plan);
      return renderPlanHasKoreanLemma(payload.content, koreanLemma);
    }
    case "headTailChain":
      return plan.realization.kind === "predicate" && tailRootHasKoreanLemma(plan.realization.root, koreanLemma);
    default:
      if (isWakeWrapperPlan(plan)) {
        const prefix = wakeWrapperPrefix(plan);
        return isRenderPlan(prefix) && renderPlanHasKoreanLemma(prefix, koreanLemma);
      }
      return false;
  }
}

export function attachTeConnectiveBoundaryChoice(
  plan: RenderPlan | null | undefined,
  choice: TeConnectiveBoundaryChoice
): RenderPlan | undefined {
  if (plan === null || plan === undefined) {
    return undefined;
  }
  if (plan.kind === "lemma" || isPredicateHeadTailChainRenderPlan(plan)) {
    return { ...plan, teConnectiveBoundaryChoice: choice };
  }
  if (plan.kind === "legacySurfaceComposition") {
    if (shouldRewriteSurfaceSuffixOnConnective(plan) && isRenderPlan(plan.suffix)) {
      const suffix = attachTeConnectiveBoundaryChoice(plan.suffix, choice);
      if (suffix !== undefined) {
        return { ...plan, suffix };
      }
    }
    if (shouldRewriteSurfacePrefixOnConnective(plan) && isRenderPlan(plan.prefix)) {
      const prefix = attachTeConnectiveBoundaryChoice(plan.prefix, choice);
      if (prefix !== undefined) {
        return { ...plan, prefix };
      }
    }
    return undefined;
  }
  return undefined;
}

export function extractTeConnectiveBoundaryChoice(
  plan: RenderPlan | null | undefined
): TeConnectiveBoundaryChoice | null {
  if (plan === null || plan === undefined) {
    return null;
  }
  if (plan.kind === "lemma" || isPredicateHeadTailChainRenderPlan(plan)) {
    return plan.teConnectiveBoundaryChoice ?? null;
  }
  if (plan.kind === "legacySurfaceComposition") {
    if (shouldRewriteSurfaceSuffixOnConnective(plan) && isRenderPlan(plan.suffix)) {
      const suffix = extractTeConnectiveBoundaryChoice(plan.suffix);
      if (suffix !== null) {
        return suffix;
      }
    }
    if (shouldRewriteSurfacePrefixOnConnective(plan) && isRenderPlan(plan.prefix)) {
      return extractTeConnectiveBoundaryChoice(plan.prefix);
    }
    return null;
  }
  return null;
}

export function replaceConnectiveRenderPlan(
  plan: RenderPlan | null | undefined,
  options: { connective: string; teFormRole?: TeFormConnectiveRole }
): RenderPlan | undefined {
  if (plan === null || plan === undefined) {
    return undefined;
  }
  if (plan.kind === "lemma") {
    return { ...plan, connective: options.connective };
  }
  if (plan.kind === "attributive") {
    const auxTokens = plan.auxTokens.filter((token) => (token.pos & POS4) !== 助動詞_タ);
    return {
      kind: "conjugatedLemma",
      koreanLemma: plan.koreanLemma,
      irregular: plan.irregular,
      koreanPos: plan.koreanPos,
      auxTokens,
      ending: options.connective,
      voice: plan.voice ?? "active"
    };
  }
  if (plan.kind === "conjugatedLemma" && "koreanLemma" in plan && "koreanPos" in plan && "ending" in plan) {
    return { ...plan, ending: options.connective };
  }
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return replaceTailChainConnective(plan, options.connective, options.teFormRole);
  }
  if (plan.kind === "legacySurfaceComposition") {
    const rewriteSuffix = shouldRewriteSurfaceSuffixOnConnective(plan);
    if (rewriteSuffix && isRenderPlan(plan.suffix)) {
      const suffix = replaceConnectiveRenderPlan(plan.suffix, options);
      if (suffix !== undefined) {
        return { ...plan, suffix };
      }
    }
    const rewritePrefix = shouldRewriteSurfacePrefixOnConnective(plan);
    if (rewritePrefix && isRenderPlan(plan.prefix)) {
      const prefix = replaceConnectiveRenderPlan(plan.prefix, options);
      if (prefix !== undefined) {
        return { ...plan, prefix };
      }
    }
    return undefined;
  }
  if (plan.kind === "giveRequest") {
    const base = replaceConnectiveRenderPlan(plan.base, options);
    return base === undefined ? undefined : { ...plan, base };
  }
  if (plan.kind === "predicateScope") {
    const base = replaceConnectiveRenderPlan(plan.base, options);
    return base === undefined ? undefined : { ...plan, base };
  }
  if (isWakeWrapperPlan(plan)) {
    const prefix = wrapperPrefix(plan);
    if (!isRenderPlan(prefix)) {
      return undefined;
    }
    const rewrittenPrefix = replaceConnectiveRenderPlan(prefix, options);
    if (rewrittenPrefix === undefined) {
      return undefined;
    }
    if ("prefix" in plan) {
      return { ...plan, prefix: rewrittenPrefix };
    }
    if (!("payload" in plan)) {
      return undefined;
    }
    const payload = plan.payload as { readonly prefix: RenderPlan };
    return { ...plan, payload: { ...payload, prefix: rewrittenPrefix } } as RenderPlan;
  }
  return undefined;
}

export function setForcePassiveRenderPlan(plan: RenderPlan, forcePassive: boolean): RenderPlan | undefined {
  const voice = forcePassive ? "passive" : "active";
  if (plan.kind === "lemma") {
    return { ...plan, voice, forcePassive };
  }
  if (plan.kind === "attributive" || plan.kind === "conjugatedLemma") {
    return { ...plan, voice };
  }
  if (plan.kind === "particleizedLemma") {
    return plan;
  }
  if (plan.kind === "legacySurfaceComposition") {
    const rewritePrefix = shouldRewriteSurfacePrefixOnLemma(plan);
    const rewriteSuffix = shouldRewriteSurfaceSuffixOnLemma(plan);
    const prefix = rewritePrefix && isRenderPlan(plan.prefix)
      ? setForcePassiveRenderPlan(plan.prefix, forcePassive)
      : plan.prefix;
    if (prefix === undefined && rewritePrefix && isRenderPlan(plan.prefix)) {
      return undefined;
    }
    const suffix = rewriteSuffix && isRenderPlan(plan.suffix)
      ? setForcePassiveRenderPlan(plan.suffix, forcePassive)
      : plan.suffix;
    if (suffix === undefined && rewriteSuffix && isRenderPlan(plan.suffix)) {
      return undefined;
    }
    return {
      ...plan,
      ...(prefix === undefined ? {} : { prefix }),
      ...(suffix === undefined ? {} : { suffix })
    };
  }
  if (plan.kind === "giveRequest") {
    const base = setForcePassiveRenderPlan(plan.base, forcePassive);
    return base === undefined ? undefined : { ...plan, base };
  }
  if (plan.kind === "noda") {
    if (!isRenderPlan(plan.prefix)) {
      return undefined;
    }
    const prefix = setForcePassiveRenderPlan(plan.prefix, forcePassive);
    return prefix === undefined ? undefined : { ...plan, prefix };
  }
  if (plan.kind === "youdaModality") {
    const payload = youdaModalityPayload(plan);
    return { kind: "youdaModality", payload: { ...payload, voice } };
  }
  if (isWakeWrapperPlan(plan)) {
    const prefix = wakeWrapperPrefix(plan);
    if (!isRenderPlan(prefix)) {
      return undefined;
    }
    const rewrittenPrefix = setForcePassiveRenderPlan(prefix, forcePassive);
    return rewrittenPrefix === undefined ? undefined : withWakeWrapperPrefix(plan, rewrittenPrefix);
  }
  return undefined;
}

export function setAdversativePassiveRenderPlan(
  plan: RenderPlan | null | undefined,
  options: {
    readonly agentPromoted?: boolean;
    readonly baseLemma?: string;
    readonly baseIrregular?: IrregularType | null;
  } = {}
): RenderPlan | undefined {
  if (plan === null || plan === undefined) {
    return undefined;
  }
  if (plan.kind === "lemma") {
    return {
      ...plan,
      adversativePassive: true,
      adversativePassiveAgentPromoted: options.agentPromoted === true,
      ...(options.baseLemma === undefined
        ? {}
        : {
          adversativePassiveBaseLemma: options.baseLemma,
          adversativePassiveBaseIrregular: options.baseIrregular ?? null
        })
    };
  }
  if (plan.kind === "legacySurfaceComposition") {
    const rewritePrefix = shouldRewriteSurfacePrefixOnLemma(plan);
    const rewriteSuffix = shouldRewriteSurfaceSuffixOnLemma(plan);
    const prefix = rewritePrefix && isRenderPlan(plan.prefix)
      ? setAdversativePassiveRenderPlan(plan.prefix, options)
      : plan.prefix;
    if (prefix === undefined && rewritePrefix && isRenderPlan(plan.prefix)) {
      return undefined;
    }
    const suffix = rewriteSuffix && isRenderPlan(plan.suffix)
      ? setAdversativePassiveRenderPlan(plan.suffix, options)
      : plan.suffix;
    if (suffix === undefined && rewriteSuffix && isRenderPlan(plan.suffix)) {
      return undefined;
    }
    return {
      ...plan,
      ...(prefix === undefined ? {} : { prefix }),
      ...(suffix === undefined ? {} : { suffix })
    };
  }
  return undefined;
}

export function setPassiveClassRenderPlan(plan: RenderPlan | null | undefined, passiveClass: PassiveClass): RenderPlan | undefined {
  if (plan === null || plan === undefined) {
    return undefined;
  }
  if (plan.kind === "lemma" || plan.kind === "attributive") {
    return {
      ...plan,
      passiveClass
    };
  }
  if (plan.kind === "legacySurfaceComposition") {
    const rewritePrefix = shouldRewriteSurfacePrefixOnLemma(plan);
    const rewriteSuffix = shouldRewriteSurfaceSuffixOnLemma(plan);
    const prefix = rewritePrefix && isRenderPlan(plan.prefix)
      ? setPassiveClassRenderPlan(plan.prefix, passiveClass)
      : plan.prefix;
    if (prefix === undefined && rewritePrefix && isRenderPlan(plan.prefix)) {
      return undefined;
    }
    const suffix = rewriteSuffix && isRenderPlan(plan.suffix)
      ? setPassiveClassRenderPlan(plan.suffix, passiveClass)
      : plan.suffix;
    if (suffix === undefined && rewriteSuffix && isRenderPlan(plan.suffix)) {
      return undefined;
    }
    return {
      ...plan,
      ...(prefix === undefined ? {} : { prefix }),
      ...(suffix === undefined ? {} : { suffix })
    };
  }
  if (plan.kind === "predicateScope") {
    const base = setPassiveClassRenderPlan(plan.base, passiveClass);
    return base === undefined ? undefined : { ...plan, base };
  }
  if (plan.kind === "predicateNominalScope") {
    const base = setPassiveClassRenderPlan(plan.base, passiveClass);
    return base === undefined ? undefined : { ...plan, base };
  }
  if (plan.kind === "noda" && isRenderPlan(plan.prefix)) {
    const prefix = setPassiveClassRenderPlan(plan.prefix, passiveClass);
    return prefix === undefined ? undefined : { ...plan, prefix };
  }
  if (plan.kind === "youdaModality") {
    const payload = youdaModalityPayload(plan);
    return { kind: "youdaModality", payload: { ...payload, passiveClass } };
  }
  return undefined;
}

function realizeLemma(plan: LemmaRealization, formal: boolean, lookups: LookupTables, hostOptions?: RenderTraceOptions): string {
  const koreanLemma = plan.koreanLemma;
  const koreanPos = plan.koreanPos;
  const auxTokens = auxTokensOf(plan);
  const irregular = asIrregular(plan.irregular);
  const prefix = renderPlanText(plan.prefix, formal, lookups);
  const withSuffix = (text: string): string => `${prefix}${text}${plan.suffix ?? ""}`;
  const allomorphHost = hostOptions === undefined || (koreanPos !== 명사 && koreanPos !== 대명사)
    ? undefined
    : quantityUnitPhraseReading(hostOptions.precedingNumeralKorean, koreanLemma)
      ?? nonIdentityAllomorphHost(koreanLemma, allomorphReadingForRealizedText(
        koreanLemma,
        hostOptions.unit?.jpHead,
        { readUnitSymbol: false }
      ));
  if ((plan.negationChainDepth ?? 0) >= 2) {
    return withSuffix(realizeNegationChainLemma(plan, formal, lookups));
  }
  const connective = lemmaEffectiveConnective(plan);
  if (connective != null) {
    if (plan.voice === "potential") {
      return withSuffix(resolvePotentialChainConnective(koreanLemma, irregular, koreanPredicateAuxChain(auxTokens), connective, {}, lookups));
    }
    if (plan.adversativePassive === true) {
      return withSuffix(resolveAdversativePassiveChainConnective(koreanLemma, irregular, koreanPos, koreanPredicateAuxChain(auxTokens), connective, adversativePassiveOptions(plan), lookups));
    }
    if (koreanPos !== 동사 && koreanPos !== 형용사 && NOUN_CONNECTIVE_FALLBACKS.has(connective) && auxTokens.every(isNounCopulaChainAuxToken)) {
      const past = auxTokens.length > 0 ? extractFeatures(auxTokens, { lookups }).past : false;
      const nounConnective = nounCopulaConnective(koreanLemma, connective, past, allomorphHost);
      if (nounConnective !== koreanLemma) {
        return withSuffix(nounConnective);
      }
    }
    return withSuffix(renderKoreanPredicateConnective(koreanLemma, irregular, koreanPos, koreanPredicateAuxChain(auxTokens), connective, {
      lookups,
      ...(plan.jpDictForm === undefined || plan.jpDictForm === null ? {} : { jpDictForm: plan.jpDictForm }),
      ...(plan.verbConjType === undefined || plan.verbConjType === null ? {} : { verbConjType: plan.verbConjType }),
      ...(plan.sahenCompound === undefined ? {} : { sahenCompound: plan.sahenCompound }),
      ...(plan.sahenNoun === undefined || plan.sahenNoun === null ? {} : { sahenNoun: plan.sahenNoun }),
      ...(plan.passiveClass === undefined ? {} : { passiveClass: plan.passiveClass }),
      forcePassive: plan.voice === "passive",
      teIruResultative: lemmaTeIruResultative(plan),
      teIruContractToPast: plan.teIruContractToPast === true
    }));
  }
  if (plan.voice === "potential") {
    return withSuffix(resolvePotentialChain(koreanLemma, irregular, koreanPredicateAuxChain(auxTokens), {
      formal,
      ...(plan.sfp === undefined || plan.sfp === null ? {} : { sfp: plan.sfp })
    }, lookups).text);
  }
  if (plan.adversativePassive === true) {
    return withSuffix(resolveAdversativePassiveChain(koreanLemma, irregular, koreanPos, koreanPredicateAuxChain(auxTokens), {
      lookups,
      formal,
      ...(plan.sfp === undefined || plan.sfp === null ? {} : { sfp: plan.sfp }),
      ...adversativePassiveOptions(plan)
    }).text);
  }
  return withSuffix(renderKoreanPredicateTerminal(koreanLemma, irregular, koreanPos, koreanPredicateAuxChain(auxTokens), {
    lookups,
    formal,
    ...(allomorphHost === undefined ? {} : { allomorphHost }),
    ...(plan.sfp === undefined || plan.sfp === null ? {} : { sfp: plan.sfp }),
    ...(plan.jpDictForm === undefined || plan.jpDictForm === null ? {} : { jpDictForm: plan.jpDictForm }),
    ...(plan.verbConjType === undefined || plan.verbConjType === null ? {} : { verbConjType: plan.verbConjType }),
    ...(plan.isImperative === undefined ? {} : { isImperative: plan.isImperative }),
    ...(plan.sahenCompound === undefined ? {} : { sahenCompound: plan.sahenCompound }),
    ...(plan.sahenNoun === undefined || plan.sahenNoun === null ? {} : { sahenNoun: plan.sahenNoun }),
    ...(plan.passiveClass === undefined ? {} : { passiveClass: plan.passiveClass }),
    forcePassive: plan.voice === "passive",
    teIruResultative: lemmaTeIruResultative(plan),
    teIruContractToPast: plan.teIruContractToPast === true,
    ...lemmaKoreanPoliteOption(plan)
  }).text);
}

function lemmaKoreanPoliteOption(plan: LemmaRealization): { readonly koreanPolite?: KoreanPoliteForms } {
  if (plan.koreanPos !== 감탄사) {
    return {};
  }
  const koreanPolite = metadataKoreanPolite(plan.entry, plan.koreanLemma);
  return koreanPolite === undefined ? {} : { koreanPolite };
}

function isNounCopulaChainAuxToken(token: RuntimeHaruToken): boolean {
  return isAssertiveCopulaFamilyPos(token.pos) || isPoliteCopulaPos(token.pos) || isPastAuxiliaryPos(token.pos);
}

function lemmaTeIruResultative(plan: LemmaRealization): boolean {
  return metadataTeIruResultative(plan.entry, plan.koreanLemma);
}

function adversativePassiveOptions(plan: LemmaRealization): {
  readonly sahenCompound?: boolean;
  readonly sahenNoun?: string;
  readonly passiveClass?: PassiveClass;
  readonly agentPromoted?: boolean;
  readonly adversativePassiveBaseLemma?: string;
  readonly adversativePassiveBaseIrregular?: IrregularType | null;
} {
  return {
    ...(plan.sahenCompound === undefined ? {} : { sahenCompound: plan.sahenCompound }),
    ...(plan.sahenNoun === undefined || plan.sahenNoun === null ? {} : { sahenNoun: plan.sahenNoun }),
    ...(plan.passiveClass === undefined ? {} : { passiveClass: plan.passiveClass }),
    agentPromoted: plan.adversativePassiveAgentPromoted === true,
    ...(plan.adversativePassiveBaseLemma === undefined
      ? {}
      : {
        adversativePassiveBaseLemma: plan.adversativePassiveBaseLemma,
        adversativePassiveBaseIrregular: asIrregular(plan.adversativePassiveBaseIrregular)
      })
  };
}

function realizeNegationChainLemma(plan: LemmaRealization, formal: boolean, lookups: LookupTables): string {
  const stemAux: RuntimeHaruToken[] = [];
  const tailAux: RuntimeHaruToken[] = [];
  for (const token of plan.auxTokens) {
    const pos4 = token.pos & POS4;
    if (pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ) {
      continue;
    }
    if (pos4 === 助動詞_タイ) {
      stemAux.push(token);
    } else {
      tailAux.push(token);
    }
  }
  let stemJi: string;
  if (stemAux.length > 0) {
    stemJi = renderKoreanPredicateConnective(plan.koreanLemma, asIrregular(plan.irregular), plan.koreanPos, koreanPredicateAuxChain(stemAux), "지", { lookups });
  } else {
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(plan.koreanLemma, asIrregular(plan.irregular), lookups);
    stemJi = prefix.length === 0 && negLemma !== plan.koreanLemma
      ? conjugate(negLemma, negIrregular, "지")
      : conjugate(plan.koreanLemma, asIrregular(plan.irregular), "지");
  }
  const syntheticLemma = `${stemJi}${" 않지".repeat(Math.max(0, (plan.negationChainDepth ?? 0) - 1))} 않다`;
  if (plan.connective != null) {
    return renderKoreanPredicateConnective(syntheticLemma, null, 형용사, koreanPredicateAuxChain(tailAux), plan.connective, { lookups });
  }
  if (plan.sfp == null) {
    return renderKoreanPredicateTerminal(syntheticLemma, null, 형용사, koreanPredicateAuxChain(tailAux), { lookups, formal }).text;
  }
  return renderKoreanPredicateTerminal(syntheticLemma, null, 형용사, koreanPredicateAuxChain(tailAux), { lookups, formal, sfp: plan.sfp }).text;
}

function realizeAttributive(plan: AttributiveRealization, lookups: LookupTables): string {
  const koreanLemma = plan.koreanLemma;
  const koreanPos = plan.koreanPos;
  const prefix = plan.prefix ?? "";
  if (plan.tailLemmaMode === true) {
    return `${prefix}${resolveAttributiveForTail(koreanLemma, plan.irregular, auxTokensOf(plan), {
      preferIssdaPastDeon: true,
      headNounToken: plan.headNounToken ?? null,
      lookups
    })}`;
  }
  const resolved = resolveAttributive(koreanLemma, plan.irregular, koreanPos, auxTokensOf(plan), plan.contentToken, {
    lookups,
    headNounToken: plan.headNounToken ?? null,
    nominalization: plan.nominalization ?? false,
    sahenNoun: plan.sahenNoun ?? null,
    plainVerbEnding: plan.plainVerbEnding ?? null,
    forcePassive: plan.voice === "passive",
    ...(plan.passiveClass === undefined ? {} : { passiveClass: plan.passiveClass }),
    tameReasonHead: plan.tameReasonHead ?? false,
    tokoroResultHead: plan.tokoroResultHead ?? false,
    tokoroTemporalDeHead: plan.tokoroTemporalDeHead ?? false,
    koroTemporalNiHead: plan.koroTemporalNiHead ?? false,
    tokoroConcessiveDeHead: plan.tokoroConcessiveDeHead ?? false,
    teIruContractToPast: plan.teIruContractToPast ?? false,
    ...(plan.nominalAttributiveEvidence === undefined
      ? {}
      : { nominalAttributiveEvidence: plan.nominalAttributiveEvidence }),
    isPotential: plan.voice === "potential"
  });
  if (resolved !== null) {
    return `${prefix}${resolved}`;
  }
  throw new Error("AttributiveRenderPlan could not be realized");
}

function renderLemmaScopeConnective(base: LemmaRealization, ending: string, lookups: LookupTables): string {
  const teIruResultative = metadataTeIruResultative(base.entry, base.koreanLemma);
  return renderKoreanPredicateConnective(
    base.koreanLemma,
    asIrregular(base.irregular),
    base.koreanPos,
    koreanPredicateAuxChain(base.auxTokens),
    ending,
    {
      lookups,
      ...(base.jpDictForm === undefined || base.jpDictForm === null ? {} : { jpDictForm: base.jpDictForm }),
      ...(base.verbConjType === undefined || base.verbConjType === null ? {} : { verbConjType: base.verbConjType }),
      forcePassive: base.voice === "passive",
      ...(base.passiveClass === undefined ? {} : { passiveClass: base.passiveClass }),
      ...(base.sahenCompound === undefined ? {} : { sahenCompound: base.sahenCompound }),
      ...(base.sahenNoun === undefined || base.sahenNoun === null ? {} : { sahenNoun: base.sahenNoun }),
      teIruResultative,
      ...(base.teIruContractToPast === undefined ? {} : { teIruContractToPast: base.teIruContractToPast })
    }
  );
}

function realizePredicateScope(plan: PredicateScopePlan, formal: boolean, lookups: LookupTables, numeric: NumericTables): string {
  const base = plan.base;
  if (base.kind === "lemma") {
    if (base.voice === "potential") {
      return resolvePotentialChainConnective(base.koreanLemma, asIrregular(base.irregular), koreanPredicateAuxChain(base.auxTokens), plan.ending, {}, lookups);
    }
    return renderLemmaScopeConnective(base, plan.ending, lookups);
  }
  if (isPredicateHeadTailChainRenderPlan(base)) {
    if (plan.ending === "ㄹ/을") {
      return realizePredicateHeadTailAttributiveScope(base, formal, "future", lookups, numeric);
    }
    throw new Error(`PredicateScopePlan headTailChain ending '${plan.ending}' is not scope-renderable`);
  }
  if (base.kind === "legacySurfaceComposition") {
    return realizeSurfacePredicateScope(base, plan.ending, formal, lookups, numeric);
  }
  throw new Error("PredicateScopePlan base is not scope-renderable");
}

function realizePredicateNominalScope(plan: PredicateNominalScopePlan, formal: boolean, lookups: LookupTables, numeric: NumericTables): string {
  const base = plan.base;
  if (base.kind === "lemma") {
    const contentToken = syntheticPredicateScopeToken(base);
    const attr = resolveAttributive(
      base.koreanLemma,
      base.irregular,
      base.koreanPos,
      base.auxTokens,
      contentToken,
      {
        lookups,
        nominalization: true,
        ...(base.sahenNoun === undefined || base.sahenNoun === null ? {} : { sahenNoun: base.sahenNoun }),
        forcePassive: base.voice === "passive",
        ...(base.passiveClass === undefined ? {} : { passiveClass: base.passiveClass }),
        teIruContractToPast: base.teIruContractToPast ?? false,
        isPotential: base.voice === "potential"
      }
    );
    if (attr !== null) {
      return attr;
    }
    return renderLemmaScopeConnective(base, "ㄴ/는", lookups);
  }
  if (isPredicateHeadTailChainRenderPlan(base)) {
    return realizePredicateHeadTailAttributiveScope(base, formal, "present", lookups, numeric);
  }
  if (base.kind === "legacySurfaceComposition") {
    return realizeSurfacePredicateNominalScope(base, formal, lookups, numeric);
  }
  throw new Error("PredicateNominalScopePlan base is not scope-renderable");
}

function realizePredicateHeadTailAttributiveScope(
  plan: PredicateHeadTailChainRenderPlan,
  formal: boolean,
  projection: "present" | "future",
  lookups: LookupTables,
  numeric: NumericTables
): string {
  const nominalized = realizePredicateHeadTailIntrinsicNominalScope(plan, formal, lookups, numeric);
  if (nominalized !== null) {
    return nominalized;
  }
  const root = predicateHeadTailAttributiveRoot(plan, projection);
  if (root === null) {
    throw new Error("headTailChain predicate scope requires an aux-layer tail root");
  }
  const projectedPlan: PredicateHeadTailChainRenderPlan = {
    ...plan,
    realization: { ...plan.realization, root },
    clauseRole: { ...plan.clauseRole, outgoingBoundary: { kind: "terminal" } }
  };
  const rendered = commitSharedTailParserChain({
    plan: projectedPlan,
    formal,
    preferSourceCandidateRoot: false,
    lookups,
    numeric,
    realizeHostPlan: realizeHostRenderPlan
  });
  if ("ok" in rendered) {
    throw new Error(`headTailChain predicate scope render failed: ${rendered.reason}`);
  }
  return rendered.korean;
}

function realizePredicateHeadTailIntrinsicNominalScope(
  plan: PredicateHeadTailChainRenderPlan,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): string | null {
  if (plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const intrinsicNominal = plan.realization.root.tail.ops.some((op: AuxOpNode) =>
    op.kind === "connective" &&
    (op.connective === "question_content" || op.connective === "question_content_alternative")
  );
  if (!intrinsicNominal) {
    return null;
  }
  const rendered = commitSharedTailParserChain({
    plan,
    formal,
    preferSourceCandidateRoot: false,
    lookups,
    numeric,
    realizeHostPlan: realizeHostRenderPlan
  });
  if ("ok" in rendered) {
    throw new Error(`headTailChain predicate intrinsic nominal render failed: ${rendered.reason}`);
  }
  return rendered.korean;
}

function predicateHeadTailAttributiveRoot(
  plan: PredicateHeadTailChainRenderPlan,
  projection: "present" | "future"
): TailRoot | null {
  if (plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const layer = plan.realization.root.tail;
  const payload = projection === "future"
    ? predicateHeadTailFutureAttributivePayload(plan, layer)
    : undefined;
  return {
    ...plan.realization.root,
    sfp: null,
    tail: {
      ...layer,
      terminal: "attributive",
      ...(payload === undefined ? {} : { terminalPayload: payload })
    }
  };
}

function predicateHeadTailFutureAttributivePayload(
  plan: PredicateHeadTailChainRenderPlan,
  layer: AuxLayerNode
): AttributiveBoundaryPayload {
  const source = layer.stem.source;
  const fallbackToken = source.tokens[source.tokens.length - 1] ?? plan.realization.sourceTokens?.[plan.clauseRole.predicateTokenIdx];
  const fallbackTokenIdx = source.tokenIndices[source.tokenIndices.length - 1] ?? plan.clauseRole.predicateTokenIdx;
  if (fallbackToken === undefined) {
    throw new Error("headTailChain predicate scope requires source token metadata");
  }
  return {
    kind: "attributiveBoundary",
    source,
    head: {
      surface: fallbackToken.surface,
      dictionaryForm: fallbackToken.dictionaryForm,
      pos: fallbackToken.pos,
      tokenIdx: fallbackTokenIdx
    },
    headKind: "future_commitment",
    projectionContext: {
      tokens: plan.realization.sourceTokens ?? source.tokens,
      contentIdx: plan.clauseRole.predicateTokenIdx
    },
    projection: "ordinary_nominal"
  };
}

function realizeSurfacePredicateScope(
  plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>,
  ending: string,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): string {
  const suffix = wideScopeNegativeSurfaceSuffix(plan);
  if (shouldRewriteSurfaceSuffixOnConnective(plan) && isRenderPlan(suffix)) {
    return `${renderPlanText(plan.prefix, formal, lookups, numeric)}${plan.text ?? plan.korean ?? ""}${realizePredicateScope({ kind: "predicateScope", base: suffix, ending }, formal, lookups, numeric)}`;
  }
  if (shouldRewriteSurfacePrefixOnConnective(plan) && isRenderPlan(plan.prefix)) {
    return `${realizePredicateScope({ kind: "predicateScope", base: plan.prefix, ending }, formal, lookups, numeric)}${plan.text ?? plan.korean ?? ""}${renderPlanText(plan.suffix, formal, lookups, numeric)}`;
  }
  throw new Error("PredicateScopePlan legacySurfaceComposition base is not scope-renderable");
}

function realizeSurfacePredicateNominalScope(
  plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): string {
  const suffix = wideScopeNegativeSurfaceSuffix(plan);
  if (shouldRewriteSurfaceSuffixOnConnective(plan) && isRenderPlan(suffix)) {
    return `${renderPlanText(plan.prefix, formal, lookups, numeric)}${plan.text ?? plan.korean ?? ""}${realizePredicateNominalScope({ kind: "predicateNominalScope", base: suffix }, formal, lookups, numeric)}`;
  }
  if (shouldRewriteSurfacePrefixOnConnective(plan) && isRenderPlan(plan.prefix)) {
    return `${realizePredicateNominalScope({ kind: "predicateNominalScope", base: plan.prefix }, formal, lookups, numeric)}${plan.text ?? plan.korean ?? ""}${renderPlanText(plan.suffix, formal, lookups, numeric)}`;
  }
  throw new Error("PredicateNominalScopePlan legacySurfaceComposition base is not scope-renderable");
}

function syntheticPredicateScopeToken(plan: LemmaRealization): RuntimeHaruToken {
  const jpForm = plan.jpDictForm ?? "";
  const pos0 = plan.koreanPos === 형용사 ? 形容詞0 : 動詞;
  return {
    surface: jpForm,
    dictionaryForm: jpForm,
    reading: "",
    dictionaryFormReading: "",
    pos: pos0 | (plan.verbConjType ?? 0) | 連体形_一般,
    dictionaryId: -1
  };
}

function wideScopeNegativeSurfaceSuffix(plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>): RenderPlan | string | null | undefined {
  if (!isRenderPlan(plan.suffix)) {
    return plan.suffix;
  }
  return wideScopeNegativePredicate(plan.suffix, plan.prefixCarrierAuxiliaryLemma) ?? plan.suffix;
}

function wideScopeNegativePredicate(main: RenderPlan | undefined, auxiliaryLemma: string | null | undefined): RenderPlan | undefined {
  if (main?.kind !== "lemma") {
    return main;
  }
  if (!isWideScopeNegativeSurfaceCarrierAuxiliary(auxiliaryLemma)) {
    return main;
  }
  if (main.voice !== undefined && main.voice !== "active") {
    return main;
  }
  if (main.connective != null) {
    return main;
  }
  if (main.sfp != null) {
    return main;
  }
  if (main.teIruContractToPast === true) {
    return main;
  }
  if (main.auxTokens.some((aux) => (aux.pos & POS4) === 助動詞_レル)) {
    return main;
  }
  const [auxTokens, removedNegative] = stripFirstNegativeAux(main.auxTokens);
  if (!removedNegative) {
    return main;
  }
  const longNegative = longNegativeLemma(main.koreanLemma, asIrregular(main.irregular));
  if (longNegative === null) {
    return main;
  }
  return {
    ...main,
    koreanLemma: longNegative,
    irregular: null,
    koreanPos: 형용사,
    auxTokens
  };
}

function giveRequestTailText(kind: GiveRequestPlan["requestKind"]): string {
  switch (kind) {
    case "kudasai":
      return "주세요";
    case "chodai":
    case "kure":
      return "줘";
  }
}

function realizeGiveRequest(plan: GiveRequestPlan, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  return normalizeGiveRequest(
    realizeRenderPlanText(plan.base, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) }),
    plan.koreanLemma,
    giveRequestTailText(plan.requestKind)
  );
}

function realizeAffirmativeCopulaSurface(
  fields: {
    readonly base: RenderPlan;
    readonly auxTokens: readonly AuxToken[];
    readonly connective?: string | null;
    readonly pastConnective?: string | null;
    readonly politeConnective?: string | null;
    readonly politeFormalConnective?: string | null;
    readonly sfp?: string | null;
  },
  formal: boolean,
  lookups: LookupTables,
  numeric?: NumericTables,
  hostOptions?: RenderTraceOptions
): string {
  const base = realizeRenderPlanText(fields.base, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) });
  const allomorphHost = hostOptions === undefined
    ? undefined
    : quantityUnitPhraseReading(hostOptions.precedingNumeralKorean, base)
      ?? nonIdentityAllomorphHost(base, allomorphHostOfRenderedTarget(
        realizeRenderPlanWithTrace(fields.base, hostOptions),
        hostOptions
      ));
  const features = extractFeatures(fields.auxTokens, { lookups });
  if (fields.connective !== undefined && fields.connective !== null) {
    const politeConnective = features.polite
      ? (formal ? fields.politeFormalConnective : fields.politeConnective)
      : undefined;
    const connective = features.past && fields.pastConnective !== undefined && fields.pastConnective !== null
      ? fields.pastConnective
      : politeConnective !== undefined && politeConnective !== null
        ? politeConnective
        : fields.connective;
    return nounCopulaConnective(base, connective, features.past, allomorphHost);
  }
  if (features.conjecture) {
    return renderKoreanPredicateTerminal(
      base,
      null,
      명사,
      koreanPredicateAuxChain(fields.auxTokens),
      {
        formal,
        lookups,
        ...(fields.sfp === undefined || fields.sfp === null ? {} : { sfp: fields.sfp })
      }
    ).text;
  }
  features.copula = true;
  return nounCopula(base, features, formal, lookups, fields.sfp ?? undefined, allomorphHost).text;
}

function realizeQuoteHostReportingPassive(plan: QuoteHostReportingPassivePlan, formal: boolean): string {
  if (plan.resultativeState && plan.lemma === "알려지다") {
    return realizeKnownReportingState(plan, formal);
  }
  return realizeGenericReportingPassive(plan.lemma, plan, formal);
}

function realizeQuoteCognitionHost(plan: QuoteCognitionHostPlan): string {
  if (plan.host === "wakaru" && plan.mode === "attributive_potential") {
    return "알 수 있는";
  }
  throw new Error(`quoteCognitionHost plan could not be realized: ${plan.host}:${plan.mode}`);
}

function realizeQuoteHostReportingPassiveWithTrace(
  plan: QuoteHostReportingPassivePlan,
  options: RenderTraceOptions
): RenderedTarget {
  const expected = realizeRenderPlanText(plan, options);
  const parts = quoteHostReportingPassiveTeIruParts(plan, options.formal ?? false);
  const spans = quoteHostReportingPassiveTeIruSourceSpans(plan);
  if (parts === null || spans === null) {
    return atomicRenderedTarget(plan, options);
  }
  const segments: TargetSegment[] = [
    ...semanticRenderedTargetSegmentWithTrailingSpaceSplit(
      plan.kind,
      parts.stemText,
      spans.stemSpan ?? options.sourceSpan ?? null,
      "lexeme"
    ).segments,
    ...semanticRenderedTargetSegment(
      plan.kind,
      parts.tailText,
      spans.tailSpan ?? options.sourceSpan ?? null,
      "aux"
    ).segments
  ];
  const rendered = renderedTargetFromSegments(segments);
  return rendered.text === expected
    ? attachUnitToRenderedTarget(rendered, options.unit ?? null)
    : fallbackRenderedTarget(plan, options);
}

function quoteHostReportingPassiveTeIruParts(
  plan: QuoteHostReportingPassivePlan,
  formal: boolean
): { readonly stemText: string; readonly tailText: string } | null {
  if (!plan.hasTeIru) {
    return null;
  }
  const stemText = plan.resultativeState && plan.lemma === "알려지다"
    ? "알려져 "
    : `${conjugate(plan.lemma, null, "고")} `;
  let tailText: string;
  if (plan.negative) {
    tailText = formal ? "있지 않다" : "있지 않아";
  } else if (plan.past) {
    tailText = formal ? "있었다" : "있었어";
  } else {
    tailText = formal ? "있다" : "있어";
  }
  return { stemText, tailText };
}

function quoteHostReportingPassiveTeIruSourceSpans(plan: QuoteHostReportingPassivePlan): {
  readonly stemSpan: TargetSegment["sourceSpan"];
  readonly tailSpan: TargetSegment["sourceSpan"];
} | null {
  if (plan.stateStemTokens !== undefined && plan.stateAuxTokens !== undefined) {
    const stemSpan = sourceSpanForRuntimeTokens(plan.stateStemTokens);
    const tailSpan = sourceSpanForRuntimeTokens(plan.stateAuxTokens);
    if (stemSpan !== null && tailSpan !== null) {
      return { stemSpan, tailSpan };
    }
  }
  const root = plan.root;
  if (root === undefined) {
    return null;
  }
  if (root.tail.kind !== "auxLayer") {
    return null;
  }
  const aspectIndex = root.tail.ops.findIndex((op) => op.kind === "aspect" && op.aspect === "te_iru");
  if (aspectIndex < 0) {
    return null;
  }
  const aspectOp = root.tail.ops[aspectIndex];
  if (aspectOp === undefined || aspectOp.kind !== "aspect") {
    return null;
  }
  const beforeAspect = root.tail.ops.slice(0, aspectIndex);
  const aspectBridgeTokens = aspectOp.source.tokens.slice(0, 1);
  const aspectAuxTokens = aspectOp.source.tokens.slice(1);
  const stemSpan = combineSourceSpans(
    sourceSpanForRuntimeTokens(root.tail.stem.source.tokens),
    ...beforeAspect.map((op) => sourceSpanForRuntimeTokens(op.source.tokens)),
    sourceSpanForRuntimeTokens(aspectBridgeTokens)
  );
  const tailSpan = sourceSpanForRuntimeTokens(aspectAuxTokens) ??
    sourceSpanForRuntimeTokens(aspectOp.source.tokens);
  return { stemSpan, tailSpan };
}

function conjectureThoughtQuoteHostedRoot(
  plan: ConjectureThoughtQuotePlan,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): TailRoot {
  if (plan.hostProjection === undefined) {
    return plan.root;
  }
  return withProjectedHostBase(plan.root, plan.hostProjection, {
    formal,
    lookups,
    numeric,
    realizeHostPlan: realizeHostRenderPlan
  }) ?? plan.root;
}

function realizeConjectureThoughtQuote(
  plan: ConjectureThoughtQuotePlan,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): string {
  const committedRoot = commitTail(
    conjectureThoughtQuoteHostedRoot(plan, formal, lookups, numeric),
    { lookups, numeric }
  ).root;
  const layer = auxLayerFromThoughtQuoteRoot(committedRoot);
  const projected = projectConjectureThoughtQuoteAttributive(layer, lookups);
  if (projected !== null) {
    return `${projected} 거라고`;
  }
  const rendered = renderTail(committedRoot, { formal, lookups });
  if (rendered.ok) {
    return rendered.text;
  }
  throw new Error(`conjectureThoughtQuote plan could not be realized: ${rendered.reason}`);
}

function isConjectureThoughtQuoteCarrierOp(op: AuxOpNode): boolean {
  return op.kind === "conjecture" || (op.kind === "copula" && op.variant === "conjecture");
}

function projectConjectureThoughtQuoteAttributive(layer: AuxLayerNode, lookups: LookupTables): string | null {
  const body = projectConjectureThoughtQuoteAttributiveBody(layer, lookups);
  if (body === null || (layer.stem.kind !== "verb" && layer.stem.kind !== "adj")) {
    return body;
  }
  const prefix = layer.stem.koreanPrefix ?? "";
  const suffix = layer.stem.koreanSuffix ?? "";
  return `${prefix.length === 0 ? "" : `${prefix.replace(/\s+$/u, "")} `}${body}${suffix}`;
}

function projectConjectureThoughtQuoteAttributiveBody(layer: AuxLayerNode, lookups: LookupTables): string | null {
  const quoteIdx = layer.ops.findIndex((op) => op.kind === "connective" && op.connective === "quotative");
  if (quoteIdx < 0) {
    return null;
  }
  const beforeQuote = layer.ops.slice(0, quoteIdx);
  if (
    layer.stem.kind === "noun" &&
    beforeQuote.some((op) => op.kind === "copula" && op.variant === "conjecture")
  ) {
    return `${layer.stem.lemma}일`;
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return null;
  }
  const conjectureIdx = beforeQuote.findIndex((op) => op.kind === "conjecture");
  if (conjectureIdx < 0 || beforeQuote.slice(conjectureIdx + 1).length > 0) {
    return null;
  }
  let prefix = "";
  let lemma = layer.stem.lemma;
  let irregular = layer.stem.irregular;
  let past = false;
  let negative = false;
  for (const op of beforeQuote.slice(0, conjectureIdx)) {
    if (op.kind === "tense" && op.tense === "past") {
      past = true;
      continue;
    }
    if (op.kind === "negation" && op.chainDepth === 1 && !op.chainPast) {
      negative = true;
      continue;
    }
    if (op.kind === "copula" && op.polarity === "negative") {
      negative = true;
      continue;
    }
    if (op.kind === "voice" && op.voice === "passive") {
      [lemma, irregular] = resolvePassiveLemma(lemma, irregular, {
        lookups,
        ...(op.passiveClass === undefined ? {} : { passiveClass: op.passiveClass })
      });
      continue;
    }
    if (op.kind === "aspect" && op.aspect === "te_iru") {
      prefix += `${conjugate(lemma, irregular, "고")} `;
      lemma = "있다";
      irregular = null;
      continue;
    }
    return null;
  }
  if (negative) {
    return `${prefix}${conjugate(lemma, irregular, "지")} ${past ? "않았을" : "않을"}`;
  }
  if (past) {
    return `${prefix}${conjugate(`${conjugate(lemma, irregular, "았/었")}다`, null, "ㄹ/을")}`;
  }
  return `${prefix}${conjugate(lemma, irregular, "ㄹ/을")}`;
}

function auxLayerFromThoughtQuoteRoot(root: TailRoot): AuxLayerNode {
  return root.tail.kind === "auxLayer" ? root.tail : root.tail.inner;
}

function realizeKnownReportingState(plan: QuoteHostReportingPassivePlan, formal: boolean): string {
  if (plan.negative) {
    return formal ? "알려져 있지 않다" : "알려져 있지 않아";
  }
  if (plan.hasTeIru) {
    if (plan.past) {
      return formal ? "알려져 있었다" : "알려져 있었어";
    }
    return formal ? "알려져 있다" : "알려져 있어";
  }
  if (plan.past) {
    return formal ? "알려졌다" : "알려졌어";
  }
  return formal ? "알려진다" : "알려져";
}

function realizeGenericReportingPassive(
  lemma: QuoteHostReportingPassivePlan["lemma"],
  plan: QuoteHostReportingPassivePlan,
  formal: boolean
): string {
  if (plan.hasTeIru) {
    const stem = conjugate(lemma, null, "고");
    if (plan.negative) {
      return formal ? `${stem} 있지 않다` : `${stem} 있지 않아`;
    }
    if (plan.past) {
      return formal ? `${stem} 있었다` : `${stem} 있었어`;
    }
    return formal ? `${stem} 있다` : `${stem} 있어`;
  }
  if (plan.negative) {
    return formal ? `${conjugate(lemma, null, "지")} 않는다` : `${conjugate(lemma, null, "지")} 않아`;
  }
  if (plan.past) {
    return formal ? `${conjugate(lemma, null, "았/었")}다` : `${conjugate(lemma, null, "았/었")}어`;
  }
  return formal ? conjugate(lemma, null, "ㄴ다/는다") : conjugate(lemma, null, "아/어");
}

export function syntheticPoliteAuxToken(): RuntimeHaruToken {
  return {
    surface: "ます",
    dictionaryForm: "ます",
    reading: "マス",
    dictionaryFormReading: "マス",
    pos: 助動詞 | 助動詞_マス | 終止形_一般,
    dictionaryId: -1
  };
}

function syntheticPlainPastAuxToken(): RuntimeHaruToken {
  return {
    surface: "た",
    dictionaryForm: "た",
    reading: "タ",
    dictionaryFormReading: "タ",
    pos: 助動詞 | 助動詞_タ | 終止形_一般,
    dictionaryId: -1
  };
}

function realizeNoda(plan: NodaPlan, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  const prefix = plan.prefix !== undefined
    ? renderPlanText(plan.prefix, formal, lookups, numeric)
    : plan.content === undefined ? "" : realizeRenderPlanText(plan.content, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) });
  const copulaChain = koreanPredicateAuxChain(plan.copulaAux ?? []);
  if (plan.connective !== undefined && plan.connective !== null) {
    const features = extractFeatures(plan.copulaAux ?? [], { lookups });
    return `${prefix}${nounCopulaConnective(formal ? "것" : "거", plan.connective, features.past)}`;
  }
  return `${prefix}${nodaCopula(copulaChain, lookups, formal, plan.sfp ?? null).text}`;
}

function realizeCopulaPredicate(plan: CopulaPredicatePlan, formal: boolean, lookups: LookupTables, numeric?: NumericTables, hostOptions?: RenderTraceOptions): string {
  if (plan.polarity === "affirmative") {
    return realizeAffirmativeCopulaSurface(
      {
        base: plan.base ?? { kind: "fixedText", text: plan.koreanLemma ?? "", koreanPos: 명사 },
        auxTokens: plan.auxTokens ?? [],
        connective: plan.connective ?? null,
        pastConnective: plan.pastConnective ?? null,
        politeConnective: plan.politeConnective ?? null,
        politeFormalConnective: plan.politeFormalConnective ?? null,
        sfp: plan.sfp ?? null
      },
      formal,
      lookups,
      numeric,
      hostOptions
    );
  }
  if (plan.focusTailKind !== undefined && plan.focusTailKind !== null) {
    return renderCopulaNegationFocusContinuation(plan, formal, lookups, numeric);
  }
  if (plan.conjecture === true) {
    return renderCopulaNegationConjecture(plan, formal, lookups, numeric);
  }
  if (plan.connective !== undefined && plan.connective !== null) {
    return renderCopulaNegationConnective(plan, plan.connective, formal, lookups, numeric);
  }
  if (plan.modalKind === "kamo_shirenai") {
    return renderCopulaNegationKamoModal(plan, formal, lookups, numeric);
  }
  const sfpText = renderCopulaNegationSfp(plan, formal);
  if (sfpText !== null) {
    return sfpText;
  }
  const koreanLemma = plan.koreanLemma ?? (plan.base === undefined ? "" : realizeRenderPlanText(plan.base, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) }));
  return generateCopulaNegation(koreanLemma, {
    entry: plan.entry ?? null,
    irregular: asIrregular(plan.irregular ?? null),
    polite: plan.polite ?? false,
    past: plan.past ?? false,
    jpPos: plan.jpPos ?? null,
    formal,
    additiveMo: plan.additiveMo ?? false,
    conditionalNara: plan.conditionalNara ?? false
  });
}

function renderCopulaNegationConjecture(plan: CopulaPredicatePlan, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  const koreanLemma = plan.koreanLemma ?? (plan.base === undefined ? "" : realizeRenderPlanText(plan.base, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) }));
  const [lemma, koreanPos, irregular] = resolveCopulaAdj(
    plan.entry ?? null,
    koreanLemma,
    metadataKoreanPos(plan.entry ?? null, koreanLemma),
    null,
    plan.jpPos ?? null
  );
  const question = plan.conjectureQuestion === true;
  const polite = plan.polite === true;
  const past = plan.past === true;
  if (koreanPos === 동사 || koreanPos === 형용사) {
    const base = `${conjugate(lemma, asIrregular(irregular), "지")}${plan.additiveMo === true ? "도 " : " "}않`;
    if (plan.followKind === "contrastive") {
      return `${base}${past ? "았겠지만" : "겠지만"}`;
    }
    if (plan.followKind === "causal") {
      return `${base}${past ? "았겠으니까" : "겠으니까"}`;
    }
    if (plan.followKind === "conditional") {
      return `${base}${past ? "았겠다면" : "겠다면"}`;
    }
    if (question) {
      return `${base}${past ? (polite ? "았을까요" : "았을까") : (polite ? "을까요" : "을까")}?`;
    }
    if (past) {
      return `${base}았겠${polite ? "죠" : "지"}`;
    }
    if (polite) {
      return `${base}겠죠`;
    }
    return `${base}겠지`;
  }

  const head = `${lemma}${copulaSubjectParticle(lemma, plan.additiveMo)}`;
  if (plan.followKind === "contrastive") {
    return `${head}${past ? " 아니었겠지만" : " 아니겠지만"}`;
  }
  if (plan.followKind === "causal") {
    return `${head}${past ? " 아니었겠으니까" : " 아니겠으니까"}`;
  }
  if (plan.followKind === "conditional") {
    return `${head}${past ? " 아니었겠다면" : " 아니겠다면"}`;
  }
  if (question) {
    return `${head}${past ? (polite ? " 아니었을까요" : " 아니었을까") : (polite ? " 아닐까요" : " 아닐까")}?`;
  }
  if (past) {
    return `${head} 아니었겠${polite ? "죠" : "지"}`;
  }
  if (polite) {
    return `${head} 아니겠죠`;
  }
  return `${head} 아니겠지`;
}

function renderCopulaNegationFocusContinuation(plan: CopulaPredicatePlan, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  const koreanLemma = plan.koreanLemma ?? (plan.base === undefined ? "" : realizeRenderPlanText(plan.base, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) }));
  const [lemma, koreanPos, irregular] = resolveCopulaAdj(
    plan.entry ?? null,
    koreanLemma,
    metadataKoreanPos(plan.entry ?? null, koreanLemma),
    null,
    plan.jpPos ?? null
  );
  const base = koreanPos === 동사 || koreanPos === 형용사
    ? `${conjugate(lemma, asIrregular(irregular), "지")}${plan.additiveMo === true ? "도" : ""} 않`
    : `${lemma}${copulaSubjectParticle(lemma, plan.additiveMo)} 아니`;
  const focusSuffix = plan.focusParticle === "も"
    ? plan.focusTailKind === "positive" ? "기도" : "지도"
    : plan.focusTailKind === "positive" ? "기는" : "지는";
  const tailLemma = plan.focusTailKind === "positive" ? "하다" : "않다";
  const tailPos = plan.focusTailKind === "positive" ? 동사 : 형용사;
  const aux = [
    ...(plan.focusPast === true ? [syntheticPlainPastAuxToken()] : []),
    ...(plan.focusPolite === true ? [syntheticPoliteAuxToken()] : [])
  ];
  const tail = renderKoreanPredicateTerminal(tailLemma, null, tailPos, koreanPredicateAuxChain(aux), {
    lookups,
    formal
  }).text;
  return `${base}${focusSuffix} ${tail}`;
}

function renderCopulaNegationKamoModal(plan: CopulaPredicatePlan, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  const koreanLemma = plan.koreanLemma ?? (plan.base === undefined ? "" : realizeRenderPlanText(plan.base, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) }));
  const [lemma, koreanPos, irregular] = resolveCopulaAdj(
    plan.entry ?? null,
    koreanLemma,
    metadataKoreanPos(plan.entry ?? null, koreanLemma),
    null,
    plan.jpPos ?? null
  );
  const main = koreanPos === 동사 || koreanPos === 형용사
    ? `${conjugate(lemma, asIrregular(irregular), "지")}${plan.additiveMo === true ? "도" : ""} ${plan.past === true ? "않았을지도" : "않을지도"}`
    : `${lemma}${copulaSubjectParticle(lemma, plan.additiveMo)} ${plan.past === true ? "아니었을지도" : "아닐지도"}`;
  if (plan.followKind === "contrastive") {
    return `${main} 모르지만`;
  }
  if (plan.followKind === "causal") {
    return `${main} 모르니까`;
  }
  if (plan.followKind === "conditional") {
    return `${main} 모른다면`;
  }
  return `${main} ${renderKamoShirenaiTail(plan.modalPolite === true, plan.modalPast === true, formal)}`;
}

function realizeParticleizedLemma(plan: ParticleizedLemmaPlan): string {
  const particle = selectParticle(plan.koreanLemma, plan.particle, plan.register === undefined ? {} : { register: plan.register });
  const contracted = particle === "가"
    ? PRONOUN_SUBJECT_CONTRACTIONS[plan.koreanLemma] ?? PRONOUN_POSSESSIVE_CONTRACTIONS[plan.koreanLemma]
    : undefined;
  return `${contracted ?? plan.koreanLemma}${particle}${plan.suffix ?? ""}`;
}

function renderCopulaNegationConnective(plan: CopulaPredicatePlan, ending: string, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  const koreanLemma = plan.koreanLemma ?? (plan.base === undefined ? "" : realizeRenderPlanText(plan.base, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) }));
  const [lemma, koreanPos, irregular] = resolveCopulaAdj(
    plan.entry ?? null,
    koreanLemma,
    metadataKoreanPos(plan.entry ?? null, koreanLemma),
    null,
    plan.jpPos ?? null
  );
  if (koreanPos === 동사 || koreanPos === 형용사) {
    const stem = `${conjugate(lemma, asIrregular(irregular), "지")}${plan.additiveMo === true ? "도" : ""}`;
    if (ending === "아니라") {
      return `${stem} 않고`;
    }
    const negStem = `${stem} 않`;
    const negLemma = `${negStem}다`;
    if (plan.past === true) {
      return applyEndingToPastStem(conjugate(negLemma, null, "았/었"), ending);
    }
    return conjugate(negLemma, null, ending);
  }

  const particle = copulaSubjectParticle(koreanLemma, plan.additiveMo);
  if (ending === "아니라") {
    return `${koreanLemma}${particle} 아니라`;
  }
  if (plan.past === true) {
    return applyEndingToPastStem(`${koreanLemma}${particle} 아니었`, ending);
  }
  return `${koreanLemma}${particle} ${conjugate("아니다", "아니", ending)}`;
}

function renderCopulaNegationSfp(plan: CopulaPredicatePlan, formal: boolean): string | null {
  const sfp = plan.sfp ?? null;
  if (sfp === null || sfp === "sfp_yo") {
    return null;
  }
  const koreanLemma = plan.koreanLemma ?? "";
  const particle = copulaSubjectParticle(koreanLemma, plan.additiveMo);
  if (sfp === "plain_q") {
    if (!formal) {
      return null;
    }
    if (plan.past === true) {
      return `${koreanLemma}${particle} 아니었는가`;
    }
    return `${koreanLemma}${particle} 아닌가`;
  }
  if (sfp === "polite_q") {
    if (plan.past === true) {
      const stem = `${koreanLemma}${particle} 아니었`;
      if (plan.polite === true) {
        return `${stem}${formal ? "습니까" : "어요"}`;
      }
      return `${stem}${formal ? "는가" : "어"}`;
    }
    if (plan.polite === true) {
      return `${koreanLemma}${particle}${formal ? " 아닙니까" : " 아니에요"}`;
    }
    return `${koreanLemma}${particle}${formal ? " 아닌가" : " 아니야"}`;
  }
  if (sfp === "ne" || sfp === "na_excl") {
    if (plan.past === true) {
      const stem = `${koreanLemma}${particle} 아니었`;
      if (sfp === "ne") {
        return `${stem}${plan.polite === true ? "네요" : "네"}`;
      }
      return `${stem}${plan.polite === true ? "군요" : "구나"}`;
    }
    if (sfp === "ne") {
      return `${koreanLemma}${particle}${plan.polite === true ? " 아니네요" : " 아니네"}`;
    }
    return `${koreanLemma}${particle}${plan.polite === true ? " 아니군요" : " 아니구나"}`;
  }
  return null;
}

function requireRenderPlan(value: RenderPlan | string | undefined, kind: string): RenderPlan {
  if (value === undefined || typeof value === "string") {
    throw new Error(`${kind} requires a render-plan prefix`);
  }
  return value;
}

function tailRootHasKoreanLemma(root: TailRoot, koreanLemma: string): boolean {
  return tailNodeHasKoreanLemma(root.tail, koreanLemma);
}

function tailNodeHasKoreanLemma(node: TailRoot["tail"], koreanLemma: string): boolean {
  if (node.kind === "auxLayer") {
    return auxLayerHasKoreanLemma(node, koreanLemma);
  }
  return auxLayerHasKoreanLemma(node.inner, koreanLemma) || tailNodeHasKoreanLemma(node.outer, koreanLemma);
}

function auxLayerHasKoreanLemma(node: AuxLayerNode, koreanLemma: string): boolean {
  const stem = node.stem;
  if (stem.kind === "candidateSet") {
    return stem.candidates.some((candidate) => candidate.lemma === koreanLemma);
  }
  return stem.lemma === koreanLemma;
}

function predicatePayloadBase(plan: SimilePredicatePayload): SimilePredicatePayload {
  return {
    entry: plan.entry ?? null,
    koreanLemma: plan.koreanLemma,
    irregular: plan.irregular,
    koreanPos: plan.koreanPos,
    auxTokens: plan.auxTokens,
    contentToken: plan.contentToken,
    voice: plan.voice ?? "active",
    verbConjType: plan.verbConjType ?? null,
    jpDictForm: plan.jpDictForm ?? null,
    ...(plan.passiveClass === undefined ? {} : { passiveClass: plan.passiveClass }),
    sahenCompound: plan.sahenCompound ?? false,
    sahenNoun: plan.sahenNoun ?? null,
  };
}

function youdaModalityPayload(plan: YoudaModalityPlan): YoudaModalityPayload {
  if ("payload" in plan) {
    return plan.payload;
  }
  return {
    ...predicatePayloadBase(plan),
    mode: plan.mode,
    modalAux: plan.modalAux,
    connective: plan.connective ?? null,
    sfp: plan.sfp ?? null
  };
}

function reasonBecausePayload(plan: ReasonBecausePlan): ReasonBecausePayload {
  if ("payload" in plan) {
    return plan.payload;
  }
  return {
    entry: plan.entry ?? null,
    koreanLemma: plan.koreanLemma,
    irregular: plan.irregular,
    auxTokens: plan.auxTokens,
    koreanPos: plan.koreanPos,
    projection: plan.projection ?? "adverbial",
    voice: plan.voice ?? "active",
    verbConjType: plan.verbConjType ?? null,
    jpDictForm: plan.jpDictForm ?? null,
    sahenCompound: plan.sahenCompound ?? false,
    sahenNoun: plan.sahenNoun ?? null,
    ...(plan.negative === undefined ? {} : { negative: plan.negative }),
    ...(plan.past === undefined ? {} : { past: plan.past }),
    ...(plan.polarityTransition === undefined ? {} : { polarityTransition: plan.polarityTransition }),
    ...(plan.predicateRoot === undefined ? {} : { predicateRoot: plan.predicateRoot }),
    ...(plan.predicateHostProjection === undefined ? {} : { predicateHostProjection: plan.predicateHostProjection }),
    ...(plan.passiveClass === undefined ? {} : { passiveClass: plan.passiveClass })
  };
}

function nominalConnectiveScopePayload(plan: NominalConnectiveScopePlan): NominalConnectiveScopePayload {
  if ("payload" in plan) {
    return plan.payload;
  }
  return {
    content: plan.content,
    connectiveKind: plan.connectiveKind,
    koreanPos: plan.koreanPos ?? null
  };
}

function nominalDemoAruPayload(plan: NominalDemoAruPlan): NominalDemoAruPayload {
  if ("payload" in plan) {
    return plan.payload;
  }
  return {
    content: plan.content,
    auxTokens: plan.auxTokens,
    mode: plan.mode,
    connective: plan.connective ?? null,
    koreanPos: plan.koreanPos ?? null
  };
}

function compoundNominalSuffixPayload(plan: CompoundNominalSuffixPlan): CompoundNominalSuffixPayload {
  return plan.payload;
}

function wakeExplanationPayload(plan: WakeExplanationPlan): WakeExplanationPayload {
  if ("payload" in plan) {
    return plan.payload;
  }
  return {
    prefix: requireRenderPlan(plan.prefix, plan.kind),
    headKind: plan.headKind,
    tailKind: plan.tailKind,
    auxTokens: plan.auxTokens ?? [],
    connectiveEnding: plan.connectiveEnding ?? null
  };
}

function rewriteSimilePredicatePayloadLemma(
  plan: YoudaModalityPlan,
  options: ReplaceLemmaOptions,
  stripOptions: { dropFirstPassiveAux: boolean; dropFirstCausativeAux: boolean; dropFirstNegativeAux: boolean }
): RenderPlan {
  const payload = youdaModalityPayload(plan);
  const [auxTokens, replacementToken] = rewriteAuxTokensWithReplacement(payload.auxTokens, stripOptions);
  const rewrittenPayload = {
    ...payload,
    koreanLemma: options.koreanLemma,
    irregular: options.irregular,
    koreanPos: options.koreanPos || payload.koreanPos,
    auxTokens,
    contentToken: replacementToken ?? payload.contentToken,
    voice: "active" as const
  };
  return { kind: plan.kind, payload: rewrittenPayload } as RenderPlan;
}

function realizeNamedRenderPlan(plan: RenderPlan, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  if (plan.kind === "legacySurfaceComposition") {
    return `${renderPlanText(plan.prefix, formal, lookups, numeric)}${plan.text ?? plan.korean ?? ""}${renderPlanText(wideScopeNegativeSurfaceSuffix(plan), formal, lookups, numeric)}`;
  }
  if (plan.kind === "semanticCarrierPredicate") {
    return realizeSemanticCarrierPredicatePlan(plan, formal, lookups, requireNumericTables(numeric, "semantic carrier predicate render plan"));
  }
  if (plan.kind === "youdaModality") {
    return renderYoudaModalityPlan(youdaModalityPayload(plan), formal, lookups);
  }
  if (plan.kind === "reasonBecause") {
    return renderReasonBecause(reasonBecausePayload(plan), formal, lookups, numeric);
  }
  if (plan.kind === "nominalConnectiveScope") {
    return renderNominalConnectiveScope(nominalConnectiveScopePayload(plan), formal, lookups, numeric);
  }
  if (plan.kind === "nominalDemoAru") {
    return renderNominalDemoAru(nominalDemoAruPayload(plan), formal, lookups, numeric);
  }
  if (plan.kind === "compoundNominalSuffix") {
    return renderCompoundNominalSuffix(compoundNominalSuffixPayload(plan), formal, lookups);
  }
  if (plan.kind === "wakeExplanation") {
    return realizeWakeExplanation(plan, formal, lookups, numeric);
  }
  if ("korean" in plan && typeof plan.korean === "string") {
    return plan.korean;
  }
  if ("content" in plan && isRenderPlan(plan.content)) {
    return realizeRenderPlanText(plan.content, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) });
  }
  return "";
}

function renderYoudaModalityPlan(payload: YoudaModalityPayload, formal: boolean, lookups: LookupTables): string {
  const attr = renderNodaPayloadAttributive(payload, lookups);
  if (payload.mode === "attributive") {
    return `${attr} ${realizeRenderPlanText({
      kind: "attributive",
      koreanLemma: "듯하다",
      irregular: null,
      koreanPos: 형용사,
      auxTokens: payload.modalAux,
      contentToken: syntheticPredicateToken("듯하다", 形容詞0, 連体形_一般)
    }, { formal, lookups })}`;
  }
  const suffix: LemmaRealization = {
    kind: "lemma",
    entry: null,
    koreanLemma: "같다",
    koreanPos: 형용사,
    irregular: null,
    auxTokens: payload.modalAux,
    connective: payload.connective ?? null,
    sfp: payload.sfp ?? null
  };
  return `${attr} 것 ${realizeRenderPlanText(suffix, { formal, lookups })}`;
}

function renderNodaPayloadAttributive(payload: SimilePredicatePayload, lookups: LookupTables): string {
  return nodaAttributive(payload.koreanLemma, payload.irregular, payload.koreanPos, payload.auxTokens, payload.contentToken, {
    lookups,
    verbConjType: payload.verbConjType ?? null,
    jpDictForm: payload.jpDictForm ?? null,
    forcePassive: payload.voice === "passive",
    ...(payload.passiveClass === undefined ? {} : { passiveClass: payload.passiveClass }),
    isPotential: payload.voice === "potential",
    ...(payload.sahenCompound === undefined ? {} : { sahenCompound: payload.sahenCompound }),
    ...(payload.sahenNoun === undefined || payload.sahenNoun === null ? {} : { sahenNoun: payload.sahenNoun })
  });
}

function syntheticPredicateToken(lemma: string, pos0: number, form: number): RuntimeHaruToken {
  return {
    surface: lemma,
    dictionaryForm: lemma,
    reading: "",
    dictionaryFormReading: "",
    pos: pos0 | form,
    dictionaryId: -1
  };
}

function renderNominalConnectiveScope(payload: NominalConnectiveScopePayload, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  const content = renderPlanText(payload.content, formal, lookups, numeric);
  switch (payload.connectiveKind) {
    case "not_limited_to":
      return `${content}뿐만 아니라`;
    case "contrast_topic":
      return `${content}이기는 하지만`;
    case "parallel_appositive":
      return `${content}이자`;
    case "concession":
      return `${content}에도 불구하고`;
  }
}

function renderNominalDemoAru(payload: NominalDemoAruPayload, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  const content = renderPlanText(payload.content, formal, lookups, numeric);
  const prefix = `${content}${nominalDemoAruAdditiveMarker(payload.content)} `;
  if (payload.mode === "attributive") {
    const features = payload.auxTokens.length > 0 ? extractFeatures(payload.auxTokens, { lookups }) : null;
    return `${prefix}${features?.past === true ? "했던" : "한"}`;
  }
  if (payload.mode === "renyou") {
    return `${prefix}하고`;
  }
  if (payload.mode === "connective") {
    return `${prefix}${renderKoreanPredicateConnective("하다", "여", 동사, koreanPredicateAuxChain(payload.auxTokens), payload.connective ?? "고", { lookups })}`;
  }
  if (payload.auxTokens.length === 0) {
    return `${prefix}${formal ? "하다" : "해"}`;
  }
  const tail = renderKoreanPredicateTerminal("하다", "여", 동사, koreanPredicateAuxChain(payload.auxTokens), { formal, lookups }).text;
  return `${prefix}${tail}`;
}

function nominalDemoAruAdditiveMarker(content: RenderPlan): "도" | "이기도" {
  return content.kind === "conjugatedLemma" && "ending" in content && content.ending === "기"
    ? "도"
    : "이기도";
}

function renderCompoundNominalSuffix(payload: CompoundNominalSuffixPayload, formal: boolean, lookups: LookupTables): string {
  switch (payload.kind) {
    case "no_dewa_nai":
      return renderCompoundNoDewaNaiSuffix({ ...payload, formal }, lookups);
    case "no_copula_chain":
      return renderCompoundNoCopulaChainSuffix(payload.chainKind, {
        past: payload.past,
        polite: payload.polite,
        question: payload.question,
        formal
      });
    case "kamo_modal":
      return payload.modalKind === "conjecture"
        ? renderCompoundConjectureKamoModal("", {
          modalPolite: payload.modalPolite,
          modalPast: payload.modalPast,
          formal
        })
        : renderCompoundEmphasisKamoModal("", {
          kind: payload.emphasisKind ?? "emphasis",
          emphasisPast: payload.emphasisPast === true,
          modalPolite: payload.modalPolite,
          modalPast: payload.modalPast,
          formal
        });
    case "kamo_shirenai":
      return ` 것일지도 ${renderKamoShirenaiTail(payload.modalPolite, payload.modalPast, formal)}`;
    case "noda_sfp":
      return ` ${realizeRenderPlanText({
        kind: "noda",
        copulaAux: [],
        sfp: formal ? payload.formalSfp ?? null : payload.casualSfp ?? null
      }, { formal, lookups })}`;
  }
}

function renderCompoundNoDewaNaiSuffix(options: {
  readonly polite: boolean;
  readonly past: boolean;
  readonly connective: boolean;
  readonly additiveMo: boolean;
  readonly conditionalNara: boolean;
  readonly question?: boolean;
  readonly auxTokens?: readonly AuxToken[];
  readonly modalKind?: "kamo_shirenai" | null;
  readonly modalPolite?: boolean;
  readonly modalPast?: boolean;
  readonly followKind?: "conditional" | "contrastive" | "causal" | "reason" | "listing" | "quotative" | null;
  readonly casualNounHead?: "geo" | "ge" | null;
  readonly confirm?: boolean;
  readonly confirmRoleCatNyaCount?: number;
  readonly sfp?: string | null;
  readonly connectiveEnding?: string | null;
  readonly formal: boolean;
}, lookups: LookupTables): string {
  if (options.confirm === true) {
    if (options.formal) {
      return " 게 아닙니까";
    }
    return ` 거잖아${roleCatNyaSuffix(options.confirmRoleCatNyaCount ?? 0)}`;
  }
  if (options.sfp !== undefined && options.sfp !== null) {
    const needsFullNounHead = roleCatNyaCount(options.sfp) > 0;
    const nounHead = options.formal
      ? "것이"
      : needsFullNounHead ? "것이" : options.casualNounHead === "ge" ? "게" : "거";
    const negResult = renderKoreanPredicateTerminal("아니다", "아니", 형용사, koreanPredicateAuxChain(options.auxTokens ?? []), {
      lookups,
      formal: options.formal,
      sfp: options.sfp
    });
    return ` ${nounHead} ${negResult.text}`;
  }
  if (options.connectiveEnding !== undefined && options.connectiveEnding !== null) {
    const nounHead = options.formal ? "것이" : options.casualNounHead === "ge" ? "게" : "거";
    const negTail = renderKoreanPredicateConnective("아니다", "아니", 형용사, koreanPredicateAuxChain(options.auxTokens ?? []), options.connectiveEnding, { lookups });
    return ` ${nounHead} ${negTail}`;
  }
  const auxFeatures = options.auxTokens !== undefined && options.auxTokens.length > 0
    ? extractFeatures(options.auxTokens, { lookups })
    : null;
  if (options.modalKind === "kamo_shirenai") {
    const nounHead = options.additiveMo
      ? "것도"
      : options.formal ? "것이" : "거";
    const negative = options.past ? "아니었을지도" : "아닐지도";
    if (options.followKind === "contrastive") {
      return ` ${nounHead} ${negative} 모르지만`;
    }
    if (options.followKind === "causal") {
      return ` ${nounHead} ${negative} 모르니까`;
    }
    if (options.followKind === "conditional") {
      return ` ${nounHead} ${negative} 모른다면`;
    }
    return ` ${nounHead} ${negative} ${renderKamoShirenaiTail(options.modalPolite === true, options.modalPast === true, options.formal)}`;
  }
  if (auxFeatures?.conjecture === true) {
    const nounHead = options.additiveMo
      ? "것도"
      : options.formal ? "것이" : "거";
    if (options.question === true) {
      return ` ${nounHead} ${options.past ? "아니었을까요" : "아닐까요"}`;
    }
    if (options.followKind === "contrastive") {
      return ` ${nounHead} ${options.past ? "아니었겠지만" : "아니겠지만"}`;
    }
    if (options.followKind === "causal") {
      return ` ${nounHead} ${options.past ? "아니었겠으니까" : "아니겠으니까"}`;
    }
    if (options.followKind === "conditional" || options.conditionalNara) {
      return ` ${nounHead} ${options.past ? "아니었겠다면" : "아니겠다면"}`;
    }
    const politeSuffix = auxFeatures.polite ? "죠" : "지";
    return ` ${nounHead} ${options.past ? "아니었겠" : "아니겠"}${politeSuffix}`;
  }
  if (options.conditionalNara) {
    if (options.additiveMo) {
      return options.past ? " 것도 아니었다면" : " 것도 아니라면";
    }
    if (options.formal) {
      return options.past ? " 것이 아니었다면" : " 것이 아니라면";
    }
    return options.past ? " 거 아니었다면" : " 거 아니라면";
  }
  if (options.connective) {
    if (options.additiveMo) {
      return " 것도 아니고";
    }
    return options.formal ? " 것이 아니고" : " 거 아니고";
  }
  const nounHeadForFollow = (): string => {
    if (options.additiveMo) {
      return "것도";
    }
    if (options.formal) {
      return "것이";
    }
    return options.casualNounHead === "ge" ? "게" : "거";
  };
  if (options.followKind === "reason") {
    return ` ${nounHeadForFollow()} ${options.past ? "아니었어서" : "아니라서"}`;
  }
  if (options.followKind === "listing") {
    return ` ${nounHeadForFollow()} ${options.past ? "아니었고" : "아니고"}`;
  }
  if (options.followKind === "quotative") {
    return ` ${nounHeadForFollow()} ${options.past ? "아니었다고" : "아니라고"}`;
  }
  if (options.followKind === "contrastive") {
    const nounHead = nounHeadForFollow();
    let stem = options.past ? "아니었지만" : "아니지만";
    if (options.polite && !options.formal && options.casualNounHead !== "ge") {
      stem += "요";
    }
    return ` ${nounHead} ${stem}`;
  }
  if (options.followKind === "causal") {
    const nounHead = nounHeadForFollow();
    let stem = options.past ? "아니었으니까" : "아니니까";
    if (options.polite && !options.formal && options.casualNounHead !== "ge") {
      stem += "요";
    }
    return ` ${nounHead} ${stem}`;
  }
  if (options.additiveMo) {
    if (options.formal) {
      if (options.polite) {
        return options.past ? " 것도 아니었습니다" : " 것도 아닙니다";
      }
      return options.past ? " 것도 아니었다" : " 것도 아니다";
    }
    if (options.polite) {
      return options.past ? " 것도 아니었어요" : " 것도 아니에요";
    }
    return options.past ? " 것도 아니었어" : " 것도 아니야";
  }
  if (options.formal) {
    if (options.polite) {
      return options.past ? " 것이 아니었습니다" : " 것이 아닙니다";
    }
    return options.past ? " 것이 아니었다" : " 것이 아니다";
  }
  if (options.casualNounHead === "ge") {
    if (options.polite) {
      return options.past ? " 게 아니었어요" : " 게 아니에요";
    }
    return options.past ? " 게 아니었어" : " 게 아니야";
  }
  if (options.polite) {
    return options.past ? " 거 아니었어요" : " 거 아니에요";
  }
  return options.past ? " 거 아니었어" : " 거 아니야";
}

function renderCompoundConjectureKamoModal(
  attrText: string,
  options: { readonly modalPolite: boolean; readonly modalPast: boolean; readonly formal: boolean }
): string {
  const tail = renderKamoShirenaiTail(options.modalPolite, options.modalPast, options.formal);
  return `${attrText} 것일지도 ${tail}`;
}

function renderCompoundEmphasisKamoModal(
  attrText: string,
  options: { readonly kind: string; readonly emphasisPast: boolean; readonly modalPolite: boolean; readonly modalPast: boolean; readonly formal: boolean }
): string {
  let bridge = "";
  let middle: string;
  if (options.kind === "emphasis_limited") {
    bridge = options.formal ? "것이기는 " : "것이긴 ";
    middle = options.emphasisPast ? "했을지도 " : "할지도 ";
  } else if (options.kind === "emphasis_additive") {
    bridge = "것이기도 ";
    middle = options.emphasisPast ? "했을지도 " : "할지도 ";
  } else {
    middle = options.emphasisPast ? "것이었을지도 " : "것일지도 ";
  }
  const tail = renderKamoShirenaiTail(options.modalPolite, options.modalPast, options.formal);
  return `${attrText} ${bridge}${middle}${tail}`;
}

function renderCompoundNoCopulaChainSuffix(
  kind: string,
  options: { readonly past: boolean; readonly polite: boolean; readonly formal: boolean; readonly question: boolean }
): string {
  const { past, polite, formal, question } = options;
  if (kind === "conditional" || kind === "emphasis_conditional") {
    return formal ? (past ? " 것이었다면" : " 것이라면") : (past ? " 거였다면" : " 거라면");
  }
  if (kind === "emphasis") {
    if (question && !past) {
      return formal ? (polite ? " 것입니까" : " 것인가") : (polite ? " 거예요" : " 거야");
    }
    if (formal) {
      return polite ? (past ? " 것이었습니다" : " 것입니다") : (past ? " 것이었다" : " 것이다");
    }
    return polite ? (past ? " 거였어요" : " 거예요") : (past ? " 거였어" : " 거야");
  }
  if (kind === "emphasis_limited") {
    if (question) {
      if (past) {
        return formal && polite ? " 것이기는 했습니까" : " 것이기는 했어";
      }
      if (polite) {
        return formal ? " 것이기는 합니까" : " 것이기는 해요";
      }
      return formal ? " 것이기는 한가" : " 것이기는 해";
    }
    if (past) {
      return formal ? " 것이기는 했다" : " 것이기는 했어";
    }
    if (polite) {
      return formal ? " 것이기는 합니다" : " 것이기는 해요";
    }
    return formal ? " 것이기는 하다" : " 것이기는 해";
  }
  if (kind === "emphasis_additive") {
    if (question) {
      if (past) {
        return formal && polite ? " 것이기도 했습니까" : " 것이기도 했어";
      }
      if (polite) {
        return formal ? " 것이기도 합니까" : " 것이기도 해요";
      }
      return formal ? " 것이기도 한가" : " 것이기도 해";
    }
    if (past) {
      return formal ? " 것이기도 했다" : " 것이기도 했어";
    }
    if (polite) {
      return formal ? " 것이기도 합니다" : " 것이기도 해요";
    }
    return formal ? " 것이기도 하다" : " 것이기도 해";
  }
  if (kind === "emphasis_conjecture") {
    return " 것이겠지";
  }
  if (kind === "emphasis_contrastive") {
    if (past) {
      if (polite && formal) {
        return " 것이었습니다만";
      }
      if (polite) {
        return " 것이었지만요";
      }
      return " 것이었지만";
    }
    if (polite && formal) {
      return " 것입니다만";
    }
    if (polite) {
      return " 것이지만요";
    }
    return " 것이지만";
  }
  if (kind === "emphasis_causal") {
    if (past && polite) {
      return formal ? " 것이었으니까" : " 것이었으니까요";
    }
    if (past) {
      return " 것이었으니까";
    }
    if (polite) {
      return formal ? " 것이니까" : " 것이니까요";
    }
    return " 것이니까";
  }
  if (kind === "conjecture_contrastive") {
    return polite && !formal ? " 것이겠지만요" : " 것이겠지만";
  }
  if (kind === "conjecture_causal") {
    return polite && !formal ? " 것일 테니까요" : " 것일 테니까";
  }
  if (question) {
    return polite ? " 것일까요" : " 것일까";
  }
  return polite ? " 것이겠죠" : " 것이겠지";
}

export const REASON_BECAUSE_BOUND_NOUN = "때문";

function renderReasonBecause(
  payload: ReasonBecausePayload,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables | undefined
): string {
  const nominal = renderReasonBecauseBase(payload, formal, lookups, numeric);
  return payload.projection === "nominal" ? nominal : `${nominal}에`;
}

function reasonBecausePayloadWithProjectedHost(
  payload: ReasonBecausePayload,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables | undefined
): ReasonBecausePayload {
  const hostProjection = payload.predicateHostProjection;
  if (hostProjection === undefined || payload.predicateRoot === undefined || numeric === undefined) {
    return payload;
  }
  const hosted = withProjectedHostBase(payload.predicateRoot, hostProjection, {
    formal,
    lookups,
    numeric,
    realizeHostPlan: realizeHostRenderPlan
  });
  const stem = hosted === null ? null : firstAuxLayer(hosted.tail)?.stem ?? null;
  if (hosted === null || stem === null || stem.kind === "candidateSet") {
    return payload;
  }
  return { ...payload, predicateRoot: hosted, koreanLemma: stem.lemma };
}

function renderReasonBecauseBase(
  rawPayload: ReasonBecausePayload,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables | undefined
): string {
  const payload = reasonBecausePayloadWithProjectedHost(rawPayload, formal, lookups, numeric);
  if (payload.predicateRoot !== undefined) {
    const committedRoot = commitTail(payload.predicateRoot, {
      lookups,
      numeric: requireNumericTables(numeric, "reason because predicate root")
    }).root;
    const projected = renderTailPredicateGerundProjection(committedRoot, { formal, lookups });
    if (projected.ok && reasonPredicateRootCarriesPayloadPolarity(payload, committedRoot)) {
      return `${projected.text} ${REASON_BECAUSE_BOUND_NOUN}`;
    }
  }
  const features = payload.auxTokens.length > 0 ? extractFeatures(payload.auxTokens, { lookups }) : null;
  const negative = payload.negative ?? features?.negative === true;
  const past = payload.past ?? features?.past === true;
  if (payload.polarityTransition === "became_negative") {
    const negativeState = payload.koreanPos === 명사 || payload.koreanPos === 대명사
      ? `${payload.koreanLemma}${selectParticle(payload.koreanLemma, "이/가")} 아니게`
      : `${conjugate(payload.koreanLemma, asIrregular(payload.irregular), "지")} 않게`;
    return `${negativeState} ${past ? "되었기" : "되기"} ${REASON_BECAUSE_BOUND_NOUN}`;
  }
  if (payload.koreanPos === 동사) {
    if (payload.voice === "potential") {
      return `${resolvePotentialChainConnective(
        payload.koreanLemma,
        asIrregular(payload.irregular),
        koreanPredicateAuxChain(payload.auxTokens),
        "기",
        {},
        lookups
      )} ${REASON_BECAUSE_BOUND_NOUN}`;
    }
    if (negative && past) {
      return `${conjugate(payload.koreanLemma, asIrregular(payload.irregular), "지")} 않았기 ${REASON_BECAUSE_BOUND_NOUN}`;
    }
    if (negative) {
      return `${conjugate(payload.koreanLemma, asIrregular(payload.irregular), "지")} 않기 ${REASON_BECAUSE_BOUND_NOUN}`;
    }
    if (past) {
      return `${conjugate(payload.koreanLemma, asIrregular(payload.irregular), "았/었")}기 ${REASON_BECAUSE_BOUND_NOUN}`;
    }
    return `${conjugate(payload.koreanLemma, asIrregular(payload.irregular), "기")} ${REASON_BECAUSE_BOUND_NOUN}`;
  }
  if (payload.koreanPos === 형용사) {
    if (negative && past) {
      return `${conjugate(payload.koreanLemma, asIrregular(payload.irregular), "지")} 않았기 ${REASON_BECAUSE_BOUND_NOUN}`;
    }
    if (negative) {
      return `${conjugate(payload.koreanLemma, asIrregular(payload.irregular), "지")} 않기 ${REASON_BECAUSE_BOUND_NOUN}`;
    }
    if (past) {
      return `${conjugate(payload.koreanLemma, asIrregular(payload.irregular), "았/었")}기 ${REASON_BECAUSE_BOUND_NOUN}`;
    }
    return `${conjugate(payload.koreanLemma, asIrregular(payload.irregular), "기")} ${REASON_BECAUSE_BOUND_NOUN}`;
  }
  if (payload.koreanPos === 명사 || payload.koreanPos === 대명사) {
    if (negative) {
      const subject = `${payload.koreanLemma}${selectParticle(payload.koreanLemma, "이/가")} `;
      return `${subject}${past ? "아니었기" : "아니기"} ${REASON_BECAUSE_BOUND_NOUN}`;
    }
    if (past) {
      return payload.koreanLemma + (hasBatchim(payload.koreanLemma) === true ? `이었기 ${REASON_BECAUSE_BOUND_NOUN}` : `였기 ${REASON_BECAUSE_BOUND_NOUN}`);
    }
    const copula = payload.koreanLemma.endsWith("이") ? `기 ${REASON_BECAUSE_BOUND_NOUN}` : `이기 ${REASON_BECAUSE_BOUND_NOUN}`;
    return payload.koreanLemma + copula;
  }
  return `${payload.koreanLemma}기 ${REASON_BECAUSE_BOUND_NOUN}`;
}

function reasonPredicateRootCarriesPayloadPolarity(
  payload: ReasonBecausePayload,
  root: TailRoot
): boolean {
  if (payload.negative !== true) {
    return true;
  }
  if (root.tail.kind !== "auxLayer") {
    return false;
  }
  return root.tail.ops.some((op) =>
    op.kind === "negation" || ("polarity" in op && op.polarity === "negative")
  ) || stemCarriesSuppletiveNegation(root.tail.stem);
}

function stemCarriesSuppletiveNegation(stem: StemNode): boolean {
  if (stem.kind === "candidateSet") {
    const committed = resolveCandidateSetStem(stem);
    return committed !== null && stemCarriesSuppletiveNegation(committed);
  }
  return stem.commitment === "suppletive_negation";
}

function realizeWakeExplanation(plan: WakeExplanationPlan, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  const payload = wakeExplanationPayload(plan);
  const prefix = realizeRenderPlanText(payload.prefix, {
    formal,
    lookups,
    ...(numeric === undefined ? {} : { numeric })
  });
  if (payload.headKind === "deictic_reason") {
    if (payload.tailKind === "wakede") {
      return `${prefix} 이유로`;
    }
    if (payload.tailKind === "wakedakara") {
      return `${prefix} 이유니까`;
    }
  }
  const scopeNoun = payload.headKind === "register_noun"
    ? (formal ? "것" : "거")
    : "셈";
  if (payload.tailKind === "wakede") {
    return payload.headKind === "settlement"
      ? `${prefix} 셈이라`
      : `${prefix} ${nounCopulaConnective(scopeNoun, "아/어서")}`;
  }
  if (payload.tailKind === "wakedakara") {
    return payload.headKind === "settlement"
      ? `${prefix} 셈이니까`
      : `${prefix} ${nounCopulaConnective(scopeNoun, "(으)니까")}`;
  }
  const auxTokens = payload.auxTokens ?? [];
  const features = extractFeatures(auxTokens, { lookups });
  if (payload.connectiveEnding !== undefined && payload.connectiveEnding !== null) {
    return `${prefix} ${nounCopulaConnective(scopeNoun, payload.connectiveEnding, features.past)}`;
  }
  return `${prefix} ${nounCopula(scopeNoun, features, formal, lookups).text}`;
}

function realizeSemanticCarrierPredicatePlan(
  plan: Extract<RenderPlan, { kind: "semanticCarrierPredicate" }>,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): string {
  const parts = semanticCarrierPredicateRenderParts(plan, formal, lookups, numeric);
  if ("ok" in parts) {
    throw new Error(`semantic carrier predicate '${plan.specId}' render failed: ${parts.reason}`);
  }
  return plan.prefix + parts.rendered.korean + parts.suffix;
}

function realizeSemanticCarrierPredicateWithTrace(
  plan: Extract<RenderPlan, { kind: "semanticCarrierPredicate" }>,
  options: RenderTraceOptions
): RenderedTarget {
  const numeric = requireNumericTables(options.numeric, "semantic carrier predicate traced render");
  const formal = options.formal ?? false;
  const parts = semanticCarrierPredicateRenderParts(plan, formal, options.lookups, numeric);
  if ("ok" in parts) {
    return fallbackRenderedTarget(plan, options);
  }
  const segments: TargetSegment[] = [];
  if (plan.prefix.length > 0) {
    segments.push(syntheticTargetSegment({
      text: plan.prefix,
      renderPlanKind: plan.kind,
      kind: "connective",
      projectionConfidence: "owner"
    }));
  }
  const traced = parts.rendered.committedTailRoot === undefined
    ? null
    : renderTailWithSourceTargetTrace(parts.rendered.committedTailRoot, {
      formal,
      lookups: options.lookups
    });
  if (traced !== null && traced.text === parts.rendered.korean) {
    segments.push(...traced.segments);
  } else {
    segments.push(syntheticTargetSegment({
      text: parts.rendered.korean,
      sourceSpan: sourceSpanForTailRoot(plan.root) ?? options.sourceSpan ?? null,
      renderPlanKind: plan.kind,
      kind: "connective",
      projectionConfidence: "semantic"
    }));
  }
  if (parts.suffix.length > 0) {
    segments.push(syntheticTargetSegment({
      text: parts.suffix,
      renderPlanKind: plan.kind,
      kind: "connective",
      projectionConfidence: "owner"
    }));
  }
  const rendered = renderedTargetFromSegments(segments);
  const expected = realizeSemanticCarrierPredicatePlan(plan, formal, options.lookups, numeric);
  return rendered.text === expected
    ? attachUnitToRenderedTarget(rendered, options.unit ?? null)
    : fallbackRenderedTarget(plan, options);
}

function semanticCarrierPredicateRenderParts(
  plan: Extract<RenderPlan, { kind: "semanticCarrierPredicate" }>,
  formal: boolean,
  lookups: LookupTables,
  numeric: NumericTables
): { readonly rendered: SharedTailChainRenderResult; readonly suffix: string } | { readonly ok: false; readonly reason: string } {
  const commitContext = semanticCarrierCommitContext(plan, numeric, lookups);
  if (plan.tailKind === "tame") {
    const rendered = commitSharedTailParserGerundRoot({
      root: plan.root,
      context: { formal, outgoingBoundary: { kind: "terminal" }, lookups },
      commitContext,
      fallbackHeadKind: "predicate"
    });
    if ("ok" in rendered) {
      return rendered;
    }
    return { rendered, suffix: " 때문에" };
  }
  if (plan.tailKind === "nominal_ga") {
    const root = semanticCarrierAttributiveRoot(plan);
    const rendered = commitSharedTailParserRoot({
      root,
      context: { formal, outgoingBoundary: { kind: "terminal" }, lookups },
      commitContext: semanticCarrierCommitContext({ ...plan, root }, numeric, lookups),
      fallbackHeadKind: "predicate"
    });
    if ("ok" in rendered) {
      return rendered;
    }
    return { rendered, suffix: formal ? " 것이" : " 게" };
  }
  if (plan.tailKind === "connective" || plan.tailKind === "terminal") {
    const rendered = commitSharedTailParserRoot({
      root: plan.root,
      context: { formal, outgoingBoundary: { kind: "terminal" }, lookups },
      commitContext,
      fallbackHeadKind: "predicate"
    });
    if ("ok" in rendered) {
      return rendered;
    }
    return { rendered, suffix: "" };
  }
  return { ok: false, reason: `unsupported semantic carrier predicate tail kind: ${plan.tailKind}` };
}

function semanticCarrierCommitContext(
  plan: Extract<RenderPlan, { kind: "semanticCarrierPredicate" }>,
  numeric: NumericTables,
  lookups: LookupTables
): import("../head-tail/tail/predicate-root/commit.js").CommitContext {
  const own: import("../head-tail/tail/predicate-root/commit.js").ClauseTailIR = {
    root: plan.root,
    clauseIndex: 0,
    tokenSpan: { start: 0, end: 0 },
    contentSpan: { start: 0, end: 0 },
    predicateTokenIdx: 0,
    outgoingBoundary: { kind: "terminal" }
  };
  return {
    clauseIndex: 0,
    predicateTokenIdx: 0,
    peerClauses: [own],
    ownClause: own,
    lookups,
    numeric
  };
}

function semanticCarrierAttributiveRoot(
  plan: Extract<RenderPlan, { kind: "semanticCarrierPredicate" }>
): TailRoot {
  if (plan.root.tail.kind !== "auxLayer") {
    throw new Error(`semantic carrier predicate '${plan.specId}' requires aux-layer root`);
  }
  return {
    ...plan.root,
    tail: {
      ...plan.root.tail,
      terminal: "attributive"
    }
  };
}

function sourceSpanForTailRoot(root: TailRoot): TargetSegment["sourceSpan"] {
  if (root.tail.kind !== "auxLayer") {
    return null;
  }
  return combineSourceSpans(
    sourceSpanForRuntimeTokens(root.tail.stem.source.tokens),
    ...root.tail.ops.map((op) => sourceSpanForRuntimeTokens(op.source.tokens))
  );
}

function renderPlanText(value: RenderPlan | string | null | undefined, formal: boolean, lookups: LookupTables, numeric?: NumericTables): string {
  if (value === undefined || value === null) {
    return "";
  }
  return typeof value === "string" ? value : realizeRenderPlanText(value, { formal, lookups, ...(numeric === undefined ? {} : { numeric }) });
}

function realizeStructuralRelationSequence(
  plan: StructuralRelationSequencePlan,
  formal: boolean,
  lookups: LookupTables,
  numeric?: NumericTables
): string {
  return plan.parts.map((part) => (
    part.kind === "structuralText"
      ? part.text
      : renderPlanText(part, formal, lookups, numeric)
  )).join("");
}

function realizeStructuralRelationSequenceWithTrace(
  plan: StructuralRelationSequencePlan,
  options: RenderTraceOptions
): RenderedTarget {
  const segments: TargetSegment[] = [];
  for (const part of plan.parts) {
    if (part.kind === "structuralText") {
      if (part.text.length === 0) {
        continue;
      }
      segments.push(syntheticTargetSegment({
        text: part.text,
        sourceSpan: part.sourceSpan ?? null,
        renderPlanKind: plan.kind,
        kind: /^\s+$/u.test(part.text) ? "punctuation" : "quote",
        projectionConfidence: "owner"
      }));
      continue;
    }
    segments.push(...realizeRenderPlanWithTrace(part, options).segments);
  }
  return attachUnitToRenderedTarget(renderedTargetFromSegments(segments), options.unit ?? null);
}

function requireNumericTables(numeric: NumericTables | undefined, context: string): NumericTables {
  if (numeric === undefined) {
    throw new Error(`${context} requires numeric lookup tables`);
  }
  return numeric;
}

function auxTokensOf(plan: LemmaRealization | AttributiveRealization): readonly RuntimeHaruToken[] {
  return plan.auxTokens;
}

function rewriteAuxTokens(
  auxTokens: readonly RuntimeHaruToken[],
  options: { dropFirstPassiveAux: boolean; dropFirstCausativeAux: boolean; dropFirstNegativeAux: boolean }
): readonly RuntimeHaruToken[] {
  return rewriteAuxTokensWithReplacement(auxTokens, options)[0];
}

function rewriteAuxTokensWithReplacement(
  auxTokens: readonly RuntimeHaruToken[],
  options: { dropFirstPassiveAux: boolean; dropFirstCausativeAux: boolean; dropFirstNegativeAux: boolean }
): readonly [auxTokens: readonly RuntimeHaruToken[], replacementToken: RuntimeHaruToken | null] {
  let updated = [...auxTokens];
  let replacementToken: RuntimeHaruToken | null = null;
  if (options.dropFirstPassiveAux) {
    let removedAux: RuntimeHaruToken | null = null;
    const filtered: RuntimeHaruToken[] = [];
    let removed = false;
    for (const aux of updated) {
      const pos4 = aux.pos & POS4;
      const pos5 = aux.pos & POS5;
      if (!removed && (pos4 === 助動詞_レル)) {
        removed = true;
        removedAux = aux;
        if ((pos5 & _撥音便) === _撥音便) {
          filtered.push(syntheticNuAuxToken());
        }
        continue;
      }
      filtered.push(aux);
    }
    updated = filtered;
    replacementToken = removedAux !== null && updated.length === 0 ? removedAux : null;
  }
  if (options.dropFirstCausativeAux) {
    let removedAux: RuntimeHaruToken | null = null;
    const filtered: RuntimeHaruToken[] = [];
    let removed = false;
    for (const aux of updated) {
      const dictionaryForm = aux.dictionaryForm;
      if (!removed && (dictionaryForm === "せる" || dictionaryForm === "させる")) {
        removed = true;
        removedAux = aux;
        continue;
      }
      filtered.push(aux);
    }
    updated = filtered;
    replacementToken = removedAux !== null && updated.length === 0 ? removedAux : replacementToken;
  }
  if (options.dropFirstNegativeAux) {
    let removedAux: RuntimeHaruToken | null = null;
    const filtered: RuntimeHaruToken[] = [];
    let removed = false;
    for (const aux of updated) {
      const pos4 = aux.pos & POS4;
      if (!removed && ((pos4 === 助動詞_ナイ) || (pos4 === 助動詞_ヌ))) {
        removed = true;
        removedAux = aux;
        continue;
      }
      filtered.push(aux);
    }
    updated = filtered;
    replacementToken = removedAux !== null && updated.length === 0 ? removedAux : replacementToken;
  }
  return [updated, replacementToken];
}

function syntheticNuAuxToken(): RuntimeHaruToken {
  return {
    surface: "ん",
    dictionaryForm: "ぬ",
    reading: "",
    dictionaryFormReading: "",
    pos: 助動詞 | 助動詞_ヌ | 終止形_撥音便,
    dictionaryId: -1
  };
}

type WakeWrapperRenderPlan = WakeExplanationPlan;

export function isWakeWrapperPlan(plan: RenderPlan): plan is WakeWrapperRenderPlan {
  return plan.kind === "wakeExplanation";
}

export type WakePrefixPlan = WakeExplanationPlan;

export function isWakePrefixPlan(plan: RenderPlan): plan is WakePrefixPlan {
  return isWakeWrapperPlan(plan);
}

function wakeWrapperPrefix(plan: WakeWrapperRenderPlan): RenderPlan | string | undefined {
  if ("prefix" in plan && plan.prefix !== undefined) {
    return plan.prefix ?? undefined;
  }
  if ("payload" in plan && "prefix" in plan.payload) {
    return plan.payload.prefix;
  }
  return undefined;
}

function withWakeWrapperPrefix(plan: WakeWrapperRenderPlan, prefix: RenderPlan): RenderPlan {
  if ("prefix" in plan) {
    return { ...plan, prefix };
  }
  if ("payload" in plan && "prefix" in plan.payload) {
    return { ...plan, payload: { ...plan.payload, prefix } } as RenderPlan;
  }
  return plan;
}

function wrapperPrefix(plan: WakeWrapperRenderPlan): RenderPlan | string | undefined {
  if ("prefix" in plan && plan.prefix !== undefined) {
    return plan.prefix ?? undefined;
  }
  if ("payload" in plan && "prefix" in plan.payload) {
    return plan.payload.prefix;
  }
  return undefined;
}

function shouldRewriteSurfacePrefixOnLemma(plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>): boolean {
  return plan.rewritePrefixOnLemmaReplace === true;
}

function shouldRewriteSurfaceSuffixOnLemma(plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>): boolean {
  return plan.rewriteSuffixOnLemmaReplace === true;
}

function shouldRewriteSurfacePrefixOnConnective(plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>): boolean {
  return plan.rewritePrefixOnConnectiveReplace === true;
}

function shouldRewriteSurfaceSuffixOnConnective(plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>): boolean {
  return plan.rewriteSuffixOnConnectiveReplace === true;
}

function isRenderPlan(value: RenderPlan | string | null | undefined): value is RenderPlan {
  return value !== undefined && value !== null && typeof value !== "string";
}


export function generateCopulaNegation(
  koreanLemma: string,
  options: {
    entry?: MetadataEntry | null;
    polite?: boolean;
    past?: boolean;
    formal?: boolean;
    conditionalNara?: boolean;
    additiveMo?: boolean;
    irregular?: IrregularType | null;
    jpPos?: number | null;
  } = {}
): string {
  const polite = options.polite ?? false;
  const formal = options.formal ?? false;
  const past = options.past ?? false;
  const conditionalNara = options.conditionalNara ?? false;
  const additiveMo = options.additiveMo ?? false;
  const [lemma, koreanPos, irregular] = resolveCopulaAdj(
    options.entry,
    koreanLemma,
    metadataKoreanPos(options.entry, koreanLemma),
    asIrregular(metadataIrregular(options.entry, koreanLemma) ?? options.irregular ?? null),
    options.jpPos ?? null
  );

  if (koreanPos === 형용사 || koreanPos === 동사) {
    const negStem = `${conjugate(lemma, asIrregular(irregular), "지")}${additiveMo ? "도" : ""} 않`;
    const negLemma = `${negStem}다`;
    if (conditionalNara) {
      return past ? conjugate(negLemma, null, "았/었다면") : `${negStem}다면`;
    }
    if (past) {
      const pastForm = conjugate(negLemma, null, "았/었");
      if (formal) {
        return pastForm + (polite ? "습니다" : "다");
      }
      return pastForm + (polite ? "어요" : "어");
    }
    if (formal) {
      return polite ? conjugate(negLemma, null, "ㅂ니다/습니다") : negLemma;
    }
    const ae = conjugate(negLemma, null, "아/어");
    return ae + (polite ? "요" : "");
  }
  if (additiveMo) {
    if (conditionalNara) {
      return `${koreanLemma}도 ${past ? "아니었다면" : "아니라면"}`;
    }
    if (past) {
      const base = `${koreanLemma}도 아니었`;
      if (formal) {
        return base + (polite ? "습니다" : "다");
      }
      return base + (polite ? "어요" : "어");
    }
    if (formal) {
      return `${koreanLemma}도 ${polite ? "아닙니다" : "아니다"}`;
    }
    return `${koreanLemma}도 ${polite ? "아니에요" : "아니야"}`;
  }
  const particle = hasBatchim(koreanLemma) === true ? "이" : "가";
  if (conditionalNara) {
    return koreanLemma + particle + (past ? " 아니었다면" : " 아니라면");
  }
  if (past) {
    const base = `${koreanLemma}${particle} 아니었`;
    if (formal) {
      return base + (polite ? "습니다" : "다");
    }
    return base + (polite ? "어요" : "어");
  }
  if (polite || formal) {
    if (formal) {
      return polite ? `${koreanLemma}${particle} 아닙니다` : `${koreanLemma}${particle} 아니다`;
    }
    return `${koreanLemma}${particle} 아니에요`;
  }
  return `${koreanLemma}${particle} 아니야`;
}
