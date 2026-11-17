import { collectJsonlFiles, type DataLoader } from "../data-loader.js";
import type {
  CollocationEmitInstruction,
  CollocationEntry as RawCollocationEntry,
  CollocationMatchElement,
  CollocationOverrideInstruction,
  CollocationSyntheticInstruction
} from "../types/dictionary.js";
import type { RuntimeHaruToken, HaruTokenRuntimeFields } from "../types/token.js";
import {
  computeSourceCharSpan,
  computeSourceSpan,
  rewriteRuntimeTokenSurface,
  withRuntimeTokenSourceSpan,
  type SourceCharSpan
} from "../types/token.js";

import { camelizeKeys } from "./data-section.js";
import { TokenShapeMatch, type TokenShapeMatchOptions } from "./token-shape-match.js";

import { POS0, POS1, POS2, POS3, POS4, POS5, posFromStrings } from "../types/pos.js";
import type { LookupTables } from "../pipeline/lookup-tables.js";
export interface CollocationRuntimeToken extends HaruTokenRuntimeFields {
  surface: string;
  dictionaryForm: string;
  reading: string;
  dictionaryFormReading: string;
  normalizedForm?: string;
  pos: number;
  dictionaryId?: number;
}

export class CollocationEntry extends TokenShapeMatch {
  readonly emitInstructions: readonly CollocationEmitInstruction[];

  constructor(
    match: readonly CollocationMatchElement[],
    emit: readonly CollocationEmitInstruction[],
    options: TokenShapeMatchOptions = {}
  ) {
    super(match, options);
    this.emitInstructions = emit;
  }
}

export class CollocationDictionary {
  index = new Map<string, CollocationEntry[]>();

  cloneShallow(): CollocationDictionary {
    const clone = new CollocationDictionary();
    clone.index = this.index;
    return clone;
  }

  async load(loader: DataLoader, dirPath: string, lookups?: LookupTables): Promise<void> {
    for (const filePath of await collectJsonlFiles(loader, dirPath)) {
      const content = await loader.readTextFile(filePath);
      for (const line of content.split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith("#")) {
          continue;
        }
        const raw = normalizeRawCollocationEntry(camelizeKeys(JSON.parse(trimmed)) as RawCollocationEntry);
        rejectWhitespaceEmitPos(raw.emit, filePath);
        const requirePrevLookupAny = resolvePrevLookupSets(raw.requirePrevLookupAny, lookups, filePath);
        const entry = new CollocationEntry(raw.match, raw.emit, {
          ...(raw.forbidPrevDictionaryForms === undefined ? {} : { forbidPrevDictionaryForms: raw.forbidPrevDictionaryForms }),
          ...(raw.requirePrevPosPrefixAny === undefined ? {} : { requirePrevPosPrefixAny: raw.requirePrevPosPrefixAny }),
          ...(raw.requirePrevSurfaceAny === undefined ? {} : { requirePrevSurfaceAny: raw.requirePrevSurfaceAny }),
          ...(requirePrevLookupAny === undefined ? {} : { requirePrevLookupAny }),
          ...(raw.requirePrevExists === undefined ? {} : { requirePrevExists: raw.requirePrevExists }),
          ...(raw.forbidNextDictionaryForms === undefined ? {} : { forbidNextDictionaryForms: raw.forbidNextDictionaryForms }),
          ...(raw.forbidNextPosPrefixAny === undefined ? {} : { forbidNextPosPrefixAny: raw.forbidNextPosPrefixAny }),
          ...(raw.requireNextPosPrefixAny === undefined ? {} : { requireNextPosPrefixAny: raw.requireNextPosPrefixAny }),
          forbidAtTokensEnd: raw.forbidAtTokensEnd ?? false
        });
        const entries = this.index.get(entry.anchorSurface);
        if (entries === undefined) {
          this.index.set(entry.anchorSurface, [entry]);
        } else {
          entries.push(entry);
        }
      }
    }

    for (const entries of this.index.values()) {
      entries.sort((left, right) => right.length - left.length);
    }
  }

  match(
    tokens: readonly RuntimeHaruToken[],
    start: number
  ): readonly [consumedCount: number, emittedTokens: readonly CollocationRuntimeToken[]] | undefined {
    const token = tokens[start];
    if (token === undefined) {
      return undefined;
    }

    const candidates = this.index.get(token.surface);
    if (candidates !== undefined) {
      for (const entry of candidates) {
        const matchStart = start - entry.anchorIndex;
        if (matchStart < 0 || matchStart + entry.length > tokens.length || matchStart !== start) {
          continue;
        }
        if (entry.matchesAt(tokens, matchStart)) {
          return [entry.length, this.buildEmitted(tokens, matchStart, entry)];
        }
      }
    }

    const lookbackToken = tokens[start + 1];
    if (lookbackToken !== undefined) {
      const lookbackCandidates = this.index.get(lookbackToken.surface);
      if (lookbackCandidates !== undefined) {
        for (const entry of lookbackCandidates) {
          if (entry.anchorIndex !== 1 || start + entry.length > tokens.length) {
            continue;
          }
          if (entry.matchesAt(tokens, start)) {
            return [entry.length, this.buildEmitted(tokens, start, entry)];
          }
        }
      }
    }

    return undefined;
  }

  private buildEmitted(
    tokens: readonly RuntimeHaruToken[],
    start: number,
    entry: CollocationEntry
  ): readonly CollocationRuntimeToken[] {
    const result: CollocationRuntimeToken[] = [];
    const matched = tokens.slice(start, start + entry.length);
    const matchedIdentity: MergedSourceIdentity = {
      sourceSpan: computeSourceSpan(matched),
      sourceCharSpan: computeSourceCharSpan(matched)
    };
    for (const instruction of entry.emitInstructions) {
      if (instruction.type === "ref") {
        const token = tokens[start + instruction.index];
        if (token !== undefined) {
          result.push(token);
        }
        continue;
      }
      if (instruction.type === "override") {
        const token = tokens[start + instruction.index];
        if (token !== undefined) {
          result.push(buildOverrideToken(token, instruction, matchedIdentity));
        }
        continue;
      }
      result.push(buildSyntheticToken(instruction, matchedIdentity));
    }
    return result;
  }
}

export function rejectWhitespaceEmitPos(
  emit: readonly CollocationEmitInstruction[] | undefined,
  sourceName: string
): void {
  for (const instruction of emit ?? []) {
    if (instruction.type === "ref") {
      continue;
    }
    const declared = instruction.type === "override"
      ? [...instruction.pos ?? [], ...instruction.posPrefix ?? []]
      : instruction.pos;
    if (declared.includes("空白")) {
      throw new Error(
        `${sourceName}: emit instruction declares pos "空白" (whitespace is not a token)`
      );
    }
  }
}

function resolvePrevLookupSets(
  names: readonly string[] | undefined,
  lookups: LookupTables | undefined,
  filePath: string
): readonly ReadonlySet<string>[] | undefined {
  if (names === undefined || names.length === 0) {
    return undefined;
  }
  if (lookups === undefined) {
    throw new Error(
      `CollocationDictionary: ${filePath} declares requirePrevLookupAny but no lookup tables were provided`
    );
  }
  return names.map((name) => {
    const resolved = lookups.named(name);
    if (resolved === undefined) {
      throw new Error(
        `CollocationDictionary: ${filePath} references unregistered lookup set "${name}"`
      );
    }
    return resolved;
  });
}

export function buildOverrideToken(
  token: RuntimeHaruToken,
  instruction: CollocationOverrideInstruction,
  identity: MergedSourceIdentity
): CollocationRuntimeToken {
  let next: CollocationRuntimeToken = withMergedSourceIdentity({
    ...token,
    pos: token.pos
  }, identity);

  if (instruction.surfacePrefix !== undefined) {
    next = rewriteRuntimeTokenSurface(next, {
      kind: "prefix",
      prefix: instruction.surfacePrefix
    });
  }
  if (instruction.readingPrefix !== undefined) {
    next.reading = `${instruction.readingPrefix}${next.reading}`;
  }
  if (instruction.posPrefix !== undefined) {
    const POS_LEVEL_MASKS = [POS0, POS1, POS2, POS3, POS4, POS5];
    let clearMask = 0;
    for (let i = 0; i < instruction.posPrefix.length && i < POS_LEVEL_MASKS.length; i++) {
      clearMask |= POS_LEVEL_MASKS[i]!;
    }
    next.pos = (token.pos & ~clearMask) | posFromStrings([...instruction.posPrefix]);
  }

  if (instruction.surface !== undefined) {
    next = rewriteRuntimeTokenSurface(next, {
      kind: "replace",
      surface: instruction.surface
    });
  }
  if (instruction.reading !== undefined) {
    next.reading = instruction.reading;
    next.dictionaryFormReading = instruction.reading;
  }
  if (instruction.dictionaryForm !== undefined) {
    next.dictionaryForm = instruction.dictionaryForm;
  }
  if (instruction.pos !== undefined) {
    next.pos = posFromStrings([...instruction.pos]);
  }
  if (instruction.dictionaryFormReading !== undefined) {
    next.dictionaryFormReading = instruction.dictionaryFormReading;
  }
  if (instruction.normalizedForm !== undefined) {
    next.normalizedForm = instruction.normalizedForm;
  }

  return next;
}

export interface MergedSourceIdentity {
  readonly sourceSpan: RuntimeHaruToken["sourceSpan"] | undefined;
  readonly sourceCharSpan: SourceCharSpan | undefined;
}

function withMergedSourceIdentity<T extends CollocationRuntimeToken>(
  token: T,
  identity: MergedSourceIdentity
): T {
  const withChar = identity.sourceCharSpan === undefined
    ? token
    : { ...token, sourceCharSpan: identity.sourceCharSpan };
  return identity.sourceSpan === undefined
    ? withChar
    : withRuntimeTokenSourceSpan(withChar, identity.sourceSpan);
}

export function buildSyntheticToken(
  instruction: CollocationSyntheticInstruction,
  identity: MergedSourceIdentity
): CollocationRuntimeToken {
  const token: CollocationRuntimeToken = {
    surface: instruction.surface ?? instruction.dictionaryForm,
    dictionaryForm: instruction.dictionaryForm,
    reading: instruction.reading,
    dictionaryFormReading: instruction.dictionaryFormReading ?? instruction.reading,
    ...(instruction.normalizedForm === undefined ? {} : { normalizedForm: instruction.normalizedForm }),
    pos: posFromStrings([...instruction.pos]),
    ...(instruction.dictionaryId === undefined ? {} : { dictionaryId: instruction.dictionaryId }),
    ...(instruction.syntheticReason === undefined ? {} : { syntheticReason: instruction.syntheticReason }),
    ...(instruction.koreanOverride === undefined ? {} : { koreanOverride: instruction.koreanOverride }),
    ...(instruction.koreanOverrideByRegister === undefined ? {} : { koreanOverrideByRegister: instruction.koreanOverrideByRegister })
  };
  return withMergedSourceIdentity(token, identity);
}

function normalizeRawCollocationEntry(raw: RawCollocationEntry): RawCollocationEntry {
  return {
    match: raw.match.map((element) => ({
      surface: element.surface,
      ...(element.dictionaryForm === undefined ? {} : { dictionaryForm: element.dictionaryForm }),
      pos: element.pos
    })),
    emit: raw.emit,
    ...(raw.forbidPrevDictionaryForms === undefined ? {} : { forbidPrevDictionaryForms: raw.forbidPrevDictionaryForms }),
    ...(raw.requirePrevPosPrefixAny === undefined ? {} : { requirePrevPosPrefixAny: raw.requirePrevPosPrefixAny }),
    ...(raw.requirePrevSurfaceAny === undefined ? {} : { requirePrevSurfaceAny: raw.requirePrevSurfaceAny }),
    ...(raw.requirePrevLookupAny === undefined ? {} : { requirePrevLookupAny: raw.requirePrevLookupAny }),
    ...(raw.requirePrevExists === undefined ? {} : { requirePrevExists: raw.requirePrevExists }),
    ...(raw.forbidNextDictionaryForms === undefined ? {} : { forbidNextDictionaryForms: raw.forbidNextDictionaryForms }),
    ...(raw.forbidNextPosPrefixAny === undefined ? {} : { forbidNextPosPrefixAny: raw.forbidNextPosPrefixAny }),
    ...(raw.requireNextPosPrefixAny === undefined ? {} : { requireNextPosPrefixAny: raw.requireNextPosPrefixAny }),
    ...(raw.forbidAtTokensEnd === undefined ? {} : { forbidAtTokensEnd: raw.forbidAtTokensEnd })
  };
}
