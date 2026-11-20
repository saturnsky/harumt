import {
  canonicalHardTerminalPunctuationSurfaceFor,
  hardTerminalPunctuationSurfaceClassForToken,
  isBoundaryPunctuationCategoryToken,
  isBoundaryPunctuationToken,
  isDecorativeTerminalPunctuationToken,
  isHardTerminalPunctuationToken,
  isLabelSeparatorPunctuationToken,
  isOpeningPunctuationToken,
  isTrailingPunctuationToken,
  isWeakPunctuationToken,
  type HardTerminalPunctuationSurfaceClass
} from "../head-tail/boundary/punctuation.js";
import type { UtteranceInitialPauseEdgeVerdict } from "../demo-discourse.js";
import { POS0, 記号, 補助記号 } from "../../types/pos.js";
import type { ClauseToken } from "./layout-types.js";

export { BOUNDARY_PUNCTUATION_POS0 as CLAUSE_PUNCT_POS0 } from "../head-tail/boundary/punctuation.js";

export interface ClausePunctuationToken {
  readonly surface: string;
  readonly dictionaryForm?: string;
  readonly pos: number;
}

export type ClauseTerminalPunctuationRunUnit =
  | "question"
  | "exclamation"
  | "period"
  | "ellipsis"
  | "delimiter";

export interface ClauseTerminalPunctuationRunEvidence {
  readonly kind: "terminalPunctuationRun";
  readonly contentEndIdx: number;
  readonly span: { readonly start: number; readonly endExclusive: number };
  readonly units: readonly ClauseTerminalPunctuationRunUnit[];
  readonly tokenIndices: readonly number[];
}

export function terminalPunctuationRunQuestionTokenIndex(
  run: ClauseTerminalPunctuationRunEvidence
): number | null {
  const at = run.units.indexOf("question");
  return at === -1 ? null : run.tokenIndices[at] ?? null;
}

export function collectClauseTerminalPunctuationRunEvidence(
  tokens: readonly ClausePunctuationToken[],
  clauseRanges: readonly {
    readonly start: number;
    readonly endExclusive: number;
  }[]
): readonly ClauseTerminalPunctuationRunEvidence[] {
  const runs: ClauseTerminalPunctuationRunEvidence[] = [];
  for (const clause of clauseRanges) {
    let lastContentIdx: number | null = null;
    let tokenIdx = clause.start;
    while (tokenIdx < clause.endExclusive) {
      const token = tokens[tokenIdx];
      if (token === undefined) {
        break;
      }
      const unit = terminalPunctuationRunUnitForToken(token, tokenIdx);
      const transparent = isClauseEvidenceTransparentPunctuation(token);
      if (unit === null && !transparent) {
        lastContentIdx = tokenIdx;
        tokenIdx += 1;
        continue;
      }

      const units: ClauseTerminalPunctuationRunUnit[] = [];
      const tokenIndices: number[] = [];
      let runEndExclusive = tokenIdx;
      while (runEndExclusive < clause.endExclusive) {
        const runToken = tokens[runEndExclusive];
        if (runToken === undefined) {
          break;
        }
        const runUnit = terminalPunctuationRunUnitForToken(runToken, runEndExclusive);
        const runTransparent = isClauseEvidenceTransparentPunctuation(runToken);
        if (runUnit === null && !runTransparent) {
          break;
        }
        if (runUnit !== null) {
          units.push(runUnit);
          tokenIndices.push(runEndExclusive);
        }
        runEndExclusive += 1;
      }
      if (
        lastContentIdx !== null &&
        units.some((candidate) => candidate !== "delimiter")
      ) {
        const start = tokenIndices[0];
        if (start !== undefined) {
          runs.push({
            kind: "terminalPunctuationRun",
            contentEndIdx: lastContentIdx,
            span: { start, endExclusive: runEndExclusive },
            units,
            tokenIndices
          });
        }
      }
      tokenIdx = runEndExclusive;
    }
  }
  return runs;
}

function terminalPunctuationRunUnitForToken(
  token: ClausePunctuationToken,
  tokenIdx: number
): ClauseTerminalPunctuationRunUnit | null {
  const hardClass = hardTerminalPunctuationSurfaceClassForToken(
    token,
    tokenIdx,
    ["clause_layout"]
  );
  const unit = terminalPunctuationRunUnitForHardClass(hardClass);
  if (unit !== null) {
    return unit;
  }
  const canonicalSurface = canonicalHardTerminalPunctuationSurfaceFor(token);
  if (canonicalSurface !== null) {
    const canonicalUnit = terminalPunctuationRunUnitForHardClass(
      hardTerminalPunctuationSurfaceClassForToken(
        { ...token, surface: canonicalSurface },
        tokenIdx,
        ["clause_layout"]
      )
    );
    if (canonicalUnit !== null) {
      return canonicalUnit;
    }
  }
  return isClauseTrailingPunctuationToken(token) ? "delimiter" : null;
}

function terminalPunctuationRunUnitForHardClass(
  hardClass: HardTerminalPunctuationSurfaceClass | null
): ClauseTerminalPunctuationRunUnit | null {
  if (hardClass === "question" || hardClass === "exclamation" || hardClass === "ellipsis") {
    return hardClass;
  }
  return hardClass === "japanese_period" || hardClass === "ascii_period" ? "period" : null;
}

export function isClauseEvidenceTransparentPunctuation(token: ClausePunctuationToken): boolean {
  return isWeakPunctuationToken(token);
}

export function isClausePunctuationToken(token: ClausePunctuationToken | undefined): boolean {
  return isBoundaryPunctuationCategoryToken(token);
}

export function isClauseBoundaryPunctuationToken(token: ClausePunctuationToken | undefined): boolean {
  return isBoundaryPunctuationToken(token);
}

export function isClauseTrailingPunctuationToken(token: ClausePunctuationToken | undefined): boolean {
  return isTrailingPunctuationToken(token);
}

export function isClauseOpeningPunctuationToken(token: ClausePunctuationToken | undefined): boolean {
  return isOpeningPunctuationToken(token);
}

export function isClauseHardTerminalPunctuationToken(token: ClausePunctuationToken | undefined): boolean {
  return isHardTerminalPunctuationToken(token);
}

export function isClauseLabelSeparatorPunctuationToken(token: ClausePunctuationToken | undefined): boolean {
  return isLabelSeparatorPunctuationToken(token);
}

export function isClauseDecorativeTerminalPunctuationToken(
  token: ClausePunctuationToken | undefined,
  decorativeSurfaces: ReadonlySet<string>
): boolean {
  return isDecorativeTerminalPunctuationToken(token, decorativeSurfaces);
}

export interface CopulaPauseBridgeEvidence {
  readonly kind: "copulaPauseBridge";
  readonly punctuationSpan: { readonly start: number; readonly endExclusive: number };
  readonly copulaStart: number;
  readonly edgeIdx: number;
  readonly edgeVerdict: UtteranceInitialPauseEdgeVerdict;
}

export function collectCopulaPauseBridgeEvidence<T extends ClausePunctuationToken>(
  tokens: readonly T[],
  isCopulaChainStart: (token: T) => boolean,
  punctuationBreakIndices: ReadonlySet<number>,
  edgeVerdictAt: (edgeIdx: number) => UtteranceInitialPauseEdgeVerdict
): readonly CopulaPauseBridgeEvidence[] {
  const bridges: CopulaPauseBridgeEvidence[] = [];
  for (const [copulaStart, token] of tokens.entries()) {
    if (token === undefined || !isCopulaChainStart(token)) {
      continue;
    }
    let runStart: number | null = null;
    let cursor = copulaStart - 1;
    for (; cursor >= 0; cursor -= 1) {
      const candidate = tokens[cursor];
      if (candidate === undefined) {
        break;
      }
      if (!isClauseEvidenceTransparentPunctuation(candidate)) {
        break;
      }
      if (punctuationBreakIndices.has(cursor)) {
        runStart = null;
        break;
      }
      runStart = cursor;
    }
    if (runStart === null) {
      continue;
    }
    const edgeIdx = cursor;
    const edge = edgeIdx < 0 ? undefined : tokens[edgeIdx];
    if (edge === undefined || isBoundaryPunctuationToken(edge)) {
      continue;
    }
    bridges.push({
      kind: "copulaPauseBridge",
      punctuationSpan: { start: runStart, endExclusive: copulaStart },
      copulaStart,
      edgeIdx,
      edgeVerdict: edgeVerdictAt(edgeIdx)
    });
  }
  return bridges;
}

export function skipClausePunctuationForward<T extends ClausePunctuationToken>(
  tokens: readonly T[],
  start: number,
  endExclusive: number
): number {
  let index = start;
  while (index < endExclusive && isClausePunctuationToken(tokens[index])) {
    index += 1;
  }
  return index;
}

export const CLAUSE_PUNCT_POS0_NUM: ReadonlySet<number> = new Set([補助記号, 記号]);

export function isOpeningPunct(token: ClauseToken): boolean {
  return isClauseOpeningPunctuationToken(token);
}

export function isBoundaryPunct(token: ClauseToken): boolean {
  return isClauseBoundaryPunctuationToken(token);
}

export function isAbsorbablePunct(token: ClauseToken): boolean {
  return CLAUSE_PUNCT_POS0_NUM.has(token.pos & POS0) && (isBoundaryPunct(token) || isTrailingPunct(token));
}

export function isTrailingPunct(token: ClauseToken): boolean {
  return isClauseTrailingPunctuationToken(token);
}

export function nextAfterAbsorbableRun(tokens: readonly ClauseToken[], start: number): number {
  let lastAbsorbable = start - 1;
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (isAbsorbablePunct(token)) {
      lastAbsorbable = index;
      continue;
    }
    break;
  }
  return lastAbsorbable + 1;
}
