
import type { NumericTables } from "../../generator/numeric-lookup.js";
import { POS0, POS5A, 動詞, 形容詞0, 未然形_ } from "../../types/pos.js";
import { isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { type Warning, warningDedupKey } from "../../types/warning.js";
import { moraStutterRepeatIndex } from "../disfluency/stutter-prefix.js";
import { hasUnitRawClosureWarning, rawClosureWarningHoldsForRealization } from "../fallback/unsupported-raw.js";
import { isHardTerminalPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { collectNominalTailChainCommittedWarnings } from "../head-tail/head/adapters/nominal/commit.js";
import type { PredicateHeadTailChainRenderPlan } from "../head-tail/lifecycle/head-tail-render-plan.js";
import type { LookupTables } from "../lookup-tables.js";
import { realizeRenderPlan } from "../rendering/render-plan.js";
import { type TranslationUnit, UnitType } from "./unit.js";
import type { AssemblyContentSpan } from "../assembly-content-span.js";

export function mergeTranslationWarnings(warnings: readonly Warning[]): readonly Warning[] {
  const seen = new Set<string>();
  const merged: Warning[] = [];
  for (const warning of warnings) {
    const key = warningDedupKey(warning);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(warning);
  }
  return merged;
}

function headTailChainWarnings(units: readonly TranslationUnit[], lookups: LookupTables, numeric: NumericTables): readonly Warning[] {
  const warnings: Warning[] = [];
  for (const unit of units) {
    const plan = unit.renderPlan;
    if (isPredicateHeadTailChainRenderPlan(plan)) {
      warnings.push(...plan.realization.warnings);
      warnings.push(...partialTailWarningsFromPredicatePlan(plan));
    } else if (isNominalHeadTailChainRenderPlan(plan)) {
      warnings.push(...collectNominalTailChainCommittedWarnings(plan, lookups, numeric));
    }
  }
  return warnings;
}

function partialTailWarningsFromPredicatePlan(plan: PredicateHeadTailChainRenderPlan): readonly Warning[] {
  const partial = plan.realization.partial;
  if (partial?.decision === "weak_attachment_warning") {
    if (partial.attachmentSpan === undefined) {
      return [];
    }
    if (plan.realization.warnings.some((warning) =>
      warning.type === "tail_boundary_attachment_weak" &&
      warning.span !== undefined &&
      warning.span.start === partial.attachmentSpan?.start &&
      warning.span.end === partial.attachmentSpan?.end
    )) {
      return [];
    }
    return [{
      type: "tail_boundary_attachment_weak",
      severity: "warning",
      opKind: "tail_boundary_attachment",
      span: { start: partial.attachmentSpan.start, end: partial.attachmentSpan.end },
      message: `source-bearing tail boundary preserved without following attachment evidence: ${partial.attachmentSpan.surface}`
    }];
  }
  if (partial?.decision !== "unresolved_suffix_warning") {
    return [];
  }
  const suffixStart = partial.unresolvedSuffixSpan.start;
  const suffixEnd = partial.unresolvedSuffixSpan.end - 1;
  if (plan.realization.warnings.some((warning) =>
    warning.type === "partial_tail_suffix_unresolved" &&
    warning.span !== undefined &&
    warning.span.start === suffixStart &&
    warning.span.end === suffixEnd
  )) {
    return [];
  }
  const suffixSurface = plan.realization.sourceTokens
    ?.slice(suffixStart, partial.unresolvedSuffixSpan.end)
    .map((token) => token.surface)
    .join("") ?? `${suffixStart}-${suffixEnd}`;
  return [{
    type: "partial_tail_suffix_unresolved",
    severity: "warning",
    opKind: "tail_suffix_attachment",
    span: { start: suffixStart, end: suffixEnd },
    message: `source-bearing tail prefix preserved, but suffix attachment is unresolved: ${suffixSurface}`
  }];
}

export function translationWarningsFromUnits(
  units: readonly TranslationUnit[],
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  numeric: NumericTables
): readonly Warning[] {
  const emittedUnits = units.filter((unit) => !unit.suppressed);
  const chunkWarnings = headTailChainWarnings(emittedUnits, lookups, numeric);
  const terminalMizenFragmentWarnings = terminalMizenLemmaFragmentWarnings(emittedUnits);
  const renderFallbackWarnings = unitRenderFallbackWarnings(emittedUnits);
  const sourceDisfluencyWarnings = sourceDisfluencyUnrestoredWarnings(emittedUnits, lookups, numeric);
  const unitWarnings = emittedUnits.flatMap((unit) => realizedUnitWarnings(unit, tokens, lookups, numeric));
  const provenanceWarnings = tailParserBlockedProvenanceWarnings(emittedUnits);
  return [...chunkWarnings, ...terminalMizenFragmentWarnings, ...renderFallbackWarnings, ...sourceDisfluencyWarnings, ...unitWarnings, ...provenanceWarnings];
}

function realizedUnitWarnings(
  unit: TranslationUnit,
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  numeric: NumericTables
): readonly Warning[] {
  if (!hasUnitRawClosureWarning(unit.warnings)) {
    return unit.warnings;
  }
  const realized = unitPreviewText(unit, lookups, numeric);
  return unit.warnings.filter((warning) => rawClosureWarningHoldsForRealization(warning, tokens, realized));
}

function sourceDisfluencyUnrestoredWarnings(units: readonly TranslationUnit[], lookups: LookupTables, numeric: NumericTables): readonly Warning[] {
  const warnings: Warning[] = [];
  for (const unit of units) {
    if (unit.jpHead.stutterPrefix === undefined) {
      continue;
    }
    const preview = unitPreviewText(unit, lookups, numeric);
    if (moraStutterRepeatIndex(preview) !== null) {
      continue;
    }
    const span = spanForUnit(unit);
    warnings.push({
      type: "source_disfluency_unrestored",
      severity: "warning",
      opKind: "mora_stutter_prefix",
      ...(span === undefined ? {} : { span }),
      message: "source-side one-mora stutter prefix was detected, but target output had no Korean syllable to repeat."
    });
  }
  return warnings;
}

function unitPreviewText(unit: TranslationUnit, lookups: LookupTables, numeric: NumericTables): string {
  if (unit.renderPlan === null) {
    return unit.korean;
  }
  try {
    return realizeRenderPlan(unit.renderPlan, { formal: false, lookups, numeric });
  } catch {
    return unit.korean;
  }
}

function terminalMizenLemmaFragmentWarnings(units: readonly TranslationUnit[]): readonly Warning[] {
  const warnings: Warning[] = [];
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    if (unit === undefined || !isBareMizenLemmaUnit(unit)) {
      continue;
    }
    const next = nextNonSuppressedUnit(units, index + 1);
    if (!isHardTerminalPunctuationUnit(next)) {
      continue;
    }
    const span = spanForUnit(unit);
    warnings.push({
      type: "out_of_subset_default",
      severity: "warning",
      opKind: "terminal_mizen_fragment",
      ...(span === undefined ? {} : { span }),
      message: "Terminal 未然形 fragment rendered as a direct lemma instead of being recovered as a conditional."
    });
  }
  return warnings;
}

function isBareMizenLemmaUnit(unit: TranslationUnit): boolean {
  if (unit.unitType !== UnitType.CONTENT || unit.jpIndices.length !== 1) {
    return false;
  }
  const plan = unit.renderPlan;
  if (plan?.kind !== "lemma" || plan.auxTokens.length > 0) {
    return false;
  }
  const pos0 = unit.jpHead.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0) {
    return false;
  }
  return (unit.jpHead.pos & POS5A) === 未然形_;
}

function nextNonSuppressedUnit(units: readonly TranslationUnit[], start: number): TranslationUnit | undefined {
  for (let index = start; index < units.length; index += 1) {
    const unit = units[index];
    if (unit !== undefined && !unit.suppressed) {
      return unit;
    }
  }
  return undefined;
}

function isHardTerminalPunctuationUnit(unit: TranslationUnit | undefined): boolean {
  if (unit === undefined || unit.unitType !== UnitType.SYMBOL) {
    return false;
  }
  return isHardTerminalPunctuationToken(unit.jpHead);
}

function unitRenderFallbackWarnings(units: readonly TranslationUnit[]): readonly Warning[] {
  const warnings: Warning[] = [];
  for (const unit of units) {
    if (
      unit.renderFallbackReason === null ||
      unit.warnings.some((warning) => warning.type === "render_fallback")
    ) {
      continue;
    }
    const span = spanForUnit(unit);
    warnings.push({
      type: "render_fallback",
      severity: "error",
      opKind: "head_tail_render",
      ...(span === undefined ? {} : { span }),
      message: `shared head-tail render failed; cached surface used. reason: ${unit.renderFallbackReason}`
    });
  }
  return warnings;
}

function tailParserBlockedProvenanceWarnings(units: readonly TranslationUnit[]): readonly Warning[] {
  const warnings: Warning[] = [];
  for (const unit of units) {
    if (unit.provenance !== "tail_parser_blocked") {
      continue;
    }
    const surface = unit.jpIndices.length === 0
      ? unit.jpHead.surface
      : `${unit.jpHead.surface}@${unit.jpIndices.join(",")}`;
    const reason = unit.provenanceReason ?? `tail-parser intake blocked for ${surface}`;
    warnings.push(tailParserBlockedWarning(reason, spanForUnit(unit)));
  }
  return warnings;
}

function spanForUnit(unit: TranslationUnit): Warning["span"] | undefined {
  if (unit.jpIndices.length === 0) {
    return undefined;
  }
  return {
    start: Math.min(...unit.jpIndices),
    end: Math.max(...unit.jpIndices)
  };
}

function tailParserBlockedWarning(reason: string, span?: Warning["span"]): Warning {
  return {
    type: "tail_parser_blocked",
    severity: "error",
    opKind: "tail_parser_intake",
    ...(span === undefined ? {} : { span }),
    message: `tail-parser owner span blocked before commit/render; unsupported intake exposed. reason: ${reason}`
  };
}

const HARVESTED_FAIL_CLOSED_OP_KINDS: ReadonlySet<string> = new Set([
  "candidate_set_no_fallback_member"
]);

export function harvestFailClosedSpanWarnings(
  contentMap: ReadonlyMap<number, AssemblyContentSpan>
): Warning[] {
  const harvested: Warning[] = [];
  const seenSpans = new Set<AssemblyContentSpan>();
  for (const span of contentMap.values()) {
    if (seenSpans.has(span)) {
      continue;
    }
    seenSpans.add(span);
    if (span.korean.length > 0 || span.renderPlan !== null) {
      continue;
    }
    for (const warning of span.warnings ?? []) {
      if (HARVESTED_FAIL_CLOSED_OP_KINDS.has(warning.opKind ?? "")) {
        harvested.push(warning);
      }
    }
  }
  return harvested;
}
