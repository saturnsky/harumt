import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { POS0, POS4, POS5A, 助動詞 as 助動詞0, 助動詞_ヤ, 助詞, 動詞, 名詞, 終止形_, 補助記号, 連用形_ } from "../../../../../types/pos.js";
import { copulaComplementLiesBeyondPauseAt, isClausePunctuationToken } from "../../../../clause-layout/index.js";
import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import { previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import {
  isHardTerminalPunctuationToken,
  isOpeningPunctuationToken,
  isWeakPunctuationToken
} from "../../../boundary/punctuation.js";
import { isKamoShirenaiModalStartAtToken, matchKamoShirenaiSequence } from "../matchers/kamo-modal.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { hostlessInterjectionRowMatchAt } from "../../../../demo-discourse.js";

export function isNonExplicitEllipticTailSequenceStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const previous = previousNonSpaceIndex(tokens, start, 0);
  if (previous === null) {
    return true;
  }
  const token = tokens[previous];
  return token !== undefined && isClausePunctuationToken(token);
}

export function isZeroHeadPropositionTailSequenceStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  if (!isZeroHeadPropositionTailStartToken(tokens, start)) {
    return false;
  }
  if (hostlessInterjectionRowMatchAt(tokens, start) !== null) {
    return false;
  }
  const previous = previousNonSpaceIndex(tokens, start, 0);
  if (previous === null) {
    return true;
  }
  const token = tokens[previous];
  if (token !== undefined &&
    (isZeroHeadTailResetPunctuation(token) || isOpeningPunctuationToken(token))) {
    return true;
  }
  if (!isWeakPunctuationToken(token)) {
    return false;
  }
  const layout = activeProtoLayout();
  return layout !== null &&
    layout.clauseTokensBeforeAreExtraClausal(tokens, start) &&
    !copulaComplementLiesBeyondPauseAt(layout, tokens, start);
}

export function zeroHeadPropositionTailIslandEndExclusive(
  tokens: readonly RuntimeHaruToken[],
  start: number
): number {
  let endExclusive = start;
  while (endExclusive < tokens.length && !isClausePunctuationToken(tokens[endExclusive])) {
    const nextEndExclusive = endExclusive + 1;
    if (ellipticTailHasOvertLexicalStem(tokens, start, nextEndExclusive)) {
      break;
    }
    endExclusive = nextEndExclusive;
  }
  return endExclusive;
}

export function ellipticTailHasOvertLexicalStem(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): boolean {
  for (let index = start; index < endExclusive; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      return true;
    }
    if ((token.pos & POS0) === 助詞 || (token.pos & POS0) === 助動詞0 || (token.pos & POS0) === 補助記号) {
      continue;
    }
    if (isHeadlessRashiiModalSurfaceToken(token)) {
      continue;
    }
    if (isHeadlessBoundPropositionCarrierToken(token)) {
      continue;
    }
    if (isFunctionalNegationTailToken(token)) {
      continue;
    }
    if (isKamoShirenaiDummyVerbToken(tokens, index, start)) {
      continue;
    }
    return true;
  }
  return false;
}

function isZeroHeadPropositionTailStartToken(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const token = tokens[start];
  if (token === undefined) {
    return false;
  }
  if (isKamoShirenaiModalStartAtToken(tokens, start)) {
    return true;
  }
  if (isHeadlessRashiiModalSurfaceToken(token)) {
    return true;
  }
  if (isHeadlessBoundPropositionCarrierToken(token)) {
    return true;
  }
  if (isDialectYaBasicCopulaToken(token)) {
    return false;
  }
  if ((token.pos & POS0) === 助動詞0) {
    return true;
  }
  if ((token.pos & POS0) === 助詞 && token.surface === "か") {
    return true;
  }
  if (isDewaNegativeBridgeStartToken(tokens, start)) {
    return true;
  }
  return false;
}

function isDewaNegativeBridgeStartToken(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const de = tokens[start];
  const ha = tokens[start + 1];
  const nai = tokens[start + 2];
  return de !== undefined &&
    de.surface === "で" &&
    ((de.pos & POS0) === 助詞 || (de.pos & POS0) === 助動詞0) &&
    ha !== undefined &&
    ha.surface === "は" &&
    (ha.pos & POS0) === 助詞 &&
    isFunctionalNegationTailToken(nai);
}

function isDialectYaBasicCopulaToken(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS4) !== 助動詞_ヤ) {
    return false;
  }
  const pos5A = token.pos & POS5A;
  return pos5A === 終止形_ || pos5A === 連用形_;
}

function isZeroHeadTailResetPunctuation(token: RuntimeHaruToken): boolean {
  return isHardTerminalPunctuationToken(token);
}

function isHeadlessRashiiModalSurfaceToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.dictionaryForm === "らしい" || token.surface === "らしい");
}

function isHeadlessBoundPropositionCarrierToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 名詞) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return form === "はず" ||
    form === "筈" ||
    form === "わけ" ||
    form === "訳" ||
    token.reading === "ハズ" ||
    token.reading === "ワケ";
}

function isFunctionalNegationTailToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  return token.dictionaryForm === "ない" ||
    token.dictionaryForm === "無い" ||
    token.dictionaryForm === "ぬ" ||
    token.surface === "ん";
}

function isKamoShirenaiDummyVerbToken(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  start: number
): boolean {
  const kaIdx = index - 2;
  if (kaIdx < start) {
    return false;
  }
  const match = matchKamoShirenaiSequence(new TokenCursor(tokens, kaIdx, tokens.length));
  return match !== null && !match.bare;
}

export function isZeroHeadUtteranceInitialStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const layout = activeProtoLayout();
  if (layout !== null && layout.embeddedTokenSpace && layout.utteranceRangeOfToken(start).start === 0) {
    return false;
  }
  const previous = previousNonSpaceIndex(tokens, start, 0);
  if (previous === null) {
    return true;
  }
  const token = tokens[previous];
  if (token !== undefined &&
    (isZeroHeadTailResetPunctuation(token) || isOpeningPunctuationToken(token))) {
    return true;
  }
  return layout !== null && layout.utteranceTokensBeforeAreExtraClausal(tokens, start);
}
