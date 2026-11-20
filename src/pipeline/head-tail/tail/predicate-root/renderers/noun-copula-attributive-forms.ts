import { selectParticle } from "../../../../../generator/particles.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { nominalAttributiveSurface, resolveNominalAttributiveEvidence, type NominalAttributiveEvidence } from "../../../../attributive.js";
import { isTekiDerivationSuffixToken } from "../derivational-suffix-table.js";
import { isHumanReferentToken } from "../../../candidate/semantic-classifiers.js";
import { POS4, POS5A, 助動詞_ダ, 連体形_, isNaAdjCapable } from "../../../../../types/pos.js";
import { attributiveProjectionPolicy, headRequiresFutureAttributiveProjection } from "../attributive-head-policy.js";
import type { AuxLayerNode, AuxOpNode, ConnectiveOp, ModalOp, NegationOp, NounStem, PredicateQuoteCarrierOp, TenseOp, YoudaModalOp } from "../grammar.js";
import { NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT } from "../short-negation-policy.js";
import { isFutureAttributiveProjection, applyNegationDepthToLemmaBase, closeChainTraceAgainstText, splitNegativeNounCopulaSourceTokens, stemHostTraceSegment, tracedSeg, type AttributiveProjectionPolicy, type BaseResult, type ChainSourceTrace, type OkBaseResult, type RenderContext, type RenderFailure, type RenderOutcome, type TailTraceSegment } from "./base-model.js";
import { applyExternalNegationDepthToPredicateBase, applyNonLastPrefixContractions, nounCopulaStemAllomorphHost, lowerFinalNegationForCommittedBase, honorificNegativeNounCopulaBase, nounCopulaBaseForCopula, nounCopulaPolarityBaseForCopula, nounSubjectPart, copulaCarrierBaseForInterOp } from "./base-support.js";
import { projectBaseAttributive } from "./predicate-base-projection.js";
import { modalFinalChainPolicy } from "./modal-bases.js";
import { predicateQuoteCarrierBase } from "./predicate-bases.js";
import { chainBases, chainStemTraceFields, collectOperatorChain, isHeadOp, opCarriesIntrinsicPast, opToBase } from "./op-chain.js";
import { buildNounPredicateProjectionCarrier, composeCommittedCarrierPostChain, composeCommittedCarrierPostChainAttributive, renderNominalHostLikeness } from "./noun-copula.js";
import { predicateQuoteCarrierPostChainFromIndex } from "./attributive-tail-forms.js";

export function renderNounProjectionCarrierAttributiveTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
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
  return null;
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

export interface NounCopulaAttributiveOpState {
  past: boolean;
  externalNegation: NegationOp | null;
  readonly modalChain: ModalOp[];
  postModalNeg: NegationOp | null;
  postModalPast: boolean;
  predicateQuoteCarrier:
    | {
      readonly op: PredicateQuoteCarrierOp;
      readonly postOps: readonly AuxOpNode[];
      readonly postPolite: boolean;
      readonly connective: ConnectiveOp | null;
    }
    | null;
}

export function renderNounCopulaConjectureAttributiveChain(
  layer: AuxLayerNode & { readonly stem: NounStem },
  ctx: RenderContext,
  noun: string,
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>
): RenderOutcome | null {
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
  return null;
}

export function collectNounCopulaAttributiveOps(layer: AuxLayerNode, state: NounCopulaAttributiveOpState): RenderFailure | null {
  for (let i = 1; i < layer.ops.length; i++) {
    const op = layer.ops[i]!;
    if (op.kind === "tense") {
      if (op.tense !== "past") {
        return { ok: false, reason: `noun copula attributive tense '${op.tense}' not supported` };
      }
      if (state.modalChain.length > 0) {
        if (state.postModalPast) {
          return { ok: false, reason: "multiple noun copula attributive post-modal tense ops not supported" };
        }
        state.postModalPast = true;
      } else {
        if (state.past) {
          return { ok: false, reason: "multiple noun copula attributive tense ops not supported" };
        }
        state.past = true;
      }
      continue;
    }
    if (op.kind === "polite") {
      continue;
    }
    if (op.kind === "negation") {
      if (state.modalChain.length > 0) {
        if (state.postModalNeg !== null) {
          return { ok: false, reason: "multiple noun copula attributive post-modal negation ops not supported" };
        }
        state.postModalNeg = op;
      } else {
        if (state.externalNegation !== null) {
          return { ok: false, reason: "multiple noun copula attributive negation ops not supported" };
        }
        state.externalNegation = op;
      }
      continue;
    }
    if (op.kind === "modal" && op.modal !== "souda_hearsay") {
      state.modalChain.push(op);
      continue;
    }
    if (op.kind === "predicateQuoteCarrier") {
      if (state.predicateQuoteCarrier !== null) {
        return { ok: false, reason: "multiple noun copula predicate quote carriers not supported" };
      }
      const postChain = predicateQuoteCarrierPostChainFromIndex(layer.ops, i);
      if (postChain === null) {
        return { ok: false, reason: "noun copula predicate quote carrier has unsupported post-chain" };
      }
      state.predicateQuoteCarrier = { op, ...postChain };
      break;
    }
    return { ok: false, reason: `op '${op.kind}' in noun copula attributive terminal not supported` };
  }
  return null;
}

export function renderNounCopulaPredicateQuoteAttributive(
  layer: AuxLayerNode & { readonly stem: NounStem },
  ctx: RenderContext,
  noun: string,
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>,
  state: NounCopulaAttributiveOpState
): RenderOutcome | null {
  const { past, externalNegation, modalChain, postModalNeg, postModalPast, predicateQuoteCarrier } = state;
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
  return null;
}

export function renderNounCopulaModalChainAttributive(
  layer: AuxLayerNode & { readonly stem: NounStem },
  ctx: RenderContext,
  noun: string,
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>,
  state: NounCopulaAttributiveOpState
): RenderOutcome | null {
  const { past, externalNegation, modalChain, postModalNeg, postModalPast } = state;
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
  return null;
}

export function renderNounCopulaSimpleAttributiveTail(
  layer: AuxLayerNode & { readonly stem: NounStem },
  ctx: RenderContext,
  noun: string,
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>,
  state: NounCopulaAttributiveOpState
): RenderOutcome {
  const { past, externalNegation } = state;
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


export function legacyNounCopulaReasonQuoteAttributive(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
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
