
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { codepointLength, bisectLeft } from "../source-coordinate.js";
import { analyzerTokenCharSpans } from "./analyzer-input-offsets.js";
import type { TerminalRoleOccurrence } from "../source-coordinate.js";

type TerminalRoleSurfaceChars = readonly (readonly [surface: string, chars: readonly string[]])[];
const _terminalRoleBaseSurfaceCharsCache = new WeakMap<LookupTables, TerminalRoleSurfaceChars>();
function getTerminalRoleBaseSurfaceChars(lookups: LookupTables): TerminalRoleSurfaceChars {
  let cached = _terminalRoleBaseSurfaceCharsCache.get(lookups);
  if (cached === undefined) {
    const surfaces = Array.from(lookups.TERMINAL_ROLE_SFP_BY_SURFACE.keys())
      .sort((left, right) => codepointLength(right) - codepointLength(left));
    cached = surfaces.map((surface) => [surface, Array.from(surface)] as const);
    _terminalRoleBaseSurfaceCharsCache.set(lookups, cached);
  }
  return cached;
}

function matchTerminalRoleSurfaceChars(chars: readonly string[], idx: number, lookups: LookupTables): readonly [end: number, sfp: string] | undefined {
  for (const [surface, surfaceChars] of getTerminalRoleBaseSurfaceChars(lookups)) {
    if (chars.slice(idx, idx + surfaceChars.length).join("") !== surface) {
      continue;
    }
    let end = idx + surfaceChars.length;
    while (end < chars.length && lookups.TERMINAL_ROLE_LENGTHENERS.has(chars[end] ?? "")) {
      end += 1;
    }
    const sfp = lookups.TERMINAL_ROLE_SFP_BY_SURFACE.get(surface);
    if (sfp === undefined) {
      continue;
    }
    return [end, sfp];
  }
  return undefined;
}

function endsWithTerminalRoleSurfaceChars(chars: readonly string[], end: number, lookups: LookupTables): boolean {
  return getTerminalRoleBaseSurfaceChars(lookups).some(([surface, surfaceChars]) => {
    const start = end - surfaceChars.length;
    return start >= 0 && chars.slice(start, end).join("") === surface;
  });
}

function checkTerminalRoleHostChars(
  chars: readonly string[],
  idx: number,
  lookups: LookupTables,
  finalCheck: (char: string) => boolean
): boolean {
  const match = matchTerminalRoleSurfaceChars(chars, Math.max(0, idx - 2), lookups);
  if (match !== undefined && idx >= 2 && match[0] === idx) {
    return true;
  }

  let cursor = idx - 1;
  let skipped = false;
  while (cursor >= 0 && lookups.TERMINAL_ROLE_HOST_SKIP.has(chars[cursor] ?? "")) {
    skipped = true;
    cursor -= 1;
  }
  if (cursor < 0) {
    return false;
  }
  if (skipped && endsWithTerminalRoleSurfaceChars(chars, cursor + 1, lookups)) {
    return false;
  }
  return finalCheck(chars[cursor] ?? "");
}

function hasTerminalRoleHostChars(chars: readonly string[], idx: number, lookups: LookupTables): boolean {
  return checkTerminalRoleHostChars(chars, idx, lookups, (ch) => !lookups.TERMINAL_ROLE_PREV_DISALLOWED.has(ch));
}

function hasWeakFollowerPredicateHostChars(chars: readonly string[], idx: number, lookups: LookupTables): boolean {
  return checkTerminalRoleHostChars(chars, idx, lookups, (ch) => lookups.TERMINAL_ROLE_WEAK_HOST_ENDINGS.has(ch));
}

export function stripTerminalRoleTails(text: string, lookups: LookupTables): readonly [text: string, occurrences: readonly TerminalRoleOccurrence[]] {
  if (text.length === 0) {
    return [text, []];
  }

  const chars = Array.from(text);
  const stripped: string[] = [];
  const occurrences: TerminalRoleOccurrence[] = [];
  let index = 0;
  while (index < chars.length) {
    let matchedSurface = matchTerminalRoleSurfaceChars(chars, index, lookups);
    if (matchedSurface !== undefined) {
      const [nextIndex] = matchedSurface;
      const nextChar = chars[nextIndex] ?? "";
      if (!hasTerminalRoleHostChars(chars, index, lookups)) {
        matchedSurface = undefined;
      } else if (nextChar.length > 0 && !lookups.TERMINAL_ROLE_FOLLOWERS.has(nextChar)) {
        const chained = matchTerminalRoleSurfaceChars(chars, nextIndex, lookups);
        if (chained === undefined) {
          matchedSurface = undefined;
        }
      } else if (lookups.GRAMMAR_BOUNDARY_CLAUSE_PAUSE_SURFACES.has(nextChar) && !hasWeakFollowerPredicateHostChars(chars, index, lookups)) {
        matchedSurface = undefined;
      }
    }
    if (matchedSurface !== undefined) {
      let [consumeEnd, sfp] = matchedSurface;
      while (true) {
        occurrences.push({ pos: stripped.length, sfp });
        const chained = matchTerminalRoleSurfaceChars(chars, consumeEnd, lookups);
        if (chained === undefined) {
          break;
        }
        const [chainedEnd, chainedSfp] = chained;
        const chainedNextChar = chars[chainedEnd] ?? "";
        if (chainedNextChar.length > 0 && !lookups.TERMINAL_ROLE_FOLLOWERS.has(chainedNextChar)) {
          break;
        }
        sfp = chainedSfp;
        consumeEnd = chainedEnd;
      }
      index = consumeEnd;
      continue;
    }
    stripped.push(chars[index] ?? "");
    index += 1;
  }
  return [stripped.join(""), occurrences];
}

export function attachTerminalRoleFlags(
  tokens: RuntimeHaruToken[],
  occurrences: readonly TerminalRoleOccurrence[],
  removedOffsets: ReadonlySet<number>
): void {
  if (tokens.length === 0 || occurrences.length === 0) {
    return;
  }
  const sortedRemoved = [...removedOffsets].sort((left, right) => left - right);
  const toFinalPos = (origPos: number) => origPos - bisectLeft(sortedRemoved, origPos);
  const charSpans = analyzerTokenCharSpans(tokens);
  const startToIndex = new Map<number, number>();
  for (const [index, span] of charSpans.entries()) {
    if (!startToIndex.has(span.start)) {
      startToIndex.set(span.start, index);
    }
  }
  const position = charSpans[charSpans.length - 1]?.end ?? 0;

  for (const occurrence of occurrences) {
    const finalPos = toFinalPos(occurrence.pos);
    const targetIndex = startToIndex.get(finalPos);
    const target = targetIndex === undefined ? undefined : tokens[targetIndex];
    if (target !== undefined) {
      target.terminalRoleSfpBefore = occurrence.sfp;
      target.terminalRoleSfpBeforeCount = (target.terminalRoleSfpBeforeCount ?? 0) + 1;
      continue;
    }
    if (finalPos !== position) {
      continue;
    }
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index];
      if (token === undefined) {
        continue;
      }
      token.terminalRoleSfpAfter = occurrence.sfp;
      token.terminalRoleSfpAfterCount = (token.terminalRoleSfpAfterCount ?? 0) + 1;
      break;
    }
  }
}
