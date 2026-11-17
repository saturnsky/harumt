
import { POS0, 形状詞, 形容詞0 } from "../types/pos.js";
import { isClausePunctuationToken } from "./clause-layout/punctuation.js";

export interface ReasonSourceToken {
  readonly pos: number;
  readonly surface: string;
  readonly dictionaryForm: string;
}

const STRICT_REASON_FINAL_SURFACES = new Set(["た"]);
const STRICT_REASON_FINAL_DICTIONARY_FORMS = new Set(["た", "ある", "有る", "いる", "居る"]);

function previousContentTokenIndex(
  tokens: readonly ReasonSourceToken[],
  start: number,
  lowerBoundInclusive: number,
): number | null {
  for (let index = start; index >= lowerBoundInclusive; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isClausePunctuationToken(token)) {
      continue;
    }
    return index;
  }
  return null;
}

export function precedingTokenOpensStrictReason(
  tokens: readonly ReasonSourceToken[],
  beforeIndex: number,
  lowerBoundInclusive: number,
): boolean {
  const previousIndex = previousContentTokenIndex(tokens, beforeIndex, lowerBoundInclusive);
  if (previousIndex === null) {
    return false;
  }
  const previous = tokens[previousIndex];
  if (previous === undefined) {
    return false;
  }
  const pos0 = previous.pos & POS0;
  if (pos0 === 形容詞0 || pos0 === 形状詞) {
    return true;
  }
  const dictionaryForm = previous.dictionaryForm || previous.surface;
  if (STRICT_REASON_FINAL_SURFACES.has(previous.surface) || STRICT_REASON_FINAL_DICTIONARY_FORMS.has(dictionaryForm)) {
    return true;
  }
  if (previous.surface === "な" && dictionaryForm === "だ") {
    return true;
  }
  return false;
}
