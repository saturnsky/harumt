import type { AnnotatedText, AnnotationEntry, AnnotatedSegment, RubyEmphAnnotation } from "../types/annotation.js";
import { nextAnnotationKey } from "./table-update.js";

const EMPH_BULLETS = new Set(["·", "•", "●", "﹅", "・"]);

function isEmphBullet(text: string): boolean {
  return text.length === 1 && EMPH_BULLETS.has(text);
}

function isAllBullets(text: string): boolean {
  if (text.length === 0) return false;
  for (const ch of text) {
    if (!EMPH_BULLETS.has(ch)) return false;
  }
  return true;
}

function isSingleGrapheme(text: string): boolean {
  return [...text].length === 1;
}

function findAnnotationKey(
  keys: readonly number[] | undefined,
  table: ReadonlyMap<number, AnnotationEntry>,
  kind: string
): number | undefined {
  if (!keys) return undefined;
  return keys.find(k => table.get(k)?.kind === kind);
}

interface EmphRun {
  readonly baseText: string;
  readonly bullets: string;
  readonly pairs: { baseKey: number; rubyKey: number }[];
  readonly outerKeys: readonly number[];
  readonly pairCount: number;
  readonly nextIndex: number;
}

function collectConsecutiveEmphPairs(
  segments: readonly AnnotatedSegment[],
  table: ReadonlyMap<number, AnnotationEntry>,
  startIndex: number
): EmphRun {
  const baseChars: string[] = [];
  const bullets: string[] = [];
  const pairs: { baseKey: number; rubyKey: number }[] = [];
  let outerKeys: readonly number[] | null = null;
  let si = startIndex;

  while (si + 1 < segments.length) {
    const bSeg = segments[si]!;
    const bKey = findAnnotationKey(bSeg.keys, table, "ruby-base");
    if (bKey === undefined || !isSingleGrapheme(bSeg.text)) break;

    const rSeg = segments[si + 1]!;
    const rKey = findAnnotationKey(rSeg.keys, table, "ruby");
    if (rKey === undefined || !isEmphBullet(rSeg.text)) break;

    baseChars.push(bSeg.text);
    bullets.push(rSeg.text);
    pairs.push({ baseKey: bKey, rubyKey: rKey });

    if (outerKeys === null) {
      outerKeys = (bSeg.keys ?? []).filter(k => k !== bKey);
    }

    si += 2;
  }

  return {
    baseText: baseChars.join(""),
    bullets: bullets.join(""),
    pairs,
    outerKeys: outerKeys ?? [],
    pairCount: baseChars.length,
    nextIndex: si,
  };
}

function ensureMutable<A extends AnnotationEntry>(
  state: { table: Map<number, A | RubyEmphAnnotation> | undefined; segments: AnnotatedSegment[] | undefined; keyCounter: number },
  input: AnnotatedText<A>,
  segmentsBefore: number
): void {
  if (state.segments) return;
  state.table = new Map<number, A | RubyEmphAnnotation>(input.table);
  state.segments = input.segments.slice(0, segmentsBefore);
  state.keyCounter = nextAnnotationKey(input.table);
}

export function forward<A extends AnnotationEntry>(
  input: AnnotatedText<A>
): AnnotatedText<A | RubyEmphAnnotation> {
  const state: {
    table: Map<number, A | RubyEmphAnnotation> | undefined;
    segments: AnnotatedSegment[] | undefined;
    keyCounter: number;
  } = { table: undefined, segments: undefined, keyCounter: -1 };

  let si = 0;
  while (si < input.segments.length) {
    const seg = input.segments[si]!;
    const baseKey = findAnnotationKey(seg.keys, input.table, "ruby-base");

    if (baseKey !== undefined && si + 1 < input.segments.length) {
      const nextSeg = input.segments[si + 1]!;
      const rubyKey = findAnnotationKey(nextSeg.keys, input.table, "ruby");

      if (rubyKey !== undefined) {
        if (isSingleGrapheme(seg.text) && isEmphBullet(nextSeg.text)) {
          const run = collectConsecutiveEmphPairs(input.segments, input.table, si);
          if (run.pairCount >= 2) {
            ensureMutable(state, input, si);
            const emphKey = state.keyCounter++;
            state.table!.set(emphKey, { kind: "ruby-emph", bullets: run.bullets, pairs: run.pairs });
            state.segments!.push({ text: run.baseText, keys: [...run.outerKeys, emphKey] });
            si = run.nextIndex;
            continue;
          }
        }

        if ([...seg.text].length > 1 && isAllBullets(nextSeg.text)) {
          ensureMutable(state, input, si);
          const emphKey = state.keyCounter++;
          state.table!.set(emphKey, {
            kind: "ruby-emph",
            bullets: nextSeg.text,
            pairs: [{ baseKey, rubyKey }],
          });
          const outerKeys = (seg.keys ?? []).filter(k => k !== baseKey);
          state.segments!.push({ text: seg.text, keys: [...outerKeys, emphKey] });
          si += 2;
          continue;
        }
      }
    }

    state.segments?.push(seg);
    si++;
  }

  if (!state.segments) return input;
  return {
    segments: state.segments,
    table: state.table!,
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
  };
}

export function adjustBullets(bullets: string, targetLength: number): string {
  if (targetLength <= 0) return "";
  const chars = [...bullets];
  if (chars.length === 0) return "";
  if (targetLength <= chars.length) {
    return chars.slice(0, targetLength).join("");
  }
  const last = chars[chars.length - 1]!;
  while (chars.length < targetLength) {
    chars.push(last);
  }
  return chars.join("");
}

export function backward<A extends AnnotationEntry>(
  input: AnnotatedText<A>
): AnnotatedText<Exclude<A, RubyEmphAnnotation>> {
  const emphEntries = new Map<number, RubyEmphAnnotation>();
  for (const [k, v] of input.table) {
    if (v.kind === "ruby-emph") emphEntries.set(k, v);
  }

  if (emphEntries.size === 0) return input as AnnotatedText<Exclude<A, RubyEmphAnnotation>>;

  const newTable = new Map<number, Exclude<A, RubyEmphAnnotation>>();
  for (const [k, v] of input.table) {
    if (!emphEntries.has(k)) newTable.set(k, v as Exclude<A, RubyEmphAnnotation>);
  }

  let keyCounter = nextAnnotationKey(input.table);
  const newSegments: AnnotatedSegment[] = [];

  for (let index = 0; index < input.segments.length; index++) {
    const seg = input.segments[index]!;
    const emphKey = (seg.keys ?? []).find(k => emphEntries.has(k));
    if (emphKey === undefined) {
      newSegments.push(seg);
      continue;
    }

    const emph = emphEntries.get(emphKey)!;
    const outerKeys = (seg.keys ?? []).filter(k => k !== emphKey);

    const run: AnnotatedSegment[] = [seg];
    while (index + 1 < input.segments.length && (input.segments[index + 1]!.keys ?? []).includes(emphKey)) {
      run.push(input.segments[index + 1]!);
      index++;
    }

    const combinedText = run.map(s => s.text).join("");
    const graphemes = [...combinedText];
    const nonSpaceCount = graphemes.filter(g => !/^\s$/u.test(g)).length;
    const adjusted = adjustBullets(emph.bullets, nonSpaceCount);
    const bulletChars = [...adjusted];

    let pairIndex = 0;
    for (const grapheme of graphemes) {
      if (/^\s$/u.test(grapheme)) {
        const keys = outerKeys.length > 0 ? outerKeys : undefined;
        newSegments.push(keys ? { text: grapheme, keys } : { text: grapheme });
        continue;
      }

      let baseKey: number;
      let rubyKey: number;
      if (pairIndex < emph.pairs.length) {
        baseKey = emph.pairs[pairIndex]!.baseKey;
        rubyKey = emph.pairs[pairIndex]!.rubyKey;
      } else {
        baseKey = keyCounter++;
        rubyKey = keyCounter++;
        newTable.set(baseKey, { kind: "ruby-base" } as Exclude<A, RubyEmphAnnotation>);
        newTable.set(rubyKey, { kind: "ruby" } as Exclude<A, RubyEmphAnnotation>);
      }

      const baseKeys = outerKeys.length > 0 ? [...outerKeys, baseKey] : [baseKey];
      const rubyKeys = outerKeys.length > 0 ? [...outerKeys, rubyKey] : [rubyKey];
      newSegments.push({ text: grapheme, keys: baseKeys });
      newSegments.push({ text: bulletChars[pairIndex]!, keys: rubyKeys });
      pairIndex++;
    }
  }

  return {
    segments: newSegments,
    table: newTable,
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
  };
}
