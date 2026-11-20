import type { RuntimeHaruToken } from "../../../../types/token.js";
import { detectSfp } from "../../../semantics/grammar-runtime.js";
import { TokenCursor } from "../../../token-cursor.js";
import { nextNonSpaceIndex } from "../../../clause-layout/trivia.js";
import { activeProtoLayout } from "../../../clause-layout/proto-state.js";
import { closesUtteranceAs, utteranceClosureAfter, utteranceClosureTokenIdx, type UtteranceClosureKind } from "../../../clause-layout/utterance-closure.js";
import { isUtteranceClosingPunct } from "../../../clause-layout/utterance-boundaries.js";
import { quoteMarkerRelationAt } from "../../boundary/quote-marker.js";
import { isHardTerminalPunctuationToken, isOpeningPunctuationToken, isWeakPunctuationToken } from "../../boundary/punctuation.js";
import type { ParseInput } from "./parse-input.js";
import { POS0, POS01, 助詞_終助詞, 動詞, 補助記号 } from "../../../../types/pos.js";
import { sourceIndexForInputPosition } from "./parse-coordinates.js";

export function terminalDiscourseSfpRunClosesUtterance(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined,
  offset = 1
): boolean {
  if (cursor.tokens[cursor.pos + offset] === undefined) {
    return false;
  }
  let sfpEndPos: number | null = null;
  cursor.lookahead(offset, c => {
    const start = c.pos;
    detectSfp(c, 動詞, true);
    if (c.pos > start) {
      sfpEndPos = c.pos;
    }
    return true;
  });
  return sfpEndPos !== null && utteranceClosesAtChunkPosition(cursor, sfpEndPos, input);
}

export function utteranceClosesAtChunkPosition(
  cursor: TokenCursor<RuntimeHaruToken>,
  endPos: number,
  input: ParseInput | undefined
): boolean {
  return cursor.lookahead(
    endPos - cursor.pos,
    (c) => chunkRemainderIsUtteranceClosingPunctRun(c)
  ) && utteranceClosesAfterInputPosition(input, endPos);
}

function isUtteranceClosingTransparentPunct(token: RuntimeHaruToken): boolean {
  if (isUtteranceClosingPunct(token)) {
    return true;
  }
  return (token.pos & POS0) === 補助記号 &&
    !isWeakPunctuationToken(token) &&
    !isOpeningPunctuationToken(token);
}

function chunkRemainderIsUtteranceClosingPunctRun(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  for (let index = cursor.pos; index < cursor.end; index += 1) {
    const token = cursor.tokens[index];
    if (token === undefined) {
      return false;
    }
    if (!isUtteranceClosingTransparentPunct(token)) {
      return false;
    }
  }
  return true;
}

function utteranceClosesAfterInputPosition(input: ParseInput | undefined, pos: number): boolean {
  if (input === undefined) {
    return true;
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  let idx = nextNonSpaceIndex(
    contextTokens,
    sourceIndexForInputPosition(input, pos - 1) + 1,
    contextTokens.length
  );
  while (idx !== null) {
    const token = contextTokens[idx];
    if (token === undefined || isHardTerminalPunctuationToken(token)) {
      return true;
    }
    if (!isUtteranceClosingTransparentPunct(token)) {
      return false;
    }
    idx = nextNonSpaceIndex(contextTokens, idx + 1, contextTokens.length);
  }
  return true;
}

export function remainingChunkIsTerminalSfpRun(
  cursor: TokenCursor<RuntimeHaruToken>,
  offset: number
): boolean {
  const start = cursor.pos + offset;
  if (start >= cursor.end) {
    return false;
  }
  for (let index = start; index < cursor.end; index++) {
    const token = cursor.tokens[index];
    if (token === undefined || (token.pos & POS01) !== 助詞_終助詞) {
      return false;
    }
  }
  return true;
}

export function utteranceClosureAfterParsePosition(input: ParseInput, pos: number): UtteranceClosureKind {
  const tokens = input.contextTokens ?? input.tokens;
  return utteranceClosureAfter(activeProtoLayout(), tokens, sourceIndexForInputPosition(input, pos) + 1).closure;
}

const CARRIER_TERMINAL_MOOD_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "weak_pause"
]);

interface CarrierTerminalReach {
  readonly ok: boolean;
  readonly sfpAbsorbed: boolean;
  readonly atChunkEnd: boolean;
}

function carrierTerminalReachWithinChunk(
  tokens: readonly RuntimeHaruToken[],
  start: number
): CarrierTerminalReach {
  const scope = activeProtoLayout();
  let probe = start;
  let sawSfp = false;
  for (;;) {
    const closure = utteranceClosureAfter(scope, tokens, probe);
    if (closesUtteranceAs(closure, CARRIER_TERMINAL_MOOD_CLOSURES)) {
      return { ok: true, sfpAbsorbed: sawSfp, atChunkEnd: closure.closure === "eos" };
    }
    if (closure.closure !== "none") {
      return { ok: false, sfpAbsorbed: sawSfp, atChunkEnd: false };
    }
    const token = tokens[closure.tokenIdx];
    if (token === undefined || (token.pos & POS01) !== 助詞_終助詞) {
      return { ok: false, sfpAbsorbed: sawSfp, atChunkEnd: false };
    }
    sawSfp = true;
    probe = closure.tokenIdx + 1;
  }
}

export const CARRIER_TERMINAL_QUOTE_CONTINUATION_BLOCKERS: ReadonlySet<UtteranceClosureKind> =
  new Set<UtteranceClosureKind>([
    "eos",
    "hard_terminal",
    "matched_delimiter_close",
    "unmatched_trailing",
    "weak_pause",
    "clause_boundary"
  ]);

function carrierTerminalQuoteContinuationFollows(
  context: CarrierTerminalContext,
  start: number
): boolean {
  const stream = context.tokens;
  const scope = activeProtoLayout();
  let probe = context.indexOf(start - 1) + 1;
  for (;;) {
    const closure = utteranceClosureAfter(scope, stream, probe);
    if (closure.closure === "weak_pause") {
      probe = closure.tokenIdx + 1;
      continue;
    }
    const closureIdx = utteranceClosureTokenIdx(closure);
    if (closureIdx === null || closesUtteranceAs(closure, CARRIER_TERMINAL_QUOTE_CONTINUATION_BLOCKERS)) {
      return false;
    }
    const token = stream[closureIdx];
    if (token !== undefined && (token.pos & POS01) === 助詞_終助詞) {
      probe = closureIdx + 1;
      continue;
    }
    return quoteMarkerRelationAt(stream, closureIdx, {
      consumers: ["tail_boundary_readiness"]
    }) !== null;
  }
}

export function isCarrierTerminalMoodPosition(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  context: CarrierTerminalContext | null,
  admitsQuoteContinuation: boolean
): boolean {
  const reach = carrierTerminalReachWithinChunk(tokens, start);
  if (!reach.ok) {
    return false;
  }
  if (admitsQuoteContinuation || !reach.sfpAbsorbed || !reach.atChunkEnd || context === null) {
    return true;
  }
  return !carrierTerminalQuoteContinuationFollows(context, start);
}

export interface CarrierTerminalContext {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly indexOf: (pos: number) => number;
}

export function carrierTerminalContextFor(input: ParseInput): CarrierTerminalContext {
  return {
    tokens: input.contextTokens ?? input.tokens,
    indexOf: (pos: number) => sourceIndexForInputPosition(input, pos)
  };
}
