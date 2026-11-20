
import type { HaruToken } from "../../analyzer/index.js";
import type { HaruWhitespaceMark } from "../../analyzer/haru-compat.js";
import type { WhitespaceRunMode } from "../../analyzer/whitespace-policy.js";
import {
  type RuntimeHaruToken,
  type SeparationEvidence,
  type SeparationKind,
  type SourceTokenSpan,
  withRuntimeTokenSourceSpan
} from "../../types/token.js";
import type { WhitespaceJunctureBoundaryEvidence } from "../clause-layout/juncture-verdict.js";

export function runtimeTokenFromHaru(
  token: HaruToken,
  sourceSpan?: SourceTokenSpan
): RuntimeHaruToken {
  const runtime: RuntimeHaruToken = {
    surface: token.surface,
    ...(token.normalized_form === undefined ? {} : { normalizedForm: token.normalized_form }),
    dictionaryForm: token.dictionary_form,
    reading: token.reading,
    dictionaryFormReading: token.dictionary_form_reading,
    pos: token.pos,
    dictionaryId: token.dictionary_id,
    ...(token.removed_long_vowels === undefined || token.removed_long_vowels <= 0
      ? {}
      : {
        longVowelReduction: {
          removedCount: token.removed_long_vowels,
          reducedSurface: token.reduced_surface ?? token.surface
        }
      }),
    ...separationRuntimeFields(token.whitespace_before, token.whitespace_after),
    ...(token.source_char_start === undefined || token.source_char_end === undefined
      ? {}
      : { sourceCharSpan: { start: token.source_char_start, end: token.source_char_end } })
  };
  if (token.split_a !== undefined) {
    runtime.splitA = token.split_a.map((item) => runtimeTokenFromHaru(item));
  }
  if (token.split_b !== undefined) {
    runtime.splitB = token.split_b.map((item) => runtimeTokenFromHaru(item));
  }
  return sourceSpan === undefined
    ? runtime
    : withRuntimeTokenSourceSpan(runtime, sourceSpan);
}

function separationRuntimeFields(
  before: HaruWhitespaceMark | undefined,
  after: HaruWhitespaceMark | undefined
): Partial<Pick<RuntimeHaruToken, "whitespaceBefore" | "whitespaceAfter" | "sourceLineBreakBefore">> {
  const leading = before === undefined ? undefined : separationEvidenceFromMark(before, false);
  const trailing = after === undefined ? undefined : separationEvidenceFromMark(after, true);
  return {
    ...(leading === undefined ? {} : { whitespaceBefore: leading }),
    ...(trailing === undefined ? {} : { whitespaceAfter: trailing }),
    ...(before?.kind === "line" ? { sourceLineBreakBefore: true as const } : {})
  };
}

export function withChunkBreakWitnesses(
  tokens: RuntimeHaruToken[],
  witnesses: ReadonlyMap<number, readonly WhitespaceJunctureBoundaryEvidence[]>
): RuntimeHaruToken[] {
  if (witnesses.size === 0) {
    return tokens;
  }
  return tokens.map((token) => {
    const evidence = token.whitespaceBefore;
    const runOrdinal = evidence?.runOrdinal;
    const runWitnesses = runOrdinal === undefined ? undefined : witnesses.get(runOrdinal);
    if (evidence === undefined || evidence.separation !== "chunk_break" || runWitnesses === undefined) {
      return token;
    }
    return { ...token, whitespaceBefore: { ...evidence, chunkBreakWitnesses: runWitnesses } };
  });
}

const SEPARATION_BY_RUN_MODE: Readonly<Record<WhitespaceRunMode, SeparationKind>> = {
  split: "chunk_break",
  barrier: "word_separator",
  skip: "letter_spacing"
};

function separationEvidenceFromMark(mark: HaruWhitespaceMark, atEdge: boolean): SeparationEvidence {
  const separation = SEPARATION_BY_RUN_MODE[mark.mode];
  return {
    separation,
    kind: mark.kind,
    width: mark.width,
    reason: atEdge
      ? "edge"
      : separation === "letter_spacing"
        ? "letter_spacing"
        : separation === "chunk_break"
          ? (mark.kind === "line" ? "chunk_break:line_break" : "chunk_break:boundary_event")
          : "default_word_separator",
    runOrdinal: mark.runOrdinal
  };
}
