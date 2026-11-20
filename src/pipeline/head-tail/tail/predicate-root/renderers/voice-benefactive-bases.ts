import { potentialParticleInfix, resolvePassiveLemma } from "../../../../../generator/aux-map.js";
import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { respectKoreanPredicateLemma } from "../../../../../generator/honorific.js";
import { selectParticle } from "../../../../../generator/particles.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { BenefactiveAspectOp, NegationOp, PostverbAuxiliaryOp, VoiceOp } from "../grammar.js";
import { hostProjectionSourceTrace, stemFusionSourceTrace, type BaseResult, type BaseSourceTrace, type KoreanLemmaPredicateBase, type OkBaseResult, type OpContext, type PassiveStemOptions, type PredicateBasePolicy, type TailTraceSegment } from "./base-model.js";
import { lowerPotentialFinalNegationBase, passiveStemOptionsWithClass, predicateBaseInfinitiveForm, simpleStemBaseResult, stateChangeBase } from "./base-support.js";
import { irregularFrom, pastNegStemAttributive } from "./final-forms.js";
import { composeDesiderativeStem } from "./desire-bases.js";
import { splitTeBridgeSourceTokens } from "./tail-host-trace.js";

function passiveVoicePolicy(voice: VoiceOp): PredicateBasePolicy {
  return {
    kind: "voice",
    voice: voice.voice,
    ...(voice.passiveClass === undefined ? {} : { passiveClass: voice.passiveClass }),
    adversativePassive: voice.adversativePassive,
    adversativePassiveAgentPromoted: voice.adversativePassiveAgentPromoted,
    ...(voice.adversativePassiveBaseLemma === undefined
      ? {}
      : {
        adversativePassiveBaseLemma: voice.adversativePassiveBaseLemma,
        adversativePassiveBaseIrregular: irregularFrom(voice.adversativePassiveBaseIrregular ?? null)
      })
  };
}

export function benefactiveDesiderativeRequestBase(
  benefactivePredicate: KoreanLemmaPredicateBase
): KoreanLemmaPredicateBase {
  const requestStem = composeDesiderativeStem(
    benefactivePredicate.final.lemma,
    benefactivePredicate.final.irregular
  );
  const requestPhrase = compactEmbeddedGiveDesiderativePhrase(
    `${benefactivePredicate.prefix}${requestStem}`,
    benefactivePredicate.policy?.kind === "benefactive" &&
    benefactivePredicate.policy.lexicalTailAbsorptionKind === "embedded_juda"
  );
  return {
    prefix: `${requestPhrase} `,
    final: { kind: "lemma", lemma: "바라다", irregular: null, isVerb: true },
    policy: {
      kind: "desire",
      nodaConnectiveFlatten: true,
      requestComplementBase: benefactivePredicate
    }
  };
}

function compactEmbeddedGiveDesiderativePhrase(phrase: string, enabled: boolean): string {
  return enabled ? phrase.replace(/ 주길$/u, "주길") : phrase;
}

function potentialTailBase(
  stemAttr: string,
  postIdiomChainDepth: number,
  particleKind: string = "ga",
  focusParticle: string | null = null,
  stemLemma?: string,
  stemIrregular?: IrregularType | null,
  negativeLowering?: Extract<PredicateBasePolicy, { readonly kind: "potential" }>["negativeLowering"]
): KoreanLemmaPredicateBase | null {
  const committedBase: KoreanLemmaPredicateBase = {
    prefix: `${stemAttr} 수${potentialParticleInfix(particleKind, focusParticle)}`,
    final: {
      kind: "lemma",
      lemma: "있다",
      irregular: null,
      isVerb: false
    },
    policy: {
      kind: "potential",
      ...(stemLemma !== undefined ? { stemLemma } : {}),
      ...(stemIrregular !== undefined ? { stemIrregular } : {}),
      ...(negativeLowering === undefined ? {} : { negativeLowering })
    }
  };
  if (postIdiomChainDepth === 0) {
    return committedBase;
  }
  return lowerPotentialFinalNegationBase(committedBase, postIdiomChainDepth);
}

export function potentialBase(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly sourceStemIsVerb?: boolean;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly postIdiomChainDepth: number;
  readonly particleKind?: string;
  readonly focusParticle?: string | null;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): BaseResult {
  const {
    stemLemma, stemIrregular, isVerb, sourceStemIsVerb = isVerb, preStemNeg, stemPast, postIdiomChainDepth,
    particleKind = "ga", focusParticle = null, sourceTokens, lookups, sahenShortNegationSplit
  } = opts;
  if (!sourceStemIsVerb) {
    return { ok: false, reason: "potential_koto_ga_dekiru requires source verbal predicate" };
  }
  let stemAttr: string;
  if (preStemNeg !== null) {
    stemAttr = pastNegStemAttributive({
      stemLemma, stemIrregular, stemKind: isVerb ? "verb" : "adj", past: stemPast, preModalNeg: preStemNeg,
      attrPolicy: "future", useShortHint: false, lookups, sahenShortNegationSplit
    });
  } else {
    stemAttr = stemPast
      ? `${conjugate(stemLemma, stemIrregular, "았/었")}을`
      : conjugate(stemLemma, stemIrregular, "ㄹ/을");
  }
  const tailBase = potentialTailBase(stemAttr, postIdiomChainDepth, particleKind, focusParticle, stemLemma, stemIrregular);
  if (tailBase === null) {
    return { ok: false, reason: "chain ≥ 2 on potential lowering invariant violation" };
  }
  const sourceTrace = sourceTokens === undefined
    ? undefined
    : potentialKotoGaDekiruSourceTrace(sourceTokens, stemAttr, particleKind, focusParticle);
  return {
    ok: true,
    base: tailBase,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function potentialObjectBaseFromAttributive(opts: {
  readonly stemAttr: string;
  readonly postIdiomChainDepth: number;
  readonly particleKind?: string;
  readonly focusParticle?: string | null;
  readonly stemLemma?: string;
  readonly stemIrregular?: IrregularType | null;
}): BaseResult {
  const objectHost = `${opts.stemAttr} 것${potentialObjectParticleSuffix(
    opts.particleKind ?? "ga",
    opts.focusParticle ?? null
  )}할`;
  const tailBase = potentialTailBase(
    objectHost,
    opts.postIdiomChainDepth,
    "ga",
    null,
    opts.stemLemma,
    opts.stemIrregular,
    "su_eopda"
  );
  if (tailBase === null) {
    return { ok: false, reason: "chain ≥ 2 on attributive object potential lowering invariant violation" };
  }
  return {
    ok: true,
    base: tailBase,
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom"
  };
}

function potentialObjectParticleSuffix(
  particleKind: string,
  focusParticle: string | null
): string {
  if (focusParticle !== null) {
    return potentialParticleInfix(particleKind, focusParticle);
  }
  if (particleKind === "wa") {
    return `${selectParticle("것", "은/는")} `;
  }
  if (particleKind === "mo") {
    return "도 ";
  }
  return `${selectParticle("것", "을/를")} `;
}

function potentialKotoGaDekiruSourceTrace(
  sourceTokens: readonly RuntimeHaruToken[],
  stemProjectionText: string,
  particleKind: string,
  focusParticle: string | null
): BaseSourceTrace | undefined {
  const split = splitPotentialKotoGaDekiruSourceTokens(sourceTokens);
  if (split === null) {
    return undefined;
  }
  const infix = potentialParticleInfix(particleKind, focusParticle);
  const particleTokens = split.carrierTokens.slice(1);
  const carrierPrefixSegments: TailTraceSegment[] = [{
    text: " 수",
    sourceTokens: split.carrierTokens.slice(0, 1),
    kind: "modal",
    projectionConfidence: "semantic"
  }];
  if (infix.length > 0) {
    carrierPrefixSegments.push({
      text: infix,
      sourceTokens: particleTokens.length > 0 ? particleTokens : split.carrierTokens,
      kind: "modal",
      projectionConfidence: "semantic"
    });
  }
  return {
    inputProjectionText: stemProjectionText,
    carrierPrefixSegments,
    finalSourceTokens: split.finalTokens,
    finalKind: "aux"
  };
}

function splitPotentialKotoGaDekiruSourceTokens(
  sourceTokens: readonly RuntimeHaruToken[]
): { readonly carrierTokens: readonly RuntimeHaruToken[]; readonly finalTokens: readonly RuntimeHaruToken[] } | null {
  const dekiruIdx = sourceTokens.findIndex((token, index) =>
    index > 0 &&
    (token.dictionaryForm === "できる" ||
      token.dictionaryForm === "出来る" ||
      token.surface === "でき" ||
      token.surface === "出来")
  );
  if (dekiruIdx <= 0) {
    return null;
  }
  return {
    carrierTokens: sourceTokens.slice(0, dekiruIdx),
    finalTokens: sourceTokens.slice(dekiruIdx)
  };
}

export function voiceBase(opts: {
  readonly voice: VoiceOp;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly passiveStemOptions?: PassiveStemOptions;
  readonly lookups: LookupTables;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
  readonly sahenShortNegationSplit: boolean;
}): BaseResult {
  const { voice, stemLemma, stemIrregular, isVerb, passiveStemOptions, lookups, sahenShortNegationSplit } = opts;
  const stemFusionTrace = (relativePrefix: string): { readonly sourceTrace?: BaseSourceTrace } => {
    const sourceTrace = opts.sourceTokens === undefined
      ? undefined
      : stemFusionSourceTrace(relativePrefix, opts.sourceTokens, { splitFinal: "none" });
    return sourceTrace === undefined ? {} : { sourceTrace };
  };
  if (voice.voice === "honorific") {
    const honorificLemma = respectKoreanPredicateLemma(
      stemLemma,
      stemIrregular,
      lookups.KOREAN_HONORIFIC_PREDICATE_LEMMAS,
      lookups.KOREAN_REALIZED_HONORIFIC_PREDICATE_LEMMAS
    );
    if (honorificLemma === null) {
      return { ok: false, reason: "honorific voice requires a Korean predicate lemma" };
    }
    return {
      ok: true,
      base: {
        prefix: "",
        final: { kind: "lemma", lemma: honorificLemma, irregular: null, isVerb },
        policy: { kind: "voice", voice: voice.voice }
      }
    };
  }
  if (!isVerb) {
    if (voice.voice === "potential" && isExistentialPotentialHost(stemLemma, stemIrregular)) {
      const base = potentialTailBase(conjugate(stemLemma, stemIrregular, "ㄹ/을"), 0);
      return base === null
        ? { ok: false, reason: "existential potential lowering invariant violation" }
        : {
          ok: true,
          base,
          chainOnFinalSupported: false,
          finalNegationLoweringPolicy: "potential_idiom"
        };
    }
    if (voice.voice === "causative" || voice.voice === "causative_passive") {
      const stemGe = conjugate(stemLemma, stemIrregular, "게");
      return {
        ok: true,
        base: {
          prefix: `${stemGe} `,
          final: voice.voice === "causative"
            ? { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
            : { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
          policy: voice.voice === "causative"
            ? { kind: "causative", sourceLemma: stemLemma, sourceIrregular: stemIrregular }
            : {
              kind: "voice",
              voice: "causative_passive",
              ...(voice.passiveClass === undefined ? {} : { passiveClass: voice.passiveClass })
            }
        },
        ...stemFusionTrace(`${stemGe} `)
      };
    }
    return {
      ok: true,
      base: simpleStemBaseResult(stemLemma, stemIrregular, false).base,
      chainOnFinalSupported: true,
      interOpPastProjection: "committed"
    };
  }
  if (voice.voice === "potential") {
    const res = potentialBase({
      stemLemma,
      stemIrregular,
      isVerb,
      preStemNeg: null,
      stemPast: false,
      postIdiomChainDepth: 0,
      lookups,
      sahenShortNegationSplit
    });
    if (!res.ok) return res;
    return {
      ...res,
      chainOnFinalSupported: false,
      finalNegationLoweringPolicy: "potential_idiom"
    };
  }
  if (voice.voice === "passive") {
    const effectivePassiveOptions = passiveStemOptionsWithClass(passiveStemOptions, voice.passiveClass);
    if (voice.passiveClass === "causative_coercive") {
      const stemGe = conjugate(stemLemma, stemIrregular, "게");
      return {
        ok: true,
        base: {
          prefix: `${stemGe} `,
          final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
          policy: passiveVoicePolicy(voice)
        },
        ...stemFusionTrace(`${stemGe} `)
      };
    }
    if (voice.passiveClass === "causative_passive_neutral" && stemLemma === "하다") {
      return {
        ok: true,
        base: {
          prefix: "",
          final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
          policy: passiveVoicePolicy(voice)
        }
      };
    }
    if (voice.passiveClass === "causative_passive_neutral") {
      const stemGe = conjugate(stemLemma, stemIrregular, "게");
      return {
        ok: true,
        base: {
          prefix: `${stemGe} `,
          final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
          policy: passiveVoicePolicy(voice)
        },
        ...stemFusionTrace(`${stemGe} `)
      };
    }
    if (effectivePassiveOptions.sahenCompound === true && effectivePassiveOptions.sahenNoun !== undefined) {
      const [supportLemma, supportIrregular] = resolvePassiveLemma("하다", "여", { ...effectivePassiveOptions, lookups });
      if (voice.adversativePassive) {
        const sahenAeo = `${effectivePassiveOptions.sahenNoun}${conjugate(
          voice.adversativePassiveAgentPromoted ? "하다" : supportLemma,
          voice.adversativePassiveAgentPromoted ? "여" : supportIrregular,
          "아/어"
        )} `;
        return {
          ok: true,
          base: {
            prefix: sahenAeo,
            final: { kind: "lemma", lemma: "버리다", irregular: null, isVerb: true },
            policy: passiveVoicePolicy(voice)
          },
          ...stemFusionTrace(sahenAeo)
        };
      }
      return {
        ok: true,
        base: {
          prefix: effectivePassiveOptions.sahenNoun,
          final: { kind: "lemma", lemma: supportLemma, irregular: supportIrregular, isVerb: true },
          policy: passiveVoicePolicy(voice)
        },
        ...stemFusionTrace(effectivePassiveOptions.sahenNoun)
      };
    }
    if (voice.adversativePassive) {
      const [baseLemma, baseIrregular] = voice.adversativePassiveBaseLemma !== undefined
        ? [voice.adversativePassiveBaseLemma, irregularFrom(voice.adversativePassiveBaseIrregular ?? null)] as const
        : voice.adversativePassiveAgentPromoted
          ? [stemLemma, stemIrregular] as const
          : resolvePassiveLemma(stemLemma, stemIrregular, { ...effectivePassiveOptions, lookups });
      const adversativeAeo = `${conjugate(baseLemma, baseIrregular, "아/어")} `;
      return {
        ok: true,
        base: {
          prefix: adversativeAeo,
          final: { kind: "lemma", lemma: "버리다", irregular: null, isVerb: true },
          policy: passiveVoicePolicy(voice)
        },
        ...stemFusionTrace(adversativeAeo)
      };
    }
    const [passiveLemma, passiveIrregular] = resolvePassiveLemma(stemLemma, stemIrregular, { ...effectivePassiveOptions, lookups });
    return {
      ok: true,
      base: {
        prefix: "",
        final: { kind: "lemma", lemma: passiveLemma, irregular: passiveIrregular, isVerb: true },
        capabilities: { prohibitionHost: "action" },
        policy: passiveVoicePolicy(voice)
      }
    };
  }
  if (voice.voice === "causative_passive") {
    if (voice.passiveClass === "causative_coercive") {
      const stemGeCoercive = conjugate(stemLemma, stemIrregular, "게");
      return {
        ok: true,
        base: {
          prefix: `${stemGeCoercive} `,
          final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
          policy: {
            kind: "voice",
            voice: "causative_passive",
            passiveClass: voice.passiveClass
          }
        },
        ...stemFusionTrace(`${stemGeCoercive} `)
      };
    }
    const stemGe = conjugate(stemLemma, stemIrregular, "게");
    return {
      ok: true,
      base: {
        prefix: `${stemGe} `,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
        policy: {
          kind: "voice",
          voice: "causative_passive",
          ...(voice.passiveClass === undefined ? {} : { passiveClass: voice.passiveClass })
        }
      },
      ...stemFusionTrace(`${stemGe} `)
    };
  }
  const stemGe = conjugate(stemLemma, stemIrregular, "게");
  return {
    ok: true,
    base: {
      prefix: `${stemGe} `,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      capabilities: { prohibitionHost: "action" },
      policy: { kind: "causative", sourceLemma: stemLemma, sourceIrregular: stemIrregular }
    },
    ...stemFusionTrace(`${stemGe} `)
  };
}

function isExistentialPotentialHost(
  stemLemma: string,
  stemIrregular: IrregularType | null
): boolean {
  return stemIrregular === null && (stemLemma === "있다" || stemLemma === "없다");
}

export function makeStateChangeCausativeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "A neg + にさせる make-state-change-causative 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "A past + にさせる make-state-change-causative 영역 외" };
  }
  const projected = stateChangeBase(inputBase, "adverbial");
  const sourceTrace = hostProjectionSourceTrace({
    hostText: projected.prefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix: projected.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "last_token"
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

export function benefactiveBase(
  benefactive: BenefactiveAspectOp,
  stemLemma: string,
  stemIrregular: IrregularType | null,
  stemInfinitive?: string
): BaseResult {
  const payload = benefactive.benefactive;
  const tailLemma = payload.tailLemma ?? (payload.honorific ? "주시다" : "주다");
  const tailIrregular = payload.tailIrregular;
  const lexicalTailAbsorptionKind = payload.lexicalTailAbsorptionKind ??
    (stemLemma.endsWith("주다") ? (payload.honorific || tailLemma === "주시다" ? "honorific_jusida" : "embedded_juda") : null);
  const absorbedLemma = absorbedBenefactiveLemma(stemLemma, { ...payload, lexicalTailAbsorptionKind }, tailLemma);
  const stemPart = absorbedLemma === null
    ? (stemInfinitive ?? conjugate(stemLemma, stemIrregular, "아/어"))
    : "";
  const effectiveTailLemma = absorbedLemma ?? tailLemma;
  const requestComplementBase: KoreanLemmaPredicateBase = {
    prefix: "",
    final: { kind: "lemma", lemma: stemLemma, irregular: stemIrregular, isVerb: true }
  };
  const policy: PredicateBasePolicy = {
    kind: "benefactive",
    family: payload.kind,
    potential: payload.potential,
    lexicalTailAbsorptionKind,
    scopeBridgeNegativeAttributive: "completed",
    requestComplementBase,
    desireMode: payload.potential
      ? "unsupported"
      : (payload.kind === "ageru" ? "generic" : "request")
  };

  if (payload.potential) {
    const tailAttr = conjugate(effectiveTailLemma, absorbedLemma === null ? tailIrregular : null, "ㄹ/을");
    return {
      ok: true,
      base: {
        prefix: absorbedLemma === null ? `${stemPart} ${tailAttr} 수 ` : `${tailAttr} 수 `,
        final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false },
        policy
      },
      chainOnFinalSupported: false,
      finalNegationLoweringPolicy: "potential_idiom"
    };
  }

  return {
    ok: true,
    base: {
      prefix: absorbedLemma === null ? `${stemPart} ` : "",
      final: {
        kind: "lemma",
        lemma: effectiveTailLemma,
        irregular: absorbedLemma === null ? tailIrregular : null,
        isVerb: true
      },
      capabilities: { prohibitionHost: "action" },
      policy
    },
    chainOnFinalSupported: true
  };
}

export function benefactiveBaseFromInput(
  benefactive: BenefactiveAspectOp,
  inputBase: KoreanLemmaPredicateBase
): BaseResult {
  const causativeFlatten = causativeReceivePivotBenefactiveBase(benefactive, inputBase);
  if (causativeFlatten !== null) {
    return causativeFlatten;
  }
  const res = benefactiveBase(
    benefactive,
    inputBase.final.lemma,
    inputBase.final.irregular,
    predicateBaseInfinitiveForm(inputBase)
  );
  if (!res.ok) {
    return res;
  }
  const sourceTrace = simpleBenefactiveSourceTrace(res, benefactive.source.tokens);
  return {
    ...res,
    base: {
      ...res.base,
      prefix: `${inputBase.prefix}${res.base.prefix}`,
      ...(res.base.policy?.kind === "benefactive"
        ? {
          policy: {
            ...res.base.policy,
            requestComplementBase: inputBase
          }
        }
        : {})
    },
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function simpleBenefactiveSourceTrace(
  result: OkBaseResult,
  sourceTokens: readonly RuntimeHaruToken[]
): BaseSourceTrace | undefined {
  if (
    result.base.policy?.kind !== "benefactive" ||
    result.base.prefix.length === 0 ||
    sourceTokens.length === 0
  ) {
    return undefined;
  }
  const split = splitTeBridgeSourceTokens(sourceTokens);
  if (result.base.policy.potential) {
    return potentialBenefactiveSourceTrace(result, split);
  }
  const inputProjectionText = result.base.prefix.trimEnd();
  const spacing = result.base.prefix.slice(inputProjectionText.length);
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (spacing.length > 0) {
    carrierPrefixSegments.push({
      text: spacing,
      sourceTokens: split.bridgeTokens,
      kind: "aux",
      projectionConfidence: "semantic"
    });
  }
  return {
    inputProjectionText,
    inputProjectionExtraSourceTokens: split.bridgeTokens,
    carrierPrefixSegments,
    finalSourceTokens: split.finalTokens,
    finalKind: "aux"
  };
}

function potentialBenefactiveSourceTrace(
  result: OkBaseResult,
  split: { readonly bridgeTokens: readonly RuntimeHaruToken[]; readonly finalTokens: readonly RuntimeHaruToken[] }
): BaseSourceTrace | undefined {
  const matched = /^(.*?)(\s+\S+ 수\s*)$/.exec(result.base.prefix);
  const inputProjectionText = matched?.[1] ?? "";
  const tailCarrierText = matched?.[2] ?? result.base.prefix;
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (inputProjectionText.length > 0) {
    const spacing = tailCarrierText.match(/^\s*/)?.[0] ?? "";
    const tailText = tailCarrierText.slice(spacing.length);
    if (spacing.length > 0) {
      carrierPrefixSegments.push({
        text: spacing,
        sourceTokens: split.bridgeTokens,
        kind: "aux",
        projectionConfidence: "semantic"
      });
    }
    if (tailText.length > 0) {
      carrierPrefixSegments.push({
        text: tailText,
        sourceTokens: split.finalTokens,
        kind: "modal",
        projectionConfidence: "semantic"
      });
    }
  } else {
    carrierPrefixSegments.push({
      text: tailCarrierText,
      sourceTokens: split.finalTokens,
      kind: "modal",
      projectionConfidence: "semantic"
    });
  }
  return {
    inputProjectionText,
    inputProjectionExtraSourceTokens: inputProjectionText.length > 0 ? split.bridgeTokens : [],
    carrierPrefixSegments,
    finalSourceTokens: split.finalTokens,
    finalKind: "aux"
  };
}

function causativeReceivePivotBenefactiveBase(
  benefactive: BenefactiveAspectOp,
  inputBase: KoreanLemmaPredicateBase
): BaseResult | null {
  const payload = benefactive.benefactive;
  if (inputBase.policy?.kind !== "causative") {
    return null;
  }
  if (payload.potential) {
    return null;
  }
  if (payload.causativeRenderPolicy === "lexical_recipient_humble_action") {
    const actionStem = conjugate(inputBase.policy.sourceLemma, inputBase.policy.sourceIrregular, "아/어");
    const tailLemma = payload.honorific || payload.kind === "itadaku" ? "드리다" : "주다";
    return {
      ok: true,
      base: {
        prefix: `${actionStem} `,
        final: { kind: "lemma", lemma: tailLemma, irregular: null, isVerb: true },
        policy: {
          kind: "benefactive",
          family: payload.kind,
          potential: false,
          scopeBridgeNegativeAttributive: "completed",
          desireMode: payload.kind === "morau" || payload.kind === "itadaku" ? "request" : "unsupported"
        }
      },
      chainOnFinalSupported: true
    };
  }
  if (payload.causativeRenderPolicy === "implicit_permission_sahen_periphrastic") {
    const hostText = `${inputBase.prefix}${conjugate(inputBase.final.lemma, inputBase.final.irregular, "아/어")}`;
    const basePrefix = `${hostText} `;
    const sourceTrace = hostProjectionSourceTrace({
      hostText,
      inputPrefix: inputBase.prefix,
      basePrefix,
      sourceTokens: benefactive.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: {
        prefix: basePrefix,
        final: { kind: "lemma", lemma: "주시다", irregular: null, isVerb: true },
        policy: {
          kind: "benefactive",
          family: payload.kind,
          potential: false,
          scopeBridgeNegativeAttributive: "completed",
          desireMode: payload.kind === "morau" || payload.kind === "itadaku" ? "request" : "unsupported"
        }
      },
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  if (payload.causativeRenderPolicy === "implicit_permission_sahen_lexical_causative") {
    const causativeLemma = sahenCausativeLemma(inputBase.policy.sourceLemma);
    if (causativeLemma === null) {
      return null;
    }
    return {
      ok: true,
      base: {
        prefix: `${conjugate(causativeLemma, null, "아/어")} `,
        final: { kind: "lemma", lemma: "주시다", irregular: null, isVerb: true },
        policy: {
          kind: "benefactive",
          family: payload.kind,
          potential: false,
          scopeBridgeNegativeAttributive: "completed",
          desireMode: payload.kind === "morau" || payload.kind === "itadaku" ? "request" : "unsupported"
        }
      },
      chainOnFinalSupported: true
    };
  }
  return null;
}

function sahenCausativeLemma(sourceLemma: string): string | null {
  if (!sourceLemma.endsWith("하다") || sourceLemma.length <= "하다".length) {
    return null;
  }
  return `${sourceLemma.slice(0, -"하다".length)}시키다`;
}

function absorbedBenefactiveLemma(
  stemLemma: string,
  payload: BenefactiveAspectOp["benefactive"],
  tailLemma: string
): string | null {
  if (!stemLemma.endsWith("주다")) {
    return null;
  }
  const absorptionKind = payload.lexicalTailAbsorptionKind ?? null;
  const base = stemLemma.slice(0, -"주다".length);
  if (payload.recipientSideHumble && payload.kind === "itadaku") {
    return `${base}드리다`;
  }
  if (absorptionKind === "honorific_jusida" || payload.honorific || tailLemma === "주시다") {
    return `${base}주시다`;
  }
  return stemLemma;
}
