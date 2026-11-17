import { collectJsonlFiles, type DataLoader } from "../data-loader.js";
import type { CollocationEmitInstruction, CollocationMatchElement } from "../types/dictionary.js";
import type { ReanalysisFlipKind } from "../types/reanalysis.js";
import { computeSourceCharSpan, computeSourceSpan, type RuntimeHaruToken } from "../types/token.js";

import { buildOverrideToken, buildSyntheticToken, rejectWhitespaceEmitPos } from "./collocation.js";
import { camelizeKeys } from "./data-section.js";
import { TokenShapeMatch, type TokenShapeMatchOptions } from "./token-shape-match.js";

export type { ReanalysisFlipKind } from "../types/reanalysis.js";

const KNOWN_FLIP_KINDS: ReadonlySet<string> = new Set(["token_substitution"]);

export interface RawReanalysisEntry {
  id: string;
  match: readonly CollocationMatchElement[];
  flip: {
    kind: string;
    emit?: readonly CollocationEmitInstruction[];
  };
  condition: string;
  blockers?: readonly string[];
  forbidNextDictionaryForms?: readonly string[];
  forbidNextPosPrefixAny?: readonly (readonly string[])[];
  forbidAtTokensEnd?: boolean;
}

export class ReanalysisEntry extends TokenShapeMatch {
  readonly id: string;
  readonly flipKind: ReanalysisFlipKind;
  readonly emitInstructions: readonly CollocationEmitInstruction[];
  readonly conditionId: string;
  readonly blockerIds: readonly string[];

  constructor(raw: {
    id: string;
    match: readonly CollocationMatchElement[];
    flipKind: ReanalysisFlipKind;
    emit: readonly CollocationEmitInstruction[];
    conditionId: string;
    blockerIds: readonly string[];
  }, options: TokenShapeMatchOptions = {}) {
    super(raw.match, options);
    this.id = raw.id;
    this.flipKind = raw.flipKind;
    this.emitInstructions = raw.emit;
    this.conditionId = raw.conditionId;
    this.blockerIds = raw.blockerIds;
  }
}

export interface ReanalysisEntryMatch {
  readonly entry: ReanalysisEntry;
  readonly consumed: number;
}

export class ReanalysisDictionary {
  index = new Map<string, ReanalysisEntry[]>();
  private entryCount = 0;

  get isEmpty(): boolean {
    return this.entryCount === 0;
  }

  cloneShallow(): ReanalysisDictionary {
    const clone = new ReanalysisDictionary();
    clone.index = new Map([...this.index].map(([key, entries]) => [key, [...entries]]));
    clone.entryCount = this.entryCount;
    return clone;
  }

  async load(loader: DataLoader, dirPath: string): Promise<void> {
    for (const filePath of await collectJsonlFiles(loader, dirPath)) {
      const content = await loader.readTextFile(filePath);
      this.loadFromJsonl(content, filePath);
    }
  }

  loadFromJsonl(content: string, sourceName: string): void {
    const seenIds = new Set<string>(
      [...this.index.values()].flatMap((entries) => entries.map((entry) => entry.id))
    );
    for (const line of content.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#")) {
        continue;
      }
      const raw = camelizeKeys(JSON.parse(trimmed)) as RawReanalysisEntry;
      const entry = compileReanalysisEntry(raw, sourceName);
      if (seenIds.has(entry.id)) {
        throw new Error(`ReanalysisDictionary: duplicate row id "${entry.id}" (${sourceName})`);
      }
      seenIds.add(entry.id);
      const entries = this.index.get(entry.anchorSurface);
      if (entries === undefined) {
        this.index.set(entry.anchorSurface, [entry]);
      } else {
        entries.push(entry);
      }
      this.entryCount += 1;
    }

    for (const entries of this.index.values()) {
      entries.sort((left, right) => right.length - left.length);
    }
  }

  assertConditionIdsRegistered(registeredIds: ReadonlySet<string>): void {
    for (const entries of this.index.values()) {
      for (const entry of entries) {
        if (!registeredIds.has(entry.conditionId)) {
          throw new Error(
            `ReanalysisDictionary: row "${entry.id}" references unregistered condition "${entry.conditionId}"`
          );
        }
        for (const blockerId of entry.blockerIds) {
          if (!registeredIds.has(blockerId)) {
            throw new Error(
              `ReanalysisDictionary: row "${entry.id}" references unregistered blocker "${blockerId}"`
            );
          }
        }
      }
    }
  }

  matchAt(tokens: readonly RuntimeHaruToken[], start: number): ReanalysisEntryMatch | undefined {
    if (this.entryCount === 0) {
      return undefined;
    }
    const token = tokens[start];
    if (token === undefined) {
      return undefined;
    }
    for (let anchorOffset = 0; anchorOffset < 2; anchorOffset += 1) {
      const anchorToken = tokens[start + anchorOffset];
      if (anchorToken === undefined) {
        break;
      }
      const candidates = this.index.get(anchorToken.surface);
      if (candidates === undefined) {
        continue;
      }
      for (const entry of candidates) {
        if (entry.anchorIndex !== anchorOffset || start + entry.length > tokens.length) {
          continue;
        }
        if (entry.matchesAt(tokens, start)) {
          return { entry, consumed: entry.length };
        }
      }
    }
    return undefined;
  }
}

export function buildReanalysisEmittedTokens(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  entry: ReanalysisEntry
): RuntimeHaruToken[] {
  const matched = tokens.slice(start, start + entry.length);
  const matchedIdentity = {
    sourceSpan: computeSourceSpan(matched),
    sourceCharSpan: computeSourceCharSpan(matched)
  };
  const result: RuntimeHaruToken[] = [];
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
        const emitted = buildOverrideToken(token, instruction, matchedIdentity);
        result.push({ ...emitted, dictionaryId: emitted.dictionaryId ?? -1 });
      }
      continue;
    }
    const synthetic = buildSyntheticToken(instruction, matchedIdentity);
    result.push({
      ...synthetic,
      dictionaryId: synthetic.dictionaryId ?? -1,
      syntheticReason: synthetic.syntheticReason ?? `deferred_reanalysis:${entry.id}`
    });
  }
  return result;
}

function compileReanalysisEntry(raw: RawReanalysisEntry, sourceName: string): ReanalysisEntry {
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    throw new Error(`ReanalysisDictionary: row without non-empty id (${sourceName})`);
  }
  if (!Array.isArray(raw.match) || raw.match.length === 0) {
    throw new Error(`ReanalysisDictionary: row "${raw.id}" without match elements (${sourceName})`);
  }
  const flip = raw.flip;
  if (flip === undefined || flip === null || typeof flip.kind !== "string") {
    throw new Error(`ReanalysisDictionary: row "${raw.id}" without flip.kind (${sourceName})`);
  }
  if (!KNOWN_FLIP_KINDS.has(flip.kind)) {
    throw new Error(
      `ReanalysisDictionary: row "${raw.id}" has unknown flip.kind "${flip.kind}" (${sourceName})`
    );
  }
  const emit = flip.emit ?? [];
  if (emit.length === 0) {
    throw new Error(
      `ReanalysisDictionary: row "${raw.id}" flip.kind=token_substitution requires non-empty flip.emit (${sourceName})`
    );
  }
  rejectWhitespaceEmitPos(emit, `ReanalysisDictionary: row "${raw.id}" (${sourceName})`);
  if (typeof raw.condition !== "string" || raw.condition.length === 0) {
    throw new Error(`ReanalysisDictionary: row "${raw.id}" without condition id (${sourceName})`);
  }
  const blockers = raw.blockers ?? [];
  if (!Array.isArray(blockers) || blockers.some((blocker) => typeof blocker !== "string" || blocker.length === 0)) {
    throw new Error(`ReanalysisDictionary: row "${raw.id}" has malformed blockers (${sourceName})`);
  }
  return new ReanalysisEntry(
    {
      id: raw.id,
      match: raw.match,
      flipKind: flip.kind as ReanalysisFlipKind,
      emit,
      conditionId: raw.condition,
      blockerIds: blockers
    },
    {
      ...(raw.forbidNextDictionaryForms === undefined ? {} : { forbidNextDictionaryForms: raw.forbidNextDictionaryForms }),
      ...(raw.forbidNextPosPrefixAny === undefined ? {} : { forbidNextPosPrefixAny: raw.forbidNextPosPrefixAny }),
      ...(raw.forbidAtTokensEnd === undefined ? {} : { forbidAtTokensEnd: raw.forbidAtTokensEnd })
    }
  );
}
