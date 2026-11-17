
import type { ClauseToken, ProtoClauseLayout } from "./index.js";
import type { ClausePhraseScope } from "./phrase-enumeration.js";
import { closedPropositionBeforeMarker, type ClosedPropositionBeforeMarker, type UtteranceClosureRunEvidence } from "./utterance-closure.js";
import { nextNonSpaceIndex, type ClauseAdjacencyToken, type ClauseTriviaToken } from "./trivia.js";

export interface ScopedStorage<T> {
  getStore(): T | undefined;
  run<R>(store: T, callback: () => R): R;
}

class SerialScopedStorage<T> implements ScopedStorage<T> {
  private store: T | undefined = undefined;

  getStore(): T | undefined {
    return this.store;
  }

  run<R>(store: T, callback: () => R): R {
    const previous = this.store;
    this.store = store;
    let result: R;
    try {
      result = callback();
    } catch (error) {
      this.store = previous;
      throw error;
    }
    if (result instanceof Promise) {
      return result.finally(() => {
        this.store = previous;
      }) as R;
    }
    this.store = previous;
    return result;
  }
}

let protoLayoutStorage: ScopedStorage<ProtoClauseLayout | null> = new SerialScopedStorage();

export function installProtoLayoutStorage(storage: ScopedStorage<ProtoClauseLayout | null>): void {
  protoLayoutStorage = storage;
}

export function activeProtoLayout(): ProtoClauseLayout | null {
  return protoLayoutStorage.getStore() ?? null;
}

export function activeProtoScopedScanEnd(
  tokens: readonly ClauseToken[],
  pos: number,
  scope: ClausePhraseScope
): number | null {
  if (scope === "sentence") {
    return null;
  }
  const proto = activeProtoLayout();
  if (proto === null) {
    return null;
  }
  const end = scope === "clause"
    ? proto.clauseOfToken(pos)?.end
    : proto.projectionEvidenceWindowForToken(tokens, pos)?.end;
  return end ?? null;
}

export function activeProtoUtteranceRange(
  tokenIdx: number
): { readonly start: number; readonly endExclusive: number } | null {
  return activeProtoLayout()?.utteranceRangeOfToken(tokenIdx) ?? null;
}

export function activeProtoPostposedModifiedPredicateIndexBefore(
  tokens: readonly ClauseToken[],
  tokenIdx: number
): number | null {
  return activeProtoLayout()?.postposedModifiedPredicateIndexBefore(tokens, tokenIdx) ?? null;
}

export function activeProtoScopedScanStart(
  tokens: readonly ClauseToken[],
  pos: number,
  scope: ClausePhraseScope
): number | null {
  if (scope === "sentence") {
    return null;
  }
  const proto = activeProtoLayout();
  if (proto === null) {
    return null;
  }
  const start = scope === "clause"
    ? proto.clauseOfToken(pos)?.start
    : proto.projectionEvidenceWindowForToken(tokens, pos)?.start;
  return start ?? null;
}

export function closesClauseAtDetachedTerminalNodaAfter<T extends ClauseTriviaToken>(
  proto: ProtoClauseLayout | null,
  tokens: readonly T[],
  afterIdx: number
): boolean {
  if (proto === null) {
    return false;
  }
  const splitAt = nextNonSpaceIndex(tokens, afterIdx);
  return splitAt !== null && proto.closesClauseAtDetachedTerminalNoda(splitAt);
}

export function activeProtoClosesUtteranceBefore(endIdx: number): boolean {
  return activeProtoLayout()?.closesUtteranceBefore(endIdx) ?? false;
}

export function activeProtoUtteranceClosureRunAt(endIdx: number): UtteranceClosureRunEvidence | null {
  return activeProtoLayout()?.utteranceClosureRunAt(endIdx) ?? null;
}

export function activeProtoClosedPropositionBeforeMarkerAt(
  tokens: readonly (ClauseAdjacencyToken & { readonly pos: number })[],
  markerIdx: number
): ClosedPropositionBeforeMarker | null {
  const proto = activeProtoLayout();
  return proto === null ? null : closedPropositionBeforeMarker(proto, tokens, markerIdx);
}

export function activeProtoClosesUtteranceBeforeGivenFormalNounHead(endIdx: number): boolean {
  return activeProtoLayout()?.closesUtteranceBeforeGivenFormalNounHead(endIdx) ?? false;
}

export function activeProtoClosesClauseAtDetachedTerminalNodaAfter<T extends ClauseTriviaToken>(
  tokens: readonly T[],
  afterIdx: number
): boolean {
  return closesClauseAtDetachedTerminalNodaAfter(activeProtoLayout(), tokens, afterIdx);
}

export function useActiveProtoLayout<T>(
  proto: ProtoClauseLayout | null,
  callback: (proto: ProtoClauseLayout | null) => T
): T {
  return protoLayoutStorage.run(proto, () => {
    return callback(proto);
  });
}
