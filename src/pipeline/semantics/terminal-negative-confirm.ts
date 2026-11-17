import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import {
  hasHardTerminalPunctuationClass,
  type BoundaryToken
} from "../head-tail/boundary/punctuation.js";
import { predicateNominalizerRelationForToken } from "../head-tail/boundary/marker.js";
import { terminalPunctuationRunQuestionIndex } from "../clause-layout/speech-act.js";
import type { BoundaryRelationConsumer } from "../head-tail/boundary/relation.js";


import { POS1, 終助詞 } from "../../types/pos.js";
type PredicateNominalizerRequirement = NonNullable<Parameters<typeof predicateNominalizerRelationForToken>[2]>["requirement"];

export interface NodaNegativeConfirmTerminalTail {
  readonly contentEndExclusive: number;
  readonly questionIdx: number;
  readonly nominalizerIdx?: number;
  readonly tokenSpan: { readonly start: number; readonly endExclusive: number };
}

export function matchNodaNoKaNegativeConfirmTerminalTail<T extends BoundaryToken>(
  tokens: readonly T[],
  cursor: number,
  end: number,
  options: {
    readonly consumers: readonly BoundaryRelationConsumer[];
    readonly nominalizerRequirement?: PredicateNominalizerRequirement;
    readonly requireTerminalNo?: boolean;
  }
): NodaNegativeConfirmTerminalTail | null {
  const current = nextNonSpaceIndex(tokens, cursor, end) ?? end;
  if (current >= end) {
    return null;
  }
  const directQuestionIdx = terminalQuestionPunctuationIndexAt(tokens, current, options.consumers);
  if (directQuestionIdx !== null) {
    return {
      contentEndExclusive: current,
      questionIdx: directQuestionIdx,
      tokenSpan: { start: current, endExclusive: directQuestionIdx + 1 }
    };
  }
  if (options.nominalizerRequirement === undefined) {
    return null;
  }
  const currentToken = tokens[current];
  if (
    predicateNominalizerRelationForToken(currentToken, current, {
      requirement: options.nominalizerRequirement,
      consumers: options.consumers
    })?.nominalizerKind !== "no"
  ) {
    return null;
  }
  if (options.requireTerminalNo === true && ((currentToken?.pos ?? 0) & POS1) !== 終助詞) {
    return null;
  }
  const afterNo = nextNonSpaceIndex(tokens, current + 1, end) ?? end;
  const afterNoQuestionIdx = afterNo >= end
    ? null
    : terminalQuestionPunctuationIndexAt(tokens, afterNo, options.consumers);
  if (afterNoQuestionIdx === null) {
    return null;
  }
  return {
    contentEndExclusive: current + 1,
    questionIdx: afterNoQuestionIdx,
    nominalizerIdx: current,
    tokenSpan: { start: current, endExclusive: afterNoQuestionIdx + 1 }
  };
}

function terminalQuestionPunctuationIndexAt<T extends BoundaryToken>(
  tokens: readonly T[],
  index: number,
  consumers: readonly BoundaryRelationConsumer[]
): number | null {
  return hasHardTerminalPunctuationClass(tokens[index], index, ["question"], consumers)
    ? index
    : terminalPunctuationRunQuestionIndex(tokens, index, consumers);
}
