import { asIrregular, type IrregularType } from "../../generator/conjugator.js";
import { isNegativeAuxToken } from "./negative-polish.js";
import { rederiveStemDerivation } from "./stem-derivation.js";
import { resolveCopulaAdj } from "../semantics/copula-tail-runtime.js";
import type { TeFormConnectiveRole } from "../head-tail/tail/predicate-root/grammar.js";
import { replaceTailChainConnective, replaceTailRootStemLemma } from "../head-tail/lifecycle/rewrite.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { AttributiveRealization, YoudaModalityPlan, LemmaRealization, RenderPlan, StemDerivation, StemDerivationHost, TeConnectiveBoundaryChoice, Voice } from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { PassiveClass } from "../voice-class.js";
import { POS4, POS5, _撥音便, 助動詞, 助動詞_タ, 助動詞_ナイ, 助動詞_ヌ, 助動詞_レル, 終止形_撥音便, 명사 } from "../../types/pos.js";
import { youdaModalityPayload, reasonBecausePayload, nominalConnectiveScopePayload, nominalDemoAruPayload, auxTokensOf, isWakeWrapperPlan, wakeWrapperPrefix, withWakeWrapperPrefix, wrapperPrefix, shouldRewriteSurfacePrefixOnLemma, shouldRewriteSurfaceSuffixOnLemma, shouldRewriteSurfacePrefixOnConnective, shouldRewriteSurfaceSuffixOnConnective, isRenderPlan } from "./render-plan-payloads.js";

export function voiceFromFlags(options: { forcePassive?: boolean; isPotential?: boolean } = {}): Voice {
  if (options.forcePassive === true) {
    return "passive";
  }
  if (options.isPotential === true) {
    return "potential";
  }
  return "active";
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
