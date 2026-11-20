
import type { LookupTables } from "../lookup-tables.js";

const variationSelectorPattern = /[\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu;

export function stripVariationSelectors(text: string): string {
  return text.replace(variationSelectorPattern, "");
}

export function stripColloquialNoniTails(text: string, lookups: LookupTables): string {
  if (!text.includes("のに")) {
    return text;
  }
  const chars = Array.from(text);
  let output = "";
  let index = 0;
  while (index < chars.length) {
    if ((chars[index] ?? "") !== "の" || (chars[index + 1] ?? "") !== "に") {
      output += chars[index] ?? "";
      index += 1;
      continue;
    }
    output += "のに";
    let tail = index + 2;
    const char = chars[tail];
    if (char === "ぃ" || char === "ィ") {
      while (tail < chars.length && (chars[tail] === "ぃ" || chars[tail] === "ィ")) {
        tail += 1;
      }
      index = tail >= chars.length || lookups.COLLOQUIAL_NONI_TERMINAL_FOLLOWERS.has(chars[tail] ?? "") ? tail : index + 2;
      continue;
    }
    if (char === "っ") {
      while (tail < chars.length && chars[tail] === "っ") {
        tail += 1;
      }
      const next = chars[tail] ?? "";
      index = next.length === 0 || lookups.COLLOQUIAL_NONI_TERMINAL_FOLLOWERS.has(next) || ("\u4e00" <= next && next <= "\u9fff") ? tail : index + 2;
      continue;
    }
    index += 2;
  }
  return output;
}
