import { Mode } from "./mode.js";
import type { Morpheme } from "./morpheme.js";
import type { Dictionary } from "./dictionary.js";
import type { PartOfSpeech } from "./grammar.js";
import { WhitespaceInputTextPlugin, type WhitespaceRunDeletion } from "./plugin.js";
import {
  resolveWhitespaceRunPolicy,
  whitespaceRunBondAt,
  whitespaceRunModeAt,
  type WhitespaceKind,
  type WhitespacePolicy,
  type WhitespaceRunMode,
  type WhitespaceRunPolicy
} from "./whitespace-policy.js";

import type { ProlongedReductionContract } from "./reduction-variant.js";
import { posFromStrings } from "../types/pos.js";
export type HaruPos = number;

export interface HaruWhitespaceMark {
  readonly kind: WhitespaceKind;
  readonly width: number;
  readonly mode: WhitespaceRunMode;
  readonly runOrdinal: number;
}

export interface HaruToken {
  surface: string;
  normalized_form?: string;
  dictionary_form: string;
  reading: string;
  dictionary_form_reading: string;
  pos: number;
  dictionary_id: number;
  split_b?: HaruToken[];
  split_a?: HaruToken[];
  removed_long_vowels?: number;
  reduced_surface?: string;
  whitespace_before?: HaruWhitespaceMark;
  whitespace_after?: HaruWhitespaceMark;
  source_char_start?: number;
  source_char_end?: number;
}

export const HARU_TOKEN_SCHEMA_VERSION = 7;

export interface HaruTokenizeOptions {
  policy?: WhitespacePolicy;
  charOffset?: number;
  prolongedReduction?: ProlongedReductionContract;
  splitBySpace?: boolean;
}

export function tokenizeForHaru(
  dictionary: Dictionary,
  text: string,
  options: HaruTokenizeOptions = {}
): HaruToken[] {
  const tokenizer = dictionary.createTokenizer();
  const baseCharOffset = options.charOffset ?? 0;
  const requested = options.policy ??
    (options.splitBySpace === false ? "raw" : "legacy-split");
  const policy = resolveWhitespaceRunPolicy(text, requested);
  const chars = [...text];
  const tokens: HaruToken[] = [];

  const emitChunk = (start: number, endExclusive: number): void => {
    if (endExclusive <= start) {
      return;
    }
    const chunkText = chars.slice(start, endExclusive).join("");
    const deletions: WhitespaceRunDeletion[] = [];
    for (const run of policy.runs) {
      if (run.start < start || run.end > endExclusive) {
        continue;
      }
      const mode = whitespaceRunModeAt(policy, run.ordinal);
      if (mode === "split") {
        continue;
      }
      deletions.push({
        start: run.start - start,
        end: run.end - start,
        barrier: mode === "barrier",
        bondExempt: whitespaceRunBondAt(policy, run.ordinal) === "exempt"
      });
    }
    const barrierContract = policy.barrier ?? null;
    const plugins = deletions.length === 0 && barrierContract === null
      ? undefined
      : [new WhitespaceInputTextPlugin(deletions, barrierContract)];
    for (const morpheme of tokenizer.tokenize(chunkText, Mode.C, plugins, options.prolongedReduction)) {
      tokens.push(morphemeToHaruToken(morpheme, baseCharOffset + start));
    }
  };

  let chunkStart = 0;
  for (const run of policy.runs) {
    if (whitespaceRunModeAt(policy, run.ordinal) !== "split") {
      continue;
    }
    emitChunk(chunkStart, run.start);
    chunkStart = run.end;
  }
  emitChunk(chunkStart, chars.length);

  attachWhitespaceMarks(tokens, policy, baseCharOffset);
  return tokens;
}

function attachWhitespaceMarks(
  tokens: HaruToken[],
  policy: WhitespaceRunPolicy,
  baseCharOffset: number
): void {
  if (policy.runs.length === 0 || tokens.length === 0) {
    return;
  }
  const indexByStart = new Map<number, number>();
  for (const [index, token] of tokens.entries()) {
    if (token.source_char_start !== undefined && !indexByStart.has(token.source_char_start)) {
      indexByStart.set(token.source_char_start, index);
    }
  }
  for (const run of policy.runs) {
    const mark: HaruWhitespaceMark = {
      kind: run.kind,
      width: run.width,
      mode: whitespaceRunModeAt(policy, run.ordinal),
      runOrdinal: run.ordinal
    };
    const rightIndex = indexByStart.get(baseCharOffset + run.end);
    if (rightIndex !== undefined) {
      tokens[rightIndex] = { ...tokens[rightIndex]!, whitespace_before: mark };
      continue;
    }
    const lastIndex = tokens.length - 1;
    const last = tokens[lastIndex];
    if (last !== undefined && last.source_char_end === baseCharOffset + run.start) {
      tokens[lastIndex] = { ...last, whitespace_after: mark };
    }
  }
}

export function morphemeToHaruToken(morpheme: Morpheme, charOffset = 0): HaruToken {
  const token: HaruToken = {
    surface: morpheme.surface(),
    normalized_form: morpheme.normalizedForm(),
    dictionary_form: morpheme.dictionaryForm(),
    reading: morpheme.readingForm(),
    dictionary_form_reading: morpheme.dictionaryFormReading(),
    pos: toHaruPos(morpheme.partOfSpeech()),
    dictionary_id: morpheme.dictionaryId(),
    source_char_start: morpheme.begin() + charOffset,
    source_char_end: morpheme.end() + charOffset
  };

  if (morpheme.removedLongVowels > 0) {
    token.removed_long_vowels = morpheme.removedLongVowels;
    token.reduced_surface = morpheme.getWordInfo().surface();
  }

  const splitB = morpheme.split(Mode.B);
  if (splitB.length > 1) {
    token.split_b = splitB.map((split) => morphemeToHaruToken(split, charOffset));
  }

  const splitA = morpheme.split(Mode.A);
  if (splitA.length > 1) {
    token.split_a = splitA.map((split) => morphemeToHaruToken(split, charOffset));
  }

  return token;
}

function toHaruPos(pos: PartOfSpeech): number {
  return posFromStrings(pos);
}
