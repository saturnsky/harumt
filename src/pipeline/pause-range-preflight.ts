import { isGojuonFullSpanPair, isGojuonRowRangePair, isKatakanaLetter, isWavePauseSurface } from "../utils/char-class.js";
import { wavePauseRunSpans, type WavePauseRunSpan } from "../transform/transparent-pause.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "./clause-layout/trivia.js";
import {
  POS0,
  POS5A,
  代名詞,
  助動詞,
  助詞,
  動詞,
  名詞,
  形容詞0,
  形状詞,
  接尾辞,
  終止形_,
  補助記号,
  補助記号_句点,
  POS01,
  記号,
  連体形_,
} from "../types/pos.js";
import type { LookupTables } from "./lookup-tables.js";

interface PauseRangeToken {
  readonly surface: string;
  readonly pos: number;
  readonly whitespaceBefore?: { readonly kind?: string } | undefined;
}

function closesTitleBodyBeforeSubtitle(token: PauseRangeToken): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 === 名詞 || pos0 === 代名詞 || pos0 === 接尾辞) return true;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞 && pos0 !== 形状詞) return false;
  if (pos0 === 形状詞) return true;
  const form = token.pos & POS5A;
  return form === 終止形_ || form === 連体形_;
}

function opensSubtitleBody(token: PauseRangeToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 !== 助詞 && pos0 !== 助動詞 && pos0 !== 接尾辞 && pos0 !== 補助記号 && pos0 !== 記号;
}

function isLineFinalAfter(tokens: readonly PauseRangeToken[], index: number): boolean {
  const next = tokens[index + 1];
  return next === undefined || next.whitespaceBefore?.kind === "line";
}

function isSingleKatakanaOperandToken(token: PauseRangeToken | undefined): boolean {
  if (token === undefined) return false;
  const chars = Array.from(token.surface);
  return chars.length === 1 && isKatakanaLetter(chars[0]!);
}

type RangeConsumingEvidence = "gojuon_section" | "particle";

function rangeConsumingEvidence(
  tokens: readonly PauseRangeToken[],
  start: number,
  lookups: LookupTables,
): RangeConsumingEvidence | null {
  const firstIdx = nextNonSpaceIndex(tokens, start);
  if (firstIdx === null) return null;
  const first = tokens[firstIdx]!;
  if ((first.pos & POS0) !== 助詞) return null;
  if (lookups.PAUSE_RANGE_CONSUMING_PARTICLES.has(first.surface)) {
    return "particle";
  }
  if (first.surface !== "の") return null;
  const secondIdx = nextNonSpaceIndex(tokens, firstIdx + 1);
  if (secondIdx === null) return null;
  const second = tokens[secondIdx]!;
  return (second.pos & POS0) === 名詞 &&
    lookups.PAUSE_RANGE_GOJUON_SECTION_NOUNS.has(second.surface)
    ? "gojuon_section"
    : null;
}

function evidenceAdmitsRange(
  evidence: RangeConsumingEvidence,
  left: string,
  right: string,
): boolean {
  return evidence === "gojuon_section"
    ? isGojuonFullSpanPair(left, right) || isGojuonRowRangePair(left, right)
    : isGojuonFullSpanPair(left, right);
}

export function detectOpaqueWavePauseRuns(
  text: string,
  tokens: readonly PauseRangeToken[],
  lookups: LookupTables,
): ReadonlySet<number> | undefined {
  const textRuns = wavePauseRunSpans(text);
  if (textRuns.length === 0) return undefined;

  const charOwner: number[] = [];
  let joined = "";
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
    for (const ch of tokens[tokenIndex]!.surface) {
      joined += ch;
      charOwner.push(tokenIndex);
    }
  }
  const tokenRuns = wavePauseRunSpans(joined);
  if (tokenRuns.length !== textRuns.length) return undefined;

  const wholeTokenOwner = new Map<number, number>();
  for (const run of tokenRuns) {
    const ownerIndex = charOwner[run.start];
    if (ownerIndex === undefined || ownerIndex !== charOwner[run.end - 1]) continue;
    if (!isWavePauseSurface(tokens[ownerIndex]!.surface)) continue;
    wholeTokenOwner.set(run.ordinal, ownerIndex);
  }

  const opaque = new Set<number>();
  for (const run of tokenRuns) {
    const ownerIndex = wholeTokenOwner.get(run.ordinal);
    if (ownerIndex === undefined) continue;
    const leftIdx = previousNonSpaceIndex(tokens, ownerIndex);
    const rightIdx = nextNonSpaceIndex(tokens, ownerIndex + 1);
    if (leftIdx === null || rightIdx === null) continue;
    const left = tokens[leftIdx]!;
    const right = tokens[rightIdx]!;
    if (!isSingleKatakanaOperandToken(left) || !isSingleKatakanaOperandToken(right)) continue;
    const evidence = rangeConsumingEvidence(tokens, rightIdx + 1, lookups);
    if (evidence === null || !evidenceAdmitsRange(evidence, left.surface, right.surface)) continue;
    opaque.add(run.ordinal);
  }
  for (const pair of subtitleBracketRunPairs(tokens, tokenRuns, wholeTokenOwner)) {
    opaque.add(pair.open);
    opaque.add(pair.close);
  }
  return opaque.size === 0 ? undefined : opaque;
}

function subtitleBracketRunPairs(
  tokens: readonly PauseRangeToken[],
  tokenRuns: readonly WavePauseRunSpan[],
  wholeTokenOwner: ReadonlyMap<number, number>,
): readonly { readonly open: number; readonly close: number }[] {
  const pairs: { open: number; close: number }[] = [];
  for (let i = 0; i + 1 < tokenRuns.length; i += 1) {
    const openRun = tokenRuns[i]!;
    const closeRun = tokenRuns[i + 1]!;
    const openIdx = wholeTokenOwner.get(openRun.ordinal);
    const closeIdx = wholeTokenOwner.get(closeRun.ordinal);
    if (openIdx === undefined || closeIdx === undefined) continue;
    if (closeIdx - openIdx < 2 || !isLineFinalAfter(tokens, closeIdx)) continue;
    const titleTail = tokens[openIdx - 1];
    if (
      titleTail === undefined ||
      tokens[openIdx]!.whitespaceBefore?.kind === "line" ||
      !closesTitleBodyBeforeSubtitle(titleTail)
    ) {
      continue;
    }
    if (!opensSubtitleBody(tokens[openIdx + 1]!)) continue;
    let admissible = true;
    for (let index = openIdx + 1; index < closeIdx; index += 1) {
      const token = tokens[index]!;
      if (
        (token.pos & POS01) === 補助記号_句点 ||
        (index > openIdx + 1 && token.whitespaceBefore?.kind === "line")
      ) {
        admissible = false;
        break;
      }
    }
    if (!admissible) continue;
    const subtitleTail = tokens[closeIdx - 1]!;
    const tailPos0 = subtitleTail.pos & POS0;
    if (tailPos0 !== 名詞 && tailPos0 !== 代名詞 && tailPos0 !== 接尾辞) continue;
    pairs.push({ open: openRun.ordinal, close: closeRun.ordinal });
  }
  return pairs;
}
