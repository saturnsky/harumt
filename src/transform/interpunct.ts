import type { AnnotatedText, AnnotationEntry, AnnotatedSegment, InterpunctAnnotation } from "../types/annotation.js";
import { nextAnnotationKey } from "./table-update.js";

const INTERPUNCT_SPLIT_RE = /[・·･]/g;

const SUTEGANA = new Set(
  "ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ"
);

function isMoraUnit(s: string): boolean {
  if (s.length === 0) return false;
  if (s.length === 1) return true;
  for (let i = 1; i < s.length; i++) {
    if (!SUTEGANA.has(s.charAt(i))) return false;
  }
  return true;
}

const UNIT_CHAR = `[^・·･ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ]`;
const SUTE_CHAR = `[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ]`;
const UNIT = `(?:${UNIT_CHAR}${SUTE_CHAR}*|${SUTE_CHAR})`;
const IP = `[・·･]`;
const INTERPUNCT_PATTERN = new RegExp(`${UNIT}(?:${IP}${UNIT}){2,}`, "g");

function isWordChar(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return (cp >= 0x3040 && cp <= 0x309F) ||
         (cp >= 0x30A0 && cp <= 0x30FF) ||
         (cp >= 0x4E00 && cp <= 0x9FFF) ||
         (cp >= 0x3400 && cp <= 0x4DBF) ||
         (cp >= 0xFF65 && cp <= 0xFF9F);
}

export function forward<A extends AnnotationEntry>(
  input: AnnotatedText<A>
): AnnotatedText<A | InterpunctAnnotation> {
  let newTable: Map<number, A | InterpunctAnnotation> | undefined;
  let newSegments: AnnotatedSegment[] | undefined;
  let keyCounter = -1;

  for (let si = 0; si < input.segments.length; si++) {
    const seg = input.segments[si]!;
    const matches: Array<{ start: number; end: number; joined: string }> = [];
    INTERPUNCT_PATTERN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = INTERPUNCT_PATTERN.exec(seg.text)) !== null) {
      const full = m[0];
      const parts = full.split(INTERPUNCT_SPLIT_RE);
      if (parts.every(isMoraUnit)) {
        const before = m.index > 0 ? seg.text.charAt(m.index - 1) : "";
        const after = m.index + full.length < seg.text.length ? seg.text.charAt(m.index + full.length) : "";
        if ((before && isWordChar(before)) || (after && isWordChar(after))) continue;
        matches.push({
          start: m.index,
          end: m.index + full.length,
          joined: parts.join(""),
        });
      }
    }

    if (matches.length === 0) {
      newSegments?.push(seg);
      continue;
    }

    if (!newSegments) {
      newTable = new Map<number, A | InterpunctAnnotation>(input.table);
      newSegments = input.segments.slice(0, si);
      keyCounter = nextAnnotationKey(input.table);
    }

    let cursor = 0;
    for (const { start, end, joined } of matches) {
      if (start > cursor) {
        newSegments.push({
          text: seg.text.slice(cursor, start),
          ...(seg.keys?.length ? { keys: seg.keys } : {}),
        });
      }
      const key = keyCounter++;
      const annotation: InterpunctAnnotation = { kind: "interpunct" };
      newTable!.set(key, annotation);
      const keys = seg.keys?.length ? [...seg.keys, key] : [key];
      newSegments.push({ text: joined, keys });
      cursor = end;
    }
    if (cursor < seg.text.length) {
      newSegments.push({
        text: seg.text.slice(cursor),
        ...(seg.keys?.length ? { keys: seg.keys } : {}),
      });
    }
  }

  if (!newSegments) return input;
  return {
    segments: newSegments,
    table: newTable!,
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
  };
}

function splitToGraphemes(text: string): string[] {
  return [...text];
}

function hasInterpunctKey(seg: AnnotatedSegment, interpunctKeys: ReadonlySet<number>): boolean {
  return seg.keys?.some((k) => interpunctKeys.has(k)) === true;
}

function remainingAnnotationKeys(
  segments: readonly AnnotatedSegment[],
  interpunctKeys: ReadonlySet<number>
): number[] {
  const keys: number[] = [];
  const seen = new Set<number>();
  for (const seg of segments) {
    for (const key of seg.keys ?? []) {
      if (interpunctKeys.has(key) || seen.has(key)) continue;
      keys.push(key);
      seen.add(key);
    }
  }
  return keys;
}

function renderInterpunctRun(segments: readonly AnnotatedSegment[]): string {
  const raw = segments.map((seg) => seg.text).join("");
  const compact = raw.replace(/\s+/gu, "");
  return splitToGraphemes(compact).join("·");
}

export function backward<A extends AnnotationEntry>(
  input: AnnotatedText<A>
): AnnotatedText<Exclude<A, InterpunctAnnotation>> {
  const interpunctKeys = new Set<number>();
  for (const [k, v] of input.table) {
    if (v.kind === "interpunct") interpunctKeys.add(k);
  }

  if (interpunctKeys.size === 0) return input as AnnotatedText<Exclude<A, InterpunctAnnotation>>;

  const newTable = new Map<number, Exclude<A, InterpunctAnnotation>>();
  for (const [k, v] of input.table) {
    if (!interpunctKeys.has(k)) newTable.set(k, v as Exclude<A, InterpunctAnnotation>);
  }

  const newSegments: AnnotatedSegment[] = [];
  for (let index = 0; index < input.segments.length; index += 1) {
    const seg = input.segments[index]!;
    if (!hasInterpunctKey(seg, interpunctKeys)) {
      newSegments.push(seg);
      continue;
    }

    const run: AnnotatedSegment[] = [seg];
    while (index + 1 < input.segments.length && hasInterpunctKey(input.segments[index + 1]!, interpunctKeys)) {
      run.push(input.segments[index + 1]!);
      index += 1;
    }

    const remainingKeys = remainingAnnotationKeys(run, interpunctKeys);
    const text = renderInterpunctRun(run);
    newSegments.push({
      text,
      ...(remainingKeys.length ? { keys: remainingKeys } : {}),
    });
  }

  return {
    segments: newSegments,
    table: newTable,
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
  };
}
