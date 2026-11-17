import {
  NOMINAL_KEIJOU_BITS, POS0_OF_NAME, POS1_OF_NAME,
  isAuxiliaryStemToken, isPureNaAdjStem, pos0in,
  副詞, 動詞, 形容詞0, 連体詞
} from "../../types/pos.js";
import { isDetachedFromPreviousToken, type ClauseAdjacencyToken } from "./trivia.js";

export interface BareAdverbialHostToken extends ClauseAdjacencyToken {
  readonly pos: number;
  readonly dictionaryForm: string;
}

const BARE_ADVERBIAL_FOLLOWER_BITS: number =
  (1 << 動詞) | (1 << 形容詞0) | (1 << 副詞) | (1 << 連体詞);

export function isBareAdverbialKeijoujiHostPos(token: { readonly pos: number }): boolean {
  return isPureNaAdjStem(token) && !isAuxiliaryStemToken(token);
}

export function isAdverbialKeijoujiMarkerHostPos(token: { readonly pos: number }): boolean {
  return pos0in(token.pos, NOMINAL_KEIJOU_BITS) && !isAuxiliaryStemToken(token);
}

export function isBareAdverbialKeijoujiHostEntryPos(pos: readonly string[] | undefined): boolean {
  if (pos === undefined) {
    return false;
  }
  const pos0 = POS0_OF_NAME[pos[0] ?? "*"];
  const pos1 = POS1_OF_NAME[pos[1] ?? "*"];
  return pos0 !== undefined && pos1 !== undefined && isBareAdverbialKeijoujiHostPos({ pos: pos0 | pos1 });
}

export function bareAdverbialKeijoujiHostAt(
  tokens: readonly BareAdverbialHostToken[],
  idx: number,
  bareKeijoujiHosts: ReadonlySet<string>
): boolean {
  const host = tokens[idx];
  if (host === undefined || !isBareAdverbialKeijoujiHostPos(host)) {
    return false;
  }
  if (!bareKeijoujiHosts.has(host.dictionaryForm)) {
    return false;
  }
  return bareAdverbialFollowerAt(tokens, idx);
}

export function bareAdverbialFollowerAt(
  tokens: readonly BareAdverbialHostToken[],
  idx: number
): boolean {
  const follower = tokens[idx + 1];
  if (follower === undefined || isDetachedFromPreviousToken(tokens, idx + 1)) {
    return false;
  }
  return pos0in(follower.pos, BARE_ADVERBIAL_FOLLOWER_BITS);
}

export function bareAdverbialKeijoujiStructuralHostAt(
  tokens: readonly BareAdverbialHostToken[],
  idx: number
): boolean {
  const host = tokens[idx];
  if (host === undefined || !isBareAdverbialKeijoujiHostPos(host)) {
    return false;
  }
  return bareAdverbialFollowerAt(tokens, idx);
}
