
import type { RuleResult } from "../../types/pipeline.js";
import type { Warning } from "../../types/warning.js";

export interface RawSourceToken {
  readonly surface: string;
}

export function rawSourceSurfaceText(
  tokens: readonly RawSourceToken[],
  start: number,
  consumed: number
): string {
  return tokens
    .slice(start, start + consumed)
    .map((token) => token.surface)
    .join("");
}

export function rawSourceWarningSpan(start: number, consumed: number): Warning["span"] | undefined {
  return consumed > 0 ? { start, end: start + consumed - 1 } : undefined;
}

export const UNOWNED_TAIL_FALLBACK_RAW_OP_KIND = "unowned_tail_fallback_raw";

export const KEIJOUJI_BARE_RETIRED_OP_KIND = "legacy_keijouji_bare_rule_removed";

const UNIT_RAW_CLOSURE_OP_KINDS: ReadonlySet<string> = new Set([
  UNOWNED_TAIL_FALLBACK_RAW_OP_KIND,
  KEIJOUJI_BARE_RETIRED_OP_KIND
]);

export function rawClosureWarningHoldsForRealization(
  warning: Warning,
  tokens: readonly RawSourceToken[],
  realizedText: string
): boolean {
  if (warning.type !== "unsupported_grammar" || !UNIT_RAW_CLOSURE_OP_KINDS.has(warning.opKind)) {
    return true;
  }
  const span = warning.span;
  if (span === undefined) {
    return true;
  }
  const raw = rawSourceSurfaceText(tokens, span.start, span.end - span.start + 1);
  return raw.length === 0 || realizedText.includes(raw);
}

export function hasUnitRawClosureWarning(warnings: readonly Warning[]): boolean {
  return warnings.some((warning) =>
    warning.type === "unsupported_grammar" && UNIT_RAW_CLOSURE_OP_KINDS.has(warning.opKind)
  );
}

export function unsupportedGrammarRawWarning(
  opKind: string,
  span: Warning["span"] | null | undefined,
  message: string
): Warning {
  return {
    type: "unsupported_grammar",
    severity: "error",
    opKind,
    ...(span === null || span === undefined ? {} : { span }),
    message
  };
}

export function rawSourceSpanRuleResult(
  tokens: readonly RawSourceToken[],
  start: number,
  consumed: number,
  warnings: readonly Warning[]
): RuleResult {
  return {
    consumed,
    korean: rawSourceSurfaceText(tokens, start, consumed),
    spaceAfter: true,
    renderPlan: null,
    warnings: [...warnings],
    rawSourceSurface: true
  };
}
