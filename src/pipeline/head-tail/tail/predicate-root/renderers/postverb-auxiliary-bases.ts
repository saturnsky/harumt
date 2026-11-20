import { conjugate } from "../../../../../generator/conjugator.js";
import { selectParticle } from "../../../../../generator/particles.js";
import { POS5A, 意志推量形_, 동사, type 형용사 } from "../../../../../types/pos.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { assertNever, type AffirmativeSupportFocus, type DegreeIntensifierIdiomOp, type NegationOp, type PostverbAuxiliaryOp, type PostverbHedgeFocus, type ShortNegationPolicy } from "../grammar.js";
import { applyNegationChainToLemmaBase, hostProjectionSourceTrace, lemmaPredicateBase, type BaseResult, type BaseSourceTrace, type HostProjectionFinalSplit, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type OkLemmaBaseResult, type OpContext, type PredicateBasePolicy, type RenderFailure } from "./base-model.js";
import { isCopulaSupportPotentialOp, potentialFocusInfixForBase, projectBaseAffirmativeGiFocus, stateChangeBase } from "./base-support.js";
import { composeBaseWithConnective } from "./connective-compose.js";
import { composeBaseWithPredicateProjectionQuoteAttributive } from "./quote-complement-compose.js";
import { projectBaseAttributive } from "./predicate-base-projection.js";
import { irregularFrom } from "./final-forms.js";
import { isStateChangePostverbAuxiliaryKind } from "../postverb-auxiliary-parser.js";
import { createConnectiveOp } from "../op-builders.js";
import { makeStateChangeCausativeBaseResult } from "./voice-benefactive-bases.js";

const DEGREE_INTENSIFIER_BASE_POLICY: Extract<PredicateBasePolicy, { readonly kind: "degree_intensifier" }> = {
  kind: "degree_intensifier",
  nodeReasonPastBehavior: "carry"
};

export function degreeIntensifierBase(opts: {
  readonly op: DegreeIntensifierIdiomOp;
  readonly inputBase: KoreanPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  const reason = composeBaseWithConnective(
    opts.inputBase,
    createConnectiveOp({

      connective: "reason",
      surface: "ので",
      source: opts.op.source
    }),
    opts.stemPast,
    false,
    opts.preStemNeg,
    opts.formal, opts.lookups
  );
  if (!reason.ok) {
    return { ok: false, reason: `degree intensifier host reason projection failed: ${reason.reason}` };
  }
  const trace = (basePrefix: string, splitFinal: HostProjectionFinalSplit): { readonly sourceTrace?: BaseSourceTrace } => {
    const sourceTrace = hostProjectionSourceTrace({
      hostText: reason.text,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal
    });
    return sourceTrace === undefined ? {} : { sourceTrace };
  };
  if (opts.op.variant === "bear") {
    if (opts.op.mode === "become") {
      const basePrefix = `${reason.text} ${conjugate("못 참다", null, "게")} `;
      return {
        ok: true,
        base: {
          prefix: basePrefix,
          final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
          policy: DEGREE_INTENSIFIER_BASE_POLICY
        },
        chainOnFinalSupported: true,
        ...trace(basePrefix, "none")
      };
    }
    const basePrefix = `${reason.text} `;
    return {
      ok: true,
      base: {
        prefix: basePrefix,
        final: opts.op.past
          ? { kind: "lemma", lemma: "못 참다", irregular: null, isVerb: true }
          : { kind: "lemma", lemma: "못 참겠다", irregular: null, isVerb: false },
        policy: DEGREE_INTENSIFIER_BASE_POLICY
      },
      chainOnFinalSupported: true,
      ...trace(basePrefix, "none")
    };
  }
  if (opts.op.mode === "become") {
    const basePrefix = `${reason.text} 어쩔 수 없게 `;
    return {
      ok: true,
      base: {
        prefix: basePrefix,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
        policy: DEGREE_INTENSIFIER_BASE_POLICY
      },
      chainOnFinalSupported: true,
      ...trace(basePrefix, "none")
    };
  }
  const basePrefix = `${reason.text} 어쩔 수 `;
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false },
      policy: DEGREE_INTENSIFIER_BASE_POLICY
    },
    chainOnFinalSupported: true,
    ...trace(basePrefix, "negative_nai")
  };
}

export function postverbAuxiliaryBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const adverbialStemBase = adverbialStemPostverbAuxiliaryBaseResult(op, inputBase, ctx);
  if (adverbialStemBase !== null) {
    return adverbialStemBase;
  }
  if (op.auxiliary.kind === "scope_control") {
    return scopeControlBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "manner_action_control") {
    return mannerActionControlBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "epistemic_hedge") {
    return epistemicHedgeBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "appearance_perception") {
    return appearancePerceptionBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "manner_simile_become") {
    return mannerSimileBecomeBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "manner_simile_become_potential") {
    return mannerSimileBecomePotentialBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "appearance_state_change") {
    return appearanceStateChangeBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "appearance_state_change_potential") {
    return appearanceStateChangePotentialBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "appearance_behavior") {
    return appearanceBehaviorBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "adverbial_control") {
    return adverbialControlBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "make_state_change") {
    return makeStateChangeBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "make_state_change_causative") {
    return makeStateChangeCausativeBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "appearance_control") {
    return appearanceControlBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "focus_support") {
    return focusSupportBaseResult(op, inputBase, ctx);
  }
  if (
    ctx.preModalNeg !== null &&
    !isStateChangePostverbAuxiliaryKind(op.auxiliary.kind) &&
    op.auxiliary.kind !== "adverbial_change" &&
    op.auxiliary.kind !== "adverbial_change_potential"
  ) {
    return { ok: false, reason: "V neg + postverb auxiliary 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "V past + postverb auxiliary 영역 외" };
  }
  if (op.auxiliary.kind === "contempt") {
    return { ok: true, base: inputBase, chainOnFinalSupported: true };
  }
  const host = postverbAuxiliaryHostForms(op, inputBase, ctx);
  const { hostAdverbialBase } = host;

  switch (op.auxiliary.kind) {
    case "completion":
      return postverbCompletionBaseResult(host);
    case "exhaustive":
      return hostAdverbialBase();
    case "continuation":
      return hostAdverbialBase();
    case "redo":
      return hostAdverbialBase();
    case "prolonged":
      return hostAdverbialBase();
    case "perseverance":
      return hostAdverbialBase();
    case "intensive":
      return hostAdverbialBase();
    case "reciprocal":
      return hostAdverbialBase();
    case "excessive":
      return hostAdverbialBase(DEGREE_INTENSIFIER_BASE_POLICY);
    case "accomplishment":
      return postverbAccomplishmentBaseResult(host);
    case "determined_completion":
      return postverbDeterminedCompletionBaseResult(host);
    case "state_change":
      return stateChangeBaseResult(inputBase, ctx, "adjectival", op.source.tokens);
    case "state_change_potential":
      return postverbStateChangePotentialBaseResult(host);
    case "adverbial_change":
      return postverbAdverbialChangeBaseResult(host);
    case "adverbial_change_potential":
      return postverbAdverbialChangePotentialBaseResult(host);
    case "inchoative":
      return postverbInchoativeBaseResult(host);
    case "accustomed":
      return postverbAccustomedBaseResult(host);
    case "forget":
      return postverbForgetBaseResult(host);
    case "failure_miss":
      return postverbFailureMissBaseResult(host);
    case "near_miss":
      return postverbNearMissBaseResult(host);
    case "incomplete_attempt":
      return postverbIncompleteAttemptBaseResult(host);
    case "difficulty":
      return postverbDifficultyBaseResult(host);
    case "risk_potential":
      return postverbRiskPotentialBaseResult(host);
    case "potential":
    case "completion_potential":
      return postverbPotentialBaseResult(host);
    case "adverbial_potential":
      return postverbAdverbialPotentialBaseResult(host);
    default:
      return assertNever(op.auxiliary.kind);
  }
}

function mannerSimileBecomePotentialBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const baseResult = mannerSimileBecomeBaseResult(op, inputBase, ctx);
  if (!baseResult.ok) {
    return baseResult;
  }
  const lemmaBase = lemmaPredicateBase(baseResult.base);
  if (lemmaBase === null) {
    return { ok: false, reason: "ようになれる simile-become potential requires lemma final" };
  }
  return stateChangePotentialBaseResult(lemmaBase, {
    inputPrefix: inputBase.prefix,
    sourceTokens: op.source.tokens
  });
}

function appearanceStateChangePotentialBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const baseResult = appearanceStateChangeBaseResult(op, inputBase, ctx);
  if (!baseResult.ok) {
    return baseResult;
  }
  const lemmaBase = lemmaPredicateBase(baseResult.base);
  if (lemmaBase === null) {
    return { ok: false, reason: "そうに+なれる state-change potential requires lemma final" };
  }
  return stateChangePotentialBaseResult(lemmaBase, {
    inputPrefix: inputBase.prefix,
    sourceTokens: op.source.tokens
  });
}

interface PostverbAuxiliaryHostForms {
  readonly op: PostverbAuxiliaryOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly ctx: OpContext;
  readonly final: KoreanLemmaPredicateBase["final"];
  readonly carryInputPolicy: (
    base: KoreanLemmaPredicateBase,
    defaultPolicy?: PredicateBasePolicy
  ) => KoreanLemmaPredicateBase;
  readonly hostAdverbialBase: (defaultPolicy?: PredicateBasePolicy) => BaseResult;
  readonly hostKi: string;
  readonly hostJi: string;
  readonly hostFuture: string;
  readonly hostAeo: string;
  readonly hostTrace: (hostText: string, basePrefix: string) => { readonly sourceTrace?: BaseSourceTrace };
}

function postverbAuxiliaryHostForms(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): PostverbAuxiliaryHostForms {
  const final = inputBase.final;
  const carryInputPolicy = (
    base: KoreanLemmaPredicateBase,
    defaultPolicy?: PredicateBasePolicy
  ): KoreanLemmaPredicateBase => ({
    ...base,
    ...(inputBase.policy !== undefined
      ? { policy: inputBase.policy }
      : defaultPolicy === undefined
        ? {}
        : { policy: defaultPolicy })
  });
  const hostPrefixBase = (adverb: string, defaultPolicy?: PredicateBasePolicy): BaseResult => ({
    ok: true,
    base: carryInputPolicy({
      prefix: `${adverb} ${inputBase.prefix}`,
      final
    }, defaultPolicy),
    chainOnFinalSupported: true
  });
  const hostAdverbialBase = (defaultPolicy?: PredicateBasePolicy): BaseResult => {
    const adverb = op.auxiliary.hostAdverb;
    if (adverb === undefined) {
      return { ok: false, reason: `postverb ${op.auxiliary.kind} auxiliary missing host adverb` };
    }
    if (op.auxiliary.sahenHostProjection === "object_adverb") {
      const sahenObject = sahenObjectPhraseFromBase(inputBase, ctx.shortNegationPolicy);
      if (sahenObject !== null) {
        return {
          ok: true,
          base: carryInputPolicy({
            prefix: `${sahenObject}${adverb} `,
            final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
          }, defaultPolicy),
          chainOnFinalSupported: true
        };
      }
    }
    return hostPrefixBase(adverb, defaultPolicy);
  };
  const hostKi = final.isVerb
    ? `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "기")}`
    : `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "아/어")}지기`;
  const hostJi = `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "지")}`;
  const hostFuture = `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "ㄹ/을")}`;
  const hostAeo = `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "아/어")}`;
  const hostTrace = (hostText: string, basePrefix: string): { readonly sourceTrace?: BaseSourceTrace } => {
    const sourceTrace = hostProjectionSourceTrace({
      hostText,
      inputPrefix: inputBase.prefix,
      basePrefix,
      sourceTokens: op.source.tokens,
      splitFinal: "none"
    });
    return sourceTrace === undefined ? {} : { sourceTrace };
  };
  return { op, inputBase, ctx, final, carryInputPolicy, hostAdverbialBase, hostKi, hostJi, hostFuture, hostAeo, hostTrace };
}

function postverbCompletionBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { op, inputBase, ctx, final } = host;
  const completionPolicy = inputBase.policy === undefined
    ? {
      policy: {
        kind: "completion",
        stemPrefix: `다 ${inputBase.prefix}`,
        stemLemma: final.lemma,
        stemIrregular: final.irregular,
        teIruNegativeStrategy: op.auxiliary.completionTeIruNegativeStrategy ?? "preserve_aspect",
        ...(op.auxiliary.completionFollowingPassiveStrategy === undefined
          ? {}
          : { followingPassiveStrategy: op.auxiliary.completionFollowingPassiveStrategy }),
        ...(ctx.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: ctx.shortNegationPolicy })
      } satisfies PredicateBasePolicy
    }
    : {};
  return {
    ok: true,
    base: {
      prefix: `다 ${inputBase.prefix}`,
      final,
      ...completionPolicy
    },
    chainOnFinalSupported: true
  };
}

function postverbAccomplishmentBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { op, inputBase, ctx, final, hostAeo, hostTrace } = host;
  if (!final.isVerb) {
    return { ok: false, reason: "postverb accomplishment auxiliary requires verb-like host" };
  }
  if (op.auxiliary.sahenHostProjection === "object_action_lemma") {
    const sahenObject = sahenObjectPhraseFromBase(inputBase, ctx.shortNegationPolicy);
    if (sahenObject !== null) {
      return {
        ok: true,
        base: {
          prefix: sahenObject,
          final: {
            kind: "lemma",
            lemma: op.auxiliary.koreanActionLemma ?? "해내다",
            irregular: irregularFrom(op.auxiliary.koreanActionIrregular ?? null),
            isVerb: true
          }
        },
        chainOnFinalSupported: true,
        ...hostTrace(sahenObject.trimEnd(), sahenObject)
      };
    }
  }
  return {
    ok: true,
    base: {
      prefix: hostAeo,
      final: { kind: "lemma", lemma: "내다", irregular: null, isVerb: true }
    },
    chainOnFinalSupported: true,
    ...hostTrace(hostAeo, hostAeo)
  };
}

function postverbDeterminedCompletionBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { op, final, hostAeo, hostTrace } = host;
  if (!final.isVerb) {
    return { ok: false, reason: "postverb determined completion auxiliary requires verb-like host" };
  }
  const auxToken = op.source.tokens[op.source.tokens.length - 1];
  const auxIsVolitional = ((auxToken?.pos ?? 0) & POS5A) === 意志推量形_;
  return {
    ok: true,
    base: {
      prefix: hostAeo,
      final: {
        kind: "lemma",
        lemma: auxIsVolitional ? "내다" : "내겠다",
        irregular: null,
        isVerb: auxIsVolitional
      }
    },
    chainOnFinalSupported: true,
    ...hostTrace(hostAeo, hostAeo)
  };
}

function postverbStateChangePotentialBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { op, inputBase, ctx } = host;
  const baseResult = stateChangeBaseResult(inputBase, ctx, "adjectival");
  if (!baseResult.ok) {
    return baseResult;
  }
  return stateChangePotentialBaseResult(baseResult.base, {
    inputPrefix: inputBase.prefix,
    sourceTokens: op.source.tokens
  });
}

function postverbAdverbialChangeBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { op, inputBase, ctx, carryInputPolicy } = host;
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "postverb adverbial-change host negation lowering 영역 외" };
  }
  const base = carryInputPolicy(stateChangeBase(loweredHost, "adverbial"));
  const sourceTrace = hostProjectionSourceTrace({
    hostText: base.prefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix: base.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function postverbAdverbialChangePotentialBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { op, inputBase, ctx, carryInputPolicy } = host;
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "postverb adverbial-change host negation lowering 영역 외" };
  }
  return stateChangePotentialBaseResult(
    carryInputPolicy(stateChangeBase(loweredHost, "adverbial")),
    { inputPrefix: inputBase.prefix, sourceTokens: op.source.tokens }
  );
}

function postverbInchoativeBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { hostKi, hostTrace } = host;
  return {
    ok: true,
    base: {
      prefix: `${hostKi} `,
      final: { kind: "lemma", lemma: "시작하다", irregular: "여", isVerb: true }
    },
    chainOnFinalSupported: true,
    ...hostTrace(hostKi, `${hostKi} `)
  };
}

function postverbAccustomedBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { inputBase, final, hostTrace } = host;
  if (!final.isVerb) {
    return { ok: false, reason: "postverb accustomed auxiliary requires verb-like host" };
  }
  const hostNeun = `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "ㄴ/는")}`;
  return {
    ok: true,
    base: {
      prefix: `${hostNeun} 데 `,
      final: { kind: "lemma", lemma: "익숙하다", irregular: "여", isVerb: false },
      policy: { kind: "accustomed_aspect_projection" }
    },
    chainOnFinalSupported: true,
    ...hostTrace(hostNeun, `${hostNeun} 데 `)
  };
}

function postverbForgetBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { inputBase, ctx, hostTrace } = host;
  const attr = projectBaseAttributive(inputBase, false, ctx.formal);
  if (attr === null) {
    return { ok: false, reason: "postverb forget host attributive projection 영역 외" };
  }
  return {
    ok: true,
    base: {
      prefix: `${attr} 걸 `,
      final: { kind: "lemma", lemma: "잊다", irregular: null, isVerb: true }
    },
    chainOnFinalSupported: true,
    ...hostTrace(attr, `${attr} 걸 `)
  };
}

function postverbFailureMissBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { final, hostJi, hostTrace } = host;
  if (!final.isVerb) {
    return { ok: false, reason: "postverb failure auxiliary requires verb-like host" };
  }
  return {
    ok: true,
    base: {
      prefix: `${hostJi} `,
      final: { kind: "lemma", lemma: "못하다", irregular: "여", isVerb: true }
    },
    chainOnFinalSupported: true,
    ...hostTrace(hostJi, `${hostJi} `)
  };
}

function postverbNearMissBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { final, hostFuture, hostTrace } = host;
  if (!final.isVerb) {
    return { ok: false, reason: "postverb near-miss auxiliary requires verb-like host" };
  }
  return {
    ok: true,
    base: {
      prefix: `${hostFuture} `,
      final: { kind: "lemma", lemma: "뻔하다", irregular: "여", isVerb: false }
    },
    chainOnFinalSupported: true,
    ...hostTrace(hostFuture, `${hostFuture} `)
  };
}

function postverbIncompleteAttemptBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { inputBase, final, hostTrace } = host;
  if (!final.isVerb) {
    return { ok: false, reason: "postverb incomplete-attempt auxiliary requires verb-like host" };
  }
  const hostRyeogo = `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "(으)려고")}`;
  return {
    ok: true,
    base: {
      prefix: `${hostRyeogo} `,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
    },
    chainOnFinalSupported: true,
    ...hostTrace(hostRyeogo, `${hostRyeogo} `)
  };
}

function postverbDifficultyBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { inputBase, final, hostKi, hostTrace } = host;
  if (!final.isVerb && inputBase.policy?.kind !== "potential") {
    return { ok: false, reason: "postverb difficulty auxiliary requires verb-like host" };
  }
  if (inputBase.policy?.kind === "potential" && inputBase.policy.stemLemma !== undefined) {
    const potentialHostKi = conjugate(
      inputBase.policy.stemLemma,
      inputBase.policy.stemIrregular ?? null,
      "기"
    );
    return {
      ok: true,
      base: {
        prefix: `${potentialHostKi} `,
        final: { kind: "lemma", lemma: "어렵다", irregular: "ㅂ", isVerb: false }
      },
      chainOnFinalSupported: true,
      ...hostTrace(potentialHostKi, `${potentialHostKi} `)
    };
  }
  return {
    ok: true,
    base: {
      prefix: `${hostKi} `,
      final: { kind: "lemma", lemma: "어렵다", irregular: "ㅂ", isVerb: false }
    },
    chainOnFinalSupported: true,
    ...hostTrace(hostKi, `${hostKi} `)
  };
}

function postverbRiskPotentialBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { final, hostFuture, hostTrace } = host;
  if (!final.isVerb) {
    return { ok: false, reason: "postverb risk-potential auxiliary requires verb-like host" };
  }
  return {
    ok: true,
    base: {
      prefix: `${hostFuture} 수도 `,
      final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    ...hostTrace(hostFuture, `${hostFuture} 수도 `)
  };
}

function postverbPotentialBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { op, inputBase, ctx, final, hostFuture, hostTrace } = host;
  if (
    op.auxiliary.kind === "potential" &&
    op.potentialComposition === "reinforce_existing"
  ) {
    return {
      ok: true,
      base: inputBase,
      chainOnFinalSupported: false,
      finalNegationLoweringPolicy: "potential_idiom"
    };
  }
  if (!final.isVerb && !isCopulaSupportPotentialOp(op)) {
    return { ok: false, reason: "postverb potential auxiliary requires verb-like host" };
  }
  const potentialAdverb = op.auxiliary.kind === "completion_potential"
    ? op.auxiliary.completionAdverb ?? "다"
    : null;
  return {
    ok: true,
    base: {
      prefix: op.auxiliary.kind === "completion_potential"
        ? postverbAdverbialPotentialPrefix(inputBase, potentialAdverb ?? "다", ctx.shortNegationPolicy)
        : `${hostFuture} 수${potentialFocusInfixForBase(inputBase)}`,
      final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false },
      ...(op.auxiliary.kind === "completion_potential"
        ? {
          policy: {
            kind: "completion_potential",
            completionAdverb: potentialAdverb ?? "다",
            ...(inputBase.prefix.length === 0 ? {} : { stemPrefix: inputBase.prefix }),
            stemLemma: final.lemma,
            stemIrregular: final.irregular,
            ...(ctx.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: ctx.shortNegationPolicy })
          } as const
        }
        : ctx.nextOp?.kind === "postverbAuxiliary" && ctx.nextOp.auxiliary.kind === "difficulty"
          ? {
          policy: {
            kind: "potential",
            stemLemma: final.lemma,
            stemIrregular: final.irregular
          } as const
          }
          : {})
    },
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: op.auxiliary.kind === "completion_potential"
      ? "completion_potential"
      : "potential_idiom",
    ...(op.auxiliary.kind === "completion_potential"
      ? {}
      : hostTrace(hostFuture, `${hostFuture} 수${potentialFocusInfixForBase(inputBase)}`))
  };
}

function postverbAdverbialPotentialBaseResult(host: PostverbAuxiliaryHostForms): BaseResult {
  const { op, inputBase, ctx, final } = host;
  if (!final.isVerb) {
    return { ok: false, reason: "postverb adverbial potential auxiliary requires verb-like host" };
  }
  const adverb = op.auxiliary.hostAdverb;
  if (adverb === undefined) {
    return { ok: false, reason: "postverb adverbial potential auxiliary missing host adverb" };
  }
  return {
    ok: true,
    base: {
      prefix: postverbAdverbialPotentialPrefix(inputBase, adverb, ctx.shortNegationPolicy),
      final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom"
  };
}

const AFFIRMATIVE_SUPPORT_FOCUS_PARTICLE = {
  contrastive: "는",
  extreme: "까지",
  sufficiency: "만"
} as const satisfies Record<AffirmativeSupportFocus, "는" | "까지" | "만">;

function focusSupportBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const focus = op.auxiliary.supportFocus;
  if (focus === undefined) {
    return { ok: false, reason: "focus_support auxiliary missing supportFocus" };
  }
  if (ctx.preModalNeg !== null || ctx.past) {
    return { ok: false, reason: "focus_support host 는 連用形 술어 host 만 받는다" };
  }
  const hostText = projectBaseAffirmativeGiFocus(inputBase, false, ctx.formal, AFFIRMATIVE_SUPPORT_FOCUS_PARTICLE[focus]);
  if (hostText === null) {
    return { ok: false, reason: "focus_support host projection 영역 외" };
  }
  const basePrefix = `${hostText} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: inputBase.final.isVerb }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function appearancePerceptionBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "ように見える/思える host negation lowering 영역 외" };
  }
  const attrPolicy =
    op.auxiliary.perceptionProjection === "sou_appearance" &&
      loweredHost.final.isVerb &&
      !ctx.past &&
      ctx.preModalNeg === null
      ? "future"
      : "present";
  const hostAttr = projectBaseAttributive(
    loweredHost,
    ctx.past || (ctx.preModalNeg?.chainPast ?? false),
    ctx.formal,
    ctx.pastProjection,
    "default",
    attrPolicy
  );
  if (hostAttr === null) {
    return { ok: false, reason: "ように見える/思える host attributive projection 영역 외" };
  }
  const basePrefix = `${hostAttr} 것처럼 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostAttr,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: {
        kind: "lemma",
        lemma:
          op.auxiliary.perception === "felt"
            ? "느끼다"
            : op.auxiliary.perception === "inferential"
            ? "느껴지다"
            : op.auxiliary.perception === "inferential_passive"
              ? "여겨지다"
              : "보이다",
        irregular: null,
        isVerb: true
      }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function mannerSimileBecomeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "ようになる likeness-become host negation lowering 영역 외" };
  }
  const hostAttr = projectBaseAttributive(
    loweredHost,
    ctx.past || (ctx.preModalNeg?.chainPast ?? false),
    ctx.formal,
    ctx.pastProjection,
    "default",
    "present"
  );
  if (hostAttr === null) {
    return { ok: false, reason: "ようになる likeness-become host attributive projection 영역 외" };
  }
  const basePrefix = `${hostAttr} 것처럼 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostAttr,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: {
        kind: "lemma",
        lemma: "되다",
        irregular: null,
        isVerb: true
      }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function appearanceStateChangeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "そうに+なる host negation lowering 영역 외" };
  }
  const attrPolicy =
    op.auxiliary.perceptionProjection === "sou_appearance" &&
      loweredHost.final.isVerb &&
      !ctx.past &&
      ctx.preModalNeg === null
      ? "future"
      : "present";
  const hostAttr = projectBaseAttributive(
    loweredHost,
    ctx.past || (ctx.preModalNeg?.chainPast ?? false),
    ctx.formal,
    ctx.pastProjection,
    "default",
    attrPolicy
  );
  if (hostAttr === null) {
    return { ok: false, reason: "そうに+なる host attributive projection 영역 외" };
  }
  const base = stateChangeBase({
    prefix: `${hostAttr} 것 `,
    final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false }
  }, "adjectival");
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostAttr,
    inputPrefix: inputBase.prefix,
    basePrefix: base.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base,
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function appearanceBehaviorBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "そうに+する host negation lowering 영역 외" };
  }
  const attrPolicy = loweredHost.final.isVerb && !ctx.past && ctx.preModalNeg === null
    ? "future"
    : "present";
  const hostAttr = projectBaseAttributive(
    loweredHost,
    ctx.past || (ctx.preModalNeg?.chainPast ?? false),
    ctx.formal,
    ctx.pastProjection,
    "default",
    attrPolicy
  );
  if (hostAttr === null) {
    return { ok: false, reason: "そうに+する host attributive projection 영역 외" };
  }
  const basePrefix = `${hostAttr} 듯이 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostAttr,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      capabilities: { prohibitionHost: "action" }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function appearanceControlBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "A neg + 見せる appearance-control 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "A past + 見せる appearance-control 영역 외" };
  }
  const hostText = `${inputBase.prefix}${conjugate(inputBase.final.lemma, inputBase.final.irregular, "아/어")}`;
  const basePrefix = `${hostText} 보이게 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      capabilities: { prohibitionHost: "action" },
      ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function epistemicHedgeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const prefixKind = op.auxiliary.hedgePrefixKind;
  const tailLemma = op.auxiliary.hedgeTailLemma;
  const tailKoreanPos = op.auxiliary.hedgeTailKoreanPos;
  if (prefixKind === undefined || tailLemma === undefined || tailKoreanPos === undefined) {
    return { ok: false, reason: "epistemic hedge payload missing spec fields" };
  }

  if (op.auxiliary.hedgeProjection === "quotative_attributive") {
    return epistemicHedgeQuotativeBaseResult(op, inputBase, ctx, prefixKind, tailLemma, tailKoreanPos);
  }

  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "epistemic hedge host negation lowering 영역 외" };
  }
  const souLike = op.auxiliary.hedgeProjection === "sou_appearance";
  const attrPolicy =
    souLike &&
      loweredHost.final.isVerb &&
      !ctx.past &&
      ctx.preModalNeg === null
      ? "future"
      : "present";
  const hostAttr = projectBaseAttributive(
    loweredHost,
    ctx.past || (ctx.preModalNeg?.chainPast ?? false),
    ctx.formal,
    ctx.pastProjection,
    "default",
    attrPolicy
  );
  if (hostAttr === null) {
    return { ok: false, reason: "epistemic hedge host attributive projection 영역 외" };
  }

  const proposition = `${hostAttr} 것`;
  const focus = op.auxiliary.hedgeFocus;
  const carrierNoun = hedgeCarrierNoun(prefixKind);
  let prefix: string;
  if (carrierNoun === null) {
    prefix = `${proposition} `;
  } else if (souLike) {
    prefix = `${proposition} 같은 ${hedgeCarrierNounPhrase(carrierNoun, focus)} `;
  } else {
    prefix = `${hostAttr} ${hedgeCarrierNounPhrase(carrierNoun, focus)} `;
  }

  const final: KoreanLemmaPredicateBase["final"] = {
    kind: "lemma",
    lemma: tailLemma,
    irregular: irregularFrom(op.auxiliary.hedgeTailIrregular ?? null),
    isVerb: tailKoreanPos === 동사
  };
  const focused: { readonly base: KoreanLemmaPredicateBase } = carrierNoun === null && focus !== undefined
    ? { base: nominalizedFocusPredicate(prefix, final, focus) }
    : { base: { prefix, final } };

  if (op.auxiliary.hedgePotential === true) {
    return stateChangePotentialBaseResult(
      { ...focused.base, ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy }) },
      { inputPrefix: inputBase.prefix, sourceTokens: op.source.tokens }
    );
  }
  const hedgeTrace = hostProjectionSourceTrace({
    hostText: hostAttr,
    inputPrefix: inputBase.prefix,
    basePrefix: focused.base.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: focused.base,
    chainOnFinalSupported: true,
    ...(hedgeTrace === undefined ? {} : { sourceTrace: hedgeTrace })
  };
}

function hedgeCarrierNoun(prefixKind: "proposition" | "feeling" | "mood"): string | null {
  switch (prefixKind) {
    case "proposition":
      return null;
    case "feeling":
      return "느낌";
    case "mood":
      return "기분";
  }
}

function hedgeCarrierNounPhrase(carrierNoun: string, focus: PostverbHedgeFocus | undefined): string {
  const particleKey = focus === "additive" ? "도" : focus === "topic" ? "은/는" : "이/가";
  return `${carrierNoun}${selectParticle(carrierNoun, particleKey)}`;
}

function nominalizedFocusPredicate(
  prefix: string,
  final: KoreanLemmaPredicateBase["final"],
  focus: PostverbHedgeFocus
): KoreanLemmaPredicateBase {
  if (final.kind !== "lemma") {
    return { prefix, final };
  }
  const nominalized = conjugate(final.lemma, final.irregular, "기");
  const particleKey = focus === "additive" ? "도" : "은/는";
  return {
    prefix: `${prefix}${nominalized}${selectParticle(nominalized, particleKey)} `,
    final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: final.isVerb }
  };
}

function epistemicHedgeQuotativeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext,
  prefixKind: "proposition" | "feeling" | "mood",
  tailLemma: string,
  tailKoreanPos: typeof 동사 | typeof 형용사
): BaseResult {
  const quoted = composeBaseWithPredicateProjectionQuoteAttributive(
    inputBase,
    ctx.past,
    false,
    ctx.preModalNeg,
    ctx.formal,
    ctx.lookups,
    {}
  );
  if (!quoted.ok) {
    return { ok: false, reason: quoted.reason };
  }
  const carrierNoun = hedgeCarrierNoun(prefixKind) ?? "느낌";
  const prefix = `${quoted.text} ${hedgeCarrierNounPhrase(carrierNoun, op.auxiliary.hedgeFocus)} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: quoted.text,
    inputPrefix: inputBase.prefix,
    basePrefix: prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix,
      final: {
        kind: "lemma",
        lemma: tailLemma,
        irregular: irregularFrom(op.auxiliary.hedgeTailIrregular ?? null),
        isVerb: tailKoreanPos === 동사
      }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function adverbialControlBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "A neg + とする adverbial-control 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "A past + とする adverbial-control 영역 외" };
  }
  const projected = stateChangeBase(inputBase, "adverbial");
  const sourceTrace = hostProjectionSourceTrace({
    hostText: projected.prefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix: projected.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      ...projected,
      final: { kind: "lemma", lemma: "만들다", irregular: "ㄹ", isVerb: true }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function makeStateChangeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "A neg + にする make-state-change 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "A past + にする make-state-change 영역 외" };
  }
  const projected = stateChangeBase(inputBase, "adverbial");
  const sourceTrace = hostProjectionSourceTrace({
    hostText: projected.prefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix: projected.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      ...projected,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      policy: { kind: "make_state_change" }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function adverbialStemPostverbAuxiliaryBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult | null {
  const lemma = ctx.adverbialStemLemma;
  if (lemma === undefined) {
    return null;
  }
  if (
    op.auxiliary.kind !== "adverbial_change" &&
    op.auxiliary.kind !== "adverbial_change_potential" &&
    op.auxiliary.kind !== "adverbial_control"
  ) {
    return { ok: false, reason: "adverb stem requires explicit adverbial postverb auxiliary" };
  }
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "adverb stem postverb auxiliary host negation 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "adverb stem postverb auxiliary host past 영역 외" };
  }
  const prefix = `${inputBase.prefix}${lemma} `;
  const stateBase: KoreanLemmaPredicateBase = {
    prefix,
    final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
    ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
  };
  const sourceTrace = hostProjectionSourceTrace({
    hostText: prefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix: prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "last_token"
  });
  if (op.auxiliary.kind === "adverbial_change_potential") {
    return stateChangePotentialBaseResult(stateBase, {
      inputPrefix: inputBase.prefix,
      sourceTokens: op.source.tokens
    });
  }
  if (op.auxiliary.kind === "adverbial_control") {
    return {
      ok: true,
      base: {
        ...stateBase,
        final: { kind: "lemma", lemma: "만들다", irregular: "ㄹ", isVerb: true }
      },
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  return {
    ok: true,
    base: stateBase,
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function postverbAdverbialPotentialPrefix(
  inputBase: KoreanLemmaPredicateBase,
  adverb: string,
  shortNegationPolicy: ShortNegationPolicy | undefined
): string {
  const final = inputBase.final;
  const sahenObject = sahenObjectPhraseFromBase(inputBase, shortNegationPolicy);
  if (sahenObject !== null) {
    return `${sahenObject}${adverb} 할 수 `;
  }
  return `${inputBase.prefix}${adverb} ${conjugate(final.lemma, final.irregular, "ㄹ/을")} 수 `;
}

function sahenObjectPhraseFromBase(
  inputBase: KoreanLemmaPredicateBase,
  shortNegationPolicy: ShortNegationPolicy | undefined
): string | null {
  const final = inputBase.final;
  if (
    shortNegationPolicy !== "sahen_split" ||
    inputBase.prefix.length !== 0 ||
    !final.lemma.endsWith("하다") ||
    final.lemma.length <= "하다".length
  ) {
    return null;
  }
  const sahen = final.lemma.slice(0, -"하다".length);
  return `${sahen}${selectParticle(sahen, "을/를")} `;
}

function scopeControlBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (ctx.past || (ctx.preModalNeg?.chainPast ?? false)) {
    return { ok: false, reason: "past host + ようにする scope-control 영역 외" };
  }
  const hostDorok = projectBaseScopeControlDorok(inputBase, ctx.preModalNeg, ctx);
  if (hostDorok === null) {
    return { ok: false, reason: "ようにする scope-control host projection 영역 외" };
  }
  const basePrefix = `${hostDorok} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostDorok,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      capabilities: { prohibitionHost: "action" }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function mannerActionControlBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const attr = projectBaseAttributive(inputBase, true, ctx.formal);
  if (attr === null) {
    return { ok: false, reason: "ようにする manner-action attributive projection 영역 외" };
  }
  const basePrefix = `${attr} 대로 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: `${attr} 대로`,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function projectBaseScopeControlDorok(
  inputBase: KoreanLemmaPredicateBase,
  negation: NegationOp | null,
  ctx: OpContext
): string | null {
  const final = inputBase.final;
  if (negation === null || negation.chainDepth === 0) {
    return `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "도록")}`;
  }
  if (
    negation.chainDepth === 1 &&
    negation.preferShortNegation &&
    final.isVerb &&
    !ctx.forbidShortNegation
  ) {
    return projectShortNegativeScopeControlDorok(inputBase, ctx.shortNegationPolicy);
  }
  const lowered = applyNegationChainToLemmaBase(inputBase, negation);
  if (lowered === null) {
    return null;
  }
  return `${lowered.prefix}${conjugate(lowered.final.lemma, lowered.final.irregular, "도록")}`;
}

function projectShortNegativeScopeControlDorok(
  inputBase: KoreanLemmaPredicateBase,
  shortNegationPolicy: ShortNegationPolicy | undefined
): string {
  const final = inputBase.final;
  if (
    final.lemma.endsWith("하다") &&
    final.lemma.length > 2 &&
    shortNegationPolicy !== "lexical_prefix"
  ) {
    const sahenPrefix = final.lemma.slice(0, -2);
    return `${inputBase.prefix}${sahenPrefix} 안 ${conjugate("하다", "여", "도록")}`;
  }
  return `${inputBase.prefix}안 ${conjugate(final.lemma, final.irregular, "도록")}`;
}

function stateChangeBaseResult(
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext,
  projection: "adjectival" | "adverbial",
  sourceTokens?: readonly RuntimeHaruToken[]
): OkLemmaBaseResult | RenderFailure {
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "postverb state-change host negation lowering 영역 외" };
  }
  const effectiveProjection = projection === "adjectival" &&
    (ctx.preModalNeg !== null || stateChangeHostClosesNegative(loweredHost))
    ? "adverbial"
    : projection;
  const base = stateChangeBase(loweredHost, effectiveProjection);
  const sourceTrace = sourceTokens === undefined
    ? undefined
    : hostProjectionSourceTrace({
      hostText: base.prefix.trimEnd(),
      inputPrefix: inputBase.prefix,
      basePrefix: base.prefix,
      sourceTokens,
      splitFinal: "last_token"
    });
  return {
    ok: true,
    base,
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function stateChangeHostClosesNegative(base: KoreanLemmaPredicateBase): boolean {
  return base.policy?.kind === "negative_noun_copula_interop" ||
    base.capabilities?.negativeClosure !== undefined;
}

function stateChangePotentialBaseResult(
  base: KoreanLemmaPredicateBase,
  trace?: {
    readonly inputPrefix: string;
    readonly sourceTokens: readonly RuntimeHaruToken[];
  }
): BaseResult {
  const basePrefix = `${base.prefix}${conjugate(base.final.lemma, base.final.irregular, "ㄹ/을")} 수 `;
  const sourceTrace = trace === undefined
    ? undefined
    : hostProjectionSourceTrace({
      hostText: base.prefix.trimEnd(),
      inputPrefix: trace.inputPrefix,
      basePrefix,
      sourceTokens: trace.sourceTokens,
      splitFinal: "none"
    });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false },
      ...(base.policy === undefined ? {} : { policy: base.policy })
    },
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}
