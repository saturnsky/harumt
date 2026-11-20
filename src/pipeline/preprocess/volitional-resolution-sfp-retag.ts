import type { RuntimeHaruToken } from "../../types/token.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../clause-layout/trivia.js";
import type { UtteranceClosureKind } from "../clause-layout/utterance-closure.js";
import { POS0, POS01, isVolitionalInflection, 助詞_格助詞, 助詞_終助詞, 動詞 } from "../../types/pos.js";
import { closesUtteranceAfterTerminalSfpCandidate } from "./terminal-sfp-retag-closure.js";


const VOLITIONAL_RESOLUTION_CLOSING_KINDS: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing"
]);

export const VOLITIONAL_RESOLUTION_SFP_RETAG_REASON = "volitional_resolution_sfp_retag";

function isResolutionTtoToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    token.surface === "っと" &&
    (token.pos & POS01) === 助詞_格助詞;
}

function isVolitionalVerbHostOf(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const host = tokens[idx - 1];
  return host !== undefined &&
    !separatedAs(tokens, idx, DETACHED_SEPARATIONS) &&
    (host.pos & POS0) === 動詞 &&
    isVolitionalInflection(host.pos);
}

function resolutionSfpRetaggedToken(token: RuntimeHaruToken): RuntimeHaruToken {
  return {
    ...token,
    pos: 助詞_終助詞,
    dictionaryId: 0,
    syntheticReason: VOLITIONAL_RESOLUTION_SFP_RETAG_REASON
  };
}

export function retagVolitionalResolutionAsSentenceFinalParticle(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let mutated = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (isResolutionTtoToken(token) && isVolitionalVerbHostOf(tokens, i) &&
      closesUtteranceAfterTerminalSfpCandidate(tokens, i, VOLITIONAL_RESOLUTION_CLOSING_KINDS)) {
      result.push(resolutionSfpRetaggedToken(token));
      mutated = true;
      continue;
    }
    result.push(token);
  }
  return mutated ? result : (tokens as RuntimeHaruToken[]);
}
