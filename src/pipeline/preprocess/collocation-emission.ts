import type { CollocationRuntimeToken } from "../../dictionary/collocation.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { computeSourceCharSpan, withRuntimeTokenSourceSpan } from "../../types/token.js";
import { applySourceRubyReadingFragments } from "../source-ruby-replay.js";
import { niOujiResponsePrevToken } from "../fallback/collocation-rescue.js";
import { POS0, POS1, 助動詞, 動詞, 非自立可能 } from "../../types/pos.js";
import type { LookupTables } from "../lookup-tables.js";
import { predicateNominalizerRelationForToken } from "../head-tail/boundary/marker.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { teDeContinuationRelationAt } from "../head-tail/tail/postverb-tail-classifier.js";
import { sourceSpanForTokenIndexes } from "../source-coordinate.js";
import type { RuntimePreprocessToken } from "./runtime-token-from-preprocess.js";

interface MergedSourcePositionRole {
  readonly leading: boolean;
  readonly trailing: boolean;
}

type MergedSourcePositionToken = Pick<
  RuntimeHaruToken,
  "whitespaceBefore" | "whitespaceAfter" | "transparentPauseBefore" | "transparentPauseAfter" | "transparentPauseRunAfter"
  | "sourceLineBreakBefore"
>;

export function withMergedSourcePosition<T extends RuntimePreprocessToken>(
  tokens: readonly MergedSourcePositionToken[],
  start: number,
  consumed: number,
  token: T,
  role: MergedSourcePositionRole
): T {
  const first = role.leading ? tokens[start] : undefined;
  const last = role.trailing ? tokens[start + consumed - 1] : undefined;
  return {
    ...token,
    ...(token.whitespaceBefore === undefined && first?.whitespaceBefore !== undefined
      ? { whitespaceBefore: first.whitespaceBefore }
      : {}),
    ...(token.whitespaceAfter === undefined && last?.whitespaceAfter !== undefined
      ? { whitespaceAfter: last.whitespaceAfter }
      : {}),
    ...(token.transparentPauseBefore === undefined && first?.transparentPauseBefore === true
      ? { transparentPauseBefore: true }
      : {}),
    ...(token.transparentPauseAfter === undefined && last?.transparentPauseAfter === true
      ? { transparentPauseAfter: true }
      : {}),
    ...(token.transparentPauseRunAfter === undefined && last?.transparentPauseRunAfter !== undefined
      ? { transparentPauseRunAfter: last.transparentPauseRunAfter }
      : {}),
    ...(token.sourceLineBreakBefore === undefined && first?.sourceLineBreakBefore === true
      ? { sourceLineBreakBefore: true as const }
      : {})
  };
}

export function withSourcePositionFromConsumed<T extends RuntimePreprocessToken>(
  tokens: readonly (
    Pick<RuntimeHaruToken, "sourceOrdinal" | "sourceSpan" | "sourceCharSpan"> & MergedSourcePositionToken
  )[],
  start: number,
  consumed: number,
  token: T,
  role: MergedSourcePositionRole
): T {
  const positioned = withMergedSourcePosition(tokens, start, consumed, token, role);
  const sourceSpan = sourceSpanForTokenIndexes(tokens, rangeIndexes(start, consumed));
  if (sourceSpan === null) {
    return positioned;
  }
  const sourceCharSpan = computeSourceCharSpan(tokens.slice(start, start + consumed));
  const identified = sourceCharSpan === undefined
    ? positioned
    : { ...positioned, sourceCharSpan };
  return withRuntimeTokenSourceSpan(identified, sourceSpan);
}

export function collocationEmissionPreservesSourceRuby(
  source: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  emitted: readonly RuntimeHaruToken[]
): boolean {
  const fragments = source
    .slice(start, start + consumed)
    .flatMap((token) => token.sourceRubyReadingFragments ?? []);
  if (fragments.length === 0) {
    return true;
  }
  const probe = emitted.map((token) => ({ ...token }));
  return applySourceRubyReadingFragments(probe, fragments);
}

function rangeIndexes(start: number, count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_value, offset) => start + offset);
}


const WO_TOOSU_PASS_OBJECTS = new Set(["申請", "法案", "予算案", "議案", "提案", "企画", "計画", "書類", "案"]);
const WO_TOOSU_PASS_OBJECT_PREFIXES = new Set(["法", "予算", "議"]);
const WO_TOOSU_BENEFACTIVE_TAILS = new Set(["いただける", "いただく", "頂ける", "頂く", "くれる", "くださる", "下さる", "もらう", "もらえる"]);

export function shouldSkipCollocation(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  collocation: readonly [consumed: number, emitted: readonly CollocationRuntimeToken[]],
  lookups: LookupTables
): boolean {
  const [consumed, emitted] = collocation;
  const emittedHead = emitted[0];
  if (emittedHead === undefined) {
    return false;
  }
  const dictionaryForm = emittedHead.dictionaryForm;
  if (dictionaryForm === "いただきます") {
    if (start <= 0) {
      return false;
    }
    const relation = teDeContinuationRelationAt(tokens, start - 1, { consumers: ["assembler"], lookups });
    return relation?.continuationKind === "benefactive" && relation.continuationIdx === start;
  }
  if (dictionaryForm === "を通して" || dictionaryForm === "を通し") {
    return shouldSkipWoTooshiteCollocation(tokens, start, consumed);
  }
  if (dictionaryForm === "に応じ") {
    return shouldSkipNiOujiCollocation(tokens, start, consumed);
  }
  if (dictionaryForm === "に比べて" || dictionaryForm === "に比べ") {
    return shouldSkipNiKurabeteCollocation(tokens, start, consumed);
  }
  return false;
}

function shouldSkipNiKurabeteCollocation(tokens: readonly RuntimeHaruToken[], start: number, consumed: number): boolean {
  if (start <= 0) {
    return false;
  }
  const previousIndex = previousNonSpaceIndex(tokens, start);
  if (previousIndex === null) {
    return false;
  }
  const previous = tokens[previousIndex];
  if (
    previous === undefined ||
    predicateNominalizerRelationForToken(previous, previousIndex, {
      requirement: "tail_connective_marker",
      consumers: ["assembler"]
    })?.nominalizerKind !== "no"
  ) {
    return false;
  }
  const after = nextNonSpaceIndex(tokens, start + consumed, tokens.length) ?? tokens.length;
  const tail = tokens[after];
  if (tail === undefined) {
    return false;
  }
  const tailForm = tail.dictionaryForm || tail.surface;
  return (tail.pos & POS0) === 動詞
    && ((tail.pos & POS1) === 非自立可能 || ["しまう", "みる", "くる", "いく", "おく", "いる", "ある"].includes(tailForm));
}

function shouldSkipWoTooshiteCollocation(tokens: readonly RuntimeHaruToken[], start: number, consumed: number): boolean {
  if (start <= 0) {
    return false;
  }
  const objectIndex = previousNonSpaceIndex(tokens, start);
  if (objectIndex === null) {
    return false;
  }
  const object = tokens[objectIndex];
  if (object === undefined) {
    return false;
  }
  const objectSurface = object.dictionaryForm || object.surface;
  if (!WO_TOOSU_PASS_OBJECTS.has(objectSurface)) {
    const previousIndex = previousNonSpaceIndex(tokens, objectIndex);
    const previous = previousIndex === null ? undefined : tokens[previousIndex];
    const previousSurface = previous === undefined ? undefined : previous.dictionaryForm || previous.surface;
    if (!(objectSurface === "案" && previousSurface !== undefined && WO_TOOSU_PASS_OBJECT_PREFIXES.has(previousSurface))) {
      return false;
    }
  }
  const after = nextNonSpaceIndex(tokens, start + consumed, tokens.length) ?? tokens.length;
  const tail = tokens[after];
  if (tail === undefined) {
    return false;
  }
  const tailForm = tail.dictionaryForm || tail.surface;
  return WO_TOOSU_BENEFACTIVE_TAILS.has(tailForm);
}

function shouldSkipNiOujiCollocation(tokens: readonly RuntimeHaruToken[], start: number, consumed: number): boolean {
  if (niOujiResponsePrevToken(tokens, start) === undefined) {
    return false;
  }
  const after = nextNonSpaceIndex(tokens, start + consumed, tokens.length) ?? tokens.length;
  const afterPos = tokens[after]?.pos ?? 0;
  return (afterPos & POS0) === 助動詞;
}
