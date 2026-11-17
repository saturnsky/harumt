import { PARTICLE_PAIRS, type ParticleKey } from "../../generator/particles.js";
import type { ParticleSourceProvenance, RenderPlan } from "../../types/render-plan.js";
import { PRONOUN_POSSESSIVE_CONTRACTIONS, PRONOUN_SUBJECT_CONTRACTIONS } from "../pronominal-no-dispatch.js";
import { 구, 대명사 } from "../../types/pos.js";

export function particleKeyFromAllomorph(allomorphKey: string): ParticleKey | null {
  return allomorphKey in PARTICLE_PAIRS ? allomorphKey as ParticleKey : null;
}

export function attachParticleRenderPlan(
  content: RenderPlan,
  particle: ParticleKey,
  options: { readonly register?: "none" | "respect"; readonly source?: ParticleSourceProvenance } = {},
): RenderPlan | null {
  if (
    content.kind === "lemma" &&
    content.auxTokens.length === 0 &&
    content.prefix === undefined &&
    content.suffix === undefined &&
    (content.connective === undefined || content.connective === null) &&
    (content.sfp === undefined || content.sfp === null)
  ) {
    return {
      kind: "particleizedLemma",
      koreanLemma: content.koreanLemma,
      koreanPos: content.koreanPos,
      irregular: content.irregular,
      particle,
      ...(options.register === undefined ? {} : { register: options.register }),
      ...(options.source === undefined ? {} : { particleSource: options.source }),
    };
  }
  if (
    content.kind === "conjugatedLemma" &&
    "koreanLemma" in content &&
    "ending" in content &&
    content.particle === undefined
  ) {
    return {
      ...content,
      particle,
      ...(options.source === undefined ? {} : { particleSource: options.source }),
    };
  }
  return {
    kind: "particleizedContent",
    content,
    particle,
    ...(options.register === undefined ? {} : { register: options.register }),
    ...(options.source === undefined ? {} : { particleSource: options.source }),
    koreanPos: 구,
    ...(particle === "이/가" ? { subjectParticleStem: subjectParticleStemForPlan(content) } : {}),
  };
}

export function contractPossessivePronounPlan(content: RenderPlan): RenderPlan | null {
  if (
    content.kind !== "lemma" ||
    content.koreanPos !== 대명사 ||
    content.auxTokens.length !== 0 ||
    content.prefix !== undefined ||
    content.suffix !== undefined ||
    (content.connective !== undefined && content.connective !== null)
  ) {
    return null;
  }
  const contracted = PRONOUN_POSSESSIVE_CONTRACTIONS[content.koreanLemma];
  return contracted === undefined ? null : { ...content, koreanLemma: contracted };
}

function subjectParticleStemForPlan(plan: RenderPlan): string | null {
  if (plan.kind === "lemma" && plan.koreanPos === 대명사) {
    return PRONOUN_SUBJECT_CONTRACTIONS[plan.koreanLemma] ??
      PRONOUN_POSSESSIVE_CONTRACTIONS[plan.koreanLemma] ?? null;
  }
  if (plan.kind === "structuralRelationSequence") {
    const stems = plan.parts.flatMap((part) => part.kind === "structuralText"
      ? []
      : [subjectParticleStemForPlan(part)]
    ).filter((stem): stem is string => stem !== null);
    return stems.length === 1 ? stems[0]! : null;
  }
  return null;
}
