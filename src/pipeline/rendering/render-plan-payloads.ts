import type { RuntimeHaruToken } from "../../types/token.js";
import type { AttributiveRealization, ReasonBecausePlan, ReasonBecausePayload, SimilePredicatePayload, YoudaModalityPlan, YoudaModalityPayload, NominalConnectiveScopePlan, NominalConnectiveScopePayload, NominalDemoAruPlan, NominalDemoAruPayload, LemmaRealization, RenderPlan, WakeExplanationPlan } from "../../types/render-plan.js";

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

export function youdaModalityPayload(plan: YoudaModalityPlan): YoudaModalityPayload {
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

export function reasonBecausePayload(plan: ReasonBecausePlan): ReasonBecausePayload {
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

export function nominalConnectiveScopePayload(plan: NominalConnectiveScopePlan): NominalConnectiveScopePayload {
  if ("payload" in plan) {
    return plan.payload;
  }
  return {
    content: plan.content,
    connectiveKind: plan.connectiveKind,
    koreanPos: plan.koreanPos ?? null
  };
}

export function nominalDemoAruPayload(plan: NominalDemoAruPlan): NominalDemoAruPayload {
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

export function auxTokensOf(plan: LemmaRealization | AttributiveRealization): readonly RuntimeHaruToken[] {
  return plan.auxTokens;
}

type WakeWrapperRenderPlan = WakeExplanationPlan;

export function isWakeWrapperPlan(plan: RenderPlan): plan is WakeWrapperRenderPlan {
  return plan.kind === "wakeExplanation";
}

export type WakePrefixPlan = WakeExplanationPlan;

export function isWakePrefixPlan(plan: RenderPlan): plan is WakePrefixPlan {
  return isWakeWrapperPlan(plan);
}

export function wakeWrapperPrefix(plan: WakeWrapperRenderPlan): RenderPlan | string | undefined {
  if ("prefix" in plan && plan.prefix !== undefined) {
    return plan.prefix ?? undefined;
  }
  if ("payload" in plan && "prefix" in plan.payload) {
    return plan.payload.prefix;
  }
  return undefined;
}

export function withWakeWrapperPrefix(plan: WakeWrapperRenderPlan, prefix: RenderPlan): RenderPlan {
  if ("prefix" in plan) {
    return { ...plan, prefix };
  }
  if ("payload" in plan && "prefix" in plan.payload) {
    return { ...plan, payload: { ...plan.payload, prefix } } as RenderPlan;
  }
  return plan;
}

export function wrapperPrefix(plan: WakeWrapperRenderPlan): RenderPlan | string | undefined {
  if ("prefix" in plan && plan.prefix !== undefined) {
    return plan.prefix ?? undefined;
  }
  if ("payload" in plan && "prefix" in plan.payload) {
    return plan.payload.prefix;
  }
  return undefined;
}

export function shouldRewriteSurfacePrefixOnLemma(plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>): boolean {
  return plan.rewritePrefixOnLemmaReplace === true;
}

export function shouldRewriteSurfaceSuffixOnLemma(plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>): boolean {
  return plan.rewriteSuffixOnLemmaReplace === true;
}

export function shouldRewriteSurfacePrefixOnConnective(plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>): boolean {
  return plan.rewritePrefixOnConnectiveReplace === true;
}

export function shouldRewriteSurfaceSuffixOnConnective(plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>): boolean {
  return plan.rewriteSuffixOnConnectiveReplace === true;
}

export function isRenderPlan(value: RenderPlan | string | null | undefined): value is RenderPlan {
  return value !== undefined && value !== null && typeof value !== "string";
}
