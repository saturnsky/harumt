import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { isAdjNai } from "../../../../matchers.js";
import {
  POS0,
  POS4,
  POS5A,
  動詞,
  助動詞_デス,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_マス,
  助動詞_タ,
  意志推量形_,
  未然形_,
  終止形_,
  連体形_,
  連用形_
} from "../../../../../types/pos.js";
import { isAruVerbToken, isSplitPoliteNegationEndingAt } from "../classifiers/tokens.js";

export interface NegationEndingMatch {
  readonly polite: boolean;
  readonly consumed: number;
  readonly startsWithMasen?: boolean;
  readonly conjecture?: boolean;
}

interface NegationEndingOptions {
  readonly allowAttributive?: boolean;
  readonly allowConjecture?: boolean;
}

export function matchNegationEnding(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  options: NegationEndingOptions = {}
): NegationEndingMatch | null {
  const t0 = tokens[pos];
  if (t0 === undefined) return null;

  if (isSplitPoliteNegationEndingAt(tokens, pos)) {
    return { polite: true, consumed: 2, startsWithMasen: true };
  }

  if (isAruOrGozaruPoliteNegativeSupportToken(t0)) {
    const t0pos5A = t0.pos & POS5A;
    if (t0pos5A === 連用形_) {
      const t1 = tokens[pos + 1];
      const t2 = tokens[pos + 2];
      if (
        t1?.dictionaryForm === "ます" && (t1.pos & POS4) === 助動詞_マス &&
        t2?.dictionaryForm === "ぬ" && (t2.pos & POS4) === 助動詞_ヌ
      ) {
        return { polite: true, consumed: 3, startsWithMasen: false };
      }
    }
  }

  if (isAdjNai(t0)) {
    const t0pos5A = t0.pos & POS5A;
    if (options.allowConjecture === true && t0pos5A === 意志推量形_) {
      return { polite: false, consumed: 1, startsWithMasen: false, conjecture: true };
    }
    const allowed =
      t0pos5A === 終止形_ ||
      t0pos5A === 連用形_ ||
      (options.allowAttributive === true && t0pos5A === 連体形_);
    if (allowed) {
      const t1 = tokens[pos + 1];
      if (
        (t1?.dictionaryForm === "です" || t1?.surface === "っす") &&
        (t1.pos & POS4) === 助動詞_デス
      ) {
        const t1pos5A = t1.pos & POS5A;
        if (t1pos5A === 終止形_ || t1pos5A === 連用形_) {
          return { polite: true, consumed: 2, startsWithMasen: false };
        }
      }
      return { polite: false, consumed: 1, startsWithMasen: false };
    }
  }

  if (
    (t0.dictionaryForm === "ない" && (t0.pos & POS4) === 助動詞_ナイ) ||
    (t0.dictionaryForm === "ぬ" && (t0.pos & POS4) === 助動詞_ヌ)
  ) {
    const t0pos5A = t0.pos & POS5A;
    if (options.allowConjecture === true && t0pos5A === 意志推量形_) {
      return { polite: false, consumed: 1, startsWithMasen: false, conjecture: true };
    }
    if (
      t0pos5A === 終止形_ ||
      t0pos5A === 連用形_ ||
      (options.allowAttributive === true && t0pos5A === 連体形_)
    ) {
      return { polite: false, consumed: 1, startsWithMasen: false };
    }
  }

  return null;
}

export function consumeNegationEnding(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: NegationEndingOptions = {}
): NegationEndingMatch | null {
  const match = matchNegationEnding(cursor.tokens, cursor.pos, options);
  if (match === null) {
    return null;
  }
  cursor.advance(match.consumed);
  return match;
}

function isAruOrGozaruPoliteNegativeSupportToken(token: RuntimeHaruToken): boolean {
  if (isAruVerbToken(token)) {
    return true;
  }
  return (token.pos & POS0) === 動詞 &&
    (token.dictionaryForm || token.surface) === "ござる";
}

function matchForbiddenNegationEnding(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly polite: boolean; readonly past: boolean; readonly consumed: number; readonly startsWithMasen: boolean } | null {
  const t0 = tokens[pos];
  if (t0 === undefined) {
    return null;
  }
  if ((t0.pos & POS4) === 助動詞_マス) {
    const t0pos5A = t0.pos & POS5A;
    const t1 = tokens[pos + 1];
    if (
      t0pos5A === 未然形_ &&
      t1 !== undefined &&
      (t1.pos & POS4) === 助動詞_ヌ
    ) {
      return { polite: true, past: false, consumed: 2, startsWithMasen: true };
    }
  }
  if ((t0.pos & POS4) === 助動詞_ナイ || (t0.pos & POS4) === 助動詞_ヌ) {
    const t0pos5A = t0.pos & POS5A;
    if (
      t0pos5A === 終止形_ ||
      t0pos5A === 連体形_ ||
      t0pos5A === 連用形_
    ) {
      const t1 = tokens[pos + 1];
      if (t1?.dictionaryForm === "です" && (t1.pos & POS4) === 助動詞_デス) {
        return { polite: true, past: false, consumed: 2, startsWithMasen: false };
      }
      if (t1?.dictionaryForm === "た" && (t1.pos & POS4) === 助動詞_タ) {
        return { polite: false, past: true, consumed: 2, startsWithMasen: false };
      }
      return { polite: false, past: false, consumed: 1, startsWithMasen: false };
    }
  }
  const adjNeg = matchNegationEnding(tokens, pos, { allowAttributive: true });
  return adjNeg === null
    ? null
    : { polite: adjNeg.polite, past: false, consumed: adjNeg.consumed, startsWithMasen: false };
}


export interface ForbiddenNegationEndingMatch {
  readonly polite: boolean;
  readonly past: boolean;
  readonly consumed: number;
  readonly startsWithMasen: boolean;
}

export function matchForbiddenNegationEndingAfterBody(
  tokens: readonly RuntimeHaruToken[],
  bodyPos: number
): ForbiddenNegationEndingMatch | null {
  const body = tokens[bodyPos];
  if (body === undefined) return null;
  const negEnd = matchForbiddenNegationEnding(tokens, bodyPos + 1);
  if (negEnd === null) return null;
  const bodyPos5A = body.pos & POS5A;
  return bodyPos5A === 未然形_ || (negEnd.startsWithMasen && bodyPos5A === 連用形_) ? negEnd : null;
}
