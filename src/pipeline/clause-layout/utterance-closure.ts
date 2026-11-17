import type { BalancedDelimiterSpan } from "./balanced-delimiter.js";
import type { ClausePunctuationToken, ClauseTerminalPunctuationRunEvidence } from "./punctuation.js";
import {
  isClauseEvidenceTransparentPunctuation,
  isClauseHardTerminalPunctuationToken,
  isClauseLabelSeparatorPunctuationToken,
  isClauseOpeningPunctuationToken,
  isClausePunctuationToken,
  isClauseTrailingPunctuationToken
} from "./punctuation.js";
import { DETACHED_SEPARATIONS, nextNonSpaceIndex, previousNonSpaceIndex, separatedAs } from "./trivia.js";
import type { ClauseAdjacencyToken } from "./trivia.js";
import { detachmentAdmittingClosureMarker } from "./speech-act.js";
import { parentheticalSpanEndingAt, roleForOpeningSurface } from "../head-tail/boundary/parenthetical.js";
import type { ParentheticalSpanRole } from "../head-tail/boundary/relation.js";
import { isVerbPredicateToken, isVolitionalInflection } from "../../types/pos.js";

export type UtteranceClosureKind =
  | "eos"
  | "hard_terminal"
  | "matched_delimiter_close"
  | "unmatched_trailing"
  | "weak_pause"
  | "label_separator"
  | "decorative_terminal"
  | "clause_boundary"
  | "detached_separation"
  | "none";

export type UtteranceClosureEvidence =
  | { readonly kind: "utteranceClosure"; readonly closure: "eos" }
  | {
    readonly kind: "utteranceClosure";
    readonly closure: "hard_terminal";
    readonly tokenIdx: number;
    readonly run?: ClauseTerminalPunctuationRunEvidence;
  }
  | {
    readonly kind: "utteranceClosure";
    readonly closure: "matched_delimiter_close";
    readonly tokenIdx: number;
    readonly span: BalancedDelimiterSpan;
  }
  | { readonly kind: "utteranceClosure"; readonly closure: "unmatched_trailing"; readonly tokenIdx: number }
  | { readonly kind: "utteranceClosure"; readonly closure: "weak_pause"; readonly tokenIdx: number }
  | { readonly kind: "utteranceClosure"; readonly closure: "label_separator"; readonly tokenIdx: number }
  | { readonly kind: "utteranceClosure"; readonly closure: "decorative_terminal"; readonly tokenIdx: number }
  | { readonly kind: "utteranceClosure"; readonly closure: "clause_boundary"; readonly tokenIdx: number }
  | { readonly kind: "utteranceClosure"; readonly closure: "detached_separation"; readonly tokenIdx: number }
  | { readonly kind: "utteranceClosure"; readonly closure: "none"; readonly tokenIdx: number };

export interface UtteranceClosureScope {
  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined;
  terminalPunctuationRunContaining(tokenIdx: number): ClauseTerminalPunctuationRunEvidence | undefined;
  unmarkedMainClauseBoundaryAt(splitAt: number): boolean;
  decorativeTerminalClosureAt(tokenIdx: number): boolean;
}

export type UtteranceClosureToken = ClausePunctuationToken & ClauseAdjacencyToken & {
  readonly splitA?: readonly UtteranceClosureToken[];
};

export interface UtteranceClosureDetachmentOptions {
  readonly closureMarkerIdx: number | null;
}

export function utteranceClosureAfter<T extends UtteranceClosureToken>(
  scope: UtteranceClosureScope | null,
  tokens: readonly T[],
  afterIdx: number,
  detachment?: UtteranceClosureDetachmentOptions
): UtteranceClosureEvidence {
  const idx = nextNonSpaceIndex(tokens, afterIdx);
  return idx === null
    ? { kind: "utteranceClosure", closure: "eos" }
    : utteranceClosureAt(scope, tokens, idx, detachment);
}

export function utteranceClosureAt<T extends UtteranceClosureToken>(
  scope: UtteranceClosureScope | null,
  tokens: readonly T[],
  tokenIdx: number,
  detachment?: UtteranceClosureDetachmentOptions
): UtteranceClosureEvidence {
  const token = tokens[tokenIdx];
  if (token === undefined) {
    return { kind: "utteranceClosure", closure: "eos" };
  }
  if (isClauseHardTerminalPunctuationToken(token)) {
    const run = scope?.terminalPunctuationRunContaining(tokenIdx);
    return {
      kind: "utteranceClosure",
      closure: "hard_terminal",
      tokenIdx,
      ...(run === undefined ? {} : { run })
    };
  }
  if (isClauseTrailingPunctuationToken(token)) {
    const span = balancedSpanEndingAt(scope, tokens, tokenIdx);
    return span === undefined
      ? { kind: "utteranceClosure", closure: "unmatched_trailing", tokenIdx }
      : { kind: "utteranceClosure", closure: "matched_delimiter_close", tokenIdx, span };
  }
  if (isClauseEvidenceTransparentPunctuation(token)) {
    return { kind: "utteranceClosure", closure: "weak_pause", tokenIdx };
  }
  if (isClauseLabelSeparatorPunctuationToken(token)) {
    return { kind: "utteranceClosure", closure: "label_separator", tokenIdx };
  }
  if (scope?.decorativeTerminalClosureAt(tokenIdx) === true) {
    return { kind: "utteranceClosure", closure: "decorative_terminal", tokenIdx };
  }
  if (
    detachment !== undefined &&
    detachmentAdmittingClosureMarker(tokens, detachment.closureMarkerIdx) &&
    separatedAs(tokens, tokenIdx, DETACHED_SEPARATIONS)
  ) {
    return { kind: "utteranceClosure", closure: "detached_separation", tokenIdx };
  }
  return scope?.unmarkedMainClauseBoundaryAt(tokenIdx) === true
    ? { kind: "utteranceClosure", closure: "clause_boundary", tokenIdx }
    : { kind: "utteranceClosure", closure: "none", tokenIdx };
}

export function utteranceClosureTokenIdx(evidence: UtteranceClosureEvidence): number | null {
  return evidence.closure === "eos" ? null : evidence.tokenIdx;
}

export function closesUtteranceAs(
  evidence: UtteranceClosureEvidence,
  admitted: ReadonlySet<UtteranceClosureKind>
): boolean {
  return admitted.has(evidence.closure);
}

function balancedSpanEndingAt<T extends UtteranceClosureToken>(
  scope: UtteranceClosureScope | null,
  tokens: readonly T[],
  closingIdx: number
): BalancedDelimiterSpan | undefined {
  if (scope !== null) {
    return scope.balancedDelimiterSpanEndingAt(closingIdx);
  }
  const span = parentheticalSpanEndingAt(tokens, closingIdx, { consumers: ["nominal_head_parser"] });
  return span === null
    ? undefined
    : {
      start: span.span.start,
      endExclusive: span.span.endExclusive,
      openingIdx: span.openingIdx,
      closingIdx: span.closingIdx,
      contentEndExclusive:
        (previousNonSpaceIndex(tokens, span.closingIdx, span.openingIdx + 1) ?? span.openingIdx) + 1,
      role: span.role
    };
}

export type UtteranceClosureRunKind =
  | "terminal_particle_run"
  | "terminal_copula_run"
  | "polite_terminal_chain"
  | "interrogative_noda_run"
  | "formal_noun_dependent";

export interface UtteranceClosureRunEvidence {
  readonly kind: "utteranceClosureRun";
  readonly run: UtteranceClosureRunKind;
  readonly endIdx: number;
  readonly hostIdx: number;
  readonly terminalParticleStartIdx?: number;
}

export type ClosedPropositionBeforeMarker =
  | {
    readonly evidence: "utterance_closure_run";
    readonly run: UtteranceClosureRunKind;
    readonly hostIdx: number;
    readonly markerIdx: number;
  }
  | {
    readonly evidence: "bare_volitional";
    readonly hostIdx: number;
    readonly markerIdx: number;
  };

export function closedPropositionBeforeMarker(
  layout: { utteranceClosureRunAt(endIdx: number): UtteranceClosureRunEvidence | undefined },
  tokens: readonly (ClauseAdjacencyToken & { readonly pos: number })[],
  markerIdx: number
): ClosedPropositionBeforeMarker | null {
  const run = layout.utteranceClosureRunAt(markerIdx);
  if (run !== undefined) {
    return { evidence: "utterance_closure_run", run: run.run, hostIdx: run.hostIdx, markerIdx };
  }
  const hostIdx = previousNonSpaceIndex(tokens, markerIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (hostIdx === null || host === undefined || !isVerbVolitionalClosingForm(host.pos)) {
    return null;
  }
  return { evidence: "bare_volitional", hostIdx, markerIdx };
}

function isVerbVolitionalClosingForm(pos: number): boolean {
  return isVerbPredicateToken({ pos }) && isVolitionalInflection(pos);
}

export function utteranceClosedForAttributiveProjection(
  runEvidence: UtteranceClosureRunEvidence | null,
  sfpEffect: string | null | undefined,
  closingEffects: ReadonlySet<string>
): boolean {
  if (runEvidence !== null && runEvidence.run !== "formal_noun_dependent") {
    return true;
  }
  return sfpEffect !== undefined && sfpEffect !== null && sfpEffect.length > 0 &&
    closingEffects.has(sfpEffect);
}

export interface UtteranceClosureRunTraversal {
  readonly kind: "utteranceClosureRunTraversal";
  readonly closures: readonly UtteranceClosureEvidence[];
  readonly endIdx: number;
  readonly endedBy: "eos" | "content" | "opening_delimiter";
  readonly openingRole: ParentheticalSpanRole | null;
  readonly traversed: boolean;
  readonly detachedAtEnd: boolean;
}

export function utteranceClosureRunAfter<T extends UtteranceClosureToken & ClauseAdjacencyToken>(
  scope: UtteranceClosureScope | null,
  tokens: readonly T[],
  afterIdx: number
): UtteranceClosureRunTraversal {
  const closures: UtteranceClosureEvidence[] = [];
  let idx = nextNonSpaceIndex(tokens, afterIdx);
  let traversed = false;
  for (; ;) {
    if (idx === null || tokens[idx] === undefined) {
      const endIdx = tokens.length;
      closures.push({ kind: "utteranceClosure", closure: "eos" });
      return {
        kind: "utteranceClosureRunTraversal",
        closures,
        endIdx,
        endedBy: "eos",
        openingRole: null,
        traversed,
        detachedAtEnd: false
      };
    }
    const token = tokens[idx]!;
    const evidence = utteranceClosureAt(scope, tokens, idx);
    if (evidence.closure === "clause_boundary") {
      closures.push(evidence);
      return {
        kind: "utteranceClosureRunTraversal",
        closures,
        endIdx: idx,
        endedBy: "content",
        openingRole: null,
        traversed,
        detachedAtEnd: separatedAs(tokens, idx, DETACHED_SEPARATIONS)
      };
    }
    if (evidence.closure !== "none") {
      closures.push(evidence);
      traversed = true;
      idx = nextNonSpaceIndex(tokens, idx + 1);
      continue;
    }
    if (isClausePunctuationToken(token) && !isClauseOpeningPunctuationToken(token)) {
      traversed = true;
      idx = nextNonSpaceIndex(tokens, idx + 1);
      continue;
    }
    const opening = isClauseOpeningPunctuationToken(token);
    return {
      kind: "utteranceClosureRunTraversal",
      closures,
      endIdx: idx,
      endedBy: opening ? "opening_delimiter" : "content",
      openingRole: opening ? roleForOpeningSurface(token.surface) : null,
      traversed,
      detachedAtEnd: separatedAs(tokens, idx, DETACHED_SEPARATIONS)
    };
  }
}

export function runClosesUtteranceAs(
  traversal: UtteranceClosureRunTraversal,
  admitted: ReadonlySet<UtteranceClosureKind>
): boolean {
  return traversal.closures.some((evidence) => closesUtteranceAs(evidence, admitted));
}
