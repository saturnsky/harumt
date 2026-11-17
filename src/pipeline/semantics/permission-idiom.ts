import { POS0, POS1, POS4, POS5, POS5A, POS01, 形容詞0, 意志推量形_, 終止形_, 助詞, 助動詞, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 動詞, 助詞_接続助詞, 文語助動詞_ズ, 未然形_, 補助記号, 終助詞, 連用形_促音便 } from "../../types/pos.js";
import { predicateNominalizerRelationForToken } from "../head-tail/boundary/marker.js";
import {
  isHardTerminalPunctuationToken,
  isTrailingPunctuationToken
} from "../head-tail/boundary/punctuation.js";


export type PermissionPredicateVariant = "ii" | "kamawanai";

interface PermissionToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

const PERMISSION_GOOD_LEMMAS = new Set(["いい", "良い", "よい", "好い"]);

export function isPermissionGoodToken(token: PermissionToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 形容詞0) {
    return false;
  }
  return PERMISSION_GOOD_LEMMAS.has(token.surface) ||
    PERMISSION_GOOD_LEMMAS.has(token.dictionaryForm);
}

export function isPastGoodEvaluationPredicateAt(
  tokens: readonly PermissionToken[],
  pos: number
): boolean {
  const good = tokens[pos];
  const past = tokens[pos + 1];
  return good !== undefined && past !== undefined && (good.pos & (POS0 | POS5)) === (形容詞0 | 連用形_促音便) && (PERMISSION_GOOD_LEMMAS.has(good.surface) || PERMISSION_GOOD_LEMMAS.has(good.dictionaryForm)) && (past.pos & (POS0 | POS4)) === (助動詞 | 助動詞_タ);
}

function matchPermissionKamawanai(
  tokens: readonly PermissionToken[],
  pos: number
): { readonly consumed: number } | null {
  const kama = tokens[pos];
  if (
    kama === undefined || (kama.pos & (POS0 | POS5A)) !== (動詞 | 未然形_) || kama.dictionaryForm !== "構う" && kama.dictionaryForm !== "かまう"
  ) {
    return null;
  }
  const neg = tokens[pos + 1];
  if (
    neg === undefined || (neg.pos & (POS0 | POS5A)) !== (助動詞 | 終止形_) || neg.dictionaryForm !== "ない" && neg.dictionaryForm !== "無い"
  ) {
    return null;
  }
  return { consumed: 2 };
}

export function isBaSufficiencyConditionalAt(
  tokens: readonly PermissionToken[],
  baIdx: number
): boolean {
  const ba = tokens[baIdx];
  if (
    ba === undefined || ba.surface !== "ば" || (ba.pos & POS01) !== 助詞_接続助詞
  ) {
    return false;
  }
  if (isNegationHostToken(tokens[baIdx - 1])) {
    return false;
  }
  if (!isPermissionGoodToken(tokens[baIdx + 1])) {
    return false;
  }
  return isSufficiencyTerminalFollower(tokens, baIdx + 2);
}

function isNegationHostToken(token: PermissionToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos4 = token.pos & POS4;
  if (pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ || pos4 === 文語助動詞_ズ) {
    return true;
  }
  return (token.pos & POS0) === 形容詞0 &&
    (token.dictionaryForm === "ない" || token.dictionaryForm === "無い");
}

function isSufficiencyTerminalFollower(
  tokens: readonly PermissionToken[],
  idx: number
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return true;
  }
  if (isUtteranceClosingFollowerToken(token)) {
    return true;
  }
  if (isUtteranceClosingConjectureCopulaAt(tokens, idx)) {
    return true;
  }
  if (predicateNominalizerRelationForToken(token, idx, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  })?.nominalizerKind !== "no") {
    return false;
  }
  const afterNoda = tokens[idx + 1];
  if (afterNoda === undefined || isUtteranceClosingFollowerToken(afterNoda)) {
    return true;
  }
  if (isUtteranceClosingConjectureCopulaAt(tokens, idx + 1)) {
    return true;
  }
  if ((afterNoda.pos & POS0) !== 助動詞 || (afterNoda.pos & POS5A) !== 終止形_) {
    return false;
  }
  const pos4 = afterNoda.pos & POS4;
  if (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス) {
    return false;
  }
  const afterCopula = tokens[idx + 2];
  return afterCopula === undefined || isUtteranceClosingFollowerToken(afterCopula);
}

function isUtteranceClosingConjectureCopulaAt(
  tokens: readonly PermissionToken[],
  idx: number
): boolean {
  const token = tokens[idx];
  if (
    token === undefined ||
    (token.pos & POS0) !== 助動詞 ||
    (token.pos & POS5A) !== 意志推量形_
  ) {
    return false;
  }
  const pos4 = token.pos & POS4;
  if (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス) {
    return false;
  }
  const after = tokens[idx + 1];
  return after === undefined || isUtteranceClosureAfterConjectureCopula(after);
}

function isUtteranceClosureAfterConjectureCopula(token: PermissionToken): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 === 助詞 && (token.pos & POS1) === 終助詞) {
    return true;
  }
  const boundaryToken = { surface: token.surface, dictionaryForm: token.dictionaryForm, pos: token.pos };
  return isHardTerminalPunctuationToken(boundaryToken) || isTrailingPunctuationToken(boundaryToken);
}

function isUtteranceClosingFollowerToken(token: PermissionToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 補助記号 || (pos0 === 助詞 && (token.pos & POS1) === 終助詞);
}

export function matchPermissionPredicateAt(
  tokens: readonly PermissionToken[],
  pos: number
): { readonly variant: PermissionPredicateVariant; readonly consumed: number } | null {
  const good = isPermissionGoodToken(tokens[pos])
    ? { variant: "ii" as const, consumed: 1 }
    : null;
  const kamawanai = good === null
    ? matchPermissionKamawanai(tokens, pos)
    : null;
  return good ?? (kamawanai === null
    ? null
    : { variant: "kamawanai" as const, consumed: kamawanai.consumed });
}
