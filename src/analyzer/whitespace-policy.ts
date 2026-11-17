
import type { WhitespaceBarrierContract } from "./input-text.js";

export type { WhitespaceBarrierContract };

export type WhitespaceKind =
  | "ascii"
  | "ideographic"
  | "tab"
  | "line"
  | "unicode_space"
  | "mixed";

export interface WhitespaceRun {
  readonly ordinal: number;
  readonly start: number;
  readonly end: number;
  readonly width: number;
  readonly kind: WhitespaceKind;
}

export type WhitespaceRunMode = "split" | "barrier" | "skip";

export type WhitespaceRunBond = "guarded" | "exempt";

export type WhitespaceCharMapping = ReadonlyMap<string, WhitespaceKind>;

export interface WhitespaceRunPolicy {
  readonly runs: readonly WhitespaceRun[];
  readonly default: WhitespaceRunMode;
  readonly overrides?: ReadonlyMap<number, WhitespaceRunMode>;
  readonly bonds?: ReadonlyMap<number, WhitespaceRunBond>;
  readonly barrier?: WhitespaceBarrierContract;
}

export type WhitespacePolicy = "legacy-split" | "raw" | WhitespaceRunPolicy;

const LEGACY_SPLIT_MAPPING: WhitespaceCharMapping = new Map([[" ", "ascii" as const]]);

const POLICY_KEY_SEPARATOR = "\u0000";

const MODE_KEY_CHAR: Readonly<Record<WhitespaceRunMode, string>> = {
  split: "s",
  barrier: "b",
  skip: "k"
};

const BOND_KEY_CHAR: Readonly<Record<WhitespaceRunBond, string>> = {
  guarded: "g",
  exempt: "x"
};

const PUNCTUATION_OR_SYMBOL = /[\p{P}\p{S}]/u;

export function parseWhitespaceRunMapping(
  entries: Iterable<readonly [kind: WhitespaceKind, codepoints: string]>
): WhitespaceCharMapping {
  const mapping = new Map<string, WhitespaceKind>();
  for (const [kind, codepoints] of entries) {
    for (const item of codepoints.split(",")) {
      const trimmed = item.trim();
      if (trimmed.length === 0) {
        continue;
      }
      const code = Number.parseInt(trimmed, 16);
      if (!Number.isInteger(code)) {
        throw new Error(`invalid whitespace run codepoint: ${JSON.stringify(item)}`);
      }
      mapping.set(String.fromCodePoint(code), kind);
    }
  }
  return mapping;
}

export function detectWhitespaceRuns(
  text: string,
  mapping: WhitespaceCharMapping
): WhitespaceRun[] {
  const chars = [...text];
  const runs: WhitespaceRun[] = [];
  let index = 0;
  while (index < chars.length) {
    const kind = mapping.get(chars[index] ?? "");
    if (kind === undefined) {
      index += 1;
      continue;
    }
    const start = index;
    let common: WhitespaceKind | null = kind;
    let hasLine = false;
    while (index < chars.length) {
      const current = mapping.get(chars[index] ?? "");
      if (current === undefined) {
        break;
      }
      if (current === "line") {
        hasLine = true;
      }
      if (common !== null && current !== common) {
        common = null;
      }
      index += 1;
    }
    runs.push({
      ordinal: runs.length,
      start,
      end: index,
      width: index - start,
      kind: hasLine ? "line" : (common ?? "mixed")
    });
  }
  return runs;
}

export interface LetterSpacingRunChain {
  readonly ordinals: readonly number[];
  readonly letters: string;
}

export function letterSpacingRunChains(
  text: string,
  runs: readonly WhitespaceRun[],
  minRuns: number,
  isSegmentChar: (char: string) => boolean
): readonly LetterSpacingRunChain[] {
  if (runs.length === 0 || minRuns <= 0) {
    return [];
  }
  const chars = [...text];
  const pieceLetter = (start: number, end: number): string | null => {
    let letter: string | null = null;
    for (let index = start; index < end; index += 1) {
      const char = chars[index] ?? "";
      if (PUNCTUATION_OR_SYMBOL.test(char)) {
        continue;
      }
      if (letter !== null || !isSegmentChar(char)) {
        return null;
      }
      letter = char;
    }
    return letter;
  };

  const pieceStart = (index: number): number => index === 0 ? 0 : (runs[index - 1]?.end ?? 0);
  const pieceEnd = (index: number): number =>
    index + 1 === runs.length ? chars.length : (runs[index + 1]?.start ?? chars.length);

  const leftLetter = runs.map((run, index) => pieceLetter(pieceStart(index), run.start));
  const rightLetter = runs.map((run, index) => pieceLetter(run.end, pieceEnd(index)));
  const eligible = runs.map((run, index) =>
    run.kind !== "line" && leftLetter[index] !== null && rightLetter[index] !== null);

  const chains: LetterSpacingRunChain[] = [];
  let chainStart = 0;
  while (chainStart < runs.length) {
    if (eligible[chainStart] !== true) {
      chainStart += 1;
      continue;
    }
    let chainEnd = chainStart;
    while (chainEnd + 1 < runs.length && eligible[chainEnd + 1] === true) {
      chainEnd += 1;
    }
    if (chainEnd - chainStart + 1 >= minRuns) {
      const ordinals: number[] = [];
      let letters = leftLetter[chainStart] ?? "";
      for (let index = chainStart; index <= chainEnd; index += 1) {
        const ordinal = runs[index]?.ordinal;
        if (ordinal !== undefined) {
          ordinals.push(ordinal);
        }
        letters += rightLetter[index] ?? "";
      }
      chains.push({ ordinals, letters });
    }
    chainStart = chainEnd + 1;
  }
  return chains;
}

export function whitespaceRunModeAt(policy: WhitespaceRunPolicy, ordinal: number): WhitespaceRunMode {
  return policy.overrides?.get(ordinal) ?? policy.default;
}

export function whitespaceRunBondAt(policy: WhitespaceRunPolicy, ordinal: number): WhitespaceRunBond {
  return policy.bonds?.get(ordinal) ?? "guarded";
}

function sortedKeyPart(values: Iterable<string>): string {
  return [...values].sort().join("|");
}

function barrierKeyPart(contract: WhitespaceBarrierContract | undefined): string {
  if (contract === undefined) {
    return "-";
  }
  return [
    sortedKeyPart(contract.boundLeftPos0),
    sortedKeyPart(contract.boundRightSuffixPos0),
    sortedKeyPart(contract.boundRightInflectionPos0),
    sortedKeyPart(contract.inflectionHostForms),
    sortedKeyPart(contract.bondExemptLeftCharClasses)
  ].join(";");
}

export function policyKey(policy: WhitespacePolicy): string {
  if (policy === "legacy-split") {
    return "";
  }
  if (policy === "raw") {
    return POLICY_KEY_SEPARATOR;
  }
  const runs = policy.runs
    .map((run) =>
      `${run.ordinal}:${run.start}:${run.end}:${run.kind}:${run.width}:` +
      `${MODE_KEY_CHAR[whitespaceRunModeAt(policy, run.ordinal)]}` +
      `${BOND_KEY_CHAR[whitespaceRunBondAt(policy, run.ordinal)]}`)
    .join(",");
  return `${POLICY_KEY_SEPARATOR}w${policy.default}:${runs}` +
    `:${barrierKeyPart(policy.barrier)}${POLICY_KEY_SEPARATOR}`;
}

export function legacySplitPolicy(text: string): WhitespaceRunPolicy {
  return { runs: detectWhitespaceRuns(text, LEGACY_SPLIT_MAPPING), default: "split" };
}

export function resolveWhitespaceRunPolicy(
  text: string,
  policy: WhitespacePolicy
): WhitespaceRunPolicy {
  if (policy === "legacy-split") {
    return legacySplitPolicy(text);
  }
  if (policy === "raw") {
    return { runs: [], default: "barrier" };
  }
  return policy;
}
