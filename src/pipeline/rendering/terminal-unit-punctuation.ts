import type { TargetSegment } from "../../types/projection.js";
import { 補助記号 } from "../../types/pos.js";
import type { ClauseTerminalPunctuationRunEvidence, ClauseTerminalPunctuationRunUnit } from "../clause-layout/punctuation.js";
import type { TranslationUnit } from "../translation/unit.js";
import { hasHardTerminalPunctuationRelation, hasWeakPunctuationRelation } from "../head-tail/boundary/punctuation.js";
import { lastOutputSegmentIndex } from "./target-segment-build.js";

export function isSentencePunctuationUnit(unit: TranslationUnit): boolean {
  if (unit.jpPos !== 補助記号) {
    return false;
  }
  return hasHardTerminalPunctuationRelation(translationUnitBoundaryToken(unit), 0, ["assembler"]);
}

export interface MoodPunctuationAnchor {
  readonly marks: string;
  readonly unidentified?: true;
}

export function moodPunctuationAnchorAt(segments: readonly TargetSegment[]): MoodPunctuationAnchor | null {
  const segmentIndex = lastOutputSegmentIndex(segments);
  const segment = segmentIndex < 0 ? undefined : segments[segmentIndex];
  if (segment === undefined || (segment.unit !== null && isSentencePunctuationUnit(segment.unit))) {
    return null;
  }
  const marks = /[?!]+$/u.exec(segment.text)?.[0];
  if (marks === undefined) {
    return null;
  }
  return marks.includes("?") ? { marks } : { marks, unidentified: true };
}

export function reconcileTerminalPunctuationUnit(
  unit: TranslationUnit,
  anchor: MoodPunctuationAnchor | null
): { readonly emit: boolean; readonly moodPunctuation: MoodPunctuationAnchor | null } {
  if (anchor === null) {
    return { emit: true, moodPunctuation: null };
  }
  if (anchor.unidentified === true) {
    return { emit: false, moodPunctuation: anchor };
  }
  const run = unit.terminalPunctuationRun;
  if (run === null || !run.units.includes("question")) {
    return { emit: false, moodPunctuation: anchor };
  }
  const mark = moodPunctuationMarkForRunUnit(terminalPunctuationRunUnitOf(unit, run));
  if (mark === null) {
    return { emit: true, moodPunctuation: anchor };
  }
  const markIndex = anchor.marks.indexOf(mark);
  return markIndex < 0
    ? { emit: true, moodPunctuation: anchor }
    : {
      emit: false,
      moodPunctuation: {
        marks: `${anchor.marks.slice(0, markIndex)}${anchor.marks.slice(markIndex + 1)}`
      }
    };
}

function terminalPunctuationRunPositionOf(
  unit: TranslationUnit,
  run: ClauseTerminalPunctuationRunEvidence
): number {
  const tokenIdx = unit.jpIndices[0];
  return tokenIdx === undefined ? -1 : run.tokenIndices.indexOf(tokenIdx);
}

function terminalPunctuationRunUnitOf(
  unit: TranslationUnit,
  run: ClauseTerminalPunctuationRunEvidence
): ClauseTerminalPunctuationRunUnit | null {
  const position = terminalPunctuationRunPositionOf(unit, run);
  return position < 0 ? null : run.units[position] ?? null;
}

export function authoredRunClosesWithQuestion(
  run: ClauseTerminalPunctuationRunEvidence | null
): boolean {
  return run !== null &&
    run.units.includes("question") &&
    !run.units.includes("exclamation");
}

function moodPunctuationMarkForRunUnit(runUnit: ClauseTerminalPunctuationRunUnit | null): string | null {
  return runUnit === "question" ? "?" : runUnit === "exclamation" ? "!" : null;
}

export function terminalPeriodIsRedundant(
  segments: readonly TargetSegment[],
  unit: TranslationUnit,
  anchor: MoodPunctuationAnchor | null
): boolean {
  const run = unit.terminalPunctuationRun;
  if (run === null || !terminalRunUnitIsLonePeriod(run, terminalPunctuationRunPositionOf(unit, run))) {
    return false;
  }
  if (anchor !== null) {
    return true;
  }
  const previousSegment = segments[lastOutputSegmentIndex(segments)];
  const previousUnit = previousSegment?.unit ?? null;
  if (previousUnit === null || !isSentencePunctuationUnit(previousUnit)) {
    return false;
  }
  const previousRun = previousUnit.terminalPunctuationRun;
  const previousRunUnit = previousRun === null
    ? null
    : terminalPunctuationRunUnitOf(previousUnit, previousRun);
  return previousRunUnit === "question" || previousRunUnit === "exclamation";
}

function terminalRunUnitIsLonePeriod(
  run: ClauseTerminalPunctuationRunEvidence,
  position: number
): boolean {
  return position >= 0 &&
    run.units[position] === "period" &&
    run.units[position - 1] !== "period" &&
    run.units[position + 1] !== "period";
}

export function isClauseCommaPunctuationUnit(unit: TranslationUnit): boolean {
  if (unit.jpPos !== 補助記号) {
    return false;
  }
  return hasWeakPunctuationRelation(translationUnitBoundaryToken(unit), 0, ["assembler"]);
}

function translationUnitBoundaryToken(unit: TranslationUnit): { readonly surface: string; readonly pos: number } {
  return { surface: unit.jpHead.surface, pos: unit.jpHead.pos };
}
