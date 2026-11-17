
import { parse } from "smol-toml";

import { type DataLoader } from "../../data-loader.js";
import { resolveDataSection } from "../../dictionary/data-section.js";
import { fullwidthAsciiToHalfwidth } from "../../utils/char-class.js";
import type { DataPathOptions } from "../data-paths.js";

export interface PunctuationConfig {
  charMap: readonly (readonly [string, string])[];
  multiCharPatterns: readonly (readonly [string, string])[];
  noSpaceBefore: string;
  spaceAfter: string;
  noSpaceAfter: string;
  attachLeft?: string;
  dropRelocatedWithoutLeftWord?: string;
  openingQuotes: string;
  closingQuotes: string;
}

interface RawPunctuationConfig {
  readonly char_map: readonly (readonly [string, string])[];
  readonly multi_char_patterns: readonly (readonly [string, string])[];
  readonly no_space_before: string;
  readonly space_after: string;
  readonly no_space_after: string;
  readonly attach_left?: string;
  readonly drop_relocated_without_left_word?: string;
  readonly opening_quotes: string;
  readonly closing_quotes: string;
}

interface RawPunctuationToml {
  readonly punctuation?: RawPunctuationConfig;
}

interface PunctuationRuntimeConfig {
  readonly charMap: ReadonlyMap<string, string>;
  readonly noSpaceBefore: ReadonlySet<string>;
  readonly spaceAfter: ReadonlySet<string>;
  readonly noSpaceAfter: ReadonlySet<string>;
  readonly attachLeft: ReadonlySet<string>;
  readonly dropRelocatedWithoutLeftWord: ReadonlySet<string>;
  readonly openingQuotes: ReadonlySet<string>;
  readonly closingQuotes: ReadonlySet<string>;
}

let _punctuationTomlText: string | undefined;
let defaultConfig: PunctuationConfig | undefined;
const runtimeConfigCache = new WeakMap<PunctuationConfig, PunctuationRuntimeConfig>();

export async function initPunctuation(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("config"), "punctuation.toml");
  _punctuationTomlText = await loader.readTextFile(filePath);
}

export function convertPunctuation(text: string, options: DataPathOptions = {}): string {
  const config = Object.keys(options).length === 0 ? getDefaultConfig() : loadPunctuationConfig(options);
  return convertPunctuationWithConfig(text, config);
}

export interface PunctuationSegment {
  readonly text: string;
  readonly keys?: readonly number[];
  readonly boundToPrevious?: true;
  readonly verbatim?: true;
  readonly relocated?: true;
}

interface OwnedChar {
  readonly char: string;
  readonly segmentIndex: number;
  readonly boundToPrevious?: true;
  readonly sourceSegmentIndexes: readonly number[];
  readonly verbatim?: true;
  readonly relocated?: true;
  readonly convertedPunctuation?: true;
}

export function convertPunctuationSegments(
  segments: readonly PunctuationSegment[],
  options: DataPathOptions = {}
): PunctuationSegment[] {
  const config = Object.keys(options).length === 0 ? getDefaultConfig() : loadPunctuationConfig(options);
  return convertPunctuationSegmentsWithConfig(segments, config);
}

export function convertPunctuationSegmentsWithConfig(
  segments: readonly PunctuationSegment[],
  config: PunctuationConfig
): PunctuationSegment[] {
  const runtimeConfig = runtimeConfigFor(config);
  const owned = normalizePunctuationSpacingOwned(
    normalizeEllipsisOwned(
      mapPunctuationCharactersOwned(
        applyMultiCharPatternsOwned(segmentsToOwnedChars(segments), config),
        runtimeConfig.charMap
      )
    ),
    runtimeConfig
  );
  const textBySegment = new Map<number, string>();
  const keySourceSegmentsBySegment = new Map<number, Set<number>>();
  for (const item of owned) {
    textBySegment.set(item.segmentIndex, `${textBySegment.get(item.segmentIndex) ?? ""}${item.char}`);
    const existing = keySourceSegmentsBySegment.get(item.segmentIndex) ?? new Set<number>();
    for (const sourceSegmentIndex of item.sourceSegmentIndexes) {
      existing.add(sourceSegmentIndex);
    }
    keySourceSegmentsBySegment.set(item.segmentIndex, existing);
  }
  const result: PunctuationSegment[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const source = segments[index];
    if (source === undefined) {
      continue;
    }
    const text = textBySegment.get(index) ?? "";
    if (text.length === 0) {
      continue;
    }
    const keys = mergedKeysForSourceSegments(segments, keySourceSegmentsBySegment.get(index) ?? new Set([index]));
    result.push({
      text,
      ...(keys.length > 0 ? { keys } : {})
    });
  }
  return result;
}


export function convertPunctuationWithConfig(text: string, config: PunctuationConfig): string {
  const runtimeConfig = runtimeConfigFor(config);
  let converted = text;
  for (const [pattern, replacement] of config.multiCharPatterns) {
    converted = converted.split(pattern).join(replacement);
  }

  return normalizePunctuationSpacing(
    normalizeEllipsisMarked(translateCharactersMarked(converted, runtimeConfig.charMap)),
    runtimeConfig
  );
}

export function punctuationOpensWordBoundaryAfter(char: string, options: DataPathOptions = {}): boolean {
  const config = runtimeConfigFor(
    options.dataDir === undefined ? getDefaultConfig() : loadPunctuationConfig(options)
  );
  return config.spaceAfter.has(config.charMap.get(char) ?? char);
}

export function loadPunctuationConfig(options: DataPathOptions = {}): PunctuationConfig {
  if (Object.keys(options).length > 0) {
    throw new Error("loadPunctuationConfig with custom DataPathOptions is no longer supported — use initPunctuation() for default config");
  }
  if (_punctuationTomlText === undefined) {
    throw new Error("Punctuation not initialized — call initPunctuation() first");
  }
  return parsePunctuationToml(_punctuationTomlText);
}

export function parsePunctuationToml(source: string): PunctuationConfig {
  const raw = (parse(source) as RawPunctuationToml).punctuation;
  if (raw === undefined) {
    throw new Error("missing punctuation config section: punctuation");
  }
  return {
    charMap: raw.char_map,
    multiCharPatterns: raw.multi_char_patterns,
    noSpaceBefore: raw.no_space_before,
    spaceAfter: raw.space_after,
    noSpaceAfter: raw.no_space_after,
    attachLeft: raw.attach_left ?? "",
    dropRelocatedWithoutLeftWord: raw.drop_relocated_without_left_word ?? "",
    openingQuotes: raw.opening_quotes,
    closingQuotes: raw.closing_quotes
  };
}

function getDefaultConfig(): PunctuationConfig {
  defaultConfig ??= loadPunctuationConfig();
  return defaultConfig;
}

function runtimeConfigFor(config: PunctuationConfig): PunctuationRuntimeConfig {
  let runtimeConfig = runtimeConfigCache.get(config);
  if (runtimeConfig === undefined) {
    runtimeConfig = {
      charMap: buildCharMap(config.charMap),
      noSpaceBefore: new Set([...config.noSpaceBefore]),
      spaceAfter: new Set([...config.spaceAfter]),
      noSpaceAfter: new Set([...config.noSpaceAfter]),
      attachLeft: new Set([...config.attachLeft ?? ""]),
      dropRelocatedWithoutLeftWord: new Set([...config.dropRelocatedWithoutLeftWord ?? ""]),
      openingQuotes: new Set([...config.openingQuotes]),
      closingQuotes: new Set([...config.closingQuotes])
    };
    runtimeConfigCache.set(config, runtimeConfig);
  }
  return runtimeConfig;
}

function buildCharMap(configured: readonly (readonly [string, string])[]): ReadonlyMap<string, string> {
  const map = new Map<string, string>(configured);
  for (const [start, end] of [[0xff21, 0xff3b], [0xff41, 0xff5b], [0xff10, 0xff1a]] as const) {
    for (let code = start; code < end; code += 1) {
      const char = String.fromCodePoint(code);
      const half = fullwidthAsciiToHalfwidth(char);
      if (half !== null) {
        map.set(char, half);
      }
    }
  }
  return map;
}

interface MappedChar {
  readonly char: string;
  readonly convertedPunctuation: boolean;
}

function translateCharactersMarked(text: string, charMap: ReadonlyMap<string, string>): MappedChar[] {
  const result: MappedChar[] = [];
  for (const char of text) {
    const mapped = charMap.get(char) ?? char;
    result.push({ char: mapped, convertedPunctuation: mapped !== char });
  }
  return result;
}

function normalizeEllipsisMarked(chars: readonly MappedChar[]): MappedChar[] {
  const result: MappedChar[] = [];
  for (let index = 0; index < chars.length;) {
    const item = chars[index];
    if (item === undefined) {
      break;
    }
    result.push(item);
    index += 1;
    if (item.char !== "…") {
      continue;
    }
    while (chars[index]?.char === "…") {
      index += 1;
    }
  }
  return result;
}

function segmentsToOwnedChars(segments: readonly PunctuationSegment[]): OwnedChar[] {
  const chars: OwnedChar[] = [];
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex];
    if (segment === undefined) {
      continue;
    }
    for (const char of segment.text) {
      chars.push({
        char,
        segmentIndex,
        ...(segment.boundToPrevious === true ? { boundToPrevious: true as const } : {}),
        sourceSegmentIndexes: [segmentIndex],
        ...(segment.verbatim === true ? { verbatim: true as const } : {}),
        ...(segment.relocated === true ? { relocated: true as const } : {})
      });
    }
  }
  return chars;
}

function mergedKeysForSourceSegments(
  segments: readonly PunctuationSegment[],
  sourceSegmentIndexes: ReadonlySet<number>
): readonly number[] {
  const keys = new Set<number>();
  for (const sourceSegmentIndex of sourceSegmentIndexes) {
    const segment = segments[sourceSegmentIndex];
    for (const key of segment?.keys ?? []) {
      keys.add(key);
    }
  }
  return [...keys].sort((left, right) => left - right);
}

function applyMultiCharPatternsOwned(chars: readonly OwnedChar[], config: PunctuationConfig): OwnedChar[] {
  let result = chars.slice();
  for (const [pattern, replacement] of config.multiCharPatterns) {
    result = replaceOwnedPattern(result, [...pattern], [...replacement]);
  }
  return result;
}

function replaceOwnedPattern(
  chars: readonly OwnedChar[],
  pattern: readonly string[],
  replacement: readonly string[]
): OwnedChar[] {
  if (pattern.length === 0) {
    return chars.slice();
  }
  const result: OwnedChar[] = [];
  for (let index = 0; index < chars.length;) {
    let matches = index + pattern.length <= chars.length;
    if (matches) {
      for (let offset = 0; offset < pattern.length; offset += 1) {
        if (chars[index + offset]?.char !== pattern[offset] || chars[index + offset]?.verbatim === true) {
          matches = false;
          break;
        }
      }
    }
    if (!matches) {
      const item = chars[index];
      if (item !== undefined) {
        result.push(item);
      }
      index += 1;
      continue;
    }
    for (let offset = 0; offset < replacement.length; offset += 1) {
      const owner = chars[index + Math.min(offset, pattern.length - 1)];
      if (owner !== undefined) {
        result.push({
          char: replacement[offset] ?? "",
          segmentIndex: owner.segmentIndex,
          ...(owner.boundToPrevious === true ? { boundToPrevious: true as const } : {}),
          sourceSegmentIndexes: owner.sourceSegmentIndexes,
          ...(owner.relocated === true ? { relocated: true as const } : {})
        });
      }
    }
    index += pattern.length;
  }
  return result;
}

function mapPunctuationCharactersOwned(chars: readonly OwnedChar[], charMap: ReadonlyMap<string, string>): OwnedChar[] {
  return chars.map((item) => {
    if (item.verbatim === true) {
      return item;
    }
    const mapped = charMap.get(item.char) ?? fullwidthAsciiToHalfwidth(item.char) ?? item.char;
    return {
      char: mapped,
      segmentIndex: item.segmentIndex,
      ...(item.boundToPrevious === true ? { boundToPrevious: true as const } : {}),
      sourceSegmentIndexes: item.sourceSegmentIndexes,
      ...(item.relocated === true ? { relocated: true as const } : {}),
      ...(mapped === item.char ? {} : { convertedPunctuation: true as const })
    };
  });
}

function normalizeEllipsisOwned(chars: readonly OwnedChar[]): OwnedChar[] {
  const result: OwnedChar[] = [];
  for (let index = 0; index < chars.length;) {
    const item = chars[index];
    if (item === undefined) {
      break;
    }
    if (item.char !== "…" || item.verbatim === true) {
      result.push(item);
      index += 1;
      continue;
    }
    const sourceSegmentIndexes = new Set(item.sourceSegmentIndexes);
    index += 1;
    while (chars[index]?.char === "…" && chars[index]?.verbatim !== true) {
      for (const sourceSegmentIndex of chars[index]?.sourceSegmentIndexes ?? []) {
        sourceSegmentIndexes.add(sourceSegmentIndex);
      }
      index += 1;
    }
    result.push({
      char: item.char,
      segmentIndex: item.segmentIndex,
      ...(item.boundToPrevious === true ? { boundToPrevious: true as const } : {}),
      sourceSegmentIndexes: [...sourceSegmentIndexes].sort((left, right) => left - right)
    });
  }
  return result;
}

function hasAttachLeftHost(preceding: string | undefined, config: PunctuationRuntimeConfig): boolean {
  return preceding !== undefined && !config.noSpaceAfter.has(preceding);
}

function normalizePunctuationSpacing(chars: readonly MappedChar[], config: PunctuationRuntimeConfig): string {
  const parts: string[] = [];

  for (let index = 0; index < chars.length; index += 1) {
    const item = chars[index];
    if (item === undefined) {
      continue;
    }
    const char = item.char;

    if (config.openingQuotes.has(char) && index > 0) {
      const previous = chars[index - 1]?.char;
      if (previous !== undefined && !config.noSpaceAfter.has(previous) && parts[parts.length - 1] !== " ") {
        parts.push(" ");
      }
    }

    if (config.attachLeft.has(char) && parts[parts.length - 1] === " ") {
      parts.pop();
    }

    parts.push(char);

    const next = chars[index + 1]?.char;
    if (config.spaceAfter.has(char) && next !== undefined) {
      const previous = chars[index - 1]?.char;
      if (isNumericGroupSeparator(char, item.convertedPunctuation, previous, next)) {
        continue;
      }
      if (!config.noSpaceBefore.has(next)) {
        parts.push(" ");
      }
    }
  }

  return parts.join("");
}

function normalizePunctuationSpacingOwned(chars: readonly OwnedChar[], config: PunctuationRuntimeConfig): OwnedChar[] {
  const parts: OwnedChar[] = [];

  for (let index = 0; index < chars.length; index += 1) {
    const item = chars[index];
    if (item === undefined) {
      continue;
    }
    const char = item.char;

    if (config.openingQuotes.has(char) && index > 0) {
      const previous = chars[index - 1];
      if (previous !== undefined && !config.noSpaceAfter.has(previous.char) && parts[parts.length - 1]?.char !== " ") {
        parts.push({ char: " ", segmentIndex: item.segmentIndex, sourceSegmentIndexes: item.sourceSegmentIndexes });
      }
    }

    const precedingPart = parts[parts.length - 1];
    if (
      config.attachLeft.has(char) &&
      item.verbatim !== true &&
      precedingPart !== undefined &&
      precedingPart.char === " " &&
      precedingPart.verbatim !== true
    ) {
      parts.pop();
    }
    if (
      item.relocated === true &&
      config.dropRelocatedWithoutLeftWord.has(char) &&
      item.verbatim !== true &&
      !hasAttachLeftHost(parts[parts.length - 1]?.char, config)
    ) {
      continue;
    }

    parts.push(item);

    const next = chars[index + 1];
    if (config.spaceAfter.has(char) && next !== undefined) {
      const previous = chars[index - 1];
      if (isNumericGroupSeparator(char, item.convertedPunctuation === true, previous?.char, next.char)) {
        continue;
      }
      if (next.verbatim === true) {
        let afterRun = index + 1;
        while (chars[afterRun]?.verbatim === true) {
          afterRun += 1;
        }
        const contentAfterRun = chars[afterRun];
        if (
          contentAfterRun !== undefined &&
          !config.noSpaceBefore.has(contentAfterRun.char) &&
          !closingQuoteBeforeBoundMorpheme(config, item, contentAfterRun)
        ) {
          parts.push({ char: " ", segmentIndex: item.segmentIndex, sourceSegmentIndexes: item.sourceSegmentIndexes });
        }
        continue;
      }
      if (!config.noSpaceBefore.has(next.char) && !closingQuoteBeforeBoundMorpheme(config, item, next)) {
        parts.push({ char: " ", segmentIndex: item.segmentIndex, sourceSegmentIndexes: item.sourceSegmentIndexes });
      }
    }
  }

  return parts;
}

function closingQuoteBeforeBoundMorpheme(
  config: PunctuationRuntimeConfig,
  quote: OwnedChar,
  following: OwnedChar
): boolean {
  return config.closingQuotes.has(quote.char) &&
    (following.segmentIndex === quote.segmentIndex || following.boundToPrevious === true);
}

function isAsciiDigit(value: string): boolean {
  return value >= "0" && value <= "9";
}

function isNumericGroupSeparator(
  char: string,
  convertedFromSourcePunctuation: boolean,
  previous: string | undefined,
  next: string
): boolean {
  return (char === "," || char === ".") &&
    !convertedFromSourcePunctuation &&
    previous !== undefined &&
    isAsciiDigit(previous) &&
    isAsciiDigit(next);
}
