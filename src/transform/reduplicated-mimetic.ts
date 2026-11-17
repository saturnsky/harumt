import type { RuntimeHaruToken } from "../types/token.js";
import { mergeRuntimeTokenSourceIdentity } from "../types/token.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../pipeline/clause-layout/trivia.js";
import { isKana, isSmallKana, toKatakana } from "../utils/char-class.js";

export const REDUPLICATED_FRAGMENT_REASON = "reduplicated_fragment_unit";

export type MimeticEntryResolver = (form: string, reading: string) => Promise<boolean>;

const MAX_UNIT_TOKENS = 4;
const REDUPLICATION_POS0 = new Set(["副詞", "感動詞"]);

export async function normalizeReduplications(
  tokens: readonly RuntimeHaruToken[],
  posName: (token: RuntimeHaruToken) => string,
  adverbPos: number,
  hasAdverbEntry: MimeticEntryResolver
): Promise<RuntimeHaruToken[]> {
  const restored = await restoreFragmentedUnits(tokens, adverbPos, hasAdverbEntry);
  return markReduplicationContinuations(restored, posName);
}

async function restoreFragmentedUnits(
  tokens: readonly RuntimeHaruToken[],
  adverbPos: number,
  hasAdverbEntry: MimeticEntryResolver
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const restored = await fragmentRunAt(tokens, index, adverbPos, hasAdverbEntry);
    if (restored === null) {
      result.push(tokens[index]!);
      continue;
    }
    result.push(...restored.tokens);
    index = restored.end - 1;
    dirty = true;
  }
  return dirty ? result : [...tokens];
}

async function fragmentRunAt(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  adverbPos: number,
  hasAdverbEntry: MimeticEntryResolver
): Promise<{ readonly tokens: readonly RuntimeHaruToken[]; readonly end: number } | null> {
  for (let unitLength = 2; unitLength <= MAX_UNIT_TOKENS; unitLength += 1) {
    const unit = tokens.slice(index, index + unitLength);
    if (unit.length < unitLength || !isFragmentUnit(unit, tokens, index)) {
      continue;
    }
    const unitSurface = unit.map((token) => token.surface).join("");
    let end = index + unitLength;
    while (end + unitLength <= tokens.length && repeatsUnit(tokens, end, unitLength, unitSurface)) {
      end += unitLength;
    }
    if (end === index + unitLength || tokens.slice(index, end).some((token) => token.sourceSpan == null)) {
      continue;
    }
    if (await hasAdverbEntry(unitSurface, toKatakana(unitSurface))) {
      const units: RuntimeHaruToken[] = [];
      for (let start = index; start < end; start += unitLength) {
        units.push(mergedAdverb(tokens.slice(start, start + unitLength), unitSurface, adverbPos));
      }
      return { tokens: units, end };
    }
    const surface = tokens.slice(index, end).map((token) => token.surface).join("");
    if (await hasAdverbEntry(surface, toKatakana(surface))) {
      return { tokens: [mergedAdverb(tokens.slice(index, end), surface, adverbPos)], end };
    }
  }
  return null;
}

function mergedAdverb(run: readonly RuntimeHaruToken[], form: string, adverbPos: number): RuntimeHaruToken {
  const surface = run.map((token) => token.surface).join("");
  const reading = toKatakana(surface);
  return mergeRuntimeTokenSourceIdentity({
    surface,
    dictionaryForm: form,
    reading,
    dictionaryFormReading: toKatakana(form),
    pos: adverbPos,
    dictionaryId: 0,
    syntheticReason: REDUPLICATED_FRAGMENT_REASON
  } as RuntimeHaruToken, run as [RuntimeHaruToken, ...RuntimeHaruToken[]]);
}

function isFragmentUnit(unit: readonly RuntimeHaruToken[], tokens: readonly RuntimeHaruToken[], index: number): boolean {
  return unit.every((token, offset) =>
    isSingleMora(token.surface)
    && (offset === 0 || !separatedAs(tokens, index + offset, DETACHED_SEPARATIONS)));
}

function isSingleMora(surface: string): boolean {
  const chars = [...surface];
  if (chars.length === 0 || chars.length > 2 || !chars.every(isKana) || chars[0] === "ー" || isSmallKana(chars[0]!)) {
    return false;
  }
  return chars.length === 1 || isSmallKana(chars[1]!);
}

function repeatsUnit(tokens: readonly RuntimeHaruToken[], start: number, unitLength: number, unitSurface: string): boolean {
  const next = tokens.slice(start, start + unitLength);
  if (next.map((token) => token.surface).join("") !== unitSurface) {
    return false;
  }
  return next.every((_, offset) => !separatedAs(tokens, start + offset, DETACHED_SEPARATIONS));
}

function markReduplicationContinuations(
  tokens: readonly RuntimeHaruToken[],
  posName: (token: RuntimeHaruToken) => string
): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    const prev = tokens[index - 1];
    if (
      prev === undefined
      || token.sourceReduplication === true
      || !REDUPLICATION_POS0.has(posName(token))
      || prev.surface !== token.surface
      || prev.dictionaryForm !== token.dictionaryForm
      || posName(prev) !== posName(token)
      || separatedAs(tokens, index, DETACHED_SEPARATIONS)
    ) {
      return token;
    }
    dirty = true;
    return { ...token, sourceReduplication: true };
  });
  return dirty ? result : [...tokens];
}
