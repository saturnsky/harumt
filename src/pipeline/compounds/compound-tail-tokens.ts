import { isVerbLemma, type MatcherToken } from "../matchers.js";
import { colloquialIntensiveTailForms, sahenProductiveFollowingForms, tailOnlyProductiveFollowingForms, uruPotentialTailForms } from "./compound-following-forms.js";
import { POS0, POS01, POS5A, 動詞, 動詞_非自立可能, 連用形_ } from "../../types/pos.js";

export function isAuxiliaryVerbToken(token: MatcherToken, renyouAuxVerbs: ReadonlySet<string>): boolean {
  return (token.pos & POS01) === 動詞_非自立可能 && renyouAuxVerbs.has(token.dictionaryForm);
}

export function isKireruToken(token: MatcherToken): boolean {
  return (token.pos & POS01) === 動詞_非自立可能 && (token.dictionaryForm === "きれる" || token.dictionaryForm === "切れる");
}

export function isSugiruAuxiliaryToken(token: MatcherToken): boolean {
  return (token.pos & POS01) === 動詞_非自立可能 && (token.dictionaryForm === "すぎる" || token.dictionaryForm === "過ぎる");
}

export function isKiruToken(token: MatcherToken): boolean {
  return (token.pos & POS01) === 動詞_非自立可能 && (token.dictionaryForm === "きる" || token.dictionaryForm === "切る");
}

export function isOeruAuxiliaryToken(token: MatcherToken): boolean {
  return (token.pos & POS01) === 動詞_非自立可能 && token.dictionaryForm === "終える";
}

export function isSahenProductiveFollowingToken(token: MatcherToken): boolean {
  return (token.pos & POS0) === 動詞 && sahenProductiveFollowingForms().has(token.dictionaryForm);
}

export function isTailOnlyProductiveFollowingToken(token: MatcherToken): boolean {
  return (token.pos & POS0) === 動詞 && tailOnlyProductiveFollowingForms().has(token.dictionaryForm);
}

export function isUruPotentialTailToken(token: MatcherToken): boolean {
  return (token.pos & POS01) === 動詞_非自立可能 && uruPotentialTailForms().has(token.dictionaryForm);
}

export function isColloquialIntensiveTailToken(token: MatcherToken): boolean {
  return (token.pos & POS0) === 動詞 && colloquialIntensiveTailForms().has(token.dictionaryForm);
}

export function isReciprocalAuTailToken(token: MatcherToken): boolean {
  return isVerbLemma(token, "合う", "あう");
}

export function isSahenSuruRenyou(tokens: readonly MatcherToken[], pos: number): boolean {
  const token = tokens[pos];
  return token !== undefined && (token.pos & (POS01 | POS5A)) === (動詞_非自立可能 | 連用形_) && token.dictionaryForm === "する";
}
