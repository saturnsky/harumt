import { sinoKorean } from "./numerals.js";
import type { NumeralPlan } from "../types/numeric-base.js";

export function realizeNumeral(plan: NumeralPlan): string {
  const forceArabic = plan.positional || plan.forceArabicByTargetConvention === true;
  let body: string;
  if (plan.counterKey.length === 0) {
    body = plan.arabicSurface?.text
      ?? (forceArabic
        ? String(plan.parsedNumber)
        : (plan.lexicalOwnerSurface
          ?? sinoKorean(plan.parsedNumber)
          ?? String(plan.parsedNumber)));
  } else {
    const rendered = plan.family.render(plan.parsedNumber, plan.counterKey, {
      forceArabic,
      arabicSurface: plan.arabicSurface
    });
    body = rendered === undefined
      ? (plan.arabicSurface?.text ?? String(plan.parsedNumber))
      : rendered[0];
  }
  const approximation = plan.approximation;
  const suffix = approximation === undefined || approximation === null ? "" : ` ${approximation.korean}`;
  return `${plan.symbolicPrefix}${body}${suffix}`;
}
