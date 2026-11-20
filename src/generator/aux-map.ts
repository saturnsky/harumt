
import { parse } from "smol-toml";

import { type DataLoader } from "../data-loader.js";
import { resolveDataSection } from "../dictionary/data-section.js";
import { conjugate, type IrregularType } from "./conjugator.js";
import { hasAllomorphBatchim, nounPastCopulaStem, selectParticle } from "./particles.js";
import { usesVerbLikeFormalPlainEnding } from "./predicate-register.js";
import { compose, decompose, hasBatchim, JONG_NONE, JONG_RIEUL } from "./hangul.js";
import type { PassiveClass } from "../pipeline/voice-class.js";
import type { LookupTables } from "../pipeline/lookup-tables.js";


import {
  _撥音便,
  POS4,
  POS4_OF_NAME,
  POS5,
  POS5_OF_NAME,
  POS5_SET_OF_NAME,
  POS5A,
  POS5A_OF_NAME,
  POS5B,
  is五段,
  サ行変格,
  助動詞,
  助動詞_ジャ,
  助動詞_タ,
  助動詞_デス,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_マス,
  助動詞_ラシイ,
  助動詞_レル,
  終止形_一般,
  文語助動詞_ベシ,
  감탄사,
  대명사,
  동사,
  명사,
  부사,
  형용사,
} from "../types/pos.js";
import type { KoreanPoliteForms } from "../types/dictionary.js";
export interface AuxToken {
  pos: number;
  surface?: string;
  dictionaryForm?: string;
  dictionary_form?: string;
  reading?: string;
  dictionaryFormReading?: string;
  dictionary_form_reading?: string;
  dictionaryId?: number;
  dictionary_id?: number;
  preferLongNegation?: boolean;
  prefer_long_negation?: boolean;
}

const KOREAN_PREDICATE_AUX_CHAIN: unique symbol = Symbol("KoreanPredicateAuxChain");

export interface KoreanPredicateAuxChain {
  readonly [KOREAN_PREDICATE_AUX_CHAIN]: true;
}

interface KoreanPredicateAuxChainInternal extends KoreanPredicateAuxChain {
  readonly tokens: readonly AuxToken[];
}

export function koreanPredicateAuxChain(auxTokens: readonly AuxToken[]): KoreanPredicateAuxChain {
  return {
    [KOREAN_PREDICATE_AUX_CHAIN]: true,
    tokens: auxTokens
  } as KoreanPredicateAuxChainInternal;
}

function auxTokensOf(chain: KoreanPredicateAuxChain): readonly AuxToken[] {
  return (chain as KoreanPredicateAuxChainInternal).tokens;
}

export class ConjugationResult {
  constructor(
    readonly text: string,
    readonly polite: boolean
  ) { }
}

interface PassiveDictEntry {
  readonly passive: string;
  readonly irregular: IrregularType | null;
  readonly transitive: boolean;
}

type AuxFeatureFlag =
  | "polite"
  | "past"
  | "negative"
  | "desire"
  | "volitional"
  | "conjecture"
  | "copula"
  | "conditional_tara"
  | "conditional_nara"
  | "adverbial_ni"
  | "potential"
  | "passive"
  | "causative"
  | "causative_passive"
  | "progressive"
  | "obligation"
  | "negative_volition"
  | "prefer_long_negation";

interface AuxTableVariant {
  readonly pos5_contains?: string;
  readonly pos5_eq?: string;
  readonly surface_in?: readonly string[];
  readonly flags?: readonly AuxFeatureFlag[];
}

interface AuxTableEntry {
  readonly pos4?: string;
  readonly pos4_in?: readonly string[];
  readonly dictionary_form?: string;
  readonly dictionary_form_in?: readonly string[];
  readonly always?: readonly AuxFeatureFlag[];
  readonly variants?: readonly AuxTableVariant[];
  readonly default?: readonly AuxFeatureFlag[];
}

interface AuxTableRoot {
  readonly aux?: readonly AuxTableEntry[];
}

type RegisterKey = "casual_plain" | "casual_polite" | "formal_plain" | "formal_polite";

interface RegisterEndingSpec {
  readonly nonpast_ending?: string;
  readonly nonpast_post?: string;
  readonly past_suffix: string;
}

interface RegisterEndingsRoot {
  readonly register?: { readonly [key: string]: RegisterEndingSpec | undefined };
}

interface SfpVerbSpec {
  readonly ending_key: string;
  readonly post_suffix?: string;
  readonly polite: boolean;
}

interface SfpEntry {
  readonly jp?: string;
  readonly purpose?: string;
  readonly handled_by: "table" | "code" | "special";
  readonly verb?: { readonly [key: string]: SfpVerbSpec | undefined };
}

interface SfpCatalogRoot {
  readonly sfp?: { readonly [key: string]: SfpEntry | undefined };
}

let passiveDict: ReadonlyMap<string, PassiveDictEntry> | null = null;
let passivePossessorDict: ReadonlyMap<string, PassiveDictEntry> | null = null;

let suppletiveNegDict: ReadonlyMap<string, readonly [lemma: string, irregular: IrregularType | null]> | null = null;

let auxTable: readonly AuxTableEntry[] | null = null;

let registerEndings: { readonly [key: string]: RegisterEndingSpec | undefined } | null = null;

let sfpCatalog: { readonly [key: string]: SfpEntry | undefined } | null = null;

let _passiveJsonl: string | undefined;
let _passiveFileExists = false;
let _passivePossessorJsonl: string | undefined;
let _passivePossessorFileExists = false;
let _suppletiveNegJsonl: string | undefined;
let _suppletiveNegFileExists = false;
let _auxiliariesToml: string | undefined;
let _registerEndingsToml: string | undefined;
let _sfpEndingsToml: string | undefined;

export async function initAuxMap(loader: DataLoader): Promise<void> {
  const dictDir = resolveDataSection("dict");
  const configDir = resolveDataSection("config");

  const passivePath = loader.joinPath(dictDir, "passive.jsonl");
  _passiveFileExists = await loader.exists(passivePath);
  if (_passiveFileExists) {
    _passiveJsonl = await loader.readTextFile(passivePath);
  }

  const passivePossessorPath = loader.joinPath(dictDir, "passive_possessor.jsonl");
  _passivePossessorFileExists = await loader.exists(passivePossessorPath);
  if (_passivePossessorFileExists) {
    _passivePossessorJsonl = await loader.readTextFile(passivePossessorPath);
  }

  const suppletiveNegPath = loader.joinPath(dictDir, "suppletive_neg.jsonl");
  _suppletiveNegFileExists = await loader.exists(suppletiveNegPath);
  if (_suppletiveNegFileExists) {
    _suppletiveNegJsonl = await loader.readTextFile(suppletiveNegPath);
  }

  _auxiliariesToml = await loader.readTextFile(loader.joinPath(configDir, "auxiliaries.toml"));
  _registerEndingsToml = await loader.readTextFile(loader.joinPath(configDir, "register_endings.toml"));
  _sfpEndingsToml = await loader.readTextFile(loader.joinPath(configDir, "sfp_endings.toml"));
}

export function renderKoreanPredicateTerminal(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  auxChain: KoreanPredicateAuxChain,
  options: {
    lookups: LookupTables;
    formal?: boolean;
    jpDictForm?: string;
    verbConjType?: number;
    forcePassive?: boolean;
    sfp?: string;
    isImperative?: boolean;
    allomorphHost?: string;
    sahenCompound?: boolean;
    sahenNoun?: string;
    passiveClass?: PassiveClass;
    teIruResultative?: boolean;
    teIruContractToPast?: boolean;
    koreanPolite?: KoreanPoliteForms;
  }
): ConjugationResult {
  const auxTokens = auxTokensOf(auxChain);

  if (options.teIruContractToPast === true && (koreanPos === 동사 || koreanPos === 형용사)) {
    return resolveTeIruContractedPast(koreanLemma, irregular, auxTokens, potentialOptions(options), options.lookups);
  }
  if (auxTokens.length === 0) {
    return noAux(koreanLemma, irregular, koreanPos, noAuxOptions(options), options.lookups);
  }
  const rashiiIndex = findRashiiIndex(auxTokens);
  if (rashiiIndex !== undefined) {
    return resolveRashiiChain(koreanLemma, irregular, koreanPos, auxTokens, rashiiIndex, potentialOptions(options), options.lookups);
  }
  const shimauIndex = findShimauIndex(auxTokens);
  if (shimauIndex !== undefined) {
    return resolveShimauChain(koreanLemma, irregular, koreanPos, auxTokens, shimauIndex, options, options.lookups);
  }
  const teruIndex = findTeruIndex(auxTokens);
  if (teruIndex !== undefined) {
    return resolveTeruChain(koreanLemma, irregular, koreanPos, auxTokens, teruIndex, options, options.lookups);
  }

  const features = extractFeatures(auxTokens, options);
  return applyFeatures(koreanLemma, irregular, koreanPos, features, featureOptions(options), options.lookups);
}


function verbPlainQuotativeEnding(connective: string): string | null {
  if (connective === "다고") return "ㄴ/는다고";
  if (connective === "다니까") return "ㄴ/는다니까";
  return null;
}

export function renderKoreanPredicateConnective(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  auxChain: KoreanPredicateAuxChain,
  connective: string,
  options: {
    lookups: LookupTables;
    jpDictForm?: string;
    verbConjType?: number;
    forcePassive?: boolean;
    sahenCompound?: boolean;
    sahenNoun?: string;
    passiveClass?: PassiveClass;
    teIruResultative?: boolean;
    teIruContractToPast?: boolean;
  }
): string {
  const auxTokens = auxTokensOf(auxChain);
  if (auxTokens.length > 0) {
    const rashiiIndex = findRashiiIndex(auxTokens);
    if (rashiiIndex !== undefined) {
      const preAux = auxTokens.slice(0, rashiiIndex);
      const postAux = auxTokens.slice(rashiiIndex + 1);
      const gatta = renderKoreanPredicateConnective("같다", null, 형용사, koreanPredicateAuxChain(postAux), connective, { lookups: options.lookups });
      if (koreanPos === 동사 || koreanPos === 형용사) {
        return `${rashiiAttributive(koreanLemma, irregular, koreanPos, preAux, options.lookups)} 것 ${gatta}`;
      }
      return `${koreanLemma} ${gatta}`;
    }
    const shimauIndex = findShimauIndex(auxTokens);
    if (shimauIndex !== undefined) {
      const preAux = auxTokens.slice(0, shimauIndex);
      const postAux = auxTokens.slice(shimauIndex + 1);
      let aeForm = koreanLemma;
      if (koreanPos === 동사 || koreanPos === 형용사) {
        let lemma = koreanLemma;
        let lemmaIrregular = irregular ?? null;
        const preFeatures = preAux.length === 0 ? baseFeatures() : extractFeatures(preAux, options);
        if (preFeatures.causative) {
          lemma = `${conjugate(lemma, lemmaIrregular, "게")} 하다`;
          lemmaIrregular = "여";
        }
        if (preFeatures.passive) {
          const resolved = resolvePassiveLemma(lemma, lemmaIrregular, passiveOptions(options));
          lemma = resolved[0];
          lemmaIrregular = resolved[1];
        }
        aeForm = conjugate(lemma, lemmaIrregular, "아/어");
      }
      return `${aeForm} ${renderKoreanPredicateConnective("버리다", null, 동사, koreanPredicateAuxChain(postAux), connective, { lookups: options.lookups })}`;
    }
    const teruIndex = findTeruIndex(auxTokens);
    if (teruIndex !== undefined && (koreanPos === 동사 || koreanPos === 형용사)) {
      const preAux = auxTokens.slice(0, teruIndex);
      const postAux = auxTokens.slice(teruIndex + 1);
      let lemma = koreanLemma;
      let lemmaIrregular = irregular;
      let passive = false;
      if (preAux.length > 0) {
        const preFeatures = extractFeatures(preAux, options);
        if (preFeatures.causative) {
          lemma = `${conjugate(lemma, lemmaIrregular, "게")} 하다`;
          lemmaIrregular = "여";
        }
        if (preFeatures.passive) {
          passive = true;
          const resolved = resolvePassiveLemma(lemma, lemmaIrregular, passiveOptions(options));
          lemma = resolved[0];
          lemmaIrregular = resolved[1];
        }
      }
      if (options.teIruContractToPast === true) {
        return resolveTeIruContractedPastConnective(lemma, lemmaIrregular, postAux, connective, options.lookups);
      }
      if (auxHasPos4(postAux, new Set([助動詞_ナイ, 助動詞_ヌ]))) {
        const remaining = postAux.filter((token) => (token.pos & POS4) !== 助動詞_ナイ && (token.pos & POS4) !== 助動詞_ヌ);
        if (options.teIruResultative === true || (passive && options.passiveClass === "resultative_state")) {
          return `${conjugate(lemma, lemmaIrregular, "아/어")} ${renderKoreanPredicateConnective("있지 않다", null, 형용사, koreanPredicateAuxChain(remaining), connective, { lookups: options.lookups })}`;
        }
        if (teIruNegativePrefersInability(options.jpDictForm, options.lookups)) {
          return `${conjugate(lemma, lemmaIrregular, "지")} ${renderKoreanPredicateConnective("못하다", "여", 동사, koreanPredicateAuxChain(remaining), connective, { lookups: options.lookups })}`;
        }
        if (teIruNegativePrefersLongNegation(options.jpDictForm, options.lookups)) {
          return `${conjugate(lemma, lemmaIrregular, "지")} ${applyEndingToPastStem(conjugate("않다", null, "았/었"), connective)}`;
        }
        const [prefix, negLemma, negIrregular] = shortNegationPrefix(lemma, lemmaIrregular, options.lookups);
        return prefix + applyEndingToPastStem(conjugate(negLemma, negIrregular, "았/었"), connective);
      }
      if (options.teIruResultative === true || (passive && options.passiveClass === "resultative_state")) {
        return `${conjugate(lemma, lemmaIrregular, "아/어")} ${renderKoreanPredicateConnective("있다", null, 동사, koreanPredicateAuxChain(postAux), connective, { lookups: options.lookups })}`;
      }
      return `${conjugate(lemma, lemmaIrregular, "고")} ${renderKoreanPredicateConnective("있다", null, 동사, koreanPredicateAuxChain(postAux), connective, { lookups: options.lookups })}`;
    }
  }
  if (options.teIruContractToPast === true && (koreanPos === 동사 || koreanPos === 형용사)) {
    return resolveTeIruContractedPastConnective(koreanLemma, irregular, auxTokens, connective, options.lookups);
  }

  if (koreanPos !== 동사 && koreanPos !== 형용사) {
    if (koreanPos === 명사 || koreanPos === 대명사 || koreanPos === 부사) {
      if (auxTokens.length > 0) {
        const features = extractFeatures(auxTokens, { lookups: options.lookups });
        if (features.conjecture) {
          return `${koreanLemma}일 ${nounCopulaConnective("거", connective)}`;
        }
        if (features.copula || features.adverbialNi) {
          return nounCopulaConnective(koreanLemma, connective, features.past);
        }
      } else if (connective === "는지" || connective === "ㄴ/은지") {
        return nounCopulaConnective(koreanLemma, connective, false);
      }
    }
    return koreanLemma;
  }
  if (koreanPos === 형용사 && connective === "는지") {
    connective = "ㄴ/은지";
  } else if (koreanPos === 형용사 && connective === "는데") {
    connective = "ㄴ/은데";
  }
  const features = extractFeatures(auxTokens, options);
  if (auxTokens.length === 0) {
    const verbQuotative = verbPlainQuotativeEnding(connective);
    if (koreanPos === 동사 && verbQuotative !== null) {
      if (koreanLemma.endsWith(" 수 있다")) {
        return `${koreanLemma}${connective.slice(1)}`;
      }
      if (options.lookups.FORMAL_PLAIN_ADJECTIVE_LIKE_KOREAN_LEMMAS.has(koreanLemma)) {
        return conjugate(koreanLemma, irregular, connective);
      }
      return conjugate(koreanLemma, irregular, verbQuotative);
    }
    return conjugate(koreanLemma, irregular, connective);
  }
  if (features.passive) {
    const [passiveLemma, passiveIrregular] = resolvePassiveLemma(koreanLemma, irregular, passiveOptions(options));
    return renderKoreanPredicateConnective(
      passiveLemma,
      passiveIrregular,
      동사,
      koreanPredicateAuxChain(passiveFilteredAuxTokens(auxTokens, features, options.lookups)),
      connective,
      {
        ...options,
        forcePassive: false
      }
    );
  }
  if (features.negativeVolition) {
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, options.lookups);
    return `${prefix}${conjugate(negLemma, negIrregular, "ㄹ/을")} ${nounCopulaConnective("거", connective)}`;
  }
  if (features.conjecture) {
    let future: string;
    if (features.negative) {
      if (features.preferLongNegation) {
        const ji = conjugate(koreanLemma, irregular, "지");
        future = features.past
          ? `${ji} ${conjugate(`${conjugate("않다", null, "았/었")}다`, null, "ㄹ/을")}`
          : `${ji} ${conjugate("않다", null, "ㄹ/을")}`;
      } else {
        const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, options.lookups);
        future = features.past
          ? prefix + conjugate(`${conjugate(negLemma, negIrregular, "았/었")}다`, null, "ㄹ/을")
          : prefix + conjugate(negLemma, negIrregular, "ㄹ/을");
      }
    } else if (features.past) {
      future = conjugate(`${conjugate(koreanLemma, irregular, "았/었")}다`, null, "ㄹ/을");
    } else {
      future = conjugate(koreanLemma, irregular, "ㄹ/을");
    }
    return `${future} ${nounCopulaConnective("거", connective)}`;
  }
  if (features.obligation) {
    let effectiveConnective = connective;
    if (!features.past && (connective === "는지" || connective === "ㄴ/은지")) {
      effectiveConnective = "ㄹ/을지";
    }
    if (features.past && (connective === "는지" || connective === "ㄴ/은지")) {
      return `${conjugate(koreanLemma, irregular, "ㄴ/는")} 게 ${applyEndingToPastStem(conjugate("맞다", null, "았/었"), "는지")}`;
    }
    const filtered = auxTokens.filter((token) =>
      (token.pos & POS4) !== 文語助動詞_ベシ &&
      !((token.pos & POS4) === 助動詞_ナイ && (token.surface === "なきゃ" || token.surface === "なけりゃ"))
    );
    return renderKoreanPredicateConnective(`${conjugate(koreanLemma, irregular, "아/어야")} 하다`, "여", 동사, koreanPredicateAuxChain(filtered), effectiveConnective, { lookups: options.lookups });
  }
  if (features.causativePassive) {
    const filtered = auxTokens
      .filter((token) => !["せる", "させる", "られる", "れる"].includes(token.dictionaryForm ?? token.dictionary_form ?? ""))
      .map((token) => (token.pos & POS4) === 助動詞_ナイ || (token.pos & POS4) === 助動詞_ヌ
        ? { ...token, preferLongNegation: true, prefer_long_negation: true }
        : token);
    return renderKoreanPredicateConnective(`${conjugate(koreanLemma, irregular, "게")} 되다`, null, 동사, koreanPredicateAuxChain(filtered), connective, { lookups: options.lookups });
  }
  if (features.causative) {
    const filtered = auxTokens.filter((token) => !["せる", "させる"].includes(token.dictionaryForm ?? token.dictionary_form ?? ""));
    return renderKoreanPredicateConnective(`${conjugate(koreanLemma, irregular, "게")} 하다`, "여", 동사, koreanPredicateAuxChain(filtered), connective, { lookups: options.lookups });
  }
  if (features.potential) {
    const prefix = `${conjugate(koreanLemma, irregular, "ㄹ/을")} 수`;
    const pot = features.negative ? "없다" : "있다";
    const filtered = auxTokens.filter((token) => { const p4 = token.pos & POS4; return p4 !== 助動詞_レル && p4 !== 助動詞_ナイ && p4 !== 助動詞_ヌ; });
    return `${prefix} ${renderKoreanPredicateConnective(pot, null, 동사, koreanPredicateAuxChain(filtered), connective, { lookups: options.lookups })}`;
  }
  if (features.desire) {
    const goForm = conjugate(koreanLemma, irregular, "고");
    const desireLemma = features.negative ? `${goForm} 싶지 않다` : `${goForm} 싶다`;
    if (features.past) {
      const pastStem = conjugate(desireLemma, null, "았/었");
      return applyEndingToPastStem(pastStem, connective);
    }
    return conjugate(desireLemma, null, connective);
  }
  if (features.negative && koreanLemma.endsWith(" 수 있다")) {
    const prefix = koreanLemma.slice(0, -"있다".length);
    if (features.past) {
      const pastStem = conjugate("없다", null, "았/었");
      return prefix + applyEndingToPastStem(pastStem, connective);
    }
    return prefix + conjugate("없다", null, connective);
  }
  if (features.negative) {
    if (features.preferLongNegation) {
      const ji = conjugate(koreanLemma, irregular, "지");
      if (features.past) {
        const pastStem = conjugate("않다", null, "았/었");
        return `${ji} ${applyEndingToPastStem(pastStem, connective)}`;
      }
      const verbQuotative = verbPlainQuotativeEnding(connective);
      if (koreanPos === 동사 && verbQuotative !== null) {
        return `${ji} ${conjugate("않다", null, verbQuotative)}`;
      }
      return `${ji} ${conjugate("않다", null, connective)}`;
    }
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, options.lookups);
    if (features.past) {
      const pastStem = conjugate(negLemma, negIrregular, "았/었");
      return prefix + applyEndingToPastStem(pastStem, connective);
    }
    const verbQuotative = verbPlainQuotativeEnding(connective);
    if (koreanPos === 동사 && verbQuotative !== null) {
      return prefix + conjugate(negLemma, negIrregular, verbQuotative);
    }
    return prefix + conjugate(negLemma, negIrregular, connective);
  }
  if (features.past) {
    const pastStem = conjugate(koreanLemma, irregular, "았/었");
    return applyEndingToPastStem(pastStem, connective);
  }
  const verbQuotative = verbPlainQuotativeEnding(connective);
  if (koreanPos === 동사 && verbQuotative !== null) {
    if (koreanLemma.endsWith(" 수 있다")) {
      return `${koreanLemma}${connective.slice(1)}`;
    }
    return conjugate(koreanLemma, irregular, verbQuotative);
  }
  return conjugate(koreanLemma, irregular, connective);
}

export function resolveAdversativePassiveChain(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  auxChain: KoreanPredicateAuxChain,
  options: {
    lookups: LookupTables;
    formal?: boolean;
    sfp?: string;
    sahenCompound?: boolean;
    sahenNoun?: string;
    passiveClass?: PassiveClass;
    agentPromoted?: boolean;
    adversativePassiveBaseLemma?: string;
    adversativePassiveBaseIrregular?: IrregularType | null;
  }
): ConjugationResult {
  const auxTokens = auxTokensOf(auxChain);
  if (koreanPos !== 동사 && koreanPos !== 형용사) {
    return renderKoreanPredicateTerminal(koreanLemma, irregular, koreanPos, auxChain, auxChainOptions({ ...options, forcePassive: true }));
  }
  const features = extractFeatures(auxTokens, { lookups: options.lookups, forcePassive: true });
  const [baseLemma, baseIrregular] = options.adversativePassiveBaseLemma !== undefined
    ? [options.adversativePassiveBaseLemma, options.adversativePassiveBaseIrregular ?? null] as const
    : options.agentPromoted === true
      ? [koreanLemma, irregular ?? null] as const
      : resolvePassiveLemma(koreanLemma, irregular, passiveOptions(options));
  const advLemma = features.negative
    ? `${conjugate(baseLemma, baseIrregular, "지")} 않다`
    : `${conjugate(baseLemma, baseIrregular, "아/어")} 버리다`;
  return applyFeatures(advLemma, null, 동사, baseFeatures({
    polite: features.polite,
    past: features.past,
    conditionalTara: features.conditionalTara,
    conditionalNara: features.conditionalNara
  }), potentialOptions(options), options.lookups);
}

export function resolveAdversativePassiveChainConnective(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  auxChain: KoreanPredicateAuxChain,
  ending: string,
  options: {
    sahenCompound?: boolean;
    sahenNoun?: string;
    passiveClass?: PassiveClass;
    agentPromoted?: boolean;
    adversativePassiveBaseLemma?: string;
    adversativePassiveBaseIrregular?: IrregularType | null;
  } = {},
  lookups: LookupTables
): string {
  const auxTokens = auxTokensOf(auxChain);
  if (koreanPos !== 동사 && koreanPos !== 형용사) {
    return renderKoreanPredicateConnective(koreanLemma, irregular, koreanPos, auxChain, ending, { lookups: lookups, forcePassive: true });
  }
  const features = extractFeatures(auxTokens, { lookups: lookups, forcePassive: true });
  const [baseLemma, baseIrregular] = options.adversativePassiveBaseLemma !== undefined
    ? [options.adversativePassiveBaseLemma, options.adversativePassiveBaseIrregular ?? null] as const
    : options.agentPromoted === true
      ? [koreanLemma, irregular ?? null] as const
      : resolvePassiveLemma(koreanLemma, irregular, passiveOptions({ ...options, lookups }));
  const advLemma = features.negative
    ? `${conjugate(baseLemma, baseIrregular, "지")} 않다`
    : `${conjugate(baseLemma, baseIrregular, "아/어")} 버리다`;
  const filtered = auxTokens.filter((token) => { const p4 = token.pos & POS4; return p4 !== 助動詞_レル && p4 !== 助動詞_ナイ && p4 !== 助動詞_ヌ; });
  return renderKoreanPredicateConnective(advLemma, null, 동사, koreanPredicateAuxChain(filtered), ending, { lookups: lookups });
}

export function resolvePotentialChain(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  auxChain: KoreanPredicateAuxChain,
  options: {
    formal?: boolean;
    sfp?: string;
    particleKind?: string;
    focusParticle?: string | null;
    preStem?: string;
  } = {},
  lookups: LookupTables
): ConjugationResult {
  const auxTokens = auxTokensOf(auxChain);
  const features = extractFeatures(auxTokens, { lookups: lookups });
  const prefix = potentialPrefix(koreanLemma, irregular, options);
  const pot = features.negative ? "없다" : "있다";
  const tailFeatures = baseFeatures({ ...features, negative: false, potential: false });
  const tail = applyFeatures(pot, null, 동사, tailFeatures, potentialOptionsWithSfpAlias({ ...options, lookups }), lookups);
  return new ConjugationResult(prefix + tail.text, tail.polite);
}

export function resolvePotentialChainConnective(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  auxChain: KoreanPredicateAuxChain,
  connective: string,
  options: {
    particleKind?: string;
    focusParticle?: string | null;
    preStem?: string;
  } = {},
  lookups: LookupTables
): string {
  const auxTokens = auxTokensOf(auxChain);
  const features = extractFeatures(auxTokens, { lookups: lookups });
  const lemma = features.negative ? "없다" : "있다";
  const filtered = auxTokens.filter((token) => { const p4 = token.pos & POS4; return p4 !== 助動詞_ナイ && p4 !== 助動詞_ヌ && p4 !== 助動詞_レル; });
  return `${potentialPrefix(koreanLemma, irregular, options)}${renderKoreanPredicateConnective(lemma, null, 형용사, koreanPredicateAuxChain(filtered), connective, { lookups: lookups })}`;
}

export function resolvePassiveLemma(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  options: {
    lookups: LookupTables;
    sahenCompound?: boolean;
    sahenNoun?: string;
    passiveClass?: PassiveClass;
  }
): readonly [lemma: string, irregular: IrregularType | null] {
  if (koreanLemma.endsWith("되다") || koreanLemma.endsWith("받다") || koreanLemma.endsWith("당하다")) {
    return [koreanLemma, irregular ?? null];
  }
  if (options.passiveClass === "causative_passive_neutral" && koreanLemma.endsWith("게 하다")) {
    return [`${koreanLemma.slice(0, -"하다".length)}되다`, null];
  }
  if (options.passiveClass === "possessor") {
    const possessorEntry = loadPassivePossessorDict().get(koreanLemma);
    if (possessorEntry !== undefined) {
      return [possessorEntry.passive, possessorEntry.irregular];
    }
  }
  const entry = loadPassiveDict().get(koreanLemma);
  if (entry !== undefined) {
    return [entry.passive, entry.irregular];
  }
  if (koreanLemma.endsWith("하다")) {
    if (koreanLemma === "하다" && options.sahenCompound !== true) {
      return ["당하다", null];
    }
    if (options.sahenNoun !== undefined && options.lookups.PASSIVE_BADDA_NOUNS.has(options.sahenNoun)) {
      return ["받다", null];
    }
    return [`${koreanLemma.slice(0, -"하다".length)}되다`, null];
  }
  return [`${conjugate(koreanLemma, irregular, "아/어")}지다`, null];
}

export function isPassiveTransitive(
  koreanLemma: string,
  options: {
    lookups: LookupTables;
    sahenCompound?: boolean;
    sahenNoun?: string;
  }
): boolean {
  const entry = loadPassiveDict().get(koreanLemma);
  if (entry !== undefined) {
    return entry.transitive;
  }
  if (koreanLemma.endsWith("하다")) {
    return options.sahenNoun !== undefined && options.lookups.PASSIVE_BADDA_NOUNS.has(options.sahenNoun);
  }
  return false;
}

function parseJsonlLines<T>(source: string | undefined, transform: (raw: unknown) => readonly [key: string, value: T]): Map<string, T> {
  const entries = new Map<string, T>();
  if (source === undefined) return entries;
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const [key, value] = transform(JSON.parse(trimmed));
    entries.set(key, value);
  }
  return entries;
}

function loadPassiveDict(): ReadonlyMap<string, PassiveDictEntry> {
  if (passiveDict !== null) {
    return passiveDict;
  }
  passiveDict = _passiveFileExists
    ? parseJsonlLines<PassiveDictEntry>(_passiveJsonl, (raw) => {
      const r = raw as { readonly lemma: string; readonly passive: string; readonly irregular?: IrregularType | null; readonly transitive?: boolean };
      return [r.lemma, { passive: r.passive, irregular: r.irregular ?? null, transitive: r.transitive ?? false }];
    })
    : new Map();
  return passiveDict;
}

function loadPassivePossessorDict(): ReadonlyMap<string, PassiveDictEntry> {
  if (passivePossessorDict !== null) {
    return passivePossessorDict;
  }
  passivePossessorDict = _passivePossessorFileExists
    ? parseJsonlLines<PassiveDictEntry>(_passivePossessorJsonl, (raw) => {
      const r = raw as { readonly lemma: string; readonly passive: string; readonly irregular?: IrregularType | null; readonly transitive?: boolean };
      return [r.lemma, { passive: r.passive, irregular: r.irregular ?? null, transitive: r.transitive ?? true }];
    })
    : new Map();
  return passivePossessorDict;
}

function loadAuxTable(): readonly AuxTableEntry[] {
  if (auxTable !== null) {
    return auxTable;
  }
  if (_auxiliariesToml === undefined) {
    throw new Error("aux-map not initialized: call initAuxMap() first");
  }
  const raw = parse(_auxiliariesToml) as AuxTableRoot;
  auxTable = raw.aux ?? [];
  return auxTable;
}

function loadRegisterEndings(): { readonly [key: string]: RegisterEndingSpec | undefined } {
  if (registerEndings !== null) {
    return registerEndings;
  }
  if (_registerEndingsToml === undefined) {
    throw new Error("aux-map not initialized: call initAuxMap() first");
  }
  const raw = parse(_registerEndingsToml) as RegisterEndingsRoot;
  registerEndings = raw.register ?? {};
  return registerEndings;
}

function registerEndingSpec(key: RegisterKey): RegisterEndingSpec {
  const spec = loadRegisterEndings()[key];
  if (spec === undefined) {
    throw new Error(`missing register ending spec: ${key}`);
  }
  return spec;
}

function loadSfpCatalog(): { readonly [key: string]: SfpEntry | undefined } {
  if (sfpCatalog !== null) {
    return sfpCatalog;
  }
  if (_sfpEndingsToml === undefined) {
    throw new Error("aux-map not initialized: call initAuxMap() first");
  }
  const raw = parse(_sfpEndingsToml) as SfpCatalogRoot;
  sfpCatalog = raw.sfp ?? {};
  return sfpCatalog;
}

function passiveFilteredAuxTokens(auxTokens: readonly AuxToken[], features: AuxFeatures,
  _lookups: LookupTables
): readonly AuxToken[] {
  const filtered = auxTokens.filter((token) => (token.pos & POS4) !== 助動詞_レル);
  if (!features.negative) {
    return filtered;
  }
  return filtered.map((token) => {
    if ((token.pos & POS4) === 助動詞_ナイ || (token.pos & POS4) === 助動詞_ヌ) {
      return { ...token, preferLongNegation: true, prefer_long_negation: true };
    }
    return token;
  });
}

export function isKoreanPotentialLemma(koreanLemma: string): boolean {
  return koreanLemma.endsWith(" 수 있다");
}

export function potentialPhrasePrefix(koreanLemma: string): string {
  return koreanLemma.slice(0, -"있다".length);
}

function stripFinalRieulSyllable(text: string): string | undefined {
  if (text.length === 0) {
    return undefined;
  }
  const info = decompose(text.at(-1) ?? "");
  if (info === undefined || info[2] !== JONG_RIEUL) {
    return undefined;
  }
  return text.slice(0, -1) + compose(info[0], info[1], JONG_NONE);
}

function recoverBaseLemmaFromPotentialPhrase(koreanLemma: string): readonly [lemma: string, irregular: IrregularType | null] | undefined {
  if (!koreanLemma.endsWith(" 수 있다")) {
    return undefined;
  }
  const prefix = koreanLemma.slice(0, -" 수 있다".length);
  if (prefix.endsWith("할")) {
    return [`${prefix.slice(0, -1)}하다`, "여"];
  }
  if (prefix.endsWith("을")) {
    return [`${prefix.slice(0, -1)}다`, null];
  }
  const stripped = stripFinalRieulSyllable(prefix);
  if (stripped !== undefined) {
    return [`${stripped}다`, null];
  }
  return undefined;
}

function potentialPrefix(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  options: {
    particleKind?: string;
    focusParticle?: string | null;
    preStem?: string;
  }
): string {
  const infix = potentialParticleInfix(options.particleKind ?? "ga", options.focusParticle ?? null);
  if (options.preStem !== undefined) {
    return `${options.preStem} 수${infix}`;
  }
  if (isKoreanPotentialLemma(koreanLemma)) {
    return potentialPhrasePrefix(koreanLemma).trimEnd() + infix;
  }
  return `${conjugate(koreanLemma, irregular, "ㄹ/을")} 수${infix}`;
}

const POTENTIAL_TOPIC_INFIX = new Map<string, string>([
  ["ga", " "],
  ["mo", "도 "],
  ["wa", "는 "]
]);

const POTENTIAL_FOCUS_INFIX = new Map<string, string>([
  ["だけ\0wa", "만은 "],
  ["のみ\0wa", "만은 "],
  ["ばかり\0wa", "만은 "],
  ["さえ\0wa", "조차 "],
  ["すら\0wa", "조차 "],
  ["しか\0wa", "밖에 "],
  ["だけ\0mo", "만도 "],
  ["のみ\0mo", "만도 "],
  ["ばかり\0mo", "만도 "],
  ["さえ\0mo", "조차 "],
  ["すら\0mo", "조차 "],
  ["しか\0mo", "밖에 "],
  ["だけ\0", "만 "],
  ["のみ\0", "만 "],
  ["ばかり\0", "만 "],
  ["さえ\0", "조차 "],
  ["すら\0", "조차 "],
  ["しか\0", "밖에 "]
]);

export function potentialParticleInfix(particleKind: string, focusParticle: string | null): string {
  if (focusParticle === null) {
    return POTENTIAL_TOPIC_INFIX.get(particleKind) ?? " ";
  }
  const topic = particleKind === "wa" || particleKind === "mo" ? particleKind : "";
  return POTENTIAL_FOCUS_INFIX.get(`${focusParticle}\0${topic}`) ?? POTENTIAL_TOPIC_INFIX.get(particleKind) ?? " ";
}


function conditionalNaraEnding(koreanLemma: string, koreanPos: number, past: boolean,
  lookups: LookupTables
): string {
  if (past) {
    return "았/었다면";
  }
  if (
    koreanPos === 형용사 ||
    lookups.FORMAL_PLAIN_ADJECTIVE_LIKE_KOREAN_LEMMAS.has(koreanLemma) ||
    koreanLemma.endsWith(" 수 있다") ||
    koreanLemma.endsWith(" 수 없다")
  ) {
    return "다면";
  }
  return "ㄴ/는다면";
}

function pickDefinedFields<T extends Record<string, unknown>>(source: T): { [K in keyof T as undefined extends T[K] ? (T[K] extends undefined ? never : K) : K]: Exclude<T[K], undefined> } {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as never;
}

function passiveOptions(options: { sahenCompound?: boolean; sahenNoun?: string; passiveClass?: PassiveClass; lookups: LookupTables }): { sahenCompound?: boolean; sahenNoun?: string; passiveClass?: PassiveClass; lookups: LookupTables } {
  return pickDefinedFields({ sahenCompound: options.sahenCompound, sahenNoun: options.sahenNoun, passiveClass: options.passiveClass, lookups: options.lookups });
}

function potentialOptions(options: { formal?: boolean; sfp?: string; lookups: LookupTables }): { formal?: boolean; sfp?: string; lookups: LookupTables } {
  return pickDefinedFields({ formal: options.formal, sfp: options.sfp, lookups: options.lookups });
}

function potentialOptionsWithSfpAlias(options: { formal?: boolean; sfp?: string; lookups: LookupTables }): { formal?: boolean; sfp?: string; lookups: LookupTables } {
  return pickDefinedFields({ formal: options.formal, sfp: options.sfp === "na_prohib" ? "na_excl" as const : options.sfp, lookups: options.lookups });
}

function noAuxOptions(options: { formal?: boolean; sfp?: string; isImperative?: boolean; allomorphHost?: string; lookups: LookupTables }): { formal?: boolean; sfp?: string; isImperative?: boolean; allomorphHost?: string; lookups: LookupTables } {
  return pickDefinedFields({ formal: options.formal, sfp: options.sfp, isImperative: options.isImperative, allomorphHost: options.allomorphHost, lookups: options.lookups });
}

function noAuxRoleCatOptions(options: { isImperative?: boolean }): { formal: true; isImperative?: boolean } {
  return pickDefinedFields({ formal: true as const, isImperative: options.isImperative });
}

function auxChainOptions(options: { formal?: boolean; sfp?: string; forcePassive?: boolean; lookups: LookupTables }): { formal?: boolean; sfp?: string; forcePassive?: boolean; lookups: LookupTables } {
  return pickDefinedFields({ formal: options.formal, sfp: options.sfp, forcePassive: options.forcePassive, lookups: options.lookups });
}

function formalSfpOptions(formal: boolean, sfp: string | undefined): { formal: boolean; sfp?: string } {
  return pickDefinedFields({ formal, sfp });
}

function featureOptions(options: { formal?: boolean; sfp?: string; sahenCompound?: boolean; sahenNoun?: string; passiveClass?: PassiveClass; koreanPolite?: KoreanPoliteForms }): { formal?: boolean; sfp?: string; sahenCompound?: boolean; sahenNoun?: string; passiveClass?: PassiveClass; koreanPolite?: KoreanPoliteForms } {
  return pickDefinedFields({ formal: options.formal, sfp: options.sfp, sahenCompound: options.sahenCompound, sahenNoun: options.sahenNoun, passiveClass: options.passiveClass, koreanPolite: options.koreanPolite });
}

export function realizeInterjectionAbsorbedCopula(
  koreanLemma: string,
  polite: boolean,
  formal: boolean,
  koreanPolite: KoreanPoliteForms | undefined
): ConjugationResult {
  if (!polite || koreanPolite === undefined) {
    return new ConjugationResult(koreanLemma, polite);
  }
  return new ConjugationResult(formal ? koreanPolite.formal : koreanPolite.casual, true);
}

function baseFeatures(partial: Partial<AuxFeatures> = {}): AuxFeatures {
  return {
    polite: partial.polite ?? false,
    past: partial.past ?? false,
    negative: partial.negative ?? false,
    desire: partial.desire ?? false,
    volitional: partial.volitional ?? false,
    conjecture: partial.conjecture ?? false,
    copula: partial.copula ?? false,
    conditionalTara: partial.conditionalTara ?? false,
    conditionalNara: partial.conditionalNara ?? false,
    adverbialNi: partial.adverbialNi ?? false,
    potential: partial.potential ?? false,
    passive: partial.passive ?? false,
    causative: partial.causative ?? false,
    causativePassive: partial.causativePassive ?? false,
    progressive: partial.progressive ?? false,
    obligation: partial.obligation ?? false,
    negativeVolition: partial.negativeVolition ?? false,
    preferLongNegation: partial.preferLongNegation ?? false
  };
}

function noAux(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  options: { formal?: boolean; sfp?: string; isImperative?: boolean; allomorphHost?: string } = {},
  lookups: LookupTables
): ConjugationResult {
  const nyaCount = roleCatNyaCount(options.sfp);
  if (nyaCount > 0) {
    const base = koreanPos === 명사 || koreanPos === 대명사
      ? new ConjugationResult(koreanLemma === "냐" ? "냐" : nounCopula(koreanLemma, baseFeatures({ copula: true }), true, lookups, undefined, options.allomorphHost).text, false)
      : noAux(koreanLemma, irregular, koreanPos, noAuxRoleCatOptions(options), lookups);
    return appendRoleCatNyaCount(base, nyaCount);
  }
  if (options.isImperative === true && (koreanPos === 동사 || koreanPos === 형용사)) {
    return new ConjugationResult(conjugate(koreanLemma, irregular, "아/어라"), false);
  }
  if (options.sfp === "na_prohib" && (koreanPos === 동사 || koreanPos === 형용사)) {
    return renderNaProhibitive(koreanLemma, irregular, koreanPos, false, lookups);
  }
  if (koreanPos === 동사 || koreanPos === 형용사) {
    const sfp = generateSfpEnding(koreanLemma, irregular, false, options.sfp, options.formal === true, lookups, koreanPos);
    if (sfp !== undefined) {
      return sfp;
    }
    if (options.formal === true) {
      return new ConjugationResult(formalPlainEnding(koreanLemma, irregular, koreanPos, lookups), false);
    }
    return new ConjugationResult(conjugate(koreanLemma, irregular, "아/어"), false);
  }
  if (options.sfp !== undefined && (koreanPos === 명사 || koreanPos === 대명사)) {
    const sfp = nounSfpEnding(koreanLemma, false, false, options.sfp, options.formal === true, options.allomorphHost);
    if (sfp !== undefined) {
      return sfp;
    }
  }
  return new ConjugationResult(koreanLemma, false);
}

function applyFeatures(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  features: AuxFeatures,
  options: { formal?: boolean; sfp?: string; sahenCompound?: boolean; sahenNoun?: string; passiveClass?: PassiveClass; koreanPolite?: KoreanPoliteForms } = {},
  lookups: LookupTables
): ConjugationResult {
  const formal = options.formal === true;
  const sfp = options.sfp;
  const nyaCount = roleCatNyaCount(sfp);
  if (nyaCount > 0) {
    const base = (koreanPos === 명사 || koreanPos === 대명사) && roleCatNyaCanUseNounCopula(features)
      ? nounCopula(koreanLemma, baseFeatures({ polite: features.polite, past: features.past, copula: true }), true, lookups, undefined)
      : applyFeatures(koreanLemma, irregular, koreanPos, features, {
        formal: true,
        ...passiveOptions({ ...options, lookups })
      }, lookups);
    return appendRoleCatNyaCount(base, nyaCount);
  }

  if (features.negative && !features.passive) {
    const supp = loadSuppletiveNegDict().get(koreanLemma);
    if (supp !== undefined) {
      return applyFeatures(supp[0], supp[1], koreanPos, baseFeatures({
        polite: features.polite,
        past: features.past,
        desire: features.desire,
        volitional: features.volitional,
        conjecture: features.conjecture,
        copula: features.copula,
        conditionalTara: features.conditionalTara,
        conditionalNara: features.conditionalNara,
        adverbialNi: features.adverbialNi,
        progressive: features.progressive
      }), featureOptions(options), lookups);
    }
  }

  if (features.negativeVolition && (koreanPos === 동사 || koreanPos === 형용사)) {
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
    const future = prefix + conjugate(negLemma, negIrregular, "ㄹ/을");
    return applyFeatures(`${future} 거`, null, 명사, baseFeatures({ polite: features.polite, past: features.past }), formalSfpOptions(formal, sfp), lookups);
  }
  if (features.obligation && (koreanPos === 동사 || koreanPos === 형용사)) {
    const obligLemma = `${conjugate(koreanLemma, irregular, "아/어야")} 하다`;
    return applyFeatures(obligLemma, "여", 동사, baseFeatures({
      polite: features.polite,
      past: features.past,
      negative: features.negative,
      conditionalTara: features.conditionalTara,
      conditionalNara: features.conditionalNara
    }), formalSfpOptions(formal, sfp), lookups);
  }
  if (features.causativePassive && (koreanPos === 동사 || koreanPos === 형용사)) {
    if (options.passiveClass === "causative_coercive") {
      const cpLemma = `${conjugate(koreanLemma, irregular, "아/어야")}만 하다`;
      return applyVoiceTransform(features, cpLemma, "여", true, lookups, formalSfpOptions(formal, sfp));
    }
    const cpLemma = `${conjugate(koreanLemma, irregular, "게")} 되다`;
    return applyVoiceTransform(features, cpLemma, null, true, lookups, formalSfpOptions(formal, sfp));
  }
  if (features.potential && (koreanPos === 동사 || koreanPos === 형용사)) {
    const remainingFeatures = baseFeatures({
      polite: features.polite,
      past: features.past,
      conditionalTara: features.conditionalTara,
      conditionalNara: features.conditionalNara,
      volitional: features.volitional
    });
    const remainingSfpOptions = formalSfpOptions(formal, sfp === "na_prohib" ? "na_excl" : sfp);
    if (features.negative && koreanPos === 동사 && !isKoreanPotentialLemma(koreanLemma)
      && !lookups.POTENTIAL_NEGATIVE_PREFERS_SU_EOPDA.has(koreanLemma)) {
      const tail = applyFeatures("못하다", "여", 동사, remainingFeatures, remainingSfpOptions, lookups);
      return new ConjugationResult(`${conjugate(koreanLemma, irregular, "지")} ${tail.text}`, tail.polite);
    }
    const prefix = isKoreanPotentialLemma(koreanLemma)
      ? potentialPhrasePrefix(koreanLemma)
      : `${conjugate(koreanLemma, irregular, "ㄹ/을")} 수 `;
    const pot = features.negative ? "없다" : "있다";
    const tail = applyFeatures(pot, null, 동사, remainingFeatures, remainingSfpOptions, lookups);
    return new ConjugationResult(prefix + tail.text, tail.polite);
  }
  if (features.passive && (koreanPos === 동사 || koreanPos === 형용사)) {
    if (options.passiveClass === "causative_coercive") {
      const cpLemma = `${conjugate(koreanLemma, irregular, "아/어야")}만 하다`;
      return applyVoiceTransform(features, cpLemma, "여", true, lookups, formalSfpOptions(formal, sfp));
    }
    const [passiveLemma, passiveIrregular] = resolvePassiveLemma(koreanLemma, irregular, passiveOptions({ ...options, lookups }));
    return applyVoiceTransform(features, passiveLemma, passiveIrregular, true, lookups, formalSfpOptions(formal, sfp));
  }
  if (features.causative && (koreanPos === 동사 || koreanPos === 형용사)) {
    const causativeLemma = `${conjugate(koreanLemma, irregular, "게")} 하다`;
    return applyVoiceTransform(features, causativeLemma, "여", false, lookups, formalSfpOptions(formal, sfp));
  }
  if (sfp === "na_prohib" && (koreanPos === 동사 || koreanPos === 형용사)) {
    return renderNaProhibitive(koreanLemma, irregular, koreanPos, features.negative, lookups);
  }
  if (features.conditionalTara) {
    if (koreanPos !== 동사 && koreanPos !== 형용사) {
      return new ConjugationResult(koreanLemma, false);
    }
    if (features.negative) {
      if (features.preferLongNegation) {
        return new ConjugationResult(`${conjugate(koreanLemma, irregular, "지")} 않으면`, false);
      }
      const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
      return new ConjugationResult(prefix + conjugate(negLemma, negIrregular, "면"), false);
    }
    return new ConjugationResult(conjugate(koreanLemma, irregular, "면"), false);
  }
  if (features.conditionalNara) {
    if (koreanPos === 명사 || koreanPos === 대명사) {
      return new ConjugationResult(koreanLemma + selectParticle(koreanLemma, "이라면/라면"), false);
    }
    if (koreanPos === 동사 || koreanPos === 형용사) {
      if (features.negative) {
        if (features.preferLongNegation) {
          return new ConjugationResult(`${conjugate(koreanLemma, irregular, "지")} 않다면`, false);
        }
        const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
        return new ConjugationResult(prefix + conjugate(negLemma, negIrregular, conditionalNaraEnding(negLemma, koreanPos, features.past, lookups)), false);
      }
      return new ConjugationResult(conjugate(koreanLemma, irregular, conditionalNaraEnding(koreanLemma, koreanPos, features.past, lookups)), false);
    }
    return new ConjugationResult(koreanLemma, false);
  }
  if (features.adverbialNi) {
    if (koreanPos === 동사 || koreanPos === 형용사) {
      return new ConjugationResult(conjugate(koreanLemma, irregular, "게"), false);
    }
    if (koreanPos === 명사) {
      return new ConjugationResult(koreanLemma + selectParticle(koreanLemma, "으로/로"), false);
    }
    return new ConjugationResult(koreanLemma, false);
  }
  if (features.conjecture) {
    const particle = features.polite ? "죠" : "지";
    if (koreanPos === 명사 || koreanPos === 대명사) {
      const core = features.past ? nounPastCopulaStem(koreanLemma) : koreanLemma + (hasBatchim(koreanLemma) ? "이" : "");
      return new ConjugationResult(`${core}겠${particle}`, features.polite);
    }
    if (koreanPos === 동사 || koreanPos === 형용사) {
      if (features.negative) {
        if (features.preferLongNegation) {
          const ji = conjugate(koreanLemma, irregular, "지");
          if (!features.past) {
            return new ConjugationResult(`${ji} 않겠${particle}`, features.polite);
          }
          return new ConjugationResult(`${ji} ${conjugate("않다", null, "았/었")}겠${particle}`, features.polite);
        }
        const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
        if (!features.past) {
          return new ConjugationResult(prefix + conjugate(negLemma, negIrregular, "겠") + particle, features.polite);
        }
        return new ConjugationResult(prefix + conjugate(negLemma, negIrregular, "았/었") + "겠" + particle, features.polite);
      }
      if (!features.past) {
        return new ConjugationResult(conjugate(koreanLemma, irregular, "겠") + particle, features.polite);
      }
      return new ConjugationResult(conjugate(koreanLemma, irregular, "았/었") + "겠" + particle, features.polite);
    }
    return new ConjugationResult(koreanLemma, features.polite);
  }
  if ((koreanPos === 명사 || koreanPos === 대명사) && features.copula) {
    return nounCopula(koreanLemma, features, formal, lookups, sfp);
  }
  if (koreanPos === 감탄사) {
    return realizeInterjectionAbsorbedCopula(koreanLemma, features.polite, formal, options.koreanPolite);
  }
  if (koreanPos !== 동사 && koreanPos !== 형용사) {
    return new ConjugationResult(koreanLemma, features.polite);
  }
  if (features.desire) {
    const sipda = `${conjugate(koreanLemma, irregular, "고")} 싶다`;
    if (features.past) {
      return finalizePast(conjugate(sipda, null, "았/었"), features.polite, formal, lookups, sfp);
    }
    const generated = generateSfpEnding(sipda, null, features.polite, sfp, formal, lookups, 형용사);
    if (generated !== undefined) {
      return generated;
    }
    if (features.polite) {
      return new ConjugationResult(formal ? conjugate(sipda, null, "ㅂ니다/습니다") : conjugate(sipda, null, "아/어") + "요", true);
    }
    return new ConjugationResult(formal ? sipda : conjugate(sipda, null, "아/어"), false);
  }
  if (features.volitional) {
    if (formal) {
      return new ConjugationResult(conjugate(koreanLemma, irregular, "(으)ㅂ시다"), true);
    }
    return new ConjugationResult(`${conjugate(koreanLemma, irregular, "ㄹ/을")}까요`, true);
  }
  if (features.negative && koreanLemma.endsWith(" 수 있다")) {
    const tail = applyFeatures("없다", null, 형용사, baseFeatures({ polite: features.polite, past: features.past }), formalSfpOptions(formal, sfp), lookups);
    return new ConjugationResult(koreanLemma.slice(0, -"있다".length) + tail.text, tail.polite);
  }
  if (features.negative) {
    if (features.preferLongNegation) {
      const tailPos = koreanPos === 동사 ? 동사 : 형용사;
      const tail = applyFeatures("않다", null, tailPos, baseFeatures({ polite: features.polite, past: features.past }), formalSfpOptions(formal, sfp), lookups);
      return new ConjugationResult(`${conjugate(koreanLemma, irregular, "지")} ${tail.text}`, tail.polite);
    }
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
    const result = applyFeatures(negLemma, negIrregular, koreanPos, baseFeatures({ polite: features.polite, past: features.past }), formalSfpOptions(formal, sfp), lookups);
    return new ConjugationResult(prefix + result.text, result.polite);
  }
  if (features.past) {
    return finalizePast(conjugate(koreanLemma, irregular, "았/었"), features.polite, formal, lookups, sfp);
  }
  const generated = generateSfpEnding(koreanLemma, irregular, features.polite, sfp, formal, lookups, koreanPos);
  if (generated !== undefined) {
    return generated;
  }
  const spec = registerEndingSpec(registerKey(features.polite, formal));
  const ending = spec.nonpast_ending;
  if (ending === undefined) {
    return new ConjugationResult(formalPlainEnding(koreanLemma, irregular, koreanPos, lookups), false);
  }
  if (features.polite && !formal && irregular === "아니") {
    return new ConjugationResult("아니에요", true);
  }
  return new ConjugationResult(conjugate(koreanLemma, irregular, ending) + (spec.nonpast_post ?? ""), features.polite);
}

function applyVoiceTransform(
  features: AuxFeatures,
  lemma: string,
  irregular: IrregularType | null,
  markLongNegation: boolean,
  lookups: LookupTables,
  options: { formal: boolean; sfp?: string }
): ConjugationResult {
  return applyFeatures(lemma, irregular, 동사, baseFeatures({
    polite: features.polite,
    past: features.past,
    negative: features.negative,
    desire: features.desire,
    volitional: features.volitional,
    conditionalTara: features.conditionalTara,
    conditionalNara: features.conditionalNara,
    preferLongNegation: markLongNegation ? features.negative : false
  }), options, lookups);
}

export function finalize(
  stem: string,
  stemIrregular: IrregularType | null | undefined,
  polite: boolean,
  past: boolean,
  lookups: LookupTables,
  options: { formal?: boolean; sfp?: string } = {}
): ConjugationResult {
  const formal = options.formal === true;
  const sfp = options.sfp;
  const nyaCount = roleCatNyaCount(sfp);
  if (nyaCount > 0) {
    return appendRoleCatNyaCount(finalize(stem, stemIrregular, polite, past, lookups, { formal: true }), nyaCount);
  }
  const lemma = `${stem}다`;
  if (past) {
    return finalizePast(conjugate(lemma, stemIrregular, "았/었"), polite, formal, lookups, sfp);
  }
  const generated = generateSfpEnding(lemma, stemIrregular, polite, sfp, formal, lookups, 동사);
  if (generated !== undefined) {
    return generated;
  }
  const spec = registerEndingSpec(registerKey(polite, formal));
  const ending = spec.nonpast_ending;
  if (ending === undefined) {
    return new ConjugationResult(lemma, false);
  }
  if (polite && !formal && stemIrregular === "아니") {
    return new ConjugationResult(`${stem}에요`, true);
  }
  return new ConjugationResult(conjugate(lemma, stemIrregular, ending) + (spec.nonpast_post ?? ""), polite);
}

export function finalizePast(pastStem: string, polite: boolean, formal: boolean, lookups: LookupTables,
  sfp?: string): ConjugationResult {
  const nyaCount = roleCatNyaCount(sfp);
  if (nyaCount > 0) {
    return appendRoleCatNyaCount(finalizePast(pastStem, polite, true, lookups, undefined), nyaCount);
  }
  if (sfp !== undefined) {
    const generated = generateSfpEnding(`${pastStem}다`, null, polite, sfp, formal, lookups, 동사);
    if (generated !== undefined) {
      return generated;
    }
  }
  const suffix = registerEndingSpec(registerKey(polite, formal)).past_suffix;
  return new ConjugationResult(pastStem + suffix, polite);
}

function formalPlainEnding(koreanLemma: string, irregular: IrregularType | null | undefined, koreanPos: number,
  lookups: LookupTables
): string {
  if (koreanLemma.endsWith(" 수 있다")) {
    return koreanLemma;
  }
  if (usesVerbLikeFormalPlainEnding(
    koreanLemma,
    koreanPos === 동사,
    lookups.FORMAL_PLAIN_ADJECTIVE_LIKE_KOREAN_LEMMAS,
    lookups.FORMAL_PLAIN_VERB_LIKE_KOREAN_LEMMAS
  )) {
    return conjugate(koreanLemma, irregular, "ㄴ다/는다");
  }
  return koreanLemma;
}

export function roleCatNyaCount(sfp: string | undefined): number {
  if (sfp === undefined) {
    return 0;
  }
  if (sfp === "role_cat_nya") {
    return 1;
  }
  const prefix = "role_cat_nya:";
  if (sfp.startsWith(prefix)) {
    const parsed = Number.parseInt(sfp.slice(prefix.length), 10);
    return Number.isFinite(parsed) ? Math.max(1, parsed) : 0;
  }
  return 0;
}

export function roleCatNyaSuffix(count: number): string {
  if (count <= 0) {
    return "";
  }
  return `${"냐".repeat(Math.max(0, count - 1))}냥`;
}

function appendRoleCatNyaCount(result: ConjugationResult, count: number): ConjugationResult {
  return new ConjugationResult(result.text + roleCatNyaSuffix(count), result.polite);
}

function roleCatNyaCanUseNounCopula(features: AuxFeatures): boolean {
  return !(
    features.negative ||
    features.desire ||
    features.volitional ||
    features.conjecture ||
    features.conditionalTara ||
    features.conditionalNara ||
    features.adverbialNi ||
    features.potential ||
    features.passive ||
    features.causative ||
    features.causativePassive ||
    features.progressive ||
    features.obligation ||
    features.negativeVolition
  );
}

const _longNegationLemmas = new WeakMap<LookupTables, ReadonlySet<string>>();
function getLongNegationLemmas(lookups: LookupTables): ReadonlySet<string> {
  let cached = _longNegationLemmas.get(lookups);
  if (cached === undefined) {
    cached = new Set<string>(["있다", "없다", "계시다", "해내다", ...lookups.LONG_NEGATION_PREFERRED_KOREAN_LEMMAS]);
    _longNegationLemmas.set(lookups, cached);
  }
  return cached;
}

function teIruNegativePrefersInability(jpDictForm: string | null | undefined,
  lookups: LookupTables
): boolean {
  return jpDictForm !== null && jpDictForm !== undefined && lookups.TE_IRU_NEGATIVE_INABILITY_VERBS.has(jpDictForm);
}

function teIruNegativePrefersLongNegation(jpDictForm: string | null | undefined,
  lookups: LookupTables
): boolean {
  return jpDictForm !== null && jpDictForm !== undefined && lookups.TE_IRU_NEGATIVE_LONG_NEGATION_VERBS.has(jpDictForm);
}

export function loadSuppletiveNegDict(): ReadonlyMap<string, readonly [lemma: string, irregular: IrregularType | null]> {
  if (suppletiveNegDict !== null) {
    return suppletiveNegDict;
  }
  suppletiveNegDict = _suppletiveNegFileExists
    ? parseJsonlLines<readonly [lemma: string, irregular: IrregularType | null]>(_suppletiveNegJsonl, (raw) => {
      const r = raw as { readonly lemma: string; readonly negative: string; readonly irregular?: IrregularType | null };
      return [r.lemma, [r.negative, r.irregular ?? null]];
    })
    : new Map();
  return suppletiveNegDict;
}

export function shortNegationPrefix(koreanLemma: string, irregular: IrregularType | null | undefined,
  lookups: LookupTables,
  options: { readonly sahenSplit?: boolean } = {}
): readonly [prefix: string, lemma: string, irregular: IrregularType | null] {
  const supp = loadSuppletiveNegDict().get(koreanLemma);
  if (supp !== undefined) {
    return ["", supp[0], supp[1]];
  }
  if (isKoreanPotentialLemma(koreanLemma)) {
    return ["", `${potentialPhrasePrefix(koreanLemma)}없다`, null];
  }
  if (getLongNegationLemmas(lookups).has(koreanLemma) || koreanLemma.endsWith("어하다") || koreanLemma.endsWith("아하다") || koreanLemma.endsWith(" 척하다")) {
    return ["", `${conjugate(koreanLemma, irregular, "지")} 않다`, null];
  }
  if (options.sahenSplit !== false && irregular === "여" && koreanLemma.endsWith("하다") && koreanLemma.length > 3 && !koreanLemma.includes(" ")) {
    return [`${koreanLemma.slice(0, -"하다".length)} 안 `, "하다", "여"];
  }
  return ["안 ", koreanLemma, irregular ?? null];
}

function renderNaProhibitive(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  negative: boolean,
  lookups: LookupTables
): ConjugationResult {
  const recovered = recoverBaseLemmaFromPotentialPhrase(koreanLemma);
  if (recovered !== undefined) {
    const [baseLemma, baseIrregular] = recovered;
    return new ConjugationResult(conjugate(baseLemma, baseIrregular, "지 마"), false);
  }
  if (koreanPos === 동사 && koreanLemma.endsWith("되다")) {
    return new ConjugationResult(conjugate(`${koreanLemma.slice(0, -"되다".length)}하다`, "여", "지 마"), false);
  }
  if (negative) {
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
    return new ConjugationResult(prefix + conjugate(negLemma, negIrregular, "지 마"), false);
  }
  return new ConjugationResult(conjugate(koreanLemma, irregular, "지 마"), false);
}

function registerKey(polite: boolean, formal: boolean): RegisterKey {
  if (formal) {
    return polite ? "formal_polite" : "formal_plain";
  }
  return polite ? "casual_polite" : "casual_plain";
}

function generateSfpEnding(
  lemma: string,
  irregular: IrregularType | null | undefined,
  polite: boolean,
  sfp: string | undefined,
  formal: boolean,
  lookups: LookupTables,
  koreanPos?: number
): ConjugationResult | undefined {
  const entry = sfp !== undefined ? loadSfpCatalog()[sfp] : undefined;
  if (entry !== undefined && entry.handled_by === "table") {
    const verbSpec = entry.verb?.[registerKey(polite, formal)];
    if (verbSpec === undefined) {
      return undefined;
    }
    return new ConjugationResult(
      conjugate(lemma, irregular, verbSpec.ending_key) + (verbSpec.post_suffix ?? ""),
      verbSpec.polite
    );
  }
  if (sfp === "polite_q" && polite) {
    return new ConjugationResult(formal ? conjugate(lemma, irregular, "ㅂ니까/습니까") : conjugate(lemma, irregular, "아/어") + "요", true);
  }
  if (sfp === "plain_q") {
    if (polite) {
      return new ConjugationResult(formal ? conjugate(lemma, irregular, "ㅂ니까/습니까") : conjugate(lemma, irregular, "아/어") + "요", true);
    }
    if (formal) {
      const ending = koreanPos === 형용사 ? "(으)ㄴ가" : "는가";
      return new ConjugationResult(conjugate(lemma, irregular, ending), false);
    }
    return undefined;
  }
  if (sfp === "neg_confirm_q") {
    const ji = conjugate(lemma, irregular, "지");
    if (formal) {
      return new ConjugationResult(`${ji} ${polite ? "않았습니까" : "않았는가"}`, polite);
    }
    return new ConjugationResult(`${ji} ${polite ? "않았어요" : "않았어"}`, polite);
  }
  if (sfp === "neg_invite_q") {
    const ji = conjugate(lemma, irregular, "지");
    if (formal) {
      return new ConjugationResult(`${ji} ${polite ? "않겠습니까" : "않겠는가"}`, polite);
    }
    return new ConjugationResult(`${ji} ${polite ? "않을래요" : "않을래"}`, polite);
  }
  if (sfp === "neg_plain_q") {
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(lemma, irregular, lookups);
    return new ConjugationResult(prefix + conjugate(negLemma, negIrregular, formal ? (polite ? "ㅂ니까/습니까" : "는가") : "니"), formal ? polite : false);
  }
  return undefined;
}

export function yoneConfirmSuffix(polite: boolean, formal: boolean): string {
  if (!polite) {
    return "지";
  }
  return formal ? "지요" : "죠";
}

function nounSfpEnding(noun: string, polite: boolean, past: boolean, sfp: string, formal: boolean, allomorphHost?: string): ConjugationResult | undefined {
  const nyaCount = roleCatNyaCount(sfp);
  if (past) {
    const core = nounPastCopulaStem(noun, allomorphHost);
    if (nyaCount > 0) {
      return new ConjugationResult(`${core}다${roleCatNyaSuffix(nyaCount)}`, false);
    }
    if ((sfp === "polite_q" || sfp === "plain_q") && polite) {
      return new ConjugationResult(core + (formal ? "습니까" : "어요"), true);
    }
    if (sfp === "ne") {
      return new ConjugationResult(core + "네" + (polite ? "요" : ""), polite);
    }
    if (sfp === "na_excl") {
      return new ConjugationResult(core + (polite ? "군요" : "구나"), polite);
    }
    if (sfp === "kana") {
      return new ConjugationResult(core + "을까", false);
    }
    if (sfp === "kke") {
      return new ConjugationResult(core + "던가", false);
    }
    if (sfp === "explanatory") {
      return new ConjugationResult(core + "거든" + (polite ? "요" : ""), polite);
    }
    if (sfp === "yone_confirm") {
      return new ConjugationResult(core + yoneConfirmSuffix(polite, formal), polite);
    }
    return undefined;
  }
  const cop = hasBatchim(allomorphHost ?? noun) ? "이" : "";
  if (sfp === "plain_q" && formal && !polite) {
    return new ConjugationResult(`${noun}인가`, false);
  }
  if (nyaCount > 0) {
    return new ConjugationResult(`${noun}${cop}다${roleCatNyaSuffix(nyaCount)}`, false);
  }
  if ((sfp === "polite_q" || sfp === "plain_q") && polite) {
    return new ConjugationResult(formal ? noun + "입니까" : noun + selectParticle(allomorphHost ?? noun, "이에요/예요"), true);
  }
  if (sfp === "ne") {
    return new ConjugationResult(noun + cop + "네" + (polite ? "요" : ""), polite);
  }
  if (sfp === "explanatory") {
    return new ConjugationResult(noun + cop + "거든" + (polite ? "요" : ""), polite);
  }
  if (sfp === "na_excl") {
    return new ConjugationResult(noun + cop + (polite ? "군요" : "구나"), polite);
  }
  if (sfp === "kana") {
    return new ConjugationResult(noun + "일까", false);
  }
  if (sfp === "jan") {
    return new ConjugationResult(noun + selectParticle(allomorphHost ?? noun, "이잖아/잖아"), false);
  }
  if (sfp === "yone_confirm") {
    return new ConjugationResult(noun + cop + yoneConfirmSuffix(polite, formal), polite);
  }
  if (sfp === "kke") {
    return new ConjugationResult(nounPastCopulaStem(noun, allomorphHost) + "던가", false);
  }
  return undefined;
}

export function nounCopula(noun: string, features: AuxFeatures, formal: boolean, lookups: LookupTables,
  sfp?: string, allomorphHost?: string): ConjugationResult {
  const host = allomorphHost ?? noun;
  const nyaCount = roleCatNyaCount(sfp);
  if (nyaCount > 0) {
    const base = noun === "냐"
      ? new ConjugationResult("냐", false)
      : nounCopula(noun, features, true, lookups, undefined, allomorphHost);
    return appendRoleCatNyaCount(base, nyaCount);
  }
  if (sfp !== undefined) {
    const sfpResult = nounSfpEnding(noun, features.polite, features.past, sfp, formal, allomorphHost);
    if (sfpResult !== undefined) {
      return sfpResult;
    }
  }
  if (features.past) {
    const core = nounPastCopulaStem(noun, allomorphHost);
    if (features.polite) {
      return new ConjugationResult(core + (formal ? "습니다" : "어요"), true);
    }
    return new ConjugationResult(core + (formal ? "다" : "어"), false);
  }
  if (features.polite) {
    return new ConjugationResult(noun + (formal ? "입니다" : selectParticle(host, "이에요/예요")), true);
  }
  return new ConjugationResult(noun + (formal ? selectParticle(host, "이다/다") : selectParticle(host, "이야/야")), false);
}

const PREFACE_POLITE_PAST_ENDINGS: { readonly [ending: string]: string } = {
  "는데요": "는데요",
  "ㅂ니다만": "습니다만"
};

export function nounCopulaConnective(noun: string, ending: string, past = false, allomorphHost?: string): string {
  if (past) {
    if (ending === "라면") {
      return nounPastCopulaStem(noun, allomorphHost) + "다면";
    }
    return applyEndingToPastStem(nounPastCopulaStem(noun, allomorphHost), ending);
  }
  const batchim = hasAllomorphBatchim(allomorphHost ?? noun);
  const forms: { readonly [endingKey: string]: readonly [batchim: string, noBatchim: string] } = {
    "아/어서": ["이라서", "라서"],
    "면": ["이면", "면"],
    "라면": ["이라면", "라면"],
    "지만": ["이지만", "지만"],
    "(으)니까": ["이니까", "니까"],
    "는데": ["인데", "인데"],
    "는데요": ["인데요", "인데요"],
    "ㅂ니다만": ["입니다만", "입니다만"],
    "고": ["이고", "이고"],
    "며": ["이며", "며"],
    "지": ["이지", "지"],
    "(으)면서": ["이면서", "면서"],
    "(으)면서도": ["이면서도", "면서도"],
    "ㄴ/은": ["인", "인"],
    "는지": ["인지", "인지"],
    "ㄴ/은지": ["인지", "인지"],
    "아/어도": ["이어도", "여도"],
    "기 때문에": ["이기 때문에", "이기 때문에"],
    "다고": ["이라고", "라고"],
    "냐고": ["이냐고", "냐고"]
  };
  const pair = forms[ending];
  if (pair !== undefined) {
    return noun + (batchim ? pair[0] : pair[1]);
  }
  return noun;
}

function findRashiiIndex(auxTokens: readonly AuxToken[]): number | undefined {
  const index = auxTokens.findIndex((token) => (token.pos & POS4) === 助動詞_ラシイ);
  return index < 0 ? undefined : index;
}

function findShimauIndex(auxTokens: readonly AuxToken[]): number | undefined {
  const index = auxTokens.findIndex((token) => ["ちゃう", "じゃう"].includes(token.dictionaryForm ?? token.dictionary_form ?? ""));
  return index < 0 ? undefined : index;
}

function findTeruIndex(auxTokens: readonly AuxToken[]): number | undefined {
  const index = auxTokens.findIndex((token) => (token.dictionaryForm ?? token.dictionary_form) === "てる");
  return index < 0 ? undefined : index;
}

function resolveRashiiChain(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  auxTokens: readonly AuxToken[],
  rashiiIndex: number,
  options: { formal?: boolean; sfp?: string } = {},
  lookups: LookupTables
): ConjugationResult {
  const preAux = auxTokens.slice(0, rashiiIndex);
  const postAux = auxTokens.slice(rashiiIndex + 1);
  const gatta = renderKoreanPredicateTerminal("같다", null, 형용사, koreanPredicateAuxChain(postAux), { ...options, lookups });
  if (koreanPos === 동사 || koreanPos === 형용사) {
    return new ConjugationResult(`${rashiiAttributive(koreanLemma, irregular, koreanPos, preAux, lookups)} 것 ${gatta.text}`, gatta.polite);
  }
  return new ConjugationResult(`${koreanLemma} ${gatta.text}`, gatta.polite);
}

export function rashiiAttributive(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  preAux: readonly AuxToken[],
  lookups: LookupTables
): string {
  const features = preAux.length === 0 ? baseFeatures() : extractFeatures(preAux, { lookups: lookups });
  if (features.progressive && features.negative && koreanPos === 동사) {
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
    return prefix + conjugate(negLemma, negIrregular, "ㄴ/은");
  }
  if (features.progressive && koreanPos === 동사) {
    const go = conjugate(koreanLemma, irregular, "고");
    return features.past ? `${go} 있었던` : `${go} 있는`;
  }
  if (isKoreanPotentialLemma(koreanLemma)) {
    const prefix = potentialPhrasePrefix(koreanLemma);
    if (features.negative) {
      return prefix + (features.past ? "없었던" : "없는");
    }
    return prefix + (features.past ? "있었던" : "있는");
  }
  if (features.negative) {
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(koreanLemma, irregular, lookups);
    return prefix + conjugate(negLemma, negIrregular, koreanPos === 동사 && !features.past ? "ㄴ/는" : "ㄴ/은");
  }
  if (features.past) {
    return conjugate(koreanLemma, irregular, "ㄴ/은");
  }
  return conjugate(koreanLemma, irregular, koreanPos === 동사 ? "ㄴ/는" : "ㄴ/은");
}

export function nodaCopula(
  copulaChain: KoreanPredicateAuxChain,
  lookups: LookupTables,
  formal = false,
  sfp?: string | null
): ConjugationResult {
  const copulaAux = auxTokensOf(copulaChain);
  let polite = false;
  let past = false;
  let isJa = false;
  for (const token of copulaAux) {
    const p4 = token.pos & POS4;
    if (p4 === 助動詞_デス) {
      polite = true;
    } else if (p4 === 助動詞_ジャ) {
      isJa = true;
    } else if (p4 === 助動詞_タ) {
      past = true;
    } else if (p4 === 助動詞_マス) {
      polite = true;
    }
  }

  const noun = formal ? "것" : "거";

  if (sfp === "kana" && !formal) {
    return new ConjugationResult("걸까", false);
  }

  if (copulaAux.length === 0) {
    return nounCopula(noun, baseFeatures({ copula: true }), formal, lookups, sfp ?? undefined);
  }

  if (isJa) {
    if (formal) {
      if (past) {
        return new ConjugationResult("것이었지", false);
      }
      return new ConjugationResult("것이지", false);
    }
    if (past) {
      return new ConjugationResult("거였지", false);
    }
    return new ConjugationResult("거지", false);
  }

  return nounCopula(noun, baseFeatures({ copula: true, polite, past }), formal, lookups, sfp ?? undefined);
}

function resolveShimauChain(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  auxTokens: readonly AuxToken[],
  shimauIndex: number,
  options: { formal?: boolean; sfp?: string; jpDictForm?: string; verbConjType?: number; forcePassive?: boolean; sahenCompound?: boolean; sahenNoun?: string; passiveClass?: PassiveClass } = {},
  lookups: LookupTables
): ConjugationResult {
  const preAux = auxTokens.slice(0, shimauIndex);
  const postAux = auxTokens.slice(shimauIndex + 1);
  let aeForm = koreanLemma;
  if (koreanPos === 동사 || koreanPos === 형용사) {
    let lemma = koreanLemma;
    let lemmaIrregular = irregular ?? null;
    const preFeatures = preAux.length === 0 ? baseFeatures() : extractFeatures(preAux, { ...options, lookups });
    if (preFeatures.causative) {
      lemma = `${conjugate(lemma, lemmaIrregular, "게")} 하다`;
      lemmaIrregular = "여";
    }
    if (preFeatures.passive) {
      const resolved = resolvePassiveLemma(lemma, lemmaIrregular, passiveOptions({ ...options, lookups }));
      lemma = resolved[0];
      lemmaIrregular = resolved[1];
    }
    aeForm = conjugate(lemma, lemmaIrregular, "아/어");
  }
  const buri = renderKoreanPredicateTerminal("버리다", null, 동사, koreanPredicateAuxChain(postAux), { ...potentialOptions({ ...options, lookups }), lookups });
  return new ConjugationResult(`${aeForm} ${buri.text}`, buri.polite);
}

function resolveTeruChain(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  koreanPos: number,
  auxTokens: readonly AuxToken[],
  teruIndex: number,
  options: {
    formal?: boolean;
    sfp?: string;
    jpDictForm?: string;
    verbConjType?: number;
    forcePassive?: boolean;
    sahenCompound?: boolean;
    sahenNoun?: string;
    passiveClass?: PassiveClass;
    teIruResultative?: boolean;
    teIruContractToPast?: boolean;
  } = {},
  lookups: LookupTables
): ConjugationResult {
  const preAux = auxTokens.slice(0, teruIndex);
  const postAux = auxTokens.slice(teruIndex + 1);
  if (koreanPos !== 동사 && koreanPos !== 형용사) {
    return renderKoreanPredicateTerminal(koreanLemma, irregular, koreanPos, koreanPredicateAuxChain(postAux), potentialOptions({ ...options, lookups }));
  }
  let lemma = koreanLemma;
  let lemmaIrregular = irregular;
  let passive = false;
  if (preAux.length > 0) {
    const preFeatures = extractFeatures(preAux, { ...options, lookups });
    if (preFeatures.causative) {
      lemma = `${conjugate(lemma, lemmaIrregular, "게")} 하다`;
      lemmaIrregular = "여";
    }
    if (preFeatures.passive) {
      passive = true;
      const resolved = resolvePassiveLemma(lemma, lemmaIrregular, passiveOptions({ ...options, lookups }));
      lemma = resolved[0];
      lemmaIrregular = resolved[1];
    } else if (preFeatures.potential) {
      return applyFeatures(koreanLemma, irregular, koreanPos, baseFeatures({ ...extractFeatures(postAux, { ...options, lookups }), potential: true }), featureOptions(options), lookups);
    }
  }
  const passiveResultative = passive && options.passiveClass === "resultative_state";
  const activeResultative = !passive && lookups.isTeIruResultativeVerb(options.jpDictForm);
  const activeNegativeResultative = !passive && lookups.isTeIruNegativeResultativeVerb(options.jpDictForm);
  const resultative = options.teIruResultative === true || passiveResultative || activeResultative;
  const negativeResultative = options.teIruResultative === true || passiveResultative || activeNegativeResultative;
  const hasNeg = auxHasPos4(postAux, new Set([助動詞_ナイ, 助動詞_ヌ]));
  if (hasNeg) {
    if (options.teIruContractToPast === true) {
      return resolveTeIruContractedPast(lemma, lemmaIrregular, postAux, potentialOptions({ ...options, lookups }), lookups);
    }
    const remaining = postAux.filter((token) => (token.pos & POS4) !== 助動詞_ナイ && (token.pos & POS4) !== 助動詞_ヌ);
    if (negativeResultative || (passive && resultative)) {
      const result = renderKoreanPredicateTerminal("있지 않다", null, 형용사, koreanPredicateAuxChain(remaining), potentialOptions({ ...options, lookups }));
      return new ConjugationResult(`${conjugate(lemma, lemmaIrregular, "아/어")} ${result.text}`, result.polite);
    }
    if (teIruNegativePrefersInability(options.jpDictForm, lookups)) {
      const result = renderKoreanPredicateTerminal("못하다", "여", 동사, koreanPredicateAuxChain(remaining), potentialOptions({ ...options, lookups }));
      return new ConjugationResult(`${conjugate(lemma, lemmaIrregular, "지")} ${result.text}`, result.polite);
    }
    if (teIruNegativePrefersLongNegation(options.jpDictForm, lookups)) {
      const result = applyFeatures("않다", null, 형용사, baseFeatures({ polite: auxHasPos4(remaining, new Set([助動詞_マス])), past: true }), potentialOptions({ ...options, lookups }), lookups);
      return new ConjugationResult(`${conjugate(lemma, lemmaIrregular, "지")} ${result.text}`, result.polite);
    }
    const [prefix, negLemma, negIrregular] = shortNegationPrefix(lemma, lemmaIrregular, lookups);
    const result = applyFeatures(negLemma, negIrregular, 동사, baseFeatures({ polite: auxHasPos4(remaining, new Set([助動詞_マス])), past: true }), potentialOptions({ ...options, lookups }), lookups);
    return new ConjugationResult(prefix + result.text, result.polite);
  }
  if (resultative) {
    if (options.teIruContractToPast === true) {
      return resolveTeIruContractedPast(lemma, lemmaIrregular, postAux, potentialOptions({ ...options, lookups }), lookups);
    }
    const result = renderKoreanPredicateTerminal("있다", null, 동사, koreanPredicateAuxChain(postAux), potentialOptions({ ...options, lookups }));
    return new ConjugationResult(`${conjugate(lemma, lemmaIrregular, "아/어")} ${result.text}`, result.polite);
  }
  const result = renderKoreanPredicateTerminal("있다", null, 동사, koreanPredicateAuxChain(postAux), potentialOptions({ ...options, lookups }));
  return new ConjugationResult(`${conjugate(lemma, lemmaIrregular, "고")} ${result.text}`, result.polite);
}

function auxHasPos4(auxTokens: readonly AuxToken[], values: ReadonlySet<number>): boolean {
  return auxTokens.some((token) => values.has(token.pos & POS4));
}

function resolveTeIruContractedPast(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  auxTokens: readonly AuxToken[],
  options: { formal?: boolean; sfp?: string } = {},
  lookups: LookupTables
): ConjugationResult {
  if (auxHasPos4(auxTokens, new Set([助動詞_ナイ, 助動詞_ヌ]))) {
    const remaining = auxTokens.filter((token) => (token.pos & POS4) !== 助動詞_ナイ && (token.pos & POS4) !== 助動詞_ヌ);
    const result = applyFeatures("않다", null, 형용사, baseFeatures({ polite: auxHasPos4(remaining, new Set([助動詞_マス])), past: true }), options, lookups);
    return new ConjugationResult(`${conjugate(koreanLemma, irregular, "지")} ${result.text}`, result.polite);
  }
  const features = auxTokens.length === 0 ? baseFeatures() : extractFeatures(auxTokens, { lookups: lookups });
  let pastStem = conjugate(koreanLemma, irregular, "았/었");
  if (features.past) {
    pastStem += "었";
  }
  return finalizePast(pastStem, features.polite, options.formal === true, lookups, options.sfp);
}

export function applyEndingToPastStem(pastStem: string, ending: string): string {
  const prefacePolitePast = PREFACE_POLITE_PAST_ENDINGS[ending];
  if (prefacePolitePast !== undefined) {
    return `${pastStem}${prefacePolitePast}`;
  }
  if (ending === "ㄴ/은지") {
    ending = "는지";
  } else if (ending === "ㄴ/은데") {
    ending = "는데";
  } else if (ending === "ㄴ다/는다") {
    ending = "다";
  }
  if (ending === "아/어서") {
    return `${pastStem}어서`;
  }
  if (ending === "더니") {
    return `${pastStem}더니`;
  }
  if (ending === "기 때문에") {
    return `${pastStem}기 때문에`;
  }
  return conjugate(`${pastStem}다`, null, ending);
}

function resolveTeIruContractedPastConnective(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  auxTokens: readonly AuxToken[],
  ending: string,
  lookups: LookupTables
): string {
  if (auxHasPos4(auxTokens, new Set([助動詞_ナイ, 助動詞_ヌ]))) {
    const remaining = auxTokens.filter((token) => (token.pos & POS4) !== 助動詞_ナイ && (token.pos & POS4) !== 助動詞_ヌ);
    return `${conjugate(koreanLemma, irregular, "지")} ${renderKoreanPredicateConnective(
      "않다",
      null,
      형용사,
      koreanPredicateAuxChain(syntheticAuxFeatures({ polite: auxHasPos4(remaining, new Set([助動詞_マス])), past: true })),
      ending
      , { lookups: lookups })}`;
  }
  if (ending === "아/어서") {
    return applyEndingToPastStem(conjugate(koreanLemma, irregular, "았/었"), ending);
  }
  const features = auxTokens.length === 0 ? baseFeatures() : extractFeatures(auxTokens, { lookups: lookups });
  let pastStem = conjugate(koreanLemma, irregular, "았/었");
  if (features.past) {
    pastStem += "었";
  }
  return applyEndingToPastStem(pastStem, ending);
}

function syntheticAuxFeatures(options: { polite: boolean; past?: boolean }): readonly AuxToken[] {
  const tokens: AuxToken[] = [];
  if (options.polite) {
    tokens.push({ surface: "ます", dictionaryForm: "ます", pos: 助動詞 | 助動詞_マス | 終止形_一般 });
  }
  if (options.past === true) {
    tokens.push({ surface: "た", dictionaryForm: "た", pos: 助動詞 | 助動詞_タ | 終止形_一般 });
  }
  return tokens;
}

export interface AuxFeatures {
  polite: boolean;
  past: boolean;
  negative: boolean;
  desire: boolean;
  copula: boolean;
  volitional: boolean;
  conjecture: boolean;
  conditionalTara: boolean;
  conditionalNara: boolean;
  adverbialNi: boolean;
  potential: boolean;
  passive: boolean;
  causative: boolean;
  causativePassive: boolean;
  progressive: boolean;
  obligation: boolean;
  negativeVolition: boolean;
  preferLongNegation: boolean;
}

function setAuxFeatureFlag(features: AuxFeatures, flag: AuxFeatureFlag): void {
  switch (flag) {
    case "polite":
      features.polite = true;
      return;
    case "past":
      features.past = true;
      return;
    case "negative":
      features.negative = true;
      return;
    case "desire":
      features.desire = true;
      return;
    case "volitional":
      features.volitional = true;
      return;
    case "conjecture":
      features.conjecture = true;
      return;
    case "copula":
      features.copula = true;
      return;
    case "conditional_tara":
      features.conditionalTara = true;
      return;
    case "conditional_nara":
      features.conditionalNara = true;
      return;
    case "adverbial_ni":
      features.adverbialNi = true;
      return;
    case "potential":
      features.potential = true;
      return;
    case "passive":
      features.passive = true;
      return;
    case "causative":
      features.causative = true;
      return;
    case "causative_passive":
      features.causativePassive = true;
      return;
    case "progressive":
      features.progressive = true;
      return;
    case "obligation":
      features.obligation = true;
      return;
    case "negative_volition":
      features.negativeVolition = true;
      return;
    case "prefer_long_negation":
      features.preferLongNegation = true;
      return;
  }
}

function auxEntryMatches(entry: AuxTableEntry, token: AuxToken): boolean {
  const p4 = token.pos & POS4;
  if (entry.pos4 !== undefined && (POS4_OF_NAME[entry.pos4] ?? 0) !== p4) {
    return false;
  }
  if (entry.pos4_in !== undefined && !entry.pos4_in.some((name) => (POS4_OF_NAME[name] ?? 0) === p4)) {
    return false;
  }
  const dictForm = token.dictionaryForm ?? token.dictionary_form;
  if (entry.dictionary_form !== undefined && entry.dictionary_form !== dictForm) {
    return false;
  }
  if (entry.dictionary_form_in !== undefined && (dictForm === undefined || !entry.dictionary_form_in.includes(dictForm))) {
    return false;
  }
  return true;
}

function auxVariantMatches(variant: AuxTableVariant, token: AuxToken): boolean {
  if (variant.pos5_contains !== undefined) {
    const setFn = POS5_SET_OF_NAME[variant.pos5_contains];
    if (setFn !== undefined) {
      if (!setFn(token.pos)) return false;
    } else {
      const pos5aValue = POS5A_OF_NAME[variant.pos5_contains];
      if (pos5aValue !== undefined) {
        if ((token.pos & POS5A) !== pos5aValue) return false;
      } else {
        return false;
      }
    }
  }
  if (variant.pos5_eq !== undefined) {
    const expected = POS5_OF_NAME[variant.pos5_eq] ?? 0;
    if ((token.pos & POS5) !== expected) return false;
  }
  if (variant.surface_in !== undefined && (token.surface === undefined || !variant.surface_in.includes(token.surface))) {
    return false;
  }
  return true;
}

function applyAuxTable(features: AuxFeatures, token: AuxToken): boolean {
  for (const entry of loadAuxTable()) {
    if (!auxEntryMatches(entry, token)) {
      continue;
    }
    for (const flag of entry.always ?? []) {
      setAuxFeatureFlag(features, flag);
    }
    for (const variant of entry.variants ?? []) {
      if (auxVariantMatches(variant, token)) {
        for (const flag of variant.flags ?? []) {
          setAuxFeatureFlag(features, flag);
        }
        return true;
      }
    }
    for (const flag of entry.default ?? []) {
      setAuxFeatureFlag(features, flag);
    }
    return true;
  }
  return false;
}

export function extractFeatures(
  auxTokens: readonly AuxToken[],
  options: {
    lookups: LookupTables;
    jpDictForm?: string;
    verbConjType?: number;
    forcePassive?: boolean;
  }
): AuxFeatures {
  const features = baseFeatures();
  const hasNegative = auxTokens.some((token) =>
    (token.pos & POS4) === 助動詞_ナイ ||
    (token.pos & POS4) === 助動詞_ヌ ||
    ((token.pos & (POS4 | POS5B)) === (助動詞_レル | _撥音便))
  );
  const jpDictForm = options.jpDictForm ?? "";
  const verbConjType4 = options.verbConjType ?? 0;
  const isGodan = is五段(verbConjType4) || verbConjType4 === サ行変格;
  for (const [index, token] of auxTokens.entries()) {
    if (token.preferLongNegation === true || token.prefer_long_negation === true) {
      features.preferLongNegation = true;
    }
    const p4 = token.pos & POS4;
    const dictForm = token.dictionaryForm ?? token.dictionary_form;

    if (p4 === 助動詞_レル) {
      if ((token.pos & POS5B) === _撥音便) {
        features.negative = true;
      }
      if (features.causativePassive) {
      } else if (hasNegative && jpDictForm !== "" && options.lookups.RARERU_NEGATIVE_POTENTIAL_PREFERRED.has(jpDictForm)) {
        features.potential = true;
      } else if (isGodan) {
        features.passive = true;
      } else if (jpDictForm !== "" && options.lookups.RARERU_PASSIVE_PREFERRED.has(jpDictForm)) {
        features.passive = true;
      } else if (options.forcePassive === true) {
        features.passive = true;
      } else {
        features.potential = true;
      }
      continue;
    }

    if (dictForm === "せる" || dictForm === "させる") {
      if (((auxTokens[index + 1]?.pos ?? 0) & POS4) === 助動詞_レル) {
        features.causativePassive = true;
      } else {
        features.causative = true;
      }
      continue;
    }

    applyAuxTable(features, token);
  }
  return features;
}
