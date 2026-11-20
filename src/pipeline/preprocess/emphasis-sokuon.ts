
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { POS0, pos0in, PUNCTUATION_BITS, 感動詞, 助詞, 副詞 } from "../../types/pos.js";
import { bisectLeft } from "../source-coordinate.js";
import { analyzerTokenCharSpans } from "./analyzer-input-offsets.js";

export const SOKUON_CHARS = new Set(["っ", "ッ"]);
export const EMPHASIS_SOKUON_AFTER = new Set(Array.from("！？、。」）】』］｝〉!?.,;:)]}> \t\n\r”’~♡♥…‥〜～―─—"));
export const EMPHASIS_SOKUON_BEFORE = new Set(Array.from("！？、。「（【『［｛〈!?([{< \t\n\r“‘"));
export const NO_BOUNDARIES: ReadonlySet<number> = new Set();

export function findEmphasisSokuonOffsets(text: string, trailingBoundaries: ReadonlySet<number> = NO_BOUNDARIES): Set<number> {
  const offsets = new Set<number>();
  const chars = Array.from(text);
  let index = 0;
  while (index < chars.length) {
    if (!SOKUON_CHARS.has(chars[index] ?? "")) {
      index += 1;
      continue;
    }
    const runStart = index;
    while (index < chars.length && SOKUON_CHARS.has(chars[index] ?? "")) {
      index += 1;
    }
    const runEnd = index;
    const prevChar = runStart > 0 ? chars[runStart - 1] : undefined;
    const nextChar = runEnd < chars.length ? chars[runEnd] : undefined;
    const leading = prevChar === undefined || EMPHASIS_SOKUON_BEFORE.has(prevChar);
    const trailing = nextChar === undefined || EMPHASIS_SOKUON_AFTER.has(nextChar) || trailingBoundaries.has(runEnd);
    const removeFrom = leading || trailing ? runStart : runStart + 1;
    for (let pos = removeFrom; pos < runEnd; pos += 1) {
      offsets.add(pos);
    }
  }
  return offsets;
}

function followsMimeticAdverbialFrame(
  spans: readonly { readonly token: RuntimeHaruToken }[],
  index: number,
  lookups: LookupTables
): boolean {
  const token = spans[index + 1]?.token;
  if (token === undefined) {
    return false;
  }
  return lookups.SOKUON_MIMETIC_ADVERBIAL_FOLLOWERS.has(token.surface) && (token.pos & POS0) === 助詞;
}

function sokuonLemmaPrefixLength(token: RuntimeHaruToken): number | null {
  const surfaceChars = Array.from(token.surface);
  const lemmaChars = Array.from(token.dictionaryForm);
  if (lemmaChars.length === 0 || lemmaChars.length > surfaceChars.length) {
    return null;
  }
  for (const [index, char] of lemmaChars.entries()) {
    if (surfaceChars[index] !== char) {
      return null;
    }
  }
  if (!surfaceChars.slice(lemmaChars.length).every((char) => SOKUON_CHARS.has(char))) {
    return null;
  }
  return lemmaChars.length;
}

export function checkRealSokuon(
  pass1Tokens: readonly RuntimeHaruToken[],
  pass2Tokens: readonly RuntimeHaruToken[],
  offsets: ReadonlySet<number>,
  lookups: LookupTables,
  pauseJunctions: ReadonlySet<number> = NO_BOUNDARIES
): Set<number> {
  const sortedOffsets = [...offsets].sort((left, right) => left - right);
  const toCleaned = (origPos: number) => origPos - bisectLeft(sortedOffsets, origPos);
  const pass1CharSpans = analyzerTokenCharSpans(pass1Tokens);
  const pass1Spans = pass1Tokens.map((token, index) => ({
    start: pass1CharSpans[index]!.start,
    end: pass1CharSpans[index]!.end,
    token
  }));

  const pass2CharSpans = analyzerTokenCharSpans(pass2Tokens);
  const pass2Spans = new Set<string>();
  const pass2SpanToken = new Map<string, RuntimeHaruToken>();
  for (const [index, token] of pass2Tokens.entries()) {
    const span = pass2CharSpans[index]!;
    const key = `${span.start}:${span.end}`;
    pass2Spans.add(key);
    pass2SpanToken.set(key, token);
  }

  const restore = new Set<number>();
  for (const offset of offsets) {
    let runEnd = offset + 1;
    while (offsets.has(runEnd)) runEnd += 1;
    if (
      pauseJunctions.has(runEnd) &&
      pass2CharSpans.some((span) => span.start < toCleaned(runEnd) && toCleaned(runEnd) < span.end)
    ) {
      restore.add(offset);
      continue;
    }
    for (const [index, { start, end, token }] of pass1Spans.entries()) {
      if (!(start <= offset && offset < end)) {
        continue;
      }
      if ((token.pos & POS0) === 助詞) {
        restore.add(offset);
        break;
      }
      if ((token.pos & POS0) === 副詞 && [...SOKUON_CHARS].some((char) => token.dictionaryForm.includes(char))) {
        const lemmaLength = sokuonLemmaPrefixLength(token);
        const relative = offset - start;
        if (lemmaLength !== null && relative >= lemmaLength) {
          break;
        }
        const corePos: number[] = [];
        for (let p = start; p < end; p += 1) {
          if (!offsets.has(p)) corePos.push(toCleaned(p));
        }
        if (corePos.length > 0) {
          const coreKey = `${Math.min(...corePos)}:${Math.max(...corePos) + 1}`;
          const p2 = pass2SpanToken.get(coreKey);
          if (p2 !== undefined) {
            if (lemmaLength !== null && relative < lemmaLength - 1) {
              restore.add(offset);
              break;
            }
            const mimeticAdverbialFrame =
              lemmaLength !== null && followsMimeticAdverbialFrame(pass1Spans, index, lookups);
            if (mimeticAdverbialFrame || (p2.pos & POS0) !== 副詞) {
              restore.add(offset);
            }
          }
        }
        break;
      }
      if ((token.pos & POS0) !== 感動詞 || ![...SOKUON_CHARS].some((char) => token.dictionaryForm.includes(char))) {
        break;
      }
      const corePositions: number[] = [];
      for (let pos = start; pos < end; pos += 1) {
        if (!offsets.has(pos)) {
          corePositions.push(toCleaned(pos));
        }
      }
      if (corePositions.length === 0) {
        break;
      }
      const coreStart = Math.min(...corePositions);
      const coreEnd = Math.max(...corePositions) + 1;
      if (pass2Spans.has(`${coreStart}:${coreEnd}`)) {
        restore.add(offset);
      }
      break;
    }
  }
  return restore;
}

export function removedRunsCrossedAtJunction(
  tokens: readonly RuntimeHaruToken[],
  removeOffsets: ReadonlySet<number>,
  junctions: ReadonlySet<number>
): Set<number> {
  const crossed = new Set<number>();
  if (junctions.size === 0) {
    return crossed;
  }
  const spans = analyzerTokenCharSpans(tokens);
  const sortedRemoved = [...removeOffsets].sort((left, right) => left - right);
  for (const offset of removeOffsets) {
    let runEnd = offset + 1;
    while (removeOffsets.has(runEnd)) runEnd += 1;
    if (!junctions.has(runEnd)) continue;
    const junction = runEnd - bisectLeft(sortedRemoved, runEnd);
    if (spans.some((span) => span.start < junction && junction < span.end)) {
      crossed.add(offset);
    }
  }
  return crossed;
}

export function attachEmphasisSokuonFlags(tokens: RuntimeHaruToken[], removedOffsets: ReadonlySet<number>): void {
  const sortedRemoved = [...removedOffsets].sort((left, right) => left - right);
  const toCleaned = (origOffset: number) => origOffset - bisectLeft(sortedRemoved, origOffset);
  const tokenRanges = analyzerTokenCharSpans(tokens);

  for (const origOffset of removedOffsets) {
    const cleanedPos = toCleaned(origOffset);
    for (const [index, range] of tokenRanges.entries()) {
      const token = tokens[index];
      if (token === undefined || pos0in(token.pos, PUNCTUATION_BITS)) {
        continue;
      }
      if (cleanedPos === range.start) {
        token.leadingSokuon = (token.leadingSokuon ?? 0) + 1;
        break;
      }
      if (cleanedPos === range.end) {
        token.trailingSokuon = (token.trailingSokuon ?? 0) + 1;
        break;
      }
    }
  }
}
