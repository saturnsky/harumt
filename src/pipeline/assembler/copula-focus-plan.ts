import type { MorphemeEntry } from "../../types/dictionary.js";
import type { RenderPlan } from "../../types/render-plan.js";
import { 동사, 부사, 형용사 } from "../../types/pos.js";
import { selectedCommitmentCandidate } from "../commitment/span-evidence.js";
import type { CopulaFocusAdjunctRealization } from "../head-tail/data/copula-focus-adjunct-table.js";
import { resolveCopulaAdj } from "../semantics/copula-tail-runtime.js";
import type { AssemblyContentSpan } from "../assembly-content-span.js";

export interface CopulaFocusAdjunctRequest {
  readonly realization: CopulaFocusAdjunctRealization;
  readonly hostEntry: MorphemeEntry | null;
  readonly hostPos: number;
}

export function applyCopulaFocusAdjunctRenderPlan(
  plan: RenderPlan | null,
  span: AssemblyContentSpan
): RenderPlan | null {
  const request = span.copulaFocusAdjunct;
  if (plan === null || request === null || request === undefined) {
    return plan;
  }
  const { nominalParticle, predicateEnding } = request.realization;
  const lemmaPlan = plan.kind === "lemma" ? plan : null;
  const winner = selectedCommitmentCandidate(span);
  const baseLemma = lemmaPlan?.koreanLemma ?? winner?.koreanLemma ?? winner?.korean ?? null;
  const basePos = lemmaPlan?.koreanPos ?? winner?.koreanPos ?? null;
  if (baseLemma === null || baseLemma.length === 0 || basePos === null || basePos === 부사) {
    return plan;
  }
  const [hostLemma, hostLemmaPos, hostIrregular] = resolveCopulaAdj(
    request.hostEntry ?? lemmaPlan?.entry ?? null,
    baseLemma,
    basePos,
    lemmaPlan?.irregular ?? winner?.irregular ?? null,
    request.hostPos
  );
  if (hostLemmaPos === 형용사 || hostLemmaPos === 동사) {
    return predicateEnding === null
      ? plan
      : {
        kind: "conjugatedLemma",
        koreanLemma: hostLemma,
        irregular: hostIrregular ?? null,
        koreanPos: hostLemmaPos,
        ending: predicateEnding
      };
  }
  return nominalParticle === null
    ? plan
    : { kind: "particleizedContent", content: plan, particle: nominalParticle, koreanPos: hostLemmaPos };
}
