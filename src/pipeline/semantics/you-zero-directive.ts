import type { RuntimeHaruToken } from "../../types/token.js";
import type { BoundaryToken } from "../head-tail/boundary/punctuation.js";
import type { LookupTables } from "../lookup-tables.js";
import { TokenCursor } from "../token-cursor.js";
import {
  hasArgumentFrameBeforeSupportedClauseContinuation
} from "../head-tail/boundary/clause-start.js";
import {
  isBoundaryPunctuationCategoryToken
} from "../head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { isSupportedClauseStart } from "../head-tail/tail/predicate-root/integration/readiness.js";
import { matrixPredicateReach, skipMatrixFrameTrivia } from "../head-tail/boundary/modifier-field.js";

import {
  isNegativeAuxiliaryPos,
  isPastAuxiliaryPos,
  isSahenLightVerbToken,
  isSahenVerbalizableNominalOrCompound,
  POS0,
  POS01,
  POS4,
  助詞,
  助詞_終助詞,
  助動詞,
  助動詞_ジャ,
  助動詞_ダ,
  助動詞_デス,
  動詞,
} from "../../types/pos.js";
export function youZeroDirectivePredicateKey(
  cursor: TokenCursor<BoundaryToken>,
  lookups: LookupTables
): string | null {
  if (cursor.pos >= cursor.end) {
    return null;
  }
  const token = cursor.current();
  if (token === undefined) {
    return null;
  }
  if ((token.pos & POS0) === 動詞) {
    return token.dictionaryForm ?? null;
  }
  const light = cursor.peek(1);
  if (
    isSahenVerbalizableNominalOrCompound(token) &&
    cursor.pos + 1 < cursor.end &&
    light !== undefined &&
    (isSahenLightVerbToken(light) || ((light.pos & POS0) === 動詞 &&
      lookups.HONORIFIC_SAHEN_LIGHT_VERBS.has(light.dictionaryForm ?? "")))
  ) {
    const noun = token.dictionaryForm || token.surface;
    return noun.length > 0 ? `${noun}する` : null;
  }
  return null;
}

export function isYouZeroDirectivePredicateStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const key = youZeroDirectivePredicateKey(cursor, lookups);
  return key !== null && lookups.YOU_ZERO_DIRECTIVE_PREDICATES.has(key);
}

export function isYouNiQuoteDirectivePredicateStart(
  cursor: TokenCursor<BoundaryToken>,
  lookups: LookupTables
): boolean {
  const key = youZeroDirectivePredicateKey(cursor, lookups);
  return key !== null && lookups.YOU_NI_QUOTE_DIRECTIVE_PREDICATES.has(key);
}

export function hasYouZeroPressureTail(cursor: TokenCursor<RuntimeHaruToken>, lookups: LookupTables): boolean {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const n = cursor.end;
  const limit = Math.min(n, pos + 8);
  for (let index = pos; index < Math.max(pos, limit - 2); index += 1) {
    const token = tokens[index];
    if (token === undefined || !lookups.YOU_ZERO_PRESSURE_OBJECT_NOUNS.has(token.dictionaryForm)) {
      continue;
    }
    if (tokens[index + 1]?.surface !== "を" || ((tokens[index + 1]?.pos ?? 0) & POS0) !== 助詞) {
      continue;
    }
    const verb = tokens[index + 2];
    if (verb !== undefined && (verb.pos & POS0) === 動詞 && lookups.YOU_ZERO_PRESSURE_VERBS.has(verb.dictionaryForm)) {
      return true;
    }
  }
  return false;
}


export function admitsYouZeroDirectiveHostEnd(token: { readonly pos: number } | undefined): boolean {
  return token !== undefined && !isPastAuxiliaryPos(token.pos);
}

export function isNegativePurposeFragmentHostEnd(token: { readonly pos: number } | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 助動詞 && isNegativeAuxiliaryPos(token.pos);
}

function isZeroNiPurposeBlockedFollower(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return true;
  }
  const punctuation: boolean = isBoundaryPunctuationCategoryToken(token);
  if (punctuation) {
    return false;
  }
  if (token.surface === "な" || token.surface === "なら") {
    return true;
  }
  const pos4 = token.pos & POS4;
  if (pos4 === 助動詞_ダ || pos4 === 助動詞_デス || pos4 === 助動詞_ジャ) {
    return true;
  }
  if ((token.pos & POS01) === 助詞_終助詞) {
    return true;
  }
  if (token.surface === "の" && (token.pos & POS0) === 助詞) {
    return true;
  }
  if (quoteMarkerRelationAt(tokens, idx, { consumers: ["tail_multi_clause"] }) !== null) {
    return true;
  }
  return token.surface === "に" && ((token.pos & POS0) === 助動詞 || (token.pos & POS0) === 助詞);
}

export function hasYouZeroDirectiveMatrixPredicateAhead(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const { tokens } = cursor;
  const hostEnd = tokens[cursor.pos - 2];
  if (!admitsYouZeroDirectiveHostEnd(hostEnd)) {
    return false;
  }
  const follower = cursor.fork(cursor.pos, cursor.end, cursor.pos);
  const start = follower.pos;
  if (start >= cursor.end || isZeroNiPurposeBlockedFollower(tokens, start)) {
    return false;
  }
  if (hasYouZeroPressureTail(cursor, lookups)) {
    return true;
  }
  const reach = matrixPredicateReach(cursor, start, {
    registeredPredicateStart: (tokens_, idx) =>
      isYouZeroDirectivePredicateStart(cursor.fork(idx, cursor.end, idx), lookups),
    openPredicateStart: (tokens_, idx) => isSupportedClauseStart(tokens_, idx, lookups)
  });
  if (reach === "predicate") {
    return true;
  }
  const frameStart = skipMatrixFrameTrivia(tokens, start, cursor.end);
  if (
    frameStart < cursor.end &&
    hasArgumentFrameBeforeSupportedClauseContinuation(
      tokens,
      frameStart,
      cursor.end,
      (candidates, idx) => isSupportedClauseStart(candidates, idx, lookups),
      lookups
    )
  ) {
    return true;
  }
  return reach === "consequentless" && isNegativePurposeFragmentHostEnd(hostEnd);
}
