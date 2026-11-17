import {
  tracedCat,
  rebindChainTraceForProjection,
  tracedSeg,
  withStemPrefixApplied,
  type BaseResult,
  type ChainSourceTrace,
  type KoreanLemmaPredicateBase,
  type OperatorOp,
  type RenderContext,
  type RenderOutcome
} from "./renderers/base-model.js";
import { committedAttributiveProjectionPolicy, attributiveProjectionPolicy } from "./attributive-head-policy.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import type {
  AuxLayerNode,
  AuxOpNode,
  ConnectiveOp,
  NegationOp,
  RequestAspectOp,
  TailRoot,
  TenseOp
} from "./grammar.js";
import { resolveCandidateSetStem } from "./commit.js";
import {
  isRequestAspectOp,
  opsEndWithNegativeCopulaBridgeMarker,
  stemHasSahenSourcePredicate,
  stemHasSourceVerbalPredicate
} from "./inspect.js";
import { isPlainTeHoshiiAspect, isQuoteTerminalOp } from "./production-admission-helpers.js";
import { EXEMPLIFICATION_UTTERANCE_FINAL_CLOSURES, SEMANTIC_OPERATOR_OP_KINDS } from "./production-families.js";
import {
  normalizeProductionMatch,
  type ProductionRegistryMatch
} from "./production-registry.js";
import type { ProductionLoweringKey } from "./production-lowering-contract.js";
import {
  composeConditionalQuoteEllipsisTerminal,
  composeConditionalWishComplement,
  composeHostlessConditionalQuote,
  conditionalQuoteEllipsisMood
} from "./renderers/hostless-conditional-quote.js";
import { composeReasonCopulaConditional } from "./renderers/reason-copula-conditional.js";
import { composeSequenceAfterCopula } from "./renderers/sequence-after-copula.js";
import {
  composeNounCopulaReasonQuoteCarrier,
  composeWrappedCopulaReasonQuoteCarrier
} from "./renderers/reason-quote-carrier.js";
import {
  baseResultForNounScopeBridge,
  committedCarrierPostChainFrame,
  nounCopulaInitialBaseResult,
  renderNounCopulaAttributiveOperatorChain,
  tryRenderNounCopulaInitialBaseOperatorChain
} from "./renderers/noun-copula.js";
import {
  copulaCarrierBaseForInterOp,
  nounCopulaBase,
  nounLimitDakeCarrierBase,
  passiveStemOptionsForStem,
  simpleStemBaseResult
} from "./renderers/base-support.js";
import {
  benefactiveBaseFromInput,
  desireBaseResult,
  desiderativeBaseFromPredicateBase,
  predicateQuoteCarrierBase
} from "./renderers/predicate-bases.js";
import {
  attributiveBoundaryRequestsFutureProjection,
  composeBaseWithPredicateProjectionQuoteAttributive,
  composeCommittedBaseAttributive,
  composeBaseWithRequestComplement,
  composeCommittedTailTerminal,
  composeCommittedTailConnective,
  composeCommittedTailConnectiveWithNativeTrace,
  composeCommittedVolitionalCohortativeQuoteAttributive,
  composeCommittedVolitionalDeliberativeRetrospectiveQuotative,
  composeCommittedVolitionalIntentQuoteAttributive,
  composeCommittedVolitionalReformulationQuestion,
  composeCommittedVolitionalRetrospectiveQuotative,
  composeCommittedVolitionalRequestComplement,
  composeCommittedVolitionalWishComplement,
  projectBaseAttributive,
  renderConjectureQuotativeFromStem
} from "./renderers/connective-compose.js";
import { buildRequestPredicateBaseResult, buildRequestQuotedPropositionBase, reprojectCommandQuoteAttributiveForHeadPolicy, renderRequestAttributiveQuoteOnPredicateBase, renderRequestOnPredicateBase, renderRequestQuestionOnPredicateBase } from "./renderers/command-render.js";
import { attributiveCommandBaseOperatorChain, chainBases, chainStemTraceFields, collectOperatorChain, commandTerminalBaseOperatorChain, isRequestCommandAspectOp, operatorChainSlotForWrapOp, requestBaseCanUseDirectAuxiliaryImperative } from "./renderers/op-chain.js";
import {
  composeCommittedTailDiscursiveSfp,
  isTerminalRoleSfpNode,
  renderTerminalRoleSfpFrame,
  renderTerminalRoleSfpWithFrame,
  terminalRoleFrameFromAuxLayer
} from "./renderers/sfp-question.js";
import {
  renderVolitional,
  renderVolitionalQuestionQuotative,
  renderVolitionalQuestionQuotativeEllipsis
} from "./renderers/final-forms.js";

export type ProductionRootRenderer = (
  root: TailRoot,
  renderContext: RenderContext,
  options?: {
    readonly skipFamilyId?: string;
    readonly bypassRegistry?: boolean;
  }
) => RenderOutcome;

export type AttributiveTerminalRenderer = (
  layer: AuxLayerNode,
  renderContext: RenderContext
) => RenderOutcome;

export type CommittedTailTerminalRenderer = (
  layer: AuxLayerNode,
  sfp: TailRoot["sfp"],
  renderContext: RenderContext
) => RenderOutcome;

interface ProductionLoweringInput {
  readonly root: TailRoot;
  readonly normalizedRoot: TailRoot;
  readonly match: ProductionRegistryMatch;
  readonly renderContext: RenderContext;
  readonly renderNormalizedRoot: ProductionRootRenderer;
  readonly renderAttributiveTerminal: AttributiveTerminalRenderer;
  readonly renderCommittedTailTerminal: CommittedTailTerminalRenderer;
}

type ProductionLoweringHandler = (input: ProductionLoweringInput) => RenderOutcome;

function tailRootWithOps(root: TailRoot, ops: readonly AuxOpNode[]): TailRoot {
  if (root.tail.kind !== "auxLayer") return root;
  return { ...root, tail: { ...root.tail, ops } };
}

function carrierYoudaExemplificationConsumedRoot(root: TailRoot): TailRoot | null {
  if (root.tail.kind !== "auxLayer") return null;
  const carrierIndex = root.tail.ops.findIndex((op, index) =>
    index > 0 && op.kind === "predicateQuoteCarrier"
  );
  if (carrierIndex < 1) return null;
  const internalConnectives = root.tail.ops
    .slice(0, carrierIndex)
    .filter((op): op is ConnectiveOp => op.kind === "connective");
  const exemplification = internalConnectives[0];
  const afterCarrier = root.tail.ops[carrierIndex + 1];
  if (
    internalConnectives.length !== 1 ||
    exemplification?.connective !== "exemplification" ||
    root.tail.ops[carrierIndex - 1] !== exemplification ||
    root.tail.ops.length !== carrierIndex + 2 ||
    afterCarrier?.kind !== "modal" ||
    afterCarrier.modal !== "youda"
  ) {
    return null;
  }
  return tailRootWithOps(root, root.tail.ops.filter((op) => op !== exemplification));
}

function utteranceFinalTeExemplificationConsumedRoot(root: TailRoot): TailRoot | null {
  if (root.tail.kind !== "auxLayer" || root.sfp !== null) return null;
  const closure = root.utteranceClosure;
  if (
    closure === undefined ||
    !(EXEMPLIFICATION_UTTERANCE_FINAL_CLOSURES as readonly string[]).includes(closure)
  ) {
    return null;
  }
  const ops = root.tail.ops;
  const exemplification = ops.at(-1);
  const teHost = ops.at(-2);
  if (
    exemplification?.kind !== "connective" ||
    exemplification.connective !== "exemplification" ||
    teHost?.kind !== "connective" ||
    teHost.connective !== "te_form" ||
    ops.slice(0, -2).some((op) => op.kind === "connective")
  ) {
    return null;
  }
  return tailRootWithOps(root, ops.filter((op) => op !== teHost));
}

function legacyExemplificationFallbackConsumedRoot(root: TailRoot): TailRoot {
  if (root.tail.kind !== "auxLayer") return root;
  const consumedIndexes = new Set<number>();
  for (let index = 0; index < root.tail.ops.length; index += 1) {
    const op = root.tail.ops[index]!;
    if (op.kind === "connective" && op.connective === "exemplification") {
      consumedIndexes.add(index);
      continue;
    }
    const next = root.tail.ops[index + 1];
    if (
      op.kind === "connective" && op.connective === "quotative" &&
      next?.kind === "connective" && next.connective === "question_content" &&
      index + 1 === root.tail.ops.length - 1
    ) {
      consumedIndexes.add(index);
      consumedIndexes.add(index + 1);
    }
  }
  return consumedIndexes.size === 0
    ? root
    : tailRootWithOps(root, root.tail.ops.filter((_, index) => !consumedIndexes.has(index)));
}

function lowerExemplificationLegacy(input: ProductionLoweringInput): RenderOutcome {
  const renderThroughRegistry = (root: TailRoot): RenderOutcome => input.renderNormalizedRoot(
    root,
    input.renderContext,
    { skipFamilyId: input.match.familyId }
  );
  const carrierYouda = carrierYoudaExemplificationConsumedRoot(input.root);
  if (carrierYouda !== null) return renderThroughRegistry(carrierYouda);
  const utteranceFinalTe = utteranceFinalTeExemplificationConsumedRoot(input.root);
  if (utteranceFinalTe !== null) return renderThroughRegistry(utteranceFinalTe);
  const direct = renderThroughRegistry(input.root);
  if (direct.ok) return direct;
  const consumed = legacyExemplificationFallbackConsumedRoot(input.root);
  if (consumed === input.root) return direct;
  if (consumptionExposesPositionalTerminal(input.root, consumed)) return direct;
  const retried = renderThroughRegistry(consumed);
  return retried.ok ? retried : direct;
}

function consumptionExposesPositionalTerminal(original: TailRoot, consumed: TailRoot): boolean {
  if (original.tail.kind !== "auxLayer" || consumed.tail.kind !== "auxLayer") {
    return false;
  }
  return opsEndWithNegativeCopulaBridgeMarker(consumed.tail.ops) &&
    !opsEndWithNegativeCopulaBridgeMarker(original.tail.ops);
}

function lowerConditionalQuote(input: ProductionLoweringInput): RenderOutcome {
  if (input.root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "hostless conditional quote requires aux layer root" };
  }
  const quote = input.root.tail.ops.at(-1);
  if (!isQuoteTerminalOp(quote)) {
    return { ok: false, reason: "conditional quote match lost quote marker" };
  }
  return composeHostlessConditionalQuote(
    input.renderNormalizedRoot(input.normalizedRoot, input.renderContext),
    input.root.tail,
    quote
  );
}

function lowerConditionalQuoteEllipsisTerminal(input: ProductionLoweringInput): RenderOutcome {
  if (input.root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "conditional quote ellipsis terminal requires aux layer root" };
  }
  const layer = input.root.tail;
  const carrier = layer.ops.at(-1);
  const conditional = layer.ops.at(-2);
  if (
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    conditional?.kind !== "connective" ||
    conditional.connective !== "conditional"
  ) {
    return { ok: false, reason: "conditional quote ellipsis terminal lost registry shape" };
  }
  return composeConditionalQuoteEllipsisTerminal(
    input.renderNormalizedRoot(input.normalizedRoot, input.renderContext),
    layer,
    carrier,
    conditionalQuoteEllipsisMood(layer, conditional)
  );
}

function lowerConditionalWish(input: ProductionLoweringInput): RenderOutcome {
  if (input.root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "conditional wish complement requires aux layer root" };
  }
  const wish = input.root.tail.ops.at(-1);
  if (wish?.kind !== "connective" || wish.connective !== "wish_complement") {
    return { ok: false, reason: "conditional wish complement match lost wish marker" };
  }
  return composeConditionalWishComplement(
    input.renderNormalizedRoot(input.normalizedRoot, input.renderContext),
    input.root.tail,
    wish
  );
}

function sourceVerbalAdjectivalDesiderativeBaseResult(
  input: ProductionLoweringInput
): BaseResult {
  const { root, match } = input;
  if (root.tail.kind !== "auxLayer" || root.tail.stem.kind !== "adj") {
    return { ok: false, reason: "source-verbal adjectival desiderative requires a committed adjective stem" };
  }
  const desiderative = match.shape.slots.get("desiderative")?.[0];
  if (!isPlainTeHoshiiAspect(desiderative)) {
    return { ok: false, reason: "source-verbal adjectival desiderative lost its typed aspect payload" };
  }
  const stemBase = simpleStemBaseResult(root.tail.stem.lemma, root.tail.stem.irregular, false);
  if (!stemBase.ok || stemBase.base.final.kind !== "lemma") {
    return { ok: false, reason: "source-verbal adjectival desiderative requires a lemma base" };
  }
  const loweredBase = desiderativeBaseFromPredicateBase({
    ...stemBase.base,
    final: stemBase.base.final
  });
  if (loweredBase === null) {
    return { ok: false, reason: "source-verbal adjectival desiderative base lowering failed" };
  }
  return {
    ok: true,
    base: {
      ...loweredBase,
      prefix: `${root.tail.stem.koreanPrefix ?? ""}${loweredBase.prefix}`
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed"
  };
}

function lowerSourceVerbalAdjectivalDesiderative(
  input: ProductionLoweringInput
): RenderOutcome {
  const baseResult = sourceVerbalAdjectivalDesiderativeBaseResult(input);
  if (!baseResult.ok) return baseResult;
  const lowered = composeCommittedTailTerminal(
    baseResult,
    null,
    false,
    input.renderContext.formal,
    false,
    input.renderContext.lookups
  );
  return lowered.ok ? { ...lowered, stemPrefixApplied: true } : lowered;
}

function lowerSourceVerbalAdjectivalDesiderativeWishComplement(
  input: ProductionLoweringInput
): RenderOutcome {
  const wish = input.match.shape.slots.get("wish_complement")?.[0];
  if (wish?.kind !== "connective" || wish.connective !== "wish_complement") {
    return { ok: false, reason: "source-verbal adjectival desiderative wish production lost its typed complement" };
  }
  const baseResult = sourceVerbalAdjectivalDesiderativeBaseResult(input);
  if (!baseResult.ok) return baseResult;
  const lowered = composeCommittedTailConnective(
    baseResult,
    wish,
    false,
    false,
    null,
    input.renderContext.formal,
    input.renderContext.lookups
  );
  return lowered.ok ? { ...lowered, stemPrefixApplied: true } : lowered;
}

function copularTeHoshiiBaseResult(
  input: ProductionLoweringInput,
  mode: "noun_copula" | "noun_limit" | "na_adjective"
): BaseResult {
  const { root, match, renderContext } = input;
  if (root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "copular te-hoshii requires an auxiliary root" };
  }
  if (mode === "noun_limit") {
    const limit = match.shape.slots.get("limit")?.[0];
    if (
      root.tail.stem.kind !== "noun" ||
      limit?.kind !== "predicateProjectionCarrier" ||
      limit.carrier !== "limit_dake" ||
      limit.polite === true ||
      limit.past === true
    ) {
      return { ok: false, reason: "noun-limit te-hoshii lost its typed carrier or noun stem" };
    }
  } else {
    const copula = match.shape.slots.get("copula")?.[0];
    if (
      copula?.kind !== "copula" ||
      copula.variant !== "basic" ||
      copula.basicForm !== undefined ||
      copula.polarity !== "affirmative" ||
      copula.polite
    ) {
      return { ok: false, reason: "copular te-hoshii lost its typed copula" };
    }
  }
  const desiderative = match.shape.slots.get("desiderative")?.[0];
  if (!isPlainTeHoshiiAspect(desiderative)) {
    return { ok: false, reason: "copular te-hoshii lost its typed aspect" };
  }

  let inputBase: KoreanLemmaPredicateBase;
  if (mode === "na_adjective") {
    if (root.tail.stem.kind !== "adj") {
      return { ok: false, reason: "na-adjective te-hoshii requires a committed adjective stem" };
    }
    const stemBase = simpleStemBaseResult(
      root.tail.stem.lemma,
      root.tail.stem.irregular,
      false
    );
    if (stemBase.base.final.kind !== "lemma") {
      return { ok: false, reason: "na-adjective te-hoshii requires a lemma base" };
    }
    inputBase = {
      ...stemBase.base,
      final: stemBase.base.final
    };
  } else {
    if (root.tail.stem.kind !== "noun") {
      return { ok: false, reason: "noun copular te-hoshii requires a committed noun stem" };
    }
    const nounBase = mode === "noun_limit"
      ? nounLimitDakeCarrierBase(root.tail.stem.lemma)
      : nounCopulaBase(root.tail.stem.lemma, false);
    const copulaBase = copulaCarrierBaseForInterOp(
      nounBase,
      renderContext.formal
    );
    if (copulaBase === null || copulaBase.final.kind !== "lemma") {
      return { ok: false, reason: "noun copular te-hoshii failed to lower its initial base" };
    }
    inputBase = {
      ...copulaBase,
      final: copulaBase.final
    };
  }

  const desiderativeBase = desiderativeBaseFromPredicateBase(inputBase);
  if (desiderativeBase === null) {
    return { ok: false, reason: "copular te-hoshii failed to lower its desiderative base" };
  }
  return {
    ok: true,
    base: {
      ...desiderativeBase,
      prefix: `${root.tail.stem.koreanPrefix ?? ""}${desiderativeBase.prefix}`
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed"
  };
}

function lowerCopularTeHoshiiTerminal(
  input: ProductionLoweringInput,
  mode: "noun_copula" | "noun_limit" | "na_adjective",
  past = false
): RenderOutcome {
  const baseResult = copularTeHoshiiBaseResult(input, mode);
  if (!baseResult.ok) return baseResult;
  const lowered = composeCommittedTailTerminal(
    baseResult,
    null,
    past,
    input.renderContext.formal,
    false,
    input.renderContext.lookups
  );
  return lowered.ok ? { ...lowered, stemPrefixApplied: true } : lowered;
}

function lowerCopularTeHoshiiPastTerminal(input: ProductionLoweringInput): RenderOutcome {
  const past = input.match.shape.slots.get("past")?.[0];
  if (past?.kind !== "tense" || past.tense !== "past") {
    return { ok: false, reason: "copular te-hoshii past lost its typed tense" };
  }
  return lowerCopularTeHoshiiTerminal(input, "noun_copula", true);
}

function copularBenefactiveRequestHostBase(
  input: ProductionLoweringInput
): { readonly ok: false; readonly reason: string } | {
  readonly ok: true;
  readonly base: KoreanLemmaPredicateBase;
  readonly chainOnFinalSupported: true;
} {
  const { root, match, renderContext } = input;
  if (root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "copular benefactive/request requires an auxiliary root" };
  }
  if (root.tail.stem.kind !== "noun") {
    return { ok: false, reason: "copular benefactive/request requires a committed noun stem" };
  }
  const copula = match.shape.slots.get("copula")?.[0];
  if (
    copula?.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.basicForm !== undefined ||
    copula.polarity !== "affirmative" ||
    copula.polite
  ) {
    return { ok: false, reason: "copular benefactive/request lost its typed copula" };
  }
  const carrierBase = copulaCarrierBaseForInterOp(
    nounCopulaBase(root.tail.stem.lemma, false),
    renderContext.formal
  );
  if (carrierBase === null || carrierBase.final.kind !== "lemma") {
    return { ok: false, reason: "copular benefactive/request failed to lower its copula base" };
  }
  return {
    ok: true,
    base: {
      ...carrierBase,
      final: carrierBase.final,
      prefix: `${root.tail.stem.koreanPrefix ?? ""}${carrierBase.prefix}`
    },
    chainOnFinalSupported: true
  };
}

function lowerNounCopulaRequestTerminal(input: ProductionLoweringInput): RenderOutcome {
  const request = input.match.shape.slots.get("carrier")?.[0];
  if (request === undefined || !isRequestAspectOp(request) || request.aspect !== "te_kure_tanomu") {
    return { ok: false, reason: "copular request lost its typed request aspect" };
  }
  const baseResult = copularBenefactiveRequestHostBase(input);
  if (!baseResult.ok) return baseResult;
  const lowered = renderRequestOnPredicateBase(baseResult, request, input.renderContext.lookups, {
    formal: input.renderContext.formal
  });
  return lowered.ok ? { ...lowered, stemPrefixApplied: true } : lowered;
}

function lowerNounCopulaBenefactiveTerminal(input: ProductionLoweringInput): RenderOutcome {
  const benefactive = input.match.shape.slots.get("carrier")?.[0];
  if (
    benefactive?.kind !== "aspect" ||
    benefactive.aspect !== "te_moraeru"
  ) {
    return { ok: false, reason: "copular benefactive lost its typed benefactive aspect" };
  }
  const baseResult = copularBenefactiveRequestHostBase(input);
  if (!baseResult.ok) return baseResult;
  const benefactiveBaseResult = benefactiveBaseFromInput(benefactive, baseResult.base);
  if (!benefactiveBaseResult.ok) return benefactiveBaseResult;
  const lowered = composeCommittedTailTerminal(
    benefactiveBaseResult,
    null,
    false,
    input.renderContext.formal,
    false,
    input.renderContext.lookups
  );
  return lowered.ok ? { ...lowered, stemPrefixApplied: true } : lowered;
}

function lowerNounCopulaDesiderativeConnective(
  input: ProductionLoweringInput
): RenderOutcome {
  const connective = input.match.shape.slots.get("connective")?.[0];
  if (
    connective?.kind !== "connective" ||
    (
      connective.connective !== "adversative" &&
      connective.connective !== "quotative" &&
      connective.connective !== "wish_complement"
    )
  ) {
    return { ok: false, reason: "noun-copula te-hoshii lost its typed connective" };
  }
  const baseResult = copularTeHoshiiBaseResult(input, "noun_copula");
  if (!baseResult.ok) return baseResult;
  const lowered = composeCommittedTailConnective(
    baseResult,
    connective,
    false,
    false,
    null,
    input.renderContext.formal,
    input.renderContext.lookups
  );
  return lowered.ok ? { ...lowered, stemPrefixApplied: true } : lowered;
}

function lowerNounCopulaSingleHeadIdiom(
  input: ProductionLoweringInput,
  label: string
): RenderOutcome {
  const layer = input.root.tail;
  if (layer.kind !== "auxLayer") {
    return { ok: false, reason: `${label} requires an aux-layer root` };
  }
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return { ok: false, reason: `${label} lost its typed copula` };
  }
  if (layer.stem.kind === "adj") {
    const forbidden = input.match.shape.slots.get("forbidden")?.[0];
    const connective = input.match.shape.slots.get("connective")?.[0];
    if (
      forbidden?.kind !== "idiom" ||
      forbidden.idiom !== "forbidden" ||
      connective?.kind !== "connective" ||
      connective.connective !== "quotative"
    ) {
      return { ok: false, reason: `${label} lost its na-adjective operator chain` };
    }
    const chained = chainBases(
      [forbidden],
      layer.stem.lemma,
      layer.stem.irregular,
      false,
      {
        lookups: input.renderContext.lookups,
        stemPrefix: layer.stem.koreanPrefix,
        ...chainStemTraceFields(layer.stem),
        sourceStemIsVerb: false,
        sourceStemIsSahenPredicate: false,
        preModalNeg: null,
        stemPast: false,
        pastAfterChainIdx: new Map(),
        negAfterChainIdx: new Map(),
        formal: input.renderContext.formal,
        shortNegationPolicy: layer.stem.shortNegationPolicy,
        absorbedPassiveAux: false,
        passiveStemOptions: {}
      }
    );
    if (!chained.ok) return chained;
    return withStemPrefixApplied(composeCommittedTailConnectiveWithNativeTrace(
      chained,
      connective,
      chained.finalPast,
      false,
      chained.finalNeg,
      input.renderContext.formal,
      false,
      input.renderContext.lookups
    ));
  }
  if (layer.stem.kind !== "noun") {
    return { ok: false, reason: `${label} requires a committed noun or na-adjective stem` };
  }
  const nounLayer = { ...layer, stem: layer.stem };
  return tryRenderNounCopulaInitialBaseOperatorChain(
    nounLayer,
    copula,
    input.renderContext,
    { admitSingleHead: true }
  ) ?? { ok: false, reason: `${label} lost its operator chain` };
}

function lowerNounCopulaDesire(
  input: ProductionLoweringInput
): RenderOutcome {
  const rootLayer = input.root.tail;
  if (rootLayer.kind !== "auxLayer") {
    return { ok: false, reason: "noun-copula desire requires an aux-layer root" };
  }
  const committedStem = rootLayer.stem.kind === "candidateSet"
    ? resolveCandidateSetStem(rootLayer.stem)
    : rootLayer.stem;
  if (committedStem.kind !== "noun" && committedStem.kind !== "adj") {
    return { ok: false, reason: "noun-copula desire requires a committed noun or adjective stem" };
  }
  const layer = { ...rootLayer, stem: committedStem };
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return { ok: false, reason: "noun-copula desire lost its typed copula" };
  }
  const carrier = input.match.shape.slots.get("quote_carrier")?.[0];
  const connective = input.match.shape.slots.get("connective")?.[0];
  const projectedOp = carrier ?? connective;
  const baseLayer = {
    ...layer,
    ops: projectedOp === undefined
      ? layer.ops
      : layer.ops.filter((op) => op !== projectedOp),
    terminal: null
  };
  const desire = baseLayer.ops[1];
  if (desire?.kind !== "desire") {
    return { ok: false, reason: "noun-copula desire lost its typed desire op" };
  }
  const postOps = baseLayer.ops
    .slice(committedStem.kind === "adj" ? 2 : 1);
  const initialBaseResult: BaseResult = committedStem.kind === "noun"
    ? (() => {
      const initial = nounCopulaInitialBaseResult(
        { ...baseLayer, stem: committedStem },
        copula
      );
      const prefix = committedStem.koreanPrefix ?? "";
      if (prefix.length === 0) return initial;
      return {
        ...initial,
        base: {
          ...initial.base,
          prefix: `${prefix}${initial.base.prefix}`
        },
        chainSourceTrace: {
          ...initial.chainSourceTrace,
          prefixSegments: initial.chainSourceTrace.prefixSegments.map((segment, index) =>
            index === 0 ? { ...segment, text: `${prefix}${segment.text}` } : segment
          )
        }
      };
    })()
    : (() => {
      const desired = desireBaseResult(committedStem.lemma, committedStem.irregular);
      if (!desired.ok) return desired;
      const prefix = `${committedStem.koreanPrefix ?? ""}${desired.base.prefix}`;
      return {
        ...desired,
        base: { ...desired.base, prefix },
        chainSourceTrace: {
          prefixSegments: tracedSeg(
            prefix,
            [...committedStem.source.tokens, ...copula.source.tokens],
            "lexeme",
            "semantic"
          ),
          finalSourceTokens: desire.source.tokens,
          finalKind: "modal"
        }
      };
    })();
  const carrierFrame = committedCarrierPostChainFrame(
    initialBaseResult,
    postOps,
    copula.polite,
    connective?.kind === "connective" ? connective : null,
    input.renderContext
  );
  if ("ok" in carrierFrame) return carrierFrame;
  const frame = {
    baseResult: carrierFrame.baseResult,
    finalNeg: carrierFrame.finalNeg,
    past: carrierFrame.finalPast,
    polite: carrierFrame.terminalPolite
  };
  if (carrier !== undefined) {
    if (carrier.kind !== "predicateQuoteCarrier" || carrier.style !== "compact_toiu") {
      return { ok: false, reason: "noun-copula desire lost its typed quote carrier" };
    }
    if (!frame.baseResult.ok) return frame.baseResult;
    const quoted = composeBaseWithPredicateProjectionQuoteAttributive(
      frame.baseResult.base,
      frame.past,
      frame.polite,
      frame.finalNeg,
      input.renderContext.formal,
      input.renderContext.lookups,
      {}
    );
    if (!quoted.ok) return quoted;
    const chainTrace = frame.baseResult.chainSourceTrace;
    const projectedTrace = chainTrace === undefined
      ? undefined
      : rebindChainTraceForProjection(chainTrace, quoted.text);
    const projectedLast = projectedTrace?.at(-1);
    return {
      ...quoted,
      stemPrefixApplied: true,
      ...(projectedTrace === undefined || projectedLast === undefined
        ? {}
        : {
          traced: [
            ...projectedTrace.slice(0, -1),
            {
              ...projectedLast,
              sourceTokens: [...projectedLast.sourceTokens, ...carrier.source.tokens]
            }
          ]
        })
    };
  }
  if (input.root.sfp !== null) {
    if (!isTerminalRoleSfpNode(input.root.sfp)) {
      return {
        ok: false,
        reason: `noun-copula desire does not own SFP effect ${String(input.root.sfp.effect)}`
      };
    }
    const terminal = renderTerminalRoleSfpWithFrame(
      layer,
      input.root.sfp,
      input.renderContext,
      frame
    );
    if (terminal !== null) {
      return terminal;
    }
    return { ok: false, reason: "noun-copula desire lost its typed SFP lowering" };
  }
  if (connective !== undefined) {
    if (connective.kind !== "connective") {
      return { ok: false, reason: "noun-copula desire lost its typed connective" };
    }
    return withStemPrefixApplied(composeCommittedTailConnective(
      frame.baseResult,
      connective,
      frame.past,
      carrierFrame.connectivePolite,
      frame.finalNeg,
      input.renderContext.formal,
      input.renderContext.lookups
    ));
  }
  return withStemPrefixApplied(composeCommittedTailTerminal(
      frame.baseResult,
      frame.finalNeg,
      frame.past,
      input.renderContext.formal,
      frame.polite,
      input.renderContext.lookups
  ));
}

function lowerNounCopulaNegativeLikeness(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = input.root.tail;
  if (layer.kind !== "auxLayer") {
    return { ok: false, reason: "noun-copula negative likeness requires an aux-layer root" };
  }
  if (layer.stem.kind !== "noun") {
    return { ok: false, reason: "noun-copula negative likeness requires a committed noun stem" };
  }
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return { ok: false, reason: "noun-copula negative likeness lost its typed copula" };
  }
  return renderNounCopulaAttributiveOperatorChain(
    { ...layer, stem: layer.stem },
    copula,
    input.renderContext,
    { admitModalFirstHead: true }
  ) ?? { ok: false, reason: "noun-copula negative likeness lost its operator chain" };
}

function lowerNounCopulaReportedAttributive(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = input.root.tail;
  if (layer.kind !== "auxLayer" || layer.stem.kind !== "noun") {
    return { ok: false, reason: "noun-copula reported attributive requires a noun aux layer" };
  }
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return { ok: false, reason: "noun-copula reported attributive lost its typed copula" };
  }
  return renderNounCopulaAttributiveOperatorChain(
    { ...layer, stem: layer.stem },
    copula,
    input.renderContext,
    { admitModalFirstHead: true }
  ) ?? { ok: false, reason: "noun-copula reported attributive lost its operator chain" };
}

function lowerNounScopeBridgeAttributive(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = input.root.tail;
  if (layer.kind !== "auxLayer" || layer.stem.kind !== "noun") {
    return { ok: false, reason: "noun scope-bridge attributive requires a noun aux layer" };
  }
  const scopeBridge = input.match.shape.slots.get("scope_bridge")?.[0];
  const projectionWrapper = input.match.shape.slots.get("projection_wrapper")?.[0];
  if (scopeBridge?.kind !== "scopeBridge" ||
    (projectionWrapper?.kind !== "polite" && projectionWrapper?.kind !== "tense")) {
    return { ok: false, reason: "noun scope-bridge attributive lost its typed slots" };
  }
  const baseResult = baseResultForNounScopeBridge(
    scopeBridge,
    layer.stem.lemma,
    input.renderContext.formal
  );
  if (!baseResult.ok) return baseResult;
  const text = projectBaseAttributive(
    baseResult.base,
    projectionWrapper.kind === "tense",
    input.renderContext.formal,
    "lexical",
    "default",
    attributiveProjectionPolicy(layer)
  );
  return text === null
    ? { ok: false, reason: "noun scope-bridge attributive projection failed" }
    : { ok: true, text, polite: false };
}

const PREDICATE_CONFIRM_MARKER_SLOT_IDS = [
  "confirm_copula",
  "confirm_bridge",
  "confirm_negation",
  "confirm_polite"
] as const;

function lowerPredicateCopulaNegativeConfirm(
  input: ProductionLoweringInput
): RenderOutcome {
  if (input.root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "predicate negative confirm requires an auxiliary root" };
  }
  const markerOps = PREDICATE_CONFIRM_MARKER_SLOT_IDS.flatMap(
    (slotId) => input.match.shape.slots.get(slotId) ?? []
  );
  if (markerOps.length === 0) {
    return { ok: false, reason: "predicate negative confirm lost its typed confirmation marker" };
  }
  const baseLayer = {
    ...input.root.tail,
    stem: input.root.tail.stem.kind === "candidateSet"
      ? resolveCandidateSetStem(input.root.tail.stem)
      : input.root.tail.stem,
    ops: input.root.tail.ops.filter((op) => !markerOps.includes(op))
  };
  const frame = terminalRoleFrameFromAuxLayer(baseLayer, input.renderContext);
  if (frame === null) {
    return { ok: false, reason: "predicate negative confirm lost its terminal role frame" };
  }
  if ("ok" in frame) return frame;
  const politeMarker = markerOps.some((op) =>
    op.kind === "polite" || (op.kind === "copula" && op.polite === true)
  );
  return withStemPrefixApplied(composeCommittedTailDiscursiveSfp(
    frame.baseResult,
    frame.finalNeg,
    frame.past,
    input.renderContext.formal,
    politeMarker,
    "jan",
    input.renderContext.lookups
  ));
}

function lowerQuotativeInsistentTerminal(
  input: ProductionLoweringInput
): RenderOutcome {
  if (
    input.root.tail.kind !== "auxLayer" ||
    input.root.sfp?.effect !== "quotative_insistent"
  ) {
    return { ok: false, reason: "quotative-insistent production lost its typed terminal SFP" };
  }
  return renderTerminalRoleSfpFrame(
    input.root.tail,
    input.root.sfp,
    input.renderContext
  ) ?? { ok: false, reason: "quotative-insistent production lost its terminal role frame" };
}

function lowerVolitionalNegativeInvite(
  input: ProductionLoweringInput
): RenderOutcome {
  if (input.root.tail.kind !== "auxLayer" || input.root.tail.stem.kind !== "verb") {
    return { ok: false, reason: "volitional negative invite requires a committed verb stem" };
  }
  const connective = input.match.shape.slots.get("question_quotative")?.[0];
  if (connective !== undefined && connective.kind !== "connective") {
    return { ok: false, reason: "volitional negative invite lost its typed quotative" };
  }
  return connective === undefined
    ? renderVolitional({
      stemLemma: input.root.tail.stem.lemma,
      stemIrregular: input.root.tail.stem.irregular,
      isVerb: true,
      formal: input.renderContext.formal,
      isPolite: false,
      lookups: input.renderContext.lookups
    })
    : renderVolitionalQuestionQuotative({
      stemLemma: input.root.tail.stem.lemma,
      stemIrregular: input.root.tail.stem.irregular
    });
}

function lowerVolitionalQuestionQuotative(
  input: ProductionLoweringInput
): RenderOutcome {
  if (input.root.tail.kind !== "auxLayer" || input.root.tail.stem.kind !== "verb") {
    return { ok: false, reason: "volitional question quotative requires a committed verb stem" };
  }
  const connective = input.match.shape.slots.get("question_quotative")?.[0];
  if (connective?.kind !== "connective") {
    return { ok: false, reason: "volitional question quotative lost its typed connective" };
  }
  return renderVolitionalQuestionQuotativeEllipsis({
    stemLemma: input.root.tail.stem.lemma,
    stemIrregular: input.root.tail.stem.irregular
  });
}

function lowerPredicateQuoteTteNominalized(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = input.root.tail;
  const quotative = input.match.shape.slots.get("quotative")?.[0];
  if (
    layer.kind !== "auxLayer" ||
    (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") ||
    layer.terminal !== "nominalized" ||
    layer.terminalPayload?.kind !== "nominalized" ||
    input.root.sfp !== null ||
    quotative?.kind !== "connective" ||
    quotative.connective !== "quotative" ||
    quotative.allomorph !== "tte"
  ) {
    return {
      ok: false,
      reason: "predicate quote-tte nominalized lowering requires its exact typed root"
    };
  }
  const baseLayer = {
    kind: "auxLayer" as const,
    stem: layer.stem,
    ops: layer.ops.filter((op) => op !== quotative),
    terminal: null
  };
  const frame = terminalRoleFrameFromAuxLayer(baseLayer, input.renderContext);
  if (frame === null) {
    return {
      ok: false,
      reason: "predicate quote-tte nominalized lowering lost its terminal role frame"
    };
  }
  if ("ok" in frame) return frame;
  if (!frame.baseResult.ok) return frame.baseResult;
  const quoted = composeBaseWithPredicateProjectionQuoteAttributive(
    frame.baseResult.base,
    frame.past,
    frame.polite,
    frame.finalNeg,
    input.renderContext.formal,
    input.renderContext.lookups,
    {}
  );
  if (!quoted.ok) return quoted;
  const quotedSourceTokens = [
    ...layer.stem.source.tokens,
    ...layer.ops.flatMap((op) => op.source.tokens)
  ];
  return {
    ok: true,
    text: `${quoted.text} 것`,
    polite: false,
    stemPrefixApplied: true,
    traced: tracedCat(
      tracedSeg(quoted.text, quotedSourceTokens, "lexeme", "semantic"),
      tracedSeg(
        " 것",
        layer.terminalPayload.source.tokens,
        "aux",
        "semantic"
      )
    )
  };
}

function lowerAdverbialChangeAttributive(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = input.root.tail;
  if (
    layer.kind !== "auxLayer" ||
    layer.stem.kind !== "adverb" ||
    (layer.terminal !== "attributive" && layer.terminal !== "nominalized") ||
    input.root.sfp !== null
  ) {
    return { ok: false, reason: "adverbial-change attributive requires a committed adverb attributive root" };
  }
  const nominalizedPayload = layer.terminal === "nominalized" &&
    layer.terminalPayload?.kind === "nominalized"
    ? layer.terminalPayload
    : null;
  if (layer.terminal === "nominalized" && nominalizedPayload === null) {
    return { ok: false, reason: "adverbial-change nominalized terminal lost its 準体 payload" };
  }
  const opChain = collectOperatorChain(layer.ops);
  const tenseOps = layer.ops.filter((op): op is TenseOp => op.kind === "tense");
  if (opChain.length + tenseOps.length !== layer.ops.length) {
    return { ok: false, reason: "adverbial-change attributive received an undeclared wrapper" };
  }
  const pastAfterChainIdx = new Map<number, TenseOp>();
  for (const tenseOp of tenseOps) {
    if (tenseOp.tense !== "past") {
      return { ok: false, reason: "adverbial-change attributive only supports typed past wrappers" };
    }
    const slot = operatorChainSlotForWrapOp(tenseOp, layer, opChain);
    if (slot === null || pastAfterChainIdx.has(slot)) {
      return { ok: false, reason: "adverbial-change attributive lost its wrapper position" };
    }
    pastAfterChainIdx.set(slot, tenseOp);
  }
  const chained = chainBases(opChain, layer.stem.lemma, null, false, {
    lookups: input.renderContext.lookups,
    stemPrefix: layer.stem.koreanPrefix,
    ...chainStemTraceFields(layer.stem),
    sourceStemIsVerb: false,
    sourceStemIsSahenPredicate: false,
    adverbialStemLemma: layer.stem.lemma,
    preModalNeg: null,
    stemPast: false,
    pastAfterChainIdx,
    negAfterChainIdx: new Map(),
    formal: input.renderContext.formal,
    shortNegationPolicy: layer.stem.shortNegationPolicy,
    absorbedPassiveAux: false,
    passiveStemOptions: {}
  });
  if (!chained.ok) return chained;
  if (chained.finalNeg !== null) {
    return { ok: false, reason: "adverbial-change attributive received an undeclared final negation" };
  }
  const rendered = composeCommittedBaseAttributive(
    chained,
    chained.finalPast,
    input.renderContext.formal,
    chained.finalPastProjection ?? "lexical",
    "default",
    committedAttributiveProjectionPolicy(layer, attributiveBoundaryRequestsFutureProjection(layer))
  );
  if (!rendered.ok) return rendered;
  if (nominalizedPayload !== null) {
    return {
      ok: true,
      text: `${rendered.text} 것`,
      polite: false,
      stemPrefixApplied: true,
      ...(rendered.traced === undefined
        ? {}
        : {
          traced: tracedCat(
            rendered.traced,
            tracedSeg(" 것", nominalizedPayload.source.tokens, "aux", "semantic")
          )
        })
    };
  }
  return {
    ...rendered,
    stemPrefixApplied: true
  };
}

function lowerAccustomedPastAttributive(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = input.root.tail;
  if (
    layer.kind !== "auxLayer" ||
    layer.stem.kind !== "verb" ||
    layer.terminal !== "attributive" ||
    input.root.sfp !== null
  ) {
    return { ok: false, reason: "accustomed past attributive requires a committed verb attributive root" };
  }
  const accustomed = input.match.shape.slots.get("accustomed")?.[0];
  const past = input.match.shape.slots.get("past")?.[0];
  if (
    accustomed?.kind !== "postverbAuxiliary" ||
    accustomed.auxiliary.kind !== "accustomed" ||
    past?.kind !== "tense" ||
    past.tense !== "past"
  ) {
    return { ok: false, reason: "accustomed past attributive lost its typed operators" };
  }
  const pastSlot = operatorChainSlotForWrapOp(past, layer, [accustomed]);
  if (pastSlot === null) {
    return { ok: false, reason: "accustomed past attributive lost its wrapper position" };
  }
  const chained = chainBases(
    [accustomed],
    layer.stem.lemma,
    layer.stem.irregular,
    true,
    {
      lookups: input.renderContext.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      ...chainStemTraceFields(layer.stem),
      sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
      preModalNeg: null,
      stemPast: false,
      pastAfterChainIdx: new Map<number, TenseOp>([[pastSlot, past]]),
      negAfterChainIdx: new Map(),
      formal: input.renderContext.formal,
      shortNegationPolicy: layer.stem.shortNegationPolicy,
      absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
      ...(layer.stem.absorbedPassiveClass === undefined
        ? {}
        : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
      passiveStemOptions: passiveStemOptionsForStem(layer.stem)
    }
  );
  if (!chained.ok) return chained;
  return withStemPrefixApplied(composeCommittedBaseAttributive(
    chained,
    chained.finalPast,
    input.renderContext.formal,
    chained.finalPastProjection ?? "lexical",
    "default",
    committedAttributiveProjectionPolicy(layer, attributiveBoundaryRequestsFutureProjection(layer))
  ));
}

function lowerWrappedNegativeNecessitySumu(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = input.root.tail;
  if (
    layer.kind !== "auxLayer" ||
    (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") ||
    layer.terminal !== null ||
    input.root.sfp !== null
  ) {
    return {
      ok: false,
      reason: "wrapped negative-necessity sumu requires a committed predicate root"
    };
  }
  const wrapper = input.match.shape.slots.get("wrapper")?.[0];
  const negation = input.match.shape.slots.get("negation")?.[0];
  const idiom = input.match.shape.slots.get("negative_necessity_sumu")?.[0];
  const past = input.match.shape.slots.get("past")?.[0];
  const connective = input.match.shape.slots.get("connective")?.[0];
  if (
    (wrapper?.kind !== "postverbAuxiliary" && wrapper?.kind !== "voice") ||
    negation?.kind !== "negation" ||
    idiom?.kind !== "idiom" ||
    idiom.idiom !== "negative_necessity_sumu" ||
    past?.kind !== "tense" ||
    connective?.kind !== "connective"
  ) {
    return {
      ok: false,
      reason: "wrapped negative-necessity sumu lost its typed slots"
    };
  }
  const chained = chainBases(
    [wrapper, idiom],
    layer.stem.lemma,
    layer.stem.irregular,
    layer.stem.kind === "verb",
    {
      lookups: input.renderContext.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      ...chainStemTraceFields(layer.stem),
      sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
      preModalNeg: null,
      stemPast: false,
      pastAfterChainIdx: new Map<number, TenseOp>([[1, past]]),
      negAfterChainIdx: new Map<number, NegationOp>(),
      negBeforeChainIdx: new Map<number, NegationOp>([[1, negation]]),
      formal: input.renderContext.formal,
      shortNegationPolicy: layer.stem.shortNegationPolicy,
      absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
      ...(layer.stem.absorbedPassiveClass === undefined
        ? {}
        : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
      passiveStemOptions: passiveStemOptionsForStem(layer.stem)
    }
  );
  if (!chained.ok) return chained;
  return withStemPrefixApplied(composeCommittedTailConnectiveWithNativeTrace(
    chained,
    connective,
    chained.finalPast,
    false,
    chained.finalNeg,
    input.renderContext.formal,
    false,
    input.renderContext.lookups
  ));
}

type VolitionalComposer =
  | typeof composeCommittedVolitionalRetrospectiveQuotative
  | typeof composeCommittedVolitionalDeliberativeRetrospectiveQuotative
  | typeof composeCommittedVolitionalWishComplement
  | typeof composeCommittedVolitionalIntentQuoteAttributive
  | typeof composeCommittedVolitionalCohortativeQuoteAttributive
  | typeof composeCommittedVolitionalReformulationQuestion
  | typeof composeCommittedVolitionalRequestComplement;

function lowerVolitional(
  input: ProductionLoweringInput,
  slotId: string,
  composer: VolitionalComposer,
  label: string
): RenderOutcome {
  const { root, match, renderContext } = input;
  if (root.tail.kind !== "auxLayer" || root.tail.stem.kind !== "verb") {
    return { ok: false, reason: `${label} requires a verb stem` };
  }
  const connective = match.shape.slots.get(slotId)?.[0];
  if (connective?.kind !== "connective") {
    return { ok: false, reason: `${label} lost its connective` };
  }
  const baseResult = simpleStemBaseResult(root.tail.stem.lemma, root.tail.stem.irregular, true);
  const prefixedBaseResult = {
    ...baseResult,
    base: {
      ...baseResult.base,
      prefix: `${root.tail.stem.koreanPrefix ?? ""}${baseResult.base.prefix}`
    }
  };
  const rendered = composer(
    prefixedBaseResult,
    connective,
    false,
    false,
    null,
    renderContext.formal,
    renderContext.lookups
  );
  return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
}

function lowerConjecturalQuotative(input: ProductionLoweringInput): RenderOutcome {
  const { root, match, renderContext } = input;
  if (
    root.tail.kind !== "auxLayer" ||
    (root.tail.stem.kind !== "adj" && root.tail.stem.kind !== "verb")
  ) {
    return {
      ok: false,
      reason: "conjectural quotative production requires a source i-adjective predicate"
    };
  }
  const connective = match.shape.slots.get("quotative")?.[0];
  if (
    connective?.kind !== "connective" ||
    connective.connective !== "quotative" ||
    connective.allomorph !== "to"
  ) {
    return { ok: false, reason: "conjectural quotative production lost its typed quotative" };
  }
  return renderConjectureQuotativeFromStem({
    stemLemma: root.tail.stem.lemma,
    stemIrregular: root.tail.stem.irregular,
    isVerb: root.tail.stem.kind === "verb",
    preModalNeg: null,
    past: false,
    lookups: renderContext.lookups
  });
}

function lowerPropositionAssertabilityKotoDekiru(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = input.root.tail;
  if (
    layer.kind !== "auxLayer" ||
    (layer.stem.kind !== "adj" && layer.stem.kind !== "verb")
  ) {
    return {
      ok: false,
      reason: "proposition assertability production requires a committed i-adjective stem"
    };
  }
  const quoteCarrier = input.match.shape.slots.get("quote_carrier")?.[0];
  const potential = input.match.shape.slots.get("potential")?.[0];
  const negation = input.match.shape.slots.get("negation")?.[0];
  const adversative = input.match.shape.slots.get("adversative")?.[0];
  if (
    quoteCarrier?.kind !== "predicateQuoteCarrier" ||
    quoteCarrier.style !== "compact_toiu" ||
    quoteCarrier.allomorph !== "toiu"
  ) {
    return { ok: false, reason: "proposition assertability production lost its quote carrier" };
  }
  if (
    potential?.kind !== "idiom" ||
    potential.idiom !== "potential_koto_ga_dekiru" ||
    potential.particleKind !== "wa" ||
    potential.focusParticle !== null ||
    potential.polarity !== "affirmative" ||
    potential.polite ||
    potential.past
  ) {
    return { ok: false, reason: "proposition assertability production lost its potential payload" };
  }
  if (
    negation?.kind !== "negation" ||
    negation.chainDepth !== 1 ||
    negation.chainPast ||
    negation.sourceSplit !== undefined
  ) {
    return { ok: false, reason: "proposition assertability production lost its negation payload" };
  }
  if (adversative?.kind !== "connective" || adversative.connective !== "adversative") {
    return { ok: false, reason: "proposition assertability production lost its adversative" };
  }

  const stemBase = simpleStemBaseResult(
    layer.stem.lemma,
    layer.stem.irregular,
    layer.stem.kind === "verb"
  );
  const quoteBase = predicateQuoteCarrierBase({
    op: quoteCarrier,
    inputBase: {
      ...stemBase.base,
      prefix: `${layer.stem.koreanPrefix ?? ""}${stemBase.base.prefix}`
    },
    preStemNeg: null,
    stemPast: false,
    lookups: input.renderContext.lookups
  });
  if (!quoteBase.ok || quoteBase.base.policy?.kind !== "quoted_proposition") {
    return quoteBase.ok
      ? { ok: false, reason: "proposition assertability requires a quoted proposition base" }
      : { ok: false, reason: quoteBase.reason };
  }

  const potentialTokens = potential.source.tokens;
  if (potentialTokens.length < 2) {
    return { ok: false, reason: "proposition assertability potential source allocation is incomplete" };
  }
  const quoteText = quoteBase.base.prefix.trimEnd();
  const chainSourceTrace: ChainSourceTrace = {
    prefixSegments: [
      {
        text: `${quoteText}는 `,
        sourceTokens: [...layer.stem.source.tokens, ...quoteCarrier.source.tokens],
        kind: "modal",
        projectionConfidence: "semantic"
      },
      {
        text: "할 수 ",
        sourceTokens: potentialTokens.slice(0, -1),
        kind: "modal",
        projectionConfidence: "semantic"
      }
    ],
    finalSourceTokens: [...potentialTokens.slice(-1), ...negation.source.tokens],
    finalKind: "aux"
  };
  const assertabilityBase: BaseResult = {
    ok: true,
    base: {
      prefix: `${quoteText}는 할 수 `,
      final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false },
      policy: { kind: "potential", negativeLowering: "su_eopda" }
    },
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom",
    chainSourceTrace
  };
  return withStemPrefixApplied(composeCommittedTailConnectiveWithNativeTrace(
    assertabilityBase,
    adversative,
    false,
    false,
    negation,
    input.renderContext.formal,
    false,
    input.renderContext.lookups
  ));
}

function reinforcedPotentialChain(input: ProductionLoweringInput) {
  const layer = input.root.tail;
  if (layer.kind !== "auxLayer") {
    return { ok: false as const, reason: "reinforced potential production requires an auxiliary root" };
  }
  const reinforced = input.match.shape.slots.get("reinforced_potential")?.[0];
  if (
    reinforced?.kind !== "postverbAuxiliary" ||
    reinforced.auxiliary.kind !== "potential" ||
    reinforced.potentialComposition !== "reinforce_existing"
  ) {
    return { ok: false as const, reason: "reinforced potential production lost its composition payload" };
  }
  const stem = layer.stem.kind === "candidateSet"
    ? resolveCandidateSetStem(layer.stem)
    : layer.stem;
  if (stem.kind !== "verb") {
    return { ok: false as const, reason: "reinforced potential production requires a committed verb stem" };
  }
  const opChain = collectOperatorChain(layer.ops);
  if (opChain.length === 0 || opChain[0] !== reinforced) {
    return { ok: false as const, reason: "reinforced potential production lost its operator chain" };
  }
  return chainBases(
    opChain,
    stem.lemma,
    stem.irregular,
    true,
    {
      lookups: input.renderContext.lookups,
      stemPrefix: stem.koreanPrefix,
      ...chainStemTraceFields(stem),
      sourceStemIsVerb: stemHasSourceVerbalPredicate(stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(stem),
      preModalNeg: null,
      stemPast: false,
      pastAfterChainIdx: new Map(),
      negAfterChainIdx: new Map(),
      formal: input.renderContext.formal,
      shortNegationPolicy: stem.shortNegationPolicy,
      absorbedPassiveAux: stem.absorbedPassiveAux === true,
      ...(stem.absorbedPassiveClass === undefined
        ? {}
        : { absorbedPassiveClass: stem.absorbedPassiveClass }),
      passiveStemOptions: passiveStemOptionsForStem(stem)
    }
  );
}

function lowerReinforcedPotentialConnective(
  input: ProductionLoweringInput
): RenderOutcome {
  const connective = input.match.shape.slots.get("conditional")?.[0];
  if (connective?.kind !== "connective" || connective.connective !== "conditional") {
    return { ok: false, reason: "reinforced potential connective lost its typed conditional" };
  }
  const baseResult = reinforcedPotentialChain(input);
  if (!baseResult.ok) return baseResult;
  return withStemPrefixApplied(composeCommittedTailConnectiveWithNativeTrace(
    baseResult,
    connective,
    baseResult.finalPast,
    false,
    baseResult.finalNeg,
    input.renderContext.formal,
    false,
    input.renderContext.lookups
  ));
}

function lowerReinforcedPotentialAttributive(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = input.root.tail;
  if (layer.kind !== "auxLayer") {
    return { ok: false, reason: "reinforced potential attributive requires an auxiliary root" };
  }
  const baseResult = reinforcedPotentialChain(input);
  if (!baseResult.ok) return baseResult;
  return withStemPrefixApplied(composeCommittedBaseAttributive(
    baseResult,
    baseResult.finalPast,
    input.renderContext.formal,
    baseResult.finalPastProjection ?? "lexical",
    "default",
    committedAttributiveProjectionPolicy(
      layer,
      input.match.record.id === "reinforced_potential_attributive" &&
      attributiveBoundaryRequestsFutureProjection(layer)
    )
  ));
}

function lowerReinforcedPotentialNodaQuestion(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = input.root.tail;
  if (layer.kind !== "auxLayer" || input.root.sfp?.effect !== "ka") {
    return { ok: false, reason: "reinforced potential noda question lost its typed SFP root" };
  }
  const resolvedLayer = layer.stem.kind === "candidateSet"
    ? { ...layer, stem: resolveCandidateSetStem(layer.stem) }
    : layer;
  return renderTerminalRoleSfpFrame(
    resolvedLayer,
    input.root.sfp,
    input.renderContext
  ) ?? { ok: false, reason: "reinforced potential noda question lost its terminal role frame" };
}

function requestTerminalBaseResult(input: ProductionLoweringInput): BaseResult {
  const { root } = input;
  if (root.tail.kind !== "auxLayer" || root.tail.stem.kind !== "verb") {
    return { ok: false, reason: "request terminal production requires a committed verb stem" };
  }
  const baseResult = simpleStemBaseResult(
    root.tail.stem.lemma,
    root.tail.stem.irregular,
    true
  );
  return {
    ...baseResult,
    base: {
      ...baseResult.base,
      prefix: `${root.tail.stem.koreanPrefix ?? ""}${baseResult.base.prefix}`
    }
  };
}

function lowerRequestTerminalQuotative(input: ProductionLoweringInput): RenderOutcome {
  const request = input.match.shape.slots.get("request")?.[0];
  const quotative = input.match.shape.slots.get("quotative")?.[0];
  if (
    request?.kind !== "aspect" ||
    (request.aspect !== "te_kudasai" && request.aspect !== "te_kure_tanomu") ||
    quotative?.kind !== "connective" ||
    quotative.connective !== "quotative" ||
    quotative.quotativeMood !== "imperative"
  ) {
    return { ok: false, reason: "request terminal quotative lost its typed request boundary" };
  }
  const baseResult = requestTerminalBaseResult(input);
  if (!baseResult.ok) return baseResult;
  const rendered = composeBaseWithRequestComplement(
    baseResult.base,
    false,
    null,
    {},
    quotative
  );
  return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
}

function lowerRequestTerminalQuestion(input: ProductionLoweringInput): RenderOutcome {
  const request = input.match.shape.slots.get("request")?.[0];
  if (
    request?.kind !== "aspect" ||
    (request.aspect !== "te_kudasai" && request.aspect !== "te_kure_tanomu")
  ) {
    return { ok: false, reason: "request terminal question lost its typed request op" };
  }
  const rendered = renderRequestQuestionOnPredicateBase(
    requestTerminalBaseResult(input),
    request,
    input.renderContext.lookups,
    { formal: input.renderContext.formal }
  );
  return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
}

type ComposedRequestBase = {
  readonly ok: true;
  readonly request: RequestAspectOp;
  readonly baseResult: BaseResult;
  readonly baseOps: readonly OperatorOp[];
  readonly commandSourceTokens: readonly RuntimeHaruToken[];
  readonly polite: boolean;
} | { readonly ok: false; readonly reason: string };

function composedRequestBase(input: ProductionLoweringInput): ComposedRequestBase {
  if (input.root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "composed request production requires an auxiliary root" };
  }
  const request = input.match.shape.slots.get("request")?.[0];
  if (request === undefined || !isRequestAspectOp(request)) {
    return { ok: false, reason: "composed request production lost its typed request op" };
  }
  const projectionOps = new Set<AuxOpNode>([
    ...(input.match.shape.slots.get("request") ?? []),
    ...(input.match.shape.slots.get("request_complement") ?? []),
    ...(input.match.shape.slots.get("request_projection") ?? []),
    ...(input.match.shape.slots.get("reported_request") ?? []),
    ...(input.match.shape.slots.get("quote_carrier") ?? [])
  ]);
  const baseLayer = {
    ...input.root.tail,
    ops: input.root.tail.ops.filter((op) => !projectionOps.has(op)),
    terminal: projectionOps.size > 1 ? null : input.root.tail.terminal
  };
  const frame = terminalRoleFrameFromAuxLayer(baseLayer, input.renderContext);
  if (frame === null) {
    return { ok: false, reason: "composed request base is outside the terminal role frame" };
  }
  if ("ok" in frame) return frame;
  if (frame.finalNeg !== null || frame.past) {
    return { ok: false, reason: "composed request base retains a pre-request tense/negation wrapper" };
  }
  const baseOps = (input.match.shape.slots.get("quote_carrier")?.length ?? 0) > 0
    ? attributiveCommandBaseOperatorChain(input.root.tail.ops, request)
    : commandTerminalBaseOperatorChain(input.root.tail.ops, isRequestCommandAspectOp);
  if (baseOps.length === 0) {
    return { ok: false, reason: "composed request production lost its command-base operators" };
  }
  return {
    ok: true,
    request,
    baseResult: frame.baseResult,
    baseOps,
    commandSourceTokens: [
      ...input.root.tail.stem.source.tokens,
      ...baseOps.flatMap((op) => op.source.tokens)
    ],
    polite: frame.polite || request.aspect === "te_kudasai"
  };
}

function requestProjectionBase(input: ProductionLoweringInput): ComposedRequestBase {
  if ((input.match.shape.slots.get("command_base")?.length ?? 0) > 0) {
    return composedRequestBase(input);
  }
  const request = input.match.shape.slots.get("request")?.[0];
  if (request === undefined || !isRequestAspectOp(request)) {
    return { ok: false, reason: "request projection lost its typed request op" };
  }
  const baseResult = requestTerminalBaseResult(input);
  if (!baseResult.ok) return { ok: false, reason: baseResult.reason };
  return {
    ok: true,
    request,
    baseResult,
    baseOps: [],
    commandSourceTokens: input.root.tail.kind === "auxLayer"
      ? input.root.tail.stem.source.tokens
      : [],
    polite: request.aspect === "te_kudasai"
  };
}

function lowerComposedRequestTerminal(input: ProductionLoweringInput): RenderOutcome {
  const composed = composedRequestBase(input);
  if (!composed.ok) return composed;
  const rendered = renderRequestOnPredicateBase(
    composed.baseResult,
    composed.request,
    input.renderContext.lookups,
    {
      directAuxiliaryImperative: requestBaseCanUseDirectAuxiliaryImperative(composed.baseOps),
      formal: input.renderContext.formal
    }
  );
  return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
}

function lowerComposedRequestDiscursiveSfp(input: ProductionLoweringInput): RenderOutcome {
  const effect = input.root.sfp?.effect;
  if (effect !== "ne" && effect !== "na_excl") {
    return { ok: false, reason: "composed request discursive production lost its typed SFP" };
  }
  const composed = composedRequestBase(input);
  if (!composed.ok) return composed;
  const requestBase = buildRequestPredicateBaseResult(
    composed.baseResult,
    composed.request,
    {
      directAuxiliaryImperative: requestBaseCanUseDirectAuxiliaryImperative(composed.baseOps),
      lookups: input.renderContext.lookups
    }
  );
  const rendered = composeCommittedTailDiscursiveSfp(
    requestBase,
    null,
    false,
    input.renderContext.formal,
    composed.polite,
    effect,
    input.renderContext.lookups,
    true
  );
  return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
}

function lowerComposedRequestComplement(input: ProductionLoweringInput): RenderOutcome {
  const connective = input.match.shape.slots.get("request_complement")?.[0];
  if (connective?.kind !== "connective" || connective.connective !== "request_complement") {
    return { ok: false, reason: "composed request complement lost its typed connective" };
  }
  const composed = composedRequestBase(input);
  if (!composed.ok) return composed;
  if (!composed.baseResult.ok) return composed.baseResult;
  const rendered = composeBaseWithRequestComplement(
    composed.baseResult.base,
    false,
    null,
    {},
    connective
  );
  return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
}

function lowerRequestProjectionConnective(input: ProductionLoweringInput): RenderOutcome {
  const connective = input.match.shape.slots.get("request_projection")?.[0];
  if (
    connective?.kind !== "connective" ||
    (
      connective.connective !== "wish_complement" &&
      connective.connective !== "request_complement" &&
      connective.connective !== "quoted_concessive"
    )
  ) {
    return { ok: false, reason: "request projection lost its typed connective" };
  }
  const projection = requestProjectionBase(input);
  if (!projection.ok) return projection;
  if (!projection.baseResult.ok) return projection.baseResult;

  const connectiveBase = connective.connective === "quoted_concessive"
    ? buildRequestQuotedPropositionBase(projection.baseResult.base, "request")
    : buildRequestPredicateBaseResult(
      projection.baseResult,
      projection.request,
      {
        directAuxiliaryImperative: requestBaseCanUseDirectAuxiliaryImperative(projection.baseOps),
        lookups: input.renderContext.lookups
      }
    );
  const rendered = connective.connective === "request_complement"
    ? composeBaseWithRequestComplement(
      projection.baseResult.base,
      false,
      null,
      {},
      connective
    )
    : composeCommittedTailConnective(
      connectiveBase,
      connective,
      false,
      false,
      null,
      input.renderContext.formal,
      input.renderContext.lookups
    );
  return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
}

function lowerRequestProjectionQuoteAttributive(input: ProductionLoweringInput): RenderOutcome {
  const carrier = input.match.shape.slots.get("quote_carrier")?.[0];
  if (
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu"
  ) {
    return { ok: false, reason: "request quote projection lost its compact typed carrier" };
  }
  const projection = requestProjectionBase(input);
  if (!projection.ok) return projection;
  if (!projection.baseResult.ok) return projection.baseResult;
  const layer = input.root.tail;
  const fused = renderRequestAttributiveQuoteOnPredicateBase(
    projection.baseResult,
    projection.request,
    carrier,
    { commandSourceTokens: projection.commandSourceTokens }
  );
  const rendered = (layer.kind !== "auxLayer"
    ? null
    : reprojectCommandQuoteAttributiveForHeadPolicy(
      fused,
      projection.baseResult.base,
      "request",
      attributiveProjectionPolicy(layer),
      input.renderContext.formal
    )) ?? fused;
  return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
}

function lowerRequestReportedTerminal(input: ProductionLoweringInput): RenderOutcome {
  const reportedRequest = input.match.shape.slots.get("reported_request")?.[0];
  if (
    reportedRequest?.kind !== "connective" ||
    reportedRequest.connective !== "quotative" ||
    reportedRequest.allomorph !== "other" ||
    reportedRequest.quotativeMood !== "imperative" ||
    reportedRequest.quotativeClosure !== "reported_request"
  ) {
    return { ok: false, reason: "reported request terminal lost its typed quotative closure" };
  }
  const projection = requestProjectionBase(input);
  if (!projection.ok) return projection;
  if (!projection.baseResult.ok) return projection.baseResult;
  const quotedBase = buildRequestQuotedPropositionBase(
    projection.baseResult.base,
    "request",
    { terminalClosure: "reported_request" }
  );
  if (!quotedBase.ok) return quotedBase;
  return withStemPrefixApplied(composeCommittedTailTerminal(
    quotedBase,
    null,
    false,
    input.renderContext.formal,
    false,
    input.renderContext.lookups
  ));
}

function lowerRequestNominalizedTerminal(input: ProductionLoweringInput): RenderOutcome {
  const noda = input.match.shape.slots.get("noda")?.[0];
  if (noda?.kind !== "modal" || noda.modal !== "noda") {
    return { ok: false, reason: "request nominalized terminal lost its typed noda modal" };
  }
  const projection = requestProjectionBase(input);
  if (!projection.ok) return projection;
  if (!projection.baseResult.ok) return projection.baseResult;
  const quotedBase = buildRequestQuotedPropositionBase(projection.baseResult.base, "request");
  const frame = committedCarrierPostChainFrame(
    quotedBase,
    [noda],
    false,
    null,
    input.renderContext
  );
  if ("ok" in frame) return frame;
  return withStemPrefixApplied(composeCommittedTailTerminal(
    frame.baseResult,
    frame.finalNeg,
    frame.finalPast,
    input.renderContext.formal,
    frame.terminalPolite,
    input.renderContext.lookups
  ));
}

function lowerRequestLikenessFragment(input: ProductionLoweringInput): RenderOutcome {
  const likeness = input.match.shape.slots.get("likeness")?.[0];
  if (likeness?.kind !== "modal" || likeness.modal !== "youda") {
    return { ok: false, reason: "request likeness fragment lost its typed youda modal" };
  }
  const projection = requestProjectionBase(input);
  if (!projection.ok) return projection;
  if (!projection.baseResult.ok) return projection.baseResult;
  const quotedBase = buildRequestQuotedPropositionBase(projection.baseResult.base, "request");
  const frame = committedCarrierPostChainFrame(
    quotedBase,
    [likeness],
    false,
    null,
    input.renderContext
  );
  if ("ok" in frame) return frame;
  if (frame.finalNeg !== null) {
    return { ok: false, reason: "request likeness fragment final negation not supported" };
  }
  const rendered = composeCommittedBaseAttributive(
    frame.baseResult,
    frame.finalPast,
    input.renderContext.formal
  );
  return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
}

function lowerRequestCarrierChainConnective(input: ProductionLoweringInput): RenderOutcome {
  const connective = input.match.shape.slots.get("chain_connective")?.[0];
  if (connective?.kind !== "connective") {
    return { ok: false, reason: "request carrier chain lost its typed connective" };
  }
  const chainOps = input.match.record.shape.ops
    .filter((slot) => slot.id !== "request" && slot.id !== "chain_connective")
    .flatMap((slot) => input.match.shape.slots.get(slot.id) ?? []);
  if (chainOps.length === 0) {
    return { ok: false, reason: "request carrier chain lost its typed carrier/modal ops" };
  }
  const projection = requestProjectionBase(input);
  if (!projection.ok) return projection;
  if (!projection.baseResult.ok) return projection.baseResult;
  const quotedBase = buildRequestQuotedPropositionBase(projection.baseResult.base, "request");
  const frame = committedCarrierPostChainFrame(
    quotedBase,
    chainOps,
    false,
    connective,
    input.renderContext
  );
  if ("ok" in frame) return frame;
  const rendered = composeCommittedTailConnective(
    frame.baseResult,
    connective,
    frame.finalPast,
    frame.connectivePolite,
    frame.finalNeg,
    input.renderContext.formal,
    input.renderContext.lookups
  );
  return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
}

function lowerBenefactiveNodaTerminal(input: ProductionLoweringInput): RenderOutcome {
  if (input.root.tail.kind !== "auxLayer" || input.root.sfp === null) {
    return { ok: false, reason: "benefactive+noda terminal lost its typed SFP root" };
  }
  if (input.root.sfp.effect === "ka") {
    return renderTerminalRoleSfpFrame(
      input.root.tail,
      input.root.sfp,
      input.renderContext
    ) ?? { ok: false, reason: "benefactive+noda question lost its terminal role frame" };
  }
  if (input.root.sfp.effect !== null) {
    return { ok: false, reason: "benefactive+noda terminal received an undeclared SFP effect" };
  }
  const frame = terminalRoleFrameFromAuxLayer(input.root.tail, input.renderContext);
  if (frame === null) {
    return { ok: false, reason: "benefactive+noda statement lost its terminal role frame" };
  }
  if ("ok" in frame) {
    return frame;
  }
  return withStemPrefixApplied(composeCommittedTailTerminal(
    frame.baseResult,
    frame.finalNeg,
    frame.past,
    input.renderContext.formal,
    frame.polite,
    input.renderContext.lookups
  ));
}

function committedAttributiveTerminalLayer(input: ProductionLoweringInput): AuxLayerNode | null {
  const layer = input.normalizedRoot.tail;
  return layer.kind === "auxLayer" && layer.terminal === "attributive" ? layer : null;
}

function lowerAttributiveTerminalLayer(
  input: ProductionLoweringInput,
  layer: AuxLayerNode
): RenderOutcome {
  return input.normalizedRoot.sfp === null && input.normalizedRoot.quoteBinding === "unbound"
    ? input.renderAttributiveTerminal(layer, input.renderContext)
    : input.renderCommittedTailTerminal(layer, input.normalizedRoot.sfp, input.renderContext);
}

function lowerPlainPredicateAttributive(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (
    layer === null ||
    (layer.stem.kind !== "verb" &&
      layer.stem.kind !== "adj" &&
      layer.stem.kind !== "noun" &&
      layer.stem.kind !== "candidateSet")
  ) {
    return { ok: false, reason: "plain predicate attributive requires a committed verb/adj/noun attributive root" };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function lowerNounCopulaBareAttributive(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (layer === null || layer.ops[0]?.kind !== "copula") {
    return { ok: false, reason: "noun copula bare attributive requires a leading copula on an attributive root" };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function lowerNominalFocusPrefixAttributive(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (layer === null || layer.ops.length !== 0) {
    return { ok: false, reason: "nominal focus prefix attributive requires an operator-free attributive root" };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function lowerKeijoujiBareAttributive(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (layer === null || layer.ops.length !== 0 || layer.stem.kind === "adverb") {
    return {
      ok: false,
      reason: "keijouji bare attributive requires an operator-free committed non-adverbial attributive root"
    };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function endsWithQuoteCarrier(layer: AuxLayerNode): boolean {
  return layer.ops[layer.ops.length - 1]?.kind === "predicateQuoteCarrier";
}

function hasSemanticOperatorOp(ops: readonly AuxOpNode[]): boolean {
  return ops.some((op) => (SEMANTIC_OPERATOR_OP_KINDS as readonly string[]).includes(op.kind));
}

function lowerPlainPredicateQuoteCarrierAttributive(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (layer === null || !endsWithQuoteCarrier(layer)) {
    return {
      ok: false,
      reason: "plain predicate quote carrier attributive requires a chain-final quote carrier"
    };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function lowerAdversativeQuoteCarrierAttributive(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (
    layer === null ||
    !endsWithQuoteCarrier(layer) ||
    layer.ops[layer.ops.length - 2]?.kind !== "connective"
  ) {
    return {
      ok: false,
      reason: "adversative quote carrier attributive requires a connective before a chain-final quote carrier"
    };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function lowerNounCopulaQuoteCarrierAttributive(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (layer === null || layer.ops[0]?.kind !== "copula" || !endsWithQuoteCarrier(layer)) {
    return {
      ok: false,
      reason: "noun copula quote carrier attributive requires a leading copula and a chain-final quote carrier"
    };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function lowerPlainPredicateSemanticOperatorAttributive(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (layer === null || !hasSemanticOperatorOp(layer.ops)) {
    return {
      ok: false,
      reason: "plain predicate semantic operator attributive requires a 意味 op in the chain"
    };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function lowerPlainPredicateSemanticOperatorQuoteCarrierAttributive(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (
    layer === null ||
    !endsWithQuoteCarrier(layer) ||
    !hasSemanticOperatorOp(layer.ops.slice(0, -1))
  ) {
    return {
      ok: false,
      reason:
        "plain predicate semantic operator quote carrier attributive requires a 意味 op before the chain-final carrier"
    };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function lowerNounCopulaSemanticOperatorAttributive(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (
    layer === null ||
    layer.ops[0]?.kind !== "copula" ||
    !hasSemanticOperatorOp(layer.ops.slice(1))
  ) {
    return {
      ok: false,
      reason: "noun copula semantic operator attributive requires a leading copula and a 意味 op"
    };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function lowerNounCopulaSemanticOperatorQuoteCarrierAttributive(
  input: ProductionLoweringInput
): RenderOutcome {
  const layer = committedAttributiveTerminalLayer(input);
  if (
    layer === null ||
    layer.ops[0]?.kind !== "copula" ||
    !endsWithQuoteCarrier(layer) ||
    !hasSemanticOperatorOp(layer.ops.slice(1, -1))
  ) {
    return {
      ok: false,
      reason:
        "noun copula semantic operator quote carrier attributive requires a leading copula and a 意味 op before the chain-final carrier"
    };
  }
  return lowerAttributiveTerminalLayer(input, layer);
}

function committedTailTerminalRoot(
  input: ProductionLoweringInput
): AuxLayerNode | null {
  const layer = input.normalizedRoot.tail;
  return layer.kind === "auxLayer" ? layer : null;
}

function lowerClauseConnective(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedTailTerminalRoot(input);
  if (
    layer === null ||
    layer.terminal !== null ||
    layer.ops[layer.ops.length - 1]?.kind !== "connective"
  ) {
    return {
      ok: false,
      reason: "clause connective production requires a chain-final connective on a non-terminal root"
    };
  }
  return input.renderCommittedTailTerminal(layer, input.normalizedRoot.sfp, input.renderContext);
}

function lowerAdversativeQuoteCarrierTerminal(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedTailTerminalRoot(input);
  if (
    layer === null ||
    layer.terminal !== null ||
    !endsWithQuoteCarrier(layer) ||
    layer.ops[layer.ops.length - 2]?.kind !== "connective"
  ) {
    return {
      ok: false,
      reason: "adversative quote carrier terminal requires a connective before a chain-final quote carrier"
    };
  }
  return input.renderCommittedTailTerminal(layer, input.normalizedRoot.sfp, input.renderContext);
}

function lowerRenyouChuushi(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedTailTerminalRoot(input);
  if (layer === null || layer.terminal !== "renyou_chuushi") {
    return { ok: false, reason: "連用中止 production requires a 連用中止 terminal root" };
  }
  return input.renderCommittedTailTerminal(layer, input.normalizedRoot.sfp, input.renderContext);
}

function lowerTerminalChain(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedTailTerminalRoot(input);
  if (
    layer === null ||
    layer.terminal !== null ||
    layer.ops.some((op) => op.kind === "connective")
  ) {
    return {
      ok: false,
      reason: "terminal chain production requires a connective-free chain on a null-terminal root"
    };
  }
  return input.renderCommittedTailTerminal(layer, input.normalizedRoot.sfp, input.renderContext);
}

function lowerNominalizedTerminalChain(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedTailTerminalRoot(input);
  if (
    layer === null ||
    layer.terminal !== "nominalized" ||
    layer.ops.some((op) => op.kind === "connective")
  ) {
    return {
      ok: false,
      reason: "nominalized production requires a connective-free chain on a nominalized-terminal root"
    };
  }
  return input.renderCommittedTailTerminal(layer, input.normalizedRoot.sfp, input.renderContext);
}

function lowerAttributiveOperatorChain(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedTailTerminalRoot(input);
  if (
    layer === null ||
    layer.terminal !== "attributive" ||
    layer.ops.some((op) => op.kind === "connective")
  ) {
    return {
      ok: false,
      reason:
        "attributive operator chain production requires a connective-free chain on an attributive-terminal root"
    };
  }
  return input.renderCommittedTailTerminal(layer, input.normalizedRoot.sfp, input.renderContext);
}

function lowerImperativeTerminal(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedTailTerminalRoot(input);
  if (
    layer === null ||
    layer.terminal !== "imperative" ||
    layer.ops.some((op) => op.kind === "connective")
  ) {
    return {
      ok: false,
      reason: "imperative production requires a connective-free chain on an imperative-terminal root"
    };
  }
  return input.renderCommittedTailTerminal(layer, input.normalizedRoot.sfp, input.renderContext);
}

function lowerAdverbialModifierTerminal(input: ProductionLoweringInput): RenderOutcome {
  const layer = committedTailTerminalRoot(input);
  if (
    layer === null ||
    layer.terminal !== "adverbial_modifier" ||
    layer.ops.some((op) => op.kind === "connective")
  ) {
    return {
      ok: false,
      reason: "adverbial modifier production requires a connective-free chain on an adverbial-modifier root"
    };
  }
  return input.renderCommittedTailTerminal(layer, input.normalizedRoot.sfp, input.renderContext);
}

export const PRODUCTION_LOWERING_BINDINGS = {
  normalized_root: (input) => input.renderNormalizedRoot(
    input.normalizedRoot,
    input.renderContext,
    { skipFamilyId: input.match.familyId }
  ),
  carrier_context_legacy: (input) => input.renderNormalizedRoot(
    input.root,
    input.renderContext,
    { bypassRegistry: true }
  ),
  exemplification_legacy_render: lowerExemplificationLegacy,
  conditional_quote_terminal: lowerConditionalQuote,
  conditional_wish_complement: lowerConditionalWish,
  conditional_quote_ellipsis_terminal: lowerConditionalQuoteEllipsisTerminal,
  noun_copula_reason_quote_carrier: (input) =>
    composeNounCopulaReasonQuoteCarrier(input.normalizedRoot, input.renderContext),
  wrapped_copula_reason_quote_carrier: (input) =>
    composeWrappedCopulaReasonQuoteCarrier(input.normalizedRoot, input.renderContext),
  reason_copula_conditional: (input) => {
    const { outgoingBoundary: _ownedBoundary, ...normalizedRenderContext } = input.renderContext;
    return composeReasonCopulaConditional(
      input.normalizedRoot,
      normalizedRenderContext,
      input.renderNormalizedRoot
    );
  },
  sequence_after_copula_terminal: (input) => {
    const { outgoingBoundary: _ownedBoundary, ...normalizedRenderContext } = input.renderContext;
    return composeSequenceAfterCopula(
      input.normalizedRoot,
      normalizedRenderContext,
      (root, renderContext) => input.renderNormalizedRoot(
        root,
        renderContext,
        { skipFamilyId: input.match.familyId }
      )
    );
  },
  noun_copula_desiderative_terminal: (input) =>
    lowerCopularTeHoshiiTerminal(input, "noun_copula"),
  noun_copula_desiderative_past_terminal: lowerCopularTeHoshiiPastTerminal,
  noun_copula_request_terminal: lowerNounCopulaRequestTerminal,
  noun_copula_benefactive_terminal: lowerNounCopulaBenefactiveTerminal,
  noun_copula_desiderative_connective: lowerNounCopulaDesiderativeConnective,
  noun_copula_desire: lowerNounCopulaDesire,
  noun_copula_permission: (input) =>
    lowerNounCopulaSingleHeadIdiom(input, "noun-copula permission"),
  noun_copula_forbidden: (input) =>
    lowerNounCopulaSingleHeadIdiom(input, "noun-copula forbidden"),
  noun_copula_negative_likeness: lowerNounCopulaNegativeLikeness,
  noun_copula_reported_attributive: lowerNounCopulaReportedAttributive,
  noun_scope_bridge_attributive: lowerNounScopeBridgeAttributive,
  predicate_copula_negative_confirm: lowerPredicateCopulaNegativeConfirm,
  volitional_negative_invite: lowerVolitionalNegativeInvite,
  volitional_question_quotative: lowerVolitionalQuestionQuotative,
  volitional_reformulation_question: (input) => lowerVolitional(
    input,
    "reformulation",
    composeCommittedVolitionalReformulationQuestion,
    "volitional reformulation question production"
  ),
  predicate_quote_tte_nominalized: lowerPredicateQuoteTteNominalized,
  accustomed_past_attributive: lowerAccustomedPastAttributive,
  adverbial_change_attributive: lowerAdverbialChangeAttributive,
  plain_predicate_attributive_render: lowerPlainPredicateAttributive,
  noun_copula_bare_attributive_render: lowerNounCopulaBareAttributive,
  nominal_focus_prefix_attributive_render: lowerNominalFocusPrefixAttributive,
  keijouji_bare_attributive_render: lowerKeijoujiBareAttributive,
  plain_predicate_quote_carrier_attributive_render:
    lowerPlainPredicateQuoteCarrierAttributive,
  noun_copula_quote_carrier_attributive_render:
    lowerNounCopulaQuoteCarrierAttributive,
  adversative_quote_carrier_attributive_render:
    lowerAdversativeQuoteCarrierAttributive,
  adversative_quote_carrier_terminal_render:
    lowerAdversativeQuoteCarrierTerminal,
  plain_predicate_semantic_operator_attributive_render:
    lowerPlainPredicateSemanticOperatorAttributive,
  plain_predicate_semantic_operator_quote_carrier_attributive_render:
    lowerPlainPredicateSemanticOperatorQuoteCarrierAttributive,
  noun_copula_semantic_operator_attributive_render:
    lowerNounCopulaSemanticOperatorAttributive,
  noun_copula_semantic_operator_quote_carrier_attributive_render:
    lowerNounCopulaSemanticOperatorQuoteCarrierAttributive,
  clause_connective_render: lowerClauseConnective,
  renyou_chuushi_render: lowerRenyouChuushi,
  terminal_render: lowerTerminalChain,
  imperative_render: lowerImperativeTerminal,
  adverbial_modifier_render: lowerAdverbialModifierTerminal,
  nominalized_render: lowerNominalizedTerminalChain,
  attributive_operator_chain_render: lowerAttributiveOperatorChain,
  wrapped_negative_necessity_sumu: lowerWrappedNegativeNecessitySumu,
  noun_limit_desiderative_terminal: (input) =>
    lowerCopularTeHoshiiTerminal(input, "noun_limit"),
  na_adjective_copula_desiderative_terminal: (input) =>
    lowerCopularTeHoshiiTerminal(input, "na_adjective"),
  source_verbal_adjectival_desiderative: lowerSourceVerbalAdjectivalDesiderative,
  source_verbal_adjectival_desiderative_wish_complement:
    lowerSourceVerbalAdjectivalDesiderativeWishComplement,
  volitional_retrospective_quotative: (input) => lowerVolitional(
    input,
    "retrospective_quotative",
    composeCommittedVolitionalRetrospectiveQuotative,
    "volitional retrospective production"
  ),
  volitional_deliberative_retrospective_quotative: (input) => lowerVolitional(
    input,
    "retrospective_quotative",
    composeCommittedVolitionalDeliberativeRetrospectiveQuotative,
    "volitional deliberative production"
  ),
  conjectural_quotative: lowerConjecturalQuotative,
  quotative_insistent_terminal: lowerQuotativeInsistentTerminal,
  proposition_assertability_koto_dekiru: lowerPropositionAssertabilityKotoDekiru,
  reinforced_potential_connective: lowerReinforcedPotentialConnective,
  reinforced_potential_attributive: lowerReinforcedPotentialAttributive,
  reinforced_potential_noda_question: lowerReinforcedPotentialNodaQuestion,
  volitional_wish_complement: (input) => lowerVolitional(
    input,
    "wish_complement",
    composeCommittedVolitionalWishComplement,
    "volitional wish production"
  ),
  volitional_intent_quote_attributive: (input) => lowerVolitional(
    input,
    "quote_attributive",
    composeCommittedVolitionalIntentQuoteAttributive,
    "volitional quote-attributive production"
  ),
  volitional_cohortative_quote_attributive: (input) => lowerVolitional(
    input,
    "quote_attributive",
    composeCommittedVolitionalCohortativeQuoteAttributive,
    "volitional cohortative quote-attributive production"
  ),
  volitional_request_complement: (input) => lowerVolitional(
    input,
    "request_complement",
    composeCommittedVolitionalRequestComplement,
    "volitional request production"
  ),
  request_terminal_quotative: lowerRequestTerminalQuotative,
  request_terminal_question: lowerRequestTerminalQuestion,
  request_composed_base_terminal: lowerComposedRequestTerminal,
  request_composed_base_discursive_sfp: lowerComposedRequestDiscursiveSfp,
  request_composed_base_request_complement: lowerComposedRequestComplement,
  request_projection_connective: lowerRequestProjectionConnective,
  request_projection_quote_attributive: lowerRequestProjectionQuoteAttributive,
  request_reported_terminal: lowerRequestReportedTerminal,
  request_nominalized_terminal: lowerRequestNominalizedTerminal,
  request_likeness_fragment: lowerRequestLikenessFragment,
  request_carrier_chain_connective: lowerRequestCarrierChainConnective,
  benefactive_noda_terminal: lowerBenefactiveNodaTerminal
} satisfies { readonly [K in ProductionLoweringKey]: ProductionLoweringHandler };

const attributiveTerminalRendererNotInjected: AttributiveTerminalRenderer = () => {
  throw new Error("attributive terminal renderer was not injected into lowerProductionMatch");
};

const committedTailTerminalRendererNotInjected: CommittedTailTerminalRenderer = () => {
  throw new Error("committed tail terminal renderer was not injected into lowerProductionMatch");
};

export function lowerProductionMatch(
  root: TailRoot,
  match: ProductionRegistryMatch,
  renderContext: RenderContext,
  renderNormalizedRoot: ProductionRootRenderer,
  renderAttributiveTerminal: AttributiveTerminalRenderer = attributiveTerminalRendererNotInjected,
  renderCommittedTailTerminal: CommittedTailTerminalRenderer =
    committedTailTerminalRendererNotInjected
): RenderOutcome {
  const handler = PRODUCTION_LOWERING_BINDINGS[match.record.loweringKey];
  if (handler === undefined) {
    throw new Error(`unbound production lowering key: ${match.record.loweringKey}`);
  }
  const lowered = handler({
    root,
    normalizedRoot: normalizeProductionMatch(root, match),
    match,
    renderContext,
    renderNormalizedRoot,
    renderAttributiveTerminal,
    renderCommittedTailTerminal
  });
  if (!lowered.ok || match.warnings === undefined || match.warnings.length === 0) {
    return lowered;
  }
  return {
    ...lowered,
    warnings: [...(lowered.warnings ?? []), ...match.warnings]
  };
}
