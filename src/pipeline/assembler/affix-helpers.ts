import type { MorphemeEntry, MorphemeSense } from "../../types/dictionary.js";
import type { ConjugatedLemmaPlan, RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { resolveNominalAttributiveEvidence } from "../attributive.js";
import { lookupConditionMatches, type LookupConditionValue } from "../context.js";
import { argumentNounLookupForms } from "../semantics/helpers.js";
import { NOMINAL_BITS, POS01, pos0in, 接尾辞_形容詞的, 名詞_数詞, 동사, 명사, 접미사, 형용사 } from "../../types/pos.js";
import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import { winner } from "../translation/access.js";
import { type TranslationUnit, UnitType } from "../translation/unit.js";

export function prefixAttachRightForToken(
  token: RuntimeHaruToken,
  tokens: readonly RuntimeHaruToken[],
  index: number,
  defaultAttachRight: boolean
): boolean {
  if (token.dictionaryForm === "約" || token.surface === "約") {
    const next = nextNonSpaceIndex(tokens, index + 1, tokens.length);
    if (next !== null && ((tokens[next]?.pos ?? 0) & POS01) === 名詞_数詞) {
      return false;
    }
  }
  return defaultAttachRight;
}

export function modifiedHeadNounMatchingSelectedSense(
  sense: MorphemeSense,
  tokens: readonly RuntimeHaruToken[],
  index: number,
  lookups: LookupTables
): RuntimeHaruToken | null {
  const head = directModifiedHeadNoun(tokens, index);
  if (head === null) {
    return null;
  }
  for (const condition of modifiedHeadNounLookupConditions(sense)) {
    if (lookupConditionMatches(condition, argumentNounLookupForms(head), lookups)) {
      return head;
    }
  }
  return null;
}

function directModifiedHeadNoun(tokens: readonly RuntimeHaruToken[], index: number): RuntimeHaruToken | null {
  const nextIndex = nextNonSpaceIndex(tokens, index + 1, tokens.length);
  if (nextIndex === null) {
    return null;
  }
  const next = tokens[nextIndex];
  return next !== undefined && pos0in(next.pos, NOMINAL_BITS) ? next : null;
}

function modifiedHeadNounLookupConditions(sense: MorphemeSense): readonly LookupConditionValue[] {
  const frames = [
    ...(sense.senseFrame === undefined ? [] : [sense.senseFrame]),
    ...(sense.senseFrames ?? [])
  ];
  const conditions: LookupConditionValue[] = [];
  for (const frame of frames) {
    const lexical = mappingValue(frame, "lexicalConditions") ?? mappingValue(frame, "lexical_conditions");
    if (lexical === null) {
      continue;
    }
    const value = valueFromMapping(lexical, "modifiedHeadNounLookup") ?? valueFromMapping(lexical, "modified_head_noun_lookup");
    if (value !== undefined) {
      conditions.push(value);
    }
  }
  return conditions;
}

function mappingValue(value: unknown, key: string): Record<string, unknown> | null {
  const item = valueFromMapping(value, key);
  return item !== null && typeof item === "object" && !Array.isArray(item)
    ? item as Record<string, unknown>
    : null;
}

function valueFromMapping(value: unknown, key: string): unknown {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

export function kataVerbHostAttributivePlan(unit: TranslationUnit): ConjugatedLemmaPlan | null {
  const plan = unit.renderPlan;
  if (plan?.kind !== "lemma" || plan.connective !== "고" || plan.koreanPos !== 동사) {
    return null;
  }
  return {
    kind: "conjugatedLemma",
    koreanLemma: plan.koreanLemma,
    irregular: plan.irregular,
    koreanPos: plan.koreanPos,
    ending: "ㄴ/는",
    auxTokens: plan.auxTokens,
    ...(plan.jpDictForm === undefined || plan.jpDictForm === null ? {} : { jpDictForm: plan.jpDictForm }),
    ...(plan.verbConjType === undefined || plan.verbConjType === null ? {} : { verbConjType: plan.verbConjType }),
    ...(plan.voice === undefined && plan.forcePassive !== true ? {} : { voice: plan.forcePassive === true ? "passive" as const : plan.voice }),
  };
}

export function suffixNominalizerAlreadyLexicalizedInPreviousUnit(
  token: RuntimeHaruToken,
  korean: string,
  previousUnit: TranslationUnit | undefined
): boolean {
  if (
    previousUnit === undefined ||
    previousUnit.unitType !== UnitType.CONTENT ||
    !unitHasNominalizedNounRenderPlan(previousUnit)
  ) {
    return false;
  }
  return korean === "함" &&
    (token.dictionaryForm === "さ" || token.dictionaryForm === "ざ" || token.dictionaryForm === "がたみ");
}

function unitHasNominalizedNounRenderPlan(unit: TranslationUnit): boolean {
  const plan = unit.renderPlan;
  if (plan?.kind !== "lemma" || plan.koreanPos !== 명사) {
    return false;
  }
  const typed = unit.entry?.senses?.some((sense) =>
    sense.nominalized === plan.koreanLemma &&
    (sense.koreanPos === 형용사 || sense.koreanPos === 동사)
  ) === true
    ? "predicate_nominalized"
    : "unknown";
  return resolveNominalAttributiveEvidence(
    plan.koreanLemma,
    typed
  ) === "predicate_nominalized";
}

export function rewriteFunctionalAdjectivalSuffixHostToNominalized(
  suffixToken: RuntimeHaruToken,
  previousUnit: TranslationUnit | undefined
): void {
  if (
    previousUnit === undefined ||
    previousUnit.unitType !== UnitType.CONTENT ||
    (suffixToken.pos & POS01) !== 接尾辞_形容詞的
  ) {
    return;
  }
  const nominalized = selectedPredicateNominalizedLemma(previousUnit);
  if (nominalized === null || nominalized === previousUnit.korean) {
    return;
  }
  previousUnit.setRenderPlan(
    { kind: "fixedText", text: nominalized, koreanPos: 명사 },
    { rule: "SUFFIX-ADJECTIVAL-NOMINALIZED-HOST", cacheValue: nominalized }
  );
}

function selectedPredicateNominalizedLemma(unit: TranslationUnit): string | null {
  const selectedLemma = selectedPredicateLemmaForUnit(unit);
  if (selectedLemma === null) {
    return null;
  }
  const sense = unit.entry?.senses?.find((candidate) =>
    candidate.korean === selectedLemma &&
    (candidate.koreanPos === 형용사 || candidate.koreanPos === 동사) &&
    typeof candidate.nominalized === "string" &&
    candidate.nominalized.length > 0
  );
  return sense?.nominalized ?? null;
}

function selectedPredicateLemmaForUnit(unit: TranslationUnit): string | null {
  const plan = unit.renderPlan;
  if (plan?.kind === "lemma" && (plan.koreanPos === 형용사 || plan.koreanPos === 동사)) {
    return plan.koreanLemma;
  }
  if ((unit.koreanPos === 형용사 || unit.koreanPos === 동사) && unit.korean.length > 0) {
    return unit.korean;
  }
  return null;
}

export function suffixRenderPlanFromCommittedEntry(
  entry: (MorphemeEntry & { readonly senses: readonly MorphemeSense[]; readonly committed: true }) | null,
  korean: string,
): RenderPlan | null {
  if (entry === null) {
    return null;
  }
  const selected = winner(entry);
  if (korean.length === 0) {
    return null;
  }
  return {
    kind: "lemma",
    entry,
    koreanLemma: korean,
    koreanPos: selected.koreanPos ?? 접미사,
    irregular: selected.irregular ?? null,
    auxTokens: [],
    jpDictForm: entry.dictionaryForm ?? null,
    verbConjType: null,
  };
}
