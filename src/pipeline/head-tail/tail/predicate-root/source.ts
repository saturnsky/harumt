import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { OpSource } from "./grammar.js";

export function srcSlice(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  len: number
): OpSource {
  const indices: number[] = [];
  for (let i = 0; i < len; i++) indices.push(pos + i);
  return { tokens: tokens.slice(pos, pos + len), tokenIndices: indices };
}

export function srcSingle(token: RuntimeHaruToken, pos: number): OpSource {
  return { tokens: [token], tokenIndices: [pos] };
}

export function srcList(
  tokens: readonly RuntimeHaruToken[],
  indices: readonly number[]
): OpSource {
  return { tokens, tokenIndices: indices };
}
