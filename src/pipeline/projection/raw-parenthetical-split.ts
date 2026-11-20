
import type { TokenTextSpan } from "../source-coordinate.js";

export interface RawParentheticalIsland {
  readonly openingSurface: string;
  readonly closingSurface: string;
  readonly openingTextSpan: TokenTextSpan;
  readonly closingTextSpan: TokenTextSpan;
  readonly innerText: string;
  readonly outerOffset: number;
}

interface RawParentheticalSplit {
  readonly outerText: string;
  readonly islands: readonly RawParentheticalIsland[];
}

const RAW_PARENTHETICAL_CLOSING_BY_OPENING: ReadonlyMap<string, string> = new Map([
  ["（", "）"],
  ["(", ")"],
  ["[", "]"],
  ["［", "］"]
]);

const RAW_PARENTHETICAL_OPENING_BY_CLOSING: ReadonlyMap<string, string> = new Map(
  [...RAW_PARENTHETICAL_CLOSING_BY_OPENING.entries()].map(([opening, closing]) => [closing, opening])
);

interface RawParentheticalStackFrame {
  readonly openingSurface: string;
  readonly start: number;
}

interface RawParentheticalSpan {
  readonly openingSurface: string;
  readonly closingSurface: string;
  readonly start: number;
  readonly innerStart: number;
  readonly innerEnd: number;
  readonly endExclusive: number;
}

export function splitRawParentheticalIslands(sourceText: string): RawParentheticalSplit | null {
  const chars = Array.from(sourceText);
  const spans = collectTopLevelRawParentheticalSpans(chars);
  if (spans.length === 0) {
    return null;
  }
  const islands: RawParentheticalIsland[] = [];
  const outerChars: string[] = [];
  let cursor = 0;
  for (const span of spans) {
    outerChars.push(...chars.slice(cursor, span.start));
    islands.push({
      openingSurface: span.openingSurface,
      closingSurface: span.closingSurface,
      openingTextSpan: { start: span.start, end: span.innerStart },
      closingTextSpan: { start: span.innerEnd, end: span.endExclusive },
      innerText: chars.slice(span.innerStart, span.innerEnd).join(""),
      outerOffset: outerChars.length
    });
    cursor = span.endExclusive;
  }
  outerChars.push(...chars.slice(cursor));
  return { outerText: outerChars.join(""), islands };
}

function collectTopLevelRawParentheticalSpans(chars: readonly string[]): readonly RawParentheticalSpan[] {
  const stack: RawParentheticalStackFrame[] = [];
  const spans: RawParentheticalSpan[] = [];
  for (let index = 0; index < chars.length; index += 1) {
    const ch = chars[index] ?? "";
    if (RAW_PARENTHETICAL_CLOSING_BY_OPENING.has(ch)) {
      stack.push({ openingSurface: ch, start: index });
      continue;
    }
    const expectedOpening = RAW_PARENTHETICAL_OPENING_BY_CLOSING.get(ch);
    if (expectedOpening === undefined || stack.length === 0) {
      continue;
    }
    const top = stack[stack.length - 1]!;
    if (top.openingSurface !== expectedOpening) {
      stack.length = 0;
      continue;
    }
    stack.pop();
    if (stack.length === 0) {
      const span: RawParentheticalSpan = {
        openingSurface: top.openingSurface,
        closingSurface: ch,
        start: top.start,
        innerStart: top.start + 1,
        innerEnd: index,
        endExclusive: index + 1
      };
      if (isRawParentheticalIslandExtractable(chars, span)) {
        spans.push(span);
      }
    }
  }
  return spans;
}

function isRawParentheticalIslandExtractable(
  chars: readonly string[],
  span: RawParentheticalSpan
): boolean {
  if (span.openingSurface === "(" || span.openingSurface === "（") {
    return true;
  }
  if (span.openingSurface !== "[" && span.openingSurface !== "［") {
    return false;
  }
  return !containsJapaneseScript(chars.slice(span.innerStart, span.innerEnd).join(""));
}

function containsJapaneseScript(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/u.test(text);
}
