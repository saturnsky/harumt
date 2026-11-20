import type { RuntimeHaruToken } from "../../types/token.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../clause-layout/trivia.js";
import {
  closesUtteranceAs,
  utteranceClosureAfter,
  type UtteranceClosureEvidence,
  type UtteranceClosureKind,
  type UtteranceClosureScope
} from "../clause-layout/utterance-closure.js";
import { kaMarkerRelationAt } from "../head-tail/boundary/marker.js";
import { POS01, 助詞_終助詞 } from "../../types/pos.js";


export interface TerminalSfpRunClosure {
  readonly kaInRun: boolean;
  readonly runLength: number;
  readonly closure: UtteranceClosureEvidence;
}

export function terminalSfpRunClosureAfter(
  scope: UtteranceClosureScope | null,
  tokens: readonly RuntimeHaruToken[],
  idx: number
): TerminalSfpRunClosure {
  let cursor = idx + 1;
  while (((tokens[cursor]?.pos ?? 0) & POS01) === 助詞_終助詞) {
    if (kaMarkerRelationAt(tokens, cursor, ["clause_layout"]) !== null) {
      return { kaInRun: true, runLength: cursor - idx - 1, closure: utteranceClosureAfter(scope, tokens, cursor) };
    }
    if (separatedAs(tokens, cursor, DETACHED_SEPARATIONS)) {
      break;
    }
    cursor += 1;
  }
  return { kaInRun: false, runLength: cursor - idx - 1, closure: utteranceClosureAfter(scope, tokens, cursor) };
}

export function closesUtteranceAfterTerminalSfpCandidate(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  acceptedClosures: ReadonlySet<UtteranceClosureKind>
): boolean {
  const run = terminalSfpRunClosureAfter(null, tokens, idx);
  return !run.kaInRun && closesUtteranceAs(run.closure, acceptedClosures);
}
