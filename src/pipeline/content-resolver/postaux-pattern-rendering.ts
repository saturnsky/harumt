
import type { RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { firstTranslationCandidate } from "../candidate-runtime.js";
import { isSahenBoundVerbAfterSahen } from "../predicate-helpers.js";
import type { ContentResolverRuntimeAccess } from "./types.js";
import { longNegativeLemma, stripFirstNegativeAux } from "../rendering/negative-polish.js";
import { 형용사 } from "../../types/pos.js";

export async function sahenInfo(
  resolver: ContentResolverRuntimeAccess,
  tokens: readonly RuntimeHaruToken[],
  start: number
): Promise<readonly [isSahen: boolean, sahenNoun: string | null]> {
  const isSahen = isSahenBoundVerbAfterSahen(tokens, start);
  const sahenNoun = isSahen ? await getSahenNounKorean(resolver.dictionary, tokens, start) : null;
  return [isSahen, sahenNoun];
}

export async function sahenInfoFromRuntime(
  resolver: ContentResolverRuntimeAccess,
  tokens: readonly RuntimeHaruToken[],
  start: number
): Promise<readonly [isSahen: boolean, sahenNoun: string | null]> {
  const fn = resolver._sahenInfo;
  if (fn !== undefined) {
    return await fn(tokens, start);
  }
  return sahenInfo(resolver, tokens, start);
}

export function stateAdjectiveNegativeRenderPlan(renderPlan: RenderPlan | null): RenderPlan | null {
  if (renderPlan === null || renderPlan.kind !== "lemma") {
    return renderPlan;
  }
  const [auxTokens, removedNegative] = stripFirstNegativeAux(renderPlan.auxTokens);
  if (!removedNegative) {
    return renderPlan;
  }
  const longNegative = longNegativeLemma(renderPlan.koreanLemma, renderPlan.irregular);
  if (longNegative === null) {
    return renderPlan;
  }
  return {
    ...renderPlan,
    koreanLemma: longNegative,
    irregular: null,
    koreanPos: 형용사,
    auxTokens
  };
}

async function getSahenNounKorean(
  dictionary: ContentResolverRuntimeAccess["dictionary"] | undefined,
  tokens: readonly RuntimeHaruToken[],
  i: number
): Promise<string | null> {
  if (i <= 0) {
    return null;
  }
  const prev = tokens[i - 1];
  if (prev === undefined) {
    return null;
  }
  const entry = await dictionary?.lookupTokenRelaxed?.(prev) ?? null;
  const candidate = entry === null ? undefined : firstTranslationCandidate(entry);
  return candidate?.koreanLemma ?? null;
}
