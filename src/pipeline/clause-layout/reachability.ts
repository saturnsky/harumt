import { isClauseSpaceOrAdverbToken } from "./trivia.js";
import { POS0, POS01, 助詞, 名詞, 代名詞, 接頭辞, 接尾辞_名詞的, 連体詞, 助詞_格助詞, 助詞_係助詞, 助詞_副助詞, 助詞_終助詞 } from "../../types/pos.js";

export interface ArgumentReachabilityToken {
  readonly surface: string;
  readonly pos: number;
}

export type ArgumentPredicateReachMode = "direct" | "local" | "adverbial";

export function isAdverbialReachTransparentToken<Token extends ArgumentReachabilityToken>(
  token: Token
): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 === 名詞 || pos0 === 代名詞 || pos0 === 接頭辞 || pos0 === 連体詞) {
    return true;
  }
  if ((token.pos & POS01) === 接尾辞_名詞的) {
    return true;
  }
  return (token.pos & POS01) === 助詞_格助詞;
}

export function isPostposedAdverbialReachTransparentToken<Token extends ArgumentReachabilityToken>(
  token: Token
): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 === 名詞 || pos0 === 代名詞 || pos0 === 接頭辞 || pos0 === 連体詞) {
    return true;
  }
  if ((token.pos & POS01) === 接尾辞_名詞的 || (token.pos & POS01) === 助詞_終助詞) {
    return true;
  }
  if ((token.pos & POS0) === 助詞) {
    return true;
  }
  return isClauseSpaceOrAdverbToken(token);
}

export function isAdverbialFocusParticle<Token extends ArgumentReachabilityToken>(
  token: Token
): boolean {
  const pos01 = token.pos & POS01;
  if (pos01 === 助詞_係助詞) {
    return token.surface === "は" || token.surface === "も" || token.surface === "こそ";
  }
  if (pos01 === 助詞_副助詞) {
    return token.surface === "さえ" || token.surface === "すら";
  }
  return false;
}

export interface ArgumentPredicateReachability {
  readonly reaches: boolean;
  readonly mode: ArgumentPredicateReachMode;
  readonly argumentIdx: number;
  readonly predicateIdx: number;
  readonly skippedIndices: readonly number[];
  readonly blockerIdx: number | null;
  readonly blockerSurface: string | null;
}

export interface ArgumentPredicateReachOptions<Token extends ArgumentReachabilityToken> {
  readonly mode?: ArgumentPredicateReachMode;
  readonly extraTransparentToken?: (token: Token, idx: number) => boolean;
}

export function argumentPredicateReachability<Token extends ArgumentReachabilityToken>(
  tokens: readonly Token[],
  argumentIdx: number,
  predicateIdx: number,
  options: ArgumentPredicateReachOptions<Token> = {}
): ArgumentPredicateReachability {
  const mode = options.mode ?? "direct";
  const skippedIndices: number[] = [];
  if (predicateIdx <= argumentIdx) {
    return {
      reaches: false,
      mode,
      argumentIdx,
      predicateIdx,
      skippedIndices,
      blockerIdx: null,
      blockerSurface: null
    };
  }
  for (let idx = argumentIdx + 1; idx < predicateIdx; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      return blocked(mode, argumentIdx, predicateIdx, skippedIndices, idx, null);
    }
    if (isTransparentBetweenArgumentAndPredicate(token, idx, mode, options.extraTransparentToken)) {
      skippedIndices.push(idx);
      continue;
    }
    return blocked(mode, argumentIdx, predicateIdx, skippedIndices, idx, token.surface);
  }
  return {
    reaches: true,
    mode,
    argumentIdx,
    predicateIdx,
    skippedIndices,
    blockerIdx: null,
    blockerSurface: null
  };
}

export function argumentReachesPredicate<Token extends ArgumentReachabilityToken>(
  tokens: readonly Token[],
  argumentIdx: number,
  predicateIdx: number,
  options: ArgumentPredicateReachOptions<Token> = {}
): boolean {
  return argumentPredicateReachability(tokens, argumentIdx, predicateIdx, options).reaches;
}

function isTransparentBetweenArgumentAndPredicate<Token extends ArgumentReachabilityToken>(
  token: Token,
  idx: number,
  mode: ArgumentPredicateReachMode,
  extraTransparentToken: ((token: Token, idx: number) => boolean) | undefined
): boolean {
  if (isClauseSpaceOrAdverbToken(token)) {
    return true;
  }
  const pos0 = token.pos & POS0;
  if (mode === "local" && pos0 === 助詞 && LOCAL_FOCUS_PARTICLES.has(token.surface)) {
    return true;
  }
  if (mode === "adverbial" && isAdverbialReachTransparentToken(token)) {
    return true;
  }
  return extraTransparentToken?.(token, idx) === true;
}

function blocked(
  mode: ArgumentPredicateReachMode,
  argumentIdx: number,
  predicateIdx: number,
  skippedIndices: readonly number[],
  blockerIdx: number,
  blockerSurface: string | null
): ArgumentPredicateReachability {
  return {
    reaches: false,
    mode,
    argumentIdx,
    predicateIdx,
    skippedIndices,
    blockerIdx,
    blockerSurface
  };
}

const LOCAL_FOCUS_PARTICLES = new Set(["は", "も", "だけ"]);
