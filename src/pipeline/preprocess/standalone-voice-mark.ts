
import type { RuntimeHaruToken } from "../../types/token.js";
import { bisectLeft } from "../source-coordinate.js";
import { analyzerTokenCharSpans } from "./analyzer-input-offsets.js";

export interface StandaloneVoiceMarkEdits {
  readonly removed: ReadonlySet<number>;
  readonly substituted: ReadonlyMap<number, string>;
  readonly markedBases: readonly number[];
}

const SPACING_VOICE_MARK = "゛";
const COMBINING_VOICE_MARK = "゙";

export function findStandaloneVoiceMarkEdits(text: string): StandaloneVoiceMarkEdits | null {
  if (!text.includes(SPACING_VOICE_MARK) && !text.includes(COMBINING_VOICE_MARK)) {
    return null;
  }
  const chars = Array.from(text);
  const removed = new Set<number>();
  const substituted = new Map<number, string>();
  const markedBases = new Set<number>();
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    if (char !== SPACING_VOICE_MARK && char !== COMBINING_VOICE_MARK) {
      continue;
    }
    let base = index - 1;
    while (base >= 0 && removed.has(base)) {
      base -= 1;
    }
    const baseChar = base >= 0 ? chars[base] : undefined;
    if (char === COMBINING_VOICE_MARK && base === index - 1 && baseChar !== undefined
      && Array.from(`${baseChar}${char}`.normalize("NFC")).length === 1) {
      continue;
    }
    removed.add(index);
    if (baseChar === "ウ" && base === index - 1) {
      substituted.set(base, "ヴ");
    } else if (baseChar !== undefined && !substituted.has(base) && isVoiceMarkKanaBase(baseChar)) {
      markedBases.add(base);
    }
  }
  return removed.size === 0
    ? null
    : { removed, substituted, markedBases: [...markedBases].sort((left, right) => left - right) };
}

function isVoiceMarkKanaBase(char: string): boolean {
  return /^[\p{Script=Hiragana}\p{Script=Katakana}ー]$/u.test(char);
}

export function applyStandaloneVoiceMarkEdits(text: string, edits: StandaloneVoiceMarkEdits): string {
  return Array.from(text)
    .map((char, index) => (edits.removed.has(index) ? "" : edits.substituted.get(index) ?? char))
    .join("");
}

function projectOffsetAcrossRemoved(offset: number, sortedRemoved: readonly number[], removed: ReadonlySet<number>): number | null {
  return removed.has(offset) ? null : offset - bisectLeft(sortedRemoved, offset);
}

export function attachStandaloneVoiceMarkFlags(
  tokens: RuntimeHaruToken[],
  edits: StandaloneVoiceMarkEdits,
  prolonged: ReadonlySet<number>,
  emphasisRemoved: ReadonlySet<number>
): void {
  const stages = [edits.removed, prolonged, emphasisRemoved].map((set) => ({
    set,
    sorted: [...set].sort((left, right) => left - right)
  }));
  const spans = analyzerTokenCharSpans(tokens);
  for (const base of edits.markedBases) {
    let offset: number | null = base;
    for (const stage of stages) {
      if (offset === null) {
        break;
      }
      offset = projectOffsetAcrossRemoved(offset, stage.sorted, stage.set);
    }
    if (offset === null) {
      continue;
    }
    const tokenIndex = spans.findIndex((span) => span.start <= offset! && offset! < span.end);
    const token = tokenIndex >= 0 ? tokens[tokenIndex] : undefined;
    if (token !== undefined) {
      token.sourceVoiceMarkOffsets = [...(token.sourceVoiceMarkOffsets ?? []), offset];
    }
  }
}
