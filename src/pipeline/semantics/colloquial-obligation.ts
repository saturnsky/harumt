import { auxHasNegativePolite, auxHasPast, auxIsPolite, collectAuxTokens, isAdjNai, isVerbLemma } from "../matchers.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { hasWeakPunctuationRelation } from "../head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { TokenCursor } from "../token-cursor.js";


import { POS0, POS01, POS012, POS4, POS5A, 仮定形_, 終止形_, 助詞, 助動詞_ナイ, 動詞, 補助記号, 名詞, pos0in, PREDICATE_BITS, 名詞_普通名詞_サ変可能, 助詞_終助詞 } from "../../types/pos.js";
export type NaitoBridgeKind = "nakya" | "naito";

type ColloquialObligationCursorToken = Pick<RuntimeHaruToken, "surface" | "dictionaryForm" | "pos">;


function isNaiPos(token: RuntimeHaruToken): boolean {
  const pos = token.pos;
  if ((pos & POS4) === 助動詞_ナイ) {
    return true;
  }
  if (isAdjNai(token)) {
    return true;
  }
  return false;
}

function isNakyaToken(token: RuntimeHaruToken): boolean {
  const pos = token.pos;
  if ((pos & POS5A) !== 仮定形_) {
    return false;
  }
  if (token.surface !== "なきゃ" && token.surface !== "なけりゃ") {
    return false;
  }
  return isNaiPos(token);
}

function isTerminalNaiToken(token: RuntimeHaruToken): boolean {
  const pos = token.pos;
  if ((pos & POS5A) !== 終止形_) {
    return false;
  }
  if (token.surface !== "ない") {
    return false;
  }
  return isNaiPos(token);
}

function isToParticle(tokens: readonly ColloquialObligationCursorToken[], index: number): boolean {
  return quoteMarkerRelationAt(tokens, index, { consumers: ["colloquial_obligation"] })?.canonicalSurface === "と" &&
    ((tokens[index]?.pos ?? 0) & POS0) === 助詞;
}

export function isObligationMarker(token: RuntimeHaruToken): boolean {
  const p0 = token.pos & POS0;
  if (p0 === 動詞 && (token.dictionaryForm === "いける" || token.dictionaryForm === "行く" || token.dictionaryForm === "なる")) {
    return true;
  }
  if (p0 === 名詞 && token.dictionaryForm === "だめ") {
    return true;
  }
  return false;
}

export function isConditionalFollower(cursor: TokenCursor<ColloquialObligationCursorToken>): boolean {
  if (cursor.pos >= cursor.end) {
    return false;
  }
  const next = cursor.current();
  if (next === undefined) {
    return false;
  }
  const np0 = next.pos & POS0;
  if (pos0in(np0, PREDICATE_BITS)) {
    return true;
  }
  if (
    np0 === 名詞 &&
    (next.pos & POS012) === 名詞_普通名詞_サ変可能 &&
    cursor.pos + 1 < cursor.end &&
    cursor.peek(1)?.dictionaryForm === "する" &&
    ((cursor.peek(1)?.pos ?? 0) & POS0) === 動詞
  ) {
    return true;
  }
  return false;
}



export function detectNaitoBridge(
  bridgeToken: RuntimeHaruToken | null | undefined,
  cursor: TokenCursor<ColloquialObligationCursorToken>
): readonly [NaitoBridgeKind, number] | null {
  if (bridgeToken === undefined || bridgeToken === null) {
    return null;
  }
  if (isNakyaToken(bridgeToken)) {
    return ["nakya", cursor.pos];
  }
  if (isTerminalNaiToken(bridgeToken)) {
    if (cursor.pos < cursor.end) {
      if (isToParticle(cursor.tokens, cursor.pos)) {
        return ["naito", cursor.pos + 1];
      }
    }
  }
  return null;
}

export function detectNaitoBridgeFromAux(
  auxTokens: readonly RuntimeHaruToken[] | null | undefined,
  cursor: TokenCursor<ColloquialObligationCursorToken>
): readonly [NaitoBridgeKind, number] | null {
  if (auxTokens === undefined || auxTokens === null || auxTokens.length === 0) {
    return null;
  }
  return detectNaitoBridge(auxTokens.at(-1), cursor);
}



function consumeTerminalSfp(cursor: TokenCursor<ColloquialObligationCursorToken>): true | null {
  if (cursor.pos >= cursor.end) {
    return true;
  }
  const token = cursor.current();
  if (token === undefined) {
    return null;
  }
  if ((token.pos & POS0) === 補助記号) {
    if (hasWeakPunctuationRelation(token, cursor.pos, ["colloquial_obligation"]) && cursor.pos + 1 < cursor.end) {
      return null;
    }
    return true;
  }
  if ((token.pos & POS01) !== 助詞_終助詞) {
    return null;
  }
  const nextPos = cursor.pos + 1;
  if (nextPos >= cursor.end || ((cursor.tokens[nextPos]?.pos ?? 0) & POS0) === 補助記号) {
    cursor.advance(1);
    return true;
  }
  return null;
}

export function matchObligationTail(cursor: TokenCursor<RuntimeHaruToken>): readonly [polite: boolean, past: boolean] | null {
  const start = cursor.pos;
  const n = cursor.end;
  if (consumeTerminalSfp(cursor) !== null) {
    return [false, false];
  }

  if (start >= n) {
    return null;
  }

  const token = cursor.current();
  if (token === undefined) {
    return null;
  }
  if ((token.pos & POS0) === 名詞 && token.dictionaryForm === "だめ") {
    const matched = cursor.lookahead(1, probe => {
      const aux = collectAuxTokens(probe);
      const terminalStart = probe.pos;
      if (consumeTerminalSfp(probe) === null) {
        return null;
      }
      return {
        aux,
        consumed: probe.pos - start,
        terminalConsumed: probe.pos - terminalStart
      };
    });
    if (matched === null || matched.terminalConsumed <= 0) {
      return null;
    }
    cursor.advance(matched.consumed);
    return [auxIsPolite(matched.aux), auxHasPast(matched.aux)];
  }

  if (!isVerbLemma(token, "いける", "行く", "なる")) {
    return null;
  }

  const auxMatch = cursor.lookahead(1, probe => {
    const aux = collectAuxTokens(probe);
    return { aux, afterAux: probe.pos };
  });
  const aux = auxMatch.aux;
  if (aux.length === 0) {
    return null;
  }
  const first = aux.at(0);
  const firstPos4 = (first?.pos ?? 0) & POS4;
  if (firstPos4 !== 助動詞_ナイ && !auxHasNegativePolite(aux)) {
    return null;
  }
  const terminalConsumed = cursor.lookahead(auxMatch.afterAux - cursor.pos, probe => {
    const terminalStart = probe.pos;
    return consumeTerminalSfp(probe) === null ? null : probe.pos - terminalStart;
  });
  if (terminalConsumed === null || terminalConsumed <= 0) {
    return null;
  }
  cursor.advance(auxMatch.afterAux + terminalConsumed - start);
  return [auxIsPolite(aux), auxHasPast(aux)];
}

export function matchTerminalNaitoAfterTo(cursor: TokenCursor<ColloquialObligationCursorToken>): true | null {
  return consumeTerminalSfp(cursor);
}
