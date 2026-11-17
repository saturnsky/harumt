import type { BoundaryToken } from "./punctuation.js";
import {
  isBoundaryPunctuationCategoryToken,
  transparentTokenRelationForConsumer
} from "./punctuation.js";
import { parentheticalSpanStartingAt } from "./parenthetical.js";
import type {

  BoundaryRelation,
  BoundaryRelationConsumer,
  CopulaFocusContinuationRelation,
  TransparentTokenRelation
} from "./relation.js";

import { POS0, POS4, 助詞, 助動詞_ダ } from "../../../types/pos.js";
export type BoundaryTransparencyRequirement =
  | "token_only"
  | "complete_parenthetical_span"
  | "token_or_parenthetical_span";

export interface BoundaryTransparentAdvance {
  readonly relation: BoundaryRelation;
  readonly nextIndex: number;
}

export function transparentBoundaryAdvance(
  tokens: readonly BoundaryToken[],
  index: number,
  consumer: BoundaryRelationConsumer,
  options: {
    readonly requirement?: BoundaryTransparencyRequirement;
    readonly limit?: number;
  } = {}
): BoundaryTransparentAdvance | null {
  const requirement = options.requirement ?? "token_only";
  const limit = options.limit ?? tokens.length;
  if (index >= limit) {
    return null;
  }
  if (requirement !== "token_only") {
    const span = parentheticalSpanStartingAt(tokens, index, {
      consumers: [consumer],
      strength: "transparent"
    });
    if (span !== null && span.span.endExclusive <= limit) {
      return {
        relation: span,
        nextIndex: span.span.endExclusive
      };
    }
    if (requirement === "complete_parenthetical_span") {
      return null;
    }
  }
  const token = transparentTokenRelationForConsumer(tokens[index], index, consumer);
  if (token === null) {
    return null;
  }
  return {
    relation: token,
    nextIndex: index + 1
  };
}

export function isTransparentBoundaryTokenForConsumer(
  token: BoundaryToken | undefined,
  index: number,
  consumer: BoundaryRelationConsumer
): boolean {
  return transparentTokenRelationForConsumer(token, index, consumer) !== null;
}

export function argumentFrameTransparentBoundaryAdvance(
  tokens: readonly BoundaryToken[],
  index: number,
  consumer: BoundaryRelationConsumer,
  options: {
    readonly lowerBoundInclusive?: number;
    readonly upperBoundExclusive?: number;
  } = {}
): BoundaryTransparentAdvance | null {
  const upperBound = options.upperBoundExclusive ?? tokens.length;
  if (index >= upperBound) {
    return null;
  }
  const relation = argumentFrameTransparentPunctuationRelation(tokens, index, consumer, {
    lowerBoundInclusive: options.lowerBoundInclusive ?? 0,
    upperBoundExclusive: upperBound
  });
  if (relation === null) {
    return null;
  }
  return {
    relation,
    nextIndex: index + 1
  };
}

export interface CopulaFocusParticleLookupSource {
  set(section: string, key: string): ReadonlySet<string>;
}

export function copulaFocusContinuationRelationAt(
  tokens: readonly BoundaryToken[],
  focusIdx: number,
  options: {
    readonly consumer?: BoundaryRelationConsumer;
    readonly consumers?: readonly BoundaryRelationConsumer[];
    readonly lowerBoundInclusive?: number;
    readonly lookups?: CopulaFocusParticleLookupSource;
  } = {}
): CopulaFocusContinuationRelation | null {
  const focus = tokens[focusIdx];
  if (options.lookups === undefined) {
    return null;
  }
  const particles = options.lookups.set("copula_focus_continuation", "particles");
  if (
    focus === undefined ||
    (focus.pos & POS0) !== 助詞 ||
    !particles.has(focus.surface)
  ) {
    return null;
  }
  const copulaIdx = previousNonPunctuationIndex(tokens, focusIdx - 1, options.lowerBoundInclusive ?? 0);
  if (copulaIdx === null) {
    return null;
  }
  const copula = tokens[copulaIdx];
  if (
    copula === undefined ||
    copula.surface !== "で" ||
    (copula.pos & POS4) !== 助動詞_ダ
  ) {
    return null;
  }
  return {
    kind: "copula_focus_continuation",
    span: { start: copulaIdx, endExclusive: focusIdx + 1 },
    strength: "readiness",
    reason: "copula で followed by focus particle continues the same predicate frame",
    consumers: options.consumers ?? [options.consumer ?? "tail_boundary_readiness"],
    surface: `${copula.surface}${focus.surface}`,
    role: "copula_de_focus_continuation",
    copulaIdx,
    focusIdx,
    focusSurface: focus.surface
  };
}

function argumentFrameTransparentPunctuationRelation(
  tokens: readonly BoundaryToken[],
  index: number,
  consumer: BoundaryRelationConsumer,
  bounds: {
    readonly lowerBoundInclusive: number;
    readonly upperBoundExclusive: number;
  }
): TransparentTokenRelation | null {
  const token = tokens[index];
  if (!isBoundaryPunctuationCategoryToken(token)) {
    return null;
  }
  if (!ARGUMENT_FRAME_TRANSPARENT_PUNCTUATION_SURFACES.has(token.surface) && !isAsciiDotInsideContent(tokens, index, bounds)) {
    return null;
  }
  return {
    kind: "transparent_token",
    span: { start: index, endExclusive: index + 1 },
    strength: "transparent",
    reason: "argument-frame clause-start evidence can cross this punctuation",
    consumers: [consumer],
    surface: token.surface
  };
}

const ARGUMENT_FRAME_TRANSPARENT_PUNCTUATION_SURFACES = new Set([
  "「", "」", "『", "』", "“", "”", "\"", "'",
  "（", "）", "(", ")", "［", "］", "[", "]", "【", "】",
  "・", "･", "·", "/", "-", "‐", "‑", "–", "—"
]);

function isAsciiDotInsideContent(
  tokens: readonly BoundaryToken[],
  index: number,
  bounds: {
    readonly lowerBoundInclusive: number;
    readonly upperBoundExclusive: number;
  }
): boolean {
  const token = tokens[index];
  if (token?.surface !== ".") {
    return false;
  }
  const prevIdx = previousNonPunctuationIndex(tokens, index - 1, bounds.lowerBoundInclusive);
  const nextIdx = nextNonPunctuationIndex(tokens, index + 1, bounds.upperBoundExclusive);
  const prev = prevIdx === null ? undefined : tokens[prevIdx];
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  return isAsciiLikeContentToken(prev) && isAsciiLikeContentToken(next);
}

function isAsciiLikeContentToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  return /^[A-Za-z0-9]+$/u.test(token.surface);
}

function previousNonPunctuationIndex(
  tokens: readonly BoundaryToken[],
  start: number,
  lowerBoundInclusive: number
): number | null {
  let index = start;
  while (index >= lowerBoundInclusive) {
    const token = tokens[index];
    if (token === undefined) return null;
    if (!isBoundaryPunctuationCategoryToken(token)) return index;
    index -= 1;
  }
  return null;
}

function nextNonPunctuationIndex(
  tokens: readonly BoundaryToken[],
  start: number,
  upperBoundExclusive: number
): number | null {
  let index = start;
  while (index < upperBoundExclusive) {
    const token = tokens[index];
    if (token === undefined) return null;
    if (!isBoundaryPunctuationCategoryToken(token)) return index;
    index += 1;
  }
  return null;
}
