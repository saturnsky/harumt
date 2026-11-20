
import type { AnnotatedSegment, AnnotationMetadata } from "../../types/annotation.js";
import { type RuntimeHaruToken, runtimeTokenSourceSpan } from "../../types/token.js";
import type { ParentheticalIsland, PreparedTranslation } from "./prepared-translation.js";

export function collectPreparedAnnotationTokens(prepared: PreparedTranslation): RuntimeHaruToken[] {
  const tokens: RuntimeHaruToken[] = [...(prepared.tokens as RuntimeHaruToken[])];
  for (const island of prepared.parentheticalIslands ?? []) {
    tokens.push(...collectPreparedAnnotationTokens(island.innerPrepared));
  }
  return tokens.sort((left, right) => sourceOrderForToken(left) - sourceOrderForToken(right));
}

export function assignParentheticalDelimiterAnnotationKeys(
  prepared: PreparedTranslation,
  metadata: ReadonlyMap<number, AnnotationMetadata> | undefined
): void {
  if (metadata === undefined) return;
  for (const [key, point] of metadata) {
    if (point.kind !== "char-point") continue;
    assignParentheticalDelimiterAnnotationKey(prepared, key, point.cleanOffset);
  }
}

function assignParentheticalDelimiterAnnotationKey(
  prepared: PreparedTranslation,
  key: number,
  cleanOffset: number
): boolean {
  for (const island of prepared.parentheticalIslands ?? []) {
    const span = island.delimiterTextSpan;
    if (span !== undefined && cleanOffset === span.open.start) {
      removeAnnotationKeyFromPrepared(prepared, key);
      addParentheticalDelimiterAnnotationKey(island, "open", key);
      return true;
    }
    if (span !== undefined && cleanOffset === span.close.end) {
      removeAnnotationKeyFromPrepared(prepared, key);
      addParentheticalDelimiterAnnotationKey(island, "close", key);
      return true;
    }
    if (assignParentheticalDelimiterAnnotationKey(island.innerPrepared, key, cleanOffset)) {
      return true;
    }
  }
  return false;
}

function addParentheticalDelimiterAnnotationKey(
  island: ParentheticalIsland,
  side: "open" | "close",
  key: number
): void {
  const mutable = island as unknown as {
    delimiterAnnotationKeys?: {
      open?: readonly number[];
      close?: readonly number[];
    };
  };
  const current = mutable.delimiterAnnotationKeys ?? {};
  const keys = new Set(current[side] ?? []);
  keys.add(key);
  mutable.delimiterAnnotationKeys = {
    ...current,
    [side]: Array.from(keys)
  };
}

export function assignParentheticalDelimiterSegmentKeys(
  prepared: PreparedTranslation,
  segments: readonly AnnotatedSegment[],
  metadata: ReadonlyMap<number, AnnotationMetadata> | undefined
): void {
  const islands = prepared.parentheticalIslands;
  if (islands === undefined || islands.length === 0) return;

  const charPointKeySet = new Set<number>();
  if (metadata !== undefined) {
    for (const [key, entry] of metadata) {
      if (entry.kind === "char-point") charPointKeySet.add(key);
    }
  }

  const charKeys: (readonly number[])[] = [];
  for (const seg of segments) {
    const keys = charPointKeySet.size > 0
      ? (seg.keys ?? []).filter(k => !charPointKeySet.has(k))
      : (seg.keys ?? []);
    for (const _ch of seg.text) {
      charKeys.push(keys);
    }
  }

  propagateDelimiterKeysFromChars(islands, charKeys, 0);
}

function propagateDelimiterKeysFromChars(
  islands: readonly ParentheticalIsland[],
  charKeys: readonly (readonly number[])[],
  baseOffset: number
): void {
  for (const island of islands) {
    const span = island.delimiterTextSpan;
    if (span === undefined) continue;

    for (let i = span.open.start; i < span.open.end; i += 1) {
      const keys = charKeys[baseOffset + i];
      if (keys !== undefined) {
        for (const key of keys) {
          addParentheticalDelimiterAnnotationKey(island, "open", key);
        }
      }
    }

    for (let i = span.close.start; i < span.close.end; i += 1) {
      const keys = charKeys[baseOffset + i];
      if (keys !== undefined) {
        for (const key of keys) {
          addParentheticalDelimiterAnnotationKey(island, "close", key);
        }
      }
    }

    const innerIslands = island.innerPrepared.parentheticalIslands;
    if (innerIslands !== undefined && innerIslands.length > 0) {
      propagateDelimiterKeysFromChars(innerIslands, charKeys, baseOffset + span.open.end);
    }
  }
}

function removeAnnotationKeyFromPrepared(
  prepared: PreparedTranslation,
  key: number
): void {
  for (const token of prepared.tokens as RuntimeHaruToken[]) {
    removeAnnotationKeyFromToken(token, key);
  }
  for (const island of prepared.parentheticalIslands ?? []) {
    removeAnnotationKeyFromPrepared(island.innerPrepared, key);
  }
}

function removeAnnotationKeyFromToken(token: RuntimeHaruToken, key: number): void {
  if (token.annotationKeys === undefined) return;
  const next = token.annotationKeys.filter((candidate) => candidate !== key);
  if (next.length === 0) {
    delete token.annotationKeys;
  } else if (next.length !== token.annotationKeys.length) {
    token.annotationKeys = next;
  }
}

function sourceOrderForToken(token: RuntimeHaruToken): number {
  return runtimeTokenSourceSpan(token)?.startOrdinal ?? Number.MAX_SAFE_INTEGER;
}
