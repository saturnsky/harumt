import type { IrregularType } from "../../generator/conjugator.js";
import type { MorphemeEntry } from "../../types/dictionary.js";
import type { TailNode } from "../head-tail/tail/predicate-root/grammar.js";
import type {
  ConjugatedLemmaPlan,
  KeijoujiAdverbPlan,
  KeijoujiStatePlan,
  LemmaRealization,
  RenderPlan
} from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { tailChainProjectsCopulaPredicate, tailChainTeFormRole } from "../head-tail/lifecycle/rewrite.js";
import type { LookupTables } from "../lookup-tables.js";
import { KEIJOUJI_COPULA_PARTICLE_ENDINGS } from "../rules/tail-finalization.js";
import { commitWinner, winnerKorean } from "../translation/access.js";
import { TranslationUnit, UnitType } from "../translation/unit.js";


import { POS0, isNaAdjCapable, isNaAdjCapableNoun, 形状詞, 動詞, 名詞, 동사, 형용사 } from "../../types/pos.js";

type KeijoujiPredicateTranslation = {
  readonly korean: string;
  readonly koreanPos: number;
  readonly irregular: IrregularType | null;
  readonly prefix?: string;
};

function translationPrefix(translation: KeijoujiPredicateTranslation): { readonly prefix?: string } {
  return translation.prefix === undefined ? {} : { prefix: translation.prefix };
}
export const NEG_MARKERS = ["않", "안 ", "못 ", "못해", "못 해", "없", "모르", "몰라"] as const;

type KeijoujiSemanticOptions = { readonly lookups: LookupTables };

export function applyKeijoujiDeAdverbSemantics(units: readonly TranslationUnit[], _options: KeijoujiSemanticOptions): void {
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    if (unit === undefined || unit.unitType !== UnitType.CONTENT) {
      continue;
    }
    const headPos = unit.jpHead.pos;
    if ((headPos & POS0) !== 形状詞) {
      continue;
    }
    if (!predicateTailIsBareSingleTokenTeForm(unit.renderPlan)) {
      continue;
    }
    const verbStart = index + 1;
    if (isAdjectivalUnit(units, verbStart)) {
      continue;
    }
    if (!isVerbalUnit(units, verbStart)) {
      continue;
    }
    const next = units[verbStart];
    if (next?.jpHead.dictionaryForm === "いる") {
      continue;
    }

    const predicateTranslation = keijoujiPredicateTranslation(unit);
    let plan: KeijoujiAdverbPlan | ConjugatedLemmaPlan | null = null;
    if (predicateTranslation !== undefined && predicateTranslation.koreanPos === 형용사) {
      plan = keijoujiPredicateAdverbPlan(predicateTranslation, "게");
    } else {
      const nominalStem = keijoujiNominalStem(unit);
      if (nominalStem !== null) {
        plan = {
          kind: "keijoujiAdverb",
          stem: nominalStem,
          mode: "으로/로"
        };
      }
    }
    if (plan === null) {
      continue;
    }
    unit.setRenderPlan(plan, {
      rule: "keijouji_de_adv",
      cacheValue: ""
    });
    unit.provenance = "assembler";
  }
}

export function applyKeijoujiKanouDeSemantics(units: readonly TranslationUnit[], options: KeijoujiSemanticOptions): void {
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    if (unit === undefined || unit.unitType !== UnitType.CONTENT) {
      continue;
    }
    if (!isNaAdjCapableNoun(unit.jpHead)) {
      continue;
    }
    const predicateTranslation = keijoujiKanouPredicateTranslation(unit);
    const predicateLemma = predicateTranslation?.korean;
    if (unit.koreanPos !== 형용사 && predicateTranslation === undefined) {
      continue;
    }

    const entryKorean = unit.entry === null ? "" : winnerKoreanOrEmpty(unit.entry);
    const nextUnit = units[index + 1];
    const copulaConnective = nextUnit?.unitType === UnitType.FUNCTIONAL
      ? KEIJOUJI_COPULA_PARTICLE_ENDINGS.get(nextUnit.jpHead.surface)
      : undefined;
    if (predicateTranslation !== undefined && nextUnit !== undefined && copulaConnective !== undefined) {
      const plan: ConjugatedLemmaPlan = {
        kind: "conjugatedLemma",
        koreanLemma: predicateTranslation.korean,
        koreanPos: predicateTranslation.koreanPos,
        irregular: predicateTranslation.irregular,
        ending: copulaConnective,
        jpDictForm: unit.jpHead.dictionaryForm,
        ...translationPrefix(predicateTranslation)
      };
      unit.setRenderPlan(plan, {
        rule: "keijouji_kanou_copula_connective",
        cacheValue: ""
      });
      nextUnit.suppress({ rule: "keijouji_kanou_copula_connective" });
      unit.provenance = "assembler";
      nextUnit.provenance = "assembler";
      continue;
    }

    let deUnit: TranslationUnit | undefined;
    let verbStart: number;
    let fallbackStem: string | null = null;
    if (predicateTranslation !== undefined && predicateTailIsBareSingleTokenTeForm(unit.renderPlan)) {
      verbStart = index + 1;
    } else if ((predicateLemma !== undefined || entryKorean.endsWith("하다")) && index + 1 < units.length) {
      const candidate = units[index + 1];
      if (
        candidate?.unitType !== UnitType.FUNCTIONAL ||
        caseParticleMarkerRelationForToken(candidate.jpHead, -1, {
          acceptedSurfaces: ["で"],
          consumers: ["functional_fallback"]
        }) === null
      ) {
        continue;
      }
      deUnit = candidate;
      verbStart = index + 2;
      fallbackStem = entryKorean.endsWith("하다") ? entryKorean.slice(0, -2) : null;
    } else {
      continue;
    }

    if (isAdjectivalUnit(units, verbStart)) {
      const next = units[verbStart];
      const nextDictionaryForm = next?.jpHead.dictionaryForm ?? "";
      if (!options.lookups.INVOLUNTARY_RESULT_VERBS.has(nextDictionaryForm)) {
        if (deUnit !== undefined && predicateTranslation !== undefined) {
          const plan: LemmaRealization = {
            kind: "lemma",
            entry: unit.entry,
            koreanLemma: predicateTranslation.korean,
            koreanPos: predicateTranslation.koreanPos,
            irregular: predicateTranslation.irregular,
            auxTokens: [],
            connective: "고",
            ...translationPrefix(predicateTranslation)
          };
          unit.setRenderPlan(plan, {
            rule: "keijouji_kanou_de_attr",
            cacheValue: ""
          });
          deUnit.suppress({ rule: "keijouji_kanou_de_attr" });
          unit.provenance = "assembler";
          deUnit.provenance = "assembler";
        }
        continue;
      }
    }

    if (!isVerbalUnit(units, verbStart)) {
      continue;
    }
    const next = units[verbStart];
    if (next?.jpHead.dictionaryForm === "いる") {
      continue;
    }
    const causal = options.lookups.DE_CAUSAL_STATE.has(unit.jpHead.dictionaryForm)
      || (next !== undefined && options.lookups.INVOLUNTARY_RESULT_VERBS.has(next.jpHead.dictionaryForm))
      || hasNegationEvidenceAhead(units, verbStart);
    const connective = causal ? "아/어서" : "게";
    const plan = predicateTranslation !== undefined
      ? keijoujiPredicateAdverbPlan(predicateTranslation, connective)
      : fallbackStem === null
        ? null
        : {
          kind: "keijoujiAdverb",
          stem: fallbackStem,
          mode: causal ? "해서" : "하게"
        } satisfies KeijoujiAdverbPlan;
    if (plan === null) {
      continue;
    }
    unit.setRenderPlan(plan, {
      rule: "keijouji_kanou_de",
      cacheValue: ""
    });
    unit.provenance = "assembler";
    if (deUnit !== undefined) {
      deUnit.suppress({ rule: "keijouji_kanou_de" });
      deUnit.provenance = "assembler";
    }
  }
}

export function applyKeijoujiDeIruStateSemantics(units: readonly TranslationUnit[], _options: KeijoujiSemanticOptions): void {
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    if (unit === undefined || unit.unitType !== UnitType.CONTENT || unit.koreanPos === 동사) {
      continue;
    }
    if (!isNaAdjCapable(unit.jpHead)) {
      continue;
    }
    if (index + 1 >= units.length) {
      continue;
    }
    const next = units[index + 1];
    if (next === undefined || next.unitType !== UnitType.CONTENT || next.jpHead.dictionaryForm !== "いる") {
      continue;
    }
    const predicateTranslation = keijoujiPredicateTranslation(unit);
    let plan: ConjugatedLemmaPlan | KeijoujiStatePlan | null;
    if (predicateTranslation !== undefined) {
      if (!predicateTailIsBareSingleTokenTeForm(unit.renderPlan)) {
        continue;
      }
      plan = keijoujiPredicateStatePlan(predicateTranslation);
    } else {
      const stem = predicateTailIsBareSingleTokenTeForm(unit.renderPlan) ? keijoujiNominalStem(unit) : null;
      if (stem === null) {
        continue;
      }
      plan = { kind: "keijoujiState", stem };
    }
    unit.setRenderPlan(plan, {
      rule: "keijouji_de_iru_state",
      cacheValue: ""
    });
    unit.provenance = "assembler";
  }
}

export function keijoujiKanouPredicateTranslation(
  unit: TranslationUnit,
  fallbackEntry: MorphemeEntry | null = null
): KeijoujiPredicateTranslation | undefined {
  if (!isNaAdjCapableNoun(unit.jpHead)) {
    return undefined;
  }
  return keijoujiPredicateTranslationFromEntries([unit.entry, fallbackEntry]);
}

function keijoujiPredicateTranslation(
  unit: TranslationUnit,
  fallbackEntry: MorphemeEntry | null = null
): KeijoujiPredicateTranslation | undefined {
  if (!isNaAdjCapable(unit.jpHead)) {
    return undefined;
  }
  return keijoujiPredicateTranslationFromEntries([unit.entry, fallbackEntry]);
}

function keijoujiPredicateTranslationFromEntries(
  entries: readonly (MorphemeEntry | null)[]
): KeijoujiPredicateTranslation | undefined {
  for (const entry of entries) {
    if (entry === null) {
      continue;
    }
    for (const translation of entry.senses ?? []) {
      const korean = translation.korean;
      const koreanPos = translation.koreanPos;
      if ((koreanPos === 형용사 || koreanPos === 동사) && korean.endsWith("다")) {
        const prefix = translation.koreanPrefix;
        return {
          korean,
          koreanPos,
          irregular: isIrregularType(translation.irregular) ? translation.irregular : null,
          ...(prefix !== undefined && prefix.length > 0 ? { prefix } : {})
        };
      }
    }
  }
  return undefined;
}

function keijoujiNominalStem(unit: TranslationUnit): string | null {
  if (unit.entry === null) {
    return null;
  }
  const korean = winnerKoreanOrEmpty(unit.entry);
  if (korean.length === 0) {
    return null;
  }
  if (korean.endsWith("이다")) {
    return korean.slice(0, -2);
  }
  if (korean.endsWith("다")) {
    return null;
  }
  return korean;
}

function keijoujiPredicateAdverbPlan(
  translation: KeijoujiPredicateTranslation,
  ending: "게" | "아/어서"
): ConjugatedLemmaPlan {
  return {
    kind: "conjugatedLemma",
    koreanLemma: translation.korean,
    koreanPos: translation.koreanPos,
    irregular: translation.irregular,
    ending,
    ...translationPrefix(translation)
  };
}

function keijoujiPredicateStatePlan(
  translation: KeijoujiPredicateTranslation
): ConjugatedLemmaPlan {
  return {
    kind: "conjugatedLemma",
    koreanLemma: translation.korean,
    koreanPos: translation.koreanPos,
    irregular: translation.irregular,
    ending: "ㄴ/은",
    suffix: " 상태로",
    ...translationPrefix(translation)
  };
}

function isVerbalUnit(units: readonly TranslationUnit[], index: number): boolean {
  const unit = units[index];
  if (unit === undefined || unit.suppressed) {
    return false;
  }
  if (renderPlanProjectsAdjectivalPredicate(unit.renderPlan)) {
    return false;
  }
  if (isPredicateHeadTailChainRenderPlan(unit.renderPlan) && tailChainProjectsCopulaPredicate(unit.renderPlan)) {
    return false;
  }
  if (unit.koreanPos === 동사) {
    return true;
  }
  if ((unit.jpHead.pos & POS0) === 動詞) {
    return true;
  }
  const next = units[index + 1];
  return (unit.jpHead.pos & POS0) === 名詞 && next !== undefined && !next.suppressed && next.jpHead.dictionaryForm === "する" && next.attachLeft;
}

function isAdjectivalUnit(units: readonly TranslationUnit[], index: number): boolean {
  const unit = units[index];
  return unit !== undefined && !unit.suppressed && (
    unit.koreanPos === 형용사 ||
    renderPlanProjectsAdjectivalPredicate(unit.renderPlan)
  );
}

function renderPlanProjectsAdjectivalPredicate(plan: RenderPlan | null | undefined): boolean {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return false;
  }
  return plan.realization.root.tail.ops.some((op) => op.kind === "predicateSuffix");
}

function predicateTailContainsNegation(plan: RenderPlan | null | undefined): boolean {
  return isPredicateHeadTailChainRenderPlan(plan) && tailNodeContainsNegation(plan.realization.root.tail);
}

function teFormRoleIsUnmarkedConnection(role: string | null): boolean {
  return role === "linkage" || role === "listing";
}

function predicateTailIsBareSingleTokenTeForm(plan: RenderPlan | null | undefined): boolean {
  return isPredicateHeadTailChainRenderPlan(plan) &&
    teFormRoleIsUnmarkedConnection(tailChainTeFormRole(plan)) &&
    !predicateTailContainsNegation(plan) &&
    predicateTailTeFormSourceTokenCount(plan) === 1;
}

function predicateTailTeFormSourceTokenCount(plan: RenderPlan | null | undefined): number | null {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const terminalPayload = plan.realization.root.tail.terminalPayload;
  if (plan.realization.root.tail.terminal !== "renyou_chuushi" || terminalPayload?.kind !== "renyouChuushi") {
    return null;
  }
  return terminalPayload.source.tokens.length;
}

function tailNodeContainsNegation(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeContainsNegation(node.inner) || tailNodeContainsNegation(node.outer);
  }
  for (const op of node.ops) {
    if (op.kind === "negation") {
      return true;
    }
    if (op.kind === "copula" && op.polarity === "negative") {
      return true;
    }
    if ("inner" in op && tailNodeContainsNegation(op.inner)) {
      return true;
    }
  }
  return false;
}

function hasNegationEvidenceAhead(units: readonly TranslationUnit[], start: number): boolean {
  for (let index = start; index < Math.min(start + 6, units.length); index += 1) {
    const unit = units[index];
    if (unit === undefined) {
      continue;
    }
    if (unit.suppressed) {
      continue;
    }
    if (unitHasNegationEvidence(unit)) {
      return true;
    }
  }
  return false;
}

function unitHasNegationEvidence(unit: TranslationUnit): boolean {
  if (predicateTailContainsNegation(unit.renderPlan)) {
    return true;
  }
  const plan = unit.renderPlan;
  if (plan?.kind === "copulaPredicate" && plan.polarity !== "affirmative") {
    return true;
  }
  const dict = unit.jpHead.dictionaryForm;
  return dict === "ない" || dict === "無い";
}

function winnerKoreanOrEmpty(entry: MorphemeEntry): string {
  if (entry.senses === undefined) {
    return "";
  }
  return winnerKorean(commitWinner({ ...entry, senses: entry.senses })) ?? "";
}

function isIrregularType(value: string | null | undefined): value is NonNullable<LemmaRealization["irregular"]> {
  return value === "ㅂ" || value === "ㄷ" || value === "ㅅ" || value === "ㅎ" || value === "르" || value === "ㄹ" || value === "으" || value === "여" || value === "ㅣ" || value === "아니";
}
