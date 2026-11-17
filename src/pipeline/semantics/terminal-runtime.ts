
import type { RuntimeHaruToken } from "../../types/token.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import {
  isHardTerminalPunctuationToken,
  isTerminalishPunctuationToken
} from "../head-tail/boundary/punctuation.js";
import type { TokenCursor } from "../token-cursor.js";

import { POS0, 補助記号 } from "../../types/pos.js";
type TerminalRuntimeToken = Pick<RuntimeHaruToken, "surface" | "pos">;

export function terminalPunctSurface(cursor: TokenCursor<TerminalRuntimeToken>): string | null {
  const i = nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end) ?? cursor.end;
  if (i >= cursor.end) {
    return null;
  }
  const tok = cursor.tokens[i];
  if (tok === undefined) {
    return null;
  }
  if (!isHardTerminalPunctuationToken(tok)) {
    return null;
  }
  return tok.surface;
}

export function hasTerminalSentenceMark(cursor: TokenCursor<TerminalRuntimeToken>): boolean {
  const i = nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end) ?? cursor.end;
  if (i >= cursor.end) {
    return true;
  }
  return cursor.lookahead(i - cursor.pos, terminalPunctSurface) !== null;
}

export function isTerminalishAfter(cursor: TokenCursor<TerminalRuntimeToken>): boolean {
  const i = nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end) ?? cursor.end;
  if (i >= cursor.end) {
    return true;
  }
  const tok = cursor.tokens[i];
  return isTerminalishPunctuationToken(tok);
}

export function isSentenceFinal(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  for (let i = cursor.pos; i < cursor.end; i += 1) {
    const pos0 = (cursor.tokens[i]?.pos ?? 0) & POS0;
    if (pos0 !== 補助記号) {
      return false;
    }
  }
  return true;
}
