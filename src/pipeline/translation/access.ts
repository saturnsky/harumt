
import type { MorphemeEntry, MorphemeSense } from "../../types/dictionary.js";
import { 명사 } from "../../types/pos.js";
import type { StemCandidateIdentity } from "../head-tail/tail/predicate-root/stem-candidate-identity.js";

export interface TranslationAccessEntry extends MorphemeEntry {
  senses: readonly MorphemeSense[];
  committed?: boolean;
}

export function commitWinner<T extends MorphemeEntry & { senses?: readonly MorphemeSense[] }>(entry: T): T & { committed: true } {
  return {
    ...entry,
    committed: true
  };
}


export function winner(
  entry: TranslationAccessEntry,
  committedSense?: StemCandidateIdentity
): MorphemeSense {
  if (entry.committed !== true) {
    throw new Error(
      "winner(entry) called on uncommitted entry. Pre-commit code must use TranslationCandidate API; post-commit ad-hoc lookup must call commit_winner() first."
    );
  }
  const selected = committedSense === undefined
    ? entry.senses[0]
    : entry.senses.find((sense) => {
        const provenance = committedSense.provenance;
        return provenance.kind === "dictionary"
          ? sense.entryId === provenance.entryId && sense.senseIndex === provenance.senseIndex
          : sense.derivation === provenance.derivationId;
      });
  if (selected === undefined) {
    throw new Error(committedSense === undefined
      ? "winner(entry) called on entry without senses."
      : "winner(entry, committedSense) could not resolve the complete candidate provenance in the committed entry.");
  }
  return selected;
}

export function winnerKorean(entry: TranslationAccessEntry): string | undefined {
  return winner(entry).korean;
}


export function winnerKoreanPos(entry: TranslationAccessEntry, defaultValue = 명사): number {
  return winner(entry).koreanPos ?? defaultValue;
}


export function winnerIrregular(entry: TranslationAccessEntry): string | null | undefined {
  return winner(entry).irregular;
}

export function hasTranslationAccess(entry: MorphemeEntry): entry is TranslationAccessEntry {
  return entry.senses !== undefined;
}


export function selectionChanged(oldEntry: TranslationAccessEntry, newEntry: TranslationAccessEntry): boolean {
  return newEntry.senses[0] !== oldEntry.senses[0];
}
