import type { RuntimeHaruToken } from "../../types/token.js";
import { POS0, POS01, isBungoAssertiveCopulaAdnominalToken, 名詞, 助詞_終助詞 } from "../../types/pos.js";
import { terminalSfpRunClosureAfter } from "../../transform/terminal-sfp-retag-closure.js";
import type { ClauseLayout } from "../clause-layout/index.js";
import { isFinitePredicateBoundaryLeft } from "../clause-layout/index.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../clause-layout/trivia.js";
import {
  closesUtteranceAs,
  type UtteranceClosureKind,
  type UtteranceClosureScope
} from "../clause-layout/utterance-closure.js";
import { MONO_EXPLANATORY_SFP_FORMS } from "../head-tail/data/semantic-helper-sets.js";
import { isAdnominalCopulaToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { toiuAttributiveHeadIndex } from "./marker-roles.js";


export type ExplanatoryMonReading =
  | { readonly kind: "explanatory_sfp"; readonly evidence: "terminal_sfp_run" | "utterance_closure" }
  | { readonly kind: "pause_pending"; readonly pauseIdx: number }
  | { readonly kind: "not_explanatory" };

const NOT_EXPLANATORY: ExplanatoryMonReading = { kind: "not_explanatory" };

const EXPLANATORY_MON_CLOSING_KINDS: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "decorative_terminal",
  "clause_boundary"
]);

export function isExplanatoryMonNounToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 名詞 &&
    MONO_EXPLANATORY_SFP_FORMS.has(token.surface);
}

function isAdnominalOnlyCopula(token: RuntimeHaruToken): boolean {
  return isAdnominalCopulaToken(token) || isBungoAssertiveCopulaAdnominalToken(token);
}

function isFiniteHostOf(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const host = tokens[idx - 1];
  return host !== undefined &&
    !separatedAs(tokens, idx, DETACHED_SEPARATIONS) &&
    isFinitePredicateBoundaryLeft(host) &&
    !isAdnominalOnlyCopula(host);
}

export function isAdnominalHostedMonSfpToken(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const token = tokens[idx];
  const host = tokens[idx - 1];
  return token !== undefined && host !== undefined &&
    (token.pos & POS01) === 助詞_終助詞 &&
    MONO_EXPLANATORY_SFP_FORMS.has(token.surface) &&
    !separatedAs(tokens, idx, DETACHED_SEPARATIONS) &&
    isAdnominalOnlyCopula(host);
}

export function quoteCarrierHeadIndices(tokens: readonly RuntimeHaruToken[]): ReadonlySet<number> {
  const heads = new Set<number>();
  for (let markerIdx = 0; markerIdx < tokens.length; markerIdx++) {
    const headIdx = toiuAttributiveHeadIndex(tokens, markerIdx, tokens.length);
    if (headIdx !== null) {
      heads.add(headIdx);
    }
  }
  return heads;
}

export function explanatoryMonReadingAt(
  scope: UtteranceClosureScope | null,
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  carrierHeads?: ReadonlySet<number>
): ExplanatoryMonReading {
  if (!isExplanatoryMonNounToken(tokens[idx]) || !isFiniteHostOf(tokens, idx)) {
    return NOT_EXPLANATORY;
  }
  if ((carrierHeads ?? quoteCarrierHeadIndices(tokens)).has(idx)) {
    return NOT_EXPLANATORY;
  }
  const run = terminalSfpRunClosureAfter(scope, tokens, idx);
  if (run.kaInRun) {
    return NOT_EXPLANATORY;
  }
  if (run.runLength > 0) {
    return { kind: "explanatory_sfp", evidence: "terminal_sfp_run" };
  }
  if (closesUtteranceAs(run.closure, EXPLANATORY_MON_CLOSING_KINDS)) {
    return { kind: "explanatory_sfp", evidence: "utterance_closure" };
  }
  return run.closure.closure === "weak_pause"
    ? { kind: "pause_pending", pauseIdx: run.closure.tokenIdx }
    : NOT_EXPLANATORY;
}

export function explanatoryMonPauseClosesBeforePostposedMaterial(
  layout: ClauseLayout,
  monIdx: number,
  pauseIdx: number
): boolean {
  const utterance = layout.utteranceRangeOfToken(pauseIdx);
  const enclosing = layout.enclosingBalancedSpan(monIdx);
  const end = Math.min(utterance.endExclusive, enclosing?.closingIdx ?? utterance.endExclusive);
  return !layout.clauses.some((clause) =>
    clause.predicates.some((predicateIdx) => predicateIdx > pauseIdx && predicateIdx < end)
  );
}
