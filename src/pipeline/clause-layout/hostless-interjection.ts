import {
  hostlessInterjectionRowMatchAt,
  type HostlessInterjectionRowMatch,
  type HostlessInterjectionVerdictFacts
} from "../demo-discourse.js";
import {
  isBoundaryPunctuationCategoryToken,
  isLabelSeparatorPunctuationToken,
  isTrailingPunctuationToken,
  isWeakPunctuationToken
} from "../head-tail/boundary/punctuation.js";
import { POS0, 助詞, 助動詞 } from "../../types/pos.js";
import { isNonOnsetKanaChar } from "../../utils/char-class.js";
import type { DemoDiscourseToken } from "../demo-discourse.js";
import { isTransparentPauseSeparatedFromPreviousToken } from "./trivia.js";

export interface HostlessInterjectionEvidence extends HostlessInterjectionVerdictFacts {
  readonly kind: "hostless_interjection";
  readonly runStart: number;
}

export interface HostlessInterjectionToken extends DemoDiscourseToken {
  readonly stutterPrefixSuppressed?: boolean;
}

export interface HostlessInterjectionScope {
  readonly utteranceRangeOf: (tokenIdx: number) => { readonly start: number; readonly endExclusive: number };
  readonly embeddedTokenSpace: boolean;
  readonly enclosedByParenthetical: boolean;
  readonly hasRemovedContentIsland: boolean;
  readonly hasRemovedIslandBetween: (afterIdx: number, beforeIdx: number) => boolean;
}

function isNonHostLeadingMaterial(token: HostlessInterjectionToken): boolean {
  return token.stutterPrefixSuppressed === true ||
    (isBoundaryPunctuationCategoryToken(token) && !isTrailingPunctuationToken(token));
}

function isPunctuationOnly(token: HostlessInterjectionToken): boolean {
  return isBoundaryPunctuationCategoryToken(token);
}

function isRightUnboundAt(
  tokens: readonly HostlessInterjectionToken[],
  runEnd: number,
  endExclusive: number
): boolean {
  const follower = runEnd < endExclusive ? tokens[runEnd] : undefined;
  if (follower === undefined || isPunctuationOnly(follower)) {
    return true;
  }
  if (isTransparentPauseSeparatedFromPreviousToken(tokens, runEnd)) {
    return true;
  }
  const onset = Array.from(follower.surface)[0];
  return onset !== undefined && isNonOnsetKanaChar(onset);
}

interface RunSegment {
  readonly start: number;
  readonly match: HostlessInterjectionRowMatch;
}

function collectRun(
  tokens: readonly HostlessInterjectionToken[],
  start: number,
  first: HostlessInterjectionRowMatch,
  endExclusive: number
): readonly RunSegment[] {
  const segments: RunSegment[] = [{ start, match: first }];
  let cursor = start + first.length;
  while (cursor < endExclusive) {
    let next = cursor;
    while (next < endExclusive && isWeakPunctuationToken(tokens[next])) {
      next += 1;
    }
    const match = next < endExclusive && tokens[next]?.stutterPrefixSuppressed !== true
      ? hostlessInterjectionRowMatchAt(tokens, next)
      : null;
    if (match === null || match.lexemeIdentity !== first.lexemeIdentity || next + match.length > endExclusive) {
      break;
    }
    segments.push({ start: next, match });
    cursor = next + match.length;
  }
  return segments;
}

function wholeParentheticalRun(
  tokens: readonly HostlessInterjectionToken[],
  runStart: number,
  runEnd: number,
  segments: readonly RunSegment[],
  scope: HostlessInterjectionScope
): boolean {
  return scope.enclosedByParenthetical &&
    !scope.hasRemovedContentIsland &&
    segments.every((segment) => segment.match.admission.includes("parenthetical_whole")) &&
    tokens.slice(0, runStart).every(isNonHostLeadingMaterial) &&
    tokens.slice(runEnd).every(isPunctuationOnly);
}

export function collectHostlessInterjectionEvidence(
  tokens: readonly HostlessInterjectionToken[],
  scope: HostlessInterjectionScope
): ReadonlyMap<number, HostlessInterjectionEvidence> {
  const evidence = new Map<number, HostlessInterjectionEvidence>();
  let idx = 0;
  while (idx < tokens.length) {
    const first = tokens[idx]?.stutterPrefixSuppressed === true ? null : hostlessInterjectionRowMatchAt(tokens, idx);
    if (first === null) {
      idx += 1;
      continue;
    }
    const range = scope.utteranceRangeOf(idx);
    const leading = tokens.slice(range.start, idx);
    const previous = tokens[idx - 1];
    const onset = (previous === undefined || !isTrailingPunctuationToken(previous)) &&
      leading.every(isNonHostLeadingMaterial);
    if (!onset) {
      idx += first.length;
      continue;
    }
    const segments = collectRun(tokens, idx, first, range.endExclusive);
    const last = segments[segments.length - 1]!;
    const runEnd = last.start + last.match.length;
    if (
      scope.embeddedTokenSpace && range.start === 0 &&
      !wholeParentheticalRun(tokens, idx, runEnd, segments, scope)
    ) {
      idx += first.length;
      continue;
    }
    const follower = tokens[runEnd];
    const hostsFollower = follower !== undefined && runEnd < range.endExclusive && (
      (follower.pos & POS0) === 助詞 ||
      (follower.pos & POS0) === 助動詞 ||
      isLabelSeparatorPunctuationToken(follower)
    );
    const admissionHolds = !last.match.admission.includes("right_unbound") ||
      isRightUnboundAt(tokens, runEnd, range.endExclusive);
    if (!hostsFollower && admissionHolds) {
      const markerOnlyUtterance = tokens.slice(runEnd, range.endExclusive).every(isPunctuationOnly) &&
        !scope.hasRemovedIslandBetween(runEnd - 1, range.endExclusive);
      for (const segment of segments) {
        evidence.set(segment.start, {
          kind: "hostless_interjection",
          rowKey: segment.match.key,
          start: segment.start,
          endExclusive: segment.start + segment.match.length,
          runStart: idx,
          markerOnlyUtterance
        });
      }
    }
    idx = runEnd;
  }
  return evidence;
}
