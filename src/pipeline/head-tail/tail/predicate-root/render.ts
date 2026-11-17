
import { conjugate, type IrregularType } from "../../../../generator/conjugator.js";
import { declaredProjectionCarrierBranchTerminal } from "./projection-carrier-form-table.js";
import { pronominalNoHeadStemSurface } from "../../../nominal-phrase-surface.js";
import { isKoreanPotentialLemma, potentialPhrasePrefix, roleCatNyaSuffix } from "../../../../generator/aux-map.js";
import { hasAllomorphBatchim, selectParticle } from "../../../../generator/particles.js";
import type { LookupTables } from "../../../lookup-tables.js";
import {
  conjugateNegAttributive,
  nominalAttributiveSurface,
  resolveNominalAttributiveEvidence,
  selectPlainVerbAttributiveEnding,
  type NominalAttributiveEvidence,
} from "../../../attributive.js";
import { derivationalMakeStateCarrierOf, isTekiDerivationSuffixToken } from "./derivational-suffix-table.js";
import { hasSeparatedFinitePredicateBoundary } from "../../../clause-layout/index.js";
import { isHumanReferentToken } from "../../candidate/semantic-classifiers.js";
import type { Warning } from "../../../../types/warning.js";
import { unsupportedGrammarRawWarning } from "../../../fallback/unsupported-raw.js";
import type { RenderedTarget } from "../../../../types/projection.js";
import { checkOpInSubset } from "./render-support.js";
import { POS0, POS01, POS4, POS5A, 意志推量形_, 助動詞, 助動詞_ダ, 助動詞_デス, 助動詞_マス, 助詞_接続助詞, 未然形_, 命令形_, 連体形_, 連用形_, isNaAdjCapable, 명사 } from "../../../../types/pos.js";
export {
  RENDER_SUPPORTED_ASPECT_KINDS,
  RENDER_SUPPORTED_CONNECTIVE_KINDS,
  RENDER_SUPPORTED_IDIOM_KINDS,
  RENDER_SUPPORTED_MODAL_KINDS
} from "./render-support.js";
import { committedAttributiveProjectionPolicy, headRequiredAdnominalEnding, headRequiresNominalKiComplement, attributiveProjectionPolicy, headRequiredPastAttributivePolicy, headRequiresFutureAttributiveProjection, predicateMoodRequestsFutureProjection } from "./attributive-head-policy.js";
import { isAdverbialMannerNounHead } from "./classifiers/tokens.js";
import { RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE, quotedMoodForClosingSfpEffect, auxOpClosesNegativeCopulaBridge, isCommittedKaQuestionSfpEffect, stemInflectionCarriesVolitionalMood, type AdjCopulaBridgeOp, type AttributiveBoundaryPayload, type AuxLayerNode, type AuxOpNode, type BenefactiveAspectOp, type ConjectureOp, type ConnectiveOp, type DesiderativeAspectOp, type DesireOp, type ExperienceIdiomOp, type MiseruAspectOp, type ProhibitionAspectOp, type RequestAspectOp, type SimpleAspectOp, type ModalOp, type NegationOp, type NounStem, type ObligationIdiomOp, type OpSource, type PoliteOp, type PotentialKotoGaDekiruIdiomOp, type PredicateProjectionCarrierOp, type PredicateQuoteCarrierOp, type PostverbAuxiliaryOp, type ScopeBridgeOp, type SoudaHearsayModalOp, type StemNode, type TailRoot, type TenseOp, type VoiceOp, type YoudaModalOp } from "./grammar.js";
import {
  connectiveForRender,
  isTerminalTeFormConnective,
  shouldCarryConnectivePoliteness
} from "./connective-render.js";
import { auxLayerConsumedSourceSequence, chainFinalOpHostCategory, isBenefactiveAspectOp, sfpHasSelfDirectedConjectureRole, stemIsAdjectivalSourceWithNominalTarget, stemSupportsProjectionCategory } from "./inspect.js";
import { policyAllowsShortNegation, stemAllowsSahenShortNegationSplit, NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT } from "./short-negation-policy.js";
import { isFutureAttributiveProjection, applyNegationChainToLemmaBase, applyNegationDepthToLemmaBase, ChainTraceAccumulator, closeChainTraceAgainstText, rebindChainTraceForProjection, closeChainTraceWithConnectivePieces, concatPredicatePrefix, ensureQuestionPunctuation, lastLayerSource, lemmaPredicateBase, scopeCarrierCanPreserveSourcePoliteness, splitNegativeNounCopulaSourceTokens, stemHasSahenSourcePredicate, stemHasSourceVerbalPredicate, tailTraceSegmentsToTargetSegments, traceSfpTailFromBaseSegments, stemHostTraceSegment, tracedCat, tracedFuse, tracedSeg, tracedStemHostSeg, tracedText, type AttributiveProjectionPolicy, type BaseResult, type ChainSourceTrace, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type OkBaseResult, type OperatorOp, type RenderContext, type RenderFailure, type RenderOutcome, type RenderSuccess, type TailTraceSegment, withStemPrefixApplied } from "./renderers/base-model.js";
import { composeFinalForm, irregularFrom, obligationEmphasis, opSourceIsVolitional, opSourceIsVolitionalInChain, pastNegStemAttributive, renderBaseVolitionalConcessive, renderBaseVolitionalPurposeConnective, renderBaseVolitionalQuotative, renderBaseVolitionalTerminal, renderPredicateBaseVolitionalPoliteRegisterTerminal, renderPredicateBaseVolitionalPoliteTerminal, renderPredicateBaseVolitionalPurposeConnective, renderPredicateBaseVolitionalQuotative, renderVolitional, renderVolitionalPurposeConnective, renderVolitionalQuestionAlternative, renderVolitionalQuestionContent, renderVolitionalQuestionQuotative, renderVolitionalQuestionReformulation, renderVolitionalQuotedQuestionContent, renderBaseVolitionalConjectureTerminal, volitionalConcessiveEnding, volitionalMoodBearerBlocksCohortative } from "./renderers/final-forms.js";
import { applyExternalNegationDepthToPredicateBase, applyNonLastPrefixContractions, causativeItadakuCommitmentLemma, finalNegationLoweringForcesPast, nounCopulaStemAllomorphHost, lowerFinalNegationForCommittedBase, negativeNounCopulaBase, negativeNounCopulaChainBase, honorificNegativeNounCopulaBase, nounCopulaBase, nounCopulaBaseForCopula, nounCopulaPolarityBaseForCopula, nounSubjectPart, passiveStemOptionsForStem, prohibitionPredicateBase, simpleStemBase, simpleStemBaseResult, splitPositiveObligationSourceTokens } from "./renderers/base-support.js";
import { conditionalQuoteEllipsisMood, type ConditionalQuoteEllipsisMood } from "./renderers/hostless-conditional-quote.js";
import { applyQuoteBoundaryFocus, composeBaseWithConnective, applyRequestComplementQuoteFocus, attachCommittedChainTrace, attributiveBoundaryRequestsFutureProjection, composeBaseWithConjectureQuestionConnective, composeCommittedBaseAttributive, composeBaseWithImperativeQuotative, composeBaseWithPlainImperative, composeBaseWithRequestAttributiveQuote, composeBaseWithRequestComplement, composeBaseWithTerminal, composeCommittedBaseWithConjectureQuestionConnective, composeCommittedSequenceAfterCompactQuoteAttributive, composeCommittedTailConnective, composeCommittedTailConnectiveWithNativeTrace, composeCommittedTailTerminal, composeCommittedTailTerminalTeForm, composeContractedPastAspectTerminal, composeNounCopulaBaseWithConjecture, composeNounCopulaBaseWithConjectureConnective, composeRequestProhibitionAttributiveQuote, composeRequestProhibitionComplement, isConjectureQuestionContinuationConnective, isQuestionContentConnective, isRequestComplementLikeConnective, likenessAttributiveLexicalizationApplies, nounCopulaObligationBase, nounCopulaObligationBaseForCopula, projectBaseAttributive, renderConjectureQuotativeFromStem } from "./renderers/connective-compose.js";
import { composeBaseWithSfpClosedExemplification, exemplificationTakesClosedPropositionComplement } from "./renderers/connective-compose.js";
import { quoteProjectionForSfpEffect } from "../../../semantics/sfp-quote-projection.js";
import { predicateQuoteCarrierRestoredHost } from "./renderers/predicate-bases.js";
import { aspectContractsToPast, copulaCarrierBaseForInterOp, experienceBase, isBenefactiveAspectKind, isStateChangePostverbAuxiliaryKind, modalFinalChainPolicy, predicateProjectionCarrierBase, predicateQuoteCarrierBase, scopeBridgeBase, scopeBridgeHeadAbsorbedHostPrefix, soudaHearsayBaseFromPredicateBase, voiceBase } from "./renderers/predicate-bases.js";
import { reprojectCommandQuoteAttributiveForHeadPolicy, buildRequestQuotedPropositionBase, prohibitionUsesRequestForm, renderMiseru, renderPoliteRequestOnPredicateBase, renderProhibition, renderProhibitionOnPredicateBase, renderRequest, renderRequestAttributiveQuoteFromStem, renderRequestAttributiveQuoteOnPredicateBase, renderRequestComplementFromStem, renderRequestOnPredicateBase } from "./renderers/command-render.js";
import { type ChainBaseResult, assignOperatorChainWrapSlots, attributiveCommandBaseOperatorChain, attributiveCommandHeadPatternMatches, chainBases, chainStemTraceFields, collectOperatorChain, commandAttributiveAspectOp, commandTerminalBaseOperatorChain, isChainableHeadOp, isHeadOp, isOperatorWrapBoundaryHeadOp, isProhibitionCommandAspectOp, isRequestCommandAspectOp, isSimpleAspectOpKind, multiAspectPathCanUseOperatorFold, opCarriesIntrinsicPast, opToBase, operatorChainSlotForWrapOp, operatorChainWarnings, requestBaseCanUseDirectAuxiliaryImperative, requestTerminalBaseCanCarryStemNegation, requestTerminalBaseOpForRender, sourceTraceWithFinalNegationStem, type ChainContext } from "./renderers/op-chain.js";
import { renderBenefactiveVolitional, renderBenefactiveVolitionalPurpose, renderBenefactiveVolitionalQuestionQuotative, renderChainVolitionalQuestionQuotative } from "./renderers/aspect-benefactive.js";
import { isNormalFunctionalChain, renderRepeatedFunctionalChainText, splitFunctionalAuxChunks } from "../../../rendering/functional-chain.js";
import { baseResultForNounCopulaConnective, buildNounPredicateProjectionCarrier, canonicalizeConjectureCopulaOps, committedCarrierPostChainFrame, composeCommittedCarrierPostChain, composeCommittedCarrierPostChainAttributive, copulaVariantConnective, isTosuruPredicateCarrier, nominalPredicateStemFromNounLemma, predicateCopulaNegationOp, projectPredicateCopulaLayer, renderAdjTosuruResultativePredicateCarrier, renderNominalHostLikeness, renderNounCopulaAttributiveOperatorChain, renderNounPredicateProjectionCarrier, renderNounScopeBridge, renderNounScopeBridgeAttributiveTerminal, renderNounTosuruAttributiveTerminal, renderNounTosuruPredicateCarrier, residualConjectureSuffix, tryRenderInterjectionAbsorbedCopula, tryRenderNounCopulaInitialBaseOperatorChain } from "./renderers/noun-copula.js";
import { composeConnectiveQuestionTerminal, composeTerminalMoodOnBase, composeCommittedTailDiscursiveSfp, composeCommittedTailQuestionTerminal, composeRenderedNominalizedConjectureQuestion, composeTerminalDiscourseTailSegment, renderBenefactiveTerminalRequestQuestion, renderDirectNegativeConfirmQuestionSfp, renderHeadlessNegativeConfirmHost, renderNegativeInviteQuestionSfp, renderNounCopulaConjectureQuestionSfp, renderNounCopulaQuoteQuestionSfp, renderPlainNegativeQuestionSfp, renderProgressiveNegativeConfirmQuestionSfp, renderRequestDiscursiveSfp, renderSimpleStemTerminalSfp, renderStemConjecturalSkipSfpTerminal, loweredTerminalSfpEffect, renderTerminalRoleSfpFrame, renderVolitionalQuestionSfp, stripTerminalNodaAfterNegativeNoBridge, terminalRoleFrameFromAuxLayer } from "./renderers/sfp-question.js";
import { isTerminalSkipSfpSurface } from "../../../semantics/sfp-surface.js";
import { copulaNiMarkerRelationForToken } from "../../boundary/marker.js";
import { resolveCandidateSetStem } from "./commit.js";
import { isBareNounStemFocusConnective, isBareNounStemImplicitCopulaConnective, isBareNounStemQuoteConnective } from "./bare-noun-stem-hosting.js";
import {
  normalizeCarrierInternalConnectives,
  PRODUCTION_REGISTRY,
  retiredLegacyProductionFamilyId,
  resolveProductionDispatch
} from "./production-registry.js";
import { lowerProductionMatch } from "./production-lowering-bindings.js";
import { createAspectOp, createConnectiveOp, createCopulaOp, createPoliteOp, createTenseOp, createVoiceOp } from "./op-builders.js";

function isBareTeRequestComplementConnective(connective: ConnectiveOp): boolean {
  if (connective.connective !== "request_complement") {
    return false;
  }
  const first = connective.source.tokens[0];
  return first !== undefined &&
    (first.pos & POS01) === 助詞_接続助詞 &&
    (first.surface === "て" || first.surface === "で");
}

function withWarnings(result: RenderOutcome, extra: readonly Warning[]): RenderOutcome {
  if (!result.ok) return result;
  if (extra.length === 0) return result;
  return {
    ...result,
    warnings: [...(result.warnings ?? []), ...extra]
  };
}

function withPronominalNoHeadStemResolved(root: TailRoot, formal: boolean): TailRoot {
  if (root.tail.kind !== "auxLayer") {
    return root;
  }
  const layer = root.tail;
  const stem = layer.stem;
  if (stem.kind !== "noun" || stem.pronominalNoHeadBase === undefined) {
    return root;
  }
  const { pronominalNoHeadBase, ...rest } = stem;
  return {
    ...root,
    tail: {
      ...layer,
      stem: {
        ...rest,
        lemma: pronominalNoHeadStemSurface(pronominalNoHeadBase, {
          formal,
          fullForm: !pronominalNoHeadTakesContractedForm(layer)
        })
      }
    }
  };
}

function pronominalNoHeadTakesContractedForm(layer: AuxLayerNode): boolean {
  if (layer.terminal !== null) {
    return false;
  }
  const first = layer.ops[0];
  if (
    first === undefined ||
    first.kind !== "copula" ||
    first.polarity !== "affirmative" ||
    (first.variant !== "basic" && first.variant !== "conditional_nara")
  ) {
    return false;
  }
  return layer.ops.every((op) =>
    op.kind === "copula" ||
    op.kind === "tense" ||
    (op.kind === "connective" && !isQuestionContentConnective(op)));
}

function teConnectiveClosesUtterance(connective: ConnectiveOp, ctx: RenderContext): boolean {
  if (ctx.outgoingBoundary?.kind !== "terminal" || ctx.layout === undefined) {
    return false;
  }
  const teIdx = Math.max(...connective.source.tokenIndices);
  return Number.isFinite(teIdx) && ctx.layout.chuushiClosureAt(teIdx + 1)?.right === "detached";
}

function renyouChuushiClosesUtterance(connective: ConnectiveOp, ctx: RenderContext): boolean {
  if (connective.connective !== "te_form" || connective.surface !== RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE || ctx.layout === undefined) {
    return false;
  }
  const hostIdx = Math.max(...connective.source.tokenIndices);
  return Number.isFinite(hostIdx) &&
    ctx.layout.chuushiClosureAt(hostIdx + 1)?.hostKind === "renyou" &&
    teConnectiveClosesUtterance(connective, ctx);
}

function teConnectiveClosesAsIisashi(connective: ConnectiveOp, ctx: RenderContext): boolean {
  if (connective.connective !== "te_form" || ctx.layout === undefined) {
    return false;
  }
  const teIdx = Math.max(...connective.source.tokenIndices);
  const act = Number.isFinite(teIdx) ? ctx.layout.teUtteranceActAt(teIdx) : undefined;
  return act?.position === "utterance_final" && act.scope !== "quoted_content" && act.iisashiSignals.length > 0;
}

function teConnectiveClosesQuotedUtterance(connective: ConnectiveOp, ctx: RenderContext): boolean {
  if (connective.connective !== "te_form" || (connective.surface !== "て" && connective.surface !== "で") || ctx.layout === undefined) {
    return false;
  }
  if (connective.teFormRole !== undefined && connective.teFormRole !== "linkage" && connective.teFormRole !== "listing") {
    return false;
  }
  const teIdx = Math.max(...connective.source.tokenIndices);
  const act = Number.isFinite(teIdx) ? ctx.layout.teUtteranceActAt(teIdx) : undefined;
  return act?.position === "utterance_final" && act.scope === "quoted_content";
}

function utteranceFinalTeConnectiveForRender(connective: ConnectiveOp, ctx: RenderContext): ConnectiveOp {
  if (
    connective.connective !== "te_form" ||
    (connective.teFormRole !== undefined && connective.teFormRole !== "linkage") ||
    ctx.layout === undefined ||
    isTerminalTeFormConnective(connective, ctx) ||
    teConnectiveClosesQuotedUtterance(connective, ctx)
  ) {
    return connective;
  }
  const teIdx = Math.max(...connective.source.tokenIndices);
  if (!Number.isFinite(teIdx) || ctx.layout.teUtteranceActAt(teIdx)?.position !== "utterance_final") {
    return connective;
  }
  return { ...connective, teFormRole: teConnectiveClosesAsIisashi(connective, ctx) ? "linkage" : "listing" };
}

function withNegativeCopulaCorrectionTeRole(root: TailRoot): TailRoot {
  const layer = root.tail;
  if (layer.kind !== "auxLayer") {
    return root;
  }
  const teIdx = layer.ops.findIndex((op) => op.kind === "connective" && op.connective === "te_form");
  const te = teIdx > 0 ? layer.ops[teIdx] : undefined;
  if (te?.kind !== "connective" || te.teFormRole !== undefined || !auxOpClosesNegativeCopulaBridge(layer.ops[teIdx - 1])) {
    return root;
  }
  const ops = layer.ops.map((op, index) => index === teIdx ? { ...te, teFormRole: "listing" as const } : op);
  return { ...root, tail: { ...layer, ops } };
}

export function renderTail(root: TailRoot, ctx: RenderContext): RenderOutcome {
  root = withNegativeCopulaCorrectionTeRole(withPronominalNoHeadStemResolved(root, ctx.formal));
  if (root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "ConnectiveNode (nested tree IR) rendering not supported — Phase 5+ 영역" };
  }
  if (headRequiresNominalKiComplement(root.tail)) {
    return renderTailPredicateGerundProjection(root, ctx);
  }
  return applyStemAffixToOutcome(renderTailWithoutStemAffix(root, ctx), root.tail.stem);
}

export function renderTailWithoutStemAffix(
  root: TailRoot,
  ctx: RenderContext,
  options: {
    readonly skipFamilyId?: string;
    readonly bypassRegistry?: boolean;
  } = {}
): RenderOutcome {
  if (root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "production lowering requires aux layer root" };
  }
  const committedRenderContext = {
    intake: { site: "committed_render", partial: false }
  } as const;
  if (
    options.bypassRegistry === true ||
    options.skipFamilyId !== undefined
  ) {
    const retiredFamilyId = retiredLegacyProductionFamilyId(
      root,
      committedRenderContext
    );
    if (
      retiredFamilyId !== null &&
      (
        options.bypassRegistry === true ||
        options.skipFamilyId === retiredFamilyId
      )
    ) {
      return {
        ok: false,
        reason: `legacy renderer retired for production family '${retiredFamilyId}'`
      };
    }
  }
  if (options.bypassRegistry !== true) {
    const registry = options.skipFamilyId === undefined
      ? PRODUCTION_REGISTRY
      : PRODUCTION_REGISTRY.filter((family) => family.id !== options.skipFamilyId);
    const productionDispatch = resolveProductionDispatch(root, committedRenderContext, registry);
    if (productionDispatch.kind === "registry") {
      return lowerProductionMatch(
        root,
        productionDispatch.match,
        ctx,
        renderTailWithoutStemAffix,
        renderCommittedAttributiveTerminalLayer,
        renderCommittedTailTerminalLayer
      );
    }
    if (productionDispatch.kind === "non_admission") {
      if (options.skipFamilyId !== undefined) {
        return {
          ok: false,
          reason:
            `nested production redispatch reached non-admission ` +
            `${productionDispatch.familyId}/${productionDispatch.policy}`
        };
      }
      throw new Error(
        `production registry invariant violation: committed render reached non-admission ` +
        `${productionDispatch.familyId}/${productionDispatch.policy}`
      );
    }
    if (
      productionDispatch.kind === "legacy_dispatch" &&
      options.skipFamilyId === undefined
    ) {
      return unclaimedTailRawOutcome(root);
    }
  }
  return renderCommittedTailTerminalLayer(root.tail, root.sfp, ctx);
}

const UNCLAIMED_TAIL_RAW_OP_KIND = "unclaimed_tail_raw";

function committedTailRootSourceTokens(
  root: TailRoot
): readonly (readonly [number, string])[] {
  if (root.tail.kind !== "auxLayer") return [];
  return auxLayerConsumedSourceSequence(root.tail, root.sfp)
    .map(([tokenIndex, token]) => [tokenIndex, token.surface] as const);
}

function committedTailRootSourceSpan(
  root: TailRoot
): { readonly start: number; readonly end: number } | null {
  const tokens = committedTailRootSourceTokens(root);
  const first = tokens[0];
  const last = tokens.at(-1);
  return first === undefined || last === undefined
    ? null
    : { start: first[0], end: last[0] };
}

function unclaimedTailRawOutcome(root: TailRoot): RenderOutcome {
  const tokens = committedTailRootSourceTokens(root);
  const span = committedTailRootSourceSpan(root);
  const text = tokens.map(([, surface]) => surface).join("");
  return {
    ok: true,
    text,
    polite: false,
    rawSourceSurface: true,
    warnings: [
      unsupportedGrammarRawWarning(
        UNCLAIMED_TAIL_RAW_OP_KIND,
        span,
        `unsupported grammar: no production family claimed this tail; ` +
        `the consumed source span was kept raw. surface=${text}`
      )
    ]
  };
}

export function renderCommittedTailTerminalLayer(
  layer: AuxLayerNode,
  sfp: TailRoot["sfp"],
  ctx: RenderContext
): RenderOutcome {
  const layerWithProhibition = layerWithQuotedCarrierProhibition(layer) ?? layer;
  const hostlessQuoteCarrier = renderHostlessQuoteCarrierTerminalLayer(layerWithProhibition, sfp, ctx);
  if (hostlessQuoteCarrier !== null) {
    return hostlessQuoteCarrier;
  }
  return sfp !== null
    ? renderAuxLayerWithSfp(layerWithProhibition, sfp, ctx)
    : renderAuxLayer(layerWithProhibition, ctx);
}

export function renderTailWithSourceTargetTrace(
  root: TailRoot,
  ctx: RenderContext
): RenderedTarget | null {
  if (root.tail.kind !== "auxLayer") {
    return null;
  }
  const rendered = renderTail(root, ctx);
  if (!rendered.ok) {
    return null;
  }
  if (
    rendered.traced !== undefined &&
    tracedText(rendered.traced) === rendered.text &&
    !rendered.traced.some((piece) => piece.chainFinalPlaceholder === true)
  ) {
    return {
      text: rendered.text,
      segments: tailTraceSegmentsToTargetSegments(rendered.traced)
    };
  }
  if (root.sfp !== null) {
    const baseRendered = renderTail({ tail: root.tail, sfp: null, quoteBinding: root.quoteBinding }, ctx);
    if (!baseRendered.ok) {
      return null;
    }
    if (
      baseRendered.traced === undefined ||
      tracedText(baseRendered.traced) !== baseRendered.text ||
      baseRendered.traced.some((piece) => piece.chainFinalPlaceholder === true)
    ) {
      return null;
    }
    return traceSfpTailFromBaseSegments(
      tailTraceSegmentsToTargetSegments(baseRendered.traced),
      baseRendered.text,
      rendered.text,
      root.sfp
    );
  }
  return null;
}

export function renderTailPredicateGerundProjection(root: TailRoot, ctx: RenderContext): RenderOutcome {
  if (root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "predicate gerund projection requires aux layer tail root" };
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
        createConnectiveOp({

          connective: "predicate_projection_tame_gerund",
          surface: "",
          source: { tokens: [], tokenIndices: [] }
        })
      ]
    },
    sfp: null
  };
  return renderTail(projected, ctx);
}

export function renderDerivationalSuffixHostProjection(options: {
  readonly host: TailRoot;
  readonly hostForm: "nominal_ki" | "nominal_m" | "attributive_present" | "attributive_completed";
  readonly suffixSource: OpSource;
  readonly ctx: RenderContext;
}): RenderOutcome {
  if (options.hostForm === "nominal_ki") {
    return renderTailPredicateGerundProjection(options.host, options.ctx);
  }
  const layer = options.host.tail;
  if (layer.kind !== "auxLayer") {
    return { ok: false, reason: "derivational suffix host projection requires an aux layer host" };
  }
  if (options.hostForm === "nominal_m") {
    return renderDerivationalSuffixNominalMProjection(layer, options.ctx, options.host);
  }
  const boundary = options.hostForm === "attributive_completed"
    ? derivationalSuffixAttributiveBoundary(options.suffixSource)
    : null;
  return applyStemAffixToOutcome(
    renderCommittedAttributiveTerminalLayer(
      {
        ...layer,
        terminal: "attributive",
        ...(boundary === null ? {} : { terminalPayload: boundary })
      },
      options.ctx
    ),
    layer.stem
  );
}

function renderDerivationalSuffixNominalMProjection(
  layer: AuxLayerNode,
  ctx: RenderContext,
  host: TailRoot
): RenderOutcome {
  const stem = layer.stem;
  if (stem.kind === "noun" && layer.ops.length === 0 && layer.terminal === null) {
    return applyStemAffixToOutcome({ ok: true, text: stem.lemma, polite: false }, stem);
  }
  return renderTail(
    {
      ...host,
      tail: {
        ...layer,
        terminal: null,
        ops: [...layer.ops, buildDerivationalNominalMProjectionConnective()]
      },
      sfp: null
    },
    ctx
  );
}

export function buildDerivationalNominalMProjectionConnective(): Extract<AuxOpNode, { readonly kind: "connective" }> {
  return createConnectiveOp({
    connective: "predicate_projection_derivational_nominal_m",
    surface: "",
    source: { tokens: [], tokenIndices: [] }
  });
}

function derivationalSuffixAttributiveBoundary(source: OpSource): AttributiveBoundaryPayload | null {
  const head = source.tokens[source.tokens.length - 1];
  const tokenIdx = source.tokenIndices[source.tokenIndices.length - 1];
  if (head === undefined || tokenIdx === undefined) {
    return null;
  }
  return {
    kind: "attributiveBoundary",
    source,
    head: {
      surface: head.surface,
      dictionaryForm: head.dictionaryForm,
      pos: head.pos,
      tokenIdx
    },
    headKind: "scope_or_bound",
    projectionContext: { tokens: [], contentIdx: 0 },
    projection: "ordinary_nominal",
    headRequiredComplement: { kind: "adnominal", ending: "ㄴ/은" }
  };
}

function commandQuoteCarrierCommandBase(
  layer: AuxLayerNode,
  ctx: RenderContext,
  baseOps: readonly OperatorOp[],
  preNeg: NegationOp | null
): ChainBaseResult | RenderFailure {
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return { ok: false, reason: "command quote carrier base requires verb/adj stem" };
  }
  return chainBases(
    baseOps.map(requestTerminalBaseOpForRender),
    layer.stem.lemma,
    irregularFrom(layer.stem.irregular),
    layer.stem.kind === "verb",
    {
      lookups: ctx.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
      preModalNeg: preNeg,
      stemPast: false,
      pastAfterChainIdx: new Map(),
      negAfterChainIdx: new Map(),
      formal: ctx.formal,
      shortNegationPolicy: layer.stem.shortNegationPolicy,
      absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
      ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
      passiveStemOptions: passiveStemOptionsForStem(layer.stem)
    }
  );
}

function commandQuoteCarrierTerminalBase(options: {
  readonly base: KoreanPredicateBase;
  readonly carrier: PredicateQuoteCarrierOp;
  readonly request: boolean;
  readonly preNeg: NegationOp | null;
  readonly requestForm: boolean;
}): OkBaseResult | RenderFailure {
  const complement = options.request
    ? composeBaseWithRequestComplement(options.base, false, options.preNeg, {}, options.carrier.surface)
    : composeRequestProhibitionComplement(options.base, options.carrier.surface, {
      requestForm: options.requestForm
    });
  if (!complement.ok) {
    return complement;
  }
  return {
    ok: true,
    base: {
      prefix: `${complement.text} `,
      final: predicateQuoteCarrierRestoredHost(options.carrier)
    }
  };
}

function layerWithQuotedProhibitionBeforeCarrier(layer: AuxLayerNode, source: OpSource): AuxLayerNode {
  const carrierIndex = layer.ops.findIndex(
    (op) => op.kind === "predicateQuoteCarrier" && op.style === "compact_toiu"
  );
  const prohibition: ProhibitionAspectOp = createAspectOp({
    aspect: "naide_kudasai",
    source,
    prohibition: { kind: "naide_kudasai", polite: false, requestTail: "bare" },
  });
  return {
    ...layer,
    ops: [...layer.ops.slice(0, carrierIndex), prohibition, ...layer.ops.slice(carrierIndex)],
  };
}

function layerWithQuotedCarrierProhibition(layer: AuxLayerNode): AuxLayerNode | null {
  const carrier = layer.ops.find(
    (op): op is PredicateQuoteCarrierOp =>
      op.kind === "predicateQuoteCarrier" &&
      op.style === "compact_toiu" &&
      op.quotedSfp?.effect === "na_prohib"
  );
  if (
    carrier?.quotedSfp === undefined ||
    layer.ops.some((op) => op.kind === "aspect" && op.aspect === "naide_kudasai")
  ) {
    return null;
  }
  const { quotedSfp: _consumedSfp, ...carrierWithoutSfp } = carrier;
  const stripped: AuxLayerNode = {
    ...layer,
    ops: layer.ops.map((op) => (op === carrier ? carrierWithoutSfp : op)),
  };
  return layerWithQuotedProhibitionBeforeCarrier(stripped, carrier.quotedSfp.source);
}

function renderHostlessQuoteCarrierTerminalLayer(
  layer: AuxLayerNode,
  sfp: TailRoot["sfp"],
  ctx: RenderContext
): RenderOutcome | null {
  const inner = hostlessQuoteCarrierInnerBase(layer, ctx);
  if (inner === null) {
    return null;
  }
  if (!inner.ok) {
    return inner;
  }
  const rootSfp = sfp === null ? null : loweredTerminalSfpEffect(sfp);
  const closed = rootSfp === null
    ? null
    : composeTerminalMoodOnBase(inner, null, false, ctx.formal, rootSfp.polite === true, rootSfp, ctx.lookups);
  return closed ?? composeCommittedTailTerminal(inner, null, false, ctx.formal, false, ctx.lookups);
}

function hostlessQuoteCarrierInnerBase(
  layer: AuxLayerNode,
  ctx: RenderContext
): OkBaseResult | RenderFailure | null {
  const carrier = layer.ops.at(-1);
  if (
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    layer.terminal !== null
  ) {
    return null;
  }
  if (
    carrier.quotedSfp !== undefined &&
    carrier.quotedSfp.effect !== "na_soft_imperative" &&
    quoteProjectionForSfpEffect(carrier.quotedSfp.effect, false) === "terminal_mood"
  ) {
    const quoted = renderAuxLayerWithSfp(
      { ...layer, ops: layer.ops.slice(0, -1) },
      { ...carrier.quotedSfp, quoteProjection: "terminal_mood" },
      ctx
    );
    return quoted.ok
      ? {
        ok: true,
        base: { prefix: `${quoted.text} `, final: predicateQuoteCarrierRestoredHost(carrier) }
      }
      : null;
  }
  if (carrier.sourceTerminal !== true || !layer.ops.every(isHeadOp)) {
    return null;
  }
  const requestOp = commandAttributiveAspectOp(layer.ops, isRequestCommandAspectOp);
  const prohibitionOp = requestOp === null
    ? commandAttributiveAspectOp(layer.ops, isProhibitionCommandAspectOp)
    : null;
  const commandOp = requestOp ?? prohibitionOp;
  if (commandOp === null) {
    return null;
  }
  const baseOps = attributiveCommandBaseOperatorChain(layer.ops, commandOp);
  if (!attributiveCommandHeadPatternMatches(layer.ops, commandOp, baseOps)) {
    return null;
  }
  let commandBase: KoreanPredicateBase;
  if (baseOps.length === 0) {
    if (layer.stem.kind !== "verb") {
      return null;
    }
    const stemBase = simpleStemBase(layer.stem.lemma, irregularFrom(layer.stem.irregular), true);
    commandBase = layer.stem.koreanPrefix === undefined || layer.stem.koreanPrefix.length === 0
      ? stemBase
      : { ...stemBase, prefix: layer.stem.koreanPrefix };
  } else {
    const chained = commandQuoteCarrierCommandBase(layer, ctx, baseOps, null);
    if (!chained.ok || chained.finalNeg !== null || chained.finalPast) {
      return null;
    }
    commandBase = chained.base;
  }
  return commandQuoteCarrierTerminalBase({
    base: commandBase,
    carrier,
    request: requestOp !== null,
    preNeg: null,
    requestForm: prohibitionOp === null ? false : prohibitionUsesRequestForm(prohibitionOp.prohibition)
  });
}

function renderAuxLayerWithSfp(layer: AuxLayerNode, sfp: TailRoot["sfp"], ctx: RenderContext): RenderOutcome {
  const canonicalized = canonicalizeConjectureCopulaOps(layer, ctx);
  if ("ok" in canonicalized) {
    return canonicalized;
  }
  layer = canonicalized.layer;
  ctx = canonicalized.ctx;
  const nounPostverbCarrier = tryRenderNounCopulaPostverbCarrierAsVerb(layer, ctx, (vl) => renderAuxLayerWithSfp(vl, sfp, ctx));
  if (nounPostverbCarrier !== null) {
    return nounPostverbCarrier;
  }
  if (sfp === null) {
    return renderAuxLayer(layer, ctx);
  }
  const interjection = tryRenderInterjectionAbsorbedCopula(layer, ctx, sfp);
  if (interjection !== null) {
    return interjection;
  }
  const finalConnective = layer.ops.at(-1);
  if (finalConnective?.kind === "connective" && finalConnective.connective === "te_form" && isCommittedKaQuestionSfpEffect(sfp.effect)) {
    const { outgoingBoundary: _outgoingBoundary, ...bodyContext } = ctx;
    const base = renderAuxLayer(layer, bodyContext, "connective");
    if (!base.ok) {
      return base;
    }
    const question = composeConnectiveQuestionTerminal(base, sfp);
    return sfp.emphaticQuestion === true ? appendEmphaticQuestionPunctuation(question) : question;
  }
  sfp = loweredTerminalSfpEffect(sfp);
  if (
    sfp.effect === "na_prohib" &&
    layer.ops.some((op) => op.kind === "predicateQuoteCarrier" && op.style === "compact_toiu") &&
    !layer.ops.some((op) => op.kind === "aspect" && op.aspect === "naide_kudasai")
  ) {
    return renderAuxLayer(layerWithQuotedProhibitionBeforeCarrier(layer, sfp.source), ctx);
  }
  if (sfp.quoteProjection === "terminal_mood") {
    const candidateStem = layer.stem.kind === "candidateSet" ? layer.stem : null;
    const committedStem = candidateStem === null
      ? layer.stem
      : resolveCandidateSetStem(candidateStem);
    const quotedLayer = {
      ...layer,
      stem: committedStem,
      ops: normalizeQuotedTerminalMoodOps(layer.ops, committedStem),
    };
    if (sfp.effect === "quotative_command") {
      return renderImperativeQuotativeCommand(quotedLayer, ctx) ??
        { ok: false, reason: "quotative_command SFP requires verb imperative stem" };
    }
    return renderTerminalRoleSfpFrame(quotedLayer, sfp, ctx) ??
      { ok: false, reason: "quoted terminal mood requires terminal role frame" };
  }
  const projectedMidCopula = projectMidPredicateCopulaLayer(layer, {
    projectAffirmativeBasic: true,
    projectNegativeBasic: false
  });
  if (projectedMidCopula !== null) {
    if ("ok" in projectedMidCopula) {
      return projectedMidCopula;
    }
    return renderAuxLayerWithSfp(projectedMidCopula, sfp, ctx);
  }
  const potentialBenefactiveIdx = layer.ops.findIndex(
    (op) => isBenefactiveAspectOp(op) && op.benefactive.potential
  );
  const potentialBenefactiveQuestion =
    (sfp.surface === "か" || sfp.questionRole === "request" || sfp.questionRole === "permission") &&
    potentialBenefactiveIdx >= 0 &&
    layer.ops.some((op, index) => index < potentialBenefactiveIdx && op.kind === "negation") &&
    !layer.ops.some((op) => op.kind === "tense" && op.tense === "past");
  if (sfp.questionRole === "request" || potentialBenefactiveQuestion) {
    layer = {
      ...layer,
      ops: layer.ops.map((op) =>
        isBenefactiveAspectOp(op) ? markBenefactiveRequestEvidence(op) : op
      )
    };
  }
  const terminalDiscourseConnective = renderTerminalDiscourseConnectiveSfp(layer, sfp, ctx);
  if (terminalDiscourseConnective !== null) {
    return terminalDiscourseConnective;
  }
  if (sfp.effect === null) {
    return renderContinuativeExplanatoryDiscursiveSfp(layer, sfp, ctx) ??
      renderObliqueCopulaDeMistagDiscursiveSfp(layer, sfp, ctx) ??
      renderNeutralZeroCopulaSfpFrame(layer, ctx) ??
      renderStemConjecturalSkipSfpTerminal(layer, ctx) ??
      renderAuxLayer(layer, ctx);
  }
  if (sfp.effect === "realization") {
    const realized = renderTerminalRoleSfpFrame(layer, sfp, ctx);
    if (realized !== null) {
      return realized;
    }
    if (sfp.source.tokenIndices.length === 0) {
      return renderAuxLayer(layer, ctx);
    }
    sfp = { ...sfp, effect: "ka" };
  }
  if (sfp.effect === "ka" || sfp.effect === "plain_q" || sfp.effect === "polite_q") {
    const stutterQuestion = tryRenderNounCopulaStutter(layer, true, ctx);
    if (stutterQuestion !== null) {
      return stutterQuestion;
    }
  }
  const volitionalQuestion = renderVolitionalQuestionSfp(layer, sfp, ctx);
  if (volitionalQuestion !== null) {
    return volitionalQuestion;
  }
  const requestQuestion = renderBenefactiveTerminalRequestQuestion(layer, sfp, ctx);
  if (requestQuestion !== null) {
    return requestQuestion;
  }
  const simpleStem = renderSimpleStemTerminalSfp(layer, sfp, ctx);
  if (simpleStem !== null) {
    return simpleStem;
  }
  const nounProjectionCarrierQuestion = renderNounPredicateProjectionCarrierQuestionSfp(layer, sfp, ctx);
  if (nounProjectionCarrierQuestion !== null) {
    return nounProjectionCarrierQuestion;
  }
  const predicateCopula = renderPredicateCopulaProjectionSfp(layer, sfp, ctx);
  if (predicateCopula !== null) {
    return predicateCopula;
  }
  const nounCopulaConjectureQuestion = renderNounCopulaConjectureQuestionSfp(layer, sfp, ctx);
  if (nounCopulaConjectureQuestion !== null) {
    return nounCopulaConjectureQuestion;
  }
  const scopeConjectureQuestion = renderScopeBridgeConjectureQuestionSfp(layer, sfp, ctx);
  if (scopeConjectureQuestion !== null) {
    return scopeConjectureQuestion;
  }
  if (sfp.effect === "role_cat_nya") {
    const framed = renderTerminalRoleSfpFrame(layer, sfp, ctx);
    if (framed !== null) {
      return framed;
    }
    const rendered = renderAuxLayer(layer, { ...ctx, formal: true });
    if (!rendered.ok) {
      return rendered;
    }
    return {
      ok: true,
      text: rendered.text + roleCatNyaSuffix(sfp.repeatCount),
      polite: rendered.polite,
      ...(rendered.warnings === undefined ? {} : { warnings: rendered.warnings })
    };
  }
  if (sfp.effect === "ka") {
    const questionLayer = sfp.emphaticQuestion === true
      ? layerWithoutTerminalExplanatoryNoda(layer)
      : layer;
    const negativeConfirm = hasLiteralNegativeCopulaBeforeTerminalNoda(layer)
      ? null
      : renderNegativeConfirmQuestionSfp(questionLayer, ctx);
    const question = negativeConfirm ??
      renderTerminalRoleSfpFrame(questionLayer, sfp, ctx) ??
      { ok: false as const, reason: "ka SFP requires terminal role frame" };
    return sfp.emphaticQuestion === true
      ? appendEmphaticQuestionPunctuation(question)
      : question;
  }
  if (sfp.effect === "kayo") {
    const emphatic = sfp.emphaticQuestion === true;
    const questionLayer = emphatic ? layerWithoutTerminalExplanatoryNoda(layer) : layer;
    const question = renderTerminalRoleSfpFrame(questionLayer, sfp, ctx) ??
      { ok: false as const, reason: "kayo SFP requires terminal role frame" };
    return emphatic ? appendEmphaticQuestionPunctuation(question) : question;
  }
  if (sfp.effect === "plain_q") {
    return renderNounCopulaQuoteQuestionSfp(layer, sfp, ctx) ??
      renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "plain question SFP requires terminal role frame" };
  }
  if (sfp.effect === "polite_q") {
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "polite question SFP requires terminal role frame" };
  }
  if (sfp.effect === "neg_invite_q") {
    const invite = renderNegativeInviteQuestionSfp(layer, ctx);
    if (invite !== null) {
      return invite;
    }
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "negative invite SFP requires terminal role frame" };
  }
  if (sfp.effect === "neg_plain_q") {
    const plain = renderPlainNegativeQuestionSfp(layer, ctx);
    if (plain !== null) {
      return plain;
    }
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "plain negative question SFP requires terminal role frame" };
  }
  if (sfp.effect === "neg_confirm_q") {
    const progressiveConfirm = renderProgressiveNegativeConfirmQuestionSfp(layer, ctx);
    if (progressiveConfirm !== null) {
      return progressiveConfirm;
    }
    const negativeConfirm = renderNegativeConfirmQuestionSfp(layer, ctx);
    if (negativeConfirm !== null) {
      return negativeConfirm;
    }
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "negative confirm SFP requires terminal role frame" };
  }
  if (sfp.effect === "kana") {
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "kana SFP requires terminal role frame" };
  }
  if (sfp.effect === "speaker_assertion") {
    const gradeless = { ...sfp, effect: null };
    return renderContinuativeExplanatoryDiscursiveSfp(layer, gradeless, ctx) ??
      renderObliqueCopulaDeMistagDiscursiveSfp(layer, gradeless, ctx) ??
      renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      renderAuxLayerWithSfp(layer, gradeless, ctx);
  }
  if (sfp.effect === "na_soft_imperative") {
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "na_soft_imperative SFP requires terminal role frame" };
  }
  if (sfp.effect === "ne" || sfp.effect === "na_excl" || sfp.effect === "jan" || sfp.effect === "yone_confirm" || sfp.effect === "na_prohib" || sfp.effect === "kke" || sfp.effect === "explanatory" || sfp.effect === "nante_excl" || sfp.effect === "quotative_insistent" || sfp.effect === "quotative_topic_excl") {
    const discursiveLayer = layerWithoutRedundantModalCopulaBeforeTerminalSfp(layer);
    return renderVolitionalDiscursiveSfp(discursiveLayer, sfp, ctx) ??
      renderRequestDiscursiveSfp(discursiveLayer, sfp, ctx) ??
      renderContinuativeExplanatoryDiscursiveSfp(discursiveLayer, sfp, ctx) ??
      renderObliqueCopulaDeMistagDiscursiveSfp(discursiveLayer, sfp, ctx) ??
      renderTerminalRoleSfpFrame(discursiveLayer, sfp, ctx) ??
      { ok: false, reason: `${sfp.effect} SFP requires terminal role frame` };
  }
  if (sfp.effect === "quotative_command") {
    return renderImperativeQuotativeCommand(layer, ctx) ??
      { ok: false, reason: "quotative_command SFP requires verb imperative stem" };
  }
  return { ok: false, reason: `SFP rendering for ${sfp.effect ?? "skip"} not supported` };
}

export function markBenefactiveRequestEvidence(
  op: BenefactiveAspectOp
): BenefactiveAspectOp {
  return op.requestEvidence === "terminal_question"
    ? op
    : { ...op, requestEvidence: "terminal_question" };
}

function hasLiteralNegativeCopulaBeforeTerminalNoda(layer: AuxLayerNode): boolean {
  const last = layer.ops.at(-1);
  const beforeLast = layer.ops.at(-2);
  return last?.kind === "modal" &&
    last.modal === "noda" &&
    beforeLast?.kind === "copula" &&
    beforeLast.polarity === "negative";
}

function layerWithoutTerminalExplanatoryNoda(layer: AuxLayerNode): AuxLayerNode {
  const last = layer.ops.at(-1);
  return last?.kind === "modal" && last.modal === "noda"
    ? { ...layer, ops: layer.ops.slice(0, -1) }
    : layer;
}

function appendEmphaticQuestionPunctuation(outcome: RenderOutcome): RenderOutcome {
  if (!outcome.ok || outcome.text.endsWith("?!")) {
    return outcome;
  }
  const text = outcome.text.endsWith("?") ? `${outcome.text}!` : `${outcome.text}?!`;
  return {
    ...outcome,
    text,
    ...(outcome.traced === undefined
      ? {}
      : { traced: tracedCat(outcome.traced, tracedSeg("!", [], "punctuation")) }),
  };
}

function normalizeQuotedTerminalMoodOps(
  ops: readonly AuxOpNode[],
  stem: StemNode,
): readonly AuxOpNode[] {
  const hasNoda = ops.some((op) => op.kind === "modal" && op.modal === "noda");
  const copulaBelongsToSourcePredicate = stem.kind === "adj" ||
    stem.sourcePredicateShape === "na_adjective" ||
    (stem.kind === "verb" && hasNoda);
  let normalized = copulaBelongsToSourcePredicate
    ? ops.flatMap((op, index) => {
      if (op.kind !== "copula" || op.variant !== "basic" || (index !== 0 && !hasNoda)) {
        return [op];
      }
      return op.polarity === "negative"
        ? [predicateCopulaNegationOp(op, null)]
        : [];
    })
    : [...ops];
  normalized = normalized.filter((op, index) => !(
    stem.kind !== "noun" &&
    op.kind === "copula" &&
    op.variant === "basic" &&
    op.polarity === "affirmative" &&
    normalized[index + 1]?.kind === "scopeBridge"
  ));
  if (stem.kind === "verb") {
    const nodaIndexes = normalized.flatMap((op, index) => op.kind === "modal" && op.modal === "noda" ? [index] : []);
    const lastNoda = nodaIndexes.at(-1);
    if (lastNoda !== undefined && nodaIndexes.length > 1) {
      normalized = normalized.filter((op, index) =>
        !(op.kind === "modal" && op.modal === "noda" && index !== lastNoda)
      );
    }
  }
  return normalized;
}

function layerWithoutRedundantModalCopulaBeforeTerminalSfp(layer: AuxLayerNode): AuxLayerNode {
  const last = layer.ops.at(-1);
  const previous = layer.ops.at(-2);
  if (
    last?.kind !== "copula" ||
    last.variant !== "basic" ||
    last.polarity !== "affirmative" ||
    last.polite ||
    previous?.kind !== "modal" ||
    (previous.modal !== "rashii" && previous.modal !== "youda")
  ) {
    return layer;
  }
  return {
    ...layer,
    ops: layer.ops.slice(0, -1)
  };
}

function renderNounPredicateProjectionCarrierQuestionSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (
    layer.stem.kind !== "noun" ||
    layer.ops[0]?.kind !== "predicateProjectionCarrier" ||
    (sfp.effect !== "ka" && sfp.effect !== "plain_q" && sfp.effect !== "polite_q")
  ) {
    return null;
  }
  const built = buildNounPredicateProjectionCarrier(layer.stem.lemma, layer.ops, ctx);
  if (!built.ok) {
    return built;
  }
  if (built.connective !== null || built.postOps.length > 0) return null;
  return composeCommittedTailQuestionTerminal(
    built.baseResult,
    null,
    built.carrier.past === true,
    ctx.formal,
    built.postPolite || built.carrier.polite === true,
    sfp.effect,
    false,
    ctx.lookups
  );
}

function renderImperativeQuotativeCommand(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  void ctx;
  if (layer.stem.kind !== "verb" || layer.ops.length > 0) {
    return null;
  }
  const body = conjugate(layer.stem.lemma, irregularFrom(layer.stem.irregular), "(으)라고");
  return { ok: true, text: `${layer.stem.koreanPrefix ?? ""}${body}`, polite: false };
}

function renderVolitionalDiscursiveSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (sfp.effect !== "ne" && sfp.effect !== "na_excl" && sfp.effect !== "jan" && sfp.effect !== "kke") {
    return null;
  }
  if (!layerHasVolitionalTerminalSource(layer)) {
    return null;
  }
  return renderAuxLayer(layer, ctx);
}

export function copulaContinuativeExplanatoryClosureApplies(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  lookups: LookupTables
): boolean {
  if (!isCopulaContinuativeExplanatoryLayer(layer)) {
    return false;
  }
  if (copulaContinuativeObliqueHostKind(layer, lookups) !== null) {
    return false;
  }
  return (
    sfp.effect === "ne" ||
    sfp.effect === "na_excl" ||
    (sfp.effect === null && isTerminalSkipSfpSurface(sfp.surface))
  );
}

type CopulaContinuativeObliqueHostKind = "place" | "instrument" | "temporal";

export function copulaContinuativeObliqueRecoveryApplies(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  lookups: LookupTables
): boolean {
  return (
    sfp.effect === "ne" ||
    sfp.effect === "na_excl" ||
    (sfp.effect === null && isTerminalSkipSfpSurface(sfp.surface))
  ) &&
    layer.stem.kind === "noun" &&
    copulaContinuativeObliqueHostKind(layer, lookups) !== null;
}

function copulaContinuativeObliqueHostKind(
  layer: AuxLayerNode,
  lookups: LookupTables
): CopulaContinuativeObliqueHostKind | null {
  if (!isCopulaContinuativeExplanatoryLayer(layer)) {
    return null;
  }
  const hostNounForm = continuativeExplanatoryHostNounForm(layer.stem);
  if (
    hostNounForm === undefined ||
    lookups.COPULA_DE_PREDICATE_EXTRA_HOST_NOUNS.has(hostNounForm)
  ) {
    return null;
  }
  if (lookups.PLACE_NOUNS.has(hostNounForm)) {
    return "place";
  }
  if (lookups.INSTRUMENT_NOUNS.has(hostNounForm)) {
    return "instrument";
  }
  if (lookups.AFTER_DE_TEMPORAL_HEADS.has(hostNounForm)) {
    return "temporal";
  }
  return null;
}

function renderContinuativeExplanatoryDiscursiveSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (!copulaContinuativeExplanatoryClosureApplies(layer, sfp, ctx.lookups)) {
    return null;
  }
  const base = renderAuxLayer(layer, ctx);
  if (!base.ok) {
    return null;
  }
  const tail = ctx.formal ? "말이죠" : "말이야";
  return {
    ok: true,
    text: `${base.text} ${tail}`,
    polite: ctx.formal,
    ...(base.warnings === undefined ? {} : { warnings: base.warnings })
  };
}

function renderTerminalDiscourseConnectiveSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  const last = layer.ops.at(-1);
  if (last?.kind !== "connective" || last.terminalDiscourseHost !== true || sfp.effect === null) {
    return null;
  }
  const base = renderAuxLayer(layer, ctx);
  if (!base.ok) {
    return null;
  }
  const tail = composeTerminalDiscourseTailSegment(
    TERMINAL_DISCOURSE_TAIL_NOUN,
    sfp.effect,
    ctx.formal,
    base.polite
  );
  if (tail === null) {
    return null;
  }
  return {
    ok: true,
    text: `${base.text} ${tail}`,
    polite: base.polite,
    ...(base.warnings === undefined ? {} : { warnings: base.warnings })
  };
}

const TERMINAL_DISCOURSE_TAIL_NOUN = "말";

function renderObliqueCopulaDeMistagDiscursiveSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (!copulaContinuativeObliqueRecoveryApplies(layer, sfp, ctx.lookups)) {
    return null;
  }
  const obliqueKind = copulaContinuativeObliqueHostKind(layer, ctx.lookups)!;
  const stem = layer.stem as Extract<StemNode, { kind: "noun" }>;
  const suffix =
    obliqueKind === "place" ? "에서" :
    obliqueKind === "instrument" ? selectParticle(stem.lemma, "으로/로") :
    "에";
  return {
    ok: true,
    text: `${stem.lemma}${suffix}`,
    polite: false
  };
}

function continuativeExplanatoryHostNounForm(stem: StemNode): string | undefined {
  if (!stemSupportsProjectionCategory(stem, "nominal")) {
    return undefined;
  }
  return stem.source.tokens[stem.semanticAnchors[0] ?? 0]?.dictionaryForm;
}

function isCopulaContinuativeExplanatoryLayer(layer: AuxLayerNode): boolean {
  if (layer.terminal !== "renyou_chuushi") {
    return false;
  }
  if (
    layer.stem.kind !== "noun" &&
    layer.stem.kind !== "adj" &&
    layer.stem.kind !== "verb" &&
    layer.stem.kind !== "candidateSet"
  ) {
    return false;
  }
  const payload = layer.terminalPayload;
  const markerTokens = payload?.kind === "renyouChuushi" ? payload.source.tokens : [];
  return markerTokens.some((token) =>
    token.surface === "で" && (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ)
  );
}

function layerHasVolitionalTerminalSource(layer: AuxLayerNode): boolean {
  if (layer.stem.kind !== "verb") {
    return false;
  }
  const terminalOps = layer.ops.filter((op) => !isHeadOp(op));
  const headOps = layer.ops.filter(isHeadOp);
  const volitionalPolite = terminalOps.find((op) =>
    op.kind === "polite" && ((op.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_
  );
  const stemIsVolitional = stemInflectionCarriesVolitionalMood(layer.stem);
  const sourceVolitionalHead = headOps.some((op) => isSourceVolitionalChainableHead(op, layer.ops));
  if (volitionalPolite === undefined && !stemIsVolitional && !sourceVolitionalHead) {
    return false;
  }
  if (volitionalPolite !== undefined) {
    return terminalOps.length === 1 && headOps.every(isChainableHeadOp);
  }
  return terminalOps.length === 0 && headOps.every(isChainableHeadOp);
}

function isSourceVolitionalChainableHead(op: AuxOpNode, ops: readonly AuxOpNode[]): boolean {
  return isChainableHeadOp(op) && opSourceIsVolitionalInChain(op, ops);
}

function negativeConfirmHostAbsorbedBoundNounPrefix(
  hostLayer: AuxLayerNode,
  bridge: ScopeBridgeOp,
  ctx: RenderContext
): string | null {
  const frame = terminalRoleFrameFromAuxLayer(hostLayer, ctx);
  if (frame === null || "ok" in frame || !frame.baseResult.ok) {
    return null;
  }
  if (frame.finalNeg !== null || frame.polite) {
    return null;
  }
  const lowered = copulaCarrierBaseForInterOp(frame.baseResult.base, ctx.formal);
  if (lowered === null) {
    return null;
  }
  return scopeBridgeHeadAbsorbedHostPrefix(bridge, lowered, frame.past);
}

function renderNegativeConfirmQuestionSfp(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  const directProjection = renderDirectNegativeConfirmQuestionSfp(layer);
  if (directProjection !== null) {
    return {
      ok: true,
      text: directProjection,
      polite: false
    };
  }

  const confirmLayer = stripTerminalNodaAfterNegativeNoBridge(layer);
  const bridge = confirmLayer.ops.at(-1);
  if (
    bridge?.kind !== "scopeBridge" ||
    bridge.polarity !== "negative" ||
    bridge.chainDepth !== 1
  ) {
    return null;
  }

  const hostLayer: AuxLayerNode = { ...confirmLayer, ops: confirmLayer.ops.slice(0, -1) };
  const confirmSuffix = ctx.formal ? "게 아닙니까" : bridge.polite ? "거잖아요" : "거잖아";
  const confirmPolite = ctx.formal || bridge.polite;
  if (bridge.head !== null) {
    const absorbedHostPrefix = negativeConfirmHostAbsorbedBoundNounPrefix(hostLayer, bridge, ctx);
    if (absorbedHostPrefix !== null) {
      return {
        ok: true,
        text: ensureQuestionPunctuation(`${absorbedHostPrefix}${confirmSuffix}`),
        polite: confirmPolite
      };
    }
    const attr = renderAuxLayerAttributiveTerminal(hostLayer, ctx);
    if (!attr.ok) {
      return attr;
    }
    return {
      ok: true,
      text: ensureQuestionPunctuation(`${attr.text} ${confirmSuffix}`),
      polite: confirmPolite,
      ...(attr.warnings === undefined ? {} : { warnings: attr.warnings })
    };
  }

  const direct = renderHeadlessNegativeConfirmHost(hostLayer);
  if (direct !== null) {
    return {
      ok: true,
      text: ensureQuestionPunctuation(direct),
      polite: false
    };
  }

  const frame = terminalRoleFrameFromAuxLayer(hostLayer, ctx);
  if (frame === null) {
    return { ok: false, reason: "negative-confirm SFP requires host terminal role frame" };
  }
  if ("ok" in frame) {
    return frame;
  }
  const confirmed = composeCommittedTailDiscursiveSfp(
    frame.baseResult,
    frame.finalNeg,
    frame.past,
    ctx.formal,
    false,
    "jan",
    ctx.lookups
  );
  if (!confirmed.ok) {
    return confirmed;
  }
  return withStemPrefixApplied({
    ...confirmed,
    text: ensureQuestionPunctuation(confirmed.text),
    polite: false
  });
}

function applyStemAffixToOutcome(outcome: RenderOutcome, stem: StemNode): RenderOutcome {
  if (!outcome.ok) {
    return outcome;
  }
  if (outcome.rawSourceSurface === true) {
    return outcome;
  }
  const prefix = outcome.stemPrefixApplied === true ? "" : stem.koreanPrefix ?? "";
  const suffix = stem.koreanSuffix ?? "";
  if (prefix.length === 0 && suffix.length === 0) {
    return outcome;
  }
  const prefixedText = concatPredicatePrefix(prefix, outcome.text);
  const text = `${prefixedText}${suffix}`;
  if (outcome.traced === undefined) {
    return { ...outcome, text };
  }
  const prefixed = prefix.length === 0
    ? outcome.traced
    : tracedFuse(tracedStemHostSeg(stem, prefix, stem.source.tokens, "lexeme", "semantic"), outcome.traced, prefixedText);
  const traced = suffix.length === 0
    ? prefixed
    : tracedCat(prefixed, tracedSeg(suffix, stem.source.tokens, "lexeme", "semantic"));
  return { ...outcome, text, traced };
}

function renderPredicateCopulaProjection(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  const projection = projectPredicateCopulaLayer(layer, ctx);
  if (projection === null) {
    return { ok: false, reason: "predicate copula projection requires CopulaOp as first op" };
  }
  if ("ok" in projection) {
    return projection;
  }
  return renderAuxLayer(projection.layer, projection.ctx);
}

function renderPredicateCopulaProjectionSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  const projection = projectPredicateCopulaLayer(layer, ctx);
  if (projection === null) {
    return null;
  }
  if ("ok" in projection) {
    return projection;
  }
  return renderAuxLayerWithSfp(projection.layer, sfp, projection.ctx);
}

function renderNeutralZeroCopulaSfpFrame(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.stem.kind !== "noun" || layer.ops.length !== 0 || layer.terminal !== null) {
    return null;
  }
  const frame = terminalRoleFrameFromAuxLayer(layer, ctx);
  if (frame === null) {
    return null;
  }
  if ("ok" in frame) {
    return withStemPrefixApplied(frame);
  }
  return withStemPrefixApplied(composeCommittedTailTerminal(
    frame.baseResult,
    frame.finalNeg,
    frame.past,
    ctx.formal,
    frame.polite,
    ctx.lookups
  ));
}

function renderScopeBridgeConjectureQuestionSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (sfp.effect !== "ka" && sfp.effect !== "plain_q" && sfp.effect !== "polite_q") {
    return null;
  }
  if (
    !layer.ops.some((op) => op.kind === "conjecture") ||
    !layer.ops.some((op) => op.kind === "scopeBridge" || (op.kind === "modal" && op.modal !== "souda_hearsay"))
  ) {
    return null;
  }
  const conjectureIndex = layer.ops.findIndex((op) => op.kind === "conjecture");
  const conjecture = conjectureIndex < 0 ? null : layer.ops[conjectureIndex];
  const negativeNoScope = layer.ops.some((op, index) =>
    index < conjectureIndex &&
    op.kind === "scopeBridge" &&
    op.head === "no" &&
    op.polarity === "negative"
  );
  if (
    negativeNoScope &&
    conjecture?.kind === "conjecture" &&
    sfpHasSelfDirectedConjectureRole(sfp)
  ) {
    const frame = terminalRoleFrameFromAuxLayer(layer, ctx);
    if (frame !== null && !("ok" in frame)) {
      return withStemPrefixApplied(composeCommittedTailQuestionTerminal(
        frame.baseResult,
        frame.finalNeg,
        frame.past,
        ctx.formal,
        frame.polite || conjecture.polite,
        sfp.effect,
        true,
        ctx.lookups,
      ));
    }
  }
  const rendered = renderAuxLayer(layer, ctx);
  if (!rendered.ok) {
    return rendered;
  }
  const questionPolite = sfp.effect === "polite_q" ||
    layer.ops.some((op) => op.kind === "conjecture" && op.polite);
  const polite = rendered.polite || questionPolite;
  const selfDirectedConjecture = sfpHasSelfDirectedConjectureRole(sfp);
  let compactedQuestion = selfDirectedConjecture
    ? composeRenderedNominalizedConjectureQuestion(rendered.text, questionPolite)
    : null;
  if (selfDirectedConjecture && compactedQuestion === null && ctx.formal) {
    const casualRendered = renderAuxLayer(layer, { ...ctx, formal: false });
    if (casualRendered.ok) {
      compactedQuestion = composeRenderedNominalizedConjectureQuestion(casualRendered.text, questionPolite);
    }
  }
  return {
    ok: true,
    text: ensureQuestionPunctuation(compactedQuestion ?? rendered.text),
    polite,
    ...(rendered.stemPrefixApplied === true ? { stemPrefixApplied: true } : {}),
    ...(rendered.warnings === undefined ? {} : { warnings: rendered.warnings })
  };
}

function tryRenderNounCopulaStutter(
  layer: AuxLayerNode,
  question: boolean,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.stem.kind !== "noun") {
    return null;
  }
  const ops = layer.ops;
  const copula = ops[0];
  if (
    copula === undefined ||
    copula.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "affirmative" ||
    !copula.polite
  ) {
    return null;
  }
  const rest = ops.slice(1);
  if (rest.length === 0 || !rest.every((op) => op.kind === "polite")) {
    return null;
  }
  const auxTokens = ops.flatMap((op) => [...op.source.tokens]);
  const chunks = splitFunctionalAuxChunks(auxTokens);
  if (chunks === null || isNormalFunctionalChain(chunks)) {
    return null;
  }
  const text = renderRepeatedFunctionalChainText({
    koreanLemma: layer.stem.lemma,
    irregular: null,
    koreanPos: 명사,
    chunks,
    formal: ctx.formal,
    question,
    forcePassive: false,
    lookups: ctx.lookups
  });
  return { ok: true, text, polite: true };
}

function renderBareNounQuoteConnective(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  if (layer.stem.kind !== "noun" || layer.ops.length !== 1) {
    return null;
  }
  const connective = layer.ops[0];
  if (connective?.kind !== "connective" || !isBareNounStemQuoteConnective(connective)) {
    return null;
  }
  const connectiveForComposition = connectiveForRender(connective, ctx);
  const baseResult = {
    ok: true,
    base: nounCopulaBase(layer.stem.lemma, false, nounCopulaStemAllomorphHost(layer.stem, ctx)),
    chainOnFinalSupported: true
  } satisfies OkBaseResult;
  const connectiveBase = baseResultForNounCopulaConnective(baseResult, layer.stem, connectiveForComposition);
  return composeCommittedTailConnective(
    connectiveBase,
    connectiveForComposition,
    false,
    false,
    null,
    ctx.formal,
    ctx.lookups
  );
}

function renderNominalFocusConnective(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  if (layer.stem.kind !== "noun" || layer.ops.length !== 1) {
    return null;
  }
  const op = layer.ops[0];
  if (op?.kind !== "connective") {
    return null;
  }
  const directSuffix = nominalFocusConnectiveSuffix(layer.stem.lemma, op);
  if (directSuffix !== null) {
    return {
      ok: true,
      text: `${layer.stem.lemma}${directSuffix}`,
      polite: false,
      traced: [
        ...tracedSeg(layer.stem.lemma, layer.stem.source.tokens, "lexeme", "semantic"),
        ...tracedSeg(directSuffix, op.source.tokens, "connective", "semantic")
      ]
    };
  }
  if (op.connective === "focus_limit_de" && op.surface === "だけで") {
    const rendered = composeCommittedTailConnective(
      {
        ok: true,
        base: nounCopulaBase(`${layer.stem.lemma}만`, false),
        chainOnFinalSupported: true
      },
      {
        ...op,
        connective: "listing",
        surface: "し"
      },
      false,
      false,
      null,
      ctx.formal,
      ctx.lookups
    );
    if (!rendered.ok) {
      return rendered;
    }
    const focusText = `${layer.stem.lemma}만`;
    if (!rendered.text.startsWith(focusText)) {
      return rendered;
    }
    const suffix = rendered.text.slice(focusText.length);
    const focusToken = op.source.tokens[0];
    const suffixTokens = op.source.tokens.slice(1);
    return {
      ...rendered,
      traced: [
        ...tracedSeg(layer.stem.lemma, layer.stem.source.tokens, "lexeme", "semantic"),
        ...tracedSeg("만", focusToken === undefined ? op.source.tokens : [focusToken], "aux", "semantic"),
        ...tracedSeg(suffix, suffixTokens, "connective", "semantic")
      ]
    };
  }
  return null;
}

function nominalFocusConnectiveSuffix(lemma: string, connective: ConnectiveOp): string | null {
  if (!isBareNounStemFocusConnective(connective.connective)) {
    return null;
  }
  switch (connective.connective) {
    case "focus_additive_denaku":
    case "focus_additive_negative":
      return " 뿐만 아니라";
    case "focus_reversal_dokoro_ka":
      return selectParticle(lemma, "은/는커녕");
    case "focus_limit_de":
      if (connective.surface === "だけで") {
        return null;
      }
      if (connective.surface.endsWith("でも")) {
        return "만으로도";
      }
      if (connective.surface.endsWith("では")) {
        return "만으로는";
      }
      return "만으로";
    case "focus_limit_nara":
      return "만이라면";
  }
}

function implicitAffirmativeCopulaOp(): Extract<AuxOpNode, { readonly kind: "copula" }> {
  return createCopulaOp({
    source: { tokens: [], tokenIndices: [] },
    variant: "basic",
    polarity: "affirmative",
    polite: false
  });
}

function nominalTargetCopulaBridgeOps(ops: readonly AuxOpNode[]): readonly AuxOpNode[] {
  const head = ops[0];
  if (
    head?.kind === "negation" &&
    head.chainDepth === 1 &&
    head.inner === undefined &&
    head.focusParticle === undefined
  ) {
    return [
      createCopulaOp({
        source: head.source,
        variant: "basic",
        polarity: "negative",
        polite: false
      }),
      ...(head.chainPast
        ? [createTenseOp({ source: { tokens: [], tokenIndices: [] }, tense: "past" })]
        : []),
      ...ops.slice(1)
    ];
  }
  return [implicitAffirmativeCopulaOp(), ...ops];
}

function renderNounCopula(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.stem.kind !== "noun") {
    return { ok: false, reason: "renderNounCopula: stem must be noun" };
  }
  const stutter = tryRenderNounCopulaStutter(layer, false, ctx);
  if (stutter !== null) {
    return stutter;
  }
  const noun = layer.stem.lemma;
  if (noun.length === 0) {
    return { ok: false, reason: "noun lemma is empty" };
  }
  const interjection = tryRenderInterjectionAbsorbedCopula(layer, ctx);
  if (interjection !== null) {
    return interjection;
  }
  if (
    layer.ops[0]?.kind !== "copula" &&
    stemIsAdjectivalSourceWithNominalTarget(layer.stem)
  ) {
    return renderNounCopula(
      { ...layer, ops: nominalTargetCopulaBridgeOps(layer.ops) },
      ctx
    );
  }
  const ops = layer.ops;
  if (ops[0]?.kind === "modal" && ops[0].modal === "youda") {
    return renderNominalHostLikeness(noun, ops, ctx);
  }
  if (isTosuruPredicateCarrier(ops[0])) {
    return renderNounTosuruPredicateCarrier(layer.stem, ops, ctx);
  }
  if (ops[0]?.kind === "predicateProjectionCarrier") {
    return renderNounPredicateProjectionCarrier(noun, ops, ctx, layer.stem.source.tokens);
  }
  if (ops[0]?.kind === "scopeBridge") {
    return renderNounScopeBridge(layer, ctx);
  }
  const nominalFocusConnective = renderNominalFocusConnective(layer, ctx);
  if (nominalFocusConnective !== null) {
    return nominalFocusConnective;
  }
  const bareQuoteConnective = renderBareNounQuoteConnective(layer, ctx);
  if (bareQuoteConnective !== null) {
    return bareQuoteConnective;
  }
  if (ops.length === 0) {
    return { ok: true, text: noun, polite: false };
  }
  if (
    ops.length === 1 &&
    ops[0]?.kind === "connective" &&
    isQuestionContentConnective(ops[0])
  ) {
    if (ops[0].questionContentRole === "terminal") {
      const base = nounCopulaBase(noun, false, nounCopulaStemAllomorphHost(layer.stem, ctx, noun));
      return composeCommittedTailQuestionTerminal(
        {
          ok: true,
          base: {
            ...base,
            prefix: `${layer.stem.koreanPrefix ?? ""}${base.prefix}`
          },
          chainOnFinalSupported: true
        },
        null,
        false,
        ctx.formal,
        false,
        "ka",
        false,
        ctx.lookups
      );
    }
    const implicitCopula: Extract<AuxOpNode, { readonly kind: "copula" }> = createCopulaOp({

      source: { tokens: [], tokenIndices: [] },
      variant: "basic",
      polarity: "affirmative",
      polite: false
    });
    return renderNounCopula({ ...layer, ops: [implicitCopula, ...ops] }, ctx);
  }
  if (
    ops.length === 1 &&
    ops[0]?.kind === "connective" &&
    isBareNounStemImplicitCopulaConnective(ops[0])
  ) {
    const implicitCopula: Extract<AuxOpNode, { readonly kind: "copula" }> = createCopulaOp({

      source: { tokens: [], tokenIndices: [] },
      variant: "basic",
      polarity: "affirmative",
      polite: false
    });
    return renderNounCopula({ ...layer, ops: [implicitCopula, ...ops] }, ctx);
  }
  if (isChainableHeadOp(ops[0]!)) {
    if (
      ops.length === 2 &&
      ops[0]?.kind === "conjecture" &&
      ops[1]?.kind === "conjecture"
    ) {
      const rendered = composeNounCopulaBaseWithConjecture(
        nounCopulaBase(noun, false, nounCopulaStemAllomorphHost(layer.stem, ctx, noun)),
        false,
        ctx.formal,
        false,
        ops[0].polite,
        ctx.lookups
      );
      if (!rendered.ok) return rendered;
      return {
        ok: true,
        text: `${rendered.text}${residualConjectureSuffix(ops[1])}`,
        polite: rendered.polite || ops[1].polite
      };
    }
    const implicitCopula: Extract<AuxOpNode, { readonly kind: "copula" }> = createCopulaOp({

      source: { tokens: [], tokenIndices: [] },
      variant: "basic",
      polarity: "affirmative",
      polite: false
    });
    const implicitLayer: AuxLayerNode & { readonly stem: NounStem } = {
      ...layer,
      stem: layer.stem,
      ops: [implicitCopula, ...ops]
    };
    const implicitLastOp = ops.at(-1);
    if (
      ops[0]?.kind === "conjecture" &&
      implicitLastOp?.kind === "connective" &&
      (
        implicitLastOp.connective === "quotative" ||
        isConjectureQuestionContinuationConnective(implicitLastOp)
      )
    ) {
      return renderNounCopula(implicitLayer, ctx);
    }
    const centralized = tryRenderNounCopulaInitialBaseOperatorChain(
      implicitLayer,
      implicitCopula,
      ctx,
      { admitSingleHead: true }
    );
    if (centralized !== null) {
      return centralized;
    }
  }
  if (ops[0]!.kind !== "copula") {
    return { ok: false, reason: "noun stem requires CopulaOp as first op" };
  }
  const copula = ops[0];
  if (
    copula.basicForm === "adverbial_ni" &&
    ops.length === 2 &&
    ops[1]?.kind === "copula" &&
    ops[1].variant === "basic" &&
    ops[1].polarity === "affirmative"
  ) {
    const adverbial = renderAuxLayerAdverbialModifierTerminal({
      ...layer,
      ops: [copula],
      terminal: null
    }, ctx);
    if (!adverbial.ok) return adverbial;
    return {
      ok: true,
      text: `${adverbial.text} ${ctx.formal ? "말이다" : "말이야"}`,
      polite: false
    };
  }
  const nominalPredicate = nominalPredicateStemFromNounLemma(layer.stem);
  if (
    nominalPredicate !== null &&
    copula.variant === "basic" &&
    copula.polarity === "affirmative"
  ) {
    const projectedLayer: AuxLayerNode = {
      ...layer,
      stem: nominalPredicate,
      ops: ops.slice(1)
    };
    return applyStemAffixToOutcome(renderAuxLayer(projectedLayer, ctx), nominalPredicate);
  }

  const centralizedOperatorChain = tryRenderNounCopulaInitialBaseOperatorChain(
    { ...layer, stem: layer.stem },
    copula,
    ctx
  );
  if (centralizedOperatorChain !== null) {
    return centralizedOperatorChain;
  }

  let polite = copula.polite;
  let past = false;
  let chainDepth = 0;
  let externalNegation: NegationOp | null = null;
  let connective: ConnectiveOp | null = null;
  let conjecture: ConjectureOp | null = null;
  const modalChain: ModalOp[] = [];
  let obligation: ObligationIdiomOp | null = null;
  let experience: ExperienceIdiomOp | null = null;
  let postModalNeg: NegationOp | null = null;
  let postModalPast = false;
  let postModalPolite = false;
  const postModalPastTokensByChainIndex = new Map<number, TenseOp["source"]["tokens"]>();
  let hostPastTokens: TenseOp["source"]["tokens"] = [];
  let soudaHearsay: SoudaHearsayModalOp | null = null;
  let scopeBridge: ScopeBridgeOp | null = null;
  let postverbAuxiliary: PostverbAuxiliaryOp | null = null;
  let predicateQuoteCarrier: PredicateQuoteCarrierOp | null = null;
  let projectionCarrier: PredicateProjectionCarrierOp | null = null;
  const postPredicateQuoteOps: AuxOpNode[] = [];
  let postPredicateQuotePolite = false;
  let postScopePolite = false;
  let postScopePast = false;
  const postScopeOps: AuxOpNode[] = [];
  for (let i = 1; i < ops.length; i++) {
    const op = ops[i]!;
    if (predicateQuoteCarrier !== null) {
      if (op.kind === "connective") {
        if (connective !== null) {
          return { ok: false, reason: "multiple connective ops after noun copula predicate quote carrier not supported" };
        }
        if (i !== ops.length - 1) {
          return { ok: false, reason: "ConnectiveOp after noun copula predicate quote carrier must be last" };
        }
        connective = op;
        continue;
      }
      if (op.kind === "polite") {
        postPredicateQuotePolite = true;
        continue;
      }
      if (op.kind === "tense" || op.kind === "negation" || isChainableHeadOp(op)) {
        postPredicateQuoteOps.push(op);
        continue;
      }
      return { ok: false, reason: `op '${op.kind}' after noun copula predicate quote carrier not supported` };
    }
    if (projectionCarrier !== null && op.kind !== "connective") {
      return { ok: false, reason: `op '${op.kind}' after noun copula projection carrier not supported` };
    }
    if (op.kind === "connective") {
      if (connective !== null) {
        return { ok: false, reason: "multiple connective ops in noun copula layer not supported" };
      }
      if (i !== ops.length - 1) {
        return { ok: false, reason: "ConnectiveOp on noun copula must be last" };
      }
      connective = op;
      continue;
    }
    if (op.kind === "scopeBridge") {
      if (scopeBridge !== null) {
        return { ok: false, reason: "multiple scopeBridge ops in noun copula layer not supported" };
      }
      scopeBridge = op;
      continue;
    }
    if (op.kind === "conjecture") {
      if (scopeBridge !== null) {
        postScopeOps.push(op);
        continue;
      }
      if (conjecture !== null) {
        return { ok: false, reason: "multiple conjecture ops in noun copula layer not supported" };
      }
      const followedByFinalConnective =
        i === ops.length - 2 && ops[i + 1]?.kind === "connective";
      if (i !== ops.length - 1 && !followedByFinalConnective) {
        return { ok: false, reason: "ConjectureOp on noun copula must be last" };
      }
      conjecture = op;
      continue;
    }
    if (op.kind === "idiom" && op.idiom === "obligation") {
      if (obligation !== null) {
        return { ok: false, reason: "multiple obligation ops in noun copula layer not supported" };
      }
      if (modalChain.length > 0 || soudaHearsay !== null || conjecture !== null || scopeBridge !== null) {
        return { ok: false, reason: "noun copula + obligation + mixed operator not supported" };
      }
      obligation = op;
      continue;
    }
    if (op.kind === "idiom" && op.idiom === "experience_koto_ga_aru") {
      if (experience !== null) {
        return { ok: false, reason: "multiple experience ops in noun copula layer not supported" };
      }
      if (
        modalChain.length > 0 || soudaHearsay !== null || conjecture !== null ||
        scopeBridge !== null || obligation !== null || postverbAuxiliary !== null ||
        projectionCarrier !== null
      ) {
        return { ok: false, reason: "noun copula + experience + mixed operator not supported" };
      }
      experience = op;
      continue;
    }
    if (op.kind === "modal" && op.modal !== "souda_hearsay") {
      if (scopeBridge !== null) {
        postScopeOps.push(op);
        continue;
      }
      if (soudaHearsay !== null || conjecture !== null || scopeBridge !== null) {
        return { ok: false, reason: "noun copula + mixed modal/scope/conjecture not supported" };
      }
      modalChain.push(op);
      continue;
    }
    if (op.kind === "postverbAuxiliary") {
      if (postverbAuxiliary !== null) {
        return { ok: false, reason: "multiple postverb auxiliary ops on noun copula not supported" };
      }
      if (
        !isStateChangePostverbAuxiliaryKind(op.auxiliary.kind) &&
        op.auxiliary.kind !== "appearance_perception"
      ) {
        return { ok: false, reason: "noun copula supports only state-change/appearance-perception postverb auxiliary" };
      }
      const admitsNegativeCopulaHost = op.auxiliary.kind === "appearance_perception" ||
        isStateChangePostverbAuxiliaryKind(op.auxiliary.kind);
      if (
        copula.variant !== "basic" ||
        (copula.polarity !== "affirmative" && !(admitsNegativeCopulaHost && copula.polarity === "negative"))
      ) {
        return { ok: false, reason: "noun copula postverb auxiliary requires affirmative basic copula" };
      }
      postverbAuxiliary = op;
      continue;
    }
    if (op.kind === "predicateQuoteCarrier") {
      if (predicateQuoteCarrier !== null) {
        return { ok: false, reason: "multiple predicate quote carriers on noun copula not supported" };
      }
      predicateQuoteCarrier = op;
      continue;
    }
    if (op.kind === "predicateProjectionCarrier") {
      if (modalChain.length > 0 || soudaHearsay !== null || conjecture !== null || scopeBridge !== null || postverbAuxiliary !== null || obligation !== null) {
        return { ok: false, reason: "noun copula + projection carrier mixed operator not supported" };
      }
      projectionCarrier = op;
      continue;
    }
    if (op.kind === "modal" && op.modal === "souda_hearsay") {
      if (soudaHearsay !== null) {
        return { ok: false, reason: "multiple souda hearsay ops in noun copula layer not supported" };
      }
      if (modalChain.length > 0) {
        return { ok: false, reason: "noun copula + mixed modal/souda not supported" };
      }
      if (op.reading !== "hearsay") {
        return { ok: false, reason: "souda yotai on noun copula not supported" };
      }
      soudaHearsay = op;
      continue;
    }
    if (op.kind === "polite") {
      if (scopeBridge !== null) {
        postScopePolite = true;
      } else if (
        modalChain.length > 0 || postverbAuxiliary !== null || obligation !== null ||
        experience !== null
      ) {
        postModalPolite = true;
      } else {
        polite = true;
      }
      continue;
    }
    if (op.kind === "tense" && op.tense === "past") {
      if (scopeBridge !== null) {
        postScopePast = true;
        postScopeOps.push(op);
      } else if (
        modalChain.length > 0 || postverbAuxiliary !== null || obligation !== null ||
        experience !== null
      ) {
        postModalPast = true;
        if (modalChain.length > 0) {
          const chainIndex = modalChain.length - 1;
          postModalPastTokensByChainIndex.set(chainIndex, [
            ...(postModalPastTokensByChainIndex.get(chainIndex) ?? []),
            ...op.source.tokens
          ]);
        }
      } else {
        past = true;
        hostPastTokens = [...hostPastTokens, ...op.source.tokens];
      }
      continue;
    }
    if (op.kind === "negation") {
      if (scopeBridge !== null) {
        postScopeOps.push(op);
        continue;
      }
      if (modalChain.length > 0 || postverbAuxiliary !== null || experience !== null) {
        if (postModalNeg !== null) {
          return { ok: false, reason: "multiple post-modal negation ops in noun copula layer not supported" };
        }
        postModalNeg = op;
        continue;
      }
      if (copula.polarity !== "negative") {
        if (externalNegation !== null) {
          return { ok: false, reason: "multiple external negation ops on affirmative noun copula not supported" };
        }
        externalNegation = op;
        continue;
      }
      chainDepth = op.chainDepth;
      past = past || op.chainPast;
      continue;
    }
    return { ok: false, reason: `op '${op.kind}' on noun copula not yet supported` };
  }

  const formal = ctx.formal;
  const terminalFormal = ctx.formal;
  const base = nounCopulaPolarityBaseForCopula(copula, noun, chainDepth, nounCopulaStemAllomorphHost(layer.stem, ctx, noun));
  const baseResult = {
    ok: true,
    base,
    chainOnFinalSupported: true
  } satisfies OkBaseResult;

  if (connective !== null) {
    connective = connectiveForRender(connective, ctx);
  }
  const connectivePolite = polite && shouldCarryConnectivePoliteness(ctx);

  if (projectionCarrier !== null) {
    const carrierHost = copulaCarrierBaseForInterOp(base, formal);
    if (carrierHost === null) {
      return { ok: false, reason: "noun copula projection carrier host lowering failed" };
    }
    const carrierBase = predicateProjectionCarrierBase({
      op: projectionCarrier,
      inputBase: carrierHost,
      preStemNeg: externalNegation,
      stemPast: past,
      formal,
      pastProjection: "lexical"
    });
    if (!carrierBase.ok) {
      return carrierBase;
    }
    if (connective !== null) {
      return composeCommittedTailConnective(
        carrierBase,
        connective,
        projectionCarrier.past === true,
        false,
        null,
        formal, ctx.lookups
      );
    }
    return composeCommittedTailTerminal(carrierBase, null, projectionCarrier.past === true, formal, projectionCarrier.polite === true, ctx.lookups);
  }

  if (predicateQuoteCarrier !== null) {
    if (modalChain.length > 0 || soudaHearsay !== null || scopeBridge !== null || postverbAuxiliary !== null) {
      return { ok: false, reason: "noun copula predicate quote carrier mixed operator not supported" };
    }
    if (conjecture !== null) {
      return { ok: false, reason: "noun copula predicate quote carrier + conjecture not supported" };
    }
    const quoteInputBase = obligation === null ? base : nounCopulaObligationBase(noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun));
    const quotePreStemNeg = obligation === null ? externalNegation : null;
    const quoteStemPast = obligation === null ? past : false;
    const quoteNominalStem = obligation === null ? noun : undefined;
    if (
      obligation !== null &&
      (copula.variant !== "basic" || copula.polarity !== "affirmative" || externalNegation !== null || past)
    ) {
      return { ok: false, reason: "noun copula obligation quote carrier supports only affirmative non-past copula" };
    }
    const quotedBase = predicateQuoteCarrierBase({
      op: predicateQuoteCarrier,
      inputBase: quoteInputBase,
      preStemNeg: quotePreStemNeg,
      stemPast: quoteStemPast,
      lookups: ctx.lookups,
      ...(quoteNominalStem === undefined ? {} : { nominalQuoteStem: quoteNominalStem })
    });
    if (!quotedBase.ok) {
      return quotedBase;
    }
    const quoteRendered = composeCommittedCarrierPostChain(
      quotedBase,
      postPredicateQuoteOps,
      postPredicateQuotePolite,
      connective,
      ctx
    );
    if (quoteRendered.ok && quoteRendered.traced === undefined && noun.length > 0) {
      const closed = closeChainTraceAgainstText(
        {
          prefixSegments: [stemHostTraceSegment(layer.stem, noun, layer.stem.source.tokens, "lexeme", "semantic")],
          finalSourceTokens: ops.flatMap((op) => op.source.tokens),
          finalKind: "aux"
        },
        quoteRendered.text
      );
      if (closed !== null) {
        return { ...quoteRendered, traced: closed };
      }
    }
    return quoteRendered;
  }

  if (postverbAuxiliary !== null) {
    if (conjecture !== null || soudaHearsay !== null || scopeBridge !== null || obligation !== null) {
      return { ok: false, reason: "noun copula state-change auxiliary + mixed scope/conjecture/souda/obligation not supported" };
    }
    const hostBase = copulaCarrierBaseForInterOp(base, formal);
    if (hostBase === null) {
      return { ok: false, reason: "noun copula state-change host projection 영역 외" };
    }
    const postverbBaseResult = opToBase(postverbAuxiliary, hostBase, {
      lookups: ctx.lookups,
      preModalNeg: externalNegation,
      past,
      pastProjection: "lexical",
      formal,
      hasFollowingOp: modalChain.length > 0,
      shortNegationPolicy: undefined,
      sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
      passiveStemOptions: {},
      forbidShortNegation: true,
      desiredPredicateNegation: null
    });
    if (!postverbBaseResult.ok) {
      return postverbBaseResult;
    }
    if (postverbBaseResult.base.final.kind !== "lemma") {
      return { ok: false, reason: "noun copula state-change auxiliary produced non-lemma base" };
    }
    let currentBase: KoreanLemmaPredicateBase = {
      ...postverbBaseResult.base,
      final: postverbBaseResult.base.final
    };
    let currentBaseResult: BaseResult = {
      ...postverbBaseResult,
      ...modalFinalChainPolicy(postverbBaseResult.base)
    };
    let currentPast = postModalPast;
    for (let i = 0; i < modalChain.length; i++) {
      const modalBaseAtStep = opToBase(modalChain[i]!, currentBase, {
        lookups: ctx.lookups,
        preModalNeg: null,
        past: currentPast,
        pastProjection: "committed",
        formal,
        hasFollowingOp: i < modalChain.length - 1,
        shortNegationPolicy: undefined,
        sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
        passiveStemOptions: {},
        forbidShortNegation: false,
        desiredPredicateNegation: null
      });
      if (!modalBaseAtStep.ok) {
        return modalBaseAtStep;
      }
      currentBaseResult = { ...modalBaseAtStep, ...modalFinalChainPolicy(modalBaseAtStep.base) };
      if (i < modalChain.length - 1) {
        const interOpBase = copulaCarrierBaseForInterOp(modalBaseAtStep.base, formal);
        if (interOpBase === null) {
          return { ok: false, reason: "noun copula state-change modal inter-op projection 영역 외" };
        }
        currentBase = applyNonLastPrefixContractions(interOpBase, modalBaseAtStep, formal);
        currentPast =
          modalBaseAtStep.interOpProjectionPolicy === "stative_perfect" ||
          opCarriesIntrinsicPast(modalChain[i]!);
      }
    }
    const stateChangePolite = polite || postModalPolite || modalChain.some((op) => op.polite);
    if (connective !== null) {
      return composeCommittedTailConnective(
        currentBaseResult,
        connective,
        modalChain.length > 0 ? false : postModalPast,
        stateChangePolite && shouldCarryConnectivePoliteness(ctx),
        postModalNeg,
        formal, ctx.lookups
      );
    }
    return composeCommittedTailTerminal(
      currentBaseResult,
      postModalNeg,
      modalChain.length > 0 ? false : postModalPast,
      formal,
      stateChangePolite,
      ctx.lookups
    );
  }

  if (soudaHearsay !== null) {
    if (copula.variant !== "basic") {
      return { ok: false, reason: "souda hearsay on non-basic noun copula not supported" };
    }
    if (conjecture !== null || scopeBridge !== null) {
      return { ok: false, reason: "noun copula + souda hearsay + scope/conjecture not supported" };
    }
    const soudaBase = soudaHearsayBaseFromPredicateBase(base, null, past, ctx.lookups, soudaHearsay);
    if (!soudaBase.ok) {
      return soudaBase;
    }
    const soudaChainTrace = (): ChainSourceTrace | null => {
      const declared = sourceTraceWithFinalNegationStem(soudaBase, externalNegation);
      if (declared === undefined || noun.length === 0) {
        return null;
      }
      const acc = new ChainTraceAccumulator({
        initialFinalTokens: [...copula.source.tokens, ...hostPastTokens],
        initialFinalKind: "aux",
        leadingSplit: { surface: noun, tokens: layer.stem.source.tokens, kind: "lexeme", stem: layer.stem }
      });
      acc.stepSourceTrace("", declared, soudaBase.base.prefix);
      return acc.finish(externalNegation?.source.tokens ?? []);
    };
    const soudaTrace = soudaChainTrace();
    const baseResult = {
      ...soudaBase,
      ...modalFinalChainPolicy(soudaBase.base),
      ...(soudaTrace === null ? {} : { chainSourceTrace: soudaTrace })
    } satisfies BaseResult & { readonly chainSourceTrace?: ChainSourceTrace };
    if (connective !== null) {
      const renderedSoudaConnective = composeCommittedTailConnective(
        baseResult,
        connective,
        soudaHearsay.past,
        soudaHearsay.polite && shouldCarryConnectivePoliteness(ctx),
        externalNegation,
        formal, ctx.lookups
      );
      if (
        renderedSoudaConnective.ok &&
        renderedSoudaConnective.traced === undefined &&
        soudaTrace !== null &&
        externalNegation === null
      ) {
        const closed = closeChainTraceWithConnectivePieces(soudaTrace, renderedSoudaConnective.text, connective);
        if (closed !== null) {
          return { ...renderedSoudaConnective, traced: closed };
        }
      }
      return renderedSoudaConnective;
    }
    return composeCommittedTailTerminal(
      baseResult,
      externalNegation,
      soudaHearsay.past,
      formal,
      polite || soudaHearsay.polite,
      ctx.lookups
    );
  }

  if (experience !== null) {
    if (copula.variant !== "basic") {
      return { ok: false, reason: "noun copula experience supports only basic copula" };
    }
    if (soudaHearsay !== null || scopeBridge !== null || conjecture !== null) {
      return { ok: false, reason: "noun copula experience + mixed operator not supported" };
    }
    const experienceBaseResult = experienceBase({
      op: experience,
      inputBase: base,
      preStemNeg: externalNegation,
      stemPast: past,
      formal,
      pastProjection: "committed"
    });
    if (!experienceBaseResult.ok) {
      return experienceBaseResult;
    }
    const experiencePolite = polite || experience.polite || postModalPolite;
    const experiencePast = postModalPast || experience.past;
    if (connective !== null) {
      return composeCommittedTailConnective(
        experienceBaseResult,
        connective,
        experiencePast,
        experiencePolite && shouldCarryConnectivePoliteness(ctx),
        postModalNeg,
        formal, ctx.lookups
      );
    }
    return composeCommittedTailTerminal(
      experienceBaseResult,
      postModalNeg,
      experiencePast,
      formal,
      experiencePolite,
      ctx.lookups
    );
  }

  if (obligation !== null) {
    if (copula.variant !== "basic" || externalNegation !== null || past) {
      return { ok: false, reason: "noun copula obligation supports only basic non-past copula + internal negative obligation" };
    }
    if (soudaHearsay !== null || scopeBridge !== null || postverbAuxiliary !== null) {
      return { ok: false, reason: "noun copula obligation + mixed operator not supported" };
    }
    const obligationBase = nounCopulaObligationBaseForCopula(copula, noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun));
    const nounObligationTrace = ((): ChainSourceTrace | null => {
      const split = splitPositiveObligationSourceTokens(obligation);
      if (
        split === null || split.finalTokens.length === 0 ||
        noun.length === 0 || !obligationBase.prefix.startsWith(noun)
      ) {
        return null;
      }
      return {
        prefixSegments: [
          stemHostTraceSegment(layer.stem, noun, layer.stem.source.tokens, "lexeme", "semantic"),
          {
            text: obligationBase.prefix.slice(noun.length),
            sourceTokens: [...copula.source.tokens, ...split.carrierTokens],
            kind: "modal",
            projectionConfidence: "semantic"
          }
        ],
        finalSourceTokens: split.finalTokens,
        finalKind: "aux"
      };
    })();
    const tracedObligationBaseResult: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } = {
      ok: true,
      base: obligationBase,
      ...modalFinalChainPolicy(obligationBase),
      ...(nounObligationTrace === null ? {} : { chainSourceTrace: nounObligationTrace })
    };
    if (modalChain.length > 0) {
      if (conjecture !== null) {
        return { ok: false, reason: "noun copula obligation + modal + conjecture not supported" };
      }
      let currentBase: KoreanLemmaPredicateBase = obligationBase;
      let currentBaseResult: BaseResult = tracedObligationBaseResult;
      let currentPast = false;
      for (let i = 0; i < modalChain.length; i++) {
        const modalBaseAtStep = opToBase(modalChain[i]!, currentBase, {
          lookups: ctx.lookups,
          preModalNeg: null,
          past: currentPast,
          pastProjection: "lexical",
          formal,
          hasFollowingOp: i < modalChain.length - 1,
          shortNegationPolicy: undefined,
          sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
          passiveStemOptions: {},
          forbidShortNegation: false,
          desiredPredicateNegation: null
        });
        if (!modalBaseAtStep.ok) {
          return modalBaseAtStep;
        }
        currentBaseResult = {
          ...modalBaseAtStep,
          ...modalFinalChainPolicy(modalBaseAtStep.base)
        } satisfies BaseResult;
        if (i < modalChain.length - 1) {
          const interOpBase = copulaCarrierBaseForInterOp(modalBaseAtStep.base, formal);
          if (interOpBase === null) {
            return { ok: false, reason: "noun copula obligation modal inter-op projection 영역 외" };
          }
          currentBase = applyNonLastPrefixContractions(interOpBase, modalBaseAtStep, formal);
          currentPast =
            modalBaseAtStep.interOpProjectionPolicy === "stative_perfect" ||
            opCarriesIntrinsicPast(modalChain[i]!);
        }
      }
      const obligationModalPolite = polite || obligation.polite || postModalPolite || modalChain.some((op) => op.polite);
      if (connective !== null) {
        return composeCommittedTailConnective(
          currentBaseResult,
          connective,
          postModalPast,
          obligationModalPolite && shouldCarryConnectivePoliteness(ctx),
          postModalNeg,
          formal, ctx.lookups
        );
      }
      return composeCommittedTailTerminal(
        currentBaseResult,
        postModalNeg,
        postModalPast,
        formal,
        obligationModalPolite,
        ctx.lookups
      );
    }
    if (conjecture !== null) {
      const conjectureBaseResult = opToBase(conjecture, obligationBase, {
        lookups: ctx.lookups,
        preModalNeg: null,
        past: postModalPast,
        pastProjection: "lexical",
        formal,
        hasFollowingOp: connective !== null,
        shortNegationPolicy: undefined,
        sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
        passiveStemOptions: {},
        forbidShortNegation: false,
        desiredPredicateNegation: null
      });
      if (!conjectureBaseResult.ok) {
        return conjectureBaseResult;
      }
      const committedConjectureBase = {
        ...conjectureBaseResult,
        ...modalFinalChainPolicy(conjectureBaseResult.base)
      } satisfies BaseResult;
      const obligationPolite = polite || obligation.polite || conjecture.polite;
      if (connective !== null) {
        return composeCommittedTailConnective(
          committedConjectureBase,
          connective,
          false,
          obligationPolite && shouldCarryConnectivePoliteness(ctx),
          null,
          formal, ctx.lookups
        );
      }
      return composeCommittedTailTerminal(
        committedConjectureBase,
        null,
        false,
        formal,
        obligationPolite,
        ctx.lookups
      );
    }
    if (connective !== null) {
      return composeCommittedTailConnective(
        tracedObligationBaseResult,
        connective,
        postModalPast,
        (polite || obligation.polite) && shouldCarryConnectivePoliteness(ctx),
        null,
        formal, ctx.lookups
      );
    }
    return composeCommittedTailTerminal(
      tracedObligationBaseResult,
      null,
      postModalPast,
      formal,
      polite || obligation.polite,
      ctx.lookups
    );
  }

  if (modalChain.length > 0) {
    if (copula.variant !== "basic") {
      return { ok: false, reason: "non-basic noun copula + modal not supported" };
    }
    if (soudaHearsay !== null) {
      return { ok: false, reason: "noun copula + modal + souda hearsay not supported" };
    }
    const hostPast = past || (externalNegation?.chainPast ?? false);
    const hostBase = externalNegation !== null
      ? applyExternalNegationDepthToPredicateBase(base, externalNegation.chainDepth, formal)
      : copulaCarrierBaseForInterOp(base, formal);
    if (hostBase === null) {
      return { ok: false, reason: "noun copula modal host projection 영역 외" };
    }
    let currentBase = hostBase;
    let currentPast = hostPast;
    let modalBaseResult: OkBaseResult | null = null;
    const chainTraceAcc = new ChainTraceAccumulator({
      initialFinalTokens: copula.source.tokens,
      initialFinalKind: "aux",
      leadingSplit: {
        surface: noun,
        tokens: layer.stem.source.tokens,
        kind: "lexeme"
      }
    });
    chainTraceAcc.syncPrefix(hostBase.prefix);
    for (let i = 0; i < modalChain.length; i++) {
      const op = modalChain[i]!;
      const baseAtStep = opToBase(op, currentBase, {
        lookups: ctx.lookups,
        preModalNeg: null,
        past: currentPast,
        pastProjection: "lexical",
        formal,
        hasFollowingOp: i < modalChain.length - 1,
        shortNegationPolicy: undefined,
        sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
        passiveStemOptions: {},
        forbidShortNegation: false,
        desiredPredicateNegation: null
      });
      if (!baseAtStep.ok) {
        return baseAtStep;
      }
      if (baseAtStep.sourceTrace !== undefined) {
        chainTraceAcc.stepSourceTrace(
          currentBase.prefix,
          baseAtStep.sourceTrace,
          baseAtStep.base.prefix,
          i === 0 ? hostPastTokens : []
        );
      } else {
        chainTraceAcc.stepGeneric(baseAtStep.base.prefix, op.source.tokens, "modal");
      }
      if (i < modalChain.length - 1) {
        chainTraceAcc.extendFinalTokens(postModalPastTokensByChainIndex.get(i) ?? []);
      }
      if (i === modalChain.length - 1) {
        modalBaseResult = baseAtStep;
        break;
      }
      const interOpBase = copulaCarrierBaseForInterOp(baseAtStep.base, formal);
      if (interOpBase === null) {
        return { ok: false, reason: "noun copula modal chain inter-op projection 영역 외" };
      }
      currentBase = applyNonLastPrefixContractions(interOpBase, baseAtStep, formal);
      chainTraceAcc.syncPrefix(currentBase.prefix);
      currentPast =
        baseAtStep.interOpProjectionPolicy === "stative_perfect" ||
        opCarriesIntrinsicPast(op);
    }
    if (modalBaseResult === null) {
      return { ok: false, reason: "noun copula modal chain invariant violation" };
    }
    const nativeNounModalTraceSupported = modalChain.every((op) =>
      op.modal === "kamo" || op.modal === "noda" || op.modal === "tokoro" ||
      op.modal === "wake" || op.modal === "youda" || op.modal === "rashii" ||
      op.modal === "hazu"
    );
    const terminalPastTokens = postModalPastTokensByChainIndex.get(modalChain.length - 1) ?? [];
    const committedModalBase: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } = {
      ...modalBaseResult,
      ...modalFinalChainPolicy(modalBaseResult.base),
      ...(conjecture === null && externalNegation === null && nativeNounModalTraceSupported
        ? {
          chainSourceTrace: chainTraceAcc.finish([
            ...terminalPastTokens,
            ...(postModalNeg?.source.tokens ?? [])
          ])
        }
        : {})
    };
    const modalPolite = polite || modalChain.some((op) => op.polite) || postModalPolite;
    if (scopeBridge !== null) {
      if (committedModalBase.base.final.kind !== "lemma") {
        return { ok: false, reason: "noun copula modal scopeBridge requires lemma carrier base" };
      }
      const modalLemmaBase: KoreanLemmaPredicateBase = {
        ...committedModalBase.base,
        final: committedModalBase.base.final
      };
      const bridgeBase = scopeBridgeBase(scopeBridge, modalLemmaBase, {
        lookups: ctx.lookups,
        preModalNeg: postModalNeg,
        past: postModalPast,
        pastProjection: "lexical",
        formal,
        hasFollowingOp: postScopeOps.length > 0 || connective !== null,
        shortNegationPolicy: undefined,
        sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
        passiveStemOptions: {},
        forbidShortNegation: false,
        desiredPredicateNegation: null
      });
      if (!bridgeBase.ok) {
        return bridgeBase;
      }
      let bridgeBaseForRender: BaseResult = bridgeBase;
      if (
        conjecture === null &&
        externalNegation === null &&
        nativeNounModalTraceSupported &&
        bridgeBase.sourceTrace !== undefined
      ) {
        chainTraceAcc.stepSourceTrace(
          modalLemmaBase.prefix,
          bridgeBase.sourceTrace,
          bridgeBase.base.prefix,
          [
            ...terminalPastTokens,
            ...(postModalNeg?.source.tokens ?? [])
          ]
        );
        bridgeBaseForRender = {
          ...bridgeBase,
          chainSourceTrace: chainTraceAcc.finish()
        } as BaseResult & { readonly chainSourceTrace: ChainSourceTrace };
      }
      return composeCommittedCarrierPostChain(
        bridgeBaseForRender,
        postScopeOps,
        modalPolite || postScopePolite || scopeBridge.polite,
        connective,
        ctx
      );
    }
    let terminalBaseResult: BaseResult = committedModalBase;
    let terminalPast = postModalPast;
    let terminalPolite = modalPolite;
    if (conjecture !== null) {
      if (committedModalBase.base.final.kind !== "lemma") {
        if (connective !== null || postModalNeg !== null) {
          return { ok: false, reason: "noun copula modal conjecture on nominal carrier supports terminal only" };
        }
        return composeNounCopulaBaseWithConjecture(
          {
            ...base,
            prefix: `${layer.stem.koreanPrefix ?? ""}${base.prefix}`
          },
          hostPast,
          formal,
          modalPolite,
          conjecture.polite,
          ctx.lookups
        );
      }
      const modalLemmaBase: KoreanLemmaPredicateBase = {
        ...committedModalBase.base,
        final: committedModalBase.base.final
      };
      const conjectureBaseResult = opToBase(conjecture, modalLemmaBase, {
        lookups: ctx.lookups,
        preModalNeg: null,
        past: postModalPast,
        pastProjection: "lexical",
        formal,
        hasFollowingOp: connective !== null,
        shortNegationPolicy: undefined,
        sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
        passiveStemOptions: {},
        forbidShortNegation: false,
        desiredPredicateNegation: null
      });
      if (!conjectureBaseResult.ok) {
        return conjectureBaseResult;
      }
      terminalBaseResult = {
        ...conjectureBaseResult,
        ...modalFinalChainPolicy(conjectureBaseResult.base)
      } satisfies BaseResult;
      terminalPast = false;
      terminalPolite = modalPolite || conjecture.polite;
    }
    if (connective !== null) {
      const renderedModalConnective = composeCommittedTailConnective(
        terminalBaseResult,
        connective,
        terminalPast,
        terminalPolite && shouldCarryConnectivePoliteness(ctx),
        postModalNeg,
        formal, ctx.lookups
      );
      if (
        renderedModalConnective.ok &&
        renderedModalConnective.traced === undefined &&
        postModalNeg === null &&
        modalChain.length === 1 &&
        (modalChain[0]!.modal === "youda" || modalChain[0]!.modal === "rashii") &&
        connective.connective === "quotative" &&
        noun.length > 0
      ) {
        const likenessQuote = renderedModalConnective.text.match(/^(.+)( 것 같)(다|아)고$/u);
        const likenessTokens = modalChain[0]!.source.tokens;
        if (likenessQuote !== null && likenessQuote[1]!.startsWith(noun) && likenessTokens.length >= 2) {
          const hostRest = likenessQuote[1]!.slice(noun.length);
          const traced: TailTraceSegment[] = [
            stemHostTraceSegment(layer.stem, noun, layer.stem.source.tokens, "lexeme", "semantic"),
            ...(hostRest.length > 0
              ? [{
                text: hostRest,
                sourceTokens: [...copula.source.tokens, ...hostPastTokens],
                kind: "aux" as const,
                projectionConfidence: "semantic" as const
              }]
              : []),
            { text: likenessQuote[2]!, sourceTokens: likenessTokens.slice(0, -1), kind: "modal", projectionConfidence: "semantic" },
            { text: likenessQuote[3]!, sourceTokens: likenessTokens.slice(-1), kind: "modal", projectionConfidence: "semantic" },
            { text: "고", sourceTokens: connective.source.tokens, kind: "connective", projectionConfidence: "semantic" }
          ];
          return { ...renderedModalConnective, traced };
        }
      }
      if (
        renderedModalConnective.ok &&
        renderedModalConnective.traced === undefined &&
        committedModalBase.chainSourceTrace !== undefined &&
        postModalNeg === null &&
        modalChain.every((op) => op.modal !== "youda" && op.modal !== "rashii")
      ) {
        const closed = closeChainTraceWithConnectivePieces(
          committedModalBase.chainSourceTrace,
          renderedModalConnective.text,
          connective
        );
        if (closed !== null) {
          return { ...renderedModalConnective, traced: closed };
        }
      }
      return renderedModalConnective;
    }
    return composeCommittedTailTerminal(
      terminalBaseResult,
      postModalNeg,
      terminalPast,
      formal,
      terminalPolite,
      ctx.lookups
    );
  }

  if (copula.variant === "conditional_nara") {
    if (connective !== null || conjecture !== null || externalNegation !== null) {
      return { ok: false, reason: "copula conditional_nara cannot combine with another connective/conjecture" };
    }
    const naraTrace: ChainSourceTrace | null = noun.length > 0
      ? {
        prefixSegments: [stemHostTraceSegment(layer.stem, noun, layer.stem.source.tokens, "lexeme", "semantic")],
        finalSourceTokens: ops.flatMap((op) => op.source.tokens),
        finalKind: "aux"
      }
      : null;
    const tracedNaraBase: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } =
      naraTrace !== null ? { ...baseResult, chainSourceTrace: naraTrace } : baseResult;
    const renderedNara = composeCommittedTailConnective(
      tracedNaraBase,
      copulaVariantConnective(copula, "なら", "conditional"),
      past,
      connectivePolite,
      null,
      formal, ctx.lookups
    );
    if (renderedNara.ok && renderedNara.traced === undefined && naraTrace !== null) {
      const closed = closeChainTraceAgainstText(naraTrace, renderedNara.text);
      if (closed !== null) {
        return { ...renderedNara, traced: closed };
      }
    }
    return renderedNara;
  }

  if (scopeBridge !== null) {
    const hostLemmaBase = externalNegation !== null
      ? applyExternalNegationDepthToPredicateBase(base, externalNegation.chainDepth, formal)
      : copulaCarrierBaseForInterOp(base, formal);
    if (hostLemmaBase === null) {
      return { ok: false, reason: "noun copula scopeBridge host lowering invariant violation" };
    }
    const hostPast = past || (externalNegation?.chainPast ?? false);
    const bridgeBase = scopeBridgeBase(
      scopeBridge,
      hostLemmaBase,
      {
        lookups: ctx.lookups,
        preModalNeg: null,
        past: hostPast,
        pastProjection: "lexical",
        ...(copula.polarity === "affirmative" && externalNegation === null
          ? { attributiveProjectionBase: base }
          : {}),
        formal,
        hasFollowingOp: connective !== null,
        shortNegationPolicy: undefined,
        sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
        passiveStemOptions: {},
        forbidShortNegation: false,
        desiredPredicateNegation: null
      }
    );
    if (!bridgeBase.ok) {
      return bridgeBase;
    }
    const bridgeChainTrace = ((): ChainSourceTrace | null => {
      if (bridgeBase.sourceTrace === undefined || noun.length === 0) {
        return null;
      }
      const acc = new ChainTraceAccumulator({
        initialFinalTokens: [
          ...copula.source.tokens,
          ...hostPastTokens,
          ...(externalNegation?.source.tokens ?? [])
        ],
        initialFinalKind: "aux",
        leadingSplit: { surface: noun, tokens: layer.stem.source.tokens, kind: "lexeme", stem: layer.stem }
      });
      acc.stepSourceTrace(hostLemmaBase.prefix, bridgeBase.sourceTrace, bridgeBase.base.prefix);
      const finished = acc.finish();
      const lastPrefix = finished.prefixSegments[finished.prefixSegments.length - 1];
      if (lastPrefix !== undefined && lastPrefix.text.endsWith(" ") && lastPrefix.text.trim().length > 0) {
        return {
          ...finished,
          prefixSegments: [
            ...finished.prefixSegments.slice(0, -1),
            { ...lastPrefix, text: lastPrefix.text.slice(0, -1) }
          ]
        };
      }
      return finished;
    })();
    const tracedBridgeBase: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } =
      bridgeChainTrace !== null
        ? { ...bridgeBase, chainSourceTrace: bridgeChainTrace }
        : bridgeBase;
    if (conjecture !== null) {
      if (bridgeBase.base.final.kind !== "lemma") {
        return { ok: false, reason: "noun copula scopeBridge conjecture requires lemma carrier base" };
      }
      const bridgeLemmaBase: KoreanLemmaPredicateBase = {
        ...bridgeBase.base,
        final: bridgeBase.base.final
      };
      const conjectureBaseResult = opToBase(conjecture, bridgeLemmaBase, {
        lookups: ctx.lookups,
        preModalNeg: null,
        past: postScopePast,
        pastProjection: "lexical",
        formal,
        hasFollowingOp: connective !== null,
        shortNegationPolicy: undefined,
        sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
        passiveStemOptions: {},
        forbidShortNegation: false,
        desiredPredicateNegation: null
      });
      if (!conjectureBaseResult.ok) {
        return conjectureBaseResult;
      }
      const committedConjectureBase = {
        ...conjectureBaseResult,
        ...modalFinalChainPolicy(conjectureBaseResult.base)
      } satisfies BaseResult;
      const conjecturePolite = scopeBridge.polite || postScopePolite || conjecture.polite;
      if (connective !== null) {
        return composeCommittedTailConnective(
          committedConjectureBase,
          connective,
          false,
          conjecturePolite && shouldCarryConnectivePoliteness(ctx),
          null,
          formal, ctx.lookups
        );
      }
      return composeCommittedTailTerminal(
        committedConjectureBase,
        null,
        false,
        formal,
        conjecturePolite,
        ctx.lookups
      );
    }
    if (connective !== null) {
      return composeCommittedTailConnective(
        tracedBridgeBase,
        connective,
        postScopePast,
        false,
        null,
        formal, ctx.lookups
      );
    }
    return composeCommittedTailTerminal(
      tracedBridgeBase,
      null,
      postScopePast,
      formal,
      scopeBridge.polite || postScopePolite,
      ctx.lookups
    );
  }

  if (conjecture !== null && connective !== null) {
    const conjectureConnectivePolite =
      (polite || conjecture.polite) &&
      (shouldCarryConnectivePoliteness(ctx) || connective.questionContentRole === "terminal");
    return composeNounCopulaBaseWithConjectureConnective(
      base,
      connective,
      past,
      formal,
      conjectureConnectivePolite, ctx.lookups
    );
  }
  const simpleCopulaChainTrace = (excludeOp: AuxOpNode | null): ChainSourceTrace | null => {
    if (noun.length === 0) {
      return null;
    }
    const restOps = ops.filter((op) => op !== excludeOp);
    const stemSegment: TailTraceSegment =
      stemHostTraceSegment(layer.stem, noun, layer.stem.source.tokens, "lexeme", "semantic");
    if (copula.polarity === "affirmative") {
      if (externalNegation !== null) {
        return null;
      }
      return {
        prefixSegments: [stemSegment],
        finalSourceTokens: restOps.flatMap((op) => op.source.tokens),
        finalKind: "aux"
      };
    }
    const split = splitNegativeNounCopulaSourceTokens(copula.source.tokens);
    const finalSourceTokens = [
      ...split.finalTokens,
      ...restOps.slice(1).flatMap((op) => op.source.tokens)
    ];
    if (split.carrierTokens.length === 0 || finalSourceTokens.length === 0) {
      return null;
    }
    return {
      prefixSegments: [
        stemSegment,
        {
          text: `${nounSubjectPart(noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun)).slice(noun.length)} `,
          sourceTokens: split.carrierTokens,
          kind: "aux",
          projectionConfidence: "semantic"
        }
      ],
      finalSourceTokens,
      finalKind: "aux"
    };
  };
  if (connective !== null) {
    const connectiveTrace = simpleCopulaChainTrace(connective);
    const connectiveBase = baseResultForNounCopulaConnective(baseResult, layer.stem, connective);
    const tracedConnectiveBase: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } =
      connectiveTrace !== null && connectiveBase.ok
        ? { ...connectiveBase, chainSourceTrace: connectiveTrace }
        : connectiveBase;
    const rendered = composeCommittedTailConnective(
      tracedConnectiveBase,
      connective,
      past,
      connectivePolite,
      externalNegation,
      formal, ctx.lookups
    );
    if (rendered.ok && rendered.traced === undefined) {
      const wholeTrace = simpleCopulaChainTrace(null);
      const closed = wholeTrace === null ? null : closeChainTraceAgainstText(wholeTrace, rendered.text);
      if (closed !== null) {
        return { ...rendered, traced: closed };
      }
    }
    return rendered;
  }
  if (conjecture !== null) {
    if (externalNegation !== null) {
      return { ok: false, reason: "noun copula + external negation + conjecture not yet supported" };
    }
    return composeNounCopulaBaseWithConjecture(base, past, formal, polite, conjecture.polite, ctx.lookups);
  }
  const simpleTerminalTrace = simpleCopulaChainTrace(null);
  const simpleTerminalBaseResult: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } =
    simpleTerminalTrace !== null
      ? { ...baseResult, chainSourceTrace: simpleTerminalTrace }
      : baseResult;
  return composeCommittedTailTerminal(simpleTerminalBaseResult, externalNegation, past, terminalFormal, polite, ctx.lookups);
}

export function renderNominalHostLikenessContinuation(
  noun: string,
  ops: readonly AuxOpNode[],
  ctx: RenderContext
): RenderOutcome {
  const first = ops[0];
  if (first?.kind !== "modal" || first.modal !== "youda") {
    return { ok: false, reason: "nominal host likeness continuation requires youda/mitai modal head" };
  }
  return renderNominalHostLikeness(noun, ops, ctx);
}

function simpleHostChainSourceTrace(
  layer: AuxLayerNode,
  excludeOp: AuxOpNode | null
): ChainSourceTrace | null {
  const companions = layer.ops.filter((op) => op !== excludeOp);
  if (!companions.every((op) =>
    op.kind === "tense" || op.kind === "polite" ||
    op.kind === "classicalAuxResidue" || op.kind === "adjCopulaBridge"
  )) {
    return null;
  }
  return {
    prefixSegments: [],
    finalSourceTokens: [
      ...layer.stem.source.tokens,
      ...companions.flatMap((op) => op.source.tokens)
    ],
    finalKind: "lexeme"
  };
}

function longNegationChainTrace(
  stemLemma: string,
  stemIrregular: IrregularType | null,
  stemTokens: readonly TenseOp["source"]["tokens"][number][],
  negation: NegationOp,
  extraFinalTokens: readonly TenseOp["source"]["tokens"][number][]
): ChainSourceTrace | null {
  const stemJi = conjugate(stemLemma, stemIrregular, "지");
  const split = negation.sourceSplit?.kind === "predicate_copula_negative" ? negation.sourceSplit : null;
  const prefixSegments: TailTraceSegment[] = [];
  const negationFinalTokens = split !== null
    ? split.finalTokens
    : negation.source.tokens.length === negation.chainDepth
      ? [negation.source.tokens[negation.chainDepth - 1]!]
      : negation.source.tokens.slice(negation.chainDepth - 1);
  if (split !== null) {
    if (!stemJi.endsWith("지") || stemJi.length < 2) {
      return null;
    }
    prefixSegments.push({
      text: stemJi.slice(0, -1),
      sourceTokens: stemTokens,
      kind: "lexeme",
      projectionConfidence: "semantic"
    });
    prefixSegments.push({ text: "지", sourceTokens: split.bridgeTokens, kind: "aux", projectionConfidence: "semantic" });
  } else {
    if (negation.source.tokens.length < negation.chainDepth) {
      return null;
    }
    prefixSegments.push({
      text: stemJi,
      sourceTokens: stemTokens,
      kind: "lexeme",
      projectionConfidence: "semantic"
    });
    for (let i = 0; i < negation.chainDepth - 1; i++) {
      prefixSegments.push({
        text: " 않지",
        sourceTokens: [negation.source.tokens[i]!],
        kind: "aux",
        projectionConfidence: "semantic"
      });
    }
  }
  return {
    prefixSegments,
    finalSourceTokens: [...negationFinalTokens, ...extraFinalTokens],
    finalKind: "aux"
  };
}

function longNegationTraceParts(
  negation: NegationOp,
  ops: readonly AuxOpNode[],
  extraFinalTokens: readonly TenseOp["source"]["tokens"][number][]
): {
  readonly negation: NegationOp;
  readonly extraFinalTokens: readonly TenseOp["source"]["tokens"][number][];
} {
  if (negation.sourceSplit !== undefined) {
    return { negation, extraFinalTokens };
  }
  const bridge = ops.find((op): op is AdjCopulaBridgeOp => op.kind === "adjCopulaBridge");
  if (bridge === undefined) {
    return { negation, extraFinalTokens };
  }
  return {
    negation: {
      ...negation,
      sourceSplit: {
        kind: "predicate_copula_negative",
        bridgeTokens: bridge.source.tokens,
        finalTokens: negation.source.tokens
      }
    },
    extraFinalTokens
  };
}

function withSimpleHostTraced(result: RenderOutcome, layer: AuxLayerNode): RenderOutcome {
  if (!result.ok || result.traced !== undefined) {
    return result;
  }
  const hostTrace = simpleHostChainSourceTrace(layer, null);
  if (hostTrace !== null) {
    const traced = closeChainTraceAgainstText(hostTrace, result.text);
    return traced === null ? result : { ...result, traced };
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return result;
  }
  const negations = layer.ops.filter((op): op is NegationOp => op.kind === "negation");
  const carries = layer.ops.filter((op) =>
    op.kind === "tense" || op.kind === "polite" ||
    op.kind === "classicalAuxResidue" || op.kind === "adjCopulaBridge"
  );
  if (negations.length !== 1 || negations.length + carries.length !== layer.ops.length) {
    return result;
  }
  const negation = negations[0]!;
  const carryTokens = carries
    .filter((op) => op.kind !== "adjCopulaBridge")
    .flatMap((op) => op.source.tokens);
  if (result.text.startsWith("안 ") || result.text.includes(" 안 ")) {
    return {
      ...result,
      traced: tracedSeg(
        result.text,
        [...layer.stem.source.tokens, ...negation.source.tokens, ...carryTokens],
        "lexeme",
        "semantic"
      )
    };
  }
  const traceParts = longNegationTraceParts(negation, carries, carryTokens);
  const trace = longNegationChainTrace(
    layer.stem.lemma,
    irregularFrom(layer.stem.irregular),
    layer.stem.source.tokens,
    traceParts.negation,
    traceParts.extraFinalTokens
  );
  if (trace === null) {
    return result;
  }
  const traced = closeChainTraceAgainstText(trace, result.text);
  return traced === null ? result : { ...result, traced };
}

function tryCausativeItadakuHumbleNonTerminal(
  layer: AuxLayerNode,
  lookups: LookupTables
): AuxLayerNode | null {
  if (layer.stem.kind !== "verb") {
    return null;
  }
  const voiceOp = layer.ops.find((op): op is VoiceOp => op.kind === "voice" && op.voice === "causative");
  if (voiceOp === undefined) {
    return null;
  }
  const benefactiveOp = layer.ops.find((op): op is BenefactiveAspectOp =>
    isBenefactiveAspectOp(op) && op.benefactive.kind === "itadaku" && op.benefactive.potential !== true);
  if (benefactiveOp === undefined) {
    return null;
  }
  const isPlainTerminal = layer.terminal === null && layer.ops.every((op) =>
    op === voiceOp || op === benefactiveOp || op.kind === "tense" || op.kind === "polite");
  if (isPlainTerminal) {
    return null;
  }
  const hasIncompatibleOp = layer.ops.some((op) => {
    if (op === voiceOp || op === benefactiveOp) {
      return false;
    }
    if (op.kind === "tense" || op.kind === "polite" || op.kind === "connective") {
      return false;
    }
    if (op.kind === "aspect" && isSimpleAspectOpKind(op.aspect)) {
      return false;
    }
    return true;
  });
  if (hasIncompatibleOp) {
    return null;
  }
  const [lemma, irregular] = causativeItadakuCommitmentLemma(
    layer.stem,
    layer.stem.lemma,
    irregularFrom(layer.stem.irregular),
    lookups
  );
  const stem: StemNode = { ...layer.stem, lemma, irregular, commitment: "resolved_sense" };
  const ops = layer.ops.filter((op) => op !== voiceOp && op !== benefactiveOp);
  return { ...layer, stem, ops };
}

function tryNounCopulaPostverbCarrierVerbLayer(
  layer: AuxLayerNode,
  ctx: RenderContext
): { readonly verbLayer: AuxLayerNode; readonly prefixPart: string } | null {
  if (layer.stem.kind !== "noun") {
    return null;
  }
  const copula = layer.ops[0];
  const postverb = layer.ops[1];
  if (
    copula?.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "affirmative" ||
    copula.polite ||
    postverb?.kind !== "postverbAuxiliary"
  ) {
    return null;
  }
  const noun = layer.stem.lemma;
  if (noun.length === 0) {
    return null;
  }
  let lemma: string;
  let irregular: IrregularType | null;
  let prefixPart: string;
  if (
    postverb.auxiliary.kind === "state_change" &&
    postverb.source.tokens.at(-1)?.dictionaryForm === "なる"
  ) {
    lemma = "되다";
    irregular = null;
    prefixPart = `${nounSubjectPart(noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun))} `;
  } else if (
    postverb.auxiliary.kind === "make_state_change" &&
    postverb.source.tokens.at(-1)?.dictionaryForm === "する"
  ) {
    const carrier = derivationalMakeStateCarrierOf(layer.stem);
    if (carrier !== null) {
      lemma = carrier.lemma;
      irregular = carrier.irregular;
      prefixPart = `${noun}${selectParticle(noun, carrier.particle)} `;
    } else {
      lemma = "하다";
      irregular = "여";
      prefixPart = `${noun}하게 `;
    }
  } else if (postverb.auxiliary.kind === "make_state_change_causative") {
    lemma = "만들다";
    irregular = "ㄹ";
    prefixPart = `${noun}하게 `;
  } else {
    return null;
  }
  const source = {
    tokens: [...layer.stem.source.tokens, ...copula.source.tokens, ...postverb.source.tokens],
    tokenIndices: [...layer.stem.source.tokenIndices, ...copula.source.tokenIndices, ...postverb.source.tokenIndices]
  };
  const verbLayer: AuxLayerNode = {
    ...layer,
    stem: {
      kind: "verb",
      lemma,
      conj: "godan",
      irregular,
      source,
      conjugationAnchor: source.tokens.length - 1,
      semanticAnchors: [0]
    },
    ops: layer.ops.slice(2)
  };
  return { verbLayer, prefixPart };
}

function tryRenderNounCopulaPostverbCarrierAsVerb(
  layer: AuxLayerNode,
  ctx: RenderContext,
  renderVerb: (verbLayer: AuxLayerNode) => RenderOutcome
): RenderOutcome | null {
  const rewrite = tryNounCopulaPostverbCarrierVerbLayer(layer, ctx);
  if (rewrite === null) {
    return null;
  }
  const rendered = renderVerb(rewrite.verbLayer);
  if (!rendered.ok) {
    return rendered;
  }
  return {
    ok: true,
    text: `${rewrite.prefixPart}${rendered.text}`,
    polite: rendered.polite,
    ...(rendered.warnings === undefined ? {} : { warnings: rendered.warnings })
  };
}

function tryRenderPredicateCopulaCorrection(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  const copulaIdx = layer.ops.findIndex((op) =>
    op.kind === "copula" &&
    op.polarity === "negative" &&
    op.negativeBridgeForm === "ja"
  );
  if (copulaIdx <= 0 || copulaIdx + 1 !== layer.ops.length - 1) {
    return null;
  }
  const copula = layer.ops[copulaIdx];
  const connective = layer.ops[copulaIdx + 1];
  if (
    copula?.kind !== "copula" ||
    connective?.kind !== "connective" ||
    connective.connective !== "te_form"
  ) {
    return null;
  }
  const host = renderAuxLayerAttributiveTerminal({
    ...layer,
    ops: layer.ops.slice(0, copulaIdx),
    terminal: null
  }, ctx, { nominalizedTerminal: true });
  if (!host.ok) {
    return host;
  }
  const boundNounNegativeBase = negativeNounCopulaBase("것", 0);
  if (boundNounNegativeBase.final.kind !== "negativeNounCopula") {
    return { ok: false, reason: "bound noun correction base invariant violation" };
  }
  const loweredBoundNounNegative = negativeNounCopulaChainBase(
    boundNounNegativeBase.final,
    ctx.formal
  );
  const hostTrace = host.traced ?? tracedSeg(
    host.text,
    [
      ...layer.stem.source.tokens,
      ...layer.ops.slice(0, copulaIdx).flatMap((op) => op.source.tokens)
    ],
    "lexeme"
  );
  const correctionBase = {
    ok: true,
    base: {
      prefix: `${host.text} ${boundNounNegativeBase.prefix}${loweredBoundNounNegative.prefix}`,
      final: loweredBoundNounNegative.final
    },
    chainOnFinalSupported: true,
    chainSourceTrace: {
      prefixSegments: hostTrace,
      finalSourceTokens: copula.source.tokens,
      finalKind: "aux"
    }
  } satisfies OkBaseResult & { readonly chainSourceTrace: ChainSourceTrace };
  return composeCommittedTailConnective(
    correctionBase,
    connectiveForRender({ ...connective, teFormRole: "listing" }, ctx),
    false,
    false,
    null,
    ctx.formal,
    ctx.lookups
  );
}

type AuxLayerPreludeResult =
  | { readonly kind: "outcome"; readonly outcome: RenderOutcome }
  | { readonly kind: "resume"; readonly layer: AuxLayerNode; readonly ctx: RenderContext }
  | { readonly kind: "pass"; readonly layer: AuxLayerNode; readonly ctx: RenderContext };

function mergedConsumedSource(
  existing: AuxLayerNode["consumedSource"],
  added: OpSource
): OpSource {
  const byIndex = new Map<number, OpSource["tokens"][number]>();
  for (const source of [existing, added]) {
    if (source === undefined) continue;
    source.tokenIndices.forEach((tokenIndex, position) => {
      const token = source.tokens[position];
      if (token !== undefined) byIndex.set(tokenIndex, token);
    });
  }
  const entries = [...byIndex.entries()].sort(([left], [right]) => left - right);
  return {
    tokens: entries.map(([, token]) => token),
    tokenIndices: entries.map(([tokenIndex]) => tokenIndex)
  };
}

function conjectureAttributiveMoodLayer(layer: AuxLayerNode): AuxLayerNode | null {
  if (layer.terminal !== "attributive" && layer.terminal !== "nominalized") {
    return null;
  }
  const moodIdx = layer.ops.length - 1;
  const last = layer.ops[moodIdx];
  if (last === undefined) {
    return null;
  }
  const conjectureCopula = last.kind === "copula" && last.variant === "conjecture" && last.polarity === "affirmative"
    ? last
    : null;
  const typedConjecture = last.kind === "conjecture" ? last : null;
  if (conjectureCopula === null && typedConjecture === null) {
    return null;
  }
  const remaining = [...layer.ops.slice(0, moodIdx), ...layer.ops.slice(moodIdx + 1)];
  const propositionOps = layer.ops.slice(0, moodIdx);
  const hostNeedsPredicateCopula = layer.stem.kind !== "verb" &&
    layer.stem.kind !== "adj" &&
    !propositionOps.some((op) => op.kind === "copula" || isHeadOp(op));
  const honorific = conjectureCopula?.honorific === true;
  const preserved: readonly AuxOpNode[] = honorific || hostNeedsPredicateCopula
    ? [
      ...layer.ops.slice(0, moodIdx),
      createCopulaOp({
        source: last.source,
        variant: "basic",
        polarity: conjectureCopula?.polarity ?? "affirmative",
        ...(honorific ? { honorific: true as const } : {}),
        polite: (conjectureCopula ?? typedConjecture)!.polite
      }),
      ...layer.ops.slice(moodIdx + 1)
    ]
    : remaining;
  return {
    ...layer,
    ops: preserved,
    attributiveMood: { kind: "conjecture", source: last.source },
    ...(preserved.length === layer.ops.length
      ? {}
      : { consumedSource: mergedConsumedSource(layer.consumedSource, last.source) })
  };
}

function renderAuxLayerPrelude(
  layer: AuxLayerNode,
  ctx: RenderContext,
  teFormRendering: "auto" | "connective" = "auto"
): AuxLayerPreludeResult {
  const conjectureAttributive = conjectureAttributiveMoodLayer(layer);
  if (conjectureAttributive !== null) {
    layer = conjectureAttributive;
  }
  const canonicalized = canonicalizeConjectureCopulaOps(layer, ctx);
  if ("ok" in canonicalized) {
    return { kind: "outcome", outcome: canonicalized };
  }
  layer = canonicalized.layer;
  ctx = canonicalized.ctx;
  const carrierInternalNormalized = normalizeCarrierInternalConnectives(layer);
  if (carrierInternalNormalized !== null) {
    return { kind: "resume", layer: carrierInternalNormalized, ctx };
  }
  const nounPostverbCarrier = tryRenderNounCopulaPostverbCarrierAsVerb(layer, ctx, (vl) => renderAuxLayer(vl, ctx, teFormRendering));
  if (nounPostverbCarrier !== null) {
    return { kind: "outcome", outcome: nounPostverbCarrier };
  }
  const humbleNonTerminal = tryCausativeItadakuHumbleNonTerminal(layer, ctx.lookups);
  if (humbleNonTerminal !== null) {
    return { kind: "resume", layer: humbleNonTerminal, ctx };
  }
  const predicateCopulaCorrection = tryRenderPredicateCopulaCorrection(layer, ctx);
  if (predicateCopulaCorrection !== null) {
    return { kind: "outcome", outcome: predicateCopulaCorrection };
  }
  const leadingCopula = layer.ops[0]?.kind === "copula" ? layer.ops[0] : null;
  const predicateCopulaProjection =
    leadingCopula !== null &&
      (leadingCopula.variant !== "basic" ||
        leadingCopula.polarity === "negative" ||
        leadingCopula.honorific === true)
      ? projectPredicateCopulaLayer(layer, ctx)
      : null;
  if (predicateCopulaProjection !== null) {
    if ("ok" in predicateCopulaProjection) {
      return { kind: "outcome", outcome: predicateCopulaProjection };
    }
    return {
      kind: "resume",
      layer: predicateCopulaProjection.layer,
      ctx: predicateCopulaProjection.ctx
    };
  }
  const projectedMidCopula = projectMidPredicateCopulaLayer(layer);
  if (projectedMidCopula !== null) {
    if ("ok" in projectedMidCopula) {
      return { kind: "outcome", outcome: projectedMidCopula };
    }
    return { kind: "resume", layer: projectedMidCopula, ctx };
  }
  if (layer.terminal === "attributive" && punctuatedFiniteObligationClause(layer, ctx)) {
    const { terminalPayload: _terminalPayload, ...finiteLayer } = layer;
    void _terminalPayload;
    return { kind: "resume", layer: { ...finiteLayer, terminal: null }, ctx };
  }
  return { kind: "pass", layer, ctx };
}

function foldStackedObligationOps(
  outer: ObligationIdiomOp,
  inner: ObligationIdiomOp
): ObligationIdiomOp {
  const carrier = obligationEmphasis(inner.variant) === "" ? outer : inner;
  return {
    ...carrier,
    polarity: outer.polarity === "negative" || inner.polarity === "negative"
      ? "negative"
      : carrier.polarity,
    polite: outer.polite || inner.polite,
    past: outer.past || inner.past,
    source: {
      tokens: [...outer.source.tokens, ...inner.source.tokens],
      tokenIndices: [...outer.source.tokenIndices, ...inner.source.tokenIndices]
    }
  };
}

function foldStackedObligationLayer(layer: AuxLayerNode): AuxLayerNode {
  const obligations = layer.ops.filter(
    (op): op is ObligationIdiomOp => op.kind === "idiom" && op.idiom === "obligation"
  );
  if (obligations.length < 2) {
    return layer;
  }
  const folded = obligations.reduce(foldStackedObligationOps);
  let placed = false;
  const ops: AuxOpNode[] = [];
  for (const op of layer.ops) {
    if (!(op.kind === "idiom" && op.idiom === "obligation")) {
      ops.push(op);
      continue;
    }
    if (placed) {
      continue;
    }
    placed = true;
    ops.push(folded);
  }
  return { ...layer, ops };
}

function renderAuxLayer(
  layer: AuxLayerNode,
  ctx: RenderContext,
  teFormRendering: "auto" | "connective" = "auto"
): RenderOutcome {
  layer = foldStackedObligationLayer(layer);
  const adversativeQuoteTerminal = renderAdversativeQuoteCarrierTerminal(layer, ctx);
  if (adversativeQuoteTerminal !== null) {
    return adversativeQuoteTerminal;
  }
  const prelude = renderAuxLayerPrelude(layer, ctx, teFormRendering);
  if (prelude.kind === "outcome") {
    return prelude.outcome;
  }
  if (prelude.kind === "resume") {
    return renderAuxLayer(prelude.layer, prelude.ctx, teFormRendering);
  }
  layer = prelude.layer;
  ctx = prelude.ctx;
  if (layer.terminal === "attributive") {
    return renderAuxLayerAttributiveTerminal({ ...layer, terminal: null }, ctx);
  }
  if (layer.terminal === "renyou_chuushi") {
    return renderAuxLayerRenyouChuushiTerminal({ ...layer, terminal: null }, ctx);
  }
  if (layer.terminal === "adverbial_modifier") {
    return renderAuxLayerAdverbialModifierTerminal({ ...layer, terminal: null }, ctx);
  }
  if (layer.terminal === "nominalized") {
    return renderAuxLayerNominalizedTerminal({ ...layer, terminal: null }, ctx);
  }
  if (layer.terminal === "imperative") {
    return renderAuxLayerImperativeTerminal({ ...layer, terminal: null }, ctx);
  }
  if (layer.terminal !== null) {
    return { ok: false, reason: `terminal kind '${layer.terminal}' not supported in Phase 2.A` };
  }
  layer = layerWithAdjCopulaBridgeNegationSourceSplits(layer);
  if (layer.stem.kind === "noun") {
    return renderNounCopula(layer, ctx);
  }
  const stemIsCommittedAdverb = layer.stem.kind === "adverb";
  if (stemIsCommittedAdverb && !layer.ops.some(isExplicitAdverbialTailEvidenceOp)) {
    return { ok: false, reason: "adverb stem requires explicit adverbial tail evidence" };
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj" && layer.stem.kind !== "adverb") {
    return { ok: false, reason: `stem kind '${layer.stem.kind}' not supported in Phase 2.A` };
  }
  const adjTosuruResultative = renderAdjTosuruResultativePredicateCarrier(layer, ctx);
  if (adjTosuruResultative !== null) {
    return adjTosuruResultative;
  }
  if (layer.ops[0]?.kind === "copula") {
    return renderPredicateCopulaProjection(layer, ctx);
  }

  let preModalNeg: NegationOp | null = null;
  let postModalNeg: NegationOp | null = null;
  let preModalTense: TenseOp | null = null;
  let postModalTense: TenseOp | null = null;
  const postModalNegations: NegationOp[] = [];
  const postModalTenses: TenseOp[] = [];
  let preModalPolite: PoliteOp | null = null;
  let postModalPolite: PoliteOp | null = null;
  let obligation: ObligationIdiomOp | null = null;
  let modal: ModalOp | null = null;
  let conjecture: ConjectureOp | null = null;
  let desire: DesireOp | null = null;
  let desireIdx: number | null = null;
  let voice: VoiceOp | null = null;
  let voiceIdx: number | null = null;
  let potentialKotoGaDekiru: PotentialKotoGaDekiruIdiomOp | null = null;
  let connective: ConnectiveOp | null = null;
  let aspect: SimpleAspectOp | null = null;
  let benefactive: BenefactiveAspectOp | null = null;
  let request: RequestAspectOp | null = null;
  let prohibition: ProhibitionAspectOp | null = null;
  let desiderative: DesiderativeAspectOp | null = null;
  let miseru: MiseruAspectOp | null = null;
  const chainableOperatorPath = collectOperatorChain(layer.ops);
  const chainableAspectOps = chainableOperatorPath.filter((op): op is Extract<OperatorOp, { readonly kind: "aspect" }> => op.kind === "aspect");
  const multiAspectFoldPath = multiAspectPathCanUseOperatorFold(chainableAspectOps);
  const requestTerminalBaseOps = commandTerminalBaseOperatorChain(layer.ops, isRequestCommandAspectOp);
  const requestTerminalBasePath = requestTerminalBaseOps.length > 0;
  const prohibitionTerminalBaseOps = commandTerminalBaseOperatorChain(layer.ops, isProhibitionCommandAspectOp);
  const prohibitionTerminalBasePath = prohibitionTerminalBaseOps.length > 0;
  const commandTerminalBasePath = requestTerminalBasePath || prohibitionTerminalBasePath;
  const operatorHeadIdx = layer.ops.findIndex(isOperatorWrapBoundaryHeadOp);

  for (let i = 0; i < layer.ops.length; i++) {
    const op = layer.ops[i]!;
    const subsetCheck = checkOpInSubset(op);
    if (!subsetCheck.ok) {
      return subsetCheck;
    }
    if (op.kind === "negation") {
      if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
        if (preModalNeg !== null) {
          return { ok: false, reason: "multiple pre-reference NegationOps in single layer not supported" };
        }
        preModalNeg = op;
      } else {
        if (postModalNeg === null) {
          postModalNeg = op;
        }
        postModalNegations.push(op);
      }
    } else if (op.kind === "tense") {
      if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
        if (preModalTense !== null) {
          return { ok: false, reason: "multiple pre-reference TenseOps in single layer not supported" };
        }
        preModalTense = op;
      } else {
        if (postModalTense === null) {
          postModalTense = op;
        }
        postModalTenses.push(op);
      }
    } else if (op.kind === "polite") {
      if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
        if (preModalPolite !== null) {
          if (isRedundantPoliteCarry(preModalPolite, op)) {
            continue;
          }
          return { ok: false, reason: "multiple pre-reference PoliteOps in single layer not supported" };
        }
        preModalPolite = op;
      } else {
        if (postModalPolite !== null) {
          if (isRedundantPoliteCarry(postModalPolite, op)) {
            continue;
          }
          return { ok: false, reason: "multiple post-reference PoliteOps in single layer not supported" };
        }
        postModalPolite = op;
      }
    } else if (op.kind === "classicalAuxResidue") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "obligation") {
      if (obligation !== null) {
        return { ok: false, reason: "multiple obligation ops not supported" };
      }
      obligation = op;
    } else if (op.kind === "idiom" && op.idiom === "forbidden") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "negative_necessity_koto_wa") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "negative_necessity_sumu") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "permission") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "inevitable_zaru_o_enai") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "cannot_refrain_negative_dewa_irarenai") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "method_you_ga_nai") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "negative_necessity_made_mo") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "only_option_shika_nai") {
      continue;
    } else if (op.kind === "modal") {
      if (modal === null) {
        modal = op;
      }
    } else if (op.kind === "scopeBridge") {
      continue;
    } else if (op.kind === "postverbAuxiliary") {
      continue;
    } else if (op.kind === "predicateProjectionCarrier") {
      continue;
    } else if (op.kind === "predicateQuoteCarrier") {
      continue;
    } else if (op.kind === "adjCopulaBridge") {
      continue;
    } else if (op.kind === "copula") {
      if (op.variant === "conditional_nara") {
        if (connective !== null) {
          return { ok: false, reason: "multiple ConnectiveOps (via copula projection) not supported" };
        }
        connective = createConnectiveOp({  connective: "conditional", surface: "なら", source: op.source });
      } else if (op.polarity === "negative") {
        const nextOp = layer.ops[i + 1];
        const followingNeg = nextOp?.kind === "negation" ? nextOp : null;
        const negOp = predicateCopulaNegationOp(op, followingNeg);
        if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
          if (preModalNeg !== null) {
            return { ok: false, reason: "multiple pre-reference NegationOps (via copula projection) not supported" };
          }
          preModalNeg = negOp;
        } else {
          if (postModalNeg === null) {
            postModalNeg = negOp;
          }
          postModalNegations.push(negOp);
        }
        if (followingNeg !== null) {
          i++;
        }
      }
      if (op.polite) {
        const politeOp: PoliteOp = createPoliteOp({  source: op.source });
        if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
          if (preModalPolite === null) {
            preModalPolite = politeOp;
          }
        } else {
          if (postModalPolite === null) {
            postModalPolite = politeOp;
          }
        }
      }
      continue;
    } else if (op.kind === "conjecture") {
      if (conjecture !== null) {
        return { ok: false, reason: "multiple ConjectureOps in single layer not supported" };
      }
      conjecture = op;
    } else if (op.kind === "desire") {
      if (desire !== null) {
        if (
          desireIdx !== null &&
          layer.ops.slice(desireIdx + 1, i).some((between) => chainFinalOpHostCategory(between) === "verbal_predicate")
        ) {
          desire = op;
          desireIdx = i;
          continue;
        }
        return { ok: false, reason: "multiple DesireOps in single layer not supported" };
      }
      desire = op;
      desireIdx = i;
    } else if (op.kind === "voice") {
      if (voice !== null) {
        if (
          voiceIdx !== null &&
          layer.ops.slice(voiceIdx + 1, i).some((between) => between.kind === "predicateQuoteCarrier")
        ) {
          voice = op;
          voiceIdx = i;
          continue;
        }
        if (voice.voice === "causative" && op.voice === "passive") {
          voice = foldCausativePassiveVoiceOps(voice, op);
        } else if (voice.voice === "passive" && op.voice === "passive") {
        } else if (
          voice.voice === "passive" &&
          op.voice === "honorific" &&
          passiveTeIruHonorificCompositionIsCanonical(layer.ops, i)
        ) {
        } else if (isAspectAuxiliaryPotentialVoice(layer.ops, i)) {
        } else {
          return { ok: false, reason: `multi-voice composition '${voice.voice}' + '${op.voice}' not supported` };
        }
      } else {
        voice = op;
        voiceIdx = i;
      }
    } else if (op.kind === "idiom" && op.idiom === "potential_koto_ga_dekiru") {
      if (potentialKotoGaDekiru !== null) {
        return { ok: false, reason: "multiple PotentialKotoGaDekiru ops not supported" };
      }
      potentialKotoGaDekiru = op;
    } else if (op.kind === "connective") {
      if (connective !== null) {
        return { ok: false, reason: "multiple connective ops in single layer not supported" };
      }
      if (i !== layer.ops.length - 1) {
        return { ok: false, reason: "ConnectiveOp not at last position — multi-clause chain not yet supported" };
      }
      connective = op;
    } else if (op.kind === "aspect") {
      if (aspect !== null || benefactive !== null || request !== null || prohibition !== null ||
        desiderative !== null || miseru !== null) {
        if (!multiAspectFoldPath && !commandTerminalBasePath) {
          return { ok: false, reason: "multiple aspect ops in single layer not supported" };
        }
      }
      if (op.aspect === "te_iru" || op.aspect === "te_aru" || op.aspect === "te_oku" ||
        op.aspect === "te_shimau" || op.aspect === "te_miru" || op.aspect === "te_kuru" ||
        op.aspect === "te_iku" || op.aspect === "te_mawaru" || op.aspect === "tsutsu_aru") {
        aspect ??= op;
      } else if (isBenefactiveAspectKind(op.aspect)) {
        benefactive ??= op as BenefactiveAspectOp;
      } else if (op.aspect === "te_kudasai" || op.aspect === "te_kure_tanomu") {
        request ??= op;
      } else if (op.aspect === "naide_kudasai") {
        prohibition ??= op;
      } else if (op.aspect === "te_hoshii") {
        desiderative ??= op;
      } else if (op.aspect === "te_miseru") {
        miseru ??= op;
      } else {
        return { ok: false, reason: `aspect kind '${op.aspect}' not yet supported` };
      }
    }
  }

  const past = preModalTense?.tense === "past";
  const formal = ctx.formal;
  const isVerb = layer.stem.kind === "verb";
  const stemLemma = layer.stem.lemma;
  const stemIrregular = layer.stem.kind === "adverb" ? null : irregularFrom(layer.stem.irregular);
  const stemShortNegationPolicy = layer.stem.shortNegationPolicy;
  const passiveStemOptions = passiveStemOptionsForStem(layer.stem);

  const warnings: Warning[] = [];

  if (preModalPolite !== null) {
    const pSrc = preModalPolite.source.tokens[0];
    const isStandaloneDesu = pSrc !== undefined && (pSrc.pos & POS4) === 助動詞_デス;
    if (isStandaloneDesu && layer.stem.kind === "verb") {
      const desireIdx = layer.ops.findIndex((op) => op.kind === "desire");
      const desireKeepsAdjectival = desireIdx >= 0 &&
        !layer.ops.slice(desireIdx + 1).some((op) => chainFinalOpHostCategory(op) === "verbal_predicate");
      if (!desireKeepsAdjectival) {
        warnings.push({
          type: "non_standard_normalize",
          severity: "warning",
          opKind: "desu_polite_normalize",
          message: "V + です 는 비표준 결합 (식 食べるです 등 colloquial polite-negative 포함). polite 만 정규화 처리."
        });
      }
    }
  }


  if (postModalTense !== null && operatorHeadIdx === -1) {
    return { ok: false, reason: "post-operator TenseOp without operator head — invariant violation" };
  }
  if (postModalPolite !== null && operatorHeadIdx === -1) {
    return { ok: false, reason: "post-operator PoliteOp without operator head — invariant violation" };
  }

  const headOpKind = operatorHeadIdx !== -1 ? layer.ops[operatorHeadIdx]?.kind ?? null : null;
  const headIsModalOrConnective = headOpKind === "modal" || headOpKind === "connective";
  if (preModalPolite !== null && operatorHeadIdx !== -1 && !headIsModalOrConnective) {
    warnings.push({
      type: "non_standard_normalize",
      severity: "warning",
      opKind: "pre_operator_polite_normalize",
      message: "V ます + non-modal/non-connective operator 는 비표준 결합. polite 만 propagation 처리."
    });
  }
  const postPast = postModalTense?.tense === "past";
  let terminalTeFormConnective = false;
  if (connective !== null) {
    connective = utteranceFinalTeConnectiveForRender(connectiveForRender(connective, ctx), ctx);
    terminalTeFormConnective = teFormRendering === "auto" && (isTerminalTeFormConnective(connective, ctx) ||
      teConnectiveClosesQuotedUtterance(connective, ctx) ||
      renyouChuushiClosesUtterance(connective, ctx));
  }
  if (
    stemIsCommittedAdverb &&
    connective !== null &&
    layer.ops.every((op) => op.kind === "connective") &&
    preModalNeg === null &&
    preModalTense === null &&
    preModalPolite === null &&
    postModalNegations.length === 0 &&
    postModalTenses.length === 0 &&
    postModalPolite === null
  ) {
    return {
      ok: true,
      text: stemLemma,
      polite: false,
      traced: [{
        text: stemLemma,
        sourceTokens: layer.stem.source.tokens,
        kind: "lexeme",
        projectionConfidence: "semantic"
      }]
    };
  }
  if (voice?.voice === "potential" && potentialKotoGaDekiru !== null) {
    voice = null;
  }

  const commandQuoteHeadOps = layer.ops.filter(isHeadOp);
  const commandPredicateQuoteCarrier = commandQuoteHeadOps[commandQuoteHeadOps.length - 1];
  const hasCommandPredicateQuoteCarrier =
    commandPredicateQuoteCarrier?.kind === "predicateQuoteCarrier" &&
    commandPredicateQuoteCarrier.style === "compact_toiu";
  const requestQuoteAttributiveOp = hasCommandPredicateQuoteCarrier
    ? commandAttributiveAspectOp(layer.ops, isRequestCommandAspectOp)
    : null;
  const prohibitionQuoteAttributiveOp = hasCommandPredicateQuoteCarrier
    ? commandAttributiveAspectOp(layer.ops, isProhibitionCommandAspectOp)
    : null;
  if (requestQuoteAttributiveOp !== null || prohibitionQuoteAttributiveOp !== null) {
    if (requestQuoteAttributiveOp !== null && prohibitionQuoteAttributiveOp !== null) {
      return { ok: false, reason: "request + prohibition predicate quote carrier composition not supported" };
    }
    if (!isVerb) {
      return { ok: false, reason: "request/prohibition predicate quote carrier requires verb stem" };
    }
    if (connective !== null || postModalNegations.length > 0 || postModalTenses.length > 0 || postModalPolite !== null) {
      return { ok: false, reason: "request/prohibition predicate quote carrier has unsupported outgoing companion op" };
    }
    const commandOp = requestQuoteAttributiveOp ?? prohibitionQuoteAttributiveOp;
    const baseOps = commandOp === null ? [] : attributiveCommandBaseOperatorChain(layer.ops, commandOp);
    if (baseOps.length > 0) {
      if (commandOp === null || !attributiveCommandHeadPatternMatches(layer.ops, commandOp, baseOps)) {
        return { ok: false, reason: "request/prohibition predicate quote carrier base chain has unsupported companion op" };
      }
      const baseCarriesStemNegation = requestQuoteAttributiveOp !== null &&
        requestTerminalBaseCanCarryStemNegation(baseOps);
      if ((preModalNeg !== null && !baseCarriesStemNegation) || preModalTense !== null) {
        return { ok: false, reason: "request/prohibition predicate quote carrier base chain stem neg/tense not supported" };
      }
      const baseRes = commandQuoteCarrierCommandBase(
        layer,
        ctx,
        baseOps,
        baseCarriesStemNegation ? preModalNeg : null
      );
      if (!baseRes.ok) {
        return { ok: false, reason: baseRes.reason };
      }
      if (baseRes.finalNeg !== null) {
        return { ok: false, reason: "request/prohibition predicate quote carrier base chain final negation not supported" };
      }
      const fused = requestQuoteAttributiveOp !== null
        ? composeBaseWithRequestAttributiveQuote(baseRes.base, baseRes.finalPast, null, {})
        : composeRequestProhibitionAttributiveQuote(baseRes.base, {
          requestForm: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp?.prohibition)
        });
      const rendered = (baseRes.finalPast
        ? null
        : reprojectCommandQuoteAttributiveForHeadPolicy(
          fused,
          baseRes.base,
          requestQuoteAttributiveOp !== null ? "request" : "prohibition",
          attributiveProjectionPolicy(layer),
          formal,
          { requestForm: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp?.prohibition) }
        )) ?? fused;
      return rendered.ok ? withStemPrefixApplied(withWarnings(rendered, warnings)) : rendered;
    }
    if (commandOp === null || !attributiveCommandHeadPatternMatches(layer.ops, commandOp, [])) {
      return { ok: false, reason: "request/prohibition predicate quote carrier has unsupported companion op" };
    }
    if (preModalTense !== null) {
      return { ok: false, reason: "request/prohibition predicate quote carrier stem tense not supported" };
    }
    const stemQuoteBase = layer.stem.koreanPrefix === undefined || layer.stem.koreanPrefix.length === 0
      ? simpleStemBase(stemLemma, stemIrregular, true)
      : { ...simpleStemBase(stemLemma, stemIrregular, true), prefix: layer.stem.koreanPrefix };
    const fusedStemQuote = requestQuoteAttributiveOp !== null
      ? renderRequestAttributiveQuoteFromStem({
        stemLemma,
        stemIrregular,
        isVerb,
        preNeg: preModalNeg,
        past: false,
        stemSourceTokens: layer.stem.source.tokens,
        ...(layer.stem.koreanPrefix === undefined ? {} : { stemKoreanPrefix: layer.stem.koreanPrefix }),
        ...(requestQuoteAttributiveOp === null ? {} : { requestSourceTokens: requestQuoteAttributiveOp.source.tokens }),
        carrierSourceTokens: layer.ops.find((op) => op.kind === "predicateQuoteCarrier")?.source.tokens ?? []
      })
      : composeRequestProhibitionAttributiveQuote(simpleStemBase(stemLemma, stemIrregular, true), {
        requestForm: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp?.prohibition),
        ...(prohibitionQuoteAttributiveOp !== null && preModalNeg === null
          ? {
            trace: {
              stemTokens: layer.stem.source.tokens,
              negativeTokens: prohibitionQuoteAttributiveOp.source.tokens.slice(0, 1),
              bridgeTokens: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp.prohibition)
                ? prohibitionQuoteAttributiveOp.source.tokens.slice(1, 2)
                : prohibitionQuoteAttributiveOp.source.tokens.slice(1),
              requestTailTokens: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp.prohibition)
                ? prohibitionQuoteAttributiveOp.source.tokens.slice(2)
                : [],
              carrierTokens: commandPredicateQuoteCarrier?.source.tokens ?? []
            }
          }
          : {})
      });
    const rendered = (preModalNeg !== null
      ? null
      : reprojectCommandQuoteAttributiveForHeadPolicy(
        fusedStemQuote,
        stemQuoteBase,
        requestQuoteAttributiveOp !== null ? "request" : "prohibition",
        attributiveProjectionPolicy(layer),
        formal,
        { requestForm: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp?.prohibition) }
      )) ?? fusedStemQuote;
    return rendered.ok ? withWarnings(rendered, warnings) : rendered;
  }

  const causativeItadakuCommitment = renderCausativeReceiveHumbleCommitment({
    stem: layer.stem,
    stemLemma,
    stemIrregular,
    voice,
    benefactive,
    connective,
    modal,
    conjecture,
    desire,
    obligation,
    potentialKotoGaDekiru,
    aspect,
    request,
    prohibition,
    desiderative,
    miseru,
    preModalNeg,
    postModalNeg,
    preModalTense,
    postModalTense,
    preModalPolite,
    postModalPolite,
    formal,
    lookups: ctx.lookups
  });
  if (causativeItadakuCommitment !== null) {
    return withWarnings(causativeItadakuCommitment, warnings);
  }

  const opChain = collectOperatorChain(layer.ops);
  const renderViaOperatorChain = (): RenderOutcome => {
    const chainWarnings: Warning[] = [...warnings];
    const wrapSlots = assignOperatorChainWrapSlots(layer, opChain, postModalTenses, postModalNegations);
    if (!wrapSlots.ok) {
      return { ok: false, reason: wrapSlots.reason };
    }
    const { pastAfterChainIdx, negAfterChainIdx, negBeforeChainIdx } = wrapSlots.slots;
    const chainCtx: ChainContext = {
      lookups: ctx.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      ...chainStemTraceFields(layer.stem),
      ...(preModalTense === null ? {} : { stemPastSourceTokens: preModalTense.source.tokens }),
      sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
      ...(stemIsCommittedAdverb ? { adverbialStemLemma: stemLemma } : {}),
      preModalNeg, stemPast: past,
      pastAfterChainIdx, negAfterChainIdx, negBeforeChainIdx,
      formal,
      shortNegationPolicy: stemShortNegationPolicy,
      absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
      ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
      passiveStemOptions
    };
    chainWarnings.push(...operatorChainWarnings(opChain, preModalNeg));
    let isPoliteCombined = preModalPolite !== null || postModalPolite !== null;
    for (const op of opChain) {
      if (op.kind === "modal" && op.polite) isPoliteCombined = true;
      else if (op.kind === "conjecture" && op.polite) isPoliteCombined = true;
      else if (op.kind === "postverbAuxiliary" && op.auxiliary.polite === true) isPoliteCombined = true;
      else if (op.kind === "idiom" && (op.idiom === "obligation" || op.idiom === "forbidden") && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "permission" && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "negative_necessity_sumu" && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "negative_necessity_koto_wa" && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "inevitable_zaru_o_enai" && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "cannot_refrain_negative_dewa_irarenai" && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "method_you_ga_nai" && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "wake_impossible" && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "negative_necessity_made_mo" && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "only_option_shika_nai" && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "experience_koto_ga_aru" && op.polite) isPoliteCombined = true;
      else if (op.kind === "idiom" && op.idiom === "degree_intensifier" && op.polite) isPoliteCombined = true;
      else if (op.kind === "predicateProjectionCarrier" && op.polite === true) isPoliteCombined = true;
      else if (op.kind === "scopeBridge" && op.polite) isPoliteCombined = true;
    }
    if (connective?.questionContentRole === "terminal") {
      const terminalBaseRes = chainBases(opChain, stemLemma, stemIrregular, isVerb, chainCtx);
      if (!terminalBaseRes.ok) {
        return { ok: false, reason: terminalBaseRes.reason };
      }
      return withStemPrefixApplied(withWarnings(
        composeCommittedTailQuestionTerminal(
          terminalBaseRes,
          terminalBaseRes.finalNeg,
          terminalBaseRes.finalPast,
          formal,
          isPoliteCombined,
          "ka",
          true,
          ctx.lookups
        ),
        chainWarnings
      ));
    }
    if (
      connective !== null &&
      connective.connective === "quotative" &&
      opChain.length === 1 &&
      opChain[0]?.kind === "conjecture" &&
      postModalNegations.length === 0 &&
      postModalTenses.length === 0 &&
      !past &&
      preModalNeg?.chainPast !== true
    ) {
      const rendered = renderConjectureQuotativeFromStem({
        stemLemma,
        stemIrregular,
        isVerb,
        preModalNeg,
        past,
        lookups: ctx.lookups
      });
      if (rendered.ok) {
        return withWarnings(rendered, chainWarnings);
      }
    }
    if (
      connective !== null &&
      isConjectureQuestionContinuationConnective(connective) &&
      opChain.length === 1 &&
      opChain[0]?.kind === "conjecture" &&
      postModalNegations.length === 0 &&
      postModalTenses.length === 0
    ) {
      const stemBaseResult = simpleStemBaseResult(stemLemma, stemIrregular, isVerb);
      const stemBase = applyNegationChainToLemmaBase(
        stemBaseResult.base,
        preModalNeg,
        stemBaseResult.finalNegationOptions
      );
      if (stemBase === null) {
        return { ok: false, reason: "conjecture question connective stem chain lowering not supported" };
      }
      const rendered = composeBaseWithConjectureQuestionConnective(
        stemBase,
        connective,
        past || (preModalNeg?.chainPast ?? false),
        formal,
        opChain[0].polite || preModalPolite !== null || postModalPolite !== null
      );
      return rendered.ok ? withWarnings(rendered, chainWarnings) : rendered;
    }
    const baseRes = chainBases(opChain, stemLemma, stemIrregular, isVerb, chainCtx);
    if (!baseRes.ok) {
      return { ok: false, reason: baseRes.reason };
    }
    if (
      connective !== null &&
      isConjectureQuestionContinuationConnective(connective) &&
      opChain.length === 2 &&
      opChain[0]?.kind === "scopeBridge" &&
      opChain[1]?.kind === "conjecture" &&
      pastAfterChainIdx.size === 0 &&
      negAfterChainIdx.size === 0
    ) {
      const scopeOnlyRes = chainBases([opChain[0]], stemLemma, stemIrregular, isVerb, chainCtx);
      if (!scopeOnlyRes.ok) {
        return { ok: false, reason: scopeOnlyRes.reason };
      }
      const scopeOnlyBaseResult: BaseResult = {
        ok: true,
        base: scopeOnlyRes.base,
        chainOnFinalSupported: scopeOnlyRes.chainOnFinalSupported,
        ...(scopeOnlyRes.finalNegationOptions === undefined
          ? {}
          : { finalNegationOptions: scopeOnlyRes.finalNegationOptions }),
        ...(scopeOnlyRes.finalNegationLoweringPolicy === undefined
          ? {}
          : { finalNegationLoweringPolicy: scopeOnlyRes.finalNegationLoweringPolicy }),
        ...(scopeOnlyRes.connectivePrefixContraction === undefined
          ? {}
          : { connectivePrefixContraction: scopeOnlyRes.connectivePrefixContraction }),
        ...(scopeOnlyRes.connectiveBaseOverride === undefined
          ? {}
          : { connectiveBaseOverride: scopeOnlyRes.connectiveBaseOverride })
      };
      const conjectureQuestionPolite =
        preModalPolite !== null ||
        postModalPolite !== null ||
        opChain[0].polite ||
        opChain[1].polite;
      const rendered = composeCommittedBaseWithConjectureQuestionConnective(
        scopeOnlyBaseResult,
        connective,
        scopeOnlyRes.finalPast,
        formal,
        conjectureQuestionPolite
      );
      return withStemPrefixApplied(withWarnings(rendered, chainWarnings));
    }
    const lastChainOp = opChain[opChain.length - 1];
    const volitionalQuestionQuotative = connective !== null &&
      connective.connective === "question_quotative" &&
      connective.surface === "かと";
    const lastBenefactive =
      opChain.length === 1 && lastChainOp !== undefined && lastChainOp.kind === "aspect" &&
        isBenefactiveAspectKind(lastChainOp.aspect)
        ? lastChainOp as BenefactiveAspectOp
        : null;
    if (
      lastChainOp !== undefined &&
      lastBenefactive === null &&
      (opSourceIsVolitional(lastChainOp) ||
        volitionalMoodBearerBlocksCohortative(layer.stem, lastChainOp)) &&
      baseRes.finalNeg === null &&
      baseRes.finalPast === false &&
      baseRes.base.final.kind === "lemma" &&
      (baseRes.base.final.isVerb || lastChainOp.kind === "aspect")
    ) {
      const volitionalBase: KoreanLemmaPredicateBase = {
        prefix: baseRes.base.prefix,
        final: baseRes.base.final,
        ...(baseRes.base.policy === undefined ? {} : { policy: baseRes.base.policy })
      };
      if (
        connective !== null &&
        connective.surface === "と" &&
        isVolitionalPurposeToConnective(connective)
      ) {
        return withStemPrefixApplied(withWarnings(
          attachCommittedChainTrace(
            applyQuoteBoundaryFocus(
              renderBaseVolitionalPurposeConnective(volitionalBase),
              connective.attemptFocusParticle
            ),
            baseRes
          ),
          chainWarnings
        ));
      }
      if (
        connective !== null &&
        connective.closedChainMood !== undefined &&
        exemplificationTakesClosedPropositionComplement(connective) &&
        connective.closedSfp === undefined &&
        !volitionalMoodBearerBlocksCohortative(layer.stem, lastChainOp)
      ) {
        return withStemPrefixApplied(withWarnings(
          attachCommittedChainTrace(
            composeBaseWithSfpClosedExemplification(
              volitionalBase,
              connective,
              false,
              false,
              null,
              formal,
              ctx.lookups,
              {}
            ),
            baseRes
          ),
          chainWarnings
        ));
      }
      if (
        connective !== null &&
        connective.connective === "quotative" &&
        !volitionalMoodBearerBlocksCohortative(layer.stem, lastChainOp)
      ) {
        return withStemPrefixApplied(withWarnings(
          attachCommittedChainTrace(
            applyQuoteBoundaryFocus(
              renderBaseVolitionalQuotative(volitionalBase),
              connective.quoteBoundary?.focusParticle
            ),
            baseRes
          ),
          chainWarnings
        ));
      }
      if (volitionalQuestionQuotative && !volitionalMoodBearerBlocksCohortative(layer.stem, lastChainOp)) {
        const question = renderChainVolitionalQuestionQuotative(volitionalBase);
        if (question.ok) {
          return withStemPrefixApplied(withWarnings(attachCommittedChainTrace(question, baseRes), chainWarnings));
        }
      }
      if (connective === null) {
        if (volitionalMoodBearerBlocksCohortative(layer.stem, lastChainOp)) {
          return withStemPrefixApplied(withWarnings(
            attachCommittedChainTrace(
              renderBaseVolitionalConjectureTerminal(volitionalBase, isPoliteCombined),
              baseRes
            ),
            chainWarnings
          ));
        }
        return withStemPrefixApplied(withWarnings(
          attachCommittedChainTrace(renderBaseVolitionalTerminal(volitionalBase), baseRes),
          chainWarnings
        ));
      }
      const chainConcessiveEnding = volitionalConcessiveEnding(connective);
      if (chainConcessiveEnding !== null) {
        return withStemPrefixApplied(withWarnings(
          attachCommittedChainTrace(
            renderBaseVolitionalConcessive(volitionalBase, chainConcessiveEnding),
            baseRes
          ),
          chainWarnings
        ));
      }
    }
    if (
      lastChainOp !== undefined &&
      lastChainOp.kind === "aspect" &&
      lastBenefactive === null &&
      connective !== null &&
      connective.surface === "と" &&
      (connective.connective === "quotative" || isVolitionalPurposeToConnective(connective)) &&
      postModalPolite !== null &&
      ((postModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_ &&
      baseRes.finalNeg === null &&
      !baseRes.finalPast
    ) {
      const rendered = connective.connective === "quotative"
        ? applyQuoteBoundaryFocus(
          renderPredicateBaseVolitionalQuotative(baseRes.base),
          connective.quoteBoundary?.focusParticle
        )
        : renderPredicateBaseVolitionalPurposeConnective(baseRes.base);
      return withStemPrefixApplied(withWarnings(rendered, chainWarnings));
    }
    if (
      lastChainOp !== undefined &&
      lastChainOp.kind === "aspect" &&
      lastBenefactive === null &&
      volitionalQuestionQuotative &&
      postModalPolite !== null &&
      ((postModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_ &&
      baseRes.finalNeg === null &&
      !baseRes.finalPast
    ) {
      const lemmaBase = lemmaPredicateBase(baseRes.base);
      const question = lemmaBase === null ? null : renderChainVolitionalQuestionQuotative(lemmaBase);
      if (question?.ok === true) {
        return withStemPrefixApplied(withWarnings(question, chainWarnings));
      }
    }
    const lastSimpleAspect =
      lastChainOp !== undefined && lastChainOp.kind === "aspect" &&
        isSimpleAspectOpKind(lastChainOp.aspect)
        ? lastChainOp as SimpleAspectOp
        : null;
    if (lastSimpleAspect !== null && connective === null) {
      const lastAuxToken = lastSimpleAspect.source.tokens[lastSimpleAspect.source.tokens.length - 1];
      const lastAuxPos5A = (lastAuxToken?.pos ?? 0) & POS5A;
      if (
        lastAuxPos5A === 未然形_ &&
        baseRes.finalNeg === null &&
        baseRes.base.final.kind === "lemma"
      ) {
        return withStemPrefixApplied(withWarnings(attachCommittedChainTrace({
          ok: true,
          text: `${baseRes.base.prefix}${conjugate(baseRes.base.final.lemma, baseRes.base.final.irregular, "지")}`,
          polite: isPoliteCombined
        }, baseRes), chainWarnings));
      }
      if (opSourceIsVolitional(lastSimpleAspect)) {
        return { ok: false, reason: "simple aspect volitional + chain/tense composition not yet supported" };
      }
      if (lastSimpleAspect.terminalMood === "imperative") {
        if (baseRes.finalNeg !== null || baseRes.finalPast || isPoliteCombined) {
          return { ok: false, reason: "simple aspect imperative + chain/tense/polite composition not yet supported" };
        }
        return withStemPrefixApplied(withWarnings(
          attachCommittedChainTrace(composeBaseWithPlainImperative(baseRes.base, ctx.formal), baseRes),
          chainWarnings
        ));
      }
      if (
        postModalPolite !== null &&
        ((postModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_ &&
        baseRes.finalNeg === null &&
        !baseRes.finalPast
      ) {
        const rendered = lastSimpleAspect.semantic?.renderStrategy === "drop_aux"
          ? renderPredicateBaseVolitionalPoliteRegisterTerminal(baseRes.base, formal)
          : renderPredicateBaseVolitionalPoliteTerminal(baseRes.base);
        return withStemPrefixApplied(withWarnings(attachCommittedChainTrace(rendered, baseRes), chainWarnings));
      }
      if (
        lastSimpleAspect.semantic?.renderStrategy === "drop_aux" &&
        baseRes.finalNeg !== null &&
        baseRes.finalNeg.chainDepth === 1 &&
        (baseRes.finalNeg.preferShortNegation || policyAllowsShortNegation(stemShortNegationPolicy)) &&
        baseRes.base.final.kind === "lemma" &&
        baseRes.base.final.isVerb
      ) {
        const finalStem = composeFinalForm(
          baseRes.base.final.lemma,
          baseRes.base.final.irregular,
          true,
          baseRes.finalPast || baseRes.finalNeg.chainPast,
          formal,
          isPoliteCombined,
          ctx.lookups
        );
        return withStemPrefixApplied(withWarnings(attachCommittedChainTrace({
          ok: true,
          text: `${baseRes.base.prefix}안 ${finalStem}`,
          polite: isPoliteCombined
        }, baseRes), chainWarnings));
      }
      if (aspectContractsToPast(lastSimpleAspect) && baseRes.finalNeg === null) {
        const explicitPast = pastAfterChainIdx.get(opChain.length - 1) !== undefined;
        return withStemPrefixApplied(withWarnings(
          composeContractedPastAspectTerminal(baseRes, explicitPast, formal, isPoliteCombined, ctx.lookups),
          chainWarnings
        ));
      }
    }
    if (
      opChain.length === 1 &&
      lastChainOp !== undefined &&
      lastChainOp.kind === "aspect" &&
      lastChainOp.aspect === "te_miseru" &&
      connective === null &&
      baseRes.finalNeg === null &&
      lastChainOp.semantic?.reading === "volitional_showing"
    ) {
      return withWarnings(renderMiseru({
        stemLemma,
        stemIrregular,
        isVerb,
        miseru: lastChainOp,
        preModalNeg: null,
        past: baseRes.finalPast,
        formal,
        isPolite: isPoliteCombined,
        lookups: ctx.lookups
      }), chainWarnings);
    }
    if (lastBenefactive !== null) {
      const benefAuxPos5A =
        (lastBenefactive.source.tokens[lastBenefactive.source.tokens.length - 1]?.pos ?? 0) & POS5A;
      const benefPoliteVolitional = postModalPolite !== null &&
        ((postModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_;
      if (
        (benefAuxPos5A === 意志推量形_ || benefPoliteVolitional) &&
        baseRes.finalNeg === null &&
        !baseRes.finalPast
      ) {
        if (
          connective !== null &&
          connective.surface === "と" &&
          connective.connective === "quotative"
        ) {
          const plain = renderBenefactiveVolitional({
            stemLemma, stemIrregular, benefactive: lastBenefactive, formal: false
          });
          return withWarnings(
            plain.ok
              ? attachCommittedChainTrace({ ok: true, text: `${plain.text}고`, polite: plain.polite }, baseRes)
              : plain,
            chainWarnings
          );
        }
        if (connective === null) {
          return withWarnings(attachCommittedChainTrace(renderBenefactiveVolitional({
            stemLemma,
            stemIrregular,
            benefactive: lastBenefactive,
            formal: benefPoliteVolitional ? true : formal
          }), baseRes), chainWarnings);
        }
        if (
          connective !== null &&
          connective.surface === "と" &&
          connective.connective === "volitional_purpose"
        ) {
          return withWarnings(attachCommittedChainTrace(applyQuoteBoundaryFocus(renderBenefactiveVolitionalPurpose({
            stemLemma,
            stemIrregular,
            benefactive: lastBenefactive
          }), connective.attemptFocusParticle), baseRes), chainWarnings);
        }
        if (volitionalQuestionQuotative) {
          const question = renderBenefactiveVolitionalQuestionQuotative({
            stemLemma,
            stemIrregular,
            benefactive: lastBenefactive
          });
          if (question.ok) {
            return withWarnings(attachCommittedChainTrace(question, baseRes), chainWarnings);
          }
        }
      }
      if (lastBenefactive.terminalMood === "imperative" && connective === null) {
        if (baseRes.finalNeg !== null || baseRes.finalPast || isPoliteCombined) {
          return { ok: false, reason: "benefactive imperative + chain/tense/polite composition not yet supported" };
        }
        return withStemPrefixApplied(withWarnings(
          attachCommittedChainTrace(composeBaseWithPlainImperative(baseRes.base, ctx.formal), baseRes),
          chainWarnings
        ));
      }
      if (benefAuxPos5A === 未然形_ && connective === null && baseRes.finalNeg === null) {
        if (lastBenefactive.benefactive.potential) {
          return withStemPrefixApplied(withWarnings(
            { ok: true, text: `${baseRes.base.prefix}있지`, polite: isPoliteCombined },
            chainWarnings
          ));
        }
        if (baseRes.base.final.kind === "lemma") {
          return withStemPrefixApplied(withWarnings(attachCommittedChainTrace({
            ok: true,
            text: `${baseRes.base.prefix}${conjugate(baseRes.base.final.lemma, baseRes.base.final.irregular, "지")}`,
            polite: isPoliteCombined
          }, baseRes), chainWarnings));
        }
      }
    }
    if (connective !== null) {
      if (
        connective.connective === "quotative" &&
        connective.quotativeMood === "imperative" &&
        baseRes.finalNeg === null &&
        !baseRes.finalPast
      ) {
        return withStemPrefixApplied(withWarnings(
          attachCommittedChainTrace(composeBaseWithImperativeQuotative(baseRes.base), baseRes),
          chainWarnings
        ));
      }
      const connectivePolite =
        isPoliteCombined &&
        (shouldCarryConnectivePoliteness(ctx) ||
          scopeCarrierCanPreserveSourcePoliteness(baseRes.base, connective));
      if (terminalTeFormConnective) {
        return withStemPrefixApplied(withWarnings(
          composeCommittedTailTerminalTeForm(
            baseRes,
            connective,
            baseRes.finalPast,
            baseRes.finalNeg,
            formal,
            ctx.lookups,
            teConnectiveClosesUtterance(connective, ctx) || teConnectiveClosesQuotedUtterance(connective, ctx),
            teConnectiveClosesAsIisashi(connective, ctx)
          ),
          chainWarnings
        ));
      }
      const renderedConnective = composeCommittedTailConnectiveWithNativeTrace(
        baseRes,
        connective,
        baseRes.finalPast,
        connectivePolite,
        baseRes.finalNeg,
        formal,
        isPoliteCombined,
        ctx.lookups
      );
      return withStemPrefixApplied(withWarnings(renderedConnective, chainWarnings));
    }
    return withStemPrefixApplied(withWarnings(
      composeCommittedTailTerminal(baseRes, baseRes.finalNeg, baseRes.finalPast, formal, isPoliteCombined, ctx.lookups),
      chainWarnings
    ));
  };

  if (!commandTerminalBasePath && opChain.length >= 1) {
    return renderViaOperatorChain();
  }

  const renderNonChainTail = (): RenderOutcome => {

    if (postModalNegations.length > 1 || postModalTenses.length > 1) {
      return { ok: false, reason: "multiple post-reference wrap ops require operator-chain dispatcher" };
    }

    if (connective !== null) {
      if (connective.questionContentRole === "terminal") {
        const baseResult = simpleStemBaseResult(stemLemma, stemIrregular, isVerb);
        return withStemPrefixApplied(withWarnings(
          composeCommittedTailQuestionTerminal(
            baseResult,
            preModalNeg,
            past,
            formal,
            preModalPolite !== null || postModalPolite !== null,
            "ka",
            false,
            ctx.lookups
          ),
          warnings
        ));
      }
      const stemFormPos5A = (layer.stem.source.tokens[layer.stem.conjugationAnchor]?.pos ?? 0) & POS5A;
      const stemMoodIsVolitional = stemFormPos5A === 意志推量形_ ||
        layer.stem.stemMood === "volitional";
      const isVolitionalStem = stemFormPos5A === 意志推量形_ ||
        (preModalPolite !== null &&
          ((preModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_);
      const volitionalMoodStem = isVolitionalStem || stemMoodIsVolitional;
      if (volitionalMoodStem) {
        if (
          stemMoodIsVolitional &&
          preModalPolite === null &&
          connective.connective === "retrospective_quotative" &&
          connective.retrospectiveQuotativeFlavor === "question_retrospective" &&
          isVerb &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          return withWarnings(composeCommittedTailConnective(
            simpleStemBaseResult(stemLemma, stemIrregular, true),
            connective,
            false,
            false,
            null,
            formal,
            ctx.lookups
          ), warnings);
        }
        const volitionalQuestionContentConnective =
          (
            (
              connective.connective === "question_content" ||
              connective.connective === "question_quotative" ||
              connective.connective === "alternative"
            ) &&
            connective.surface === "か"
          ) ||
          (connective.connective === "question_quotative" && connective.surface === "かと") ||
          connective.connective === "question_reformulation";
        const volitionalQuestionContentHost = isVerb ||
          (layer.stem.kind === "adj" &&
            ((connective.connective === "question_quotative" && connective.surface === "かと") ||
              connective.connective === "question_reformulation"));
        if (
          volitionalMoodStem &&
          volitionalQuestionContentConnective &&
          volitionalQuestionContentHost &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          const rendered = connective.connective === "question_quotative" && connective.surface === "かと"
            ? renderVolitionalQuestionQuotative({
              stemLemma,
              stemIrregular
            })
            : connective.connective === "question_reformulation"
              ? renderVolitionalQuestionReformulation({ stemLemma, stemIrregular })
            : connective.quotedQuestionContext === true
              ? renderVolitionalQuotedQuestionContent({
                stemLemma,
                stemIrregular
              })
              : renderVolitionalQuestionContent({
                stemLemma,
                stemIrregular
              });
          return withStemPrefixApplied(withWarnings(rendered, warnings));
        }
        if (
          stemMoodIsVolitional &&
          !volitionalMoodBearerBlocksCohortative(layer.stem, undefined) &&
          preModalPolite === null &&
          connective.connective === "question_content_alternative" &&
          isVerb &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          return withStemPrefixApplied(withWarnings(
            renderVolitionalQuestionAlternative({ stemLemma, stemIrregular }),
            warnings
          ));
        }
        if (
          stemMoodIsVolitional &&
          !volitionalMoodBearerBlocksCohortative(layer.stem, undefined) &&
          preModalPolite === null &&
          connective.connective === "quotative" &&
          isVerb &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          return withWarnings(applyQuoteBoundaryFocus(renderBaseVolitionalQuotative({
            prefix: layer.stem.koreanPrefix ?? "",
            final: {
              kind: "lemma",
              lemma: stemLemma,
              irregular: stemIrregular,
              isVerb: true
            }
          }), connective.quoteBoundary?.focusParticle), warnings);
        }
        if (
          preModalPolite !== null &&
          connective.connective === "quotative" &&
          isVerb &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          return withWarnings(applyQuoteBoundaryFocus(renderBaseVolitionalQuotative({
            prefix: layer.stem.koreanPrefix ?? "",
            final: {
              kind: "lemma",
              lemma: stemLemma,
              irregular: stemIrregular,
              isVerb: true
            }
          }), connective.quoteBoundary?.focusParticle), warnings);
        }
        if (
          stemMoodIsVolitional &&
          preModalPolite === null &&
          connective.surface === "と" &&
          isVolitionalPurposeToConnective(connective) &&
          isVerb &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          return withWarnings(applyQuoteBoundaryFocus(renderVolitionalPurposeConnective({
            stemLemma,
            stemIrregular
          }), connective.attemptFocusParticle), warnings);
        }
        if (
          stemMoodIsVolitional &&
          preModalPolite === null &&
          connective.surface === "が" &&
          (isVerb || layer.stem.kind === "adj") &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          const gaConcessiveEnding = volitionalConcessiveEnding(connective);
          if (gaConcessiveEnding !== null) {
            return withWarnings({
              ok: true,
              text: `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, gaConcessiveEnding)}`,
              polite: false
            }, warnings);
          }
        }
        if (
          preModalPolite !== null &&
          (connective.connective === "listing" ||
            connective.connective === "reason" ||
            connective.connective === "adversative") &&
          isVerb &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          const futureProposition = `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, "ㄹ/을")} 것`;
          return withWarnings(composeCommittedTailConnective(
            { ok: true, base: nounCopulaBase(futureProposition, true), chainOnFinalSupported: true },
            connectiveForRender(connective, ctx),
            false,
            false,
            null,
            formal,
            ctx.lookups
          ), warnings);
        }
        if (
          stemMoodIsVolitional &&
          preModalPolite === null &&
          connective.connective === "bound_nominal_reason" &&
          isVerb &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          const proposal = conjugate(stemLemma, stemIrregular, "자");
          return withWarnings({
            ok: true,
            text: `${layer.stem.koreanPrefix ?? ""}${proposal}는 것으로`,
            polite: false
          }, warnings);
        }
        if (
          connective.connective === "exemplification" &&
          connective.closedSfp !== undefined &&
          (quotedMoodForClosingSfpEffect(connective.closedSfp.effect) ?? connective.closedChainMood) === "volitional" &&
          isVerb &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          return withWarnings(composeBaseWithConnective(
            {
              prefix: layer.stem.koreanPrefix ?? "",
              final: { kind: "lemma", lemma: stemLemma, irregular: stemIrregular, isVerb: true }
            },
            connective,
            false,
            false,
            null,
            formal,
            ctx.lookups
          ), warnings);
        }
        if (
          stemMoodIsVolitional &&
          preModalPolite === null &&
          connective.connective === "exemplification" &&
          isVerb &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          if (connective.closedChainMood !== undefined && exemplificationTakesClosedPropositionComplement(connective)) {
            return withWarnings(composeBaseWithSfpClosedExemplification(
              {
                prefix: layer.stem.koreanPrefix ?? "",
                final: { kind: "lemma", lemma: stemLemma, irregular: stemIrregular, isVerb: true }
              },
              connective,
              false,
              false,
              null,
              formal,
              ctx.lookups,
              {}
            ), warnings);
          }
          return withWarnings({
            ok: true,
            text: `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, "(으)려는")} 따위`,
            polite: false
          }, warnings);
        }
        const stemConcessiveEnding = volitionalConcessiveEnding(connective);
        if (
          stemMoodIsVolitional &&
          preModalPolite === null &&
          stemConcessiveEnding !== null &&
          (isVerb || layer.stem.kind === "adj") &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          return withWarnings({
            ok: true,
            text: `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, stemConcessiveEnding)}`,
            polite: false
          }, warnings);
        }
        if (
          stemMoodIsVolitional &&
          preModalPolite === null &&
          connective.connective === "predicate_projection_degree_extent" &&
          isVerb &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          const degreeSuffix = connective.surface.endsWith("に")
            ? "싶을 정도로"
            : connective.surface.endsWith("の")
              ? "싶을 정도의"
              : "싶을 정도";
          return withWarnings({
            ok: true,
            text: `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, "자")} ${degreeSuffix}`,
            polite: false
          }, warnings);
        }
        const quotativeVolitionalCarrier = (stemMoodIsVolitional && preModalPolite === null) ||
          (!stemMoodIsVolitional && isVolitionalStem && stemFormPos5A !== 意志推量形_);
        if (
          quotativeVolitionalCarrier &&
          isVerb &&
          (connective.connective === "predicate_projection_quotative_manner_simile" ||
            connective.connective === "predicate_projection_quotative_manner_simile_attributive") &&
          quotedMoodForClosingSfpEffect(connective.closedSfp?.effect) !== "imperative" &&
          connective.quotativeMood !== "imperative" &&
          modal === null && obligation === null && desire === null && voice === null &&
          potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
          benefactive === null && request === null && prohibition === null &&
          desiderative === null && miseru === null && preModalNeg === null &&
          preModalTense === null && postModalNeg === null && postModalTense === null &&
          postModalPolite === null
        ) {
          const simileSuffix =
            connective.connective === "predicate_projection_quotative_manner_simile_attributive"
              ? "듯한"
              : "듯이";
          if (
            connective.quotativeMood === "interrogative" ||
            quotedMoodForClosingSfpEffect(connective.closedSfp?.effect) === "interrogative"
          ) {
            const question = renderVolitionalQuotedQuestionContent({ stemLemma, stemIrregular });
            return withWarnings(question.ok
              ? { ok: true, text: `${layer.stem.koreanPrefix ?? ""}${question.text} 하는 ${simileSuffix}`, polite: false }
              : question, warnings);
          }
          return withWarnings({
            ok: true,
            text: `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, "자")}는 ${simileSuffix}`,
            polite: false
          }, warnings);
        }
        if (isVolitionalStem) {
          return { ok: false, reason: `volitional + connective not yet supported` };
        }
      }

      if (
        stemFormPos5A === 命令形_ &&
        isVerb &&
        !past &&
        (connective.connective === "quotative" || isRequestComplementLikeConnective(connective)) &&
        modal === null && obligation === null && desire === null && voice === null &&
        potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
        benefactive === null && request === null && prohibition === null &&
        desiderative === null && miseru === null && preModalNeg === null &&
        preModalTense === null && postModalNeg === null && postModalTense === null &&
        postModalPolite === null
      ) {
        const ending = connective.quoteBoundary?.koreanClauseForm === "달라는 말을"
          ? "(으)라는 말을"
          : "(으)라고";
        const body = conjugate(stemLemma, stemIrregular, ending);
        return withWarnings(
          applyRequestComplementQuoteFocus(
            { ok: true, text: `${layer.stem.koreanPrefix ?? ""}${body}`, polite: false },
            connective
          ),
          warnings
        );
      }

      if (
        stemFormPos5A === 連用形_ &&
        isVerb &&
        !past &&
        isBareTeRequestComplementConnective(connective) &&
        modal === null && obligation === null && desire === null && voice === null &&
        potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
        benefactive === null && request === null && prohibition === null &&
        desiderative === null && miseru === null && preModalNeg === null &&
        preModalTense === null && postModalNeg === null && postModalTense === null &&
        postModalPolite === null
      ) {
        const ending = connective.quoteBoundary?.koreanClauseForm === "달라는 말을"
          ? "(으)라는 말을"
          : "(으)라고";
        const body = conjugate(stemLemma, stemIrregular, ending);
        return withWarnings(
          applyRequestComplementQuoteFocus(
            { ok: true, text: `${layer.stem.koreanPrefix ?? ""}${body}`, polite: false },
            connective
          ),
          warnings
        );
      }

      let connectiveBaseResult: BaseResult | null = null;
      const basePast = past;
      const baseIsPolite = preModalPolite !== null;
      const basePreNeg: NegationOp | null = preModalNeg;

      if (
        request !== null &&
        requestTerminalBasePath &&
        (
          isRequestComplementLikeConnective(connective) ||
          connective.connective === "quotative" ||
          connective.connective === "predicate_projection_quote_attributive"
        )
      ) {
        if (
          modal !== null || conjecture !== null ||
          potentialKotoGaDekiru !== null || desire !== null || obligation !== null ||
          benefactive !== null || prohibition !== null || desiderative !== null ||
          preModalNeg !== null || preModalTense !== null ||
          postModalNeg !== null || postModalTense !== null || postModalPolite !== null
        ) {
          return { ok: false, reason: "request terminal base + request complement has unsupported companion op" };
        }
        const baseRes = chainBases(
          requestTerminalBaseOps.map(requestTerminalBaseOpForRender),
          stemLemma,
          stemIrregular,
          isVerb,
          {
            lookups: ctx.lookups,
            stemPrefix: layer.stem.koreanPrefix,
            sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
            sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
            preModalNeg: null,
            stemPast: false,
            pastAfterChainIdx: new Map(),
            negAfterChainIdx: new Map(),
            formal,
            shortNegationPolicy: stemShortNegationPolicy,
            absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
            ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
            passiveStemOptions
          }
        );
        if (!baseRes.ok) {
          return { ok: false, reason: baseRes.reason };
        }
        const fused = connective.connective === "predicate_projection_quote_attributive"
          ? composeBaseWithRequestAttributiveQuote(baseRes.base, false, null, {})
          : composeBaseWithRequestComplement(baseRes.base, false, null, {}, connective);
        const rendered = (connective.connective === "predicate_projection_quote_attributive"
          ? reprojectCommandQuoteAttributiveForHeadPolicy(
            fused,
            baseRes.base,
            "request",
            attributiveProjectionPolicy(layer),
            formal
          )
          : null) ?? fused;
        return rendered.ok ? withStemPrefixApplied(withWarnings(rendered, warnings)) : rendered;
      }

      if (
        isRequestComplementLikeConnective(connective) ||
        ((request !== null || prohibition !== null) && (connective.connective === "quotative" || connective.connective === "predicate_projection_quote_attributive"))
      ) {
        if (prohibition !== null) {
          if (
            modal !== null || voice !== null || conjecture !== null ||
            potentialKotoGaDekiru !== null || desire !== null || obligation !== null ||
            aspect !== null || benefactive !== null || request !== null || desiderative !== null ||
            miseru !== null ||
            preModalNeg !== null || preModalTense !== null ||
            postModalNeg !== null || postModalTense !== null || postModalPolite !== null
          ) {
            return { ok: false, reason: "prohibition + request complement has unsupported companion op" };
          }
          const fused = connective.connective === "predicate_projection_quote_attributive"
            ? composeRequestProhibitionAttributiveQuote(simpleStemBase(stemLemma, stemIrregular, isVerb), {
              requestForm: prohibitionUsesRequestForm(prohibition.prohibition)
            })
            : composeRequestProhibitionComplement(
              simpleStemBase(stemLemma, stemIrregular, isVerb),
              connective,
              { requestForm: prohibitionUsesRequestForm(prohibition.prohibition) }
            );
          const rendered = (connective.connective === "predicate_projection_quote_attributive"
            ? reprojectCommandQuoteAttributiveForHeadPolicy(
              fused,
              simpleStemBase(stemLemma, stemIrregular, isVerb),
              "prohibition",
              attributiveProjectionPolicy(layer),
              formal,
              { requestForm: prohibitionUsesRequestForm(prohibition.prohibition) }
            )
            : null) ?? fused;
          return rendered.ok ? withWarnings(rendered, warnings) : rendered;
        }
        if (request !== null && voice !== null) {
          if (
            modal !== null || conjecture !== null ||
            potentialKotoGaDekiru !== null || desire !== null || obligation !== null ||
            aspect !== null || benefactive !== null || prohibition !== null || desiderative !== null ||
            miseru !== null ||
            preModalNeg !== null || preModalTense !== null ||
            postModalNeg !== null || postModalTense !== null || postModalPolite !== null
          ) {
            return { ok: false, reason: "voice + request complement has unsupported companion op" };
          }
          const voiceResult = voiceBase({ voice, stemLemma, stemIrregular, isVerb, passiveStemOptions, lookups: ctx.lookups, sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(layer.stem.koreanPrefix) });
          if (!voiceResult.ok) {
            return { ok: false, reason: voiceResult.reason };
          }
          const rendered = connective.connective === "predicate_projection_quote_attributive"
            ? composeBaseWithRequestAttributiveQuote(voiceResult.base, false, null, {})
            : composeBaseWithRequestComplement(voiceResult.base, false, null, {}, connective);
          return rendered.ok ? withWarnings(rendered, warnings) : rendered;
        }
      }

      if (aspect !== null) {
        return { ok: false, reason: "aspect + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
      } else if (desire !== null) {
        return { ok: false, reason: "desire + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
      } else if (modal !== null) {
        return { ok: false, reason: "modal + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
      } else if (voice !== null) {
        return { ok: false, reason: "voice + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
      } else if (obligation !== null) {
        return { ok: false, reason: "obligation + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
      } else if (conjecture !== null) {
        return { ok: false, reason: "conjecture + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
      } else if (potentialKotoGaDekiru !== null) {
        return { ok: false, reason: "potential + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
      } else if (benefactive !== null) {
        return { ok: false, reason: "benefactive + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
      } else if (desiderative !== null) {
        return { ok: false, reason: "desiderative + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
      } else if (
        request !== null &&
        (
          isRequestComplementLikeConnective(connective) ||
          connective.connective === "quotative" ||
          connective.connective === "exemplification" ||
          connective.connective === "predicate_projection_quote_attributive"
        )
      ) {
        if (connective.surface === "かと") {
          return { ok: false, reason: "request aspect + request-question complement stays with request-family carrier" };
        }
        if (
          modal !== null || obligation !== null || desire !== null || voice !== null ||
          potentialKotoGaDekiru !== null || conjecture !== null ||
          aspect !== null || benefactive !== null || prohibition !== null ||
          desiderative !== null || miseru !== null
        ) {
          return { ok: false, reason: "request + other op + request complement composition not yet supported" };
        }
        const rendered = connective.connective === "predicate_projection_quote_attributive"
          ? renderRequestAttributiveQuoteFromStem({
            stemLemma,
            stemIrregular,
            isVerb,
            preNeg: preModalNeg,
            past,
            stemSourceTokens: layer.stem.source.tokens,
            ...(layer.stem.koreanPrefix === undefined ? {} : { stemKoreanPrefix: layer.stem.koreanPrefix }),
            ...(request === null ? {} : { requestSourceTokens: request.source.tokens }),
            carrierSourceTokens: connective.source.tokens
          })
          : renderRequestComplementFromStem({
            stemLemma,
            stemIrregular,
            isVerb,
            preNeg: preModalNeg,
            past,
            connective
          });
        return rendered.ok ? withWarnings(rendered, warnings) : rendered;
      } else if (miseru !== null) {
        return { ok: false, reason: "miseru + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
      } else if (
        postModalPolite !== null ||
        request !== null || prohibition !== null ||
        miseru !== null
      ) {
        return { ok: false, reason: `connective + other op composition not yet supported` };
      } else {
        connectiveBaseResult = simpleStemBaseResult(stemLemma, stemIrregular, isVerb);
      }
      if (connectiveBaseResult === null) {
        return { ok: false, reason: "connective base invariant violation" };
      }
      const connectivePolite =
        baseIsPolite &&
        (shouldCarryConnectivePoliteness(ctx) ||
          (connectiveBaseResult.ok &&
            scopeCarrierCanPreserveSourcePoliteness(connectiveBaseResult.base, connective)));
      const tracedConnectiveBaseResult: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } = (() => {
        if (
          !connectiveBaseResult.ok ||
          (connectiveBaseResult as { readonly chainSourceTrace?: ChainSourceTrace }).chainSourceTrace !== undefined
        ) {
          return connectiveBaseResult;
        }
        const hostTrace = simpleHostChainSourceTrace(layer, connective);
        if (hostTrace !== null) {
          return { ...connectiveBaseResult, chainSourceTrace: hostTrace };
        }
        if (
          preModalNeg !== null &&
          aspect === null && voice === null && desire === null && modal === null &&
          obligation === null && postModalNeg === null &&
          layer.ops.every((op) =>
            op === connective || op.kind === "negation" || op.kind === "tense" ||
            op.kind === "polite" || op.kind === "classicalAuxResidue" || op.kind === "adjCopulaBridge"
          )
        ) {
          const traceParts = longNegationTraceParts(preModalNeg, layer.ops, [
            ...(preModalTense?.source.tokens ?? []),
            ...(postModalTense?.source.tokens ?? []),
            ...(preModalPolite?.source.tokens ?? [])
          ]);
          const negTrace = longNegationChainTrace(
            stemLemma,
            stemIrregular,
            layer.stem.source.tokens,
            traceParts.negation,
            traceParts.extraFinalTokens
          );
          return negTrace === null
            ? connectiveBaseResult
            : { ...connectiveBaseResult, chainSourceTrace: negTrace };
        }
        if (preModalNeg !== null || preModalTense !== null) {
          return connectiveBaseResult;
        }
        return connectiveBaseResult;
      })();
      if (terminalTeFormConnective) {
        return withWarnings(
          composeCommittedTailTerminalTeForm(
            tracedConnectiveBaseResult,
            connective,
            basePast,
            basePreNeg,
            formal,
            ctx.lookups,
            teConnectiveClosesUtterance(connective, ctx) || teConnectiveClosesQuotedUtterance(connective, ctx),
            teConnectiveClosesAsIisashi(connective, ctx)
          ),
          warnings
        );
      }
      const renderedConnective = composeCommittedTailConnective(
        tracedConnectiveBaseResult, connective, basePast, connectivePolite, basePreNeg, formal, ctx.lookups
      );
      if (
        renderedConnective.ok &&
        renderedConnective.traced === undefined &&
        connective.connective !== "te_form" &&
        connective.connective !== "simultaneous" &&
        connective.connective !== "predicate_projection_tame_gerund" &&
        connective.connective !== "adversative"
      ) {
        const attached = (tracedConnectiveBaseResult as { readonly chainSourceTrace?: ChainSourceTrace }).chainSourceTrace;
        if (attached !== undefined && preModalNeg === null) {
          const closed = closeChainTraceAgainstText(
            {
              ...attached,
              finalSourceTokens: [...attached.finalSourceTokens, ...connective.source.tokens]
            },
            renderedConnective.text
          );
          if (closed !== null) {
            return withWarnings({ ...renderedConnective, traced: closed }, warnings);
          }
        }
        if (attached !== undefined && preModalNeg !== null) {
          const closed = closeChainTraceWithConnectivePieces(attached, renderedConnective.text, connective);
          if (closed !== null) {
            return withWarnings({ ...renderedConnective, traced: closed }, warnings);
          }
        }
      }
      return withWarnings(renderedConnective, warnings);
    }

    if (conjecture !== null) {
      return { ok: false, reason: "conjecture outside operator-chain dispatcher — 비chain 결합 영역 외" };
    }

    if (desire !== null) {
      return { ok: false, reason: "desire outside operator-chain dispatcher — 비chain 결합 영역 외" };
    }

    if (voice !== null && !prohibitionTerminalBasePath) {
      if (
        request !== null &&
        modal === null && obligation === null && potentialKotoGaDekiru === null &&
        aspect === null && benefactive === null &&
        prohibition === null && desiderative === null && miseru === null &&
        conjecture === null && connective === null &&
        preModalNeg === null && preModalTense === null && preModalPolite === null &&
        postModalNeg === null && postModalTense === null && postModalPolite === null
      ) {
        const voiceResult = voiceBase({ voice, stemLemma, stemIrregular, isVerb, passiveStemOptions, lookups: ctx.lookups, sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(layer.stem.koreanPrefix) });
        return withWarnings(renderRequestOnPredicateBase(voiceResult, request, ctx.lookups, {
          formal: ctx.formal
        }), warnings);
      }
      return { ok: false, reason: "voice outside operator-chain dispatcher — 비chain 결합 영역 외" };
    }

    if (potentialKotoGaDekiru !== null) {
      return { ok: false, reason: "potential_koto_ga_dekiru outside operator-chain dispatcher — 비chain 결합 영역 외" };
    }

    const stemPos5A = (layer.stem.source.tokens[layer.stem.conjugationAnchor]?.pos ?? 0) & POS5A;
    const politeIsVolitional = preModalPolite !== null &&
      ((preModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_;
    if (
      stemPos5A !== 意志推量形_ &&
      !politeIsVolitional &&
      volitionalMoodBearerBlocksCohortative(layer.stem, undefined) &&
      layer.stem.kind === "verb" &&
      !past &&
      modal === null && obligation === null && desire === null && voice === null &&
      potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
      benefactive === null && request === null && prohibition === null &&
      desiderative === null && miseru === null && preModalNeg === null &&
      preModalTense === null && postModalNeg === null && postModalTense === null &&
      postModalPolite === null
    ) {
      return withWarnings(withSimpleHostTraced(renderBaseVolitionalConjectureTerminal(
        {
          prefix: layer.stem.koreanPrefix ?? "",
          final: { kind: "lemma", lemma: stemLemma, irregular: stemIrregular, isVerb: true }
        },
        false
      ), layer), warnings);
    }
    const stemMoodCarriesCohortative = layer.stem.stemMood === "volitional" &&
      !volitionalMoodBearerBlocksCohortative(layer.stem, undefined);
    if (stemPos5A === 意志推量形_ || politeIsVolitional || stemMoodCarriesCohortative) {
      if (
        modal !== null || obligation !== null || desire !== null || voice !== null ||
        potentialKotoGaDekiru !== null || preModalNeg !== null || preModalTense !== null
      ) {
        return { ok: false, reason: "Volitional stem + other op composition not yet supported" };
      }
      return withWarnings(withSimpleHostTraced(renderVolitional({
        lookups: ctx.lookups,
        stemLemma, stemIrregular, isVerb, formal,
        isPolite: preModalPolite !== null
      }), layer), warnings);
    }

    if (obligation !== null) {
      return { ok: false, reason: "obligation outside operator-chain dispatcher — 비chain 결합 영역 외" };
    }

    if (request !== null && requestTerminalBasePath) {
      const baseCarriesStemNegation = requestTerminalBaseCanCarryStemNegation(requestTerminalBaseOps);
      if (
        modal !== null || voice !== null || conjecture !== null || connective !== null ||
        potentialKotoGaDekiru !== null || desire !== null || obligation !== null ||
        prohibition !== null || desiderative !== null ||
        (preModalNeg !== null && !baseCarriesStemNegation) || preModalTense !== null ||
        postModalNeg !== null || postModalTense !== null || postModalPolite !== null
      ) {
        return { ok: false, reason: "request terminal base composition has unsupported companion op" };
      }
      const baseRes = chainBases(
        requestTerminalBaseOps.map(requestTerminalBaseOpForRender),
        stemLemma,
        stemIrregular,
        isVerb,
        {
          lookups: ctx.lookups,
          stemPrefix: layer.stem.koreanPrefix,
          sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
          sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
          preModalNeg: baseCarriesStemNegation ? preModalNeg : null,
          stemPast: false,
          pastAfterChainIdx: new Map(),
          negAfterChainIdx: new Map(),
          formal,
          shortNegationPolicy: stemShortNegationPolicy,
          absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
          ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
          passiveStemOptions
        }
      );
      return withStemPrefixApplied(withWarnings(
        renderRequestOnPredicateBase(baseRes, request, ctx.lookups, {
          directAuxiliaryImperative: requestBaseCanUseDirectAuxiliaryImperative(requestTerminalBaseOps),
          formal: ctx.formal
        }),
        warnings
      ));
    }
    if (prohibition !== null && prohibitionTerminalBasePath) {
      if (
        modal !== null || conjecture !== null || connective !== null ||
        potentialKotoGaDekiru !== null || desire !== null || obligation !== null ||
        benefactive !== null || request !== null || desiderative !== null ||
        preModalNeg !== null || preModalTense !== null ||
        postModalNeg !== null || postModalTense !== null || postModalPolite !== null
      ) {
        return { ok: false, reason: "prohibition terminal base composition has unsupported companion op" };
      }
      const baseRes = chainBases(
        prohibitionTerminalBaseOps.map(requestTerminalBaseOpForRender),
        stemLemma,
        stemIrregular,
        isVerb,
        {
          lookups: ctx.lookups,
          stemPrefix: layer.stem.koreanPrefix,
          sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
          sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
          preModalNeg: null,
          stemPast: false,
          pastAfterChainIdx: new Map(),
          negAfterChainIdx: new Map(),
          formal,
          shortNegationPolicy: stemShortNegationPolicy,
          absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
          ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
          passiveStemOptions
        }
      );
      return withStemPrefixApplied(withWarnings(renderProhibitionOnPredicateBase(baseRes, prohibition, ctx.formal), warnings));
    }

    if (aspect !== null || benefactive !== null || request !== null || prohibition !== null ||
      desiderative !== null || miseru !== null) {
      if (modal !== null || voice !== null ||
        conjecture !== null || connective !== null || potentialKotoGaDekiru !== null ||
        desire !== null || obligation !== null) {
        return { ok: false, reason: "aspect + other operator head composition not yet supported (Phase 4.E+ 영역)" };
      }
      if ((request !== null || prohibition !== null) &&
        (postModalNeg !== null || postModalTense !== null)) {
        return { ok: false, reason: "request/prohibition + chain/tense composition not yet supported" };
      }
      if (aspect !== null) {
        return { ok: false, reason: "aspect outside operator-chain dispatcher — 비chain 결합 영역 외" };
      }
      if (benefactive !== null) {
        return { ok: false, reason: "benefactive outside operator-chain dispatcher — 비chain 결합 영역 외" };
      }
      if (request !== null) {
        return withWarnings(renderRequest({
          stemLemma, stemIrregular, isVerb, request,
          preModalNeg,
          past: postPast,
          formal, isPolite: preModalPolite !== null || postModalPolite !== null,
          stemSourceTokens: layer.stem.source.tokens
        }), warnings);
      }
      if (prohibition !== null) {
        return withWarnings(renderProhibition({
          stemLemma, stemIrregular, isVerb, prohibition,
          preModalNeg,
          past: postPast,
          formal, isPolite: preModalPolite !== null || postModalPolite !== null,
          stemSourceTokens: layer.stem.source.tokens
        }), warnings);
      }
      return { ok: false, reason: "desiderative/miseru outside operator-chain dispatcher — 비chain 결합 영역 외" };
    }

    if (modal !== null) {
      return { ok: false, reason: "modal outside operator-chain dispatcher — 비chain 결합 영역 외" };
    }

    const isPolite = preModalPolite !== null;

    const negation = preModalNeg;
    const chainDepth = negation?.chainDepth ?? 0;
    const negationPast = negation?.chainPast ?? false;
    const effectiveStemPast = past || negationPast;
    const simpleBaseResult = simpleStemBaseResult(stemLemma, stemIrregular, isVerb);

    if (chainDepth === 0) {
      const hostTrace = simpleHostChainSourceTrace(layer, null);
      const tracedSimpleBaseResult: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } =
        hostTrace !== null
          ? { ...simpleBaseResult, chainSourceTrace: hostTrace }
          : simpleBaseResult;
      return withWarnings(
        composeCommittedTailTerminal(tracedSimpleBaseResult, null, past, formal, isPolite, ctx.lookups),
        warnings
      );
    }

    const negationCarryTokens = [
      ...(preModalTense?.source.tokens ?? []),
      ...(preModalPolite?.source.tokens ?? [])
    ];

    if (simpleBaseResult.finalNegationLoweringPolicy !== undefined && negation !== null) {
      const suppletiveTraced: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } = {
        ...simpleBaseResult,
        chainSourceTrace: {
          prefixSegments: [],
          finalSourceTokens: [
            ...layer.stem.source.tokens,
            ...negation.source.tokens,
            ...negationCarryTokens
          ],
          finalKind: "lexeme"
        }
      };
      return withWarnings(
        composeCommittedTailTerminal(suppletiveTraced, negation, past, formal, isPolite, ctx.lookups),
        warnings
      );
    }

    if (chainDepth === 1 && negation !== null && negation.preferShortNegation) {
      const finalStem = composeFinalForm(stemLemma, stemIrregular, isVerb, effectiveStemPast, formal, isPolite, ctx.lookups);
      if (
        isVerb &&
        stemLemma.endsWith("하다") &&
        stemLemma.length > 2 &&
        layer.stem.shortNegationPolicy !== "lexical_prefix"
      ) {
        const sahenPrefix = stemLemma.slice(0, -2);
        const hadaForm = composeFinalForm("하다", "여", true, effectiveStemPast, formal, isPolite, ctx.lookups);
        return withWarnings({
          ok: true,
          text: `${sahenPrefix} 안 ${hadaForm}`,
          polite: isPolite,
          traced: tracedSeg(
            `${sahenPrefix} 안 ${hadaForm}`,
            [...layer.stem.source.tokens, ...negation.source.tokens, ...negationCarryTokens],
            "lexeme",
            "semantic"
          )
        }, warnings);
      }
      return withWarnings({
        ok: true,
        text: `안 ${finalStem}`,
        polite: isPolite,
        traced: tracedSeg(
          `안 ${finalStem}`,
          [...layer.stem.source.tokens, ...negation.source.tokens, ...negationCarryTokens],
          "lexeme",
          "semantic"
        )
      }, warnings);
    }

    const negated = applyNegationChainToLemmaBase(simpleStemBase(stemLemma, stemIrregular, isVerb), negation);
    if (negated === null) {
      return { ok: false, reason: "negation chain on non-lemma base invariant violation" };
    }
    const rendered = composeBaseWithTerminal(negated, effectiveStemPast, formal, isPolite, ctx.lookups);
    if (!rendered.ok || negation === null) {
      return withWarnings(rendered, warnings);
    }
    const traceParts = longNegationTraceParts(negation, layer.ops, negationCarryTokens);
    const longNegationTrace = longNegationChainTrace(
      stemLemma,
      stemIrregular,
      layer.stem.source.tokens,
      traceParts.negation,
      traceParts.extraFinalTokens
    );
    const longNegationTraced = longNegationTrace === null
      ? null
      : closeChainTraceAgainstText(longNegationTrace, rendered.text);
    return withWarnings(
      longNegationTraced === null ? rendered : { ...rendered, traced: longNegationTraced },
      warnings
    );

  };
  return renderNonChainTail();
}

export function foldCausativePassiveVoiceOps(
  causative: VoiceOp,
  passive: VoiceOp
): VoiceOp {
  if (causative.voice !== "causative" || passive.voice !== "passive") {
    throw new Error(`causative-passive fold requires causative+passive, got ${causative.voice}+${passive.voice}`);
  }
  const passiveClass = passive.passiveClass ?? causative.passiveClass;
  const adversativeBaseLemma = passive.adversativePassiveBaseLemma ?? causative.adversativePassiveBaseLemma;
  return createVoiceOp({
    source: causative.source,
    voice: "causative_passive",
    forcePassive: causative.forcePassive,
    ...(passiveClass === undefined ? {} : { passiveClass }),
    adversativePassive: causative.adversativePassive,
    adversativePassiveAgentPromoted: causative.adversativePassiveAgentPromoted,
    ...(adversativeBaseLemma === undefined
      ? {}
      : {
        adversativePassiveBaseLemma: adversativeBaseLemma,
        adversativePassiveBaseIrregular:
          passive.adversativePassiveBaseIrregular ?? causative.adversativePassiveBaseIrregular ?? null
      })
  });
}

function isAspectAuxiliaryPotentialVoice(ops: readonly AuxOpNode[], voiceIdx: number): boolean {
  const voice = ops[voiceIdx];
  const aspect = ops[voiceIdx - 1];
  if (voice?.kind !== "voice" || voice.voice !== "potential" || aspect?.kind !== "aspect") return false;
  const auxIdx = aspect.source.tokenIndices.at(-1);
  return auxIdx !== undefined && voice.source.tokenIndices.length === 1 && voice.source.tokenIndices[0] === auxIdx;
}

function passiveTeIruHonorificCompositionIsCanonical(
  ops: readonly AuxOpNode[],
  honorificVoiceIdx: number
): boolean {
  const segmentStart = ops
    .slice(0, honorificVoiceIdx)
    .findLastIndex((op) => op.kind === "predicateQuoteCarrier") + 1;
  const nextCarrierOffset = ops
    .slice(honorificVoiceIdx + 1)
    .findIndex((op) => op.kind === "predicateQuoteCarrier");
  const segmentEnd = nextCarrierOffset < 0
    ? ops.length
    : honorificVoiceIdx + 1 + nextCarrierOffset;
  const voiceIndices = ops
    .slice(segmentStart, segmentEnd)
    .flatMap((op, offset) => op.kind === "voice" ? [segmentStart + offset] : []);
  if (voiceIndices.length !== 2) return false;
  const passiveIdx = voiceIndices[0]!;
  const honorificIdx = voiceIndices[1]!;
  const passive = ops[passiveIdx];
  const honorific = ops[honorificIdx];
  return passive?.kind === "voice" && passive.voice === "passive" &&
    honorific?.kind === "voice" && honorific.voice === "honorific" &&
    ops.slice(passiveIdx + 1, honorificIdx).some((op) => op.kind === "aspect" && op.aspect === "te_iru");
}

function punctuatedFiniteObligationClause(layer: AuxLayerNode, ctx: RenderContext): boolean {
  const obligation = layer.ops.find((op) => op.kind === "idiom" && op.idiom === "obligation");
  const lastSourceIdx = obligation?.source.tokenIndices.at(-1);
  if (lastSourceIdx === undefined) {
    return false;
  }
  if (layer.terminalPayload?.kind === "attributiveBoundary") {
    return hasSeparatedFinitePredicateBoundary(
      layer.terminalPayload.projectionContext.tokens,
      layer.terminalPayload.head.tokenIdx,
    );
  }
  if (ctx.layout === undefined) {
    return false;
  }
  const clause = ctx.layout.clauseOfToken(lastSourceIdx);
  return clause?.terminatedBy === "punctuation" && clause.end <= lastSourceIdx + 2;
}

function projectMidPredicateCopulaLayer(
  layer: AuxLayerNode,
  options: {
    readonly projectAffirmativeBasic?: boolean;
    readonly projectNegativeBasic?: boolean;
  } = {}
): AuxLayerNode | RenderOutcome | null {
  for (let i = 1; i < layer.ops.length; i++) {
    const op = layer.ops[i];
    if (op?.kind !== "copula") {
      continue;
    }
    if (op.variant === "conditional_nara") {
      if (op.polarity !== "affirmative") {
        return { ok: false, reason: "negative mid-chain predicate copula conditional projection not supported" };
      }
      return {
        ...layer,
        ops: [
          ...layer.ops.slice(0, i),
          copulaVariantConnective(op, "なら", "conditional"),
          ...layer.ops.slice(i + 1)
        ]
      };
    }
    if (op.polarity === "affirmative") {
      if (options.projectAffirmativeBasic === true) {
        return {
          ...layer,
          ops: [
            ...layer.ops.slice(0, i),
            ...(op.polite ? [createPoliteOp({  source: op.source })] : []),
            ...layer.ops.slice(i + 1)
          ]
        };
      }
      continue;
    }
    if (options.projectNegativeBasic === false) {
      continue;
    }
    const nextOp = layer.ops[i + 1];
    const followingNegation = nextOp?.kind === "negation"
      ? nextOp
      : null;
    return {
      ...layer,
      ops: [
        ...layer.ops.slice(0, i),
        predicateCopulaNegationOp(op, followingNegation),
        ...(op.polite ? [createPoliteOp({  source: op.source })] : []),
        ...layer.ops.slice(i + (followingNegation === null ? 1 : 2))
      ]
    };
  }
  return null;
}

function layerWithAdjCopulaBridgeNegationSourceSplits<T extends AuxLayerNode>(layer: T): T {
  let pendingBridge: AdjCopulaBridgeOp | null = null;
  let changed = false;
  const ops = layer.ops.map((op): AuxOpNode => {
    if (op.kind === "adjCopulaBridge") {
      pendingBridge = op;
      return op;
    }
    if (op.kind === "negation") {
      const negation = negationWithAdjCopulaBridgeSourceSplit(op, pendingBridge);
      changed = changed || negation !== op;
      pendingBridge = null;
      return negation;
    }
    if (op.kind !== "polite" && op.kind !== "tense" && op.kind !== "classicalAuxResidue") {
      pendingBridge = null;
    }
    return op;
  });
  return changed ? { ...layer, ops } : layer;
}

function negationWithAdjCopulaBridgeSourceSplit(
  negation: NegationOp,
  bridge: AdjCopulaBridgeOp | null
): NegationOp {
  if (bridge === null || negation.sourceSplit !== undefined) {
    return negation;
  }
  return {
    ...negation,
    sourceSplit: {
      kind: "predicate_copula_negative",
      bridgeTokens: bridge.source.tokens,
      finalTokens: negation.source.tokens
    }
  };
}

function renderNounCopulaImperativeTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.stem.kind !== "noun" || layer.ops.length !== 1) {
    return null;
  }
  const copula = layer.ops[0];
  if (
    copula?.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "affirmative" ||
    copula.polite
  ) {
    return null;
  }
  const noun = layer.stem.lemma;
  if (noun.length === 0) {
    return null;
  }
  const host = nounCopulaStemAllomorphHost(layer.stem, ctx, noun) ?? noun;
  const ending = hasAllomorphBatchim(host) ? "이어라" : "여라";
  return { ok: true, text: `${layer.stem.koreanPrefix ?? ""}${noun}${ending}`, polite: false };
}

function renderPredicateCopulaImperativeProjection(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return null;
  }
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return null;
  }
  if (copula.variant !== "basic" || copula.polarity !== "affirmative" || copula.polite) {
    return null;
  }
  const projectedOps = layer.ops.slice(1).filter((op) => op.kind !== "polite");
  return renderAuxLayerImperativeTerminal({ ...layer, ops: projectedOps }, ctx);
}

function renderMakeStateChangeImperativeTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return null;
  }
  const opChain = collectOperatorChain(layer.ops);
  if (opChain.length === 0) {
    return null;
  }
  const op = opChain[opChain.length - 1]!;
  const auxKind = op.kind === "postverbAuxiliary" ? op.auxiliary.kind : null;
  let preModalNeg: NegationOp | null = null;
  if (auxKind === "scope_control" || auxKind === "adverbial_change" || auxKind === "manner_action_control") {
    preModalNeg = layer.ops.find((o): o is NegationOp => o.kind === "negation") ?? null;
  } else if (
    opChain.length === 1 &&
    layer.ops.length === opChain.length &&
    (auxKind === "make_state_change" ||
      auxKind === "make_state_change_causative" ||
      auxKind === "state_change")
  ) {
  } else {
    return null;
  }
  const baseRes = chainBases(
    opChain,
    layer.stem.lemma,
    irregularFrom(layer.stem.irregular),
    layer.stem.kind === "verb",
    {
      lookups: ctx.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      ...chainStemTraceFields(layer.stem),
      sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
      preModalNeg,
      stemPast: false,
      pastAfterChainIdx: new Map(),
      negAfterChainIdx: new Map(),
      formal: ctx.formal,
      shortNegationPolicy: layer.stem.shortNegationPolicy,
      absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
      ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
      passiveStemOptions: passiveStemOptionsForStem(layer.stem)
    }
  );
  if (!baseRes.ok) {
    return { ok: false, reason: baseRes.reason };
  }
  if (baseRes.base.final.kind !== "lemma") {
    return { ok: false, reason: "make-state-change imperative terminal requires lemma final" };
  }
  const lastSrc = op.source.tokens[op.source.tokens.length - 1];
  const honorificNasai =
    (auxKind === "scope_control" || auxKind === "adverbial_change") &&
    lastSrc !== undefined &&
    (lastSrc.dictionaryForm === "なさる" || lastSrc.dictionaryForm === "為さる" || lastSrc.surface === "なさい");
  const ending = honorificNasai ? (ctx.formal ? "(으)십시오" : "(으)세요") : "아/어라";
  const text = `${baseRes.base.prefix}${conjugate(baseRes.base.final.lemma, baseRes.base.final.irregular, ending)}`;
  return { ok: true, text, polite: honorificNasai };
}

function renderAuxLayerImperativeTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome {
  if (layer.ops[0]?.kind === "copula") {
    const copulaImperative = renderPredicateCopulaImperativeProjection(layer, ctx);
    if (copulaImperative !== null) {
      return copulaImperative;
    }
  }
  const makeStateChangeImperative = renderMakeStateChangeImperativeTerminal(layer, ctx);
  if (makeStateChangeImperative !== null) {
    return makeStateChangeImperative;
  }
  const nounCopulaImperative = renderNounCopulaImperativeTerminal(layer, ctx);
  if (nounCopulaImperative !== null) {
    return nounCopulaImperative;
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return { ok: false, reason: "imperative terminal supports verb/adj stem only" };
  }
  const stemLemma = layer.stem.lemma;
  const stemIrr = irregularFrom(layer.stem.irregular);
  const politeProhibition = layer.ops.find((op): op is ProhibitionAspectOp =>
    op.kind === "aspect" && op.aspect === "naide_kudasai"
  );
  if (
    politeProhibition !== undefined &&
    layer.ops.some((op) => op.kind === "polite") &&
    layer.ops.every((op) => op === politeProhibition || op.kind === "polite")
  ) {
    return renderProhibition({
      stemLemma,
      stemIrregular: stemIrr,
      isVerb: layer.stem.kind === "verb",
      prohibition: politeProhibition,
      preModalNeg: null,
      past: false,
      formal: ctx.formal,
      isPolite: true,
      stemSourceTokens: layer.stem.source.tokens
    });
  }
  const imperativeNegation = layer.ops.find((op): op is NegationOp => op.kind === "negation");
  const imperativeKudasaru = layer.ops.find((op): op is BenefactiveAspectOp =>
    op.kind === "aspect" && op.aspect === "te_kudasaru"
  );
  const imperativeNegationIdx = imperativeNegation === undefined
    ? -1
    : layer.ops.indexOf(imperativeNegation);
  const imperativeVoiceOps = layer.ops.filter((op, index): op is VoiceOp =>
    op.kind === "voice" && index < imperativeNegationIdx
  );
  if (
    imperativeNegation?.chainDepth === 1 &&
    !imperativeNegation.chainPast &&
    imperativeKudasaru !== undefined &&
    layer.ops.some((op) => op.kind === "polite") &&
    layer.ops.every((op, index) =>
      op === imperativeNegation ||
      op === imperativeKudasaru ||
      op.kind === "polite" ||
      (op.kind === "voice" && index < imperativeNegationIdx)
    )
  ) {
    const hostBase = imperativeVoiceOps.length === 0
      ? { ok: true as const, base: simpleStemBase(stemLemma, stemIrr, layer.stem.kind === "verb") }
      : chainBases(
        imperativeVoiceOps,
        stemLemma,
        stemIrr,
        layer.stem.kind === "verb",
        {
          lookups: ctx.lookups,
          stemPrefix: layer.stem.koreanPrefix,
          sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
          sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
          preModalNeg: null,
          stemPast: false,
          pastAfterChainIdx: new Map(),
          negAfterChainIdx: new Map(),
          formal: ctx.formal,
          shortNegationPolicy: layer.stem.shortNegationPolicy,
          absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
          ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
          passiveStemOptions: passiveStemOptionsForStem(layer.stem)
        }
      );
    if (!hostBase.ok) return hostBase;
    const hostLemmaBase = lemmaPredicateBase(hostBase.base);
    if (hostLemmaBase === null) {
      return { ok: false, reason: "voice prohibition polite request requires lemma final" };
    }
    const base = prohibitionPredicateBase(hostLemmaBase);
    return {
      ok: true,
      text: `${base.prefix}${conjugate(
        base.final.lemma,
        base.final.irregular,
        ctx.formal ? "(으)십시오" : "(으)세요"
      )}`,
      polite: true,
      ...(imperativeVoiceOps.length === 0 ? {} : { stemPrefixApplied: true })
    };
  }
  const imperativeOpChain = collectOperatorChain(layer.ops);
  const imperativeCarryOps = layer.ops.filter((op) =>
    op.kind !== "polite" &&
    op.kind !== "classicalAuxResidue" &&
    op.kind !== "adjCopulaBridge"
  );
  if (
    imperativeOpChain.length > 0 &&
    imperativeCarryOps.length === imperativeOpChain.length &&
    imperativeCarryOps.every((op, index) => op === imperativeOpChain[index])
  ) {
    const finalImperativeOp = imperativeOpChain[imperativeOpChain.length - 1];
    const politeBenefactiveRequest =
      layer.ops.some((op) => op.kind === "polite") &&
      finalImperativeOp?.kind === "aspect" &&
      finalImperativeOp.aspect === "te_kudasaru";
    if (politeBenefactiveRequest) {
      const requestBase = imperativeOpChain.length === 1
        ? simpleStemBaseResult(stemLemma, stemIrr, layer.stem.kind === "verb")
        : chainBases(
          imperativeOpChain.slice(0, -1),
          stemLemma,
          stemIrr,
          layer.stem.kind === "verb",
          {
            lookups: ctx.lookups,
            stemPrefix: layer.stem.koreanPrefix,
            sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
            sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
            preModalNeg: null,
            stemPast: false,
            pastAfterChainIdx: new Map(),
            negAfterChainIdx: new Map(),
            formal: ctx.formal,
            shortNegationPolicy: layer.stem.shortNegationPolicy,
            absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
            passiveStemOptions: passiveStemOptionsForStem(layer.stem)
          }
        );
      const renderedRequest = renderPoliteRequestOnPredicateBase(requestBase, ctx.formal);
      return renderedRequest.ok && imperativeOpChain.length > 1
        ? { ...renderedRequest, stemPrefixApplied: true }
        : renderedRequest;
    }
    const baseRes = chainBases(
      imperativeOpChain,
      stemLemma,
      stemIrr,
      layer.stem.kind === "verb",
      {
        lookups: ctx.lookups,
        stemPrefix: layer.stem.koreanPrefix,
        ...chainStemTraceFields(layer.stem),
        sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
        sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
        preModalNeg: null,
        stemPast: false,
        pastAfterChainIdx: new Map(),
        negAfterChainIdx: new Map(),
        formal: ctx.formal,
        shortNegationPolicy: layer.stem.shortNegationPolicy,
        absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
        ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
        passiveStemOptions: passiveStemOptionsForStem(layer.stem)
      }
    );
    if (!baseRes.ok) return baseRes;
    if (baseRes.base.final.kind !== "lemma") {
      return { ok: false, reason: "imperative operator chain requires lemma final" };
    }
    const politeImperative = layer.ops.some((op) => op.kind === "polite");
    const ending = politeImperative ? (ctx.formal ? "(으)십시오" : "(으)세요") : "아/어라";
    return {
      ok: true,
      text: `${baseRes.base.prefix}${conjugate(baseRes.base.final.lemma, baseRes.base.final.irregular, ending)}`,
      polite: politeImperative,
      stemPrefixApplied: true
    };
  }
  if (
    layer.ops.length === 1 &&
    layer.ops[0]!.kind === "voice" &&
    layer.ops[0].voice === "causative"
  ) {
    const vBase = voiceBase({
      voice: layer.ops[0],
      stemLemma,
      stemIrregular: stemIrr,
      isVerb: layer.stem.kind === "verb",
      lookups: ctx.lookups,
      sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(layer.stem.koreanPrefix)
    });
    if (!vBase.ok) return vBase;
    if (vBase.base.final.kind !== "lemma") {
      return { ok: false, reason: "causative imperative on non-lemma base not supported" };
    }
    return {
      ok: true,
      text: `${vBase.base.prefix}${conjugate(vBase.base.final.lemma, vBase.base.final.irregular, "아/어라")}`,
      polite: false
    };
  }
  if (layer.ops.length === 1 && layer.ops[0]!.kind === "polite") {
    const ending = ctx.formal ? "(으)십시오" : "(으)세요";
    return {
      ok: true,
      text: conjugate(stemLemma, stemIrr, ending),
      polite: true
    };
  }
  if (layer.ops.length !== 0) {
    return { ok: false, reason: "imperative terminal with auxiliary ops not supported" };
  }
  if (layer.terminalPayload?.kind === "imperative" && layer.terminalPayload.sourceForm === "nasai") {
    return {
      ok: true,
      text: conjugate(stemLemma, stemIrr, ctx.formal ? "(으)십시오" : "(으)세요"),
      polite: true
    };
  }
  return {
    ok: true,
    text: conjugate(stemLemma, stemIrr, "아/어라"),
    polite: false
  };
}

export function renderCommittedAttributiveTerminalLayer(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome {
  const normalizedLayer = layerWithQuotedCarrierProhibition(layer) ?? layer;
  const prelude = renderAuxLayerPrelude(normalizedLayer, ctx);
  if (prelude.kind === "outcome") {
    return prelude.outcome;
  }
  if (prelude.kind === "resume") {
    return renderAuxLayer(prelude.layer, prelude.ctx);
  }
  return renderAuxLayerAttributiveTerminal({ ...prelude.layer, terminal: null }, prelude.ctx);
}

function withoutAttributiveInternalPoliteness(
  ops: readonly AuxOpNode[]
): readonly AuxOpNode[] {
  return ops
    .filter((op) => op.kind !== "polite")
    .map((op) => "polite" in op && op.polite === true ? { ...op, polite: false } : op);
}

function renderAdversativeQuoteCarrierAttributive(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  const ops = layer.ops;
  const carrier = ops[ops.length - 1];
  const connective = ops[ops.length - 2];
  if (
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    connective?.kind !== "connective" ||
    connective.connective !== "adversative"
  ) {
    return null;
  }
  const clause = renderAuxLayer(
    { ...layer, ops: withoutAttributiveInternalPoliteness(ops.slice(0, -1)), terminal: null },
    ctx
  );
  if (!clause.ok) return clause;
  return {
    ok: true,
    text: `${clause.text}${headRequiresFutureAttributiveProjection(layer)
      ? `${selectParticle(clause.text, "이라고/라고")} 할`
      : selectParticle(clause.text, "이라는/라는")}`,
    polite: false,
    ...(clause.stemPrefixApplied === true ? { stemPrefixApplied: true } : {})
  };
}

function renderAdversativeQuoteCarrierTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  const ops = layer.ops;
  const carrier = ops[ops.length - 1];
  const connective = ops[ops.length - 2];
  if (
    layer.terminal !== null ||
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    carrier.sourceTerminal !== true ||
    connective?.kind !== "connective" ||
    connective.connective !== "adversative"
  ) {
    return null;
  }
  const clause = renderAuxLayer({ ...layer, ops: ops.slice(0, -1), terminal: null }, ctx);
  if (!clause.ok) return clause;
  const restoredHost = predicateQuoteCarrierRestoredHost(carrier);
  const host = restoredHost.kind === "lemma"
    ? composeFinalForm(
      restoredHost.lemma, restoredHost.irregular, restoredHost.isVerb,
      false, ctx.formal, clause.polite, ctx.lookups
    )
    : null;
  if (host === null) {
    return null;
  }
  const text = `${clause.text}${selectParticle(clause.text, "이라고/라고")} ${host}`;
  return {
    ok: true,
    text,
    polite: clause.polite,
    ...(clause.stemPrefixApplied === true ? { stemPrefixApplied: true } : {})
  };
}

function renderAuxLayerAttributiveTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext,
  options: { readonly nominalizedTerminal?: boolean } = {}
): RenderOutcome {
  return withMoodSourceBoundToFinalTraceSegment(
    renderAuxLayerAttributiveTerminalChain(layer, ctx, options),
    layer
  );
}

function withMoodSourceBoundToFinalTraceSegment(
  outcome: RenderOutcome,
  layer: AuxLayerNode
): RenderOutcome {
  const consumed = layer.attributiveMood?.source.tokens ?? [];
  if (!outcome.ok || consumed.length === 0 || outcome.traced === undefined) {
    return outcome;
  }
  const segments = outcome.traced;
  const finalIdx = segments.length - 1;
  const finalSegment = segments[finalIdx];
  if (finalSegment === undefined) {
    return outcome;
  }
  const present = new Set(finalSegment.sourceTokens);
  const added = consumed.filter((token) => !present.has(token));
  if (added.length === 0) {
    return outcome;
  }
  return {
    ...outcome,
    traced: [
      ...segments.slice(0, finalIdx),
      { ...finalSegment, sourceTokens: [...finalSegment.sourceTokens, ...added] }
    ]
  };
}

function renderAuxLayerAttributiveTerminalChain(
  layer: AuxLayerNode,
  ctx: RenderContext,
  options: { readonly nominalizedTerminal?: boolean } = {}
): RenderOutcome {
  const carrierInternalNormalized = normalizeCarrierInternalConnectives(layer);
  if (carrierInternalNormalized !== null) {
    return renderAuxLayerAttributiveTerminalChain(carrierInternalNormalized, ctx, options);
  }
  const adversativeQuoteCarrier = renderAdversativeQuoteCarrierAttributive(layer, ctx);
  if (adversativeQuoteCarrier !== null) {
    return adversativeQuoteCarrier;
  }
  if (layer.stem.kind === "noun" && layer.ops.length === 0 && layer.attributiveMood === undefined) {
    return {
      ok: true,
      text: layer.stem.lemma,
      polite: false,
      traced: tracedSeg(layer.stem.lemma, layer.stem.source.tokens, "lexeme", "semantic")
    };
  }
  if (
    layer.ops.length > 0 &&
    layer.ops[0]?.kind !== "copula" &&
    stemIsAdjectivalSourceWithNominalTarget(layer.stem)
  ) {
    const bridged = renderNounCopulaAttributiveTerminal(
      { ...layer, stem: layer.stem, ops: nominalTargetCopulaBridgeOps(layer.ops) },
      ctx
    );
    if (bridged.ok) {
      return bridged;
    }
  }
  const implicitNounHead = layer.ops[0];
  if (
    layer.stem.kind === "noun" &&
    implicitNounHead !== undefined &&
    (
      implicitNounHead.kind === "conjecture" ||
      implicitNounHead.kind === "aspect" ||
      implicitNounHead.kind === "idiom" ||
      implicitNounHead.kind === "postverbAuxiliary" ||
      (implicitNounHead.kind === "modal" && implicitNounHead.modal !== "youda") ||
      (implicitNounHead.kind === "connective" && implicitNounHead.connective === "reformulation")
    )
  ) {
    const implicitCopula: Extract<AuxOpNode, { readonly kind: "copula" }> = createCopulaOp({

      source: { tokens: [], tokenIndices: [] },
      variant: "basic",
      polarity: "affirmative",
      polite: false
    });
    const implicitLayer = { ...layer, stem: layer.stem, ops: [implicitCopula, ...layer.ops] };
    const modalFirstBridgeAdmitted = implicitNounHead.kind === "modal" &&
      (isYotaiAppearanceModalOp(implicitNounHead) || layer.stem.sourcePredicateShape === "nominal");
    const centralized = implicitNounHead.kind === "conjecture"
      ? renderNounCopulaAttributiveTerminal(implicitLayer, ctx)
      : renderNounCopulaAttributiveOperatorChain(implicitLayer, implicitCopula, ctx, {
        admitModalFirstHead: modalFirstBridgeAdmitted
      });
    if (centralized !== null) {
      return centralized;
    }
  }
  if (layer.stem.kind === "noun" && layer.ops[0]?.kind === "modal" && layer.ops[0].modal === "youda") {
    return renderNominalHostLikeness(layer.stem.lemma, layer.ops, ctx, attributiveProjectionPolicy(layer));
  }
  if (layer.stem.kind === "noun" && isTosuruPredicateCarrier(layer.ops[0])) {
    return renderNounTosuruAttributiveTerminal(layer, ctx);
  }
  if (layer.stem.kind === "noun" && layer.ops[0]?.kind === "scopeBridge") {
    return renderNounScopeBridgeAttributiveTerminal(layer, ctx);
  }
  if (layer.stem.kind === "noun" && layer.ops[0]?.kind === "predicateProjectionCarrier") {
    const built = buildNounPredicateProjectionCarrier(layer.stem.lemma, layer.ops, ctx);
    if (!built.ok) return built;
    if (built.connective !== null) {
      return { ok: false, reason: "noun projection carrier attributive terminal cannot also own a connective" };
    }
    const opChain = collectOperatorChain(built.postOps);
    if (opChain.length !== built.postOps.length) {
      return { ok: false, reason: "noun projection carrier attributive wrapper lane not supported" };
    }
    const chained = opChain.length === 0
      ? null
      : chainBases(opChain, layer.stem.lemma, null, false, {
        lookups: ctx.lookups,
        stemPrefix: undefined,
        ...chainStemTraceFields(layer.stem),
        sourceStemIsVerb: false,
        sourceStemIsSahenPredicate: false,
        initialBaseResult: built.baseResult,
        preModalNeg: null,
        stemPast: false,
        pastAfterChainIdx: new Map(),
        negAfterChainIdx: new Map(),
        formal: ctx.formal,
        shortNegationPolicy: undefined,
        absorbedPassiveAux: false,
        passiveStemOptions: {}
      });
    if (chained !== null && !chained.ok) return chained;
    const base = chained === null ? built.baseResult.base : chained.base;
    const attr = projectBaseAttributive(
      base,
      chained?.finalPast ?? built.carrier.past === true,
      ctx.formal,
      chained?.finalPastProjection ?? "lexical",
      "default",
      attributiveProjectionPolicy(layer)
    );
    return attr === null
      ? { ok: false, reason: "noun projection carrier attributive projection not supported" }
      : { ok: true, text: attr, polite: false, stemPrefixApplied: true };
  }
  if (layer.stem.kind === "noun" && layer.ops[0]?.kind === "copula") {
    return renderNounCopulaAttributiveTerminal(layer, ctx);
  }
  if ((layer.stem.kind === "verb" || layer.stem.kind === "adj") && layer.ops[0]?.kind === "copula") {
    return renderPredicateCopulaAttributiveProjection(layer, ctx);
  }
  const bareQuoteBody = renderBareNominalLikePredicateQuoteAttributiveTerminal(layer);
  if (bareQuoteBody !== null) {
    return bareQuoteBody;
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return { ok: false, reason: "attributive terminal currently supports verb/adj stem only" };
  }
  const operatorHeadIdx = layer.ops.findIndex(isHeadOp);
  const requestAttributiveOp = commandAttributiveAspectOp(layer.ops, isRequestCommandAspectOp) ??
    commandAttributiveAspectOpWithQuotedPostChain(layer.ops, isRequestCommandAspectOp) ??
    commandAttributiveAspectOpBeforeLikeness(layer.ops, isRequestCommandAspectOp);
  const prohibitionAttributiveOp = commandAttributiveAspectOp(layer.ops, isProhibitionCommandAspectOp) ??
    commandAttributiveAspectOpWithQuotedPostChain(layer.ops, isProhibitionCommandAspectOp) ??
    commandAttributiveAspectOpBeforeLikeness(layer.ops, isProhibitionCommandAspectOp);
  const conditionalMannerMode = conditionalCompactQuoteMannerMode(layer, ctx);
  let preModalNeg: NegationOp | null = null;
  let preModalTense: TenseOp | null = null;
  const postModalNegations: NegationOp[] = [];
  const postModalTenses: TenseOp[] = [];
  for (const op of layer.ops) {
    switch (op.kind) {
      case "negation":
        if (operatorHeadIdx === -1 || layer.ops.indexOf(op) < operatorHeadIdx) {
          if (preModalNeg !== null) {
            return { ok: false, reason: "multiple pre-reference negation ops in attributive terminal not supported" };
          }
          preModalNeg = op;
        } else {
          postModalNegations.push(op);
        }
        break;
      case "tense":
        if (op.tense !== "past") {
          return { ok: false, reason: `tense '${op.tense}' in attributive terminal not supported` };
        }
        if (operatorHeadIdx === -1 || layer.ops.indexOf(op) < operatorHeadIdx) {
          if (preModalTense !== null) {
            return { ok: false, reason: "multiple pre-reference tense ops in attributive terminal not supported" };
          }
          preModalTense = op;
        } else {
          postModalTenses.push(op);
        }
        break;
      case "polite":
      case "classicalAuxResidue":
      case "adjCopulaBridge":
        break;
      case "copula":
        if (op.variant === "basic" && op.polarity === "affirmative") {
          break;
        }
        return { ok: false, reason: `op '${op.kind}' in attributive terminal not supported` };
      case "connective":
        if (
          attributiveSequenceAfterQuoteCarrier(layer, op, conditionalMannerMode) !== null
        ) {
          break;
        }
        return { ok: false, reason: `op '${op.kind}' in attributive terminal not supported` };
      default:
        if (op === requestAttributiveOp || op === prohibitionAttributiveOp) {
          break;
        }
        if (!isChainableHeadOp(op)) {
          return { ok: false, reason: `op '${op.kind}' in attributive terminal not supported` };
        }
    }
  }
  const stemLemma = layer.stem.lemma;
  const stemIrregular = irregularFrom(layer.stem.irregular);
  const isVerb = layer.stem.kind === "verb";
  const formal = ctx.formal;
  const boundaryRequestsFuture = attributiveBoundaryRequestsFutureProjection(layer);
  const sequenceAfterQuote = layer.ops
    .filter((op): op is ConnectiveOp => op.kind === "connective")
    .map((op) => attributiveSequenceAfterQuoteCarrier(layer, op, conditionalMannerMode))
    .find((match) => match !== null);
  if (sequenceAfterQuote !== undefined && sequenceAfterQuote !== null) {
    const carrierIdx = layer.ops.indexOf(sequenceAfterQuote.carrier);
    const hasPostCarrierWrap = layer.ops.slice(carrierIdx + 1).some((op) =>
      op.kind === "negation" || op.kind === "tense"
    );
    if (hasPostCarrierWrap) {
      return { ok: false, reason: "sequence_after compact quote attributive post wrap not supported" };
    }
    const connectiveIdx = layer.ops.indexOf(sequenceAfterQuote.connective);
    const precedingOps = collectOperatorChain(layer.ops.slice(0, connectiveIdx));
    const consumesStemPrefix = precedingOps.length > 0;
    let baseResult: BaseResult;
    let finalPast = preModalTense?.tense === "past";
    let finalNeg = preModalNeg;
    if (consumesStemPrefix) {
      const pastAfterChainIdx = new Map<number, TenseOp>();
      for (const tenseOp of postModalTenses) {
        const slot = operatorChainSlotForWrapOp(tenseOp, layer, precedingOps);
        if (slot === null) {
          return { ok: false, reason: "sequence_after compact quote post tense 위치 식별 실패" };
        }
        pastAfterChainIdx.set(slot, tenseOp);
      }
      const negAfterChainIdx = new Map<number, NegationOp>();
      for (const negOp of postModalNegations) {
        const slot = operatorChainSlotForWrapOp(negOp, layer, precedingOps);
        if (slot === null) {
          return { ok: false, reason: "sequence_after compact quote post negation 위치 식별 실패" };
        }
        negAfterChainIdx.set(slot, negOp);
      }
      const folded = chainBases(precedingOps, stemLemma, stemIrregular, isVerb, {
        lookups: ctx.lookups,
        stemPrefix: layer.stem.koreanPrefix,
        ...chainStemTraceFields(layer.stem),
        sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
        sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
        preModalNeg,
        stemPast: preModalTense?.tense === "past",
        pastAfterChainIdx,
        negAfterChainIdx,
        formal,
        shortNegationPolicy: layer.stem.shortNegationPolicy,
        absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
        ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
        passiveStemOptions: passiveStemOptionsForStem(layer.stem)
      });
      if (!folded.ok) return folded;
      baseResult = {
        ok: true,
        base: folded.base,
        chainOnFinalSupported: folded.chainOnFinalSupported,
        ...(folded.finalNegationOptions === undefined ? {} : { finalNegationOptions: folded.finalNegationOptions }),
        ...(folded.finalNegationLoweringPolicy === undefined ? {} : { finalNegationLoweringPolicy: folded.finalNegationLoweringPolicy }),
        ...(folded.connectivePrefixContraction === undefined ? {} : { connectivePrefixContraction: folded.connectivePrefixContraction }),
        ...(folded.connectiveBaseOverride === undefined ? {} : { connectiveBaseOverride: folded.connectiveBaseOverride })
      };
      finalPast = folded.finalPast;
      finalNeg = folded.finalNeg;
    } else {
      baseResult = simpleStemBaseResult(stemLemma, stemIrregular, isVerb);
    }
    const rendered = composeCommittedSequenceAfterCompactQuoteAttributive(
      baseResult,
      sequenceAfterQuote.connective,
      finalPast,
      finalNeg,
      formal,
      ctx.lookups,
      {
        ...(sequenceAfterQuote.likenessModal === null
          ? {}
          : { likenessAfterCarrier: sequenceAfterQuote.likenessModal }),
        wishMannerAfterCarrier: sequenceAfterQuote.wishManner,
        directMannerAfterCarrier: sequenceAfterQuote.directManner,
        ...(sequenceAfterQuote.conditionalEllipsisMood === null
          ? {}
          : { conditionalEllipsisMoodAfterCarrier: sequenceAfterQuote.conditionalEllipsisMood }),
        reasonAfterCarrier: sequenceAfterQuote.reasonAfterCarrier,
        attrPolicy: attributiveProjectionPolicy(layer),
      }
    );
    return rendered.ok && consumesStemPrefix
      ? { ...rendered, stemPrefixApplied: true }
      : rendered;
  }
  if (requestAttributiveOp !== null || prohibitionAttributiveOp !== null) {
    if (requestAttributiveOp !== null && prohibitionAttributiveOp !== null) {
      return { ok: false, reason: "request + prohibition attributive terminal composition not supported" };
    }
    if (!isVerb) {
      return { ok: false, reason: "request/prohibition attributive terminal requires verb stem" };
    }
    const commandOp = requestAttributiveOp ?? prohibitionAttributiveOp;
    const quotePostChain = commandOp === null ? null : requestAttributiveQuotePostChain(layer.ops, commandOp);
    const likenessModal = commandOp === null ? null : commandAttributiveLikenessModal(layer.ops, commandOp);
    const composeLikenessAttributive = (base: KoreanPredicateBase): RenderOutcome => {
      if (likenessModal === null) {
        return { ok: false, reason: "request/prohibition likeness attributive lost its typed modal" };
      }
      const quotedBase = buildRequestQuotedPropositionBase(
        base,
        requestAttributiveOp !== null ? "request" : "prohibition",
        { requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition) }
      );
      const frame = committedCarrierPostChainFrame(quotedBase, [likenessModal], false, null, ctx);
      if ("ok" in frame) return frame;
      if (frame.finalNeg !== null) {
        return { ok: false, reason: "request/prohibition likeness attributive final negation not supported" };
      }
      return composeCommittedBaseAttributive(
        frame.baseResult,
        frame.finalPast,
        formal,
        "lexical",
        "default",
        attributiveProjectionPolicy(layer)
      );
    };
    const baseOps = commandOp === null ? [] : attributiveCommandBaseOperatorChain(layer.ops, commandOp);
    if (baseOps.length > 0) {
      if (quotePostChain === null && likenessModal === null && (commandOp === null || !attributiveCommandHeadPatternMatches(layer.ops, commandOp, baseOps))) {
        return { ok: false, reason: "request/prohibition attributive terminal base chain has unsupported companion op" };
      }
      const baseCarriesStemNegation = requestAttributiveOp !== null &&
        requestTerminalBaseCanCarryStemNegation(baseOps);
      if ((preModalNeg !== null && !baseCarriesStemNegation) || preModalTense !== null) {
        return { ok: false, reason: "request/prohibition attributive terminal base chain stem neg/tense not supported" };
      }
      const baseRes = chainBases(
        baseOps.map(requestTerminalBaseOpForRender),
        stemLemma,
        stemIrregular,
        isVerb,
        {
          lookups: ctx.lookups,
          stemPrefix: layer.stem.koreanPrefix,
          ...chainStemTraceFields(layer.stem),
          sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
          sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
          preModalNeg: baseCarriesStemNegation ? preModalNeg : null,
          stemPast: false,
          pastAfterChainIdx: new Map(),
          negAfterChainIdx: new Map(),
          formal,
          shortNegationPolicy: layer.stem.shortNegationPolicy,
          absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
          ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
          passiveStemOptions: passiveStemOptionsForStem(layer.stem)
        }
      );
      if (!baseRes.ok) {
        return { ok: false, reason: baseRes.reason };
      }
      if (baseRes.finalNeg !== null) {
        return { ok: false, reason: "request/prohibition attributive terminal base chain final negation not supported" };
      }
      if (likenessModal !== null) {
        const rendered = composeLikenessAttributive(baseRes.base);
        return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
      }
      if (quotePostChain !== null) {
        const quotedBase = buildRequestQuotedPropositionBase(
          baseRes.base,
          requestAttributiveOp !== null ? "request" : "prohibition",
          { requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition) }
        );
        return composeCommittedCarrierPostChainAttributive(
          quotedBase,
          quotePostChain.postOps,
          quotePostChain.postPolite,
          quotePostChain.connective,
          ctx,
          attributiveProjectionPolicy(layer)
        ) ?? composeCommittedCarrierPostChain(
          quotedBase,
          quotePostChain.postOps,
          quotePostChain.postPolite,
          quotePostChain.connective,
          ctx
        );
      }
      if (postModalNegations.length > 0 || postModalTenses.length > 0) {
        return { ok: false, reason: "request/prohibition attributive terminal + post-reference wrap op not supported" };
      }
      const carrierOp = layer.ops.find(
        (op): op is PredicateQuoteCarrierOp => op.kind === "predicateQuoteCarrier"
      );
      const rendered = requestAttributiveOp !== null && carrierOp !== undefined
        ? renderRequestAttributiveQuoteOnPredicateBase(
          baseRes,
          requestAttributiveOp,
          carrierOp,
          {
            past: baseRes.finalPast,
            commandSourceTokens: [
              ...layer.stem.source.tokens,
              ...baseOps.flatMap((op) => op.source.tokens)
            ]
          }
        )
        : composeRequestProhibitionAttributiveQuote(baseRes.base, {
          requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition)
        });
      const reprojected = reprojectCommandQuoteAttributiveForHeadPolicy(
        rendered,
        baseRes.base,
        requestAttributiveOp !== null ? "request" : "prohibition",
        attributiveProjectionPolicy(layer),
        formal,
        { requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition) }
      ) ?? rendered;
      return reprojected.ok ? { ...reprojected, stemPrefixApplied: true } : reprojected;
    }
    if (quotePostChain === null && likenessModal === null && (commandOp === null || !attributiveCommandHeadPatternMatches(layer.ops, commandOp, []))) {
      return { ok: false, reason: "request/prohibition attributive terminal has unsupported companion op" };
    }
    if (preModalTense !== null) {
      return { ok: false, reason: "request/prohibition attributive terminal stem tense not supported" };
    }
    if (likenessModal !== null) {
      if (preModalNeg !== null) {
        return { ok: false, reason: "request/prohibition likeness attributive stem negation not supported" };
      }
      const stemPrefix = layer.stem.koreanPrefix ?? "";
      const simpleBase = simpleStemBase(stemLemma, stemIrregular, true);
      const rendered = composeLikenessAttributive(
        stemPrefix.length === 0 ? simpleBase : { ...simpleBase, prefix: stemPrefix }
      );
      return rendered.ok && stemPrefix.length > 0
        ? { ...rendered, stemPrefixApplied: true }
        : rendered;
    }
    if (quotePostChain !== null) {
      const quotedBase = buildRequestQuotedPropositionBase(
        simpleStemBase(stemLemma, stemIrregular, true),
        requestAttributiveOp !== null ? "request" : "prohibition",
        { requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition) }
      );
      return composeCommittedCarrierPostChainAttributive(
        quotedBase,
        quotePostChain.postOps,
        quotePostChain.postPolite,
        quotePostChain.connective,
        ctx,
        attributiveProjectionPolicy(layer)
      ) ?? composeCommittedCarrierPostChain(
        quotedBase,
        quotePostChain.postOps,
        quotePostChain.postPolite,
        quotePostChain.connective,
        ctx
      );
    }
    if (postModalNegations.length > 0 || postModalTenses.length > 0) {
      return { ok: false, reason: "request/prohibition attributive terminal + post-reference wrap op not supported" };
    }
    const rendered = requestAttributiveOp !== null
      ? renderRequestAttributiveQuoteFromStem({
        stemLemma,
        stemIrregular,
        isVerb,
        preNeg: preModalNeg,
        past: false,
        stemSourceTokens: layer.stem.source.tokens,
        ...(layer.stem.koreanPrefix === undefined ? {} : { stemKoreanPrefix: layer.stem.koreanPrefix }),
        ...(requestAttributiveOp === null ? {} : { requestSourceTokens: requestAttributiveOp.source.tokens }),
        carrierSourceTokens: layer.ops.find((op) => op.kind === "predicateQuoteCarrier")?.source.tokens ?? []
      })
      : composeRequestProhibitionAttributiveQuote(simpleStemBase(stemLemma, stemIrregular, true), {
        requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition),
        ...(prohibitionAttributiveOp !== null && preModalNeg === null
          ? {
            trace: {
              stemTokens: layer.stem.source.tokens,
              negativeTokens: prohibitionAttributiveOp.source.tokens.slice(0, 1),
              bridgeTokens: prohibitionUsesRequestForm(prohibitionAttributiveOp.prohibition)
                ? prohibitionAttributiveOp.source.tokens.slice(1, 2)
                : prohibitionAttributiveOp.source.tokens.slice(1),
              requestTailTokens: prohibitionUsesRequestForm(prohibitionAttributiveOp.prohibition)
                ? prohibitionAttributiveOp.source.tokens.slice(2)
                : [],
              carrierTokens: layer.ops.find((op) => op.kind === "predicateQuoteCarrier")?.source.tokens ?? []
            }
          }
          : {})
      });
    const stemQuoteBase = layer.stem.koreanPrefix === undefined || layer.stem.koreanPrefix.length === 0
      ? simpleStemBase(stemLemma, stemIrregular, true)
      : { ...simpleStemBase(stemLemma, stemIrregular, true), prefix: layer.stem.koreanPrefix };
    const stemReprojected = preModalNeg !== null
      ? null
      : reprojectCommandQuoteAttributiveForHeadPolicy(
        rendered,
        stemQuoteBase,
        requestAttributiveOp !== null ? "request" : "prohibition",
        attributiveProjectionPolicy(layer),
        formal,
        { requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition) }
      );
    return stemReprojected ?? rendered;
  }
  const fullOpChain = collectOperatorChain(layer.ops);
  const opChain = fullOpChain.filter((op) =>
    !(op.kind === "aspect" && op.aspect === "te_iru" && op.semantic?.renderStrategy === "attributive_drop_aux")
  );
  if (opChain.length === 0 && fullOpChain.length > 0) {
    if (preModalTense === null && postModalTenses.length === 1) {
      preModalTense = postModalTenses[0]!;
      postModalTenses.length = 0;
    }
    if (preModalNeg === null && postModalNegations.length === 1) {
      preModalNeg = postModalNegations[0]!;
      postModalNegations.length = 0;
    }
  }
  const hazuNegativePropositionAttributive = renderHazuNegativePropositionAttributiveTerminal({
    layer,
    opChain,
    stemLemma,
    stemIrregular,
    isVerb,
    formal,
    lookups: ctx.lookups
  });
  if (hazuNegativePropositionAttributive !== null) {
    return hazuNegativePropositionAttributive;
  }
  if (opChain.length > 0) {
    const wrapSlots = assignOperatorChainWrapSlots(layer, opChain, postModalTenses, postModalNegations);
    if (!wrapSlots.ok) {
      return { ok: false, reason: wrapSlots.reason };
    }
    const { pastAfterChainIdx, negAfterChainIdx, negBeforeChainIdx } = wrapSlots.slots;
    const baseRes = chainBases(opChain, stemLemma, stemIrregular, isVerb, {
      lookups: ctx.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      ...chainStemTraceFields(layer.stem),
      ...(preModalTense === null ? {} : { stemPastSourceTokens: preModalTense.source.tokens }),
      sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
      sourceStemIsVolitional: layer.stem.stemMood === "volitional",
      preModalNeg,
      stemPast: preModalTense?.tense === "past",
      pastAfterChainIdx,
      negAfterChainIdx,
      negBeforeChainIdx,
      formal,
      shortNegationPolicy: layer.stem.shortNegationPolicy,
      absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
      ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
      passiveStemOptions: passiveStemOptionsForStem(layer.stem)
    });
    if (!baseRes.ok) {
      return { ok: false, reason: baseRes.reason };
    }
    const finalBaseResult = {
      ok: true,
      base: baseRes.base,
      chainOnFinalSupported: baseRes.chainOnFinalSupported,
      ...(baseRes.finalNegationOptions === undefined ? {} : { finalNegationOptions: baseRes.finalNegationOptions }),
      ...(baseRes.finalNegationLoweringPolicy === undefined ? {} : { finalNegationLoweringPolicy: baseRes.finalNegationLoweringPolicy })
    } satisfies OkBaseResult;
    const projectedBase = baseRes.finalNeg === null
      ? baseRes.base
      : lowerFinalNegationForCommittedBase(finalBaseResult, baseRes.finalNeg, formal, ctx.lookups);
    if (projectedBase === null) {
      return { ok: false, reason: "attributive operator chain final negation lowering not supported" };
    }
    const loweredForcesPast = baseRes.finalNeg === null
      ? false
      : finalNegationLoweringForcesPast(finalBaseResult, baseRes.finalNeg.chainDepth);
    const chainAttributivePast = baseRes.finalPast ||
      (baseRes.finalNeg?.chainPast ?? false) ||
      (loweredForcesPast && baseRes.finalNegationLoweringPolicy !== "te_iru_negative_long_negation") ||
      attributiveBoundaryProjectsResultativeState(layer);
    const attr = projectBaseAttributive(
      projectedBase,
      chainAttributivePast,
      formal,
      baseRes.finalPastProjection ?? "lexical",
      "default",
      committedAttributiveProjectionPolicy(
        layer,
        boundaryRequestsFuture || (
          !chainAttributivePast &&
          preModalTense?.tense !== "past" &&
          opChainIsProspectiveTransparentAspect(opChain) &&
          boundaryHeadIsSourceFutureHeadNoun(layer, ctx)
        )
      )
    );
    if (attr === null) {
      return { ok: false, reason: "attributive operator chain projection not supported" };
    }
    const attrTraced = baseRes.chainSourceTrace === undefined
      ? null
      : likenessAttributiveLexicalizationApplies(projectedBase, false)
        ? rebindChainTraceForProjection(baseRes.chainSourceTrace, attr)
        : closeChainTraceAgainstText(baseRes.chainSourceTrace, attr);
    return {
      ok: true,
      text: attr,
      polite: false,
      stemPrefixApplied: true,
      ...(attrTraced === null ? {} : { traced: attrTraced })
    };
  }
  if (postModalNegations.length > 0 || postModalTenses.length > 0) {
    return { ok: false, reason: "post-reference wrap ops without attributive operator chain" };
  }
  const carriesPast = attributiveTerminalCarriesPast(layer, preModalTense, preModalNeg);
  const pastProjection = layer.stem.commitment === "suppletive_negation" ? "committed" : "lexical";
  const forceFutureProjection = boundaryRequestsFuture &&
    (layer.stem.kind === "verb" || predicateMoodRequestsFutureProjection(layer));
  const useShortAttributiveNegation =
    options.nominalizedTerminal === true &&
    !forceFutureProjection &&
    preModalNeg?.preferShortNegation === true &&
    !ctx.formal;
  const ordinaryEnding = carriesPast || forceFutureProjection || useShortAttributiveNegation
    ? null
    : headRequiredAdnominalEnding(layer) ??
      ordinaryNominalAttributiveEnding(layer, ctx) ??
      sourcePlainVerbAttributiveEnding(layer, ctx);
  if (ordinaryEnding !== null) {
    const text = renderStemAttributiveWithEnding({
      stemLemma,
      stemIrregular,
      stemKind: layer.stem.kind,
      ending: ordinaryEnding,
      preModalNeg,
      lookups: ctx.lookups,
      sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(layer.stem.koreanPrefix)
    });
    return withSimpleHostTraced({ ok: true, text, polite: false }, layer);
  }
  const text = pastNegStemAttributive({
    stemLemma,
    stemIrregular,
    stemKind: layer.stem.kind,
    past: carriesPast,
    pastProjection,
    preModalNeg,
    attrPolicy: forceFutureProjection ? "future" : headRequiredPastAttributivePolicy(layer),
    useShortHint: useShortAttributiveNegation,
    lookups: ctx.lookups,
    sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(layer.stem.koreanPrefix)
  });
  return withSimpleHostTraced({ ok: true, text, polite: false }, layer);
}

function renderHazuNegativePropositionAttributiveTerminal(opts: {
  readonly layer: AuxLayerNode;
  readonly opChain: readonly OperatorOp[];
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): RenderOutcome | null {
  const finalOp = opts.opChain[opts.opChain.length - 1];
  if (
    finalOp === undefined ||
    finalOp.kind !== "modal" ||
    finalOp.modal !== "hazu" ||
    finalOp.polarity !== "affirmative"
  ) {
    return null;
  }
  const finalOpIdx = opts.layer.ops.indexOf(finalOp);
  const neg = opts.layer.ops[finalOpIdx - 1];
  if (neg?.kind !== "negation" || neg.chainDepth !== 1 || neg.chainPast) {
    return null;
  }

  const outerAttributive = headRequiresFutureAttributiveProjection(opts.layer) ? "리 없을" : "리 없는";
  const positiveOps = opts.opChain.slice(0, -1);
  if (positiveOps.length === 0) {
    const attr = pastNegStemAttributive({
      stemLemma: opts.stemLemma,
      stemIrregular: opts.stemIrregular,
      stemKind: opts.isVerb ? "verb" : "adj",
      past: false,
      preModalNeg: null,
      attrPolicy: "future",
      useShortHint: false,
      lookups: opts.lookups,
      sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(opts.layer.stem.koreanPrefix)
    });
    return { ok: true, text: `${attr} ${outerAttributive}`, polite: false };
  }

  const baseRes = chainBases(positiveOps, opts.stemLemma, opts.stemIrregular, opts.isVerb, {
    lookups: opts.lookups,
    stemPrefix: opts.layer.stem.koreanPrefix,
    sourceStemIsVerb: stemHasSourceVerbalPredicate(opts.layer.stem),
    sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(opts.layer.stem),
    preModalNeg: null,
    stemPast: false,
    pastAfterChainIdx: new Map(),
    negAfterChainIdx: new Map(),
    formal: opts.formal,
    shortNegationPolicy: opts.layer.stem.shortNegationPolicy,
    absorbedPassiveAux: opts.layer.stem.absorbedPassiveAux === true,
    ...(opts.layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: opts.layer.stem.absorbedPassiveClass }),
    passiveStemOptions: passiveStemOptionsForStem(opts.layer.stem)
  });
  if (!baseRes.ok || baseRes.finalNeg !== null) {
    return null;
  }
  const attr = projectBaseAttributive(
    baseRes.base,
    baseRes.finalPast,
    opts.formal,
    "lexical",
    "default",
    "future"
  );
  return attr === null ? null : { ok: true, text: `${attr} ${outerAttributive}`, polite: false, stemPrefixApplied: true };
}

function renderBareNominalLikePredicateQuoteAttributiveTerminal(layer: AuxLayerNode): RenderOutcome | null {
  if (layer.stem.kind !== "noun" && layer.stem.kind !== "adverb") {
    return null;
  }
  if (layer.ops.length !== 1) {
    return null;
  }
  const carrier = layer.ops[0];
  if (carrier?.kind !== "predicateQuoteCarrier" || carrier.style !== "compact_toiu") {
    return null;
  }
  const lemma = layer.stem.lemma;
  if (lemma.length === 0) {
    return { ok: false, reason: "bare quote-body attributive stem lemma is empty" };
  }
  const ending = headRequiresFutureAttributiveProjection(layer)
    ? `${selectParticle(lemma, "이라고/라고")} 할`
    : selectParticle(lemma, "이라는/라는");
  return {
    ok: true,
    text: `${lemma}${ending}`,
    polite: false
  };
}

function attributiveSequenceAfterQuoteCarrier(
  layer: AuxLayerNode,
  connective: ConnectiveOp,
  conditionalMannerMode: "wish" | "direct" | null,
): {
  readonly connective: ConnectiveOp;
  readonly carrier: Extract<AuxOpNode, { readonly kind: "predicateQuoteCarrier" }>;
  readonly likenessModal: YoudaModalOp | null;
  readonly wishManner: boolean;
  readonly directManner: boolean;
  readonly conditionalEllipsisMood: ConditionalQuoteEllipsisMood | null;
  readonly reasonAfterCarrier: boolean;
} | null {
  const ops = layer.ops;
  if (
    connective.connective !== "sequence_after" &&
    connective.connective !== "exemplification" &&
    connective.connective !== "conditional" &&
    connective.connective !== "reason"
  ) return null;
  const connectiveIdx = ops.indexOf(connective);
  const carrier = ops[connectiveIdx + 1];
  if (
    connectiveIdx < 0 ||
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu"
  ) {
    return null;
  }
  const remaining = ops.slice(connectiveIdx + 2);
  const likenessModal = remaining[0]?.kind === "modal" && remaining[0].modal === "youda"
    ? remaining[0]
    : null;
  if (connective.connective === "reason") {
    return remaining.length === 0
      ? {
        connective,
        carrier,
        likenessModal: null,
        wishManner: false,
        directManner: false,
        conditionalEllipsisMood: null,
        reasonAfterCarrier: true
      }
      : null;
  }
  if (connective.connective === "conditional") {
    if (likenessModal !== null && remaining.length === 1) {
      return {
        connective,
        carrier,
        likenessModal,
        wishManner: false,
        directManner: false,
        conditionalEllipsisMood: null,
        reasonAfterCarrier: false
      };
    }
    if (remaining.length !== 0) {
      return null;
    }
    if (conditionalMannerMode !== null) {
      return {
        connective,
        carrier,
        likenessModal: null,
        wishManner: conditionalMannerMode === "wish",
        directManner: conditionalMannerMode === "direct",
        conditionalEllipsisMood: null,
        reasonAfterCarrier: false
      };
    }
    return {
      connective,
      carrier,
      likenessModal: null,
      wishManner: false,
      directManner: false,
      conditionalEllipsisMood: conditionalQuoteEllipsisMood(layer, connective),
      reasonAfterCarrier: false
    };
  }
  if (!remaining.every((op) =>
    op.kind === "polite" ||
    op.kind === "classicalAuxResidue" ||
    op.kind === "negation" ||
    op.kind === "tense"
  )) {
    return null;
  }
  return {
    connective,
    carrier,
    likenessModal: null,
    wishManner: false,
    directManner: false,
    conditionalEllipsisMood: null,
    reasonAfterCarrier: false
  };
}

function conditionalCompactQuoteMannerMode(
  layer: AuxLayerNode,
  ctx: RenderContext,
): "wish" | "direct" | null {
  const payload = layer.terminalPayload;
  if (
    payload?.kind !== "attributiveBoundary" ||
    !isAdverbialMannerNounHead(payload.head, ctx.lookups.ADVERBIAL_MODIFIER_MANNER_NOUNS)
  ) {
    return null;
  }
  return payload.conditionalWishMannerHostKind === "thought" ||
    payload.conditionalWishMannerHostKind === "wish"
    ? "wish"
    : "direct";
}

function requestAttributiveQuotePostChain(
  ops: readonly AuxOpNode[],
  command: RequestAspectOp | ProhibitionAspectOp
): { readonly postOps: readonly AuxOpNode[]; readonly postPolite: boolean; readonly connective: ConnectiveOp | null } | null {
  const commandIdx = ops.indexOf(command);
  if (commandIdx < 0 || commandIdx >= ops.length - 1) {
    return null;
  }
  const carrier = ops[commandIdx + 1];
  if (carrier?.kind !== "predicateQuoteCarrier" || carrier.style !== "compact_toiu") {
    return null;
  }
  if (commandIdx + 2 >= ops.length) {
    return null;
  }
  return predicateQuoteCarrierPostChainFromIndex(ops, commandIdx + 1);
}

function predicateQuoteCarrierPostChainFromIndex(
  ops: readonly AuxOpNode[],
  carrierIdx: number
): { readonly postOps: readonly AuxOpNode[]; readonly postPolite: boolean; readonly connective: ConnectiveOp | null } | null {
  if (carrierIdx < 0 || carrierIdx >= ops.length) {
    return null;
  }
  let connective: ConnectiveOp | null = null;
  let postPolite = false;
  const postOps: AuxOpNode[] = [];
  for (let i = carrierIdx + 1; i < ops.length; i++) {
    const op = ops[i]!;
    if (op.kind === "connective") {
      if (i !== ops.length - 1 || connective !== null) {
        return null;
      }
      connective = op;
      continue;
    }
    if (op.kind === "polite") {
      postPolite = true;
      continue;
    }
    if (op.kind === "tense" || op.kind === "negation" || isChainableHeadOp(op)) {
      postOps.push(op);
      continue;
    }
    return null;
  }
  return {
    postOps,
    postPolite,
    connective
  };
}

function ordinaryNominalAttributiveEnding(layer: AuxLayerNode, ctx: RenderContext): "ㄴ/는" | "ㄴ/은" | "ㄹ/을" | null {
  if (
    layer.terminalPayload?.kind !== "attributiveBoundary" ||
    layer.terminalPayload.projection !== "ordinary_nominal" ||
    layer.stem.kind !== "verb"
  ) {
    return null;
  }
  const contentToken = layer.stem.source.tokens[layer.stem.conjugationAnchor];
  if (contentToken === undefined) {
    return null;
  }
  const headToken = layer.terminalPayload.projectionContext.tokens[layer.terminalPayload.head.tokenIdx] ??
    layer.terminalPayload.source.tokens[0] ??
    null;
  const ending = selectPlainVerbAttributiveEnding(
    layer.stem.lemma,
    contentToken,
    headToken,
    {
      tokens: layer.terminalPayload.projectionContext.tokens,
      contentIdx: layer.terminalPayload.projectionContext.contentIdx,
      lookups: ctx.lookups,
      ...(ctx.layout === undefined ? {} : { layout: ctx.layout })
    }
  );
  return ending === "ㄴ/는" || ending === "ㄴ/은" || ending === "ㄹ/을"
    ? ending
    : null;
}

function opChainIsProspectiveTransparentAspect(opChain: readonly AuxOpNode[]): boolean {
  return opChain.length > 0 && opChain.every((op) =>
    op.kind === "aspect" && (op.aspect === "te_iku" || op.aspect === "te_kuru")
  );
}

function boundaryHeadIsSourceFutureHeadNoun(layer: AuxLayerNode, ctx: RenderContext): boolean {
  const payload = layer.terminalPayload;
  if (payload?.kind !== "attributiveBoundary") {
    return false;
  }
  const head = payload.projectionContext.tokens[payload.head.tokenIdx];
  return head !== undefined &&
    (ctx.lookups.JP_FUTURE_HEAD_NOUNS.has(head.dictionaryForm) ||
      ctx.lookups.JP_FUTURE_HEAD_NOUNS.has(head.surface));
}

function sourcePlainVerbAttributiveEnding(layer: AuxLayerNode, ctx: RenderContext): "ㄴ/는" | "ㄴ/은" | "ㄹ/을" | null {
  if (layer.stem.kind !== "verb") {
    return null;
  }
  const contentToken = layer.stem.source.tokens[layer.stem.conjugationAnchor];
  if (contentToken === undefined) {
    return null;
  }
  const ending = selectPlainVerbAttributiveEnding(
    layer.stem.lemma,
    contentToken,
    null,
    {
      tokens: layer.stem.source.tokens,
      contentIdx: layer.stem.conjugationAnchor,
      lookups: ctx.lookups,
      ...(ctx.layout === undefined ? {} : { layout: ctx.layout })
    }
  );
  return ending === "ㄴ/는" || ending === "ㄴ/은" || ending === "ㄹ/을"
    ? ending
    : null;
}

function renderStemAttributiveWithEnding(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly ending: "ㄴ/는" | "ㄴ/은" | "ㄹ/을";
  readonly preModalNeg: NegationOp | null;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): string {
  const { stemLemma, stemIrregular, stemKind, ending, preModalNeg, lookups, sahenShortNegationSplit } = opts;
  const chainDepth = preModalNeg?.chainDepth ?? 0;
  if (chainDepth === 0) {
    return conjugate(stemLemma, stemIrregular, ending);
  }
  if (chainDepth === 1) {
    if (isKoreanPotentialLemma(stemLemma)) {
      const focus = preModalNeg?.focusParticle;
      const prefix = focus === undefined
        ? potentialPhrasePrefix(stemLemma)
        : `${potentialPhrasePrefix(stemLemma).trimEnd()}${focus} `;
      if (preModalNeg?.chainPast === true) {
        return `${prefix}없었던`;
      }
      if (ending === "ㄹ/을") {
        return `${prefix}없을`;
      }
      return `${prefix}없는`;
    }
    const focus = preModalNeg?.focusParticle;
    const stemJi = `${conjugate(stemLemma, stemIrregular, "지")}${focus ?? ""}`;
    if (ending === "ㄴ/은") {
      if (preModalNeg?.inability === true) {
        return `${stemJi} ${conjugate("못하다", "여", "ㄴ/은")}`;
      }
      return focus === undefined
        ? conjugateNegAttributive(stemLemma, stemIrregular, "ㄴ/은")
        : `${stemJi} ${conjugate("않다", null, "ㄴ/은")}`;
    }
    const negEnding = ending === "ㄹ/을" ? "ㄹ/을" : "ㄴ/는";
    return preModalNeg?.inability === true
      ? `${stemJi} ${conjugate("못하다", "여", negEnding)}`
      : `${stemJi} ${conjugate("않다", null, negEnding)}`;
  }
  const attrPolicy = ending === "ㄹ/을" ? "future" : "present";
  return pastNegStemAttributive({
    stemLemma,
    stemIrregular,
    stemKind,
    past: preModalNeg?.chainPast === true,
    preModalNeg,
    attrPolicy,
    useShortHint: false,
    lookups,
    sahenShortNegationSplit
  });
}

function renderPredicateCopulaAttributiveProjection(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return { ok: false, reason: "predicate copula attributive projection requires committed V/A stem" };
  }
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return { ok: false, reason: "predicate copula attributive projection requires CopulaOp as first op" };
  }
  if (copula.variant !== "basic") {
    return { ok: false, reason: `predicate copula attributive variant '${copula.variant}' not supported` };
  }
  const tailOps = layer.ops.slice(1);
  const projectedOps: AuxOpNode[] = [];
  let restOps: readonly AuxOpNode[] = tailOps;
  if (copula.polarity === "negative") {
    const followingNegation = tailOps[0]?.kind === "negation"
      ? tailOps[0]
      : null;
    projectedOps.push(predicateCopulaNegationOp(copula, followingNegation));
    restOps = followingNegation === null ? tailOps : tailOps.slice(1);
  }
  projectedOps.push(...restOps.filter((op) => op.kind !== "polite"));
  return renderAuxLayerAttributiveTerminal({ ...layer, ops: projectedOps, terminal: null }, ctx);
}

function renderAuxLayerRenyouChuushiTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.ops.some((op) => op.kind === "connective")) {
    return { ok: false, reason: "renyou_chuushi terminal cannot contain existing connective op" };
  }
  const causeHead = renderCauseHeadRenyouChuushi(layer);
  if (causeHead !== null) {
    return causeHead;
  }
  const negativeNounCopula = renderNegativeNounCopulaRenyouChuushi(layer, ctx);
  if (negativeNounCopula !== null) {
    return negativeNounCopula;
  }
  const payload = layer.terminalPayload?.kind === "renyouChuushi"
    ? layer.terminalPayload
    : undefined;
  const source = payload?.source ?? lastLayerSource(layer);
  if (source === null) {
    return { ok: false, reason: "renyou_chuushi terminal has no source anchor" };
  }
  const connective: ConnectiveOp = createConnectiveOp({

    connective: "te_form",
    surface: RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE,
    ...(payload?.teFormRole === undefined ? {} : { teFormRole: payload.teFormRole }),
    source: renyouChuushiConnectiveSource(layer, source)
  });
  return renderAuxLayer({ ...layer, terminal: null, ops: [...layer.ops, connective] }, ctx);
}

function renyouChuushiConnectiveSource(layer: AuxLayerNode, source: OpSource): OpSource {
  const lastOp = layer.ops.at(-1);
  if (
    lastOp?.kind !== "aspect" ||
    source.tokens.length <= 1 ||
    !opSourceTokensEqual(source, lastOp.source)
  ) {
    return source;
  }
  const first = source.tokens[0];
  if (first?.surface !== "て" && first?.surface !== "で") {
    return source;
  }
  return {
    tokens: source.tokens.slice(1),
    tokenIndices: source.tokenIndices.slice(1)
  };
}

function opSourceTokensEqual(left: OpSource, right: OpSource): boolean {
  if (left.tokens.length !== right.tokens.length) {
    return false;
  }
  return left.tokens.every((token, index) => token === right.tokens[index]);
}

function renderAuxLayerAdverbialModifierTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  const soudaYotaiSource = soudaYotaiAdverbialModifierSource(layer.ops) ??
    declaredProjectionCarrierAdverbialSource(layer.ops);
  if (soudaYotaiSource !== null) {
    const connective: ConnectiveOp = createConnectiveOp({
      connective: "predicate_projection_manner_simile_action",
      surface: "に",
      source: soudaYotaiSource
    });
    return renderAuxLayer({ ...layer, terminal: null, ops: [...layer.ops, connective] }, ctx);
  }
  const stem = layer.stem;
  if (stem.kind === "adj" || stem.kind === "verb") {
    return {
      ok: true,
      text: conjugate(stem.lemma, irregularFrom(stem.irregular), "게"),
      polite: false
    };
  }
  if (stem.kind === "noun") {
    return {
      ok: true,
      text: `${stem.lemma}${selectParticle(stem.lemma, "으로/로")}`,
      polite: false
    };
  }
  if (stem.kind === "adverb") {
    return { ok: true, text: stem.lemma, polite: false };
  }
  return { ok: false, reason: `adverbial_modifier terminal unsupported stem kind '${stem.kind}'` };
}

function isYotaiAppearanceModalOp(op: AuxOpNode): boolean {
  return op.kind === "modal" && op.modal === "souda_hearsay" && op.reading === "yotai";
}

function soudaYotaiAdverbialModifierSource(ops: readonly AuxOpNode[]): OpSource | null {
  const last = ops.at(-1);
  if (last === undefined || !isYotaiAppearanceModalOp(last)) {
    return null;
  }
  const niIdx = last.source.tokens.findIndex((token, index) =>
    copulaNiMarkerRelationForToken(token, index, {
      consumers: ["tail_render"]
    }) !== null
  );
  if (niIdx === -1) {
    return null;
  }
  return {
    tokens: [last.source.tokens[niIdx]!],
    tokenIndices: [last.source.tokenIndices[niIdx]!]
  };
}

function declaredProjectionCarrierAdverbialSource(ops: readonly AuxOpNode[]): OpSource | null {
  const last = ops.at(-1);
  if (
    last?.kind !== "predicateProjectionCarrier" ||
    declaredProjectionCarrierBranchTerminal(last.sourceAllomorph) !== "adverbial_modifier"
  ) {
    return null;
  }
  const followerIdx = last.source.tokens.length - 1;
  if (followerIdx < 0) {
    return null;
  }
  return {
    tokens: [last.source.tokens[followerIdx]!],
    tokenIndices: [last.source.tokenIndices[followerIdx]!]
  };
}

function renderCauseHeadRenyouChuushi(layer: AuxLayerNode): RenderOutcome | null {
  if (layer.stem.kind !== "noun" || layer.ops.length !== 1) {
    return null;
  }
  const copula = layer.ops[0];
  if (
    copula?.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "affirmative" ||
    copula.polite
  ) {
    return null;
  }
  const sourceForm = layer.stem.source.tokens[layer.stem.semanticAnchors[0] ?? 0]?.dictionaryForm;
  if (sourceForm !== "せい" && sourceForm !== "おかげ") {
    return null;
  }
  return { ok: true, text: `${layer.stem.lemma}에`, polite: false };
}

function renderNegativeNounCopulaRenyouChuushi(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  if (layer.stem.kind !== "noun" || layer.ops.length !== 1) {
    return null;
  }
  const copula = layer.ops[0];
  if (
    copula?.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "negative" ||
    copula.polite
  ) {
    return null;
  }
  const noun = layer.stem.lemma;
  const host = nounCopulaStemAllomorphHost(layer.stem, ctx, noun);
  const split = splitNegativeNounCopulaSourceTokens(copula.source.tokens);
  const traced = noun.length > 0 && split.carrierTokens.length > 0 && split.finalTokens.length > 0
    ? tracedCat(
      tracedSeg(noun, layer.stem.source.tokens, "lexeme", "semantic"),
      tracedSeg(`${nounSubjectPart(noun, host).slice(noun.length)} `, split.carrierTokens, "aux", "semantic"),
      tracedSeg("아니라", split.finalTokens, "aux", "semantic")
    )
    : undefined;
  return {
    ok: true,
    text: `${nounSubjectPart(noun, host)} 아니라`,
    polite: false,
    ...(traced === undefined ? {} : { traced })
  };
}

function quotativeMannerSimileAttributiveFinalConnective(
  layer: AuxLayerNode
): ConnectiveOp | null {
  const last = layer.ops[layer.ops.length - 1];
  return last?.kind === "connective" &&
    last.connective === "predicate_projection_quotative_manner_simile_attributive"
    ? last
    : null;
}

function renderAuxLayerNominalizedTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (
    layer.ops[0]?.kind !== "copula" &&
    stemIsAdjectivalSourceWithNominalTarget(layer.stem)
  ) {
    layer = { ...layer, ops: nominalTargetCopulaBridgeOps(layer.ops) };
  }
  const attr = quotativeMannerSimileAttributiveFinalConnective(layer) !== null
    ? renderAuxLayer(layer, ctx)
    : renderAuxLayerAttributiveTerminal(layer, ctx, { nominalizedTerminal: true });
  if (!attr.ok) {
    return attr;
  }
  const nominalizerSourceTokens = layer.terminalPayload?.kind === "nominalized"
    ? layer.terminalPayload.source.tokens
    : [];
  return {
    ok: true,
    text: `${attr.text} 것`,
    polite: false,
    ...(attr.stemPrefixApplied === undefined ? {} : { stemPrefixApplied: attr.stemPrefixApplied }),
    ...(attr.traced === undefined
      ? {}
      : {
        traced: tracedCat(
          attr.traced,
          tracedSeg(" 것", nominalizerSourceTokens, "aux", "semantic")
        )
      })
  };
}

function renderSimpleKeijoujiNaNounAttributiveTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext,
  noun: string,
  copula: AuxOpNode
): RenderOutcome | null {
  if (
    layer.stem.kind !== "noun" ||
    copula.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "affirmative" ||
    copula.polite ||
    layer.ops.length !== 1 ||
    !copula.source.tokens.some(isDaRentaikeiCopulaToken)
  ) {
    return null;
  }
  const sourceToken = layer.stem.source.tokens[layer.stem.semanticAnchors[0] ?? layer.stem.conjugationAnchor];
  if (sourceToken === undefined || !isNaAdjCapable(sourceToken)) {
    return null;
  }
  const text = simpleKeijoujiNaNounAttributiveText(
    ctx,
    noun,
    layer.stem,
    sourceToken,
    attributiveProjectionPolicy(layer)
  );
  if (text === null) {
    return null;
  }
  return {
    ok: true,
    text,
    polite: false,
    traced: tracedSeg(text, [...layer.stem.source.tokens, ...copula.source.tokens], "lexeme", "semantic")
  };
}

function isDaRentaikeiCopulaToken(token: { readonly pos: number }): boolean {
  return (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 連体形_);
}

function simpleKeijoujiNaNounAttributiveText(
  ctx: RenderContext,
  noun: string,
  stem: NounStem,
  sourceToken: Parameters<typeof isHumanReferentToken>[0],
  attrPolicy: AttributiveProjectionPolicy
): string | null {
  const evidence = resolveNominalAttributiveEvidence(
    noun,
    keijoujiNaNounAttributiveTypedEvidence(stem)
  );
  const text = nominalAttributiveSurface(noun, evidence, {
    futureProjection: isFutureAttributiveProjection(attrPolicy)
  });
  if (text === null || evidence === "predicate_nominalized" || evidence === "teki_derivation") {
    return text;
  }
  return isHumanReferentToken(sourceToken, ctx.lookups) || isKeijoujiNaIdentityTypeNoun(sourceToken, ctx.lookups)
    ? null
    : text;
}

function keijoujiNaNounAttributiveTypedEvidence(stem: NounStem): NominalAttributiveEvidence {
  if (stem.nominalizedFrom === "predicate") {
    return "predicate_nominalized";
  }
  const lastSourceToken = stem.source.tokens.at(-1);
  return lastSourceToken !== undefined && isTekiDerivationSuffixToken(lastSourceToken)
    ? "teki_derivation"
    : "unknown";
}

function isKeijoujiNaIdentityTypeNoun(
  sourceToken: Parameters<typeof isHumanReferentToken>[0],
  lookups: LookupTables
): boolean {
  return lookups.KEIJOUJI_NA_IDENTITY_TYPE_NOUNS.has(sourceToken.dictionaryForm) ||
    lookups.KEIJOUJI_NA_IDENTITY_TYPE_NOUNS.has(sourceToken.surface);
}

function renderNounCopulaExemplificationQuoteCarrierAttributive(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  const ops = layer.ops;
  const carrier = ops[ops.length - 1];
  const connective = ops[ops.length - 2];
  if (
    ops.length < 3 ||
    ops[0]?.kind !== "copula" ||
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    connective?.kind !== "connective" ||
    connective.connective !== "exemplification"
  ) {
    return null;
  }
  const clause = renderNounCopula(
    { ...layer, ops: withoutAttributiveInternalPoliteness(ops.slice(0, -1)), terminal: null },
    ctx
  );
  if (!clause.ok) return clause;
  return {
    ok: true,
    text: `${clause.text} ${headRequiresFutureAttributiveProjection(layer) ? "할" : "하는"}`,
    polite: false
  };
}

function namingQuoteLikenessModal(
  stem: NounStem,
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>,
  carrier: {
    readonly op: PredicateQuoteCarrierOp;
    readonly postOps: readonly AuxOpNode[];
    readonly postPolite: boolean;
    readonly connective: ConnectiveOp | null;
  },
  past: boolean,
  externalNegation: NegationOp | null
): YoudaModalOp | null {
  if (
    past ||
    externalNegation !== null ||
    copula.polarity !== "affirmative" ||
    copula.polite ||
    carrier.op.style !== "compact_toiu" ||
    carrier.postPolite ||
    carrier.connective !== null ||
    carrier.postOps.length !== 1 ||
    !copulaOpHasNoOwnSurface(copula, stem)
  ) {
    return null;
  }
  const modal = carrier.postOps[0];
  return modal?.kind === "modal" &&
    modal.modal === "youda" &&
    modal.terminal === "attributive_na" &&
    !modal.past &&
    !modal.polite
    ? modal
    : null;
}

function copulaOpHasNoOwnSurface(
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>,
  stem: NounStem
): boolean {
  const own = copula.source.tokenIndices;
  return own.length > 0 && own.every((index) => stem.source.tokenIndices.includes(index));
}

function foldNounCopulaAttributiveModalChain(
  layer: AuxLayerNode,
  ctx: RenderContext,
  noun: string,
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>,
  modalChain: readonly ModalOp[],
  past: boolean,
  externalNegation: NegationOp | null
): BaseResult {
  const base = nounCopulaPolarityBaseForCopula(copula, noun, 0, nounCopulaStemAllomorphHost(layer.stem, ctx, noun));
  const hostPast = past || (externalNegation?.chainPast ?? false);
  const hostBase = externalNegation !== null
    ? applyExternalNegationDepthToPredicateBase(base, externalNegation.chainDepth, ctx.formal)
    : copulaCarrierBaseForInterOp(base, ctx.formal);
  if (hostBase === null) {
    return { ok: false, reason: "noun copula attributive modal host lowering failed" };
  }
  let currentBase = hostBase;
  let currentPast = hostPast;
  let modalBaseResult: OkBaseResult | null = null;
  for (let i = 0; i < modalChain.length; i++) {
    const modal = modalChain[i]!;
    const baseAtStep = opToBase(modal, currentBase, {
      lookups: ctx.lookups,
      preModalNeg: null,
      past: currentPast,
      pastProjection: "lexical",
      formal: ctx.formal,
      hasFollowingOp: i < modalChain.length - 1,
      shortNegationPolicy: undefined,
      sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
      passiveStemOptions: {},
      forbidShortNegation: false,
      desiredPredicateNegation: null
    });
    if (!baseAtStep.ok) {
      return baseAtStep;
    }
    if (i === modalChain.length - 1) {
      modalBaseResult = baseAtStep;
      break;
    }
    const interOpBase = copulaCarrierBaseForInterOp(baseAtStep.base, ctx.formal);
    if (interOpBase === null) {
      return { ok: false, reason: "noun copula attributive modal inter-op projection failed" };
    }
    currentBase = applyNonLastPrefixContractions(interOpBase, baseAtStep, ctx.formal);
    currentPast =
      baseAtStep.interOpProjectionPolicy === "stative_perfect" ||
      opCarriesIntrinsicPast(modal);
  }
  if (modalBaseResult === null) {
    return { ok: false, reason: "noun copula attributive modal chain invariant violation" };
  }
  return {
    ...modalBaseResult,
    ...modalFinalChainPolicy(modalBaseResult.base)
  } satisfies BaseResult;
}

function renderNounCopulaAttributiveTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.stem.kind !== "noun") {
    return { ok: false, reason: "noun copula attributive terminal requires noun stem" };
  }
  const reasonQuote = legacyNounCopulaReasonQuoteAttributive(layer, ctx);
  if (reasonQuote !== null) {
    return reasonQuote;
  }
  const noun = layer.stem.lemma;
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return { ok: false, reason: "noun copula attributive terminal requires CopulaOp as first op" };
  }
  if (copula.variant === "conditional_nara") {
    if (copula.polarity !== "affirmative" || copula.polite || layer.ops.length !== 1) {
      return { ok: false, reason: "noun copula conditional_nara attributive composition not supported" };
    }
    const naraEnding = selectParticle(nounCopulaStemAllomorphHost(layer.stem, ctx, noun) ?? noun, "이라면/라면");
    return {
      ok: true,
      text: `${noun}${naraEnding}`,
      polite: false,
      ...(noun.length > 0
        ? {
          traced: tracedCat(
            tracedSeg(noun, layer.stem.source.tokens, "lexeme", "semantic"),
            tracedSeg(naraEnding, copula.source.tokens, "aux", "semantic")
          )
        }
        : {})
    };
  }
  const centralizedAttributive = renderNounCopulaAttributiveOperatorChain(
    { ...layer, stem: layer.stem },
    copula,
    ctx
  );
  if (centralizedAttributive !== null) {
    return centralizedAttributive;
  }
  const exemplificationQuoteCarrier =
    renderNounCopulaExemplificationQuoteCarrierAttributive(layer, ctx);
  if (exemplificationQuoteCarrier !== null) {
    return exemplificationQuoteCarrier;
  }
  if (copula.variant !== "basic") {
    return { ok: false, reason: `noun copula attributive variant '${copula.variant}' not supported` };
  }
  const conjectureChain = layer.ops.slice(1);
  if (conjectureChain.some((op) => op.kind === "conjecture")) {
    const opChain = collectOperatorChain(conjectureChain);
    const firstHeadIdx = opChain.length === 0 ? -1 : conjectureChain.indexOf(opChain[0]!);
    let preNeg: NegationOp | null = null;
    let stemPast = false;
    const postTenses: TenseOp[] = [];
    const postNegations: NegationOp[] = [];
    for (let i = 0; i < conjectureChain.length; i++) {
      const op = conjectureChain[i]!;
      if (isHeadOp(op) || op.kind === "polite") continue;
      if (op.kind === "tense") {
        if (firstHeadIdx === -1 || i < firstHeadIdx) stemPast = true;
        else postTenses.push(op);
        continue;
      }
      if (op.kind === "negation") {
        if (firstHeadIdx === -1 || i < firstHeadIdx) {
          if (preNeg !== null) return { ok: false, reason: "multiple noun-copula attributive pre-chain negations not supported" };
          preNeg = op;
        } else postNegations.push(op);
        continue;
      }
      return { ok: false, reason: `op '${op.kind}' in noun-copula conjecture attributive chain not supported` };
    }
    const findSlot = (wrapper: AuxOpNode): number | null => {
      const wrapperIdx = conjectureChain.indexOf(wrapper);
      let slot = -1;
      for (let chainIdx = 0; chainIdx < opChain.length; chainIdx++) {
        if (conjectureChain.indexOf(opChain[chainIdx]!) < wrapperIdx) slot = chainIdx;
      }
      return slot < 0 ? null : slot;
    };
    const pastAfterChainIdx = new Map<number, TenseOp>();
    for (const op of postTenses) {
      const slot = findSlot(op);
      if (slot === null) return { ok: false, reason: "noun-copula attributive tense slot invariant violation" };
      pastAfterChainIdx.set(slot, op);
    }
    const negAfterChainIdx = new Map<number, NegationOp>();
    for (const op of postNegations) {
      const slot = findSlot(op);
      if (slot === null) return { ok: false, reason: "noun-copula attributive negation slot invariant violation" };
      negAfterChainIdx.set(slot, op);
    }
    const initialBase = nounCopulaPolarityBaseForCopula(copula, noun, 0, nounCopulaStemAllomorphHost(layer.stem, ctx, noun));
    const folded = chainBases(opChain, noun, null, false, {
      lookups: ctx.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      ...chainStemTraceFields(layer.stem),
      initialBaseResult: { ok: true, base: initialBase, chainOnFinalSupported: true },
      sourceStemIsVerb: false,
      sourceStemIsSahenPredicate: false,
      preModalNeg: preNeg,
      stemPast,
      pastAfterChainIdx,
      negAfterChainIdx,
      formal: ctx.formal,
      shortNegationPolicy: undefined,
      absorbedPassiveAux: false,
      passiveStemOptions: {}
    });
    if (!folded.ok) return folded;
    const projectedBase = folded.finalNeg === null
      ? folded.base
      : lowerFinalNegationForCommittedBase(folded, folded.finalNeg, ctx.formal, ctx.lookups);
    if (projectedBase === null) {
      return { ok: false, reason: "noun-copula conjecture attributive final negation lowering failed" };
    }
    const attr = projectBaseAttributive(
      projectedBase,
      folded.finalPast,
      ctx.formal,
      "lexical",
      "default",
      attributiveProjectionPolicy(layer)
    );
    return attr === null
      ? { ok: false, reason: "noun-copula conjecture attributive projection failed" }
      : { ok: true, text: attr, polite: false };
  }
  const postverbAttributive = renderNounCopulaPostverbAttributiveTerminal(layer, ctx, noun, copula);
  if (postverbAttributive !== null) {
    return postverbAttributive;
  }
  let past = false;
  let externalNegation: NegationOp | null = null;
  const modalChain: ModalOp[] = [];
  let postModalNeg: NegationOp | null = null;
  let postModalPast = false;
  let predicateQuoteCarrier:
    | {
      readonly op: PredicateQuoteCarrierOp;
      readonly postOps: readonly AuxOpNode[];
      readonly postPolite: boolean;
      readonly connective: ConnectiveOp | null;
    }
    | null = null;
  for (let i = 1; i < layer.ops.length; i++) {
    const op = layer.ops[i]!;
    if (op.kind === "tense") {
      if (op.tense !== "past") {
        return { ok: false, reason: `noun copula attributive tense '${op.tense}' not supported` };
      }
      if (modalChain.length > 0) {
        if (postModalPast) {
          return { ok: false, reason: "multiple noun copula attributive post-modal tense ops not supported" };
        }
        postModalPast = true;
      } else {
        if (past) {
          return { ok: false, reason: "multiple noun copula attributive tense ops not supported" };
        }
        past = true;
      }
      continue;
    }
    if (op.kind === "polite") {
      continue;
    }
    if (op.kind === "negation") {
      if (modalChain.length > 0) {
        if (postModalNeg !== null) {
          return { ok: false, reason: "multiple noun copula attributive post-modal negation ops not supported" };
        }
        postModalNeg = op;
      } else {
        if (externalNegation !== null) {
          return { ok: false, reason: "multiple noun copula attributive negation ops not supported" };
        }
        externalNegation = op;
      }
      continue;
    }
    if (op.kind === "modal" && op.modal !== "souda_hearsay") {
      modalChain.push(op);
      continue;
    }
    if (op.kind === "predicateQuoteCarrier") {
      if (predicateQuoteCarrier !== null) {
        return { ok: false, reason: "multiple noun copula predicate quote carriers not supported" };
      }
      const postChain = predicateQuoteCarrierPostChainFromIndex(layer.ops, i);
      if (postChain === null) {
        return { ok: false, reason: "noun copula predicate quote carrier has unsupported post-chain" };
      }
      predicateQuoteCarrier = { op, ...postChain };
      break;
    }
    return { ok: false, reason: `op '${op.kind}' in noun copula attributive terminal not supported` };
  }
  if (predicateQuoteCarrier !== null) {
    if (copula.variant !== "basic") {
      return { ok: false, reason: `noun copula predicate quote variant '${copula.variant}' not supported` };
    }
    const namingLikeness = namingQuoteLikenessModal(layer.stem, copula, predicateQuoteCarrier, past, externalNegation);
    if (namingLikeness !== null) {
      return renderNominalHostLikeness(noun, [namingLikeness], ctx, attributiveProjectionPolicy(layer));
    }
    const quoteHost = (() => {
      if (modalChain.length > 0) {
        const folded = foldNounCopulaAttributiveModalChain(layer, ctx, noun, copula, modalChain, past, externalNegation);
        return folded.ok
          ? { ok: true as const, base: folded.base, preStemNeg: postModalNeg, stemPast: postModalPast }
          : folded;
      }
      const base = nounCopulaPolarityBaseForCopula(copula, noun, 0, nounCopulaStemAllomorphHost(layer.stem, ctx, noun));
      const hostPast = past || (externalNegation?.chainPast ?? false);
      const host = externalNegation !== null
        ? applyExternalNegationDepthToPredicateBase(base, externalNegation.chainDepth, ctx.formal)
        : copulaCarrierBaseForInterOp(base, ctx.formal);
      return host === null
        ? { ok: false as const, reason: "noun copula predicate quote host lowering failed" }
        : { ok: true as const, base: host, preStemNeg: null, stemPast: hostPast };
    })();
    if (!quoteHost.ok) {
      return quoteHost;
    }
    const quoted = predicateQuoteCarrierBase({
      op: predicateQuoteCarrier.op,
      inputBase: quoteHost.base,
      preStemNeg: quoteHost.preStemNeg,
      stemPast: quoteHost.stemPast,
      lookups: ctx.lookups
    });
    if (!quoted.ok) {
      return quoted;
    }
    const quoteAttrTraced = (result: RenderOutcome): RenderOutcome => {
      if (!result.ok || result.traced !== undefined || noun.length === 0) {
        return result;
      }
      const closed = closeChainTraceAgainstText(
        {
          prefixSegments: [stemHostTraceSegment(layer.stem, noun, layer.stem.source.tokens, "lexeme", "semantic")],
          finalSourceTokens: layer.ops.flatMap((op) => op.source.tokens),
          finalKind: "aux"
        },
        result.text
      );
      return closed === null ? result : { ...result, traced: closed };
    };
    if (
      predicateQuoteCarrier.postOps.length > 0 ||
      predicateQuoteCarrier.postPolite ||
      predicateQuoteCarrier.connective !== null
    ) {
      const attributiveClosed = composeCommittedCarrierPostChainAttributive(
        quoted,
        predicateQuoteCarrier.postOps,
        predicateQuoteCarrier.postPolite,
        predicateQuoteCarrier.connective,
        ctx,
        attributiveProjectionPolicy(layer)
      );
      return quoteAttrTraced(attributiveClosed ?? composeCommittedCarrierPostChain(
        quoted,
        predicateQuoteCarrier.postOps,
        predicateQuoteCarrier.postPolite,
        predicateQuoteCarrier.connective,
        ctx
      ));
    }
    const attr = projectBaseAttributive(
      quoted.base,
      false,
      ctx.formal,
      "lexical",
      "default",
      attributiveProjectionPolicy(layer)
    );
    return attr === null
      ? { ok: false, reason: "noun copula predicate quote attributive projection failed" }
      : quoteAttrTraced({ ok: true, text: attr, polite: false });
  }
  if (modalChain.length > 0) {
    if (copula.polarity !== "affirmative") {
      return { ok: false, reason: "noun copula attributive modal chain requires affirmative copula" };
    }
    const committedModalBase = foldNounCopulaAttributiveModalChain(layer, ctx, noun, copula, modalChain, past, externalNegation);
    if (!committedModalBase.ok) {
      return committedModalBase;
    }
    const projectedBase = postModalNeg === null
      ? committedModalBase.base
      : lowerFinalNegationForCommittedBase(committedModalBase, postModalNeg, ctx.formal, ctx.lookups);
    if (projectedBase === null) {
      return { ok: false, reason: "noun copula attributive modal final negation lowering failed" };
    }
    const attr = projectBaseAttributive(
      projectedBase,
      postModalPast ||
      (postModalNeg?.chainPast ?? false),
      ctx.formal,
      "lexical",
      "default",
      attributiveProjectionPolicy(layer)
    );
    return attr === null
      ? { ok: false, reason: "noun copula attributive modal projection failed" }
      : { ok: true, text: attr, polite: false };
  }
  const attributiveTraced = (result: RenderOutcome): RenderOutcome => {
    if (!result.ok || result.traced !== undefined || noun.length === 0) {
      return result;
    }
    const restOpTokens = layer.ops.slice(1).flatMap((op) => op.source.tokens);
    const stemSegment: TailTraceSegment =
      stemHostTraceSegment(layer.stem, noun, layer.stem.source.tokens, "lexeme", "semantic");
    const trace: ChainSourceTrace | null = copula.polarity === "affirmative" && externalNegation === null
      ? {
        prefixSegments: [stemSegment],
        finalSourceTokens: [...copula.source.tokens, ...restOpTokens],
        finalKind: "aux"
      }
      : (() => {
        const split = splitNegativeNounCopulaSourceTokens(copula.source.tokens);
        if (split.carrierTokens.length === 0 || split.finalTokens.length === 0) {
          return null;
        }
        return {
          prefixSegments: [
            stemSegment,
            {
              text: `${nounSubjectPart(noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun)).slice(noun.length)} `,
              sourceTokens: split.carrierTokens,
              kind: "aux",
              projectionConfidence: "semantic"
            }
          ],
          finalSourceTokens: [...split.finalTokens, ...restOpTokens],
          finalKind: "aux"
        };
      })();
    const closed = trace === null ? null : closeChainTraceAgainstText(trace, result.text);
    return closed === null ? result : { ...result, traced: closed };
  };
  if (copula.polarity === "affirmative" && externalNegation === null) {
    const simpleKeijoujiNaAttributive = renderSimpleKeijoujiNaNounAttributiveTerminal(layer, ctx, noun, copula);
    if (simpleKeijoujiNaAttributive !== null) {
      return simpleKeijoujiNaAttributive;
    }
    const attr = projectBaseAttributive(
      nounCopulaBaseForCopula(copula, noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun)),
      past,
      ctx.formal,
      "lexical",
      "default",
      attributiveProjectionPolicy(layer)
    );
    return attr === null
      ? { ok: false, reason: "noun copula attributive projection failed" }
      : attributiveTraced({ ok: true, text: attr, polite: false });
  }
  const chainDepth = 1 + (externalNegation?.chainDepth ?? 0);
  const chainPast = externalNegation?.chainPast ?? false;
  if (chainDepth === 1) {
    const text = projectBaseAttributive(
      copula.honorific === true
        ? honorificNegativeNounCopulaBase(noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun))
        : {
          prefix: `${nounSubjectPart(noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun))} `,
          final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
        },
      past || chainPast,
      ctx.formal,
      "lexical",
      "default",
      attributiveProjectionPolicy(layer)
    );
    if (text === null) {
      return { ok: false, reason: "noun copula attributive negative projection failed" };
    }
    return attributiveTraced({ ok: true, text, polite: false });
  }
  const lowered = applyNegationDepthToLemmaBase(
    { prefix: `${nounSubjectPart(noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun))} 아닌 건 `, final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false } },
    chainDepth - 1
  );
  if (lowered === null) {
    return { ok: false, reason: "noun copula attributive negative chain lowering failed" };
  }
  const attr = projectBaseAttributive(
    lowered,
    past || chainPast,
    ctx.formal,
    "lexical",
    "default",
    attributiveProjectionPolicy(layer)
  );
  return attr === null
    ? { ok: false, reason: "noun copula attributive negative chain projection failed" }
    : attributiveTraced({ ok: true, text: attr, polite: false });
}

function legacyNounCopulaReasonQuoteAttributive(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  if (layer.stem.kind !== "noun") return null;
  const [copula, reason, carrier, ...rest] = layer.ops;
  if (
    copula?.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "affirmative" ||
    reason?.kind !== "connective" ||
    reason.connective !== "reason" ||
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    rest.length > 0
  ) {
    return null;
  }
  const noun = layer.stem.lemma;
  return {
    ok: true,
    text: `${layer.stem.koreanPrefix ?? ""}${noun}${selectParticle(nounCopulaStemAllomorphHost(layer.stem, ctx, noun) ?? noun, "이기/기")} ${headRequiresFutureAttributiveProjection(layer) ? "때문이라고 할" : "때문이라는"}`,
    polite: false,
    stemPrefixApplied: true
  };
}

function renderNounCopulaPostverbAttributiveTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext,
  noun: string,
  copula: AuxOpNode
): RenderOutcome | null {
  if (
    copula.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "affirmative" ||
    copula.polite
  ) {
    return null;
  }
  const postverb = layer.ops[1];
  const postverbCarrier = postverb?.source.tokens.at(-1);
  if (
    postverb?.kind !== "postverbAuxiliary" ||
    postverbCarrier?.dictionaryForm !== "なる"
  ) {
    return null;
  }
  const postOps = layer.ops.slice(2);
  if (!postOps.every((op) =>
    isChainableHeadOp(op) ||
    op.kind === "aspect" ||
    op.kind === "tense" ||
    op.kind === "polite" ||
    op.kind === "connective"
  )) {
    return null;
  }
  const source = {
    tokens: [
      ...layer.stem.source.tokens,
      ...copula.source.tokens,
      ...postverb.source.tokens
    ],
    tokenIndices: [
      ...layer.stem.source.tokenIndices,
      ...copula.source.tokenIndices,
      ...postverb.source.tokenIndices
    ]
  };
  const syntheticLayer: AuxLayerNode = {
    ...layer,
    stem: {
      kind: "verb",
      lemma: "되다",
      conj: "godan",
      irregular: null,
      source,
      conjugationAnchor: source.tokens.length - 1,
      semanticAnchors: [0],
      koreanPrefix: `${nounSubjectPart(noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun))} `
    },
    ops: postOps
  };
  return renderAuxLayerAttributiveTerminal(syntheticLayer, ctx);
}

function attributiveBoundaryProjectsResultativeState(layer: AuxLayerNode): boolean {
  return layer.terminalPayload?.kind === "attributiveBoundary" &&
    layer.terminalPayload.projection === "resultative_state" &&
    layer.stem.kind === "verb";
}

function attributiveTerminalCarriesPast(
  layer: AuxLayerNode,
  preModalTense: TenseOp | null,
  preModalNeg: NegationOp | null
): boolean {
  if (preModalNeg?.chainPast === true) {
    return true;
  }
  if (preModalTense === null) {
    return attributiveBoundaryProjectsResultativeState(layer);
  }
  if (
    layer.terminalPayload?.kind === "attributiveBoundary" &&
    layer.terminalPayload.projection === "lexical_past" &&
    layer.stem.kind === "adj" &&
    layer.stem.commitment !== "suppletive_negation" &&
    stemHasSourceVerbalPredicate(layer.stem)
  ) {
    return false;
  }
  return true;
}

function renderCausativeReceiveHumbleCommitment(options: {
  readonly stem: StemNode;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly voice: VoiceOp | null;
  readonly benefactive: BenefactiveAspectOp | null;
  readonly connective: ConnectiveOp | null;
  readonly modal: ModalOp | null;
  readonly conjecture: ConjectureOp | null;
  readonly desire: DesireOp | null;
  readonly obligation: ObligationIdiomOp | null;
  readonly potentialKotoGaDekiru: PotentialKotoGaDekiruIdiomOp | null;
  readonly aspect: SimpleAspectOp | null;
  readonly request: RequestAspectOp | null;
  readonly prohibition: ProhibitionAspectOp | null;
  readonly desiderative: DesiderativeAspectOp | null;
  readonly miseru: MiseruAspectOp | null;
  readonly preModalNeg: NegationOp | null;
  readonly postModalNeg: NegationOp | null;
  readonly preModalTense: TenseOp | null;
  readonly postModalTense: TenseOp | null;
  readonly preModalPolite: PoliteOp | null;
  readonly postModalPolite: PoliteOp | null;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): RenderSuccess | null {
  const { voice, benefactive } = options;
  if (voice === null || benefactive === null || voice.voice !== "causative") {
    return null;
  }
  const payload = benefactive.benefactive;
  if (payload.kind !== "itadaku" || payload.potential) {
    return null;
  }
  const polite = options.preModalPolite !== null || options.postModalPolite !== null;
  const pastTense = options.preModalTense?.tense === "past" || options.postModalTense?.tense === "past";
  if (
    options.connective !== null ||
    options.modal !== null ||
    options.conjecture !== null ||
    options.desire !== null ||
    options.obligation !== null ||
    options.potentialKotoGaDekiru !== null ||
    options.aspect !== null ||
    options.request !== null ||
    options.prohibition !== null ||
    options.desiderative !== null ||
    options.miseru !== null ||
    options.preModalNeg !== null ||
    options.postModalNeg !== null
  ) {
    return null;
  }

  const [lemma, irregular] = causativeItadakuCommitmentLemma(
    options.stem,
    options.stemLemma,
    options.stemIrregular,
    options.lookups
  );
  if (pastTense) {
    return {
      ok: true,
      text: composeFinalForm(lemma, irregular, true, true, options.formal, polite, options.lookups),
      polite
    };
  }
  return {
    ok: true,
    text: composeReceiveHumbleCommitmentTerminal(lemma, irregular, options.formal, polite),
    polite
  };
}

function composeReceiveHumbleCommitmentTerminal(
  lemma: string,
  irregular: IrregularType | null,
  formal: boolean,
  polite: boolean
): string {
  if (formal) {
    return `${conjugate(lemma, irregular, "겠")}${polite ? "습니다" : "다"}`;
  }
  return `${conjugate(lemma, irregular, "ㄹ/을")}게${polite ? "요" : ""}`;
}

function isRedundantPoliteCarry(existing: PoliteOp, next: PoliteOp): boolean {
  return opSourceHasPos4(existing.source, 助動詞_マス) && opSourceHasPos4(next.source, 助動詞_デス);
}

function opSourceHasPos4(source: OpSource, pos4: number): boolean {
  return source.tokens.some((token) => (token.pos & POS4) === pos4);
}

function isExplicitAdverbialTailEvidenceOp(op: AuxOpNode): boolean {
  if (op.kind === "connective") {
    return true;
  }
  return op.kind === "postverbAuxiliary" &&
    (
      op.auxiliary.kind === "adverbial_change" ||
      op.auxiliary.kind === "adverbial_change_potential" ||
      op.auxiliary.kind === "adverbial_control"
    );
}




function commandAttributiveAspectOpWithQuotedPostChain<T extends RequestAspectOp | ProhibitionAspectOp>(
  ops: readonly AuxOpNode[],
  isCommandAspectOp: (op: AuxOpNode | undefined) => op is T
): T | null {
  const headOps = ops.filter(isHeadOp);
  for (const command of headOps) {
    if (isCommandAspectOp(command) && requestAttributiveQuotePostChain(ops, command) !== null) {
      return command;
    }
  }
  return null;
}

function commandAttributiveLikenessModal(
  ops: readonly AuxOpNode[],
  command: RequestAspectOp | ProhibitionAspectOp
): YoudaModalOp | null {
  const commandIdx = ops.indexOf(command);
  if (commandIdx < 0 || commandIdx !== ops.length - 2) {
    return null;
  }
  const likeness = ops[ops.length - 1];
  return likeness?.kind === "modal" &&
    likeness.modal === "youda" &&
    likeness.terminal === "attributive_na" &&
    !likeness.past &&
    !likeness.polite
    ? likeness
    : null;
}

function commandAttributiveAspectOpBeforeLikeness<T extends RequestAspectOp | ProhibitionAspectOp>(
  ops: readonly AuxOpNode[],
  isCommandAspectOp: (op: AuxOpNode | undefined) => op is T
): T | null {
  const headOps = ops.filter(isHeadOp);
  for (const command of headOps) {
    if (isCommandAspectOp(command) && commandAttributiveLikenessModal(ops, command) !== null) {
      return command;
    }
  }
  return null;
}



function isVolitionalPurposeToConnective(connective: ConnectiveOp): boolean {
  return connective.connective === "conditional" || connective.connective === "volitional_purpose";
}
