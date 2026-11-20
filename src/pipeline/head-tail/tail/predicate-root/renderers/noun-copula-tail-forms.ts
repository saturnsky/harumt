import type { IrregularType } from "../../../../../generator/conjugator.js";
import { hasAllomorphBatchim, selectParticle } from "../../../../../generator/particles.js";
import { derivationalMakeStateCarrierOf } from "../derivational-suffix-table.js";
import { 명사 } from "../../../../../types/pos.js";
import type { AuxLayerNode, AuxOpNode, ConjectureOp, ConnectiveOp, ExperienceIdiomOp, ModalOp, NegationOp, NounStem, ObligationIdiomOp, PredicateProjectionCarrierOp, PredicateQuoteCarrierOp, PostverbAuxiliaryOp, ScopeBridgeOp, SoudaHearsayModalOp, TenseOp } from "../grammar.js";
import { connectiveForRender, shouldCarryConnectivePoliteness } from "../connective-render.js";
import { NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT } from "../short-negation-policy.js";
import { ChainTraceAccumulator, closeChainTraceAgainstText, closeChainTraceWithConnectivePieces, splitNegativeNounCopulaSourceTokens, stemHostTraceSegment, tracedSeg, type BaseResult, type ChainSourceTrace, type KoreanLemmaPredicateBase, type OkBaseResult, type RenderContext, type RenderFailure, type RenderOutcome, type TailTraceSegment } from "./base-model.js";
import { applyExternalNegationDepthToPredicateBase, applyNonLastPrefixContractions, nounCopulaStemAllomorphHost, nounCopulaBase, type nounCopulaPolarityBaseForCopula, nounSubjectPart, splitPositiveObligationSourceTokens, copulaCarrierBaseForInterOp } from "./base-support.js";
import { composeCommittedTailConnective, nounCopulaObligationBase, nounCopulaObligationBaseForCopula } from "./connective-compose.js";
import { composeCommittedTailTerminal } from "./predicate-terminal-compose.js";
import { composeNounCopulaBaseWithConjecture, composeNounCopulaBaseWithConjectureConnective } from "./noun-copula-conjecture-compose.js";
import { experienceBase } from "./idiom-bases.js";
import { modalFinalChainPolicy, soudaHearsayBaseFromPredicateBase } from "./modal-bases.js";
import { predicateProjectionCarrierBase, predicateQuoteCarrierBase } from "./predicate-bases.js";
import { scopeBridgeBase } from "./scope-bridge-bases.js";
import { isChainableHeadOp, opCarriesIntrinsicPast, opToBase, sourceTraceWithFinalNegationStem } from "./op-chain.js";
import { isNormalFunctionalChain, renderRepeatedFunctionalChainText, splitFunctionalAuxChunks } from "../../../../rendering/functional-chain.js";
import { baseResultForNounCopulaConnective, composeCommittedCarrierPostChain, copulaVariantConnective, renderNominalHostLikeness, residualConjectureSuffix } from "./noun-copula.js";
import { isBareNounStemFocusConnective, isBareNounStemQuoteConnective } from "../bare-noun-stem-hosting.js";
import { createCopulaOp, createTenseOp } from "../op-builders.js";
import { isStateChangePostverbAuxiliaryKind } from "../postverb-auxiliary-parser.js";

export function tryRenderNounCopulaStutter(
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

export function renderBareNounQuoteConnective(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
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

export function renderNominalFocusConnective(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
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

export function nominalTargetCopulaBridgeOps(ops: readonly AuxOpNode[]): readonly AuxOpNode[] {
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

interface NounCopulaOpState {
  polite: boolean;
  past: boolean;
  chainDepth: number;
  externalNegation: NegationOp | null;
  connective: ConnectiveOp | null;
  conjecture: ConjectureOp | null;
  readonly modalChain: ModalOp[];
  obligation: ObligationIdiomOp | null;
  experience: ExperienceIdiomOp | null;
  postModalNeg: NegationOp | null;
  postModalPast: boolean;
  postModalPolite: boolean;
  readonly postModalPastTokensByChainIndex: Map<number, TenseOp["source"]["tokens"]>;
  hostPastTokens: TenseOp["source"]["tokens"];
  soudaHearsay: SoudaHearsayModalOp | null;
  scopeBridge: ScopeBridgeOp | null;
  postverbAuxiliary: PostverbAuxiliaryOp | null;
  predicateQuoteCarrier: PredicateQuoteCarrierOp | null;
  projectionCarrier: PredicateProjectionCarrierOp | null;
  readonly postPredicateQuoteOps: AuxOpNode[];
  postPredicateQuotePolite: boolean;
  postScopePolite: boolean;
  postScopePast: boolean;
  readonly postScopeOps: AuxOpNode[];
}

export function newNounCopulaOpState(copula: Extract<AuxOpNode, { readonly kind: "copula" }>): NounCopulaOpState {
  return {
    polite: copula.polite,
    past: false,
    chainDepth: 0,
    externalNegation: null,
    connective: null,
    conjecture: null,
    modalChain: [],
    obligation: null,
    experience: null,
    postModalNeg: null,
    postModalPast: false,
    postModalPolite: false,
    postModalPastTokensByChainIndex: new Map<number, TenseOp["source"]["tokens"]>(),
    hostPastTokens: [],
    soudaHearsay: null,
    scopeBridge: null,
    postverbAuxiliary: null,
    predicateQuoteCarrier: null,
    projectionCarrier: null,
    postPredicateQuoteOps: [],
    postPredicateQuotePolite: false,
    postScopePolite: false,
    postScopePast: false,
    postScopeOps: [],
  };
}

export interface NounCopulaRenderContext {
  readonly layer: AuxLayerNode & { readonly stem: NounStem };
  readonly ctx: RenderContext;
  readonly noun: string;
  readonly ops: readonly AuxOpNode[];
  readonly copula: Extract<AuxOpNode, { readonly kind: "copula" }>;
  readonly formal: boolean;
  readonly terminalFormal: boolean;
  readonly base: ReturnType<typeof nounCopulaPolarityBaseForCopula>;
  readonly baseResult: OkBaseResult;
  readonly connectivePolite: boolean;
}

interface NounCopulaModalChainScope {
  readonly hostPast: boolean;
  readonly committedModalBase: OkBaseResult & { readonly chainSourceTrace?: ChainSourceTrace };
  readonly chainTraceAcc: ChainTraceAccumulator;
  readonly terminalPastTokens: TenseOp["source"]["tokens"];
  readonly nativeNounModalTraceSupported: boolean;
  readonly modalPolite: boolean;
}

export function renderNounConsecutiveConjecture(
  layer: AuxLayerNode & { readonly stem: NounStem },
  ctx: RenderContext,
  ops: readonly AuxOpNode[],
  noun: string
): RenderOutcome | null {
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
  return null;
}

export function collectNounCopulaOps(
  ops: readonly AuxOpNode[],
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>,
  state: NounCopulaOpState
): RenderFailure | null {
  for (let i = 1; i < ops.length; i++) {
    const op = ops[i]!;
    if (state.predicateQuoteCarrier !== null) {
      const failure = collectOpAfterNounPredicateQuoteCarrier(state, op, i, ops);
      if (failure !== null) {
        return failure;
      }
      continue;
    }
    if (state.projectionCarrier !== null && op.kind !== "connective") {
      return { ok: false, reason: `op '${op.kind}' after noun copula projection carrier not supported` };
    }
    if (op.kind === "connective") {
      if (state.connective !== null) {
        return { ok: false, reason: "multiple connective ops in noun copula layer not supported" };
      }
      if (i !== ops.length - 1) {
        return { ok: false, reason: "ConnectiveOp on noun copula must be last" };
      }
      state.connective = op;
      continue;
    }
    if (op.kind === "scopeBridge") {
      if (state.scopeBridge !== null) {
        return { ok: false, reason: "multiple scopeBridge ops in noun copula layer not supported" };
      }
      state.scopeBridge = op;
      continue;
    }
    if (op.kind === "conjecture") {
      if (state.scopeBridge !== null) {
        state.postScopeOps.push(op);
        continue;
      }
      if (state.conjecture !== null) {
        return { ok: false, reason: "multiple conjecture ops in noun copula layer not supported" };
      }
      const followedByFinalConnective =
        i === ops.length - 2 && ops[i + 1]?.kind === "connective";
      if (i !== ops.length - 1 && !followedByFinalConnective) {
        return { ok: false, reason: "ConjectureOp on noun copula must be last" };
      }
      state.conjecture = op;
      continue;
    }
    if (op.kind === "idiom" && op.idiom === "obligation") {
      if (state.obligation !== null) {
        return { ok: false, reason: "multiple obligation ops in noun copula layer not supported" };
      }
      if (state.modalChain.length > 0 || state.soudaHearsay !== null || state.conjecture !== null || state.scopeBridge !== null) {
        return { ok: false, reason: "noun copula + obligation + mixed operator not supported" };
      }
      state.obligation = op;
      continue;
    }
    if (op.kind === "idiom" && op.idiom === "experience_koto_ga_aru") {
      if (state.experience !== null) {
        return { ok: false, reason: "multiple experience ops in noun copula layer not supported" };
      }
      if (
        state.modalChain.length > 0 || state.soudaHearsay !== null || state.conjecture !== null ||
        state.scopeBridge !== null || state.obligation !== null || state.postverbAuxiliary !== null ||
        state.projectionCarrier !== null
      ) {
        return { ok: false, reason: "noun copula + experience + mixed operator not supported" };
      }
      state.experience = op;
      continue;
    }
    if (op.kind === "modal" && op.modal !== "souda_hearsay") {
      if (state.scopeBridge !== null) {
        state.postScopeOps.push(op);
        continue;
      }
      if (state.soudaHearsay !== null || state.conjecture !== null || state.scopeBridge !== null) {
        return { ok: false, reason: "noun copula + mixed modal/scope/conjecture not supported" };
      }
      state.modalChain.push(op);
      continue;
    }
    if (op.kind === "postverbAuxiliary") {
      const failure = collectNounCopulaPostverbAuxiliaryOp(state, op, copula);
      if (failure !== null) {
        return failure;
      }
      continue;
    }
    if (op.kind === "predicateQuoteCarrier") {
      if (state.predicateQuoteCarrier !== null) {
        return { ok: false, reason: "multiple predicate quote carriers on noun copula not supported" };
      }
      state.predicateQuoteCarrier = op;
      continue;
    }
    if (op.kind === "predicateProjectionCarrier") {
      if (state.modalChain.length > 0 || state.soudaHearsay !== null || state.conjecture !== null || state.scopeBridge !== null || state.postverbAuxiliary !== null || state.obligation !== null) {
        return { ok: false, reason: "noun copula + projection carrier mixed operator not supported" };
      }
      state.projectionCarrier = op;
      continue;
    }
    if (op.kind === "modal" && op.modal === "souda_hearsay") {
      if (state.soudaHearsay !== null) {
        return { ok: false, reason: "multiple souda hearsay ops in noun copula layer not supported" };
      }
      if (state.modalChain.length > 0) {
        return { ok: false, reason: "noun copula + mixed modal/souda not supported" };
      }
      if (op.reading !== "hearsay") {
        return { ok: false, reason: "souda yotai on noun copula not supported" };
      }
      state.soudaHearsay = op;
      continue;
    }
    if (op.kind === "polite") {
      if (state.scopeBridge !== null) {
        state.postScopePolite = true;
      } else if (
        state.modalChain.length > 0 || state.postverbAuxiliary !== null || state.obligation !== null ||
        state.experience !== null
      ) {
        state.postModalPolite = true;
      } else {
        state.polite = true;
      }
      continue;
    }
    if (op.kind === "tense" && op.tense === "past") {
      const failure = collectNounCopulaPastTenseOp(state, op);
      if (failure !== null) {
        return failure;
      }
      continue;
    }
    if (op.kind === "negation") {
      const failure = collectNounCopulaNegationOp(state, op, copula);
      if (failure !== null) {
        return failure;
      }
      continue;
    }
    return { ok: false, reason: `op '${op.kind}' on noun copula not yet supported` };
  }
  return null;
}

function collectOpAfterNounPredicateQuoteCarrier(
  state: NounCopulaOpState,
  op: AuxOpNode,
  i: number,
  ops: readonly AuxOpNode[]
): RenderFailure | null {
  if (op.kind === "connective") {
    if (state.connective !== null) {
      return { ok: false, reason: "multiple connective ops after noun copula predicate quote carrier not supported" };
    }
    if (i !== ops.length - 1) {
      return { ok: false, reason: "ConnectiveOp after noun copula predicate quote carrier must be last" };
    }
    state.connective = op;
    return null;
  }
  if (op.kind === "polite") {
    state.postPredicateQuotePolite = true;
    return null;
  }
  if (op.kind === "tense" || op.kind === "negation" || isChainableHeadOp(op)) {
    state.postPredicateQuoteOps.push(op);
    return null;
  }
  return { ok: false, reason: `op '${op.kind}' after noun copula predicate quote carrier not supported` };
}

function collectNounCopulaPostverbAuxiliaryOp(
  state: NounCopulaOpState,
  op: PostverbAuxiliaryOp,
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>
): RenderFailure | null {
  if (state.postverbAuxiliary !== null) {
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
  state.postverbAuxiliary = op;
  return null;
}

function collectNounCopulaPastTenseOp(state: NounCopulaOpState, op: TenseOp): RenderFailure | null {
  if (state.scopeBridge !== null) {
    state.postScopePast = true;
    state.postScopeOps.push(op);
  } else if (
    state.modalChain.length > 0 || state.postverbAuxiliary !== null || state.obligation !== null ||
    state.experience !== null
  ) {
    state.postModalPast = true;
    if (state.modalChain.length > 0) {
      const chainIndex = state.modalChain.length - 1;
      state.postModalPastTokensByChainIndex.set(chainIndex, [
        ...(state.postModalPastTokensByChainIndex.get(chainIndex) ?? []),
        ...op.source.tokens
      ]);
    }
  } else {
    state.past = true;
    state.hostPastTokens = [...state.hostPastTokens, ...op.source.tokens];
  }
  return null;
}

function collectNounCopulaNegationOp(
  state: NounCopulaOpState,
  op: NegationOp,
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>
): RenderFailure | null {
  if (state.scopeBridge !== null) {
    state.postScopeOps.push(op);
    return null;
  }
  if (state.modalChain.length > 0 || state.postverbAuxiliary !== null || state.experience !== null) {
    if (state.postModalNeg !== null) {
      return { ok: false, reason: "multiple post-modal negation ops in noun copula layer not supported" };
    }
    state.postModalNeg = op;
    return null;
  }
  if (copula.polarity !== "negative") {
    if (state.externalNegation !== null) {
      return { ok: false, reason: "multiple external negation ops on affirmative noun copula not supported" };
    }
    state.externalNegation = op;
    return null;
  }
  state.chainDepth = op.chainDepth;
  state.past = state.past || op.chainPast;
  return null;
}

export function renderNounCopulaProjectionCarrier(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState
): RenderOutcome | null {
  const { ctx, formal, base } = nc;
  const { past, externalNegation, connective, projectionCarrier } = state;
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
  return null;
}

export function renderNounCopulaPredicateQuoteCarrier(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState
): RenderOutcome | null {
  const { layer, ctx, noun, ops, copula, base } = nc;
  const { past, externalNegation, connective, conjecture, modalChain, obligation, soudaHearsay, scopeBridge, postverbAuxiliary, predicateQuoteCarrier, postPredicateQuoteOps, postPredicateQuotePolite } = state;
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
  return null;
}

export function renderNounCopulaPostverbAuxiliary(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState
): RenderOutcome | null {
  const { ctx, formal, base } = nc;
  const { polite, past, externalNegation, connective, conjecture, modalChain, obligation, postModalNeg, postModalPast, postModalPolite, soudaHearsay, scopeBridge, postverbAuxiliary } = state;
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
  return null;
}

export function renderNounCopulaSoudaHearsay(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState
): RenderOutcome | null {
  const { layer, ctx, noun, copula, formal, base, baseResult } = nc;
  const { polite, past, externalNegation, connective, conjecture, hostPastTokens, soudaHearsay, scopeBridge } = state;
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
  return null;
}

export function renderNounCopulaExperience(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState
): RenderOutcome | null {
  const { ctx, copula, formal, base } = nc;
  const { polite, past, externalNegation, connective, conjecture, experience, postModalNeg, postModalPast, postModalPolite, soudaHearsay, scopeBridge } = state;
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
  return null;
}

export function renderNounCopulaObligation(nc: NounCopulaRenderContext, state: NounCopulaOpState): RenderOutcome | null {
  const { layer, ctx, noun, copula, formal } = nc;
  const { polite, past, externalNegation, connective, conjecture, obligation, postModalPast, soudaHearsay, scopeBridge, postverbAuxiliary } = state;
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
    const obligationModal = renderNounCopulaObligationModalChain(nc, state, obligation, obligationBase, tracedObligationBaseResult);
    if (obligationModal !== null) {
      return obligationModal;
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
  return null;
}

function renderNounCopulaObligationModalChain(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState,
  obligation: ObligationIdiomOp,
  obligationBase: ReturnType<typeof nounCopulaObligationBaseForCopula>,
  tracedObligationBaseResult: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace }
): RenderOutcome | null {
  const { ctx, formal } = nc;
  const { polite, connective, conjecture, modalChain, postModalNeg, postModalPast, postModalPolite } = state;
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
  return null;
}

export function renderNounCopulaModalChain(nc: NounCopulaRenderContext, state: NounCopulaOpState): RenderOutcome | null {
  const { layer, ctx, noun, copula, formal, base } = nc;
  const { polite, past, externalNegation, conjecture, modalChain, postModalNeg, postModalPolite, postModalPastTokensByChainIndex, hostPastTokens, soudaHearsay, scopeBridge } = state;
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
    const modalScope: NounCopulaModalChainScope = {
      hostPast,
      committedModalBase,
      chainTraceAcc,
      terminalPastTokens,
      nativeNounModalTraceSupported,
      modalPolite
    };
    if (scopeBridge !== null) {
      return renderNounCopulaModalScopeBridge(nc, state, modalScope, scopeBridge);
    }
    return renderNounCopulaModalTerminal(nc, state, modalScope);
  }
  return null;
}

function renderNounCopulaModalScopeBridge(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState,
  modalScope: NounCopulaModalChainScope,
  scopeBridge: ScopeBridgeOp
): RenderOutcome {
  const { committedModalBase, chainTraceAcc, terminalPastTokens, nativeNounModalTraceSupported, modalPolite } = modalScope;
  const { ctx, formal } = nc;
  const { externalNegation, connective, conjecture, postModalNeg, postModalPast, postScopePolite, postScopeOps } = state;
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

function renderNounCopulaModalTerminal(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState,
  modalScope: NounCopulaModalChainScope
): RenderOutcome {
  const { hostPast, committedModalBase, modalPolite } = modalScope;
  const { layer, ctx, noun, copula, formal, base } = nc;
  const { connective, conjecture, modalChain, postModalNeg, postModalPast, hostPastTokens } = state;
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

export function renderNounCopulaConditionalNara(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState
): RenderOutcome | null {
  const { layer, ctx, noun, ops, copula, formal, baseResult, connectivePolite } = nc;
  const { past, externalNegation, connective, conjecture } = state;
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
  return null;
}

export function renderNounCopulaScopeBridge(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState
): RenderOutcome | null {
  const { layer, ctx, noun, copula, formal, base } = nc;
  const { past, externalNegation, connective, conjecture, hostPastTokens, scopeBridge, postScopePolite, postScopePast } = state;
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
  return null;
}

export function renderNounCopulaSimpleTail(
  nc: NounCopulaRenderContext,
  state: NounCopulaOpState
): RenderOutcome {
  const { layer, ctx, noun, ops, copula, formal, terminalFormal, base, baseResult, connectivePolite } = nc;
  const { polite, past, externalNegation, connective, conjecture } = state;
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

export function tryRenderNounCopulaPostverbCarrierAsVerb(
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

export function renderNounCopulaImperativeTerminal(
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
