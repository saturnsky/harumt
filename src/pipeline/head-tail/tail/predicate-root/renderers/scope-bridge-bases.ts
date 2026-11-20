import { potentialParticleInfix } from "../../../../../generator/aux-map.js";
import { conjugate } from "../../../../../generator/conjugator.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { NegationOp, ScopeBridgeOp } from "../grammar.js";
import { applyNegationChainToLemmaBase, applyNegationDepthToLemmaBase, hostProjectionSourceTrace, type BaseResult, type BaseSourceTrace, type ConnectiveBaseOverride, type KoreanLemmaPredicateBase, type KoreanPredicateBase, nounCopulaFinalAllomorphHost, type OkBaseResult, type OpContext } from "./base-model.js";
import { isCopulaSupportPotentialOp, isBenefactiveNegativeCarrierPolicy, negativeNounCopulaChainBase, NODA_CARRIER_BOUND_NOUN, nounCopulaPlainStem, projectBaseAffirmativeGiFocus } from "./base-support.js";
import { projectBaseAttributive, projectBaseFutureAttributive } from "./predicate-base-projection.js";
import { modalFinalChainPolicy } from "./modal-bases.js";

function isScopeLikeNoHost(base: KoreanPredicateBase): boolean {
  return base.final.kind === "lemma" &&
    (base.final.lemma === "없다" || base.final.lemma === "아니다" || base.final.lemma === "않다");
}

function projectBaseFocus(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  mode: "affirmative" | "negative"
): string | null {
  if (mode === "affirmative") {
    return projectBaseAffirmativeGiFocus(base, past, formal, "는");
  }
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseFocus({ prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final }, past, formal, mode);
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const stem = nounCopulaPlainStem(
      base.final.nounSurface,
      past,
      base.final.kind === "boundNounCopula" || base.final.isBoundNoun,
      nounCopulaFinalAllomorphHost(base.final)
    );
    return `${base.prefix}${stem}지는`;
  }
  const final = base.final;
  if (past) {
    const stem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${stem}지는`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "지")}는`;
}

function projectBaseAdditiveFocus(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean
): string | null {
  return projectBaseAffirmativeGiFocus(base, past, formal, "도");
}

function projectBaseNegativeAdditiveFocus(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean
): string | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseNegativeAdditiveFocus({ prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final }, past, formal);
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    return `${base.prefix}${base.final.nounSurface}도`;
  }
  const final = base.final;
  if (past) {
    const stem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${stem}지도`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "지")}도`;
}

function projectBaseExtremeFocus(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  mode: "affirmative" | "negative"
): string | null {
  if (mode === "affirmative") {
    return projectBaseAffirmativeGiFocus(base, past, formal, "까지");
  }
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseExtremeFocus(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal,
      mode
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    return `${base.prefix}${base.final.nounSurface}조차`;
  }
  const final = base.final;
  if (past) {
    const stem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${stem}지조차`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "지")}조차`;
}

function scopeBridgeNegativeConnectiveOverride(
  op: ScopeBridgeOp,
  hostBase: KoreanLemmaPredicateBase,
  hostPast: boolean,
  formal: boolean
): ConnectiveBaseOverride | undefined {
  if (op.head !== "wake" || op.polarity !== "negative" || op.particle === "mo") {
    return undefined;
  }
  if (
    hostBase.final.lemma !== "있다" ||
    !hostBase.prefix.endsWith("고 ")
  ) {
    return undefined;
  }
  const focus = projectBaseFocus(hostBase, hostPast, formal, "negative");
  if (focus === null) {
    return undefined;
  }
  return {
    base: {
      prefix: `${focus} `,
      final: { kind: "lemma", lemma: "않다", irregular: null, isVerb: false },
      ...(hostBase.policy === undefined ? {} : { policy: hostBase.policy })
    },
    past: false
  };
}

function shouldFlattenWakeScopeNegationToHost(hostBase: KoreanLemmaPredicateBase): boolean {
  return hostBase.policy?.kind === "voice" &&
    hostBase.policy.voice === "passive" &&
    hostBase.final.lemma === "있다" &&
    hostBase.prefix.endsWith("고 ");
}

function kotoScopePotentialDoubleNegationBase(
  op: ScopeBridgeOp,
  inputBase: KoreanLemmaPredicateBase,
  preStemNeg: NegationOp | null
): BaseResult | null {
  if (
    (op.head !== "koto" && op.head !== "implicit") ||
    op.form !== "topic" ||
    op.polarity !== "negative" ||
    preStemNeg === null ||
    preStemNeg.chainDepth !== 1 ||
    preStemNeg.chainPast ||
    inputBase.final.lemma !== "있다" ||
    inputBase.final.irregular !== null ||
    inputBase.final.isVerb ||
    !inputBase.prefix.trimEnd().endsWith("수")
  ) {
    return null;
  }
  const focusParticle = op.particle === "mo" ? "mo" : "wa";
  const positivePotentialBase: KoreanLemmaPredicateBase = {
    prefix: `${inputBase.prefix.trimEnd()}${potentialParticleInfix(focusParticle, null)}`,
    final: inputBase.final,
    ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
  };
  const base = op.chainDepth <= 1
    ? positivePotentialBase
    : applyNegationDepthToLemmaBase(positivePotentialBase, op.chainDepth - 1);
  if (base === null) {
    return { ok: false, reason: "koto scope potential double negation chain lowering 영역 외" };
  }
  return {
    ok: true,
    base,
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom",
    interOpPastProjection: "committed"
  };
}

function kotoScopeLoweredPotentialDoubleNegationBase(
  op: ScopeBridgeOp,
  hostBase: KoreanLemmaPredicateBase
): BaseResult | null {
  if (
    (op.head !== "koto" && op.head !== "implicit") ||
    op.form !== "topic" ||
    op.polarity !== "negative" ||
    hostBase.final.lemma !== "없다" ||
    hostBase.final.irregular !== null ||
    hostBase.final.isVerb ||
    !hostBase.prefix.trimEnd().endsWith("수")
  ) {
    return null;
  }
  const focusParticle = op.particle === "mo" ? "mo" : "wa";
  const positivePotentialBase: KoreanLemmaPredicateBase = {
    prefix: `${hostBase.prefix.trimEnd()}${potentialParticleInfix(focusParticle, null)}`,
    final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false },
    ...(hostBase.policy === undefined ? {} : { policy: hostBase.policy })
  };
  const base = op.chainDepth <= 1
    ? positivePotentialBase
    : applyNegationDepthToLemmaBase(positivePotentialBase, op.chainDepth - 1);
  if (base === null) {
    return { ok: false, reason: "koto scope lowered potential double negation chain lowering 영역 외" };
  }
  return {
    ok: true,
    base,
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom",
    interOpPastProjection: "committed"
  };
}

function isKotoTopicExistentialNegation(
  op: ScopeBridgeOp,
  inputBase: KoreanLemmaPredicateBase,
  preModalNeg: NegationOp | null
): boolean {
  const hostNegationLemma =
    inputBase.final.lemma === "아니다" ||
    inputBase.final.lemma === "없다" ||
    inputBase.final.lemma === "않다";
  return op.head === "koto" && op.form === "topic" && preModalNeg === null && !hostNegationLemma;
}

export function scopeBridgeHeadAbsorbedHostPrefix(
  op: ScopeBridgeOp,
  hostBase: KoreanLemmaPredicateBase,
  hostPast: boolean
): string | null {
  const policy = hostBase.policy;
  if (
    op.head === null ||
    policy?.kind !== "noun_copula_interop" ||
    policy.nounSurface !== NODA_CARRIER_BOUND_NOUN ||
    hostBase.final.lemma !== "이다" ||
    hostBase.final.irregular !== null ||
    hostPast
  ) {
    return null;
  }
  return policy.hostPrefix;
}

export function scopeBridgeBase(
  op: ScopeBridgeOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const result = scopeBridgeBaseWithoutPolarityStamp(op, inputBase, ctx);
  if (!result.ok || op.polarity !== "negative") {
    return result;
  }
  return {
    ...result,
    base: withNegativeClosureCapability(result.base)
  };
}

export function withNegativeClosureCapability<T extends KoreanPredicateBase>(base: T): T {
  return {
    ...base,
    capabilities: { ...base.capabilities, negativeClosure: "source_polarity" as const }
  };
}

function scopeBridgeBaseWithoutPolarityStamp(
  op: ScopeBridgeOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if ((op.particle === "shika" || op.particle === "sae") && op.head !== null) {
    return { ok: false, reason: "限定·極限 초점 bridge 는 무-head 형상만 갖는다" };
  }
  if (op.polarity === "affirmative" && op.head === null && op.particle !== null &&
    isCopulaSupportPotentialOp(ctx.nextOp)) {
    return {
      ok: true,
      base: { ...inputBase, policy: { kind: "scope_bridge_potential_host", particle: op.particle } },
      chainOnFinalSupported: true
    };
  }
  const potentialDoubleNegation = kotoScopePotentialDoubleNegationBase(op, inputBase, ctx.preModalNeg);
  if (potentialDoubleNegation !== null) {
    return potentialDoubleNegation;
  }
  const hostBase = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (hostBase === null) {
    return { ok: false, reason: "scope bridge host negation lowering 영역 외" };
  }
  const loweredPotentialDoubleNegation = kotoScopeLoweredPotentialDoubleNegationBase(op, hostBase);
  if (loweredPotentialDoubleNegation !== null) {
    return loweredPotentialDoubleNegation;
  }
  const hostPast = ctx.past || (ctx.preModalNeg?.chainPast ?? false);
  const formal = ctx.formal;
  const kotoTopicExistential = isKotoTopicExistentialNegation(op, inputBase, ctx.preModalNeg);
  const absorbedHostPrefix = op.polarity === "negative" && kotoTopicExistential
    ? null
    : scopeBridgeHeadAbsorbedHostPrefix(op, hostBase, hostPast);

  if (absorbedHostPrefix !== null && op.polarity === "negative") {
    const label = op.particle === "mo"
      ? `${NODA_CARRIER_BOUND_NOUN}도`
      : formal ? `${NODA_CARRIER_BOUND_NOUN}은` : "건";
    const absorbedPrefix = `${absorbedHostPrefix}${label} `;
    const negativeBase: KoreanLemmaPredicateBase = {
      prefix: absorbedPrefix,
      final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
    };
    const lowered = op.chainDepth <= 1
      ? negativeBase
      : applyNegationDepthToLemmaBase(negativeBase, op.chainDepth - 1);
    if (lowered === null) return { ok: false, reason: "scope bridge absorbed negative chain lowering 영역 외" };
    const absorbedTrace = hostProjectionSourceTrace({
      hostText: hostBase.prefix,
      inputPrefix: inputBase.prefix,
      basePrefix: lowered.prefix,
      sourceTokens: op.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: lowered,
      ...modalFinalChainPolicy(lowered),
      ...(absorbedTrace === undefined ? {} : { sourceTrace: absorbedTrace })
    };
  }

  if (op.head === null || absorbedHostPrefix !== null) {
    if (op.particle === "shika") {
      if (op.polarity !== "negative") {
        return { ok: false, reason: "限定 초점 bridge 는 부정 본체로만 닫힌다" };
      }
      if (op.chainDepth > 1) {
        return { ok: false, reason: "限定 초점 bridge negative chain lowering 영역 외" };
      }
      const futureAttr = projectBaseFutureAttributive(hostBase, hostPast, formal, ctx.pastProjection);
      if (futureAttr === null) return { ok: false, reason: "限定 초점 bridge future attributive projection 영역 외" };
      const limitTrace = hostProjectionSourceTrace({
        hostText: futureAttr,
        inputPrefix: inputBase.prefix,
        basePrefix: `${futureAttr} `,
        sourceTokens: op.source.tokens,
        splitFinal: "none"
      });
      return {
        ok: true,
        base: {
          prefix: `${futureAttr} `,
          final: { kind: "boundNounCopula", nounSurface: "뿐" }
        },
        chainOnFinalSupported: true,
        ...(limitTrace === undefined ? {} : { sourceTrace: limitTrace })
      };
    }
    if (op.polarity === "affirmative") {
      const focus = op.particle === "mo"
        ? projectBaseAdditiveFocus(hostBase, hostPast, formal)
        : op.particle === "sae"
          ? projectBaseExtremeFocus(hostBase, hostPast, formal, "affirmative")
          : projectBaseFocus(hostBase, hostPast, formal, "affirmative");
      if (focus === null) return { ok: false, reason: "scope bridge affirmative focus projection 영역 외" };
      const focusPrefix = `${focus} `;
      const focusTrace = hostProjectionSourceTrace({
        hostText: focus,
        inputPrefix: inputBase.prefix,
        basePrefix: focusPrefix,
        sourceTokens: op.source.tokens,
        splitFinal: "none"
      });
      return {
        ok: true,
        base: {
          prefix: focusPrefix,
          final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: false }
        },
        chainOnFinalSupported: true,
        ...(focusTrace === undefined ? {} : { sourceTrace: focusTrace })
      };
    }
    const focus = op.particle === "mo"
      ? projectBaseNegativeAdditiveFocus(hostBase, hostPast, formal)
      : op.particle === "sae"
        ? projectBaseExtremeFocus(hostBase, hostPast, formal, "negative")
        : projectBaseFocus(hostBase, hostPast, formal, "negative");
    if (focus === null) return { ok: false, reason: "scope bridge negative focus projection 영역 외" };
    const negativeBase: KoreanLemmaPredicateBase = {
      prefix: `${focus} `,
      final: { kind: "lemma", lemma: "않다", irregular: null, isVerb: false }
    };
    const lowered = op.chainDepth <= 1
      ? negativeBase
      : applyNegationDepthToLemmaBase(negativeBase, op.chainDepth - 1);
    if (lowered === null) return { ok: false, reason: "scope bridge negative chain lowering 영역 외" };
    const negativeFocusTrace =
      scopeBridgeHeadlessNegativeFocusSourceTrace(op, inputBase, focus, lowered.prefix) ??
      hostProjectionSourceTrace({
        hostText: focus,
        inputPrefix: inputBase.prefix,
        basePrefix: lowered.prefix,
        sourceTokens: op.source.tokens,
        splitFinal: "none"
      });
    return {
      ok: true,
      base: lowered,
      chainOnFinalSupported: true,
      ...(negativeFocusTrace === undefined ? {} : { sourceTrace: negativeFocusTrace })
    };
  }

  const negativeProjection = op.head === "implicit" ? "completed_negative" : "scope_bridge";
  const attr = projectBaseAttributive(
    ctx.attributiveProjectionBase ?? hostBase,
    hostPast,
    formal,
    ctx.pastProjection,
    negativeProjection
  );
  if (attr === null) return { ok: false, reason: "scope bridge attributive projection 영역 외" };

  if (op.polarity === "affirmative") {
    const focus = op.particle === "mo" ? "것이기도" : "것이기는";
    const sourceTrace = scopeBridgeAttributiveSourceTrace(op, inputBase, attr, ` ${focus} `);
    return {
      ok: true,
      base: {
        prefix: `${attr} ${focus} `,
        final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: false },
        policy: {
          kind: "scope_carrier",
          carrier: op.head === "wake" ? "wake" : "noda",
          nounSurface: "것",
          hostPrefix: `${attr} `,
          style: "emphasis",
          ...(op.particle === null
            ? { connectiveSourcePoliteness: "preserve_when_supported" as const }
            : {})
        }
      },
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace }),
      ...(op.head === "no" && op.particle !== "mo"
        ? { chainCarryPrefixContraction: "no_emphasis_limited" as const }
        : {})
    };
  }

  if (op.head === "wake" && op.particle !== "mo" && shouldFlattenWakeScopeNegationToHost(hostBase)) {
    const focus = projectBaseFocus(hostBase, hostPast, formal, "negative");
    if (focus === null) return { ok: false, reason: "scope bridge passive-progressive focus projection 영역 외" };
    const focusNegativeBase: KoreanLemmaPredicateBase = {
      prefix: `${focus} `,
      final: { kind: "lemma", lemma: "않다", irregular: null, isVerb: false },
      ...(hostBase.policy === undefined ? {} : { policy: hostBase.policy })
    };
    const lowered = op.chainDepth <= 1
      ? focusNegativeBase
      : applyNegationDepthToLemmaBase(focusNegativeBase, op.chainDepth - 1);
    if (lowered === null) return { ok: false, reason: "scope bridge passive-progressive chain lowering 영역 외" };
    const flattenTrace = hostProjectionSourceTrace({
      hostText: focus,
      inputPrefix: inputBase.prefix,
      basePrefix: lowered.prefix,
      sourceTokens: op.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: lowered,
      ...modalFinalChainPolicy(lowered),
      ...(flattenTrace === undefined ? {} : { sourceTrace: flattenTrace })
    };
  }

  let label: string;
  let terminalPrefixContraction: OkBaseResult["terminalPrefixContraction"] | undefined;
  if (op.head === "no") {
    if (op.particle === "mo") {
      label = "것도";
    } else if (
      isBenefactiveNegativeCarrierPolicy(hostBase.policy, hostBase.final.lemma)
    ) {
      label = formal ? "것이" : "게";
    } else if (isScopeLikeNoHost(hostBase)) {
      label = "것은";
      terminalPrefixContraction = "scope_topic";
    } else if (formal) {
      label = hostBase.final.lemma === "바라다"
        ? "게"
        : "것이";
    } else {
      label = "게";
    }
  } else if (op.head === "implicit" && op.particle === "mo") {
    label = "것도";
  } else if (op.head === "implicit" && inputBase.final.isVerb) {
    label = "건";
  } else if (op.head === "implicit") {
    label = "것은";
    terminalPrefixContraction = "scope_topic";
  } else if (op.particle === "mo") {
    label = "것도";
  } else if (op.head === "koto" && inputBase.final.isVerb) {
    label = formal ? "것은" : "건";
  } else {
    label = "것은";
    const isProgressiveIruHost =
      hostBase.final.lemma === "있다" &&
      hostBase.prefix.endsWith("고 ");
    if (!isProgressiveIruHost) {
      terminalPrefixContraction = "scope_topic";
    }
  }
  const negativeBase: KoreanLemmaPredicateBase = {
    prefix: `${attr} ${label} `,
    final: kotoTopicExistential
      ? { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
      : { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
  };
  const lowered = op.chainDepth <= 1
    ? negativeBase
    : applyNegationDepthToLemmaBase(negativeBase, op.chainDepth - 1);
  if (lowered === null) return { ok: false, reason: "scope bridge scope negation lowering 영역 외" };
  const connectiveBaseOverride = scopeBridgeNegativeConnectiveOverride(op, hostBase, hostPast, formal);
  const connectivePrefixContraction: OkBaseResult["connectivePrefixContraction"] | undefined =
    op.head === "no" && op.particle !== "mo"
      ? "no_scope_negative"
      : terminalPrefixContraction === "scope_topic"
        ? "scope_topic"
        : undefined;
  return {
    ok: true,
    base: lowered,
    ...modalFinalChainPolicy(lowered),
    ...(() => {
      const sourceTrace = scopeBridgeAttributiveSourceTrace(op, inputBase, attr, ` ${label} `);
      return sourceTrace === undefined ? {} : { sourceTrace };
    })(),
    ...(terminalPrefixContraction === undefined ? {} : { terminalPrefixContraction }),
    ...(connectivePrefixContraction === undefined ? {} : { connectivePrefixContraction }),
    ...(connectiveBaseOverride === undefined ? {} : { connectiveBaseOverride })
  };
}

function scopeBridgeAttributiveSourceTrace(
  op: ScopeBridgeOp,
  currentBase: KoreanLemmaPredicateBase,
  attributiveText: string,
  carrierText: string
): BaseSourceTrace | undefined {
  if (!attributiveText.startsWith(currentBase.prefix)) {
    return undefined;
  }
  const split = splitScopeBridgeCarrierAndFinalSource(op);
  return {
    inputProjectionText: attributiveText.slice(currentBase.prefix.length),
    carrierPrefixSegments: [{
      text: carrierText,
      sourceTokens: split.carrierSourceTokens,
      kind: "modal",
      projectionConfidence: "semantic"
    }],
    finalSourceTokens: split.finalSourceTokens,
    finalKind: "modal"
  };
}

function scopeBridgeHeadlessNegativeFocusSourceTrace(
  op: ScopeBridgeOp,
  currentBase: KoreanLemmaPredicateBase,
  focusText: string,
  basePrefix: string
): BaseSourceTrace | undefined {
  if (
    op.head !== null ||
    op.polarity !== "negative" ||
    !focusText.startsWith(currentBase.prefix) ||
    !basePrefix.startsWith(focusText)
  ) {
    return undefined;
  }
  const projectedHostText = focusText.slice(currentBase.prefix.length);
  const carrierText = op.particle === "mo" ? "도" : "는";
  if (!projectedHostText.endsWith(carrierText)) {
    return undefined;
  }
  const inputProjectionText = projectedHostText.slice(0, -carrierText.length);
  const split = splitScopeBridgeCarrierAndFinalSource(op);
  const spacerText = basePrefix.slice(focusText.length);
  return {
    inputProjectionText,
    carrierPrefixSegments: [
      {
        text: carrierText,
        sourceTokens: split.carrierSourceTokens,
        kind: "modal",
        projectionConfidence: "semantic"
      },
      ...(spacerText.length === 0
        ? []
        : [{
          text: spacerText,
          sourceTokens: [],
          kind: "punctuation" as const,
          projectionConfidence: "exact" as const
        }])
    ],
    finalSourceTokens: split.finalSourceTokens,
    finalKind: "modal"
  };
}

function splitScopeBridgeCarrierAndFinalSource(op: ScopeBridgeOp): {
  readonly carrierSourceTokens: readonly RuntimeHaruToken[];
  readonly finalSourceTokens: readonly RuntimeHaruToken[];
} {
  const tokens = op.source.tokens;
  if (op.polarity !== "negative" || tokens.length < 2) {
    return {
      carrierSourceTokens: tokens,
      finalSourceTokens: tokens
    };
  }
  const focusIndex = lastScopeBridgeFocusParticleIndex(tokens);
  if (focusIndex >= 0 && focusIndex + 1 < tokens.length) {
    return {
      carrierSourceTokens: tokens.slice(0, focusIndex + 1),
      finalSourceTokens: tokens.slice(focusIndex + 1)
    };
  }
  const negativeIndex = firstScopeBridgeNegativeTailIndex(tokens);
  if (negativeIndex > 0) {
    return {
      carrierSourceTokens: tokens.slice(0, negativeIndex),
      finalSourceTokens: tokens.slice(negativeIndex)
    };
  }
  return {
    carrierSourceTokens: tokens,
    finalSourceTokens: tokens
  };
}

function lastScopeBridgeFocusParticleIndex(tokens: readonly RuntimeHaruToken[]): number {
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const form = tokens[index]?.dictionaryForm || tokens[index]?.surface;
    if (form === "は" || form === "も") {
      return index;
    }
  }
  return -1;
}

function firstScopeBridgeNegativeTailIndex(tokens: readonly RuntimeHaruToken[]): number {
  for (let index = 1; index < tokens.length; index += 1) {
    const form = tokens[index]?.dictionaryForm || tokens[index]?.normalizedForm || tokens[index]?.surface;
    if (form === "ない" || form === "無い" || form === "ぬ" || form === "ん") {
      return index;
    }
  }
  return -1;
}
