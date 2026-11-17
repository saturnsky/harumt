import { parentheticalSpanEndingAt, parentheticalSpanStartingAt } from "../../boundary/parenthetical.js";
import { POS0, NOMINAL_BITS, pos0in } from "../../../../types/pos.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { StemNode } from "./grammar.js";

export function hostEnclosingQuoteCloseToken(
  tokens: readonly RuntimeHaruToken[],
  headStart: number,
  idx: number
): RuntimeHaruToken | null {
  const span = parentheticalSpanEndingAt(tokens, idx);
  if (span === null || span.openingIdx + 1 !== headStart) {
    return null;
  }
  return tokens[idx] ?? null;
}

export function skipHostEnclosingQuoteClose(
  tokens: readonly RuntimeHaruToken[],
  headStart: number,
  idx: number
): number {
  return hostEnclosingQuoteCloseToken(tokens, headStart, idx) === null ? idx : idx + 1;
}

export function attributiveHeadTokenAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): RuntimeHaruToken | undefined {
  return attributiveHeadAnchorAt(tokens, idx)?.token;
}

export function attributiveHeadAnchorAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): { readonly token: RuntimeHaruToken; readonly tokenIdx: number } | undefined {
  const token = tokens[idx];
  if (token === undefined) {
    return undefined;
  }
  const pos0 = token.pos & POS0;
  if (pos0in(pos0, NOMINAL_BITS)) {
    return { token, tokenIdx: idx };
  }
  const span = parentheticalSpanStartingAt(tokens, idx);
  if (span !== null && span.closingIdx === idx + 2) {
    const inside = tokens[idx + 1];
    if (inside !== undefined && (pos0in(inside.pos, NOMINAL_BITS))) {
      return { token: inside, tokenIdx: idx + 1 };
    }
  }
  return { token, tokenIdx: idx };
}

export function applyNominalHostQuoteDecoration(stem: StemNode, closeSurface: string): StemNode {
  if (closeSurface === "") {
    return stem;
  }
  if (stem.kind === "candidateSet") {
    return {
      ...stem,
      candidates: stem.candidates.map((candidate) => ({
        ...candidate,
        lemma: candidate.lemma + closeSurface,
        ...(candidate.nominalized === undefined || candidate.nominalized === ""
          ? {}
          : { nominalized: candidate.nominalized + closeSurface })
      }))
    };
  }
  return { ...stem, lemma: stem.lemma + closeSurface };
}
