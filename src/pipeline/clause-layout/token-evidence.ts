import type { RuntimeHaruToken } from "../../types/token.js";
import { POS0, POS5A, 形容詞0, 終止形_, 助詞, 助動詞, 代名詞, 動詞, 名詞, 連体形_ } from "../../types/pos.js";
import type { ClauseToken } from "./layout-types.js";

export const NOUNISH_POS0_NUM: ReadonlySet<number> = new Set([名詞, 代名詞]);
export const SUBJECT_TOPIC_SURFACE = new Set(["が", "は", "も"]);

export function isFinitePredicateBoundaryLeft(token: ClauseToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 終止形_ || form === 連体形_;
}

export function clauseTokensAsRuntime(tokens: readonly ClauseToken[]): readonly RuntimeHaruToken[] {
  if (tokens.every(isRuntimeClauseToken)) {
    return tokens;
  }
  return tokens.map((token) => ({
    ...token,
    reading: "",
    dictionaryFormReading: "",
    dictionaryId: 0,
  }));
}

function isRuntimeClauseToken(token: ClauseToken): token is RuntimeHaruToken {
  const candidate = token as Partial<RuntimeHaruToken>;
  return (
    typeof candidate.reading === "string" &&
    typeof candidate.dictionaryFormReading === "string" &&
    typeof candidate.dictionaryId === "number"
  );
}

export function isClausePredicateEvidenceToken(
  token: ClauseToken,
  options: { readonly includeAuxiliary?: boolean } = {}
): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 動詞 || pos0 === 形容詞0 || (options.includeAuxiliary !== false && pos0 === 助動詞);
}

export function isSubjectTopicParticle(token: ClauseToken): boolean {
  return (token.pos & POS0) === 助詞 && SUBJECT_TOPIC_SURFACE.has(token.surface);
}

export function isNounishToken(token: ClauseToken): boolean {
  return NOUNISH_POS0_NUM.has(token.pos & POS0);
}
