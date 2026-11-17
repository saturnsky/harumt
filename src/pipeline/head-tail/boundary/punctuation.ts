import type {
  BoundaryRelationConsumer,
  BoundaryRelation,
  HardTerminalPunctuationRelation,
  QuoteBridgePunctuationRelation,
  SubtitleTerminalTrailingPunctuationRunRelation,
  WeakPunctuationRelation
} from "./relation.js";


import {
  isSentenceTerminalPunctuationSubtype,
  pos0in, POS0, POS01, POS1, PUNCTUATION_BITS,
  助詞_終助詞, 補助記号, 補助記号_括弧開, 補助記号_括弧閉, 補助記号_読点
} from "../../../types/pos.js";
export interface BoundaryToken {
  readonly surface: string;
  readonly dictionaryForm?: string;
  readonly normalizedForm?: string;
  readonly pos: number;
  readonly splitA?: readonly BoundaryToken[];
}

export const BOUNDARY_PUNCTUATION_POS0 = new Set(["補助記号", "記号"]);

export const WEAK_PUNCTUATION_SURFACES = new Set(["、", "，", ","]);

export const HARD_TERMINAL_PUNCTUATION_SURFACES = new Set([
  "。", ".",
  "！", "!",
  "？", "?",
  "…", "‥"
]);

export const BOUNDARY_PUNCTUATION_SURFACES = new Set([
  ...WEAK_PUNCTUATION_SURFACES,
  ...HARD_TERMINAL_PUNCTUATION_SURFACES
]);

export const TRAILING_PUNCTUATION_SURFACES = new Set([
  "」", "』", "）", ")", "】", "］", "]", "〉", "》",
  "”", "’", "\"", "'", "＂", "＇"
]);

export const OPENING_PUNCTUATION_SURFACES = new Set([
  "「", "『", "（", "(", "【", "［", "[", "〈", "《",
  "“", "‘", "\"", "'", "＂", "＇"
]);

export const CONTENT_INTERNAL_CONNECTOR_SURFACES = new Set(["・", "･", "·"]);

export const LABEL_SEPARATOR_PUNCTUATION_SURFACES = new Set(["：", ":"]);

export const TERMINALISH_PUNCTUATION_SURFACES = new Set([
  ...HARD_TERMINAL_PUNCTUATION_SURFACES,
  ...TRAILING_PUNCTUATION_SURFACES,
]);

export type HardTerminalPunctuationSurfaceClass =
  | "japanese_period"
  | "ascii_period"
  | "question"
  | "exclamation"
  | "ellipsis";

export type WeakPunctuationSurfaceClass =
  | "japanese_comma"
  | "fullwidth_comma"
  | "ascii_comma";

const PREDICATE_CONTINUATION_TRANSPARENT_SYMBOL_SURFACES = new Set([
  "[",
  "]",
  "［",
  "］",
  "(",
  ")",
  "（",
  "）"
]);

export function isBoundaryPunctuationCategoryToken(token: BoundaryToken | undefined): token is BoundaryToken {
  return token !== undefined && pos0in(token.pos, PUNCTUATION_BITS);
}

export function isHardTerminalPunctuationSurface(surface: string | undefined): boolean {
  return surface !== undefined && HARD_TERMINAL_PUNCTUATION_SURFACES.has(surface);
}

const SOURCE_NOTATION_TERMINAL_PUNCTUATION = new Map<string, string>([
  ["?", "？"],
  ["!", "！"]
]);

export function isZeroWidthTerminalPunctuationContinuationToken(
  token: BoundaryToken | undefined
): boolean {
  return token !== undefined &&
    token.surface.length === 0 &&
    isBoundaryPunctuationCategoryToken(token) &&
    isSentenceTerminalPunctuationSubtype(token);
}

export function canonicalHardTerminalPunctuationSurfaceFor(
  token: BoundaryToken | undefined
): string | null {
  if (token === undefined || !isBoundaryPunctuationCategoryToken(token)) {
    return null;
  }
  if (!isSentenceTerminalPunctuationSubtype(token)) {
    return null;
  }
  if (Array.from(token.surface).length > 1 || isHardTerminalPunctuationSurface(token.surface)) {
    return null;
  }
  const normalized = token.dictionaryForm;
  if (
    normalized === undefined ||
    normalized === token.surface ||
    !isHardTerminalPunctuationSurface(normalized)
  ) {
    return null;
  }
  const canonical = SOURCE_NOTATION_TERMINAL_PUNCTUATION.get(normalized) ?? normalized;
  return canonical === token.surface ? null : canonical;
}

export function isTrailingPunctuationSurface(surface: string | undefined): boolean {
  return surface !== undefined && TRAILING_PUNCTUATION_SURFACES.has(surface);
}

export function isSubtitleTerminalTrailingPunctuationToken(
  token: BoundaryToken | undefined,
  surfaces: ReadonlySet<string>,
): boolean {
  return token !== undefined &&
    isBoundaryPunctuationCategoryToken(token) &&
    surfaces.has(token.surface);
}

export function subtitleTerminalTrailingPunctuationRunRelationAt(
  tokens: readonly BoundaryToken[],
  startIdx: number,
  surfaces: ReadonlySet<string>,
  consumers: readonly BoundaryRelationConsumer[],
): SubtitleTerminalTrailingPunctuationRunRelation | null {
  const candidates = [...surfaces];
  const reachable = new Set<number>([startIdx]);
  let endExclusive: number | null = null;
  for (let segmentStart = startIdx; segmentStart < tokens.length; segmentStart += 1) {
    if (!reachable.has(segmentStart)) {
      continue;
    }
    let segmentSurface = "";
    for (let index = segmentStart; index < tokens.length && isBoundaryPunctuationCategoryToken(tokens[index]); index += 1) {
      segmentSurface += tokens[index]!.surface;
      if (surfaces.has(segmentSurface)) {
        reachable.add(index + 1);
        endExclusive = Math.max(endExclusive ?? 0, index + 1);
      }
      if (!candidates.some((candidate) => candidate.startsWith(segmentSurface))) {
        break;
      }
    }
  }
  if (endExclusive === null) {
    return null;
  }
  return {
    kind: "subtitle_terminal_trailing_punctuation_run",
    span: { start: startIdx, endExclusive },
    strength: "readiness",
    reason: "lookup-backed subtitle terminal trailing punctuation run",
    consumers,
    surface: tokens.slice(startIdx, endExclusive).map((token) => token.surface).join(""),
    role: "subtitle_terminal_trailing",
  };
}

export function isOpeningPunctuationSurface(surface: string | undefined): boolean {
  return surface !== undefined && OPENING_PUNCTUATION_SURFACES.has(surface);
}

export function isTerminalishPunctuationSurface(surface: string | undefined): boolean {
  return surface !== undefined && TERMINALISH_PUNCTUATION_SURFACES.has(surface);
}

export function isWeakPunctuationToken(token: BoundaryToken | undefined): boolean {
  return isBoundaryPunctuationCategoryToken(token) && WEAK_PUNCTUATION_SURFACES.has(token?.surface ?? "");
}

export function isHardTerminalPunctuationToken(token: BoundaryToken | undefined): boolean {
  return isBoundaryPunctuationCategoryToken(token) &&
    (isSentenceTerminalPunctuationSubtype(token) || isHardTerminalPunctuationSurface(token.surface));
}

export function hasRealContentAfterIndex(
  tokens: readonly BoundaryToken[],
  idx: number,
  options: { readonly stopAtHardTerminal?: boolean; readonly limit?: number } = {}
): boolean {
  const end = Math.min(options.limit ?? tokens.length, tokens.length);
  for (let i = idx; i < end; i += 1) {
    const token = tokens[i];
    if (token === undefined) continue;
    if (options.stopAtHardTerminal === true && isHardTerminalPunctuationToken(token)) return false;
    if (pos0in(token.pos, PUNCTUATION_BITS) || (token.pos & POS01) === 助詞_終助詞) continue;
    return true;
  }
  return false;
}

export function isBoundaryPunctuationToken(token: BoundaryToken | undefined): boolean {
  return isBoundaryPunctuationCategoryToken(token) && BOUNDARY_PUNCTUATION_SURFACES.has(token?.surface ?? "");
}

export function carriesLexicalSurface(surface: string): boolean {
  return /[\p{L}\p{N}]/u.test(surface);
}

function bracketDirectionOf(token: BoundaryToken): "open" | "close" | null {
  if (carriesLexicalSurface(token.surface)) {
    return null;
  }
  const subtype = token.pos & POS01;
  if (subtype === 補助記号_括弧開) {
    return "open";
  }
  return subtype === 補助記号_括弧閉 ? "close" : null;
}

export function isTrailingPunctuationToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined || !isBoundaryPunctuationCategoryToken(token)) {
    return false;
  }
  const direction = bracketDirectionOf(token);
  return direction === null ? isTrailingPunctuationSurface(token.surface) : direction === "close";
}

export function isOpeningPunctuationToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined || !isBoundaryPunctuationCategoryToken(token)) {
    return false;
  }
  const direction = bracketDirectionOf(token);
  return direction === null ? isOpeningPunctuationSurface(token.surface) : direction === "open";
}

export function isTerminalishPunctuationToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined && isBoundaryPunctuationCategoryToken(token) && isTerminalishPunctuationSurface(token.surface);
}

export function isNonTerminalClauseBreakPunctuationToken(
  token: BoundaryToken | undefined,
  breakDashSurfaces: ReadonlySet<string>
): boolean {
  if (token === undefined) {
    return false;
  }
  if (isBoundaryPunctuationCategoryToken(token)) {
    const subtype = token.pos & POS01;
    if (subtype === 補助記号_読点 || subtype === 補助記号_括弧閉) {
      return true;
    }
  }
  return breakDashSurfaces.has(token.surface);
}

export function isNominalCoordinationSymbolToken(
  token: BoundaryToken | undefined,
  coordinationSymbolSurfaces: ReadonlySet<string>
): boolean {
  return token !== undefined &&
    isBoundaryPunctuationCategoryToken(token) &&
    coordinationSymbolSurfaces.has(token.surface);
}

export function isDecorativeTerminalPunctuationToken(
  token: BoundaryToken | undefined,
  decorativeSurfaces: ReadonlySet<string>
): boolean {
  return token !== undefined &&
    isBoundaryPunctuationCategoryToken(token) &&
    decorativeSurfaces.has(token.surface);
}

export function isLabelSeparatorPunctuationToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    isBoundaryPunctuationCategoryToken(token) &&
    LABEL_SEPARATOR_PUNCTUATION_SURFACES.has(token.surface);
}

export function isContentInternalConnectorToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    isBoundaryPunctuationCategoryToken(token) &&
    CONTENT_INTERNAL_CONNECTOR_SURFACES.has(token.surface);
}

export function boundaryRelationsAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): readonly BoundaryRelation[] {
  const token = tokens[index];
  if (token === undefined) {
    return [];
  }
  const consumers = options.consumers ?? defaultConsumersForToken(token);
  const relations: BoundaryRelation[] = [];
  const weak = weakPunctuationRelation(token, index, consumers);
  if (weak !== null) {
    relations.push(weak);
  }
  const hard = hardTerminalPunctuationRelation(token, index, consumers);
  if (hard !== null) {
    relations.push(hard);
  }
  for (const consumer of consumers) {
    const transparent = transparentTokenRelationForConsumer(token, index, consumer);
    if (transparent !== null && !relations.some((relation) =>
      relation.kind === transparent.kind &&
      relation.span.start === transparent.span.start &&
      relation.consumers.includes(consumer)
    )) {
      relations.push(transparent);
    }
    if ((consumer === "quote_content" || consumer === "quote_host_taxonomy") && isWeakPunctuationToken(token)) {
      const quoteBridge = quoteBridgePunctuationRelationForToken(token, index, [consumer]);
      if (quoteBridge !== null) {
        relations.push(quoteBridge);
      }
    }
    if (consumer === "embedded_question" && isWeakPunctuationToken(token)) {
      relations.push({
        kind: "embedded_question_bridge_punctuation",
        span: { start: index, endExclusive: index + 1 },
        strength: "weak",
        reason: "weak punctuation can bridge question marker to question-taking host",
        consumers: [consumer],
        surface: token.surface
      });
    }
  }
  return relations;
}

export function weakPunctuationRelation(
  token: BoundaryToken | undefined,
  index: number,
  consumers: readonly BoundaryRelationConsumer[]
): WeakPunctuationRelation | null {
  if (token === undefined || !isWeakPunctuationToken(token)) {
    return null;
  }
  const checkedToken = token;
  return {
    kind: "weak_punctuation",
    span: { start: index, endExclusive: index + 1 },
    strength: "weak",
    reason: "weak punctuation surface",
    consumers,
    surface: checkedToken.surface
  };
}

export function hardTerminalPunctuationRelation(
  token: BoundaryToken | undefined,
  index: number,
  consumers: readonly BoundaryRelationConsumer[]
): HardTerminalPunctuationRelation | null {
  if (token === undefined || !isHardTerminalPunctuationToken(token)) {
    return null;
  }
  const checkedToken = token;
  return {
    kind: "hard_terminal_punctuation",
    span: { start: index, endExclusive: index + 1 },
    strength: "hard",
    reason: "terminal punctuation surface",
    consumers,
    surface: checkedToken.surface
  };
}

export function hasWeakPunctuationRelation(
  token: BoundaryToken | undefined,
  index: number,
  consumers: readonly BoundaryRelationConsumer[] = ["clause_layout"]
): boolean {
  return weakPunctuationRelation(token, index, consumers) !== null;
}

export function weakPunctuationSurfaceClassForToken(
  token: BoundaryToken | undefined,
  index: number,
  consumers: readonly BoundaryRelationConsumer[] = ["clause_layout"]
): WeakPunctuationSurfaceClass | null {
  const relation = weakPunctuationRelation(token, index, consumers);
  if (relation === null) {
    return null;
  }
  switch (relation.surface) {
    case "、":
      return "japanese_comma";
    case "，":
      return "fullwidth_comma";
    case ",":
      return "ascii_comma";
    default:
      return null;
  }
}

export function hasWeakPunctuationClass(
  token: BoundaryToken | undefined,
  index: number,
  classes: readonly WeakPunctuationSurfaceClass[],
  consumers: readonly BoundaryRelationConsumer[] = ["clause_layout"]
): boolean {
  const surfaceClass = weakPunctuationSurfaceClassForToken(token, index, consumers);
  return surfaceClass !== null && classes.includes(surfaceClass);
}

export function hasHardTerminalPunctuationRelation(
  token: BoundaryToken | undefined,
  index: number,
  consumers: readonly BoundaryRelationConsumer[] = ["clause_layout"]
): boolean {
  return hardTerminalPunctuationRelation(token, index, consumers) !== null;
}

export function hardTerminalPunctuationSurfaceClassForToken(
  token: BoundaryToken | undefined,
  index: number,
  consumers: readonly BoundaryRelationConsumer[] = ["clause_layout"]
): HardTerminalPunctuationSurfaceClass | null {
  const relation = hardTerminalPunctuationRelation(token, index, consumers);
  if (relation === null) {
    return null;
  }
  switch (relation.surface) {
    case "。":
      return "japanese_period";
    case ".":
      return "ascii_period";
    case "？":
    case "?":
      return "question";
    case "！":
    case "!":
      return "exclamation";
    case "…":
    case "‥":
      return "ellipsis";
    default:
      return null;
  }
}

export function hasHardTerminalPunctuationClass(
  token: BoundaryToken | undefined,
  index: number,
  classes: readonly HardTerminalPunctuationSurfaceClass[],
  consumers: readonly BoundaryRelationConsumer[] = ["clause_layout"]
): boolean {
  const surfaceClass = hardTerminalPunctuationSurfaceClassForToken(token, index, consumers);
  return surfaceClass !== null && classes.includes(surfaceClass);
}

export function quoteBridgePunctuationRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  consumers: readonly BoundaryRelationConsumer[] = ["quote_content"]
): QuoteBridgePunctuationRelation | null {
  if (token === undefined || !isWeakPunctuationToken(token)) {
    return null;
  }
  return {
    kind: "quote_bridge_punctuation",
    span: { start: index, endExclusive: index + 1 },
    strength: "weak",
    reason: "weak punctuation can bridge quote marker to host",
    consumers,
    surface: token.surface
  };
}

export function quoteBridgePunctuationRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: { readonly consumers?: readonly BoundaryRelationConsumer[] } = {}
): QuoteBridgePunctuationRelation | null {
  return quoteBridgePunctuationRelationForToken(tokens[index], index, options.consumers);
}

export function transparentTokenRelationForConsumer(
  token: BoundaryToken | undefined,
  index: number,
  consumer: BoundaryRelationConsumer
): BoundaryRelation | null {
  if (token === undefined || !isTransparentTokenForConsumer(token, consumer)) {
    return null;
  }
  return {
    kind: "transparent_token",
    span: { start: index, endExclusive: index + 1 },
    strength: "transparent",
    reason: transparentReasonForConsumer(consumer),
    consumers: [consumer],
    surface: token.surface
  };
}

export function isTransparentTokenForConsumer(
  token: BoundaryToken | undefined,
  consumer: BoundaryRelationConsumer
): boolean {
  if (token === undefined) {
    return false;
  }
  switch (consumer) {
    case "embedded_question":
    case "embedded_question_ka_pair_scan":
    case "embedded_question_question_taking_scan":
    case "projection_context":
    case "quote_content":
      return isWeakPunctuationToken(token);
    case "tokoro_semantics":
      return isBoundaryPunctuationCategoryToken(token);
    case "embedded_question_predicate_continuation":
      return isWeakPunctuationToken(token) ||
        PREDICATE_CONTINUATION_TRANSPARENT_SYMBOL_SURFACES.has(token.surface) ||
        (isBoundaryPunctuationCategoryToken(token) && (token.pos & POS1) === 0 && !isHardTerminalPunctuationToken(token));
    default:
      return false;
  }
}

function defaultConsumersForToken(token: BoundaryToken): readonly BoundaryRelationConsumer[] {
  if (isWeakPunctuationToken(token)) {
    return ["clause_layout", "projection_context", "embedded_question", "quote_content"];
  }
  if (isHardTerminalPunctuationToken(token)) {
    return ["clause_layout", "tail_multi_clause"];
  }
  return [];
}

function transparentReasonForConsumer(consumer: BoundaryRelationConsumer): string {
  switch (consumer) {
    case "embedded_question":
    case "embedded_question_ka_pair_scan":
    case "embedded_question_question_taking_scan":
      return "embedded question scan can cross weak punctuation";
    case "embedded_question_predicate_continuation":
      return "predicate continuation scan can cross weak punctuation or bracket-like symbols";
    case "projection_context":
      return "projection evidence window can cross weak punctuation";
    case "quote_content":
      return "quote host bridge can cross weak punctuation";
    default:
      return "consumer-scoped transparent token";
  }
}
