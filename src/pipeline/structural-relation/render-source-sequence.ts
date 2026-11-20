import type { RuntimeHaruToken, SourceTokenSpan } from "../../types/token.js";
import type { ParticleSourceProvenance, RenderPlan, StructuralRelationSequencePart, StructuralRelationSequencePlan } from "../../types/render-plan.js";
import { attachParticleRenderPlan, contractPossessivePronounPlan, particleKeyFromAllomorph } from "../rendering/particle-plan.js";
import { type TranslationUnit, UnitType } from "../translation/unit.js";
import { 구, 기호 } from "../../types/pos.js";
import { sourceSpanForStructuralTokenSpan, uniqueSorted } from "./render-unit-spans.js";

export function composeRelationSourceUnitPlans(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  unitIndexes: readonly number[],
  replacements?: ReadonlyMap<number, RenderPlan>,
): RenderPlan | null {
  const parts = relationSourceUnitSequenceParts(tokens, units, unitIndexes, replacements);
  return parts === null ? null : structuralRelationSequencePlan(parts.map((entry) => entry.part));
}

export interface RelationSourceUnitSequencePart {
  readonly part: StructuralRelationSequencePart;
  readonly unit: TranslationUnit | null;
  readonly sourceSpan: SourceTokenSpan | null;
}

export function relationSourceUnitSequenceParts(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  unitIndexes: readonly number[],
  replacements?: ReadonlyMap<number, RenderPlan>,
): RelationSourceUnitSequencePart[] | null {
  const parts: RelationSourceUnitSequencePart[] = [];
  let previousUnit: TranslationUnit | undefined;
  for (const unitIndex of unitIndexes) {
    const unit = units[unitIndex];
    if (unit === undefined) {
      continue;
    }
    const unitPlan = replacements?.get(unitIndex) ?? relationSourceUnitPlan(tokens, unit);
    if (unitPlan === null && unit.allomorphKey !== null) {
      const host = particleHostPhraseInParts(parts);
      const previousPlan = host?.plan ?? null;
      const particle = particleKeyFromAllomorph(unit.allomorphKey);
      const possessiveContraction = particle === "의" && previousPlan !== null
        ? contractPossessivePronounPlan(previousPlan)
        : null;
      if (possessiveContraction !== null && host !== null) {
        parts.splice(host.fromIndex, parts.length - host.fromIndex, {
          part: possessiveContraction,
          unit: host.unit,
          sourceSpan: combineRelationSourceSpans(host.sourceSpan, unit.sourceSpan)
        });
        previousUnit = unit;
        continue;
      }
      const attached: RenderPlan | null = previousPlan === null
        ? null
        : attachAllomorphParticlePlan(previousPlan, unit.allomorphKey, unit.register, {
          sourceSpan: unit.sourceSpan,
          unit
        });
      if (attached === null || host === null) {
        return null;
      }
      parts.splice(host.fromIndex, parts.length - host.fromIndex, {
        part: attached,
        unit: host.unit,
        sourceSpan: host.sourceSpan
      });
      previousUnit = unit;
      continue;
    }
    if (unitPlan === null) {
      return null;
    }
    if (parts.length > 0) {
      const separator = !unit.attachLeft && previousUnit?.attachRight !== true ? " " : "";
      if (separator.length > 0) {
        parts.push({
          part: { kind: "structuralText", text: separator, koreanPos: 구 },
          unit: null,
          sourceSpan: null
        });
      }
    }
    parts.push({ part: unitPlan, unit, sourceSpan: unit.sourceSpan });
    previousUnit = unit;
  }
  return parts;
}

function particleHostPhraseInParts(
  parts: readonly RelationSourceUnitSequencePart[],
): {
  readonly plan: RenderPlan;
  readonly fromIndex: number;
  readonly unit: TranslationUnit | null;
  readonly sourceSpan: SourceTokenSpan | null;
} | null {
  let index = parts.length - 1;
  while (index >= 0 && parts[index]?.part.kind === "structuralText") {
    index -= 1;
  }
  const anchor = parts[index];
  if (index < 0 || anchor === undefined || anchor.part.kind === "structuralText") {
    return null;
  }
  if (index === parts.length - 1) {
    return { plan: anchor.part, fromIndex: index, unit: anchor.unit, sourceSpan: anchor.sourceSpan };
  }
  const group = parts.slice(index);
  const grouped = structuralRelationSequencePlan(group.map((entry) => entry.part));
  return grouped === null
    ? null
    : {
      plan: grouped,
      fromIndex: index,
      unit: anchor.unit,
      sourceSpan: group.reduce<SourceTokenSpan | null>(
        (span, entry) => combineRelationSourceSpans(span, entry.sourceSpan),
        null
      )
    };
}

function combineRelationSourceSpans(
  left: SourceTokenSpan | null,
  right: SourceTokenSpan | null
): SourceTokenSpan | null {
  if (left === null) {
    return right;
  }
  if (right === null) {
    return left;
  }
  return {
    startOrdinal: Math.min(left.startOrdinal, right.startOrdinal),
    endOrdinal: Math.max(left.endOrdinal, right.endOrdinal)
  };
}

export function structuralRelationSequencePlan(parts: readonly StructuralRelationSequencePart[]): RenderPlan | null {
  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    const only = parts[0];
    return only === undefined || only.kind === "structuralText"
      ? null
      : only;
  }
  return {
    kind: "structuralRelationSequence",
    parts,
    koreanPos: 구,
  } satisfies StructuralRelationSequencePlan;
}

function relationSourceUnitPlan(
  tokens: readonly RuntimeHaruToken[],
  unit: TranslationUnit,
): StructuralRelationSequencePart | null {
  if (unit.renderPlan !== null) {
    return unit.renderPlan;
  }
  if (unit.unitType === UnitType.SYMBOL) {
    const tokenIndexes = uniqueSorted(unit.jpIndices);
    const text = tokenIndexes
      .flatMap((index) => tokens[index] === undefined ? [] : [tokens[index].surface])
      .join("");
    const first = tokenIndexes[0];
    const last = tokenIndexes.at(-1);
    return text.length === 0 || first === undefined || last === undefined
      ? null
      : {
        kind: "structuralText",
        text,
        koreanPos: 기호,
        sourceSpan: sourceSpanForStructuralTokenSpan(tokens, {
          start: first,
          endExclusive: last + 1,
        }),
      };
  }
  return null;
}

function attachAllomorphParticlePlan(
  content: RenderPlan,
  allomorphKey: string,
  register: "none" | "respect",
  source?: ParticleSourceProvenance,
): RenderPlan | null {
  const particle = particleKeyFromAllomorph(allomorphKey);
  if (particle === null) {
    return null;
  }
  return attachParticleRenderPlan(content, particle, {
    register,
    ...(source === undefined ? {} : { source })
  });
}
