import { isUnitSymbolSurface } from "../../generator/korean-reading.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { ExtentPostpositionCommitment } from "../commitment/types.js";
import { readExtentPhraseAt } from "../semantics/extent-phrase.js";
import { isLexicalSymbolTokenAt } from "../fallback/index.js";
import { 수사 } from "../../types/pos.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import { tryNumeral, type NumeralResolutionContext } from "../semantics/numeric.js";
import { selectedSpanTranslation } from "../commitment/span-evidence.js";
import type { NumericBasePayload } from "../../types/numeric-base.js";
import type { NounPhraseCopulaStartKind } from "../head-tail/tail/predicate-root/integration/head-admission.js";
import type { TokenCursor } from "../token-cursor.js";
import type { AssemblerToken } from "../source-coordinate.js";
import type { AssemblyContentSpan } from "../assembly-content-span.js";

export function numeralAttachedSymbolHead(tokens: readonly AssemblerToken[], start: number): boolean {
  const head = tokens[start];
  return head !== undefined &&
    isLexicalSymbolTokenAt(tokens, start) &&
    isUnitSymbolSurface(head.surface);
}

export type PendingExtentPostposition = ExtentPostpositionCommitment;

export function finalizeExtentPostpositionSpan(
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number,
  span: AssemblyContentSpan,
  pending: Map<number, PendingExtentPostposition>,
  numeric: NumericTables
): void {
  applyPendingExtentPostposition(index, span, pending);
  registerExtentPostpositionSource(cursor, index, span, pending, numeric);
}

function applyPendingExtentPostposition(
  index: number,
  span: AssemblyContentSpan,
  pending: Map<number, PendingExtentPostposition>
): void {
  const postposition = pending.get(index);
  if (postposition === undefined) {
    return;
  }
  pending.delete(index);
  span.extentPostposition = postposition;
}

function registerExtentPostpositionSource(
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number,
  span: AssemblyContentSpan,
  pending: Map<number, PendingExtentPostposition>,
  numeric: NumericTables
): void {
  const translation = selectedSpanTranslation(span);
  if (translation?.placement?.type !== "after_next_extent_phrase") {
    return;
  }
  const reading = cursor.lookahead(index + span.consumed - cursor.pos, c => readExtentPhraseAt(c, numeric));
  if (reading === null) {
    return;
  }
  const modifier = translation.korean.trim();
  if (modifier.length === 0) {
    return;
  }
  pending.set(reading.start, {
    modifier,
    targetOverride: reading.immediateKorean
  });
  span.korean = "";
  span.renderPlan = null;
  span.extentPostpositionRelocated = true;
}

export function tryContentNumeral(
  cursor: TokenCursor<RuntimeHaruToken>,
  numeric: NumericTables,
  context: NumeralResolutionContext
): ContentNumeralResult | undefined {
  const before = cursor.pos;
  const numeral = tryNumeral(cursor, numeric, context);
  if (numeral === undefined) {
    return undefined;
  }
  const consumed = cursor.pos - before;
  const output = numeral;
  if (typeof output === "string") {
    return { consumed, korean: "", renderPlan: { kind: "fixedText", text: output, koreanPos: 수사 } };
  }
  return { consumed, korean: "", renderPlan: output };
}

interface ContentNumeralResult {
  readonly consumed: number;
  readonly korean: string;
  readonly renderPlan: NumericBasePayload;
}

export interface NumericHostYield {
  readonly reason: "copula_host" | "bare_quote";
  readonly result: ContentNumeralResult;
  readonly startKind: NounPhraseCopulaStartKind;
}
