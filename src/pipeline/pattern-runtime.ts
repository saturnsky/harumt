
import { legacySurfaceCompositionPlan } from "../types/render-plan.js";
import {
  koreanPredicateAuxChain,
  renderKoreanPredicateTerminal,
  renderKoreanPredicateConnective,
  resolvePassiveLemma,
  resolvePotentialChain,
  resolvePotentialChainConnective,
  shortNegationPrefix
} from "../generator/aux-map.js";

import { asIrregular, conjugate, type IrregularType } from "../generator/conjugator.js";
import { auxHasNegation, auxHasPast } from "./matchers.js";
import type { MorphemeEntry } from "../types/dictionary.js";
import { derivationForSense } from "../dictionary/derivation.js";
import type { BenefactiveContext } from "../types/pipeline.js";
import type {
  AttributiveRealization,
  ConjugatedLemmaPlan,
  PredicateNominalScopePlan,
  PredicateScopePlan,
  RenderPlan,
  Voice
} from "../types/render-plan.js";
import type { RuntimeHaruToken } from "../types/token.js";
import { hasRentaikei, resolveAttributive, resolveAttributiveForTail } from "./attributive.js";
import { isBenefactivePotentialPattern, resolveBenefactiveTail } from "./semantics/honorific.js";
import type { LookupTables } from "./lookup-tables.js";
import { lexicalTailAbsorptionsFromEntry } from "./head-tail/tail/postverb-events.js";
import { isTeConnectiveToken } from "./head-tail/tail/postverb-tail-classifier.js";
import { normalizeBenefactiveTail, normalizeGiveRequest } from "./rendering/request-normalization.js";
import { nextVerbDictForm } from "./semantics/helpers.js";
import { teConnectivePrefersAseo } from "./semantics/te-connective.js";
import { metadataFlag, metadataIrregular, metadataKoreanPos, translationForKorean, type MetadataEntry } from "./translation/metadata.js";
import { TokenCursor } from "./token-cursor.js";

import { POS4, POS5A, 仮定形_, 助動詞, 助動詞_タ, 助動詞_ナイ, 助動詞_ヌ, 助動詞_マス, 助動詞_レル, 動詞, 終止形_一般, 連体形_一般, 連用形_一般, 동사, 형용사 } from "../types/pos.js";
export const TE_IRU_FAMILY = ["te_iru", "te_iru_de", "te_oru", "te_oru_de"] as const;
export type TeIruFamilyPatternId = typeof TE_IRU_FAMILY[number];

export function isTeIruFamily(id: string): id is TeIruFamilyPatternId {
  return (TE_IRU_FAMILY as readonly string[]).includes(id);
}

export const POSTVERB_ASPECT_OPERATOR_KINDS = {
  "te_iru": "te_iru",
  "te_iru_de": "te_iru",
  "te_oru": "te_iru",
  "te_oru_de": "te_iru",
  "te_shimau": "te_shimau",
  "te_shimau_de": "te_shimau",
  "te_oku": "te_oku",
  "te_oku_de": "te_oku",
  "te_aru": "te_aru",
  "te_aru_de": "te_aru",
  "te_iku": "te_iku",
  "te_iku_de": "te_iku",
  "te_kuru": "te_kuru",
  "te_kuru_de": "te_kuru"
} as const;
export type PostverbAspectOperatorKind = typeof POSTVERB_ASPECT_OPERATOR_KINDS[keyof typeof POSTVERB_ASPECT_OPERATOR_KINDS];

export const POSTVERB_PERMISSION_PATTERN_IDS = new Set([
  "te_mo_ii",
  "te_mo_ii_de",
  "te_ii",
  "te_ii_de"
]);

const POSTVERB_TAILROOT_OWNED_PATTERN_IDS = new Set([
  ...POSTVERB_PERMISSION_PATTERN_IDS,
  "te_kudasai",
  "te_kudasai_de"
]);

export const POSTVERB_ATTRIBUTIVE_SPECIAL_HEADS = new Set(["もの", "もん", "うち", "内"]);

export interface PatternRuntimeToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly reading?: string;
  readonly dictionaryFormReading?: string;
  pos: number;
}

export interface PatternRuntimePattern {
  readonly id: string;
  readonly mainVerbEnding: string;
  readonly tailLemma?: string | null;
  readonly tailIrregular?: IrregularType | null;
  readonly tailKoreanPos?: number | null;
  readonly tailText?: string | null;
  readonly transparentTail?: boolean;
}

export interface PatternRuntimeEntry extends MetadataEntry {
  readonly dictionaryForm?: string;
  readonly derivation?: PatternDerivation | null;
}

export interface PatternDerivation {
  readonly id?: string;
  readonly type?: string;
}

export interface ApplyPatternOptions {
  readonly isAttr?: boolean;
  readonly terminalAttr?: boolean;
  readonly tailEnding?: string | null;
  readonly tailMiddle?: string | null;
  readonly tailAux?: readonly PatternRuntimeToken[] | null;
  readonly sfp?: string | null;
  readonly formal?: boolean;
  readonly benefactive?: BenefactiveContext | null;
  readonly lookups: LookupTables;
}

export function postverbAspectOperatorKind(patternId: string): PostverbAspectOperatorKind | undefined {
  return Object.hasOwn(POSTVERB_ASPECT_OPERATOR_KINDS, patternId)
    ? POSTVERB_ASPECT_OPERATOR_KINDS[patternId as keyof typeof POSTVERB_ASPECT_OPERATOR_KINDS]
    : undefined;
}

export function postverbPatternRequiresTailRootOwnership(patternId: string | null | undefined): boolean {
  return patternId !== null &&
    patternId !== undefined &&
    (POSTVERB_TAILROOT_OWNED_PATTERN_IDS.has(patternId) || postverbAspectOperatorKind(patternId) !== undefined);
}

export function buildSyntheticAux(polite: boolean, past = false): RuntimeHaruToken[] {
  const aux: RuntimeHaruToken[] = [];
  if (polite) {
    aux.push({
      surface: "ます",
      dictionaryForm: "ます",
      reading: "マス",
      dictionaryFormReading: "マス",
      pos: 助動詞 | 助動詞_マス | 終止形_一般,
      dictionaryId: 0
    });
  }
  if (past) {
    aux.push({
      surface: "た",
      dictionaryForm: "た",
      reading: "タ",
      dictionaryFormReading: "タ",
      pos: 助動詞 | 助動詞_タ | 連用形_一般,
      dictionaryId: 0
    });
  }
  return aux;
}


export function hasTaraAux(auxTokens: readonly PatternRuntimeToken[]): boolean {
  return auxTokens.some((token) => token.dictionaryForm === "た" && (token.pos & POS5A) === 仮定形_);
}


export function hasNaraAux(auxTokens: readonly PatternRuntimeToken[]): boolean {
  return auxTokens.some((token) => token.surface === "なら" && token.dictionaryForm === "だ" && (token.pos & POS5A) === 仮定形_);
}


export function hasConditionalAux(auxTokens: readonly PatternRuntimeToken[]): boolean {
  return auxTokens.some((token) => (
    token.dictionaryForm === "た" && (token.pos & POS5A) === 仮定形_
  ) || (
      token.surface === "なら" && token.dictionaryForm === "だ" && (token.pos & POS5A) === 仮定形_
    ));
}


export function counterfactualConditionalAux(auxTokens: readonly PatternRuntimeToken[]): PatternRuntimeToken[] {
  const converted: PatternRuntimeToken[] = [];
  for (let index = 0; index < auxTokens.length; index += 1) {
    const token = auxTokens[index];
    if (token === undefined) {
      continue;
    }
    const nextToken = auxTokens[index + 1];
    if (hasTaraAux([token])) {
      converted.push({
        ...token,
        surface: "た",
        pos: 助動詞 | 助動詞_タ | 終止形_一般
      });
      continue;
    }
    if (hasNaraAux([token])) {
      continue;
    }
    if (nextToken !== undefined && hasNaraAux([nextToken]) && token.dictionaryForm === "た" && (token.pos & POS4) === 助動詞_タ) {
      converted.push(token);
      continue;
    }
    converted.push(token);
  }
  return converted;
}


export function auxHasPassive(auxTokens: readonly PatternRuntimeToken[]): boolean {
  return auxTokens.some((token) => (token.pos & POS4) === 助動詞_レル);
}


export function maybeApplyPassiveLemma(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  auxTokens: readonly PatternRuntimeToken[],
  lookups: LookupTables
): readonly [lemma: string, irregular: IrregularType | null] {
  if (!auxHasPassive(auxTokens)) {
    return [koreanLemma, asIrregular(irregular)];
  }
  return resolvePassiveLemma(koreanLemma, asIrregular(irregular), { lookups });
}


export function resolveTeIruResultativeBehavior(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  entry: PatternRuntimeEntry | null | undefined,
  pattern: PatternRuntimePattern,
  lookups: LookupTables
): readonly [lemma: string, irregular: IrregularType | null, resultative: boolean, negativeResultative: boolean] {
  if (entry === undefined || entry === null || !isTeIruFamily(pattern.id)) {
    return [koreanLemma, asIrregular(irregular), false, false];
  }
  const translation = translationForKorean(entry, koreanLemma);
  if (translation.teIruResultative === true) {
    return [koreanLemma, asIrregular(irregular), true, true];
  }
  const dictForm = entry.dictionaryForm ?? "";
  return [
    koreanLemma,
    asIrregular(irregular),
    lookups.isTeIruResultativeVerb(dictForm),
    lookups.isTeIruNegativeResultativeVerb(dictForm)
  ];
}


export function benefactiveTailCanAbsorbMain(tailLemma: string | null | undefined): boolean {
  return tailLemma === "주다" || tailLemma === "주시다" || tailLemma === "드리다";
}


export function isPotentialDerivation(entry: PatternRuntimeEntry | null | undefined): boolean {
  return derivationForSense(entry?.senses?.[0] ?? null, entry).id === "potential";
}


export function selectPatternMainEnding(pattern: PatternRuntimePattern, entry: Pick<MorphemeEntry, "dictionaryForm"> | null | undefined, lookups: LookupTables): string {
  if (entry === undefined || entry === null) {
    return pattern.mainVerbEnding;
  }
  if (!isTeIruFamily(pattern.id)) {
    return pattern.mainVerbEnding;
  }
  return lookups.isTeIruResultativeVerb(entry.dictionaryForm)
    ? "아/어"
    : pattern.mainVerbEnding;
}


export function mergeDirectionVerb(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  tailLemma: string | null | undefined
): readonly [lemma: string, irregular: IrregularType | null] | null {
  if (tailLemma !== "오다" && tailLemma !== "가다") {
    return null;
  }
  const opposite = tailLemma === "오다" ? "가다" : "오다";
  if (koreanLemma.endsWith(tailLemma)) {
    return [koreanLemma, asIrregular(irregular)];
  }
  if (koreanLemma.endsWith(opposite)) {
    return [`${koreanLemma.slice(0, -opposite.length)}${tailLemma}`, null];
  }
  return null;
}


export function adjustTeConnectiveEnding(
  cursor: TokenCursor<PatternRuntimeToken>,
  entry: Pick<MorphemeEntry, "dictionaryForm"> | null | undefined,
  ending: string,
  lookups: LookupTables
): string {
  if (ending !== "고" || entry === undefined || entry === null || cursor.pos >= cursor.end) {
    return ending;
  }
  const connector = cursor.current();
  if (!isTeConnectiveToken(connector)) {
    return ending;
  }
  const mainVerb = entry.dictionaryForm;
  if (mainVerb === undefined) {
    return ending;
  }
  const nextVerb = nextVerbDictForm(cursor);
  return teConnectivePrefersAseo(mainVerb, nextVerb, {}, lookups) ? "아/어서" : ending;
}


export function resolvePotentialAttributive(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  auxTokens: readonly PatternRuntimeToken[],
  contentToken: PatternRuntimeToken
): string | undefined {
  if (auxTokens.length > 0) {
    const lastAux = auxTokens[auxTokens.length - 1];
    if (lastAux === undefined || !hasRentaikei(lastAux)) {
      return undefined;
    }
  } else if (!hasRentaikei(contentToken)) {
    return undefined;
  }

  const irreg = asIrregular(irregular);
  const prefix = koreanLemma.endsWith(" 수 있다")
    ? koreanLemma.slice(0, -"있다".length)
    : `${conjugate(koreanLemma, irreg, "ㄹ/을")} 수 `;
  const hasNegative = auxHasNegation(auxTokens);
  const hasPast = auxHasPast(auxTokens);
  if (hasNegative) {
    return `${prefix}${hasPast ? "없었던" : "없는"}`;
  }
  return `${prefix}${hasPast ? "있었던" : "있는"}`;
}


export function hasFutureHeadNoun(headNounToken: Pick<PatternRuntimeToken, "dictionaryForm"> | null | undefined, lookups: LookupTables): boolean {
  return headNounToken !== undefined && headNounToken !== null && lookups.JP_FUTURE_HEAD_NOUNS.has(headNounToken.dictionaryForm);
}


export function hasSpecialAttributiveHead(headNounToken: Pick<PatternRuntimeToken, "dictionaryForm"> | null | undefined): boolean {
  return headNounToken !== undefined && headNounToken !== null && POSTVERB_ATTRIBUTIVE_SPECIAL_HEADS.has(headNounToken.dictionaryForm);
}


export function aspectChainPlan(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  entry: PatternRuntimeEntry,
  pattern: PatternRuntimePattern,
  options: {
    readonly mainEnding: string;
    readonly auxTokens?: readonly PatternRuntimeToken[];
    readonly connective?: string | null;
    readonly terminalConditionalFlavor?: string | null;
    readonly terminalSfp?: string | null;
  }
): undefined {
  void koreanLemma;
  void irregular;
  void koreanPos;
  void entry;
  void pattern;
  void options;
  return undefined;
}


export function buildPatternAttributiveRenderPlan(
  koreanLemma: string,
  entry: PatternRuntimeEntry | null | undefined,
  pattern: PatternRuntimePattern,
  auxTokens: readonly PatternRuntimeToken[],
  options: {
    readonly benefactive?: BenefactiveContext | null;
    readonly headNounToken?: PatternRuntimeToken | null;
    readonly lookups: LookupTables;
  }
): RenderPlan | PredicateNominalScopePlan | PredicateScopePlan | null {
  if (entry === undefined || entry === null || pattern.tailLemma === undefined || pattern.tailLemma === null) {
    return null;
  }
  const lookups = options.lookups;

  let irregular = asIrregular(metadataIrregular(entry, koreanLemma));
  [koreanLemma, irregular] = maybeApplyPassiveLemma(koreanLemma, irregular, auxTokens, lookups);
  const koreanPos = metadataKoreanPos(entry, koreanLemma, { default: 동사 });
  let mainEnding = selectPatternMainEnding(pattern, entry, lookups);
  let teIruResultative: boolean;
  [koreanLemma, irregular, teIruResultative] = resolveTeIruResultativeBehavior(koreanLemma, irregular, entry, pattern, lookups);
  if (teIruResultative) {
    mainEnding = "아/어";
  }

  const headNounToken = options.headNounToken ?? null;
  const contentToken = syntheticContentToken(entry.dictionaryForm ?? koreanLemma);
  const attributivePlan = (
    lemma: string,
    irreg: string | null,
    pos: number,
    extra: Partial<AttributiveRealization> = {}
  ): AttributiveRealization => ({
    kind: "attributive",
    koreanLemma: lemma,
    irregular: asIrregular(irreg),
    koreanPos: pos,
    auxTokens: runtimeTokens(auxTokens),
    contentToken,
    headNounToken: headNounToken === null ? null : runtimeToken(headNounToken),
    ...extra
  });
  const negativeAttributivePlan = (
    lemma: string,
    irreg: string | null,
    pos: number,
    hasPast: boolean
  ): ConjugatedLemmaPlan => ({
    kind: "conjugatedLemma",
    koreanLemma: lemma,
    irregular: asIrregular(irreg),
    koreanPos: pos,
    ending: hasPast ? "았/었" : "ㄴ/은",
    ...(hasPast ? { suffix: "던" } : {})
  });

  if (isTeIruFamily(pattern.id) && metadataFlag(entry, koreanLemma, "teIruContractToPast")) {
    return prefixWithPredicate(null, attributivePlan(koreanLemma, irregular, koreanPos, { teIruContractToPast: true }), koreanPos);
  }
  if (isTeIruFamily(pattern.id) && metadataFlag(entry, koreanLemma, "teIruDropAux")) {
    return prefixWithPredicate(null, attributivePlan(koreanLemma, irregular, koreanPos), koreanPos);
  }

  if (isTeIruFamily(pattern.id) && auxHasNegation(auxTokens)) {
    const remaining = auxTokens.filter((token) => (token.pos & POS4) !== 助動詞_ナイ && (token.pos & POS4) !== 助動詞_ヌ);
    const hasPast = auxHasPast(remaining);
    const [, , , teIruNegativeResultative] = resolveTeIruResultativeBehavior(koreanLemma, irregular, entry, pattern, lookups);
    let prefix: string;
    let main: ConjugatedLemmaPlan;
    if (teIruNegativeResultative) {
      prefix = `${conjugate(koreanLemma, irregular, "아/어")} `;
      main = negativeAttributivePlan("있지 않다", null, 형용사, hasPast);
    } else if (lookups.TE_IRU_NEGATIVE_INABILITY_VERBS.has(entry.dictionaryForm ?? "")) {
      prefix = `${conjugate(koreanLemma, irregular, "지")} `;
      main = negativeAttributivePlan("못하다", "여", 동사, hasPast);
    } else if (lookups.TE_IRU_NEGATIVE_LONG_NEGATION_VERBS.has(entry.dictionaryForm ?? "")) {
      prefix = `${conjugate(koreanLemma, irregular, "지")} `;
      main = negativeAttributivePlan("않다", null, 형용사, hasPast);
    } else {
      const [negPrefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
      prefix = negPrefix;
      main = negativeAttributivePlan(negLemma, negIrregular, 동사, hasPast);
    }
    return prefixWithPredicate(prefix, main, main.koreanPos);
  }

  const [tailLemma, tailIrregular, tailKoreanPos] = resolveBenefactiveTail(
    pattern.id,
    pattern.tailLemma,
    pattern.tailIrregular ?? null,
    pattern.tailKoreanPos ?? 동사,
    (options.benefactive ?? null) as Parameters<typeof resolveBenefactiveTail>[4]
  );
  if (tailLemma === null) {
    return null;
  }
  const merged = mergeDirectionVerb(koreanLemma, irregular, tailLemma);
  if (merged !== null) {
    return prefixWithPredicate(null, attributivePlan(merged[0], merged[1], koreanPos), koreanPos);
  }

  const mainPart = koreanPos === 동사 || koreanPos === 형용사
    ? conjugate(koreanLemma, irregular, mainEnding)
    : koreanLemma;
  const aspect = aspectChainPlan(koreanLemma, irregular, koreanPos, entry, pattern, {
    mainEnding,
    auxTokens
  });

  if (aspect !== undefined && !hasSpecialAttributiveHead(headNounToken)) {
    if (hasFutureHeadNoun(headNounToken, lookups)) {
      return { kind: "predicateScope", base: aspect, ending: "ㄹ/을" };
    }
    return { kind: "predicateNominalScope", base: aspect };
  }

  const lexicalAbsorptionKind = benefactiveAbsorptionKind({
    entry,
    koreanLemma,
    pattern,
    benefactive: options.benefactive ?? null
  });
  if (
    lexicalAbsorptionKind === null ||
    !isBenefactivePotentialPattern(pattern.id) ||
    !hasConditionalAux(auxTokens)
  ) {
    const chainPlan = benefactiveChainPlan(koreanLemma, irregular, koreanPos, entry, pattern, auxTokens, {
      connective: null,
      benefactive: options.benefactive ?? null,
      tailLemma,
      tailIrregular,
      tailKoreanPos
    });

    if (chainPlan !== null) {
      if (
        lexicalAbsorptionKind === null &&
        (pattern.id === "te_kureru" || pattern.id === "te_kureru_de") &&
        auxHasNegation(auxTokens) &&
        hasFutureHeadNoun(headNounToken, lookups)
      ) {
        return { kind: "predicateScope", base: chainPlan, ending: "ㄹ/을" };
      }
      return { kind: "predicateNominalScope", base: chainPlan };
    }
  }

  return prefixWithPredicate(`${mainPart} `, attributivePlan(tailLemma, tailIrregular, 동사, { tailLemmaMode: true }), 동사);
}


export function buildPatternRenderPlan(
  koreanLemma: string,
  entry: PatternRuntimeEntry | null | undefined,
  pattern: PatternRuntimePattern,
  auxTokens: readonly PatternRuntimeToken[],
  options: {
    readonly connective?: string | null;
    readonly contentPassive?: boolean;
    readonly benefactive?: BenefactiveContext | null;
    readonly terminalConditionalFlavor?: string | null;
    readonly terminalSfp?: string | null;
    readonly lookups: LookupTables;
  }
): RenderPlan | null {
  if (entry === undefined || entry === null || pattern.tailLemma === undefined || pattern.tailLemma === null) {
    return null;
  }
  const lookups = options.lookups;

  let irregular = asIrregular(metadataIrregular(entry, koreanLemma));
  [koreanLemma, irregular] = maybeApplyPassiveLemma(koreanLemma, irregular, auxTokens, lookups);
  const koreanPos = metadataKoreanPos(entry, koreanLemma, { default: 동사 });
  const [tailLemma, tailIrregular, tailKoreanPos] = resolveBenefactiveTail(
    pattern.id,
    pattern.tailLemma,
    pattern.tailIrregular ?? null,
    pattern.tailKoreanPos ?? 동사,
    (options.benefactive ?? null) as Parameters<typeof resolveBenefactiveTail>[4]
  );
  if (tailLemma === null) {
    return null;
  }

  const connective = options.connective ?? null;
  const tailVoice: Voice = isBenefactivePotentialPattern(pattern.id) ? "potential" : "active";
  if (isTeIruFamily(pattern.id) && metadataFlag(entry, koreanLemma, "teIruContractToPast")) {
    return compoundLemmaPatternPlan(entry, koreanLemma, koreanPos, irregular, auxTokens, connective, tailLemma, {
      teIruContractToPast: true
    });
  }
  if (isTeIruFamily(pattern.id) && metadataFlag(entry, koreanLemma, "teIruDropAux")) {
    return compoundLemmaPatternPlan(entry, koreanLemma, koreanPos, irregular, auxTokens, connective, tailLemma);
  }

  if (isTeIruFamily(pattern.id) && auxHasNegation(auxTokens)) {
    const [, , , teIruNegativeResultative] = resolveTeIruResultativeBehavior(koreanLemma, irregular, entry, pattern, lookups);
    if (teIruNegativeResultative) {
      const remaining = auxTokens.filter((token) => (token.pos & POS4) !== 助動詞_ナイ && (token.pos & POS4) !== 助動詞_ヌ);
      return prefixWithPredicate(`${conjugate(koreanLemma, irregular, "아/어")} `, lemmaPlan(null, "있지 않다", 형용사, null, remaining, connective), 형용사);
    }
    if (lookups.TE_IRU_NEGATIVE_INABILITY_VERBS.has(entry.dictionaryForm ?? "")) {
      const remaining = auxTokens.filter((token) => (token.pos & POS4) !== 助動詞_ナイ && (token.pos & POS4) !== 助動詞_ヌ);
      return prefixWithPredicate(`${conjugate(koreanLemma, irregular, "지")} `, lemmaPlan(null, "못하다", 동사, "여", remaining, connective), 동사);
    }
    if (lookups.TE_IRU_NEGATIVE_LONG_NEGATION_VERBS.has(entry.dictionaryForm ?? "")) {
      const hasPolite = auxTokens.some((token) => (token.pos & POS4) === 助動詞_マス);
      const usePast = connective !== "아/어서";
      return prefixWithPredicate(`${conjugate(koreanLemma, irregular, "지")} `, lemmaPlan(null, "않다", 형용사, null, buildSyntheticAux(hasPolite, usePast), connective), 형용사);
    }
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
    const hasPolite = auxTokens.some((token) => (token.pos & POS4) === 助動詞_マス);
    const usePast = connective !== "아/어서";
    return prefixWithPredicate(prefix, lemmaPlan(null, negLemma, 동사, negIrregular, buildSyntheticAux(hasPolite, usePast), connective), 동사);
  }

  let mainEnding = selectPatternMainEnding(pattern, entry, lookups);
  let teIruResultative: boolean;
  [koreanLemma, irregular, teIruResultative] = resolveTeIruResultativeBehavior(koreanLemma, irregular, entry, pattern, lookups);
  if (teIruResultative) {
    mainEnding = "아/어";
  }

  if (pattern.transparentTail === true) {
    return compoundLemmaPatternPlan(entry, koreanLemma, koreanPos, irregular, auxTokens, connective, tailLemma);
  }

  const merged = mergeDirectionVerb(koreanLemma, irregular, tailLemma);
  if (merged !== null) {
    return compoundLemmaPatternPlan(entry, merged[0], koreanPos, merged[1], auxTokens, connective, tailLemma);
  }

  if (koreanPos === 형용사 && isTeIruFamily(pattern.id)) {
    return compoundLemmaPatternPlan(entry, koreanLemma, 형용사, irregular, auxTokens, connective, tailLemma);
  }

  const aspect = aspectChainPlan(koreanLemma, irregular, koreanPos, entry, pattern, {
    mainEnding,
    auxTokens,
    connective,
    terminalConditionalFlavor: options.terminalConditionalFlavor ?? null,
    terminalSfp: options.terminalSfp ?? null
  });

  if (aspect !== undefined) {
    return aspect;
  }

  const lexicalAbsorptionKind = benefactiveAbsorptionKind({
    entry,
    koreanLemma,
    pattern,
    benefactive: options.benefactive ?? null
  });
  if (lexicalAbsorptionKind !== null && (!isBenefactivePotentialPattern(pattern.id) || !hasConditionalAux(auxTokens))) {
    const chainPlan = benefactiveChainPlan(koreanLemma, irregular, koreanPos, entry, pattern, auxTokens, {
      connective,
      benefactive: options.benefactive ?? null,
      tailLemma,
      tailIrregular,
      tailKoreanPos,
      terminalConditionalFlavor: options.terminalConditionalFlavor ?? null,
      terminalSfp: options.terminalSfp ?? null
    });

    if (chainPlan !== null) {
      return chainPlan;
    }
  }

  if (
    connective !== null ||
    (options.terminalSfp ?? null) !== null ||
    (hasConditionalAux(auxTokens) && benefactivePatternId(pattern.id)) ||
    (
      hasNaraAux(auxTokens) &&
      !auxHasNegation(auxTokens) &&
      benefactiveNaraPatternId(pattern.id)
    )
  ) {
    const chainPlan = benefactiveChainPlan(koreanLemma, irregular, koreanPos, entry, pattern, auxTokens, {
      connective,
      benefactive: options.benefactive ?? null,
      tailLemma,
      tailIrregular,
      tailKoreanPos,
      terminalConditionalFlavor: options.terminalConditionalFlavor ?? null,
      terminalSfp: options.terminalSfp ?? null
    });

    if (chainPlan !== null) {
      return chainPlan;
    }
  }

  const mainPart = koreanPos === 동사 || koreanPos === 형용사
    ? conjugate(koreanLemma, irregular, mainEnding)
    : koreanLemma;
  return prefixWithPredicate(
    `${mainPart} `,
    {
      kind: "lemma",
      entry: null,
      koreanLemma: tailLemma,
      koreanPos: tailKoreanPos,
      irregular: tailIrregular,
      auxTokens: runtimeTokens(auxTokens),
      connective,
      voice: tailVoice
    },
    tailKoreanPos
  );
}


export function applyPatternUnified(
  koreanLemma: string,
  entry: PatternRuntimeEntry | null | undefined,
  pattern: PatternRuntimePattern,
  auxTokens: readonly PatternRuntimeToken[],
  options: ApplyPatternOptions
): string {
  const lookups = options.lookups;
  let irregular = asIrregular(metadataIrregular(entry, koreanLemma));
  [koreanLemma, irregular] = maybeApplyPassiveLemma(koreanLemma, irregular, auxTokens, lookups);
  const koreanPos = metadataKoreanPos(entry, koreanLemma, { default: 동사 });
  let mainEnding = selectPatternMainEnding(pattern, entry, lookups);

  let teIruResultative: boolean;
  let teIruNegativeResultative: boolean;
  [koreanLemma, irregular, teIruResultative, teIruNegativeResultative] = resolveTeIruResultativeBehavior(
    koreanLemma,
    irregular,
    entry,
    pattern,
    lookups
  );
  if (teIruResultative) {
    mainEnding = "아/어";
  }

  const tailEnding = options.tailEnding ?? null;
  const tailMiddle = options.tailMiddle ?? null;
  const tailAux = options.tailAux ?? null;
  const isAttr = options.isAttr ?? false;
  const formal = options.formal ?? false;
  const sfpOptions = options.sfp === undefined || options.sfp === null ? {} : { sfp: options.sfp };

  if (isTeIruFamily(pattern.id) && metadataFlag(entry, koreanLemma, "teIruContractToPast")) {
    if (tailEnding !== null) {
      return renderKoreanPredicateConnective(koreanLemma, irregular, koreanPos, koreanPredicateAuxChain(auxTokens), tailEnding, {
        lookups,
        teIruContractToPast: true
      });
    }
    return renderKoreanPredicateTerminal(koreanLemma, irregular, koreanPos, koreanPredicateAuxChain(auxTokens), {
      lookups,
      formal,
      ...sfpOptions,
      teIruContractToPast: true
    }).text;
  }

  if (isTeIruFamily(pattern.id) && metadataFlag(entry, koreanLemma, "teIruDropAux")) {
    if (tailEnding !== null) {
      return renderKoreanPredicateConnective(koreanLemma, irregular, koreanPos, koreanPredicateAuxChain(auxTokens), tailEnding, { lookups });
    }
    return renderKoreanPredicateTerminal(koreanLemma, irregular, koreanPos, koreanPredicateAuxChain(auxTokens), {
      lookups,
      formal,
      ...sfpOptions
    }).text;
  }

  if (
    isTeIruFamily(pattern.id) &&
    auxTokens.length > 0 &&
    koreanLemma.endsWith("다") &&
    auxHasNegation(auxTokens)
  ) {
    const hasPolite = auxTokens.some((token) => (token.pos & POS4) === 助動詞_マス);
    const remaining = auxTokens.filter((token) => (token.pos & POS4) !== 助動詞_ナイ && (token.pos & POS4) !== 助動詞_ヌ);
    const dictForm = entry?.dictionaryForm ?? null;
    if (teIruNegativeResultative) {
      const ae = conjugate(koreanLemma, irregular, "아/어");
      if (tailEnding !== null) {
        const text = renderKoreanPredicateConnective("있지 않다", null, 형용사, koreanPredicateAuxChain(remaining), tailEnding, { lookups });
        return `${ae} ${text}`;
      }
      const result = renderKoreanPredicateTerminal("있지 않다", null, 형용사, koreanPredicateAuxChain(remaining), {
        lookups,
        formal,
        ...sfpOptions
      });
      return `${ae} ${result.text}`;
    }
    if (dictForm !== null && lookups.TE_IRU_NEGATIVE_INABILITY_VERBS.has(dictForm)) {
      const ji = conjugate(koreanLemma, irregular, "지");
      if (tailEnding !== null) {
        const text = renderKoreanPredicateConnective("못하다", "여", 동사, koreanPredicateAuxChain(remaining), tailEnding, { lookups });
        return `${ji} ${text}`;
      }
      const result = renderKoreanPredicateTerminal("못하다", "여", 동사, koreanPredicateAuxChain(remaining), {
        lookups,
        formal,
        ...sfpOptions
      });
      return `${ji} ${result.text}`;
    }
    if (dictForm !== null && lookups.TE_IRU_NEGATIVE_LONG_NEGATION_VERBS.has(dictForm)) {
      const ji = conjugate(koreanLemma, irregular, "지");
      if (tailEnding !== null) {
        const text = renderKoreanPredicateConnective(
          "않다",
          null,
          형용사,
          koreanPredicateAuxChain(buildSyntheticAux(hasPolite, true)),
          tailEnding,
          { lookups }
        );
        return `${ji} ${text}`;
      }
      const result = renderKoreanPredicateTerminal("않다", null, 형용사, koreanPredicateAuxChain(buildSyntheticAux(hasPolite, true)), {
        lookups,
        formal,
        ...sfpOptions
      });
      return `${ji} ${result.text}`;
    }
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
    if (tailEnding !== null) {
      const usePast = tailEnding !== "아/어서";
      const text = renderKoreanPredicateConnective(
        negLemma,
        negIrregular,
        동사,
        koreanPredicateAuxChain(buildSyntheticAux(hasPolite, usePast)),
        tailEnding,
        { lookups }
      );
      return `${prefix}${text}`;
    }
    const result = renderKoreanPredicateTerminal(negLemma, negIrregular, 동사, koreanPredicateAuxChain(buildSyntheticAux(hasPolite, true)), {
      lookups,
      formal
    });
    return `${prefix}${result.text}`;
  }

  if (entry !== undefined && entry !== null && koreanPos === 형용사 && isTeIruFamily(pattern.id)) {
    if (tailEnding !== null) {
      return renderKoreanPredicateConnective(koreanLemma, irregular, 형용사, koreanPredicateAuxChain(auxTokens), tailEnding, { lookups });
    }
    if (isAttr) {
      const attr = resolveAttributive(koreanLemma, irregular, 형용사, auxTokens, {
        surface: "",
        dictionaryForm: "",
        pos: 動詞 | 連体形_一般
      }, { lookups });
      if (attr !== null) {
        return attr;
      }
    }
    return renderKoreanPredicateTerminal(koreanLemma, irregular, 형용사, koreanPredicateAuxChain(auxTokens), { lookups, formal }).text;
  }

  const mainPart = entry !== undefined && entry !== null && (koreanPos === 동사 || koreanPos === 형용사)
    ? conjugate(koreanLemma, irregular, mainEnding)
    : koreanLemma;

  if (pattern.tailLemma !== undefined && pattern.tailLemma !== null) {
    const [resolvedTailLemma, resolvedTailIrregular, resolvedTailKoreanPos] = resolveBenefactiveTail(
      pattern.id,
      pattern.tailLemma,
      pattern.tailIrregular ?? null,
      pattern.tailKoreanPos ?? 동사,
      (options.benefactive ?? null) as Parameters<typeof resolveBenefactiveTail>[4]
    );
    if (resolvedTailLemma === null) {
      return mainPart;
    }
    const tailIrregular = asIrregular(resolvedTailIrregular);
    const tailKoreanPos = resolvedTailKoreanPos;
    const tailVoicePotential = isBenefactivePotentialPattern(pattern.id);
    const merged = mergeDirectionVerb(koreanLemma, irregular, resolvedTailLemma);
    if (merged !== null) {
      const [mergedLemma, mergedIrregular] = merged;
      if (tailEnding !== null) {
        return renderKoreanPredicateConnective(mergedLemma, mergedIrregular, koreanPos, koreanPredicateAuxChain(auxTokens), tailEnding, { lookups });
      }
      if (isAttr) {
        const attr = resolveAttributive(mergedLemma, mergedIrregular, koreanPos, auxTokens, {
          surface: "",
          dictionaryForm: "",
          pos: 動詞 | 連体形_一般
        }, { lookups });
        if (attr !== null) {
          return attr;
        }
      }
      return renderKoreanPredicateTerminal(mergedLemma, mergedIrregular, koreanPos, koreanPredicateAuxChain(auxTokens), {
        lookups,
        formal,
        ...sfpOptions
      }).text;
    }
    if (tailMiddle !== null) {
      const tailEndingForMiddle = tailEnding ?? "아/어";
      const tailText = tailVoicePotential
        ? resolvePotentialChainConnective(resolvedTailLemma, tailIrregular, koreanPredicateAuxChain(auxTokens), tailEndingForMiddle, {}, lookups)
        : renderKoreanPredicateConnective(resolvedTailLemma, tailIrregular, 동사, koreanPredicateAuxChain(auxTokens), tailEndingForMiddle, { lookups });
      return tailAux !== null ? `${mainPart} ${tailText}${tailMiddle}${tailAux}` : `${mainPart} ${tailText}${tailMiddle}`;
    }
    if (tailEnding !== null) {
      const tailText = tailVoicePotential
        ? resolvePotentialChainConnective(resolvedTailLemma, tailIrregular, koreanPredicateAuxChain(auxTokens), tailEnding, {}, lookups)
        : renderKoreanPredicateConnective(resolvedTailLemma, tailIrregular, tailKoreanPos, koreanPredicateAuxChain(auxTokens), tailEnding, { lookups });
      if (benefactiveTailCanAbsorbMain(resolvedTailLemma)) {
        return normalizeBenefactiveTail(mainPart, koreanLemma, tailText);
      }
      return `${mainPart} ${tailText}`;
    }
    if (isAttr) {
      if (tailVoicePotential) {
        const tailText = resolvePotentialAttributive(resolvedTailLemma, tailIrregular, auxTokens, {
          surface: "",
          dictionaryForm: "",
          pos: 動詞 | 連体形_一般
        });
        if (tailText === undefined) {
          const tailResult = resolvePotentialChain(resolvedTailLemma, tailIrregular, koreanPredicateAuxChain(auxTokens), {
            formal,
            ...sfpOptions
          }, lookups);
          if (benefactiveTailCanAbsorbMain(resolvedTailLemma)) {
            return normalizeBenefactiveTail(mainPart, koreanLemma, tailResult.text);
          }
          return `${mainPart} ${tailResult.text}`;
        }
        return `${mainPart} ${tailText}`;
      }
      const tailText = resolveAttributiveForTail(resolvedTailLemma, tailIrregular, auxTokens, {
        preferIssdaPastDeon: options.terminalAttr ?? false,
        lookups
      });
      return `${mainPart} ${tailText}`;
    }
    const tailResult = tailVoicePotential
      ? resolvePotentialChain(resolvedTailLemma, tailIrregular, koreanPredicateAuxChain(auxTokens), {
        formal,
        ...sfpOptions
      }, lookups)
      : renderKoreanPredicateTerminal(resolvedTailLemma, tailIrregular, tailKoreanPos, koreanPredicateAuxChain(auxTokens), {
        lookups,
        formal,
        ...sfpOptions
      });
    if (benefactiveTailCanAbsorbMain(resolvedTailLemma)) {
      return normalizeBenefactiveTail(mainPart, koreanLemma, tailResult.text);
    }
    return `${mainPart} ${tailResult.text}`;
  }

  if (pattern.tailText !== undefined && pattern.tailText !== null) {
    if (pattern.tailText === " 주세요") {
      return normalizeGiveRequest(mainPart, koreanLemma, "주세요");
    }
    return `${mainPart}${pattern.tailText}`;
  }

  return mainPart;
}


export function stripFirstNegation(auxTokens: readonly PatternRuntimeToken[]): PatternRuntimeToken[] {
  const out: PatternRuntimeToken[] = [];
  let stripped = false;
  for (const token of auxTokens) {
    if (!stripped && ((token.pos & POS4) === 助動詞_ナイ || (token.pos & POS4) === 助動詞_ヌ)) {
      stripped = true;
      continue;
    }
    out.push(token);
  }
  return out;
}


export function hasNegativeAux(auxTokens: readonly PatternRuntimeToken[]): boolean {
  return auxHasNegation(auxTokens);
}


function runtimeToken(token: PatternRuntimeToken): RuntimeHaruToken {
  return {
    surface: token.surface,
    dictionaryForm: token.dictionaryForm,
    reading: token.reading ?? "",
    dictionaryFormReading: token.dictionaryFormReading ?? "",
    pos: token.pos,
    dictionaryId: -1
  };
}


function runtimeTokens(tokens: readonly PatternRuntimeToken[]): RuntimeHaruToken[] {
  return tokens.map((token) => runtimeToken(token));
}


function syntheticContentToken(dictionaryForm: string): RuntimeHaruToken {
  return {
    surface: dictionaryForm,
    dictionaryForm,
    reading: "",
    dictionaryFormReading: "",
    pos: 動詞 | 連体形_一般,
    dictionaryId: -1
  };
}


function lemmaPlan(
  entry: PatternRuntimeEntry | null,
  koreanLemma: string,
  koreanPos: number,
  irregular: IrregularType | null,
  auxTokens: readonly PatternRuntimeToken[],
  connective: string | null,
  extra: Partial<Extract<RenderPlan, { kind: "lemma" }>> = {}
): Extract<RenderPlan, { kind: "lemma" }> {
  return {
    kind: "lemma",
    entry,
    koreanLemma,
    koreanPos,
    irregular,
    auxTokens: runtimeTokens(auxTokens),
    connective,
    ...extra
  };
}

function prefixWithPredicate(prefix: RenderPlan | string | null | undefined, predicate: RenderPlan, koreanPos: number): RenderPlan {
  if (prefix === undefined || prefix === null || prefix === "") {
    return predicate;
  }
  return legacySurfaceCompositionPlan("pattern_runtime", {
    korean: "",
    koreanPos,
    prefix,
    suffix: predicate,
    rewritePrefixOnLemmaReplace: true,
    rewriteSuffixOnLemmaReplace: false,
    rewritePrefixOnConnectiveReplace: false,
    rewriteSuffixOnConnectiveReplace: true
  });
}


function compoundLemmaPatternPlan(
  entry: PatternRuntimeEntry,
  koreanLemma: string,
  koreanPos: number,
  irregular: IrregularType | null,
  auxTokens: readonly PatternRuntimeToken[],
  connective: string | null,
  auxiliaryLemma: string,
  extra: Partial<Extract<RenderPlan, { kind: "lemma" }>> = {}
): RenderPlan {
  void auxiliaryLemma;
  return prefixWithPredicate(null, lemmaPlan(entry, koreanLemma, koreanPos, irregular, auxTokens, connective, extra), koreanPos);
}


function benefactivePatternId(patternId: string): boolean {
  return patternId.startsWith("te_kureru") ||
    patternId.startsWith("te_morau") ||
    patternId.startsWith("te_moraeru") ||
    patternId.startsWith("te_ageru") ||
    patternId.startsWith("te_yaru") ||
    patternId.startsWith("te_kudasaru") ||
    patternId.startsWith("te_itadaku") ||
    patternId.startsWith("te_itadakeru");
}


function benefactiveNaraPatternId(patternId: string): boolean {
  return patternId.startsWith("te_kureru") ||
    patternId.startsWith("te_morau") ||
    patternId.startsWith("te_moraeru") ||
    patternId.startsWith("te_ageru") ||
    patternId.startsWith("te_yaru");
}


function benefactiveAbsorptionKind(options: {
  readonly entry: PatternRuntimeEntry | null | undefined;
  readonly koreanLemma: string;
  readonly pattern: PatternRuntimePattern;
  readonly benefactive?: BenefactiveContext | null;
}): string | null {
  for (const absorption of lexicalTailAbsorptionsFromEntry(options.entry, options.koreanLemma, {
    tailRole: "benefactive",
    tailFamily: options.pattern.id,
    benefactiveContext: options.benefactive ?? null
  })) {
    if (
      absorption.kind === "embedded_juda" ||
      absorption.kind === "honorific_jusida" ||
      absorption.kind === "recipient_side_humble"
    ) {
      return absorption.kind;
    }
  }
  return null;
}


function benefactiveChainPlan(
  koreanLemma: string,
  irregular: IrregularType | null,
  koreanPos: number,
  entry: PatternRuntimeEntry,
  pattern: PatternRuntimePattern,
  auxTokens: readonly PatternRuntimeToken[],
  options: {
    readonly connective: string | null;
    readonly benefactive?: BenefactiveContext | null;
    readonly tailLemma: string | null;
    readonly tailIrregular: IrregularType | null;
    readonly tailKoreanPos: number | null;
    readonly terminalConditionalFlavor?: string | null;
    readonly terminalSfp?: string | null;
  }
): null {
  void koreanLemma;
  void irregular;
  void koreanPos;
  void entry;
  void pattern;
  void auxTokens;
  void options;
  return null;
}
