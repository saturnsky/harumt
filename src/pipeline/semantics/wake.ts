

import type { LookupTables } from "../lookup-tables.js";
import { collectAuxTokens, isVerbLemma, type MatcherToken } from "../matchers.js";
import { matchFollowingConnective } from "../rules/connective-helpers.js";
import { TokenCursor } from "../token-cursor.js";
import { isWakeToken, matchWakeImpossibleTail, matchWakeNegativeTail } from "../rules/wake-helpers.js";
import { matchScopeDoubleNegationOuter } from "../rules/common.js";
import { caseParticleMarkerRelationForToken, copulaDeMarkerRelationForToken, registeredClauseConnectiveRelationForToken } from "../head-tail/boundary/marker.js";
import { hasWeakPunctuationClass } from "../head-tail/boundary/punctuation.js";

import { isTerminalParticleToken, POS0, POS4, POS5A, 格助詞, 助詞, 助動詞_ダ, 助動詞_デス, 接続助詞, 補助記号, 意志推量形_ } from "../../types/pos.js";

function matchExplanatoryWakedeTail(cursor: TokenCursor<MatcherToken>): true | null {
  if (cursor.pos + 1 >= cursor.end) {
    return null;
  }
  const wakeTok = cursor.current();
  const deTok = cursor.peek(1);
  if (wakeTok === undefined || !isWakeToken(wakeTok)) {
    return null;
  }
  if (
    copulaDeMarkerRelationForToken(deTok, cursor.pos + 1, {
      consumers: ["wake_semantics"]
    }) === null &&
    caseParticleMarkerRelationForToken(deTok, cursor.pos + 1, {
      acceptedSurfaces: ["で"],
      consumers: ["wake_semantics"]
    }) === null
  ) {
    return null;
  }
  const nextPos = cursor.pos + 2;
  if (nextPos >= cursor.end) {
    return null;
  }
  const nextTok = cursor.tokens[nextPos];
  if (nextTok?.surface === "は" || nextTok?.surface === "も") {
    return null;
  }
  if (nextTok !== undefined && isVerbLemma(nextTok, "ある")) {
    return null;
  }
  if (
    ((nextTok?.pos ?? 0) & POS0) === 補助記号 &&
    !hasWeakPunctuationClass(nextTok, nextPos, ["japanese_comma"], ["wake_semantics"])
  ) {
    return null;
  }
  cursor.advance(2);
  return true;
}

function matchExplanatoryWakedakaraTail(cursor: TokenCursor<MatcherToken>): true | null {
  if (cursor.pos + 2 >= cursor.end) {
    return null;
  }
  const wakeTok = cursor.current();
  if (wakeTok === undefined || !isWakeToken(wakeTok)) {
    return null;
  }
  const auxMatch = cursor.lookahead(1, c => {
    const aux = collectAuxTokens(c);
    return { aux, afterAux: c.pos };
  });
  const aux = auxMatch.aux;
  if (aux.length === 0) {
    return null;
  }
  const copTok = aux[0];
  const copDf = copTok?.dictionaryForm;
  const copP4 = ((copTok?.pos ?? 0) & POS4);
  if (copDf !== "だ" && copDf !== "です" && copP4 !== 助動詞_ダ && copP4 !== 助動詞_デス) {
    return null;
  }
  const karaPos = auxMatch.afterAux;
  const karaTok = cursor.tokens[karaPos];
  if (karaPos >= cursor.end || registeredClauseConnectiveRelationForToken(karaTok, karaPos, {
    acceptedSurfaces: ["から"],
    acceptedParticleSubtypes: [接続助詞, 格助詞],
    consumers: ["wake_semantics"]
  }) === null) {
    return null;
  }
  cursor.advance(karaPos + 1 - cursor.pos);
  return true;
}

function matchExplanatoryWakedaTail(
  cursor: TokenCursor<MatcherToken>,
  lookups: LookupTables
): readonly [auxTokens: readonly MatcherToken[], connectiveEnding: string | null] | null {
  return cursor.tx((cursor) => {
    if (cursor.pos + 1 >= cursor.end) {
      return null;
    }
    const wakeTok = cursor.current();
    if (wakeTok === undefined || !isWakeToken(wakeTok)) {
      return null;
    }
    cursor.advance();
    const aux = collectAuxTokens(cursor);
    if (aux.length === 0) {
      return null;
    }
    const copTok = aux[0];
    const copDf = copTok?.dictionaryForm;
    const copP4 = ((copTok?.pos ?? 0) & POS4);
    if (copDf !== "だ" && copDf !== "です" && copP4 !== 助動詞_ダ && copP4 !== 助動詞_デス) {
      return null;
    }
    if (((copTok?.pos ?? 0) & POS5A) === 意志推量形_) {
      return null;
    }
    const nextTok = cursor.current();
    if (nextTok === undefined) {
      return [aux, null];
    }
    if (registeredClauseConnectiveRelationForToken(nextTok, cursor.pos, {
      acceptedSurfaces: ["から"],
      acceptedParticleSubtypes: [接続助詞, 格助詞],
      consumers: ["wake_semantics"]
    }) !== null) {
      return null;
    }
    if ((nextTok.pos & POS0) === 補助記号) {
      return [aux, null];
    }
    if (isTerminalParticleToken(nextTok)) {
      return [aux, null];
    }
    const ending = lookups.DEARU_CONN_ENDINGS.get(nextTok?.surface ?? "");
    if (ending === undefined || (nextTok?.pos & POS0) !== 助詞) {
      return null;
    }
    cursor.advance();
    return [aux, ending];
  });
}

function matchWakeNaiTail(
  cursor: TokenCursor<MatcherToken>,
  lookups: LookupTables
): readonly [auxTokens: readonly MatcherToken[], connective: string | null] | null {
  return cursor.tx((cursor) => {
    const wake = cursor.current();
    if (wake === undefined || !isWakeToken(wake)) {
      return null;
    }
    cursor.advance();
    const maybeGa = cursor.current();
    if (maybeGa !== undefined && maybeGa.surface === "が" && (maybeGa.pos & POS0) === 助詞) {
      cursor.advance();
    }
    const aux = matchWakeNegativeTail(cursor);
    if (aux === null) {
      return null;
    }
    const connEnding = matchFollowingConnective(cursor, lookups, { includeWakeTailMarkers: true });
    return [aux, connEnding];
  });
}

export function wakeFrameOwnsHeadAt(
  tokens: readonly MatcherToken[],
  headIdx: number,
  lookups: LookupTables
): boolean {
  const head = tokens[headIdx];
  if (head === undefined || !isWakeToken(head)) {
    return false;
  }
  const cursor = new TokenCursor(tokens, headIdx, tokens.length);
  return cursor.tx(c => matchWakeImpossibleTail(c, lookups)) !== null ||
    cursor.tx(c => matchWakeNaiTail(c, lookups)) !== null ||
    cursor.tx(c => matchScopeDoubleNegationOuter(c)?.[0]) === "ワケ" ||
    cursor.tx(c => matchExplanatoryWakedaTail(c, lookups)) !== null ||
    cursor.tx(c => matchExplanatoryWakedakaraTail(c)) !== null ||
    cursor.tx(c => matchExplanatoryWakedeTail(c)) !== null ||
    isConjecturalWakeCopulaHead(tokens, headIdx);
}

function isConjecturalWakeCopulaHead(tokens: readonly MatcherToken[], headIdx: number): boolean {
  const cursor = new TokenCursor(tokens, headIdx, tokens.length);
  cursor.advance();
  const aux = collectAuxTokens(cursor);
  const copula = aux[0];
  if (copula === undefined) {
    return false;
  }
  const dictionaryForm = copula.dictionaryForm;
  const pos4 = copula.pos & POS4;
  if (dictionaryForm !== "だ" && dictionaryForm !== "です" && pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス) {
    return false;
  }
  return (copula.pos & POS5A) === 意志推量形_;
}
