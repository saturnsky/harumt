import { isParticleSurface, isVerbLemma, type MatcherToken } from "../matchers.js";
import type { LookupTables } from "../lookup-tables.js";
import { teDeContinuationRelationAt } from "../head-tail/tail/postverb-tail-classifier.js";
import { matchYouNiPredicateProjectionConnectiveAt } from "../head-tail/tail/predicate-root/matchers/predicate-projection-connective.js";
import { isTerminalNeSfpSurface, isTerminalYoSfpSurface } from "./sfp-surface.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { quoteStructuralRelationsForHost } from "../structural-relation/quote.js";
import { TokenCursor } from "../token-cursor.js";
import {
  POS0,
  POS1,
  POS5A,
  助詞,
  助動詞,
  接続助詞,
  接頭辞,
  動詞,
  補助記号,
  命令形_,
  名詞
} from "../../types/pos.js";

export interface RequestEvidenceToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

export function requestOrImperativeExpressionAfter(
  cursor: TokenCursor<RequestEvidenceToken>,
  lookups: LookupTables,
  options: {
    readonly allowLeadingWeakPunctuation?: boolean;
    readonly limit?: number;
  } = {}
): boolean {
  const end = Math.min(cursor.end, options.limit ?? cursor.end);
  let index = skipRequestEvidencePrelude(cursor, end, options.allowLeadingWeakPunctuation === true);
  while (index < end) {
    const token = cursor.tokens[index];
    if (token === undefined) {
      return false;
    }
    if ((token.pos & POS0) === 補助記号) {
      return false;
    }
    if ((token.pos & POS5A) === 命令形_) {
      return true;
    }
    if (token.dictionaryForm === "願う" || token.dictionaryForm === "お願い") {
      return true;
    }
    if (cursor.lookahead(index - cursor.pos, c => honorificKudasaiRequestAt(c, lookups, end))) {
      return true;
    }
    if (cursor.lookahead(index - cursor.pos, c => terminalFormulaicWishYouniAt(c, lookups, end))) {
      return true;
    }
    if ((token.pos & POS0) === 動詞) {
      const tailPos = cursor.lookahead(index + 1 - cursor.pos, c => auxChainEndAfter(c, end));
      if (tailPos + 1 < end && cursor.lookahead(tailPos - cursor.pos, c => c.tryParse(matchTeKudasaiChain)) !== undefined) {
        return true;
      }
      const relation = teDeContinuationRelationAt(cursor.tokens, tailPos, {
        consumers: ["clause_layout"],
        lookups
      });
      if (relation?.continuationKind === "request" || relation?.continuationKind === "prohibition") {
        return true;
      }
      if (cursor.lookahead(index - cursor.pos, c => teFormRequestEllipsisAfter(c, end, lookups))) {
        return true;
      }
    }
    index += 1;
  }
  return false;
}

function skipRequestEvidencePrelude(
  cursor: TokenCursor<RequestEvidenceToken>,
  end: number,
  allowLeadingWeakPunctuation: boolean
): number {
  let index = cursor.pos;
  while (index < end) {
    const token = cursor.tokens[index];
    if (token === undefined) {
      return index;
    }
    if (allowLeadingWeakPunctuation && (token.pos & POS0) === 補助記号 && token.surface === "、") {
      index += 1;
      continue;
    }
    return index;
  }
  return index;
}

function honorificKudasaiRequestAt(
  cursor: TokenCursor<RequestEvidenceToken>,
  lookups: LookupTables,
  end: number
): boolean {
  const { tokens, pos } = cursor;
  const prefix = tokens[pos];
  if (
    prefix === undefined ||
    (prefix.pos & POS0) !== 接頭辞 ||
    (prefix.surface !== "お" && prefix.surface !== "ご")
  ) {
    return false;
  }
  const host = tokens[pos + 1];
  const kudasai = tokens[pos + 2];
  if (host === undefined || kudasai === undefined || pos + 2 >= end) {
    return false;
  }
  if ((kudasai.pos & (POS0 | POS5A)) !== (動詞 | 命令形_)) {
    return false;
  }
  if (!lookups.KUDASARU_FORMS.has(kudasai.dictionaryForm) && !lookups.KUDASARU_FORMS.has(kudasai.surface)) {
    return false;
  }
  const hostPos0 = host.pos & POS0;
  return hostPos0 === 動詞 || hostPos0 === 名詞;
}

function auxChainEndAfter(
  cursor: TokenCursor<RequestEvidenceToken>,
  end: number
): number {
  let index = cursor.pos;
  while (index < end) {
    const token = cursor.tokens[index];
    if (token === undefined || (token.pos & POS0) !== 助動詞) {
      return index;
    }
    index += 1;
  }
  return index;
}

function terminalFormulaicWishYouniAt(
  cursor: TokenCursor<RequestEvidenceToken>,
  lookups: LookupTables,
  end: number
): boolean {
  const { tokens, pos } = cursor;
  const match = matchYouNiPredicateProjectionConnectiveAt(tokens, pos, { requireEnd: true, lookups });
  return match !== null &&
    match.connective === "predicate_projection_wish_terminal" &&
    pos + match.consumed <= end;
}

function teFormRequestEllipsisAfter(
  cursor: TokenCursor<RequestEvidenceToken>,
  end: number,
  lookups: LookupTables
): boolean {
  const { tokens, pos: verbIdx } = cursor;
  if (predicateHostsPrecedingQuotedContent(tokens as readonly RuntimeHaruToken[], verbIdx, lookups)) {
    return false;
  }
  const te = tokens[verbIdx + 1];
  if (te === undefined || (te.pos & POS0) !== 助詞 || (te.surface !== "て" && te.surface !== "で")) {
    return false;
  }
  cursor.advance(2);
  while (cursor.pos < end) {
    const token = tokens[cursor.pos];
    if (token === undefined) {
      cursor.advance();
      continue;
    }
    if ((token.pos & POS0) === 補助記号) {
      return true;
    }
    if ((token.pos & POS0) === 助詞 && ((token.pos & POS1) !== 接続助詞 || isTerminalNeSfpSurface(token.surface) || isTerminalYoSfpSurface(token.surface))) {
      cursor.advance();
      continue;
    }
    return false;
  }
  return true;
}

function predicateHostsPrecedingQuotedContent(
  tokens: readonly RuntimeHaruToken[],
  predicateIdx: number,
  lookups: LookupTables
): boolean {
  return quoteStructuralRelationsForHost(
    new TokenCursor(tokens, predicateIdx, tokens.length),
    lookups
  ).some(({ quote }) => quote.contentSpan.endExclusive <= predicateIdx);
}


export function matchTeKudasaiChain(cursor: TokenCursor<MatcherToken>): boolean | undefined {
  if (cursor.pos + 1 >= cursor.end) {
    return undefined;
  }
  const connector = cursor.current();
  if (connector === undefined || !isParticleSurface(connector, "て", "で")) {
    return undefined;
  }
  const next = cursor.peek(1);
  if (next === undefined) {
    return undefined;
  }
  if (isVerbLemma(next, "くださる", "下さる")) {
    if ((next.pos & POS5A) !== 命令形_) return undefined;
    cursor.advance(2);
    return true;
  }
  if (next.dictionaryForm === "ちょうだい") {
    cursor.advance(2);
    return false;
  }
  return undefined;
}
