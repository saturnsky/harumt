import type { RuntimeHaruToken } from "../../types/token.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../clause-layout/trivia.js";
import { isRentaishiToken, isTerminalParticleToken, 助詞_準体助詞 } from "../../types/pos.js";


export const RENTAISHI_NO_NOMINALIZER_RETAG_REASON = "rentaishi_no_nominalizer_retag";

function isTerminalTaggedNoToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && token.surface === "の" && isTerminalParticleToken(token);
}

function isRentaishiHostOf(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const host = tokens[idx - 1];
  return host !== undefined && isRentaishiToken(host) && !separatedAs(tokens, idx, DETACHED_SEPARATIONS);
}

function nominalizerRetaggedToken(token: RuntimeHaruToken): RuntimeHaruToken {
  return {
    ...token,
    pos: 助詞_準体助詞,
    syntheticReason: RENTAISHI_NO_NOMINALIZER_RETAG_REASON
  };
}

export function retagRentaishiNoAsNominalizer(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let mutated = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (isTerminalTaggedNoToken(token) && isRentaishiHostOf(tokens, i)) {
      result.push(nominalizerRetaggedToken(token));
      mutated = true;
      continue;
    }
    result.push(token);
  }
  return mutated ? result : (tokens as RuntimeHaruToken[]);
}
