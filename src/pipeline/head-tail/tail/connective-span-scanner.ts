import type {
  BoundaryRelationConsumer,
  CompositeConnectivePatternRelation
} from "../boundary/relation.js";
import { lazyValue } from "../../../data-loader.js";
import {
  loadConnectiveSurfaceEntries,
  type ConnectiveRelationMarkerPolicy,
  type ConnectiveSurfaceEntry,
  type ConnectiveTokenPattern,
  type ConnectiveTokenPatternAtom
} from "./predicate-root/connective-surface-table.js";
import { isSourceSeparatedFromPreviousToken, nextNonSpaceIndex } from "../../clause-layout/trivia.js";
import type {
  ClauseProjectionForm,
  ConnectiveStructuralRelationKind,
  StructuralRelationTargetSlot
} from "../../structural-relation/types.js";
import { TokenCursor } from "../../token-cursor.js";
import type { SeparationEvidence } from "../../../types/token.js";

import { POS0, POS0_NAME, POS1, POS1_NAME, POS1_SHIFT, POS5A, POS5A_NAME, POS5A_SHIFT, POS5B, POS5B_NAME, POS5B_SHIFT, 助詞 } from "../../../types/pos.js";
export interface ConnectiveSpanToken {
  readonly surface: string;
  readonly dictionaryForm?: string;
  readonly pos: number;
  readonly whitespaceBefore?: SeparationEvidence;
  readonly transparentPauseAfter?: boolean;
  readonly sourceOrdinal?: number;
  readonly sourceSpan?: {
    readonly startOrdinal: number;
    readonly endOrdinal: number;
  } | null;
}

export interface RelationConnectiveSpanMatch {
  readonly endExclusive: number;
  readonly surface: string;
  readonly tokenCount: number;
  readonly connectiveKind: string;
  readonly relationPolicy: ConnectiveStructuralRelationKind;
  readonly projection?: ClauseProjectionForm;
  readonly targetSlot?: StructuralRelationTargetSlot;
  readonly markerPolicy: ConnectiveRelationMarkerPolicy;
  readonly markerRole?: string;
  readonly closurePatterns?: readonly ConnectiveTokenPattern[];
  readonly closureRole?: string;
  readonly layoutBoundaryPolicy?: ConnectiveSurfaceEntry["layoutBoundaryPolicy"];
  readonly renderEnabledByDefault?: boolean;
  readonly hostIndex?: number;
}

export interface RelationDiscontinuousClosureSpanMatch {
  readonly start: number;
  readonly endExclusive: number;
  readonly surface: string;
  readonly tokenCount: number;
  readonly role?: string;
}

interface RelationConnectiveSpanPattern {
  readonly entry: ConnectiveSurfaceEntry;
  readonly pattern: ConnectiveTokenPattern;
}

interface ScannedConnectiveTokenPattern {
  readonly pattern: ConnectiveTokenPattern;
  readonly hostPatterns?: readonly ConnectiveTokenPatternAtom[];
}

function scannedPatterns(
  entry: ConnectiveSurfaceEntry,
  patterns: readonly ConnectiveTokenPattern[]
): readonly ScannedConnectiveTokenPattern[] {
  return patterns.map((pattern) => entry.hostPatterns === undefined
    ? { pattern }
    : { pattern, hostPatterns: entry.hostPatterns });
}

const CONNECTIVE_SPAN_PATTERNS: readonly ScannedConnectiveTokenPattern[] = lazyValue(() => loadConnectiveSurfaceEntries({
  isSupportedKind: (value: string): value is string => typeof value === "string" && value.length > 0
}).flatMap((entry) => scannedPatterns(entry, entry.tokenPatterns ?? [])));

const CONNECTIVE_LAYOUT_SHIELD_PATTERNS: readonly ScannedConnectiveTokenPattern[] = lazyValue(() => loadConnectiveSurfaceEntries({
  isSupportedKind: (value: string): value is string => typeof value === "string" && value.length > 0
}).flatMap((entry) => {
  if (entry.layoutBoundaryPolicy === undefined || entry.layoutBoundaryPolicy === "normal") {
    return [];
  }
  if (entry.shieldPattern !== undefined) {
    return scannedPatterns(entry, [entry.shieldPattern]);
  }
  return scannedPatterns(entry, entry.tokenPatterns ?? []);
}));

const CONNECTIVE_RELATION_SPAN_PATTERNS: readonly RelationConnectiveSpanPattern[] = lazyValue(() => loadConnectiveSurfaceEntries({
  isSupportedKind: (value: string): value is string => typeof value === "string" && value.length > 0
}).flatMap((entry) => {
  if (entry.relationPolicy === undefined || entry.markerPolicy === undefined) {
    return [];
  }
  const patterns = entry.tokenPatterns ?? (entry.shieldPattern === undefined ? singleTokenSurfacePatterns(entry) : [entry.shieldPattern]);
  return patterns.map((pattern) => ({ entry, pattern }));
}));

const CONNECTIVE_SINGLE_TOKEN_SURFACE_ENTRIES: ReadonlyMap<string, readonly ConnectiveSurfaceEntry[]> = lazyValue(() => (() => {
  const map = new Map<string, ConnectiveSurfaceEntry[]>();
  for (const entry of loadConnectiveSurfaceEntries({
    isSupportedKind: (value: string): value is string => typeof value === "string" && value.length > 0
  })) {
    for (const surface of entry.surfaces) {
      const entries = map.get(surface);
      if (entries === undefined) {
        map.set(surface, [entry]);
      } else {
        entries.push(entry);
      }
    }
  }
  return map;
})());

export const CLAUSE_LAYOUT_CONNECTIVE_SPAN_SCANNER_REGISTRY_SURFACES: readonly string[] =
  lazyValue(() => unique(CONNECTIVE_SPAN_PATTERNS.map(({ pattern }) => pattern.surface)));

export const CLAUSE_LAYOUT_CONNECTIVE_SPAN_SCANNER_INTERNAL_SURFACES = [] as const;

export const CLAUSE_LAYOUT_CONNECTIVE_SHIELD_SCANNER_REGISTRY_SURFACES: readonly string[] =
  lazyValue(() => unique(CONNECTIVE_LAYOUT_SHIELD_PATTERNS.map(({ pattern }) => pattern.surface)));

export const STRUCTURAL_RELATION_CONNECTIVE_SPAN_SCANNER_REGISTRY_SURFACES: readonly string[] =
  lazyValue(() => unique(CONNECTIVE_RELATION_SPAN_PATTERNS.map(({ pattern }) => pattern.surface)));

export function multiTokenConnectiveSplitAt(
  cursor: TokenCursor<ConnectiveSpanToken>
): number | null {
  return matchMultiTokenConnectivePatternAt(cursor)?.endExclusive ?? null;
}

export function compositeConnectivePatternRelationAt(
  cursor: TokenCursor<ConnectiveSpanToken>,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
    readonly lookupConnectiveKind?: (surface: string) => string | undefined;
  } = {}
): CompositeConnectivePatternRelation | null {
  const index = cursor.pos;
  const match = matchMultiTokenConnectivePatternAt(cursor);
  if (match === null) {
    return null;
  }
  return {
    kind: "composite_connective_pattern",
    span: { start: index, endExclusive: match.endExclusive },
    strength: "readiness",
    reason: `multi-token connective pattern ${match.surface}`,
    consumers: options.consumers ?? ["clause_layout", "connective_span_scanner"],
    surface: match.surface,
    connectiveKind: options.lookupConnectiveKind?.(match.surface) ?? match.surface,
    tokenCount: match.tokenCount,
    ...(match.hostIndex === undefined ? {} : { hostIndex: match.hostIndex })
  };
}

export function layoutBoundaryShieldAt(
  cursor: TokenCursor<ConnectiveSpanToken>
): {
  readonly endExclusive: number;
  readonly surface: string;
  readonly tokenCount: number;
} | null {
  return matchConnectivePatternAt(CONNECTIVE_LAYOUT_SHIELD_PATTERNS, cursor);
}

export function relationConnectiveSpanAt(
  cursor: TokenCursor<ConnectiveSpanToken>
): RelationConnectiveSpanMatch | null {
  return relationConnectiveSpansAt(cursor)[0] ?? null;
}

export function relationConnectiveSpansAt(
  cursor: TokenCursor<ConnectiveSpanToken>
): readonly RelationConnectiveSpanMatch[] {
  return matchRelationConnectivePatternsAt(CONNECTIVE_RELATION_SPAN_PATTERNS, cursor);
}

export function relationDiscontinuousClosureSpanAfter(
  cursor: TokenCursor<ConnectiveSpanToken>,
  match: RelationConnectiveSpanMatch
): RelationDiscontinuousClosureSpanMatch | null {
  if (match.markerPolicy !== "discontinuous" || match.closurePatterns === undefined) {
    return null;
  }
  const closureStart = nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end);
  if (closureStart === null) {
    return null;
  }
  const closure = cursor.lookahead(
    closureStart - cursor.pos,
    c => matchConnectivePatternAt(match.closurePatterns!.map((pattern) => ({ pattern })), c)
  );
  if (closure === null) {
    return null;
  }
  return {
    start: closureStart,
    endExclusive: closure.endExclusive,
    surface: closure.surface,
    tokenCount: closure.tokenCount,
    ...(match.closureRole === undefined ? {} : { role: match.closureRole }),
  };
}

export function hostedConnectiveMarkerAt(
  tokens: readonly ConnectiveSpanToken[],
  index: number,
  kind: string
): { readonly surface: string; readonly hostIndex: number } | null {
  const token = tokens[index];
  const host = index > 0 ? tokens[index - 1] : undefined;
  if (token === undefined || host === undefined || isSourceSeparatedFromPreviousToken(tokens, index)) {
    return null;
  }
  const hosted = CONNECTIVE_SINGLE_TOKEN_SURFACE_ENTRIES.get(token.surface)?.some((entry) =>
    entry.kind === kind &&
    entry.hostPatterns !== undefined &&
    entry.hostPatterns.some((atom) => connectiveTokenMatches(host, atom))
  ) === true;
  return hosted ? { surface: token.surface, hostIndex: index - 1 } : null;
}

export function isHostedConnectiveMarkerAt(tokens: readonly ConnectiveSpanToken[], index: number): boolean {
  const token = tokens[index];
  const host = index > 0 ? tokens[index - 1] : undefined;
  if (token === undefined || host === undefined || isSourceSeparatedFromPreviousToken(tokens, index)) {
    return false;
  }
  return CONNECTIVE_SINGLE_TOKEN_SURFACE_ENTRIES.get(token.surface)?.some((entry) =>
    entry.hostPatterns !== undefined &&
    entry.hostPatterns.some((atom) => connectiveTokenMatches(host, atom))
  ) === true;
}

export function tokenMatchesConnectiveKind(
  token: ConnectiveSpanToken,
  kind: string
): boolean {
  return CONNECTIVE_SINGLE_TOKEN_SURFACE_ENTRIES.get(token.surface)?.some((entry) =>
    entry.kind === kind && connectiveEntryAllowsSingleToken(entry, token)
  ) === true;
}

interface ConnectivePatternSpanMatch {
  readonly endExclusive: number;
  readonly surface: string;
  readonly tokenCount: number;
  readonly hostIndex?: number;
}

function matchMultiTokenConnectivePatternAt(
  cursor: TokenCursor<ConnectiveSpanToken>
): ConnectivePatternSpanMatch | null {
  return matchConnectivePatternAt(CONNECTIVE_SPAN_PATTERNS, cursor);
}

function matchConnectivePatternAt(
  patterns: readonly ScannedConnectiveTokenPattern[],
  cursor: TokenCursor<ConnectiveSpanToken>
): ConnectivePatternSpanMatch | null {
  const index = cursor.pos;
  const n = cursor.end;
  const tokens = cursor.tokens;
  let best: ConnectivePatternSpanMatch | null = null;
  for (const { pattern, hostPatterns } of patterns) {
    if (pattern.tokens.length + index > n) {
      continue;
    }
    if (
      !pattern.tokens.every((atom, offset) => connectiveTokenMatches(tokens[index + offset], atom)) ||
      !connectivePatternSpanIsContiguousEnough(pattern, tokens, index)
    ) {
      continue;
    }
    const host = connectivePatternHostVerdict(hostPatterns, tokens, index);
    if (host === "unsatisfied") {
      continue;
    }
    const matched = connectivePatternMatch(index, pattern, host);
    if (best === null || matched.tokenCount > best.tokenCount) {
      best = matched;
    }
  }
  return best;
}

function connectivePatternHostVerdict(
  hostPatterns: readonly ConnectiveTokenPatternAtom[] | undefined,
  tokens: readonly ConnectiveSpanToken[],
  index: number
): "undeclared" | "unsatisfied" | number {
  if (hostPatterns === undefined) {
    return "undeclared";
  }
  const host = index > 0 ? tokens[index - 1] : undefined;
  if (host === undefined || isSourceSeparatedFromPreviousToken(tokens, index)) {
    return "unsatisfied";
  }
  return hostPatterns.some((atom) => connectiveTokenMatches(host, atom)) ? index - 1 : "unsatisfied";
}

function matchRelationConnectivePatternsAt(
  patterns: readonly RelationConnectiveSpanPattern[],
  cursor: TokenCursor<ConnectiveSpanToken>
): readonly RelationConnectiveSpanMatch[] {
  const index = cursor.pos;
  const n = cursor.end;
  const tokens = cursor.tokens;
  const matches: RelationConnectiveSpanMatch[] = [];
  for (const candidate of patterns) {
    const { entry, pattern } = candidate;
    if (pattern.tokens.length + index > n) {
      continue;
    }
    if (
      !pattern.tokens.every((atom, offset) => connectiveTokenMatches(tokens[index + offset], atom)) ||
      !connectivePatternSpanIsContiguousEnough(pattern, tokens, index)
    ) {
      continue;
    }
    const host = connectivePatternHostVerdict(entry.hostPatterns, tokens, index);
    if (host === "unsatisfied") {
      continue;
    }
    const matched = {
      ...connectivePatternMatch(index, pattern, host),
      connectiveKind: entry.kind,
      relationPolicy: entry.relationPolicy!,
      ...(entry.projection === undefined ? {} : { projection: entry.projection }),
      ...(entry.targetSlot === undefined ? {} : { targetSlot: entry.targetSlot }),
      markerPolicy: entry.markerPolicy as ConnectiveRelationMarkerPolicy,
      ...(entry.markerRole === undefined ? {} : { markerRole: entry.markerRole }),
      ...(entry.closurePatterns === undefined ? {} : { closurePatterns: entry.closurePatterns }),
      ...(entry.closureRole === undefined ? {} : { closureRole: entry.closureRole }),
      ...(entry.layoutBoundaryPolicy === undefined ? {} : { layoutBoundaryPolicy: entry.layoutBoundaryPolicy }),
      ...(entry.renderEnabledByDefault === undefined ? {} : { renderEnabledByDefault: entry.renderEnabledByDefault })
    };
    matches.push(matched);
  }
  return matches.sort((left, right) => right.tokenCount - left.tokenCount);
}

function connectivePatternSpanIsContiguousEnough(
  pattern: ConnectiveTokenPattern,
  tokens: readonly ConnectiveSpanToken[],
  index: number
): boolean {
  if (pattern.contiguous !== true) {
    return true;
  }
  for (let offset = 1; offset < pattern.tokens.length; offset++) {
    if (isSourceSeparatedFromPreviousToken(tokens, index + offset)) {
      return false;
    }
  }
  return true;
}

function connectivePatternMatch(
  index: number,
  pattern: ConnectiveTokenPattern,
  host: "undeclared" | number
): ConnectivePatternSpanMatch {
  return {
    endExclusive: index + pattern.tokens.length,
    surface: pattern.surface,
    tokenCount: pattern.tokens.length,
    ...(host === "undeclared" ? {} : { hostIndex: host })
  };
}

export function connectiveTokenMatches(
  token: ConnectiveSpanToken | undefined,
  atom: ConnectiveTokenPatternAtom
): boolean {
  if (token === undefined) {
    return false;
  }
  return stringPatternMatches(atom.surface, token.surface) &&
    stringPatternMatches(atom.dictionaryForm, token.dictionaryForm || token.surface) &&
    stringPatternMatches(atom.pos0, POS0_NAME[token.pos & POS0] ?? "*") &&
    stringPatternMatches(atom.pos1, POS1_NAME[(token.pos & POS1) >> POS1_SHIFT] ?? "*") &&
    inflectionPatternMatches(atom.pos5, token.pos);
}

function inflectionPatternMatches(accepted: readonly string[] | undefined, pos: number): boolean {
  if (accepted === undefined) {
    return true;
  }
  const form = POS5A_NAME[(pos & POS5A) >> POS5A_SHIFT] ?? "*";
  const detailed = form + (POS5B_NAME[(pos & POS5B) >> POS5B_SHIFT] ?? "");
  return accepted.some((value) => value === form || value === detailed);
}

function connectiveEntryAllowsSingleToken(
  entry: ConnectiveSurfaceEntry,
  token: ConnectiveSpanToken
): boolean {
  if (entry.particleSubtypes === undefined) {
    return true;
  }
  return (token.pos & POS0) === 助詞 &&
    entry.particleSubtypes.includes(POS1_NAME[(token.pos & POS1) >> POS1_SHIFT] ?? "*");
}

function singleTokenSurfacePatterns(entry: ConnectiveSurfaceEntry): readonly ConnectiveTokenPattern[] {
  return entry.surfaces.map((surface) => ({
    surface,
    tokens: [{
      surface: [surface],
      ...(entry.particleSubtypes === undefined ? {} : { pos0: ["助詞"], pos1: entry.particleSubtypes })
    }]
  }));
}

function stringPatternMatches(accepted: readonly string[] | undefined, value: string): boolean {
  return accepted === undefined || accepted.includes(value);
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
