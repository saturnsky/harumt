import { postverbAuxiliaryDeclaresHostAttachForm, postverbAuxiliaryPayloadsForForm } from "../head-tail/tail/predicate-root/postverb-auxiliary-parser.js";
import { isClausePunctuationToken } from "./punctuation.js";
import { nextNonSpaceIndex, previousNonSpaceIndex, skipTerminalParticleRun } from "./trivia.js";
import { POS0, POS01, POS4, POS5A, isNaAdjCapable, isSahenCapableNominal, isTerminalParticleToken, pos0in, 形状詞, 終止形_, 助動詞, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 接尾辞, 代名詞, 名詞, 命令形_, 連体形_, 連用形_, NOMINAL_BITS, 助詞_接続助詞 } from "../../types/pos.js";
import type { ClauseToken } from "./layout-types.js";

export function sourceSahenPotentialDifficultyPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isSahenCapableNominal(token)) {
    return false;
  }
  const potentialIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  const potential = potentialIdx === null ? undefined : tokens[potentialIdx];
  const difficultyIdx = potentialIdx === null
    ? null
    : nextNonSpaceIndex(tokens, potentialIdx + 1, limit);
  const difficulty = difficultyIdx === null ? undefined : tokens[difficultyIdx];
  if (potential === undefined || difficulty === undefined) {
    return false;
  }
  const potentialPayload = postverbAuxiliaryPayloadsForForm(potential.dictionaryForm)
    .some((payload) => payload.kind === "potential" &&
      payload.followingAuxiliaryKind === "difficulty" &&
      postverbAuxiliaryDeclaresHostAttachForm(payload, "sahen_stem"));
  const difficultyPayload = postverbAuxiliaryPayloadsForForm(difficulty.dictionaryForm)
    .some((payload) => payload.kind === "difficulty");
  return potentialPayload && difficultyPayload;
}

export function sourceTokenIsTeDeRequestTail(
  tokens: readonly ClauseToken[],
  idx: number
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  const markerIdx = previousNonSpaceIndex(tokens, idx);
  const marker = markerIdx === null ? undefined : tokens[markerIdx];
  if (
    marker === undefined ||
    (marker.pos & POS01) !== 助詞_接続助詞 ||
    (marker.surface !== "て" && marker.surface !== "で")
  ) {
    return false;
  }
  const lemma = token.dictionaryForm || token.surface;
  if (lemma === "くださる" || lemma === "下さる" || lemma === "くれる" || lemma === "呉れる") {
    return (token.pos & POS5A) === 命令形_;
  }
  return token.surface === "ちょうだい" || lemma === "ちょうだい" || lemma === "頂戴";
}

export function sourceNegativeAdjectiveIsCopulaTail(
  tokens: readonly ClauseToken[],
  idx: number
): boolean {
  const focusIdx = previousNonSpaceIndex(tokens, idx);
  if (focusIdx === null) return false;
  const focus = tokens[focusIdx];
  if (focus?.surface === "じゃ" && (focus.pos & POS4) === 助動詞_ダ) return true;
  if (focus?.surface === "では" || focus?.surface === "でも") return true;
  if (focus?.surface !== "は" && focus?.surface !== "も") return false;
  const copulaIdx = previousNonSpaceIndex(tokens, focusIdx);
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  if (copula?.surface !== "で") return false;
  const hostIdx = previousNonSpaceIndex(tokens, copulaIdx!);
  const hostPos0 = hostIdx === null ? null : ((tokens[hostIdx]?.pos ?? 0) & POS0);
  return hostPos0 === 名詞 || hostPos0 === 代名詞 || hostPos0 === 形状詞;
}

export function naAttributivePredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isNaAdjCapable(token)) {
    return false;
  }
  const naIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  if (naIdx === null) {
    return false;
  }
  const na = tokens[naIdx];
  if (
    na === undefined ||
    na.surface !== "な" ||
    (na.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 助動詞_ダ | 連体形_)
  ) {
    return false;
  }
  const headIdx = nextNonSpaceIndex(tokens, naIdx + 1, limit);
  const head = headIdx === null ? undefined : tokens[headIdx];
  if (head === undefined) {
    return false;
  }
  const headPos0 = head.pos & POS0;
  if (pos0in(headPos0, NOMINAL_BITS) || headPos0 === 代名詞) {
    return true;
  }
  return false;
}

export function nominalZeroCopulaPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isNaAdjCapable(token)) {
    return false;
  }
  let cursor = nextNonSpaceIndex(tokens, idx + 1, limit);
  while (cursor !== null && (tokens[cursor]!.pos & POS0) === 接尾辞) {
    cursor = nextNonSpaceIndex(tokens, cursor + 1, limit);
  }
  return cursor === null || sourcePredicateBoundaryStartsAt(tokens, cursor, limit);
}

function sourcePredicateBoundaryStartsAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return true;
  }
  if (isClausePunctuationToken(token)) {
    return true;
  }
  if (isTerminalParticleToken(token)) {
    const after = skipTerminalParticleRun(tokens, idx, limit);
    return after === null || isClausePunctuationToken(tokens[after]);
  }
  return false;
}

export function isVerbalizedSahenPredicate(tokens: readonly ClauseToken[], idx: number): boolean {
  const token = tokens[idx];
  if (token === undefined || !isSahenCapableNominal(token)) {
    return false;
  }
  const suIdx = nextNonSpaceIndex(tokens, idx + 1);
  return suIdx !== null && (tokens[suIdx]?.dictionaryForm === "する");
}

export function isPastTaToken(token: { readonly pos: number; readonly dictionaryForm?: string; readonly surface?: string } | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 助動詞) {
    return false;
  }
  const isTaAux = (token.pos & POS4) === 助動詞_タ ||
    token.dictionaryForm === "た" ||
    token.surface === "た";
  if (!isTaAux) {
    return false;
  }
  const pos5a = token.pos & POS5A;
  return pos5a === 終止形_ || pos5a === 連体形_;
}

export function isCopulaPredicateClose(token: { readonly pos: number }): boolean {
  const pos4 = token.pos & POS4;
  if (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス) {
    return false;
  }
  return (token.pos & POS5A) !== 連用形_;
}
