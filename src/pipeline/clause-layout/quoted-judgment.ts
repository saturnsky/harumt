
import { POS0, POS4, 助動詞, 助動詞_ダ, NOMINAL_BITS, pos0in } from "../../types/pos.js";
import { type ClauseTriviaToken, previousNonSpaceIndex } from "./trivia.js";

export interface QuotedJudgmentToken extends ClauseTriviaToken {
  readonly pos: number;
}

export interface QuotedJudgmentHeadResult {
  readonly hasCopula: boolean;
  readonly nominalHead: boolean;
}

export function quotedJudgmentHeadBeforeMarker<T extends QuotedJudgmentToken>(
  tokens: readonly T[],
  markerIdx: number,
  isPunctuationBoundary: (token: T) => boolean
): QuotedJudgmentHeadResult {
  let previous = previousNonSpaceIndex(tokens, markerIdx);
  let hasCopula: boolean;
  const previousToken = previous === null ? undefined : tokens[previous];
  if (previousToken !== undefined && isCopulaAuxPos(previousToken)) {
    hasCopula = true;
    previous = previous === null ? null : previousNonSpaceIndex(tokens, previous);
  } else {
    hasCopula = spanHasCopulaAuxBeforeMarker(tokens, markerIdx, isPunctuationBoundary);
  }
  const head = previous === null ? undefined : tokens[previous];
  return {
    hasCopula,
    nominalHead: head !== undefined && isNounishPos(head)
  };
}

function isCopulaAuxPos(token: QuotedJudgmentToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ);
}

function spanHasCopulaAuxBeforeMarker<T extends QuotedJudgmentToken>(
  tokens: readonly T[],
  markerIdx: number,
  isPunctuationBoundary: (token: T) => boolean
): boolean {
  for (let index = markerIdx - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isPunctuationBoundary(token)) {
      return false;
    }
    if (isCopulaAuxPos(token)) {
      return true;
    }
  }
  return false;
}

function isNounishPos(token: QuotedJudgmentToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0in(pos0, NOMINAL_BITS);
}
