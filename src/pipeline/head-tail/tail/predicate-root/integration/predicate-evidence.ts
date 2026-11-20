import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { MorphemeEntry, MorphemeSense } from "../../../../../types/dictionary.js";
import { adjectiveAdverbialModifiedPredicate, adjectiveAdverbialModifierLookupOptions } from "../../../../clause-layout/adverbial-predicate.js";
import { WH_INDEFINITE_DEMO_HOSTS } from "../../../data/semantic-helper-sets.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { caseParticleMarkerRelationForToken } from "../../../boundary/marker.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { isTeAuxActivationAccepted } from "../postverb-auxiliary-parser.js";
import { NOMINAL_BITS, POS0, POS01, pos0in, POS4, POS5A, 形容詞0, 終止形_, 助詞, 助動詞 as 助動詞0, 助動詞_タ, 助動詞_ダ, 助動詞_ナイ, 助動詞_ヌ, 動詞, 非自立可能, 補助記号, 連用形_, 동사, 명사, 형용사, isAdverbCapable, isNaAdjCapable } from "../../../../../types/pos.js";
import type { TailParserSourceStemKind, AdverbialSurfacePostverbKind } from "./contracts.js";

export function adjectiveAdverbialModifierPredicateReachable(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables | undefined
): boolean {
  return adjectiveAdverbialModifiedPredicate(
    tokens,
    start,
    lookups === undefined ? undefined : adjectiveAdverbialModifierLookupOptions(lookups)
  ) !== null;
}

export function isNominalLikeAttributiveHead(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined) {
    return false;
  }
  return pos0in(token.pos, NOMINAL_BITS);
}

export function stemTokenEndsWithNoKoto(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.surface;
  return form.endsWith("のこと");
}

export function entryHasPredicateStemTranslation(
  entry: MorphemeEntry,
  stemKind: TailParserSourceStemKind,
  copularNominalTarget = false
): boolean {
  return (entry.senses ?? []).some(t =>
    translationIsPredicateStemCompatible(t, stemKind, copularNominalTarget));
}

export function translationIsPredicateStemCompatible(
  translation: MorphemeSense,
  stemKind: TailParserSourceStemKind,
  copularNominalTarget = false
): boolean {
  if (translation.koreanPos === undefined) {
    return true;
  }
  if (stemKind === "verb") {
    return translation.koreanPos === 동사 || translation.koreanPos === 형용사;
  }
  if (stemKind === "adj") {
    return translation.koreanPos === 형용사 || translation.koreanPos === 동사 ||
      (copularNominalTarget && translation.koreanPos === 명사);
  }
  return translation.koreanPos === 명사;
}

export function sourceAllowsPredicateCopulaHostCandidates(token: RuntimeHaruToken): boolean {
  return isNaAdjCapable(token);
}

export function sourceHasFormalToStateResultCarrier(tokens: readonly RuntimeHaruToken[], start: number): boolean {
  const marker = quoteMarkerRelationAt(tokens, start + 1, {
    consumers: ["tail_multi_clause"]
  });
  const carrier = tokens[start + 2];
  return marker?.canonicalSurface === "と" &&
    carrier !== undefined &&
    (carrier.pos & POS0) === 動詞 &&
    (carrier.dictionaryForm === "なる" || carrier.dictionaryForm === "なれる");
}

export function sourceHasAdverbialSurfacePostverbCarrier(tokens: readonly RuntimeHaruToken[], start: number): boolean {
  return sourceAdverbialSurfacePostverbKind(tokens, start) !== null;
}

export function sourceAdverbialSurfacePostverbKind(
  tokens: readonly RuntimeHaruToken[],
  start: number
): AdverbialSurfacePostverbKind | null {
  const token = tokens[start];
  if (token === undefined || !isAdverbCapable(token)) {
    return null;
  }
  if (sourceIsWhIndefiniteAmountHost(token)) {
    return null;
  }
  const marker = caseParticleMarkerRelationForToken(tokens[start + 1], start + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_boundary_readiness"]
  });
  const carrier = tokens[start + 2];
  if (
    marker === null ||
    carrier === undefined ||
    (carrier.pos & POS0) !== 動詞 ||
    !isTeAuxActivationAccepted(carrier, tokens[start + 3])
  ) {
    return null;
  }
  if (carrier.dictionaryForm === "なる") {
    return "change";
  }
  if (carrier.dictionaryForm === "なれる") {
    return "potential";
  }
  if (carrier.dictionaryForm === "する" && sourceHasBoundedAdverbialControlSuruCarrier(carrier, tokens[start + 3])) {
    return "control";
  }
  return null;
}

function sourceIsWhIndefiniteAmountHost(token: RuntimeHaruToken): boolean {
  const dictForm = token.dictionaryForm || token.surface;
  return WH_INDEFINITE_DEMO_HOSTS.has(dictForm) || WH_INDEFINITE_DEMO_HOSTS.has(token.surface);
}

function sourceHasBoundedAdverbialControlSuruCarrier(
  carrier: RuntimeHaruToken,
  next: RuntimeHaruToken | undefined
): boolean {
  const form = carrier.pos & POS5A;
  if (form === 終止形_) {
    return next === undefined || (next.pos & POS0) === 補助記号;
  }
  return form === 連用形_ &&
    next !== undefined &&
    (next.pos & (POS4 | POS5A)) === (助動詞_タ | 終止形_);
}

export function isKotodashiReasonScopeTail(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number
): boolean {
  const copula = tokens[copulaIdx];
  if (
    copula === undefined || (copula.pos & (POS0 | POS4)) !== (助動詞0 | 助動詞_ダ)
  ) {
    return false;
  }
  const connective = tokens[copulaIdx + 1];
  return connective !== undefined && (connective.pos & POS0) === 助詞 && connective.surface === "し";
}

export function isNegationLikeToken(token: RuntimeHaruToken): boolean {
  const pos4 = token.pos & POS4;
  if (pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ) {
    return true;
  }
  return (
    (token.pos & POS01) === (形容詞0 | 非自立可能) && (token.dictionaryForm === "ない" || token.dictionaryForm === "無い")
  );
}
