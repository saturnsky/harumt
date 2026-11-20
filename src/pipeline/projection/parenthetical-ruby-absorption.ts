
import { alignReading, isKanji, minimumAlignedReadingLength } from "../../generator/kanji-alignment.js";
import { rewriteRuntimeTokenSurface, type RuntimeHaruToken } from "../../types/token.js";
import { closesUtteranceAs, utteranceClosureAt, type UtteranceClosureKind } from "../clause-layout/utterance-closure.js";
import type { ParentheticalIsland, PreparedTranslation } from "./prepared-translation.js";
import { isInferredRubyReadingSurface, normalizeInferredRubyReadingToKatakana } from "./ruby-annotation.js";

interface ParentheticalRubyAbsorption {
  readonly tokenStart: number;
  readonly charStartInToken: number;
  readonly alignment: readonly AlignmentForSurfaceChar[];
}

export interface AlignmentForSurfaceChar {
  readonly surface: string;
  readonly reading: string;
}

export function absorbParentheticalRubyIslands(prepared: PreparedTranslation): void {
  for (const island of prepared.parentheticalIslands ?? []) {
    absorbParentheticalRubyIslands(island.innerPrepared);
  }

  const islands = prepared.parentheticalIslands ?? [];
  if (islands.length === 0) return;

  const tokens = prepared.tokens as RuntimeHaruToken[];
  const remaining: ParentheticalIsland[] = [];
  for (const island of islands) {
    if (!absorbParentheticalRubyIsland(tokens, island, prepared.sourceText)) {
      remaining.push(island);
    }
  }

  const mutable = prepared as unknown as { parentheticalIslands?: ParentheticalIsland[] };
  if (remaining.length === 0) {
    delete mutable.parentheticalIslands;
  } else if (remaining.length !== islands.length) {
    mutable.parentheticalIslands = remaining;
  }
}

function absorbParentheticalRubyIsland(
  tokens: RuntimeHaruToken[],
  island: ParentheticalIsland,
  sourceText: string
): boolean {
  if (
    island.pause !== undefined ||
    island.rubyAnnotationKey !== undefined ||
    !isPlainKanaParenthetical(island)
  ) {
    return false;
  }

  const rubyKatakana = normalizeInferredRubyReadingToKatakana(island.innerPrepared.sourceText);
  if (rubyKatakana === null) return false;

  const absorption = parentheticalRubyAbsorptionBefore(tokens, island, rubyKatakana);
  if (absorption === null) {
    return parentheticalRubyGlossAlreadyRealizedInHostToken(tokens, island, rubyKatakana, sourceText);
  }

  applyParentheticalRubyAbsorption(tokens, absorption);
  return true;
}

function parentheticalRubyGlossAlreadyRealizedInHostToken(
  tokens: readonly RuntimeHaruToken[],
  island: ParentheticalIsland,
  rubyKatakana: string,
  sourceText: string
): boolean {
  const anchor = island.sourceBoundary.afterOrdinal;
  if (anchor === null) return false;
  const openSpan = island.delimiterTextSpan?.open;
  if (openSpan === undefined) return false;
  const textBeforeIsland = Array.from(sourceText).slice(0, openSpan.start).join("");
  return tokens.some((token) => {
    const span = token.sourceSpan;
    if (span === undefined || span === null) return false;
    if (span.startOrdinal > anchor || anchor > span.endOrdinal) return false;
    const kanjiRun = leadingKanjiRun(token.surface);
    if (kanjiRun.length === 0 || !textBeforeIsland.endsWith(kanjiRun)) return false;
    return tokenReadingRealizesLeadingKanjiGloss(token, rubyKatakana);
  });
}

function leadingKanjiRun(surface: string): string {
  const chars = Array.from(surface);
  let end = 0;
  while (end < chars.length && isKanji(chars[end]!)) {
    end += 1;
  }
  return chars.slice(0, end).join("");
}

function tokenReadingRealizesLeadingKanjiGloss(
  token: RuntimeHaruToken,
  rubyKatakana: string
): boolean {
  if (token.reading === undefined) return false;
  const chars = Array.from(token.surface);
  const kanjiRunEnd = Array.from(leadingKanjiRun(token.surface)).length;
  if (kanjiRunEnd === 0 || kanjiRunEnd === chars.length) return false;
  const kanaTailKatakana = normalizeInferredRubyReadingToKatakana(chars.slice(kanjiRunEnd).join(""));
  if (kanaTailKatakana === null) return false;
  return token.reading === `${rubyKatakana}${kanaTailKatakana}`;
}

function isPlainKanaParenthetical(island: ParentheticalIsland): boolean {
  if (island.delimiter.open !== "(" && island.delimiter.open !== "（") return false;
  if (island.innerPrepared.pureMeow !== undefined) return false;
  if ((island.innerPrepared.parentheticalIslands ?? []).length > 0) return false;
  const innerText = island.innerPrepared.sourceText;
  return innerText.length > 0 && isInferredRubyReadingSurface(innerText);
}

const PARENTHETICAL_RUBY_BASE_CLOSING_KINDS: ReadonlySet<UtteranceClosureKind> = new Set([
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "label_separator"
]);

function parentheticalRubyAbsorptionBefore(
  tokens: readonly RuntimeHaruToken[],
  island: ParentheticalIsland,
  rubyKatakana: string
): ParentheticalRubyAbsorption | null {
  const anchor = island.sourceBoundary.afterOrdinal;
  if (anchor === null) return null;

  const before: { readonly token: RuntimeHaruToken; readonly index: number }[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const span = token.sourceSpan ?? null;
    if (span !== null && span.endOrdinal <= anchor) {
      before.push({ token, index });
    }
  }
  if (before.length === 0) return null;

  const lastBefore = before.length - 1;
  for (let tokenStart = lastBefore; tokenStart >= 0; tokenStart -= 1) {
    if (
      tokenStart < lastBefore &&
      closesUtteranceAs(
        utteranceClosureAt(null, tokens, before[tokenStart]!.index),
        PARENTHETICAL_RUBY_BASE_CLOSING_KINDS
      )
    ) {
      break;
    }
    const suffixTokens = before.slice(tokenStart);
    const surface = suffixTokens.map(({ token }) => token.surface).join("");
    if (minimumAlignedReadingLength(surface) > rubyKatakana.length) break;
    const tokenStartIndex = suffixTokens[0]!.index;
    const tokenStartChar = 0;
    const alignment = alignReading(surface, rubyKatakana);
    if (alignment !== null && Array.from(surface).some(isKanji)) {
      return {
        tokenStart: tokenStartIndex,
        charStartInToken: tokenStartChar,
        alignment: alignment.map(([surfaceChar, reading]) => ({ surface: surfaceChar, reading }))
      };
    }
  }

  const last = before[before.length - 1]!;
  const lastChars = Array.from(last.token.surface);
  for (let charStart = lastChars.length - 1; charStart > 0; charStart -= 1) {
    const surface = lastChars.slice(charStart).join("");
    const alignment = alignReading(surface, rubyKatakana);
    if (alignment !== null && Array.from(surface).some(isKanji)) {
      return {
        tokenStart: last.index,
        charStartInToken: charStart,
        alignment: alignment.map(([surfaceChar, reading]) => ({ surface: surfaceChar, reading }))
      };
    }
  }

  return null;
}

function applyParentheticalRubyAbsorption(
  tokens: RuntimeHaruToken[],
  absorption: ParentheticalRubyAbsorption
): void {
  if (absorption.charStartInToken > 0) {
    splitTokenForParentheticalRuby(tokens, absorption.tokenStart, absorption.charStartInToken);
  }

  let alignmentIndex = 0;
  for (let tokenIndex = absorption.tokenStart; tokenIndex < tokens.length && alignmentIndex < absorption.alignment.length; tokenIndex += 1) {
    const token = tokens[tokenIndex]!;
    const chars = Array.from(token.surface);
    const readings: string[] = [];
    for (let charIndex = 0; charIndex < chars.length && alignmentIndex < absorption.alignment.length; charIndex += 1) {
      const aligned = absorption.alignment[alignmentIndex]!;
      if (aligned.surface !== chars[charIndex]) break;
      readings.push(aligned.reading);
      alignmentIndex += 1;
    }
    if (readings.length > 0) {
      const newReading = readings.join("");
      token.reading = newReading;
      token.dictionaryFormReading = newReading;
    }
  }
}

function splitTokenForParentheticalRuby(
  tokens: RuntimeHaruToken[],
  tokenIndex: number,
  charStart: number
): void {
  const token = tokens[tokenIndex];
  if (token === undefined) return;
  const chars = Array.from(token.surface);
  if (charStart <= 0 || charStart >= chars.length) return;

  const prefixSurface = chars.slice(0, charStart).join("");
  const suffixSurface = chars.slice(charStart).join("");
  const prefix = cloneTokenWithSurfaceAndReading(token, prefixSurface, token.reading);
  const suffix = cloneTokenWithSurfaceAndReading(token, suffixSurface, token.reading);
  tokens.splice(tokenIndex, 1, prefix, suffix);
}

function cloneTokenWithSurfaceAndReading(
  token: RuntimeHaruToken,
  surface: string,
  reading: string
): RuntimeHaruToken {
  const cloned: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(token, { kind: "replace", surface }),
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading
  };
  if (token.normalizedForm === token.surface) {
    cloned.normalizedForm = surface;
  }
  delete cloned.splitA;
  delete cloned.splitB;
  return cloned;
}
