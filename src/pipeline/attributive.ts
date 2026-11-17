
import { conjugate, irregularType, type IrregularType } from "../generator/conjugator.js";
import { hasBatchim } from "../generator/hangul.js";
import {
  isKoreanPotentialLemma,
  koreanPredicateAuxChain,
  loadSuppletiveNegDict,
  potentialPhrasePrefix,
  renderKoreanPredicateConnective,
  resolvePassiveLemma as resolveAuxPassiveLemma
} from "../generator/aux-map.js";
import {
  lookupSetMatches,
  pairKey,
  TAME_FORMS
} from "./lookup-tables.js";
import type { LookupTables } from "./lookup-tables.js";
import type { MatcherToken } from "./matchers.js";
import { auxHasCausative } from "./matchers.js";
import { precedingTokenOpensStrictReason } from "./reason-source-evidence.js";
import { predicateMorphologyFromAuxTokens } from "./predicate-morphology.js";
import { buildPotentialPropositionAttributive } from "./semantics/grammar-runtime.js";
import { activeProtoLayout } from "./clause-layout/proto-state.js";
import { previousNonSpaceIndex } from "./clause-layout/trivia.js";
import { isTekiDerivationSuffixToken } from "./head-tail/tail/predicate-root/derivational-suffix-table.js";
import { PredicateArgumentView } from "./semantics/helpers.js";
import type { ClauseLayout, ProtoClauseLayout } from "./clause-layout/index.js";
import {
  isTokoroAboutToHeadContext,
  isTokoroAlmostHeadContext,
  isKoroTemporalNiHeadContext,
  isTokoroConcessiveDeHeadContext,
  isTokoroResultHeadContext,
  isTokoroTemporalDeHeadContext,
  tokoroConcessiveDeText
} from "./semantics/tokoro.js";
import { caseParticleMarkerRelationForToken } from "./head-tail/boundary/marker.js";
import type { PassiveClass } from "./voice-class.js";
import { TokenCursor } from "./token-cursor.js";


import {
  POS0,
  POS01,
  POS1,
  POS2,
  POS4,
  POS5A,
  サ変可能,
  サ行変格,
  記号,
  形状詞,
  形容詞0,
  isIAdjectivePredicateToken,
  終止形_,
  助詞,
  助動詞_ジャ,
  助動詞_タ,
  助動詞_ダ,
  助動詞_タイ,
  助動詞_デス,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_レル,
  接続助詞,
  接尾辞_形容詞的,
  動詞,
  文語助動詞_ベシ,
  補助記号,
  名詞,
  連体形_,
  동사,
  형용사,
  isNaAdjCapable,
  NOMINAL_BITS, pos0in, INFLECTABLE_BITS
} from "../types/pos.js";
export type AttributiveToken = MatcherToken;

export interface ResolveAttributiveOptions {
  readonly headNounToken?: AttributiveToken | null;
  readonly nominalization?: boolean;
  readonly sahenNoun?: string | null;
  readonly plainVerbEnding?: string | null;
  readonly tokens?: readonly AttributiveToken[] | null;
  readonly contentIdx?: number | null;
  readonly forcePassive?: boolean;
  readonly passiveClass?: PassiveClass;
  readonly tameReasonHead?: boolean;
  readonly tokoroResultHead?: boolean;
  readonly tokoroTemporalDeHead?: boolean;
  readonly koroTemporalNiHead?: boolean;
  readonly tokoroConcessiveDeHead?: boolean;
  readonly teIruContractToPast?: boolean;
  readonly isPotential?: boolean;
  readonly nominalAttributiveEvidence?: NominalAttributiveEvidence;
  readonly lookups: LookupTables;
}

function nominalAttributiveEvidenceFromContentToken(
  contentToken: AttributiveToken,
  declared: NominalAttributiveEvidence | undefined
): NominalAttributiveEvidence {
  if (declared !== undefined && declared !== "unknown") {
    return declared;
  }
  return isTekiDerivationSuffixToken(contentToken) ? "teki_derivation" : "unknown";
}

export function conjugateNegAttributive(lemma: string, irregular: IrregularType | null, ending: string): string {
  if (isKoreanPotentialLemma(lemma)) {
    const prefix = potentialPhrasePrefix(lemma);
    if (ending === "ㄴ/은") {
      return `${prefix}없었던`;
    }
    return `${prefix}없는`;
  }
  const supp = loadSuppletiveNegDict().get(lemma);
  if (supp !== undefined) {
    return conjugate(supp[0], supp[1], ending);
  }
  const negStem = `${conjugate(lemma, irregularType(irregular), "지")} 않`;
  return conjugate(`${negStem}다`, null, ending);
}

export function hasRentaikei(token: Pick<AttributiveToken, "pos">): boolean {
  return (token.pos & POS5A) === 連体形_;
}

export function isAdjSuffixToken(token: Pick<AttributiveToken, "pos">): boolean {
  return (token.pos & POS01) === 接尾辞_形容詞的;
}

export function nounCopulaGiReason(noun: string, auxTokens: readonly AttributiveToken[]): string | null {
  if (auxTokens.length === 0) {
    return null;
  }
  const pos4Values = new Set(auxTokens.map((token) => token.pos & POS4));
  const forms = new Set(auxTokens.map((token) => token.dictionaryForm));
  if (pos4Values.has(助動詞_タ)) {
    const stem = noun + (hasBatchim(noun) === true ? "이었" : "였");
    return conjugate(`${stem}다`, null, "기");
  }
  if (
    pos4Values.has(助動詞_ダ) ||
    pos4Values.has(助動詞_デス) ||
    pos4Values.has(助動詞_ジャ) ||
    forms.has("ある") ||
    forms.has("だ") ||
    forms.has("です")
  ) {
    return `${noun}이기`;
  }
  return null;
}

export function resolveInnerAuxAttributive(
  koreanLemma: string,
  irregular: IrregularType | null,
  auxTokens: readonly AttributiveToken[],
  contentToken: AttributiveToken,
  options: { readonly sahenNoun?: string | null; readonly forcePassive?: boolean; readonly lookups: LookupTables }
): string | null {
  for (const [index, token] of auxTokens.entries()) {
    if (token.dictionaryForm !== "ちゃう" && token.dictionaryForm !== "じゃう") {
      continue;
    }
    const preAux = auxTokens.slice(0, index);
    const postAux = auxTokens.slice(index + 1);
    const prefix = buildChauPrefixForm(koreanLemma, irregular, preAux, {
      contentToken,
      sahenNoun: options.sahenNoun ?? null,
      forcePassive: options.forcePassive ?? false,
      lookups: options.lookups
    });
    if (prefix === null) {
      return null;
    }
    const buri = resolveBuriAttributive(postAux);
    return buri === null ? null : `${prefix} ${buri}`;
  }

  if (auxTokens.length >= 2) {
    const prev = auxTokens[auxTokens.length - 2];
    const last = auxTokens[auxTokens.length - 1];
    if (prev !== undefined && last !== undefined && (prev.pos & POS4) === 助動詞_タイ && (last.pos & POS4) === 助動詞_タ && hasRentaikei(last)) {
      return `${conjugate(koreanLemma, irregularType(irregular), "고")} 싶었던`;
    }
  }
  return null;
}

export function buildChauPrefixForm(
  koreanLemma: string,
  irregular: IrregularType | null,
  preAux: readonly AttributiveToken[],
  options: { readonly contentToken: AttributiveToken; readonly sahenNoun: string | null; readonly forcePassive: boolean; readonly lookups: LookupTables }
): string | null {
  if (preAux.length === 0) {
    return conjugate(koreanLemma, irregularType(irregular), "아/어");
  }
  const hasPassive = auxChainHasPassive(preAux, options.contentToken, { forcePassive: options.forcePassive }, options.lookups);
  const hasCausative = auxHasCausative(preAux);
  if (hasCausative && hasPassive) {
    return null;
  }
  if (hasCausative) {
    return `${conjugate(koreanLemma, irregularType(irregular), "게")} 해`;
  }
  if (hasPassive) {
    const [passiveLemma, passiveIrregular] = resolveAuxPassiveLemma(koreanLemma, irregularType(irregular), passiveOptions(options.contentToken, {
      sahenNoun: options.sahenNoun,
      forcePassive: options.forcePassive,
      lookups: options.lookups
    }));
    return conjugate(passiveLemma, passiveIrregular, "아/어");
  }
  return null;
}

export function resolveBuriAttributive(postAux: readonly AttributiveToken[]): string | null {
  if (postAux.length === 0) {
    return "버리는";
  }
  const last = postAux[postAux.length - 1];
  if (last === undefined || !hasRentaikei(last)) {
    return null;
  }
  const lastPos4 = last.pos & POS4;
  if (lastPos4 === 助動詞_タ) {
    if (postAux.length >= 2) {
      const prevPos4 = ((postAux[postAux.length - 2]?.pos ?? 0) & POS4);
      if (prevPos4 === 助動詞_タイ) {
        return "버리고 싶었던";
      }
      if (prevPos4 === 助動詞_ナイ || prevPos4 === 助動詞_ヌ) {
        return "버리지 않은";
      }
      return null;
    }
    return "버린";
  }
  if (lastPos4 === 助動詞_タイ) {
    return "버리고 싶은";
  }
  if (lastPos4 === 助動詞_ナイ || lastPos4 === 助動詞_ヌ) {
    return "버리지 않는";
  }
  return null;
}

export function resolveAttributive(
  koreanLemma: string,
  irregular: IrregularType | null,
  koreanPos: number,
  auxTokens: readonly AttributiveToken[],
  contentToken: AttributiveToken,
  options: ResolveAttributiveOptions
): string | null {
  const lookups = options.lookups;
  const headNounToken = options.headNounToken ?? null;
  const tokens = options.tokens ?? null;
  const contentIdx = options.contentIdx ?? null;
  const tameReasonHead = (options.tameReasonHead ?? false) || isTameReasonHeadContext(headNounToken, tokens, contentIdx, lookups);
  const tokoroResultHead = (options.tokoroResultHead ?? false) || isTokoroResultHeadContext(headNounToken, tokens, contentIdx, lookups);
  const tokoroTemporalDeHead = (options.tokoroTemporalDeHead ?? false) || isTokoroTemporalDeHeadContext(headNounToken, tokens, contentIdx, lookups);
  const koroTemporalNiHead = (options.koroTemporalNiHead ?? false) || isKoroTemporalNiHeadContext(headNounToken, tokens, contentIdx);
  const tokoroConcessiveDeHead = (options.tokoroConcessiveDeHead ?? false) || isTokoroConcessiveDeHeadContext(headNounToken, tokens, contentIdx, lookups);

  if (koreanPos !== 동사 && koreanPos !== 형용사) {
    if (tameReasonHead) {
      const reason = nounCopulaGiReason(koreanLemma, auxTokens);
      if (reason !== null) {
        return reason;
      }
    }
    if (
      auxTokens.length >= 2 &&
      hasRentaikei(auxTokens[auxTokens.length - 1]!) &&
      ((auxTokens[auxTokens.length - 1]?.pos ?? 0) & POS4) === 助動詞_タ &&
      (((auxTokens[auxTokens.length - 2]?.pos ?? 0) & POS4) === 助動詞_ダ ||
        ((auxTokens[auxTokens.length - 2]?.pos ?? 0) & POS4) === 助動詞_デス ||
        ((auxTokens[auxTokens.length - 2]?.pos ?? 0) & POS4) === 助動詞_ジャ)
    ) {
      return koreanLemma + (hasBatchim(koreanLemma) === true ? "이었던" : "였던");
    }
    if (auxTokens.length > 0 && isDaRentaikei(auxTokens[auxTokens.length - 1]!) && isKeijoshiContext(contentToken)) {
      const evidence = resolveNominalAttributiveEvidence(
        koreanLemma,
        nominalAttributiveEvidenceFromContentToken(contentToken, options.nominalAttributiveEvidence)
      );
      return nominalAttributiveSurface(koreanLemma, evidence);
    }
    if (auxTokens.length > 0 && isDaRentaikei(auxTokens[auxTokens.length - 1]!)) {
      return `${koreanLemma}인`;
    }
    return null;
  }

  if (options.teIruContractToPast === true) {
    if (auxChainHasNegative(auxTokens)) {
      return conjugateNegAttributive(koreanLemma, irregular, "ㄴ/은");
    }
    return conjugate(koreanLemma, irregularType(irregular), "ㄴ/은");
  }

  if (auxTokens.length > 0) {
    const lastAux = auxTokens[auxTokens.length - 1]!;
    if (!hasRentaikei(lastAux)) {
      return null;
    }
    const pos4 = lastAux.pos & POS4;
    if (options.isPotential === true) {
      return resolvePotentialAuxAttributive(koreanLemma, irregular, auxTokens);
    }
    if (tameReasonHead) {
      return renderKoreanPredicateConnective(koreanLemma, irregularType(irregular), koreanPos, koreanPredicateAuxChain(auxTokens), "기", connectiveOptions(contentToken, {
        sahenNoun: options.sahenNoun ?? null,
        forcePassive: options.forcePassive ?? false,
        lookups
      }));
    }
    if (tokoroResultHead && (pos4 === 助動詞_タ)) {
      return renderKoreanPredicateConnective(koreanLemma, irregularType(irregular), koreanPos, koreanPredicateAuxChain(auxTokens), "더니", connectiveOptions(contentToken, {
        sahenNoun: options.sahenNoun ?? null,
        forcePassive: options.forcePassive ?? false,
        lookups
      }));
    }
    if ((tokoroTemporalDeHead || koroTemporalNiHead) && (pos4 === 助動詞_タ)) {
      return `${renderKoreanPredicateConnective(koreanLemma, irregularType(irregular), koreanPos, koreanPredicateAuxChain(auxTokens), "ㄹ/을", connectiveOptions(contentToken, {
        sahenNoun: options.sahenNoun ?? null,
        forcePassive: options.forcePassive ?? false,
        lookups
      }))} 때${koroTemporalNiHead ? "쯤" : ""}`;
    }
    if (tokoroConcessiveDeHead && (pos4 === 助動詞_タ)) {
      return tokoroConcessiveDeText({
        koreanLemma,
        irregular,
        koreanPos,
        auxTokens,
        contentToken,
        sahenNoun: options.sahenNoun ?? null,
        forcePassive: options.forcePassive ?? false,
        lookups
      });
    }
    if (koreanPos === 동사) {
      const innerAttr = resolveInnerAuxAttributive(koreanLemma, irregular, auxTokens, contentToken, {
        sahenNoun: options.sahenNoun ?? null,
        forcePassive: options.forcePassive ?? false,
        lookups
      });
      if (innerAttr !== null) {
        return innerAttr;
      }
    }
    return resolveAuxAttributiveByLastAux(koreanLemma, irregular, koreanPos, auxTokens, contentToken, headNounToken, {
      forcePassive: options.forcePassive ?? false,
      sahenNoun: options.sahenNoun ?? null,
      lookups
    });
  }

  if (!hasRentaikei(contentToken) && !isPlainPredicateShushikei(contentToken) && !isAdjSuffixToken(contentToken)) {
    return null;
  }
  if (koreanPos === 형용사) {
    if (tameReasonHead) {
      return conjugate(koreanLemma, irregularType(irregular), "기");
    }
    if (isIssdaAdjective(koreanLemma)) {
      return conjugate(koreanLemma, irregularType(irregular), "ㄴ/는");
    }
    return conjugate(koreanLemma, irregularType(irregular), "ㄴ/은");
  }
  if (options.isPotential === true) {
    return resolvePotentialAuxAttributive(koreanLemma, irregular, auxTokens);
  }
  if (options.nominalization === true) {
    return conjugate(koreanLemma, irregularType(irregular), "ㄴ/는");
  }
  if (headNounToken !== null && (headNounToken.dictionaryForm === "ため" || headNounToken.dictionaryForm === "為")) {
    return conjugate(koreanLemma, irregularType(irregular), "기");
  }
  const ending = options.plainVerbEnding ?? selectPlainVerbAttributiveEnding(koreanLemma, contentToken, headNounToken, {
    tokens,
    contentIdx,
    lookups
  });
  return conjugate(koreanLemma, irregularType(irregular), ending);
}

export function resolvePotentialAuxAttributive(
  koreanLemma: string,
  irregular: IrregularType | null,
  auxTokens: readonly AttributiveToken[]
): string {
  return buildPotentialPropositionAttributive(koreanLemma, irregular, auxTokens);
}

export function isTameReasonHeadContext(
  headNounToken: AttributiveToken | null,
  tokens: readonly AttributiveToken[] | null,
  contentIdx: number | null,
  lookups: LookupTables
): boolean {
  if (headNounToken === null || tokens === null || contentIdx === null) {
    return false;
  }
  if (!TAME_FORMS.has(headNounToken.dictionaryForm)) {
    return false;
  }
  let headIdx: number | null = null;
  const searchCursor = new TokenCursor(tokens, contentIdx + 1);
  while (searchCursor.pos < searchCursor.end) {
    if (searchCursor.current() === headNounToken) {
      headIdx = searchCursor.pos;
      break;
    }
    searchCursor.advance();
  }
  if (headIdx === null) {
    const c = new TokenCursor(tokens, contentIdx + 1);
    while (c.pos < c.end) {
      const token = c.current();
      if (
        token !== undefined &&
        token.dictionaryForm === headNounToken.dictionaryForm &&
        token.surface === headNounToken.surface &&
        token.pos === headNounToken.pos
      ) {
        headIdx = c.pos;
        break;
      }
      c.advance();
    }
  }
  if (headIdx === null) {
    return false;
  }
  if (!precedingTokenOpensStrictReason(tokens, headIdx - 1, contentIdx)) {
    return false;
  }
  const tailCursor = new TokenCursor(tokens, headIdx + 1);
  while (tailCursor.pos < tailCursor.end) {
    const token = tailCursor.current();
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (lookups.GRAMMAR_BOUNDARY_CLAUSE_RESULT_SURFACES.has(token.surface) || (pos0 === 補助記号) || (pos0 === 記号)) {
      return true;
    }
    return !(pos0 === 助詞 && lookups.TAME_NON_REASON_TAIL_PARTICLES.has(token.surface));
  }
  return false;
}

export function isIssdaAdjective(koreanLemma: string): boolean {
  return koreanLemma.endsWith("있다") || koreanLemma.endsWith("없다");
}

export function auxChainHasNegative(auxTokens: readonly Pick<AttributiveToken, "pos">[]): boolean {
  return auxTokens.some((token) => (token.pos & POS4) === 助動詞_ナイ);
}

export function auxChainHasPassive(
  auxTokens: readonly Pick<AttributiveToken, "pos">[],
  contentToken: Pick<AttributiveToken, "pos" | "dictionaryForm">,
  options: { readonly forcePassive?: boolean },
  lookups: LookupTables
): boolean {
  return predicateMorphologyFromAuxTokens(auxTokens, {
    jpDictForm: contentToken.dictionaryForm,
    verbConjType: contentToken.pos & POS4,
    ...(options.forcePassive === undefined ? {} : { forcePassive: options.forcePassive })
  }, lookups).passive;
}

export function selectPlainVerbAttributiveEnding(
  koreanLemma: string,
  contentToken: AttributiveToken,
  headNounToken: AttributiveToken | null,
  options: {
    readonly tokens?: readonly AttributiveToken[] | null;
    readonly contentIdx?: number | null;
    readonly layout?: ClauseLayout | null;
    readonly protoLayout?: ProtoClauseLayout | null;
    readonly lookups: LookupTables;
  }
): string {
  const lookups = options.lookups;
  const headNounLemma = headNounToken?.dictionaryForm ?? "";
  const jpLemma = contentToken.dictionaryForm;
  if (headNounToken !== null && isTokoroAlmostHeadContext(headNounToken, options.tokens ?? null, options.contentIdx ?? null, lookups)) {
    return "ㄹ/을";
  }
  if (headNounToken !== null && isTokoroAboutToHeadContext(headNounToken, options.tokens ?? null, options.contentIdx ?? null, lookups)) {
    return "(으)려는";
  }
  if (options.tokens !== null && options.tokens !== undefined && options.contentIdx !== null && options.contentIdx !== undefined && hasLocalFutureCue(options.tokens, options.contentIdx, lookups)) {
    return "ㄹ/을";
  }
  if (lookups.JP_FUTURE_HEAD_NOUNS.has(headNounLemma)) {
    return "ㄹ/을";
  }
  if (lookups.JP_PRESENT_HEAD_NOUNS.has(headNounLemma)) {
    return "ㄴ/는";
  }
  const objectOverride = selectObjectConditionedAttributiveEnding(jpLemma, {
    tokens: options.tokens ?? null,
    contentIdx: options.contentIdx ?? null,
    lookups
  });
  if (objectOverride !== null) {
    return objectOverride;
  }
  if (isDurationWataruAttributive(koreanLemma, contentToken, {
    tokens: options.tokens ?? null,
    contentIdx: options.contentIdx ?? null,
    layout: options.layout ?? null,
    protoLayout: options.protoLayout ?? null,
    lookups
  })) {
    return "ㄴ/은";
  }
  const jpOverride = lookups.JP_VERB_ADNOMINAL_ENDING_OVERRIDES.get(jpLemma);
  if (jpOverride !== undefined) {
    return jpOverride;
  }
  const koOverride = lookups.KO_VERB_ADNOMINAL_ENDING_OVERRIDES.get(koreanLemma);
  if (koOverride !== undefined) {
    return koOverride;
  }
  const predicateKey = attributivePredicateLookupKey(contentToken, options);
  if (lookups.ATTRIBUTIVE_PROSPECTIVE_EVENT_VERBS.has(predicateKey)) {
    return "ㄹ/을";
  }
  return "ㄴ/는";
}

export function attributivePredicateLookupKey(
  contentToken: AttributiveToken,
  options: { readonly tokens?: readonly AttributiveToken[] | null; readonly contentIdx?: number | null } = {}
): string {
  if (contentToken.dictionaryForm === "する" && options.tokens !== null && options.tokens !== undefined && options.contentIdx !== null && options.contentIdx !== undefined && options.contentIdx > 0) {
    const prev = options.tokens[options.contentIdx - 1];
    if (prev !== undefined && (prev.pos & (POS0 | POS2)) === (名詞 | サ変可能)) {
      return `${prev.dictionaryForm || prev.surface}する`;
    }
  }
  return contentToken.dictionaryForm;
}

export function isWoParticle(token: AttributiveToken): boolean {
  return caseParticleMarkerRelationForToken(token, -1, {
    acceptedSurfaces: ["を"],
    consumers: ["predicate_helpers"]
  }) !== null;
}

export function hasLocalFutureCue(tokens: readonly AttributiveToken[], contentIdx: number, lookups: LookupTables): boolean {
  let idx = contentIdx - 1;
  if (idx >= 0 && isSahenNounToken(tokens[idx])) {
    idx -= 1;
  }
  let scanned = 0;
  while (idx >= 0 && scanned < 4) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if ((pos0 === 補助記号) || (pos0 === 記号) || ((pos0 === 助詞) && (token.pos & POS1) === 接続助詞) || (pos0 === 動詞) || (pos0 === 形容詞0) || (pos0 === 形状詞)) {
      break;
    }
    if (isFutureCueToken(tokens, idx, lookups)) {
      return true;
    }
    idx -= 1;
    scanned += 1;
  }
  return false;
}

export function isFutureCueToken(tokens: readonly AttributiveToken[], idx: number, lookups: LookupTables): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  if (lookups.ATTRIBUTIVE_FUTURE_CUE_TERMS.has(token.dictionaryForm) || lookups.ATTRIBUTIVE_FUTURE_CUE_TERMS.has(token.surface)) {
    return true;
  }
  if (caseParticleMarkerRelationForToken(token, idx, {
    acceptedSurfaces: ["から"],
    acceptedParticleSubtypes: ["格助詞", "接続助詞"],
    consumers: ["predicate_helpers"]
  }) !== null && idx > 0) {
    const prev = tokens[idx - 1];
    const prevForm = prev?.dictionaryForm || prev?.surface;
    return prevForm === "今" || prevForm === "これ";
  }
  return false;
}

function isPlainPredicateShushikei(token: Pick<AttributiveToken, "pos">): boolean {
  const pos0 = token.pos & POS0;
  return (pos0in(pos0, INFLECTABLE_BITS)) && (token.pos & POS5A) === 終止形_;
}

export function isDaRentaikei(auxToken: Pick<AttributiveToken, "pos">): boolean {
  return (auxToken.pos & (POS4 | POS5A)) === (助動詞_ダ | 連体形_);
}

export function isKeijoshiContext(contentToken: Pick<AttributiveToken, "pos">): boolean {
  return isNaAdjCapable(contentToken);
}

export type NominalAttributiveEvidence =
  | "predicate_nominalized"
  | "teki_derivation"
  | "unknown";

export type ResolvedNominalAttributiveEvidence =
  | "predicate_nominalized"
  | "teki_derivation"
  | null;

function legacyNominalAttributiveEvidenceFromSurface(
  lemma: string
): ResolvedNominalAttributiveEvidence {
  if (lemma.endsWith("적")) {
    return "teki_derivation";
  }
  return lemma.endsWith("함") || lemma.endsWith("음") || lemma.endsWith("움")
    ? "predicate_nominalized"
    : null;
}

export function nominalAttributiveEvidenceFrom(
  sourceToken: {
    readonly surface: string;
    readonly dictionaryForm?: string;
    readonly splitA?: readonly { readonly surface: string; readonly dictionaryForm?: string }[];
  },
  entry: {
    readonly senses?: readonly {
      readonly korean?: string;
      readonly koreanPos?: number;
      readonly nominalized?: string | null;
    }[];
  } | null | undefined,
  koreanLemma: string
): Exclude<NominalAttributiveEvidence, "unknown"> | undefined {
  if (isTekiDerivationSuffixToken(sourceToken)) {
    return "teki_derivation";
  }
  const senses = entry?.senses ?? [];
  return senses.some((sense) =>
    sense.nominalized === koreanLemma && (sense.koreanPos === 형용사 || sense.koreanPos === 동사)
  )
    ? "predicate_nominalized"
    : undefined;
}

export function resolveNominalAttributiveEvidence(
  lemma: string,
  typed: NominalAttributiveEvidence
): ResolvedNominalAttributiveEvidence {
  if (typed !== "unknown") {
    return typed;
  }
  return legacyNominalAttributiveEvidenceFromSurface(lemma);
}

export function nominalAttributiveSurface(
  lemma: string,
  evidence: ResolvedNominalAttributiveEvidence,
  options: { readonly futureProjection?: boolean } = {}
): string | null {
  const future = options.futureProjection === true;
  if (evidence === "predicate_nominalized" && lemma.endsWith("함")) {
    return `${lemma.slice(0, -1)}${conjugate("하다", null, future ? "ㄹ/을" : "ㄴ/은")}`;
  }
  if (future) {
    return null;
  }
  return evidence === "teki_derivation" && lemma.endsWith("적") ? `${lemma}인` : `${lemma}의`;
}

export function resolveAttributiveForTail(
  tailLemma: string,
  tailIrregular: IrregularType | null,
  auxTokens: readonly AttributiveToken[],
  options: { readonly preferIssdaPastDeon?: boolean; readonly headNounToken?: AttributiveToken | null; readonly lookups: LookupTables }
): string {
  const lookups = options.lookups;
  const lastAux = auxTokens[auxTokens.length - 1];
  if (lastAux !== undefined) {
    const pos4 = lastAux.pos & POS4;
    if ((pos4 === 助動詞_タ) && auxTokens.length >= 2 && ((auxTokens[auxTokens.length - 2]?.pos ?? 0) & POS4) === 助動詞_タイ) {
      return `${conjugate(tailLemma, irregularType(tailIrregular), "고")} 싶었던`;
    }
    if ((pos4 === 助動詞_タイ)) {
      return `${conjugate(tailLemma, irregularType(tailIrregular), "고")} 싶은`;
    }
    if ((pos4 === 助動詞_タ)) {
      if (auxChainHasNegative(auxTokens.slice(0, -1))) {
        if (options.headNounToken !== null && options.headNounToken !== undefined && lookups.JP_FUTURE_HEAD_NOUNS.has(options.headNounToken.dictionaryForm)) {
          const negStem = `${conjugate(tailLemma, irregularType(tailIrregular), "지")} 않`;
          return `${conjugate(`${negStem}다`, null, "았/었")}을`;
        }
        if (isIssdaAdjective(tailLemma)) {
          const negStem = `${conjugate(tailLemma, irregularType(tailIrregular), "지")} 않`;
          return `${negStem}았던`;
        }
        return conjugateNegAttributive(tailLemma, tailIrregular, "ㄴ/은");
      }
      if (options.preferIssdaPastDeon === true && isIssdaAdjective(tailLemma)) {
        return `${tailLemma.slice(0, -1)}었던`;
      }
      return conjugate(tailLemma, irregularType(tailIrregular), "ㄴ/은");
    }
    if ((pos4 === 助動詞_ナイ)) {
      const negEnding = options.headNounToken !== null && options.headNounToken !== undefined && lookups.JP_FUTURE_HEAD_NOUNS.has(options.headNounToken.dictionaryForm) ? "ㄹ/을" : "ㄴ/는";
      if (isIssdaAdjective(tailLemma)) {
        const negStem = `${conjugate(tailLemma, irregularType(tailIrregular), "지")} 않`;
        return conjugate(`${negStem}다`, null, negEnding);
      }
      return conjugateNegAttributive(tailLemma, tailIrregular, negEnding);
    }
  }
  if (options.headNounToken !== null && options.headNounToken !== undefined && lookups.JP_FUTURE_HEAD_NOUNS.has(options.headNounToken.dictionaryForm)) {
    return conjugate(tailLemma, irregularType(tailIrregular), "ㄹ/을");
  }
  return conjugate(tailLemma, irregularType(tailIrregular), "ㄴ/는");
}

function resolveAuxAttributiveByLastAux(
  koreanLemma: string,
  irregular: IrregularType | null,
  koreanPos: number,
  auxTokens: readonly AttributiveToken[],
  contentToken: AttributiveToken,
  headNounToken: AttributiveToken | null,
  options: { readonly forcePassive: boolean; readonly sahenNoun?: string | null; readonly passiveClass?: PassiveClass; readonly lookups: LookupTables }
): string | null {
  const lookups = options.lookups;
  const lastAux = auxTokens[auxTokens.length - 1]!;
  const pos4 = lastAux.pos & POS4;
  if ((pos4 === 助動詞_タ)) {
    if (auxChainHasNegative(auxTokens.slice(0, -1))) {
      if (headNounToken !== null && lookups.JP_FUTURE_HEAD_NOUNS.has(headNounToken.dictionaryForm)) {
        const negStem = `${conjugate(koreanLemma, irregularType(irregular), "지")} 않`;
        return `${conjugate(`${negStem}다`, null, "았/었")}을`;
      }
      return conjugateNegAttributive(koreanLemma, irregular, "ㄴ/은");
    }
    const teruIdx = auxTokens.slice(0, -1).findIndex((aux) => aux.dictionaryForm === "いる" || aux.dictionaryForm === "てる");
    if (teruIdx >= 0 && koreanPos === 동사) {
      const progAux = auxTokens.slice(0, teruIdx);
      const isPassive = auxChainHasPassive(progAux, contentToken, options, lookups);
      const isResultative = isPassive
        ? options.passiveClass === "resultative_state"
        : lookups.isTeIruResultativeVerb(contentToken.dictionaryForm);
      if (isResultative) {
        const [baseLemma, baseIrregular] = isPassive
          ? resolveAuxPassiveLemma(koreanLemma, irregularType(irregular), passiveOptions(contentToken, options))
          : [koreanLemma, irregularType(irregular)] as const;
        return `${conjugate(baseLemma, baseIrregular, "아/어")} 있었던`;
      }
      if (progAux.length === 0) {
        const blocked = lookups.named("verb.te_iru_attributive_contraction_blocked");
        if (blocked === undefined || !lookupSetMatches(blocked, contentToken.dictionaryForm)) {
          return conjugate(koreanLemma, irregularType(irregular), "던");
        }
      }
      const prog = renderKoreanPredicateConnective(koreanLemma, irregularType(irregular), koreanPos, koreanPredicateAuxChain(progAux), "고", connectiveOptions(contentToken, options));
      return `${prog} 있었던`;
    }
    if (auxChainHasPassive(auxTokens.slice(0, -1), contentToken, options, lookups)) {
      const [passiveLemma, passiveIrregular] = resolveAuxPassiveLemma(koreanLemma, irregularType(irregular), passiveOptions(contentToken, options));
      return conjugate(passiveLemma, passiveIrregular, "ㄴ/은");
    }
    if (isIssdaAdjective(koreanLemma)) {
      return `${koreanLemma.slice(0, -1)}었던`;
    }
    if (koreanPos === 형용사 && isIAdjectivePredicateToken(contentToken)) {
      return `${conjugate(koreanLemma, irregularType(irregular), "았/었")}던`;
    }
    return conjugate(koreanLemma, irregularType(irregular), "ㄴ/은");
  }
  if ((pos4 === 助動詞_ナイ)) {
    const isTeIruNegative = auxTokens.length >= 2 && (auxTokens[auxTokens.length - 2]?.dictionaryForm === "いる" || auxTokens[auxTokens.length - 2]?.dictionaryForm === "てる") && koreanPos === 동사;
    if (isTeIruNegative) {
      const jpDictForm = contentToken.dictionaryForm;
      const isPassive = auxChainHasPassive(auxTokens.slice(0, -1), contentToken, options, lookups);
      const isNegativeResultative = isPassive
        ? options.passiveClass === "resultative_state"
        : lookups.isTeIruNegativeResultativeVerb(jpDictForm);
      const isResultative = isPassive
        ? options.passiveClass === "resultative_state"
        : lookups.isTeIruResultativeVerb(jpDictForm);
      if (isNegativeResultative || (isPassive && isResultative)) {
        const [baseLemma, baseIrregular] = isPassive
          ? resolveAuxPassiveLemma(koreanLemma, irregularType(irregular), passiveOptions(contentToken, options))
          : [koreanLemma, irregularType(irregular)] as const;
        return `${conjugate(baseLemma, baseIrregular, "아/어")} 있지 않은`;
      }
    }
    if (auxChainHasPassive(auxTokens.slice(0, -1), contentToken, options, lookups)) {
      const [passiveLemma, passiveIrregular] = resolveAuxPassiveLemma(koreanLemma, irregularType(irregular), passiveOptions(contentToken, options));
      return conjugateNegAttributive(passiveLemma, passiveIrregular, "ㄴ/는");
    }
    const negDefaultEnding = headNounToken !== null && lookups.JP_FUTURE_HEAD_NOUNS.has(headNounToken.dictionaryForm)
      ? "ㄹ/을"
      : koreanPos === 형용사
        ? "ㄴ/은"
        : "ㄴ/는";
    if (isTeIruNegative) {
      return conjugateNegAttributive(koreanLemma, irregular, "ㄴ/은");
    }
    return conjugateNegAttributive(koreanLemma, irregular, negDefaultEnding);
  }
  if ((pos4 === 助動詞_ヌ)) {
    const ending = headNounToken !== null && lookups.JP_FUTURE_HEAD_NOUNS.has(headNounToken.dictionaryForm) ? "ㄹ/을" : "ㄴ/는";
    if (auxChainHasPassive(auxTokens.slice(0, -1), contentToken, options, lookups)) {
      const [passiveLemma, passiveIrregular] = resolveAuxPassiveLemma(koreanLemma, irregularType(irregular), passiveOptions(contentToken, options));
      return conjugateNegAttributive(passiveLemma, passiveIrregular, ending);
    }
    return conjugateNegAttributive(koreanLemma, irregular, ending);
  }
  if ((pos4 === 助動詞_タイ)) {
    return `${conjugate(koreanLemma, irregularType(irregular), "고")} 싶은`;
  }
  if ((pos4 === 助動詞_ダ)) {
    return conjugate(koreanLemma, irregularType(irregular), koreanPos === 동사 ? "ㄴ/는" : "ㄴ/은");
  }
  if ((pos4 === 助動詞_レル)) {
    const isPassive = predicateMorphologyFromAuxTokens([lastAux], {
      jpDictForm: contentToken.dictionaryForm,
      verbConjType: contentToken.pos & POS4,
      forcePassive: options.forcePassive
    }, lookups).passive;
    if (isPassive) {
      const [passiveLemma, passiveIrregular] = resolveAuxPassiveLemma(koreanLemma, irregularType(irregular), passiveOptions(contentToken, options));
      return conjugate(passiveLemma, passiveIrregular, "ㄴ/는");
    }
    return `${conjugate(koreanLemma, irregularType(irregular), "ㄹ/을")} 수 있는`;
  }
  if ((pos4 === 文語助動詞_ベシ)) {
    return `${conjugate(koreanLemma, irregularType(irregular), "아/어야")} 할`;
  }
  if ((lastAux.dictionaryForm === "いる" || lastAux.dictionaryForm === "てる") && koreanPos === 동사) {
    const preTeIruAux = auxTokens.slice(0, -1);
    const isPassive = auxChainHasPassive(preTeIruAux, contentToken, options, lookups);
    const isResultative = isPassive
      ? options.passiveClass === "resultative_state"
      : lookups.isTeIruResultativeVerb(contentToken.dictionaryForm);
    if (isResultative) {
      const [baseLemma, baseIrregular] = isPassive
        ? resolveAuxPassiveLemma(koreanLemma, irregularType(irregular), passiveOptions(contentToken, options))
        : [koreanLemma, irregularType(irregular)] as const;
      return `${conjugate(baseLemma, baseIrregular, "아/어")} 있는`;
    }
    return `${renderKoreanPredicateConnective(koreanLemma, irregularType(irregular), koreanPos, koreanPredicateAuxChain(preTeIruAux), "고", connectiveOptions(contentToken, options))} 있는`;
  }
  if (auxHasCausative([lastAux]) && koreanPos === 동사) {
    return `${conjugate(koreanLemma, irregularType(irregular), "게")} 하는`;
  }
  return null;
}

function isDurationWataruAttributive(
  koreanLemma: string,
  contentToken: AttributiveToken,
  options: {
    readonly tokens?: readonly AttributiveToken[] | null;
    readonly contentIdx?: number | null;
    readonly layout?: ClauseLayout | null;
    readonly protoLayout?: ProtoClauseLayout | null;
    readonly lookups: LookupTables;
  }
): boolean {
  if (koreanLemma !== "걸치다" || contentToken.dictionaryForm !== "渡る") {
    return false;
  }
  if (options.tokens === undefined || options.tokens === null || options.contentIdx === undefined || options.contentIdx === null) {
    return false;
  }
  const protoLayout = options.protoLayout ?? activeProtoLayout();
  if (options.layout === null && protoLayout === null) {
    return false;
  }
  const view = new PredicateArgumentView(options.tokens, options.contentIdx, {
    lookups: options.lookups,
    ...(options.layout === null ? {} : { layout: options.layout }),
    ...(protoLayout === null ? {} : { protoLayout })
  });
  return view.hasArgumentCategory("に", ["time"]);
}

function isSahenNounToken(token: AttributiveToken | undefined): boolean {
  return token !== undefined && (token.pos & (POS0 | POS2)) === (名詞 | サ変可能);
}

function selectObjectConditionedAttributiveEnding(
  jpLemma: string,
  options: { readonly tokens?: readonly AttributiveToken[] | null; readonly contentIdx?: number | null; readonly lookups: LookupTables }
): string | null {
  if (options.tokens === undefined || options.tokens === null || options.contentIdx === undefined || options.contentIdx === null) {
    return null;
  }
  const objectNoun = findDirectObjectBeforePredicate(options.tokens, options.contentIdx);
  if (objectNoun === null) {
    return null;
  }
  const objectLemma = objectNoun.dictionaryForm;
  if (objectLemma.length === 0) {
    return null;
  }
  return options.lookups.JP_OBJECT_ADNOMINAL_ENDING_OVERRIDES.get(pairKey(jpLemma, objectLemma)) ?? null;
}

function findDirectObjectBeforePredicate(tokens: readonly AttributiveToken[], predicateIdx: number): AttributiveToken | null {
  const particleIdx = previousNonSpaceIndex(tokens, predicateIdx);
  if (particleIdx === null || !isWoParticle(tokens[particleIdx]!)) {
    return null;
  }
  const nounIdx = previousNonSpaceIndex(tokens, particleIdx);
  if (nounIdx === null) {
    return null;
  }
  const noun = tokens[nounIdx];
  if (noun !== undefined && (pos0in(noun.pos, NOMINAL_BITS))) {
    return noun;
  }
  return null;
}

function connectiveOptions(
  contentToken: AttributiveToken,
  options: { readonly sahenNoun?: string | null; readonly forcePassive?: boolean; readonly passiveClass?: PassiveClass; readonly lookups: LookupTables }
): {
  readonly lookups: LookupTables;
  readonly jpDictForm: string;
  readonly verbConjType?: number;
  readonly sahenCompound: boolean;
  readonly sahenNoun?: string;
  readonly forcePassive: boolean;
  readonly passiveClass?: PassiveClass;
} {
  return {
    lookups: options.lookups,
    jpDictForm: contentToken.dictionaryForm,
    ...((contentToken.pos & POS4) === 0 ? {} : { verbConjType: contentToken.pos & POS4 }),
    sahenCompound: isSahenContentToken(contentToken),
    ...(options.sahenNoun === undefined || options.sahenNoun === null ? {} : { sahenNoun: options.sahenNoun }),
    forcePassive: options.forcePassive ?? false,
    ...(options.passiveClass === undefined ? {} : { passiveClass: options.passiveClass })
  };
}

function passiveOptions(
  contentToken: AttributiveToken,
  options: { readonly sahenNoun?: string | null; readonly forcePassive?: boolean; readonly passiveClass?: PassiveClass; readonly lookups: LookupTables }
): { readonly lookups: LookupTables; readonly sahenCompound: boolean; readonly sahenNoun?: string; readonly passiveClass?: PassiveClass } {
  return {
    lookups: options.lookups,
    sahenCompound: isSahenContentToken(contentToken),
    ...(options.sahenNoun === undefined || options.sahenNoun === null ? {} : { sahenNoun: options.sahenNoun }),
    ...(options.passiveClass === undefined ? {} : { passiveClass: options.passiveClass })
  };
}

function isSahenContentToken(token: AttributiveToken): boolean {
  return token.dictionaryForm === "する" && (token.pos & POS4) === サ行変格;
}
