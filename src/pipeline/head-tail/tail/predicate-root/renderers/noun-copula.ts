import { realizeInterjectionAbsorbedCopula } from "../../../../../generator/aux-map.js";
import { conjugate } from "../../../../../generator/conjugator.js";
import { selectParticle } from "../../../../../generator/particles.js";
import {
  runtimeTokenSourceSpan,
  type RuntimeHaruToken
} from "../../../../../types/token.js";
import { isNaAdjCapableNoun } from "../../../../../types/pos.js";
import { predicateNominalizerRelationForToken } from "../../../boundary/marker.js";
import { connectiveForRender, shouldCarryConnectivePoliteness } from "../connective-render.js";
import { type AdjStem, type AuxLayerNode, type AuxOpNode, type ConjectureOp, type ConnectiveKind, type ConnectiveOp, type CopulaOp, type IdiomKind, type NegationOp, type NounStem, type OpSource, type PredicateProjectionCarrierOp, type PredicateQuoteCarrierOp, type ScopeBridgeOp, type TailRoot, type TenseOp, type TosuruConstructionMode, type VerbStem, type VoiceOp, type YoudaModalOp, isCommittedKaQuestionSfpEffect, isKaFamilyQuestionSfpEffect } from "../grammar.js";
import { attributiveProjectionPolicy, committedAttributiveProjectionPolicy } from "../attributive-head-policy.js";
import { applyNegationDepthToLemmaBase, ensureQuestionPunctuation, opCarriesTerminalRolePoliteness, scopeCarrierCanPreserveSourcePoliteness, tracedSeg, tracedStemHostSeg, type AttributiveProjectionPolicy, type BaseResult, type ChainSourceTrace, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type OkBaseResult, type RenderContext, type RenderFailure, type RenderOutcome } from "./base-model.js";
import { finalNegationLoweringForcesPast, isCopulaSupportPotentialOp, lowerFinalNegationForCommittedBase, nounCopulaStemAllomorphHost, nounCopulaBase, nounCopulaPolarityBaseForCopula, nounCopulaFocusStem, nounLimitDakeCarrierBase, nounSubjectPart } from "./base-support.js";
import { attributiveBoundaryRequestsFutureProjection, composeCommittedBaseAttributive, composeCommittedBaseWithConjectureQuestionConnective, composeCommittedTailConnective, composeCommittedTailTerminal, isConjectureQuestionContinuationConnective, isMonoBoundReasonConnective, projectBaseAttributive } from "./connective-compose.js";
import { chainBases, chainStemTraceFields, collectOperatorChain, isChainableHeadOp, isHeadOp } from "./op-chain.js";
import { copulaCarrierBaseForInterOp, isStateChangePostverbAuxiliaryKind, modalFinalChainPolicy, predicateProjectionCarrierBase, predicateQuoteCarrierBase, scopeBridgeBase, withNegativeClosureCapability } from "./predicate-bases.js";
import { stemIsTosuruResultativeMakeHead, tosuruConstructionModeForNounStem } from "../tosuru-construction-mode.js";
import { resolveCandidateSetStem } from "../commit.js";
import { createConjectureOp, createConnectiveOp, createCopulaOp, createNegationOp, createPoliteOp, createTenseOp, createVoiceOp } from "../op-builders.js";
import { NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT } from "../short-negation-policy.js";

export function tryRenderInterjectionAbsorbedCopula(
  layer: AuxLayerNode,
  ctx: RenderContext,
  sfp: TailRoot["sfp"] = null
): RenderOutcome | null {
  if (layer.stem.kind !== "noun" || layer.stem.interjection === undefined || layer.terminal !== null) {
    return null;
  }
  const [head, ...rest] = layer.ops;
  if (
    head?.kind !== "copula" ||
    head.variant !== "basic" ||
    head.polarity !== "affirmative" ||
    head.basicForm !== undefined ||
    head.honorific === true ||
    !rest.every((op) => op.kind === "tense" || op.kind === "polite")
  ) {
    return null;
  }
  const polite = head.polite || rest.some((op) => op.kind === "polite");
  const realized = realizeInterjectionAbsorbedCopula(layer.stem.lemma, polite, ctx.formal, layer.stem.interjection.polite);
  const question = sfp !== null &&
    (isCommittedKaQuestionSfpEffect(sfp.effect) || isKaFamilyQuestionSfpEffect(sfp.effect));
  return {
    ok: true,
    text: question ? ensureQuestionPunctuation(realized.text) : realized.text,
    polite: realized.polite
  };
}

function splitPredicateCopulaNegativeSource(
  copula: CopulaOp
): {
  readonly bridgeTokens: readonly RuntimeHaruToken[];
  readonly finalTokens: readonly RuntimeHaruToken[];
} | null {
  const tokens = copula.source.tokens;
  if (tokens.length < 2) {
    return null;
  }
  let finalStart: number;
  const last = tokens[tokens.length - 1]!;
  const prev = tokens[tokens.length - 2];
  const beforePrev = tokens[tokens.length - 3];
  if (
    last.dictionaryForm === "ぬ" &&
    prev !== undefined &&
    prev.dictionaryForm === "ます"
  ) {
    finalStart = beforePrev?.dictionaryForm === "ある"
      ? tokens.length - 3
      : tokens.length - 2;
  } else if (
    last.dictionaryForm === "です" &&
    prev !== undefined &&
    prev.dictionaryForm === "ない"
  ) {
    finalStart = tokens.length - 2;
  } else if (last.dictionaryForm === "ない" || last.dictionaryForm === "ぬ") {
    finalStart = tokens.length - 1;
  } else {
    return null;
  }
  if (finalStart <= 0 || finalStart >= tokens.length) {
    return null;
  }
  return {
    bridgeTokens: tokens.slice(0, finalStart),
    finalTokens: tokens.slice(finalStart)
  };
}

const NOUN_COPULA_SCANNER_OWNED_IDIOM_KINDS = [
  "obligation",
  "experience_koto_ga_aru"
] as const satisfies readonly IdiomKind[];
const NOUN_COPULA_SCANNER_OWNED_IDIOM_KIND_SET: ReadonlySet<IdiomKind> =
  new Set(NOUN_COPULA_SCANNER_OWNED_IDIOM_KINDS);

export function isNounCopulaScannerOwnedIdiomKind(idiom: IdiomKind): boolean {
  return NOUN_COPULA_SCANNER_OWNED_IDIOM_KIND_SET.has(idiom);
}

export function tryRenderNounCopulaInitialBaseOperatorChain(
  layer: AuxLayerNode & { readonly stem: NounStem },
  copula: CopulaOp,
  ctx: RenderContext,
  options: { readonly admitSingleHead?: boolean } = {}
): RenderOutcome | null {
  if (copula.variant !== "basic") return null;
  const tailOps = layer.ops.slice(1);
  const headOps = collectOperatorChain(tailOps);
  const unsupportedPostverb = headOps.some((op) =>
    op.kind === "postverbAuxiliary" &&
    !isStateChangePostverbAuxiliaryKind(op.auxiliary.kind) &&
    op.auxiliary.kind !== "appearance_perception"
  );
  const finalConnective = tailOps.at(-1);
  const centralizedConnective = finalConnective?.kind === "connective" && (
    finalConnective.connective === "even_if" ||
    finalConnective.connective === "predicate_projection_purpose"
  );
  const singleHead = headOps.length === 1 ? headOps[0]! : null;
  const singleFoldOwnedIdiomHead =
    singleHead !== null &&
    singleHead.kind === "idiom" &&
    !isNounCopulaScannerOwnedIdiomKind(singleHead.idiom);
  const minimumHeadCount =
    options.admitSingleHead === true || singleFoldOwnedIdiomHead ? 1 : 2;
  if (headOps.length < minimumHeadCount && !unsupportedPostverb && !centralizedConnective) return null;
  let connective: ConnectiveOp | null = null;
  let polite = copula.polite;
  const chainInputOps: AuxOpNode[] = [];
  for (let i = 0; i < tailOps.length; i++) {
    const op = tailOps[i]!;
    if (op.kind === "connective") {
      if (connective !== null || i !== tailOps.length - 1) {
        return { ok: false, reason: "central noun-copula operator chain requires a single final connective" };
      }
      connective = connectiveForRender(op, ctx);
      continue;
    }
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (("polite" in op && op.polite === true)) polite = true;
    chainInputOps.push(op);
  }
  const initialBaseResult = nounCopulaInitialBaseResult(layer, copula, nounCopulaStemAllomorphHost(layer.stem, ctx));
  return composeCommittedCarrierPostChain(
    initialBaseResult,
    chainInputOps,
    polite && (
      connective === null ||
      shouldCarryConnectivePoliteness(ctx) ||
      (!ctx.formal && layer.stem.source.tokens.some((token, index) =>
        predicateNominalizerRelationForToken(token, index, {
          requirement: "strict_particle",
          consumers: ["content_head_dispatch"]
        }) !== null
      ))
    ),
    connective,
    ctx
  );
}

export function nounCopulaInitialBaseResult(
  layer: AuxLayerNode & { readonly stem: NounStem },
  copula: CopulaOp,
  allomorphHost?: string
): OkBaseResult & { readonly chainSourceTrace: ChainSourceTrace } {
  const initialBase = nounCopulaPolarityBaseForCopula(copula, layer.stem.lemma, 0, allomorphHost);
  const negativeSource = copula.polarity === "negative"
    ? splitPredicateCopulaNegativeSource(copula)
    : null;
  const initialPrefixSegments = copula.polarity === "negative"
    ? [
      ...tracedStemHostSeg(layer.stem, layer.stem.lemma, layer.stem.source.tokens, "lexeme"),
      ...tracedSeg(
        `${nounSubjectPart(layer.stem.lemma, allomorphHost).slice(layer.stem.lemma.length)} `,
        negativeSource?.bridgeTokens ?? [],
        "aux",
        "semantic"
      )
    ]
    : tracedStemHostSeg(layer.stem, layer.stem.lemma, layer.stem.source.tokens, "lexeme");
  return {
    ok: true,
    base: initialBase,
    chainOnFinalSupported: true,
    chainSourceTrace: {
      prefixSegments: initialPrefixSegments,
      finalSourceTokens: negativeSource?.finalTokens ?? copula.source.tokens,
      finalKind: "aux"
    }
  } satisfies OkBaseResult & { readonly chainSourceTrace: ChainSourceTrace };
}

export function renderNounCopulaAttributiveOperatorChain(
  layer: AuxLayerNode & { readonly stem: NounStem },
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>,
  ctx: RenderContext,
  options: { readonly admitModalFirstHead?: boolean } = {}
): RenderOutcome | null {
  if (copula.variant !== "basic") {
    return null;
  }
  const projectedOps: AuxOpNode[] = [...layer.ops.slice(1)];
  const opChain = collectOperatorChain(projectedOps);
  if (opChain.length === 0) {
    return null;
  }
  const firstHead = opChain[0]!;
  if (
    firstHead.kind !== "aspect" &&
    firstHead.kind !== "idiom" &&
    firstHead.kind !== "postverbAuxiliary" &&
    !(options.admitModalFirstHead === true && firstHead.kind === "modal") &&
    !(firstHead.kind === "scopeBridge" && opChain.length >= 2)
  ) {
    return null;
  }
  if (projectedOps.some((op) =>
    op.kind !== "tense" && op.kind !== "negation" && op.kind !== "polite" &&
    op.kind !== "classicalAuxResidue" && !isHeadOp(op)
  )) {
    return null;
  }
  const firstHeadIdx = projectedOps.indexOf(opChain[0]!);
  let preNeg: NegationOp | null = null;
  let stemPast = false;
  const pastAfterChainIdx = new Map<number, TenseOp>();
  const negAfterChainIdx = new Map<number, NegationOp>();
  const slotFor = (wrapper: AuxOpNode): number | null => {
    const wrapperIdx = projectedOps.indexOf(wrapper);
    for (let chainIdx = 0; chainIdx < opChain.length; chainIdx++) {
      const startIdx = projectedOps.indexOf(opChain[chainIdx]!);
      const nextIdx = chainIdx + 1 < opChain.length
        ? projectedOps.indexOf(opChain[chainIdx + 1]!)
        : projectedOps.length;
      if (startIdx < wrapperIdx && wrapperIdx < nextIdx) return chainIdx;
    }
    return null;
  };
  for (const op of projectedOps) {
    const opIdx = projectedOps.indexOf(op);
    if (op.kind === "tense") {
      if (opIdx < firstHeadIdx) {
        if (stemPast) return { ok: false, reason: "multiple noun-copula attributive pre-chain tense ops not supported" };
        stemPast = true;
      } else {
        const slot = slotFor(op);
        if (slot === null || pastAfterChainIdx.has(slot)) {
          return { ok: false, reason: "noun-copula attributive post-chain tense slot not supported" };
        }
        pastAfterChainIdx.set(slot, op);
      }
    } else if (op.kind === "negation") {
      if (opIdx < firstHeadIdx) {
        if (preNeg !== null) return { ok: false, reason: "multiple noun-copula attributive pre-chain negations not supported" };
        preNeg = op;
      } else {
        const slot = slotFor(op);
        if (slot === null || negAfterChainIdx.has(slot)) {
          return { ok: false, reason: "noun-copula attributive post-chain negation slot not supported" };
        }
        negAfterChainIdx.set(slot, op);
      }
    }
  }
  const initialBase = nounCopulaPolarityBaseForCopula(copula, layer.stem.lemma, 0, nounCopulaStemAllomorphHost(layer.stem, ctx));
  const folded = chainBases(opChain, layer.stem.lemma, null, false, {
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
    return { ok: false, reason: "noun-copula attributive final negation lowering failed" };
  }
  const attr = projectBaseAttributive(
    projectedBase,
    folded.finalPast,
    ctx.formal,
    folded.finalPastProjection,
    "default",
    committedAttributiveProjectionPolicy(layer, attributiveBoundaryRequestsFutureProjection(layer))
  );
  return attr === null
    ? { ok: false, reason: "noun-copula attributive operator-chain projection failed" }
    : { ok: true, text: attr, polite: false, stemPrefixApplied: true };
}

export function canonicalizeConjectureCopulaOps(
  layer: AuxLayerNode,
  ctx: RenderContext
): { readonly layer: AuxLayerNode; readonly ctx: RenderContext } | RenderFailure {
  let changed = false;
  const ops: AuxOpNode[] = [];
  for (const op of layer.ops) {
    if (op.kind !== "copula" || op.variant !== "conjecture") {
      ops.push(op);
      continue;
    }
    if (op.polarity !== "affirmative") {
      return { ok: false, reason: "negative copula conjecture canonicalization not supported" };
    }
    changed = true;
    if (op.honorific === true) {
      ops.push(
        createCopulaOp({
          source: op.source,
          variant: "basic",
          polarity: op.polarity,
          honorific: true,
          polite: op.polite
        }),
        createConjectureOp({ source: op.source, polite: op.polite })
      );
      continue;
    }
    ops.push(createConjectureOp({  source: op.source, polite: op.polite }));
  }
  return {
    layer: changed ? { ...layer, ops } : layer,
    ctx
  };
}

export function projectPredicateCopulaLayer(
  layer: AuxLayerNode,
  ctx: RenderContext
): { readonly layer: AuxLayerNode; readonly ctx: RenderContext } | RenderFailure | null {
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return null;
  }
  const committedStem = layer.stem.kind === "candidateSet"
    ? resolveCandidateSetStem(layer.stem)
    : layer.stem;
  const tailOps = layer.ops.slice(1);
  if (
    committedStem.kind === "adverb" ||
    (copula.variant === "conditional_nara" && committedStem.kind === "noun" && tailOps.length === 0) ||
    (copula.variant !== "conditional_nara" && committedStem.kind !== "verb" && committedStem.kind !== "adj")
  ) {
    return null;
  }

  const projectedOps: AuxOpNode[] = [];
  let restOps: readonly AuxOpNode[] = tailOps;

  if (copula.variant === "conditional_nara") {
    if (copula.polarity !== "affirmative") {
      return { ok: false, reason: "predicate copula conditional_nara composition not supported" };
    }
    projectedOps.push(copulaVariantConnective(copula, "なら", "conditional"), ...tailOps);
  } else {
    if (copula.honorific === true) {
      projectedOps.push(createVoiceOp({
        source: copula.source,
        voice: "honorific",
        forcePassive: false,
        adversativePassive: false,
        adversativePassiveAgentPromoted: false
      }));
    }
    if (copula.polarity === "negative") {
      const followingNegation = tailOps[0]?.kind === "negation"
        ? tailOps[0]
        : null;
      projectedOps.push(predicateCopulaNegationOp(copula, followingNegation));
      restOps = followingNegation === null ? tailOps : tailOps.slice(1);
    }
    if (copula.polite) {
      projectedOps.push(createPoliteOp({  source: copula.source }));
    }
    projectedOps.push(...restOps);
  }

  const projectedLayer: AuxLayerNode = {
    ...layer,
    stem: committedStem,
    ops: projectedOps
  };
  return { layer: projectedLayer, ctx };
}

export function predicateCopulaNegationOp(copula: CopulaOp, followingNegation: NegationOp | null): NegationOp {
  const split = splitPredicateCopulaNegativeSource(copula);
  const sourceSplit = followingNegation === null
    ? split
    : {
      bridgeTokens: split?.bridgeTokens ?? copula.source.tokens,
      finalTokens: [
        ...(split?.finalTokens ?? []),
        ...followingNegation.source.tokens
      ]
    };
  return createNegationOp({

    source: followingNegation === null
      ? copula.source
      : mergeOpSources(copula.source, followingNegation.source),
    chainDepth: 1 + (followingNegation?.chainDepth ?? 0),
    chainPast: followingNegation?.chainPast ?? false,
    stemAux: [
      ...copula.source.tokens,
      ...(followingNegation?.stemAux ?? [])
    ],
    ...(sourceSplit === null
      ? {}
      : {
        sourceSplit: {
          kind: "predicate_copula_negative" as const,
          bridgeTokens: sourceSplit.bridgeTokens,
          finalTokens: sourceSplit.finalTokens
        }
      }),
    preferShortNegation: false
  });
}

function mergeOpSources(a: OpSource, b: OpSource): OpSource {
  return {
    tokens: [...a.tokens, ...b.tokens],
    tokenIndices: [...a.tokenIndices, ...b.tokenIndices]
  };
}

export function renderNounPredicateProjectionCarrier(
  noun: string,
  ops: readonly AuxOpNode[],
  ctx: RenderContext,
  nounSourceTokens: readonly RuntimeHaruToken[] = []
): RenderOutcome {
  const built = buildNounPredicateProjectionCarrier(noun, ops, ctx);
  if (!built.ok) {
    return built;
  }
  const { carrier, baseResult, connective, postOps, postPolite } = built;
  if (postOps.length > 0 || postPolite) {
    const chainOps: readonly AuxOpNode[] = carrier.past === true
      ? [createTenseOp({  source: carrier.source, tense: "past" }), ...postOps]
      : postOps;
    return composeCommittedCarrierPostChain(
      baseResult,
      chainOps,
      postPolite || carrier.polite === true,
      connective === null ? null : connectiveForRender(connective, ctx),
      ctx
    );
  }
  if (connective !== null) {
    return withLimitDakeNounCarrierTrace(noun, nounSourceTokens, carrier, connective, composeCommittedTailConnective(
      baseResult,
      connectiveForRender(connective, ctx),
      carrier.past === true,
      false,
      null,
      ctx.formal, ctx.lookups
    ));
  }
  return withLimitDakeNounCarrierTrace(
    noun,
    nounSourceTokens,
    carrier,
    null,
    composeCommittedTailTerminal(baseResult, null, carrier.past === true, ctx.formal, carrier.polite === true, ctx.lookups)
  );
}

function withLimitDakeNounCarrierTrace(
  noun: string,
  nounSourceTokens: readonly RuntimeHaruToken[],
  carrier: PredicateProjectionCarrierOp,
  connective: ConnectiveOp | null,
  result: RenderOutcome
): RenderOutcome {
  if (!result.ok || carrier.carrier !== "limit_dake" || carrier.source.tokens[0]?.surface !== "だけ") {
    return result;
  }
  const focusText = `${noun}만`;
  if (!result.text.startsWith(focusText)) {
    return result;
  }
  const suffix = result.text.slice(focusText.length);
  const focusToken = carrier.source.tokens[0];
  const suffixTokens = [
    ...carrier.source.tokens.slice(1),
    ...(connective?.source.tokens ?? [])
  ];
  return {
    ...result,
    traced: [
      ...tracedSeg(noun, nounSourceTokens, "lexeme", "semantic"),
      ...tracedSeg("만", focusToken === undefined ? carrier.source.tokens : [focusToken], "aux", "semantic"),
      ...tracedSeg(suffix, suffixTokens, connective === null ? "aux" : "connective", "semantic")
    ]
  };
}

export interface NounPredicateProjectionCarrierBuild {
  readonly ok: true;
  readonly carrier: PredicateProjectionCarrierOp;
  readonly baseResult: OkBaseResult;
  readonly connective: ConnectiveOp | null;
  readonly postOps: readonly AuxOpNode[];
  readonly postPolite: boolean;
}

export function buildNounPredicateProjectionCarrier(
  noun: string,
  ops: readonly AuxOpNode[],
  ctx: RenderContext
): NounPredicateProjectionCarrierBuild | RenderFailure {
  const carrier = ops[0];
  if (carrier?.kind !== "predicateProjectionCarrier") {
    return { ok: false, reason: "noun projection carrier invariant violation" };
  }
  let connective: ConnectiveOp | null = null;
  let postPolite = false;
  const postOps: AuxOpNode[] = [];
  for (let i = 1; i < ops.length; i++) {
    const op = ops[i]!;
    if (op.kind === "connective") {
      if (i !== ops.length - 1 || connective !== null) {
        return { ok: false, reason: "noun projection carrier supports only one final connective" };
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
    return { ok: false, reason: `op '${op.kind}' after noun projection carrier not supported` };
  }
  const baseResult: BaseResult = carrier.carrier === "limit_dake" && carrier.source.tokens[0]?.surface === "だけ"
    ? {
      ok: true,
      base: nounLimitDakeCarrierBase(noun),
      chainOnFinalSupported: true
    }
    : (() => {
      const host = copulaCarrierBaseForInterOp(nounCopulaBase(noun, false), ctx.formal);
      if (host === null) {
        return { ok: false, reason: "noun projection carrier host lowering failed" } as const;
      }
      return predicateProjectionCarrierBase({
        op: carrier,
        inputBase: host,
        preStemNeg: null,
        stemPast: false,
        formal: ctx.formal,
        pastProjection: "lexical"
      });
    })();
  if (!baseResult.ok) {
    return baseResult;
  }
  return {
    ok: true,
    carrier,
    baseResult,
    connective,
    postOps,
    postPolite
  };
}

export function isTosuruPredicateCarrier(op: AuxOpNode | undefined): op is PredicateQuoteCarrierOp {
  return op?.kind === "predicateQuoteCarrier" && op.style === "suru_attributive";
}

function nounTosuruPredicateBase(stem: NounStem, mode: TosuruConstructionMode): KoreanLemmaPredicateBase {
  if (mode === "resultative_make") {
    return {
      prefix: `${stem.lemma}하게 `,
      final: { kind: "lemma", lemma: "만들다", irregular: "ㄹ", isVerb: true }
    };
  }
  return {
    prefix: `${stem.lemma}${selectParticle(stem.lemma, "으로/로")} `,
    final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
  };
}

function nounCarrierTosuruMode(stem: NounStem, carrier: PredicateQuoteCarrierOp): TosuruConstructionMode {
  const mode = carrier.tosuruMode ?? tosuruConstructionModeForNounStem(stem);
  return mode === "resultative_make" ? "resultative_make" : "treat_as";
}

function adjTosuruResultativePredicateBase(stem: AdjStem): KoreanLemmaPredicateBase {
  return {
    prefix: `${conjugate(stem.lemma, stem.irregular, "게")} `,
    final: { kind: "lemma", lemma: "만들다", irregular: "ㄹ", isVerb: true }
  };
}

function tosuruTreatAsJudgmentPassiveBase(
  base: KoreanLemmaPredicateBase,
  mode: TosuruConstructionMode,
  op: VoiceOp
): KoreanLemmaPredicateBase | null {
  if (mode !== "treat_as" || op.voice !== "passive") {
    return null;
  }
  return {
    ...base,
    final: { kind: "lemma", lemma: "여겨지다", irregular: null, isVerb: true },
    policy: {
      kind: "voice",
      voice: "passive",
      ...(op.passiveClass === undefined ? {} : { passiveClass: op.passiveClass }),
      reportingPassive: true
    }
  };
}

function renderTosuruPredicateCarrierBase(
  carrierBase: KoreanLemmaPredicateBase,
  mode: TosuruConstructionMode,
  ops: readonly AuxOpNode[],
  ctx: RenderContext
): RenderOutcome {
  if (!isTosuruPredicateCarrier(ops[0])) {
    return { ok: false, reason: "to-suru predicate carrier invariant violation" };
  }
  let connective: ConnectiveOp | null = null;
  let postPolite = false;
  const postOps: AuxOpNode[] = [];
  let base = carrierBase;
  for (let i = 1; i < ops.length; i++) {
    const op = ops[i]!;
    if (i === 1 && op.kind === "voice") {
      const judgmentPassive = tosuruTreatAsJudgmentPassiveBase(base, mode, op);
      if (judgmentPassive !== null) {
        base = judgmentPassive;
        continue;
      }
    }
    if (op.kind === "connective") {
      if (i !== ops.length - 1 || connective !== null) {
        return { ok: false, reason: "to-suru predicate carrier supports only one final connective" };
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
    return { ok: false, reason: `op '${op.kind}' after to-suru predicate carrier not supported` };
  }
  const baseResult: BaseResult = {
    ok: true,
    base,
    chainOnFinalSupported: true,
    interOpPastProjection: "committed"
  };
  return composeCommittedCarrierPostChain(
    baseResult,
    postOps,
    postPolite,
    connective === null ? null : connectiveForRender(connective, ctx),
    ctx
  );
}

export function renderNounTosuruPredicateCarrier(
  stem: NounStem,
  ops: readonly AuxOpNode[],
  ctx: RenderContext
): RenderOutcome {
  const carrier = ops[0];
  if (!isTosuruPredicateCarrier(carrier)) {
    return { ok: false, reason: "noun to-suru predicate carrier requires to-suru carrier" };
  }
  const mode = nounCarrierTosuruMode(stem, carrier);
  return renderTosuruPredicateCarrierBase(nounTosuruPredicateBase(stem, mode), mode, ops, ctx);
}

export function renderAdjTosuruResultativePredicateCarrier(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  const carrier = layer.ops[0];
  if (
    layer.stem.kind !== "adj" ||
    !isTosuruPredicateCarrier(carrier) ||
    carrier.tosuruMode !== "resultative_make" ||
    !stemIsTosuruResultativeMakeHead(layer.stem)
  ) {
    return null;
  }
  if (layer.ops.slice(1).some((op) => op.kind === "voice")) {
    return null;
  }
  return renderTosuruPredicateCarrierBase(adjTosuruResultativePredicateBase(layer.stem), "resultative_make", layer.ops, ctx);
}

export function renderNounTosuruAttributiveTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.stem.kind !== "noun") {
    return { ok: false, reason: "noun to-suru attributive terminal requires noun stem" };
  }
  const carrier = layer.ops[0];
  if (!isTosuruPredicateCarrier(carrier)) {
    return { ok: false, reason: "noun to-suru attributive terminal requires to-suru carrier" };
  }
  let past = false;
  let voicePassive: VoiceOp | null = null;
  let negation: NegationOp | null = null;
  let likeness: YoudaModalOp | null = null;
  for (let i = 1; i < layer.ops.length; i++) {
    const op = layer.ops[i]!;
    if (op.kind === "tense" && op.tense === "past") {
      past = true;
    } else if (op.kind === "voice" && op.voice === "passive" && voicePassive === null) {
      voicePassive = op;
    } else if (op.kind === "polite") {
      continue;
    } else if (op.kind === "negation" && negation === null) {
      negation = op;
    } else if (
      op.kind === "modal" &&
      op.modal === "youda" &&
      op.terminal === "attributive_na" &&
      !op.past &&
      !op.polite &&
      likeness === null &&
      i === layer.ops.length - 1
    ) {
      likeness = op;
    } else {
      return { ok: false, reason: `op '${op.kind}' after noun to-suru attributive carrier not supported` };
    }
  }
  if (likeness !== null && (past || voicePassive !== null || negation !== null)) {
    return { ok: false, reason: "noun to-suru attributive likeness + tense/voice/negation wrapper not supported" };
  }
  const mode = nounCarrierTosuruMode(layer.stem, carrier);
  const carrierBase = nounTosuruPredicateBase(layer.stem, mode);
  let base: KoreanPredicateBase = carrierBase;
  if (voicePassive !== null) {
    const judgmentPassive = tosuruTreatAsJudgmentPassiveBase(carrierBase, mode, voicePassive);
    if (judgmentPassive !== null) {
      base = judgmentPassive;
    } else {
      const passiveFrame = committedCarrierPostChainFrame(
        { ok: true, base: carrierBase, chainOnFinalSupported: true },
        [voicePassive],
        false,
        null,
        ctx
      );
      if ("ok" in passiveFrame) return passiveFrame;
      if (!passiveFrame.baseResult.ok || passiveFrame.finalNeg !== null || passiveFrame.finalPast) {
        return { ok: false, reason: "noun to-suru attributive resultative passive lowering failed" };
      }
      base = passiveFrame.baseResult.base;
    }
  }
  const baseResult = { ok: true, base, chainOnFinalSupported: true } satisfies OkBaseResult;
  const projected = negation === null
    ? base
    : lowerFinalNegationForCommittedBase(baseResult, negation, ctx.formal, ctx.lookups);
  if (projected === null) {
    return { ok: false, reason: "noun to-suru attributive negation lowering failed" };
  }
  if (likeness !== null) {
    const frame = committedCarrierPostChainFrame(
      { ok: true, base: projected, chainOnFinalSupported: true },
      [likeness],
      false,
      null,
      ctx
    );
    if ("ok" in frame) return frame;
    if (frame.finalNeg !== null) {
      return { ok: false, reason: "noun to-suru attributive likeness final negation not supported" };
    }
    return composeCommittedBaseAttributive(
      frame.baseResult,
      frame.finalPast,
      ctx.formal,
      "lexical",
      "default",
      attributiveProjectionPolicy(layer)
    );
  }
  const attr = projectBaseAttributive(
    projected,
    past || (negation?.chainPast ?? false),
    ctx.formal,
    "lexical",
    "default",
    attributiveProjectionPolicy(layer)
  );
  if (attr === null) {
    return { ok: false, reason: "noun to-suru attributive projection failed" };
  }
  return { ok: true, text: attr, polite: false };
}

export function baseResultForNounScopeBridge(
  op: ScopeBridgeOp,
  noun: string,
  _formal: boolean
): BaseResult {
  if (op.head !== null) {
    return { ok: false, reason: "noun direct scopeBridge supports only bare focus bridge" };
  }
  if (op.particle === "shika") {
    if (op.polarity !== "negative") {
      return { ok: false, reason: "限定 초점 bridge 는 부정 본체로만 닫힌다" };
    }
    if (op.chainDepth > 1) {
      return { ok: false, reason: "noun 限定 scopeBridge negative chain lowering 영역 외" };
    }
    return {
      ok: true,
      base: {
        prefix: `${nounCopulaFutureAttributive(noun)} `,
        final: { kind: "boundNounCopula", nounSurface: "뿐" }
      },
      chainOnFinalSupported: true
    };
  }
  if (op.polarity === "affirmative") {
    const stem = nounCopulaFocusStem(noun);
    return {
      ok: true,
      base: {
        prefix: `${stem}${nounScopeBridgeAffirmativeFocusLabel(op.particle)} `,
        final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: false }
      },
      chainOnFinalSupported: true
    };
  }
  const focusNounParticle = op.particle === "mo"
    ? "도"
    : op.particle === "sae" ? "조차" : null;
  const base: KoreanLemmaPredicateBase = focusNounParticle !== null
    ? {
      prefix: `${noun}${focusNounParticle} `,
      final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false },
      policy: {
        kind: "negative_noun_copula_interop",
        nounSurface: noun,
        conjectureSubject: `${noun}${focusNounParticle} `
      }
    }
    : {
      prefix: `${nounCopulaFocusStem(noun)}지는 `,
      final: { kind: "lemma", lemma: "않다", irregular: null, isVerb: false }
    };
  const lowered = op.chainDepth <= 1
    ? base
    : applyNegationDepthToLemmaBase(base, op.chainDepth - 1);
  if (lowered === null) {
    return { ok: false, reason: "noun direct scopeBridge negative chain lowering 영역 외" };
  }
  const stamped = withNegativeClosureCapability(lowered);
  return {
    ok: true,
    base: stamped,
    ...modalFinalChainPolicy(stamped)
  };
}

function nounScopeBridgeAffirmativeFocusLabel(particle: ScopeBridgeOp["particle"]): string {
  switch (particle) {
    case "mo":
      return "기도";
    case "sae":
      return "기까지";
    default:
      return "기는";
  }
}

export function nounCopulaFutureAttributive(noun: string): string {
  return `${noun}${conjugate("이다", null, "ㄹ/을")}`;
}

function baseResultForNounScopeBridgePotentialHost(
  op: ScopeBridgeOp,
  noun: string,
  allomorphHost?: string
): BaseResult {
  if (op.particle === null) {
    return { ok: false, reason: "noun scopeBridge potential host requires a focus particle kind" };
  }
  return {
    ok: true,
    base: {
      ...nounCopulaBase(noun, false, allomorphHost),
      policy: { kind: "scope_bridge_potential_host", particle: op.particle }
    },
    chainOnFinalSupported: true
  };
}

export function renderNounScopeBridge(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.stem.kind !== "noun") {
    return { ok: false, reason: "renderNounScopeBridge: stem must be noun" };
  }
  const scopeBridge = layer.ops[0] as ScopeBridgeOp;
  let postPolite = scopeBridge.polite;
  let connective: ConnectiveOp | null = null;
  const postOps: AuxOpNode[] = [];
  for (let i = 1; i < layer.ops.length; i++) {
    const op = layer.ops[i]!;
    if (op.kind === "polite") {
      postPolite = true;
      continue;
    }
    if (op.kind === "connective") {
      if (connective !== null) {
        return { ok: false, reason: "multiple connective ops in noun scopeBridge layer not supported" };
      }
      if (i !== layer.ops.length - 1) {
        return { ok: false, reason: "ConnectiveOp on noun scopeBridge must be last" };
      }
      connective = connectiveForRender(op, ctx);
      continue;
    }
    postOps.push(op);
  }
  const baseResult = isCopulaSupportPotentialOp(postOps[0])
    ? baseResultForNounScopeBridgePotentialHost(
      scopeBridge,
      layer.stem.lemma,
      nounCopulaStemAllomorphHost(layer.stem, ctx)
    )
    : baseResultForNounScopeBridge(scopeBridge, layer.stem.lemma, ctx.formal);
  if (!baseResult.ok) {
    return baseResult;
  }
  const singleConjecture = postOps.length === 1 && postOps[0]?.kind === "conjecture"
    ? postOps[0]
    : null;
  if (singleConjecture !== null && connective !== null && isConjectureQuestionContinuationConnective(connective)) {
    return composeCommittedBaseWithConjectureQuestionConnective(
      baseResult,
      connective,
      false,
      ctx.formal,
      postPolite || singleConjecture.polite
    );
  }
  return composeCommittedCarrierPostChain(
    baseResult,
    postOps,
    postPolite,
    connective,
    ctx
  );
}

export function renderNounScopeBridgeAttributiveTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.stem.kind !== "noun") {
    return { ok: false, reason: "renderNounScopeBridgeAttributiveTerminal: stem must be noun" };
  }
  const scopeBridge = layer.ops[0];
  if (scopeBridge?.kind !== "scopeBridge") {
    return { ok: false, reason: "renderNounScopeBridgeAttributiveTerminal requires scopeBridge first op" };
  }
  const postOps = layer.ops.slice(1);
  const baseResult = isCopulaSupportPotentialOp(postOps[0])
    ? baseResultForNounScopeBridgePotentialHost(
      scopeBridge,
      layer.stem.lemma,
      nounCopulaStemAllomorphHost(layer.stem, ctx)
    )
    : baseResultForNounScopeBridge(scopeBridge, layer.stem.lemma, ctx.formal);
  if (!baseResult.ok) {
    return baseResult;
  }
  let projectedBase = baseResult.base;
  let projectedPast = false;
  if (postOps.length > 0) {
    const opChain = collectOperatorChain(postOps);
    const firstHeadIdx = opChain.length === 0 ? -1 : postOps.indexOf(opChain[0]!);
    let preNeg: NegationOp | null = null;
    let stemPast = false;
    const postTenses: TenseOp[] = [];
    const postNegations: NegationOp[] = [];
    for (let i = 0; i < postOps.length; i++) {
      const op = postOps[i]!;
      if (isHeadOp(op)) continue;
      if (op.kind === "polite") continue;
      if (op.kind === "tense") {
        if (firstHeadIdx === -1 || i < firstHeadIdx) stemPast = true;
        else postTenses.push(op);
        continue;
      }
      if (op.kind === "negation") {
        if (firstHeadIdx === -1 || i < firstHeadIdx) {
          if (preNeg !== null) return { ok: false, reason: "multiple noun scopeBridge attributive pre-chain negations not supported" };
          preNeg = op;
        } else postNegations.push(op);
        continue;
      }
      return { ok: false, reason: "noun scopeBridge attributive post-chain contains non-chain operator" };
    }
    if (opChain.length === 0) {
      if (preNeg !== null) {
        const loweredNoChainNeg = lowerFinalNegationForCommittedBase(baseResult, preNeg, ctx.formal, ctx.lookups);
        if (loweredNoChainNeg === null) {
          return { ok: false, reason: "noun scopeBridge attributive negation without operator chain not supported" };
        }
        projectedBase = loweredNoChainNeg;
      }
      const attrNoChain = projectBaseAttributive(
        projectedBase,
        stemPast,
        ctx.formal,
        "lexical",
        "default",
        attributiveProjectionPolicy(layer)
      );
      return attrNoChain === null
        ? { ok: false, reason: "noun scopeBridge attributive projection failed" }
        : { ok: true, text: attrNoChain, polite: false };
    }
    const findSlot = (wrapper: AuxOpNode): number | null => {
      const wrapperIdx = postOps.indexOf(wrapper);
      let slot = -1;
      for (let chainIdx = 0; chainIdx < opChain.length; chainIdx++) {
        if (postOps.indexOf(opChain[chainIdx]!) < wrapperIdx) slot = chainIdx;
      }
      return slot < 0 ? null : slot;
    };
    const pastAfterChainIdx = new Map<number, TenseOp>();
    for (const op of postTenses) {
      const slot = findSlot(op);
      if (slot === null) return { ok: false, reason: "noun scopeBridge attributive post-chain tense slot invariant violation" };
      pastAfterChainIdx.set(slot, op);
    }
    const negAfterChainIdx = new Map<number, NegationOp>();
    for (const op of postNegations) {
      const slot = findSlot(op);
      if (slot === null) return { ok: false, reason: "noun scopeBridge attributive post-chain negation slot invariant violation" };
      negAfterChainIdx.set(slot, op);
    }
    const folded = chainBases(opChain, layer.stem.lemma, null, false, {
      lookups: ctx.lookups,
      stemPrefix: undefined,
      initialBaseResult: baseResult,
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
    if (folded.finalNeg !== null) {
      const loweredNeg = lowerFinalNegationForCommittedBase(folded, folded.finalNeg, ctx.formal, ctx.lookups);
      if (loweredNeg === null) {
        return { ok: false, reason: "noun scopeBridge attributive final negation not supported" };
      }
      projectedBase = loweredNeg;
      projectedPast = folded.finalPast;
      const attrNeg = projectBaseAttributive(
        projectedBase,
        projectedPast,
        ctx.formal,
        folded.finalPastProjection,
        "default",
        attributiveProjectionPolicy(layer)
      );
      return attrNeg === null
        ? { ok: false, reason: "noun scopeBridge attributive projection failed" }
        : { ok: true, text: attrNeg, polite: false };
    }
    projectedBase = folded.base;
    projectedPast = folded.finalPast;
  }
  const attr = projectBaseAttributive(
    projectedBase,
    projectedPast,
    ctx.formal,
    "lexical",
    "default",
    attributiveProjectionPolicy(layer)
  );
  if (attr === null) {
    return { ok: false, reason: "noun scopeBridge attributive projection failed" };
  }
  return { ok: true, text: attr, polite: false };
}

export function nominalPredicateStemFromNounLemma(stem: NounStem): AdjStem | VerbStem | null {
  const parts = stem.lemma.trim().split(/\s+/u);
  if (parts.length < 2) {
    return null;
  }
  const nominalPredicate = parts.at(-1);
  if (nominalPredicate !== "있음" && nominalPredicate !== "없음") {
    return null;
  }
  const subject = parts.slice(0, -1).join(" ");
  if (subject.length === 0) {
    return null;
  }
  const shared = {
    source: stem.source,
    conjugationAnchor: stem.conjugationAnchor,
    semanticAnchors: stem.semanticAnchors,
    ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
    ...(stem.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: stem.shortNegationPolicy }),
    ...(stem.absorbedPassiveAux === true ? { absorbedPassiveAux: true as const } : {}),
    ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
    koreanPrefix: `${subject}${selectParticle(subject, "이/가")} `
  };
  return nominalPredicate === "있음"
    ? {
      kind: "verb",
      lemma: "있다",
      conj: "godan",
      irregular: null,
      ...shared
    }
    : {
      kind: "adj",
      lemma: "없다",
      irregular: null,
      ...shared
    };
}

export function baseResultForNounCopulaConnective(
  baseResult: OkBaseResult,
  stem: NounStem,
  connective: ConnectiveOp
): OkBaseResult {
  if (
    connective.connective === "question_reformulation" &&
    stem.adverbialNominalFallback === true &&
    baseResult.base.final.kind === "nounCopula"
  ) {
    return {
      ...baseResult,
      base: { ...baseResult.base, final: { ...baseResult.base.final, adverbialNominalFallback: true } }
    };
  }
  if (!isMonoBoundReasonConnective(connective)) {
    return baseResult;
  }
  const keijoujiBase = keijoujiPossibleNounCopulaPredicateBase(stem);
  return keijoujiBase === null
    ? baseResult
    : { ...baseResult, base: keijoujiBase, chainOnFinalSupported: true };
}

function keijoujiPossibleNounCopulaPredicateBase(stem: NounStem): KoreanLemmaPredicateBase | null {
  const sourceToken = stem.source.tokens[stem.semanticAnchors[0] ?? stem.conjugationAnchor];
  if (sourceToken === undefined || !isNaAdjCapableNoun(sourceToken)) {
    return null;
  }
  const lemma = stem.lemma.endsWith("하다") ? stem.lemma : `${stem.lemma}하다`;
  return {
    prefix: stem.koreanPrefix ?? "",
    final: { kind: "lemma", lemma, irregular: "여", isVerb: false }
  };
}

export function residualConjectureSuffix(conjecture: ConjectureOp): string {
  return conjecture.polite ? "겠죠" : "겠지";
}

export function renderNominalHostLikeness(
  noun: string,
  ops: readonly AuxOpNode[],
  ctx: RenderContext,
  attrPolicy: AttributiveProjectionPolicy = "present"
): RenderOutcome {
  const modal = ops[0] as YoudaModalOp;
  const chained = renderNominalHostLikenessOperatorChain(noun, modal, ops.slice(1), ctx, attrPolicy);
  if (chained !== null) {
    return chained;
  }
  let polite = modal.polite;
  let past = modal.past;
  let finalNeg: NegationOp | null = null;
  let connective: ConnectiveOp | null = null;
  let scopeBridge: ScopeBridgeOp | null = null;
  let predicateQuoteCarrier: PredicateQuoteCarrierOp | null = null;
  let postScopePolite = false;
  let postScopePast = false;
  for (let i = 1; i < ops.length; i++) {
    const op = ops[i]!;
    if (scopeBridge !== null) {
      if (op.kind === "polite") {
        postScopePolite = true;
        continue;
      }
      if (op.kind === "tense" && op.tense === "past") {
        postScopePast = true;
        continue;
      }
      if (op.kind === "connective") {
        if (connective !== null) {
          return { ok: false, reason: "multiple connective ops in nominal likeness scope layer not supported" };
        }
        if (i !== ops.length - 1) {
          return { ok: false, reason: "ConnectiveOp on nominal likeness scope must be last" };
        }
        connective = op;
        continue;
      }
      return { ok: false, reason: `op '${op.kind}' after nominal likeness scopeBridge not yet supported` };
    }
    if (op.kind === "scopeBridge") {
      scopeBridge = op;
      continue;
    }
    if (op.kind === "connective") {
      if (connective !== null) {
        return { ok: false, reason: "multiple connective ops in nominal likeness layer not supported" };
      }
      if (i !== ops.length - 1) {
        return { ok: false, reason: "ConnectiveOp on nominal likeness must be last" };
      }
      connective = op;
      continue;
    }
    if (op.kind === "predicateQuoteCarrier") {
      if (predicateQuoteCarrier !== null) {
        return { ok: false, reason: "multiple predicate quote carriers in nominal likeness layer not supported" };
      }
      if (i !== ops.length - 1) {
        return { ok: false, reason: "predicate quote carrier on nominal likeness must be last" };
      }
      predicateQuoteCarrier = op;
      continue;
    }
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (op.kind === "tense" && op.tense === "past") {
      past = true;
      continue;
    }
    if (op.kind === "negation") {
      if (finalNeg !== null) {
        return { ok: false, reason: "multiple negation ops in nominal likeness layer not supported" };
      }
      finalNeg = op;
      continue;
    }
    return { ok: false, reason: `op '${op.kind}' on nominal likeness not yet supported` };
  }
  const formal = ctx.formal;
  const base = {
    prefix: `${noun} `,
    final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false }
  } satisfies KoreanLemmaPredicateBase;
  const baseResult = { ok: true, base, ...modalFinalChainPolicy(base) } satisfies BaseResult;
  if (scopeBridge !== null) {
    if (modal.terminal === "attributive_na") {
      return { ok: false, reason: "attributive nominal likeness + scopeBridge not supported" };
    }
    const bridgeBase = scopeBridgeBase(scopeBridge, base, {
      lookups: ctx.lookups,
      preModalNeg: finalNeg,
      past,
      pastProjection: "lexical",
      formal: ctx.formal,
      hasFollowingOp: connective !== null,
      shortNegationPolicy: undefined,
      sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
      passiveStemOptions: {},
      forbidShortNegation: false,
      desiredPredicateNegation: null
    });
    if (!bridgeBase.ok) {
      return bridgeBase;
    }
    if (connective !== null) {
      return composeCommittedTailConnective(
        bridgeBase,
        connectiveForRender(connective, ctx),
        postScopePast,
        postScopePolite && shouldCarryConnectivePoliteness(ctx),
        null,
        ctx.formal, ctx.lookups
      );
    }
    return composeCommittedTailTerminal(
      bridgeBase,
      null,
      postScopePast,
      ctx.formal,
      scopeBridge.polite || postScopePolite,
      ctx.lookups
    );
  }
  if (predicateQuoteCarrier !== null) {
    const quoted = predicateQuoteCarrierBase({
      op: predicateQuoteCarrier,
      inputBase: base,
      lookups: ctx.lookups,
      preStemNeg: finalNeg,
      stemPast: past
    });
    if (!quoted.ok) {
      return quoted;
    }
    const attr = projectBaseAttributive(quoted.base, false, formal, "lexical", "default", attrPolicy);
    return attr === null
      ? { ok: false, reason: "nominal likeness predicate quote attributive projection failed" }
      : { ok: true, text: attr, polite: false };
  }
  if (modal.terminal === "attributive_na") {
    if (connective !== null) {
      return composeCommittedTailConnective(
        baseResult,
        connectiveForRender(connective, ctx),
        past,
        false,
        finalNeg,
        formal, ctx.lookups
      );
    }
    const projectedBase = finalNeg === null
      ? base
      : lowerFinalNegationForCommittedBase(baseResult, finalNeg, formal, ctx.lookups);
    if (projectedBase === null) {
      return { ok: false, reason: "attributive nominal likeness final negation lowering not supported" };
    }
    const loweredForcesPast = finalNeg === null
      ? false
      : finalNegationLoweringForcesPast(baseResult, finalNeg.chainDepth);
    const attr = projectBaseAttributive(
      projectedBase,
      past || (finalNeg?.chainPast ?? false) || loweredForcesPast,
      formal,
      "lexical",
      "default",
      attrPolicy
    );
    return attr === null
      ? { ok: false, reason: "attributive nominal likeness projection not supported" }
      : { ok: true, text: attr, polite: false };
  }
  if (modal.terminal === "adverbial_ni") {
    if (finalNeg !== null || past || (connective !== null && connective.connective !== "exemplification")) {
      return { ok: false, reason: "adverbial nominal likeness with terminal chain not supported" };
    }
    return { ok: true, text: `${noun}처럼`, polite: false };
  }
  if (connective !== null) {
    const connectivePolite = polite && shouldCarryConnectivePoliteness(ctx);
    return composeCommittedTailConnective(
      baseResult,
      connectiveForRender(connective, ctx),
      past,
      connectivePolite,
      finalNeg,
      formal, ctx.lookups
    );
  }
  return composeCommittedTailTerminal(baseResult, finalNeg, past, formal, polite, ctx.lookups);
}

function renderNominalHostLikenessOperatorChain(
  noun: string,
  modal: YoudaModalOp,
  ops: readonly AuxOpNode[],
  ctx: RenderContext,
  attrPolicy: AttributiveProjectionPolicy
): RenderOutcome | null {
  const opChain = collectOperatorChain(ops);
  if (opChain.length === 0) {
    return null;
  }

  const operatorHeadIdx = ops.findIndex(isHeadOp);
  let preNeg: NegationOp | null = null;
  let preTense: TenseOp | null = null;
  const postNegations: NegationOp[] = [];
  const postTenses: TenseOp[] = [];
  let polite = modal.polite;
  let connective: ConnectiveOp | null = null;

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (opCarriesTerminalRolePoliteness(op)) {
      polite = true;
    }
    if (op.kind === "tense") {
      if (op.tense !== "past") {
        return { ok: false, reason: `nominal likeness chain tense '${op.tense}' not supported` };
      }
      if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
        if (preTense !== null) {
          return { ok: false, reason: "multiple nominal likeness pre-chain tense ops not supported" };
        }
        preTense = op;
      } else {
        postTenses.push(op);
      }
      continue;
    }
    if (op.kind === "negation") {
      if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
        if (preNeg !== null) {
          return { ok: false, reason: "multiple nominal likeness pre-chain negation ops not supported" };
        }
        preNeg = op;
      } else {
        postNegations.push(op);
      }
      continue;
    }
    if (op.kind === "connective") {
      if (connective !== null) {
        return { ok: false, reason: "multiple nominal likeness chain connective ops not supported" };
      }
      if (i !== ops.length - 1) {
        return { ok: false, reason: "nominal likeness chain connective must be final" };
      }
      connective = connectiveForRender(op, ctx);
      continue;
    }
    if (isHeadOp(op)) {
      continue;
    }
    return { ok: false, reason: `op '${op.kind}' in nominal likeness operator chain not supported` };
  }

  const findChainSlot = (wrapOp: AuxOpNode): number | null => {
    const wrapIdx = ops.indexOf(wrapOp);
    if (wrapIdx < 0) return null;
    for (let chainIdx = 0; chainIdx < opChain.length; chainIdx++) {
      const startIdx = ops.indexOf(opChain[chainIdx]!);
      const nextIdx = chainIdx + 1 < opChain.length
        ? ops.indexOf(opChain[chainIdx + 1]!)
        : ops.length;
      if (startIdx < wrapIdx && wrapIdx < (nextIdx < 0 ? ops.length : nextIdx)) {
        return chainIdx;
      }
    }
    return null;
  };

  const pastAfterChainIdx = new Map<number, TenseOp>();
  for (const tenseOp of postTenses) {
    const slot = findChainSlot(tenseOp);
    if (slot === null) {
      return { ok: false, reason: "nominal likeness chain post tense 위치 식별 실패" };
    }
    if (pastAfterChainIdx.has(slot)) {
      return { ok: false, reason: "multiple nominal likeness post tense ops in same chain slot not supported" };
    }
    pastAfterChainIdx.set(slot, tenseOp);
  }

  const negAfterChainIdx = new Map<number, NegationOp>();
  for (const negOp of postNegations) {
    const slot = findChainSlot(negOp);
    if (slot === null) {
      return { ok: false, reason: "nominal likeness chain post negation 위치 식별 실패" };
    }
    if (negAfterChainIdx.has(slot)) {
      return { ok: false, reason: "multiple nominal likeness post negation ops in same chain slot not supported" };
    }
    negAfterChainIdx.set(slot, negOp);
  }

  const baseRes = chainBases(opChain, "같다", null, false, {
    lookups: ctx.lookups,
    stemPrefix: `${noun} `,
    preModalNeg: preNeg,
    stemPast: modal.past || preTense !== null,
    pastAfterChainIdx,
    negAfterChainIdx,
    formal: ctx.formal,
    shortNegationPolicy: undefined,
    absorbedPassiveAux: false,
    passiveStemOptions: {}
  });
  if (!baseRes.ok) {
    return { ok: false, reason: baseRes.reason };
  }

  let isPoliteCombined = polite;
  for (const op of opChain) {
    if (op.kind === "modal" && op.polite) isPoliteCombined = true;
    else if (op.kind === "conjecture" && op.polite) isPoliteCombined = true;
    else if (op.kind === "predicateProjectionCarrier" && op.polite === true) isPoliteCombined = true;
    else if (op.kind === "scopeBridge" && op.polite) isPoliteCombined = true;
  }

  if (connective !== null) {
    const connectivePolite =
      isPoliteCombined &&
      (shouldCarryConnectivePoliteness(ctx) ||
        scopeCarrierCanPreserveSourcePoliteness(baseRes.base, connective));
    return composeCommittedTailConnective(
      baseRes,
      connective,
      baseRes.finalPast,
      connectivePolite,
      baseRes.finalNeg,
      ctx.formal, ctx.lookups
    );
  }

  const chainQuoteCarrier = opChain[opChain.length - 1];
  if (chainQuoteCarrier?.kind === "predicateQuoteCarrier" && chainQuoteCarrier.sourceTerminal !== true) {
    const finalBaseResult = {
      ok: true,
      base: baseRes.base,
      chainOnFinalSupported: baseRes.chainOnFinalSupported,
      ...(baseRes.finalNegationOptions === undefined ? {} : { finalNegationOptions: baseRes.finalNegationOptions }),
      ...(baseRes.finalNegationLoweringPolicy === undefined ? {} : { finalNegationLoweringPolicy: baseRes.finalNegationLoweringPolicy })
    } satisfies OkBaseResult;
    const projectedBase = baseRes.finalNeg === null
      ? baseRes.base
      : lowerFinalNegationForCommittedBase(finalBaseResult, baseRes.finalNeg, ctx.formal, ctx.lookups);
    if (projectedBase === null) {
      return { ok: false, reason: "nominal likeness predicate quote final negation lowering not supported" };
    }
    const loweredForcesPast = baseRes.finalNeg === null
      ? false
      : finalNegationLoweringForcesPast(finalBaseResult, baseRes.finalNeg.chainDepth);
    const attr = projectBaseAttributive(
      projectedBase,
      baseRes.finalPast ||
      (baseRes.finalNeg?.chainPast ?? false) ||
      loweredForcesPast,
      ctx.formal,
      "lexical",
      "default",
      attrPolicy
    );
    return attr === null
      ? { ok: false, reason: "nominal likeness predicate quote chain projection failed" }
      : { ok: true, text: attr, polite: false };
  }

  return composeCommittedTailTerminal(
    baseRes,
    baseRes.finalNeg,
    baseRes.finalPast,
    ctx.formal,
    isPoliteCombined,
    ctx.lookups
  );
}

export function copulaVariantConnective(
  copula: CopulaOp,
  surface: string,
  connective: ConnectiveKind
): ConnectiveOp {
  return createConnectiveOp({  connective, surface, source: copula.source });
}

export type CommittedCarrierWrapperKind = "polite" | "negation" | "tense";

export interface CommittedCarrierWrapperSourceAllocation {
  readonly opIndex: number;
  readonly kind: CommittedCarrierWrapperKind;
  readonly sourceTokens: readonly RuntimeHaruToken[];
}

export interface CommittedCarrierPostChainFrame {
  readonly baseResult: BaseResult;
  readonly finalNeg: NegationOp | null;
  readonly finalPast: boolean;
  readonly terminalPolite: boolean;
  readonly connectivePolite: boolean;
  readonly wrapperSourceAllocations: readonly CommittedCarrierWrapperSourceAllocation[];
}

function committedCarrierWrapperSourceAllocations(
  postOps: readonly AuxOpNode[]
): readonly CommittedCarrierWrapperSourceAllocation[] {
  const wrappers = postOps
    .map((op, opIndex) => ({ op, opIndex }))
    .filter((entry): entry is {
      readonly op: Extract<AuxOpNode, { readonly kind: CommittedCarrierWrapperKind }>;
      readonly opIndex: number;
    } =>
      entry.op.kind === "polite" ||
      entry.op.kind === "negation" ||
      entry.op.kind === "tense"
    );
  const priority = (kind: CommittedCarrierWrapperKind): number =>
    kind === "negation" ? 0 : kind === "tense" ? 1 : 2;
  const owners = [...wrappers].sort((left, right) =>
    priority(left.op.kind) - priority(right.op.kind) ||
    left.opIndex - right.opIndex
  );
  const allocated = new Set<RuntimeHaruToken>();
  const tokensByOpIndex = new Map<number, RuntimeHaruToken[]>();
  for (const owner of owners) {
    const sourceTokens: RuntimeHaruToken[] = [];
    for (const token of owner.op.source.tokens) {
      if (allocated.has(token)) continue;
      allocated.add(token);
      sourceTokens.push(token);
    }
    tokensByOpIndex.set(owner.opIndex, sourceTokens);
  }
  return wrappers.map(({ op, opIndex }) => ({
    opIndex,
    kind: op.kind,
    sourceTokens: tokensByOpIndex.get(opIndex) ?? []
  }));
}

function sealCommittedCarrierChainSourceTrace(
  baseResult: BaseResult,
  postOps: readonly AuxOpNode[]
): BaseResult {
  if (!baseResult.ok || baseResult.chainSourceTrace === undefined) {
    return baseResult;
  }
  const allocated = new Set<RuntimeHaruToken>();
  const prefixSegments = baseResult.chainSourceTrace.prefixSegments;
  for (const segment of prefixSegments) {
    for (const token of segment.sourceTokens) {
      allocated.add(token);
    }
  }
  const finalSourceTokens: RuntimeHaruToken[] = [];
  for (const token of [
    ...baseResult.chainSourceTrace.finalSourceTokens,
    ...postOps.flatMap((op) => op.source.tokens)
  ]) {
    if (allocated.has(token)) continue;
    allocated.add(token);
    finalSourceTokens.push(token);
  }
  finalSourceTokens.sort((left, right) =>
    (runtimeTokenSourceSpan(left)?.startOrdinal ?? Number.MAX_SAFE_INTEGER) -
    (runtimeTokenSourceSpan(right)?.startOrdinal ?? Number.MAX_SAFE_INTEGER)
  );
  return {
    ...baseResult,
    chainSourceTrace: {
      ...baseResult.chainSourceTrace,
      prefixSegments,
      finalSourceTokens
    }
  };
}

export function committedCarrierPostChainFrame(
  quotedBase: BaseResult,
  postOps: readonly AuxOpNode[],
  postPolite: boolean,
  connective: ConnectiveOp | null,
  ctx: RenderContext
): CommittedCarrierPostChainFrame | RenderFailure {
  if (!quotedBase.ok) {
    return { ok: false, reason: quotedBase.reason };
  }
  const effectivePostPolite = postPolite || postOps.some((op) =>
    op.kind === "polite" ||
    (op.kind === "modal" && op.polite)
  );
  let preNeg: NegationOp | null = null;
  let preTense: TenseOp | null = null;
  const postTenses: Array<{ readonly op: TenseOp; readonly index: number }> = [];
  const postNegations: Array<{ readonly op: NegationOp; readonly index: number }> = [];
  const opChain = collectOperatorChain(postOps);
  let nextChainSearchIndex = 0;
  const opChainPositions = opChain.map((chainOp) => {
    for (let index = nextChainSearchIndex; index < postOps.length; index++) {
      if (postOps[index] !== chainOp) continue;
      nextChainSearchIndex = index + 1;
      return index;
    }
    return -1;
  });
  const operatorHeadIdx = opChainPositions[0] ?? -1;

  for (let opIdx = 0; opIdx < postOps.length; opIdx++) {
    const op = postOps[opIdx]!;
    if (op.kind === "polite") {
      continue;
    }
    if (op.kind === "tense") {
      if (operatorHeadIdx === -1 || opIdx < operatorHeadIdx) {
        if (preTense !== null) {
          return { ok: false, reason: "multiple committed carrier pre-chain tense ops not supported" };
        }
        preTense = op;
      } else {
        postTenses.push({ op, index: opIdx });
      }
      continue;
    }
    if (op.kind === "negation") {
      if (operatorHeadIdx === -1 || opIdx < operatorHeadIdx) {
        if (preNeg !== null) {
          return { ok: false, reason: "multiple committed carrier pre-chain negation ops not supported" };
        }
        preNeg = op;
      } else {
        postNegations.push({ op, index: opIdx });
      }
      continue;
    }
    if (isHeadOp(op)) {
      continue;
    }
    return { ok: false, reason: `op '${op.kind}' after committed carrier not supported` };
  }

  let baseResult: BaseResult = quotedBase;
  let finalNeg = preNeg;
  let finalPast = preTense !== null;
  if (opChain.length > 0) {
    const hazuKamoPastTraceRebindings: Array<{
      readonly tense: TenseOp;
      readonly kamo: Extract<AuxOpNode, { readonly kind: "modal" }>;
    }> = [];
    const findChainSlot = (wrapOp: AuxOpNode, wrapIdx: number): number | null => {
      if (wrapOp.kind === "tense") {
        const followingChainIdx = opChainPositions.findIndex((position) => position > wrapIdx);
        const following = followingChainIdx < 0 ? undefined : opChain[followingChainIdx];
        const hasHazuCarrier = opChain.slice(0, followingChainIdx).some((op) =>
          op.kind === "modal" && op.modal === "hazu"
        );
        if (hasHazuCarrier && following?.kind === "modal" && following.modal === "kamo") {
          hazuKamoPastTraceRebindings.push({ tense: wrapOp, kamo: following });
          return followingChainIdx;
        }
      }
      for (let chainIdx = 0; chainIdx < opChain.length; chainIdx++) {
        const startIdx = opChainPositions[chainIdx] ?? -1;
        const nextIdx = chainIdx + 1 < opChain.length
          ? opChainPositions[chainIdx + 1] ?? postOps.length
          : postOps.length;
        if (startIdx < wrapIdx && wrapIdx < (nextIdx < 0 ? postOps.length : nextIdx)) {
          return chainIdx;
        }
      }
      return null;
    };
    const pastAfterChainIdx = new Map<number, TenseOp>();
    for (const { op: tenseOp, index } of postTenses) {
      const slot = findChainSlot(tenseOp, index);
      if (slot === null) {
        return { ok: false, reason: "committed carrier post-chain tense slot not found" };
      }
      if (pastAfterChainIdx.has(slot)) {
        return { ok: false, reason: "multiple committed carrier post-chain tense ops in same slot not supported" };
      }
      pastAfterChainIdx.set(slot, tenseOp);
    }
    const negAfterChainIdx = new Map<number, NegationOp>();
    for (const { op: negOp, index } of postNegations) {
      const slot = findChainSlot(negOp, index);
      if (slot === null) {
        return { ok: false, reason: "committed carrier post-chain negation slot not found" };
      }
      if (negAfterChainIdx.has(slot)) {
        return { ok: false, reason: "multiple committed carrier post-chain negation ops in same slot not supported" };
      }
      negAfterChainIdx.set(slot, negOp);
    }
    const quotedBaseTrace = (quotedBase as BaseResult & { readonly chainSourceTrace?: ChainSourceTrace }).chainSourceTrace;
    const quotedLemma = quotedBase.base.final.kind === "lemma"
      ? quotedBase.base.final
      : { lemma: "이다", irregular: null, isVerb: false } as const;
    const chainResult = chainBases(
      opChain,
      quotedLemma.lemma,
      quotedLemma.irregular,
      quotedLemma.isVerb,
      {
        lookups: ctx.lookups,
        stemPrefix: undefined,
        initialBaseResult: {
          ...quotedBase,
          chainOnFinalSupported: quotedBase.chainOnFinalSupported ?? true
        },
        ...(quotedBaseTrace === undefined
          ? {}
          : { initialChainSourceTrace: quotedBaseTrace }),
        ...(quotedBase.base.policy === undefined ? {} : { initialPolicy: quotedBase.base.policy }),
        preModalNeg: preNeg,
        stemPast: preTense !== null,
        ...(preTense === null ? {} : { stemPastSourceTokens: preTense.source.tokens }),
        pastAfterChainIdx,
        negAfterChainIdx,
        formal: ctx.formal,
        shortNegationPolicy: undefined,
        absorbedPassiveAux: false,
        passiveStemOptions: {}
      }
    );
    if (!chainResult.ok) {
      return { ok: false, reason: chainResult.reason };
    }
    const reboundTrace = chainResult.chainSourceTrace === undefined
      ? undefined
      : hazuKamoPastTraceRebindings.reduce<ChainSourceTrace>(
      (trace, binding) => {
        const carrierIdx = trace.prefixSegments.findIndex((segment) =>
          segment.sourceTokens.some((token) => binding.kamo.source.tokens.includes(token))
        );
        if (carrierIdx <= 0) return trace;
        const prefixSegments = [...trace.prefixSegments];
        const hostSegment = prefixSegments[carrierIdx - 1]!;
        prefixSegments[carrierIdx - 1] = {
          ...hostSegment,
          sourceTokens: [...hostSegment.sourceTokens, ...binding.tense.source.tokens]
        };
        return {
          ...trace,
          prefixSegments,
          finalSourceTokens: trace.finalSourceTokens.filter((token) =>
            !binding.tense.source.tokens.includes(token)
          )
        };
      },
        chainResult.chainSourceTrace
      );
    const { finalNeg: chainFinalNeg, finalPast: chainFinalPast, ...chainBaseRest } = chainResult;
    const chainBase = reboundTrace === undefined
      ? chainBaseRest
      : { ...chainBaseRest, chainSourceTrace: reboundTrace };
    baseResult = chainBase;
    finalNeg = chainFinalNeg;
    finalPast = chainFinalPast;
  }

  baseResult = sealCommittedCarrierChainSourceTrace(baseResult, postOps);
  return {
    baseResult,
    finalNeg,
    finalPast,
    terminalPolite: effectivePostPolite,
    connectivePolite: effectivePostPolite &&
      connective !== null &&
      shouldCarryConnectivePoliteness(ctx),
    wrapperSourceAllocations: committedCarrierWrapperSourceAllocations(postOps)
  };
}

export function composeCommittedCarrierPostChainAttributive(
  quotedBase: BaseResult,
  postOps: readonly AuxOpNode[],
  postPolite: boolean,
  connective: ConnectiveOp | null,
  ctx: RenderContext,
  attrPolicy: AttributiveProjectionPolicy
): RenderOutcome | null {
  if (connective !== null) {
    return null;
  }
  const frame = committedCarrierPostChainFrame(quotedBase, postOps, postPolite, null, ctx);
  if ("ok" in frame) {
    return frame;
  }
  if (frame.finalNeg !== null) {
    return null;
  }
  return composeCommittedBaseAttributive(
    frame.baseResult,
    frame.finalPast,
    ctx.formal,
    "lexical",
    "default",
    attrPolicy
  );
}

export function composeCommittedCarrierPostChain(
  quotedBase: BaseResult,
  postOps: readonly AuxOpNode[],
  postPolite: boolean,
  connective: ConnectiveOp | null,
  ctx: RenderContext
): RenderOutcome {
  const { formal, lookups } = ctx;
  const frame = committedCarrierPostChainFrame(
    quotedBase,
    postOps,
    postPolite,
    connective,
    ctx
  );
  if ("ok" in frame) {
    return frame;
  }
  if (connective !== null) {
    return composeCommittedTailConnective(
      frame.baseResult,
      connective,
      frame.finalPast,
      frame.connectivePolite,
      frame.finalNeg,
      formal, lookups
    );
  }
  return composeCommittedTailTerminal(
    frame.baseResult,
    frame.finalNeg,
    frame.finalPast,
    formal,
    frame.terminalPolite,
    lookups
  );
}
