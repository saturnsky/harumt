import type { Clause, ClauseLayout } from "../clause-layout/final-layout.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import { isClausePunctuationToken } from "../clause-layout/punctuation.js";
import { TokenCursor } from "../token-cursor.js";
import { matchCopulaNegation } from "../rules/copula.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { precedingTokenOpensStrictReason } from "../reason-source-evidence.js";
import type { ContentMap } from "../particles/index.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { isClauseClosingInflection, POS01, 助詞_接続助詞, POS0, POS4, POS5A, 助動詞, 連用形_, 助動詞_ダ, 助動詞_デス, 형용사, conjectureCopulaPoliteness, isConditionalInflection, isPoliteCopulaPos, isPastAuxConditionalForm, isPastAuxiliaryPos, isReasonCopulaNegativeShellAuxiliary, isVolitionalInflection } from "../../types/pos.js";
import { detectSfpWithNode } from "../semantics/grammar-runtime.js";
import type { SfpEffect } from "../head-tail/tail/predicate-root/grammar.js";
import type { StructuralRelationNode, StructuralRelation, StructuralRelationMarkerSpan, StructuralReasonCopulaPayload, StructuralReasonCopulaSfp, StructuralReasonCopulaSfpEffect, BuildStructuralRelationGraphOptions } from "./types.js";
import { markerSurface, clauseAnchor, nextContentTokenIndex } from "./relation-coordinates.js";

interface ReasonCopulaShellMatch {
  readonly start: number;
  readonly endExclusive: number;
  readonly surface: string;
  readonly payload: StructuralReasonCopulaPayload;
}

export function collectReasonCopulaExplanationRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const { tokens, layout, contentMap } = options;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!isStrictReasonKaraToken(token)) {
      continue;
    }
    const sourceClauseIndex = layout.clauseIndexOfToken(index);
    const sourceClause = sourceClauseIndex < 0 ? undefined : layout.clauses[sourceClauseIndex];
    if (sourceClause === undefined || !hasReasonCleftEvidence(layout, tokens, contentMap, sourceClause, index, index + 1)) {
      continue;
    }
    const copulaStart = nextContentTokenIndex(tokens, index + 1, tokens.length);
    if (copulaStart === null) {
      continue;
    }
    const copulaShell = matchReasonCopulaShellAt(tokens, copulaStart);
    if (copulaShell === null) {
      continue;
    }
    const afterCopula = nextContentTokenIndex(tokens, copulaShell.endExclusive, tokens.length);
    const quoteMarkerSpan = quoteMarkerSpanForHostlessReasonCopula(tokens, afterCopula);
    const sfpMatch = quoteMarkerSpan === null
      ? reasonCopulaTerminalSfpAt(tokens, afterCopula, copulaShell.payload)
      : null;
    const relationEnd = quoteMarkerSpan?.endExclusive ?? sfpMatch?.markerSpan.endExclusive ?? copulaShell.endExclusive;
    const afterRelation = nextContentTokenIndex(tokens, relationEnd, tokens.length);
    if (!hostlessReasonCopulaCanEndBefore(afterRelation === null ? undefined : tokens[afterRelation])) {
      continue;
    }
    const reasonMarkerSpan: StructuralRelationMarkerSpan = {
      start: index,
      endExclusive: index + 1,
      surface: token.surface,
      role: "reason_marker",
    };
    const copulaMarkerSpan: StructuralRelationMarkerSpan = {
      start: copulaShell.start,
      endExclusive: copulaShell.endExclusive,
      surface: copulaShell.surface,
      role: "explanatory_copula",
    };
    const trailingMarkerSpan = quoteMarkerSpan ?? sfpMatch?.markerSpan ?? null;
    const markerSpans = trailingMarkerSpan === null
      ? [reasonMarkerSpan, copulaMarkerSpan]
      : [reasonMarkerSpan, copulaMarkerSpan, trailingMarkerSpan];
    relations.push({
      kind: "reason_copula_explanation",
      source: clauseAnchor(nodes, sourceClauseIndex),
      target: null,
      markerSpans,
      candidateSuppressibleTokenSpans: markerSpans.map((span) => ({
        start: span.start,
        endExclusive: span.endExclusive,
        reason: span.role ?? "reason_copula_marker",
      })),
      projection: {
        sourceForm: "reason",
        targetSlot: "clause_prefix",
      },
      reasonCopula: sfpMatch === null ? copulaShell.payload : { ...copulaShell.payload, sfp: sfpMatch.sfp },
      confidence: "strict",
      renderEnabledByDefault: true,
      provenance: "structural_relation_owner",
    });
  }
  return relations;
}

function matchReasonCopulaShellAt(
  tokens: readonly ClauseToken[],
  start: number,
): ReasonCopulaShellMatch | null {
  const negativeCursor = new TokenCursor(tokens, start, tokens.length);
  const negative = matchCopulaNegation(negativeCursor);
  if (negative !== undefined) {
    const negativeHead = tokens[negativeCursor.pos - negative[5].length - 1];
    const conjecture = reasonCopulaNegativeConjecture(negativeHead, negative[5]);
    if (
      conjecture === undefined ||
      negative[4] ||
      (negativeHead !== undefined && isConditionalInflection(negativeHead.pos))
    ) {
      return null;
    }
    const trailingTe = negative[2] ? negativeCursor.current() : undefined;
    if (trailingTe?.surface === "て" && isTeConnectiveToken(trailingTe)) {
      negativeCursor.advance(1);
    }
    return {
      start,
      endExclusive: negativeCursor.pos,
      surface: markerSurface(tokens, start, negativeCursor.pos),
      payload: {
        negative: true,
        polite: negative[0],
        past: negative[1],
        connective: negative[2],
        additiveMo: negative[3],
        conditionalNara: negative[4],
        conjecture,
        sfp: null,
      },
    };
  }
  const first = tokens[start];
  if (!isBasicCopulaAuxToken(first)) {
    return null;
  }
  const conjectureShell = reasonCopulaConjectureShellAt(tokens, start);
  if (conjectureShell !== null) {
    return conjectureShell;
  }
  const next = nextContentTokenIndex(tokens, start + 1, tokens.length);
  const nextToken = next === null ? undefined : tokens[next];
  if (next !== null && nextToken !== undefined && isPastAuxiliaryPos(nextToken.pos)) {
    if (isPastAuxConditionalForm(nextToken.pos)) {
      return null;
    }
    return {
      start,
      endExclusive: next + 1,
      surface: markerSurface(tokens, start, next + 1),
      payload: {
        negative: false,
        polite: reasonCopulaTokenPoliteness(first),
        past: true,
        connective: false,
        additiveMo: false,
        conditionalNara: false,
        conjecture: null,
        sfp: null,
      },
    };
  }
  return {
    start,
    endExclusive: start + 1,
    surface: first.surface,
    payload: {
      negative: false,
      polite: reasonCopulaTokenPoliteness(first),
      past: false,
      connective: isCopulaDaRenyouToken(first),
      additiveMo: false,
      conditionalNara: false,
      conjecture: null,
      sfp: null,
    },
  };
}

function reasonCopulaTokenPoliteness(token: ClauseToken): boolean {
  return isPoliteCopulaPos(token.pos) || token.dictionaryForm === "です";
}

function reasonCopulaConjectureShellAt(
  tokens: readonly ClauseToken[],
  start: number,
): ReasonCopulaShellMatch | null {
  const first = tokens[start];
  if (first === undefined) {
    return null;
  }
  const firstPoliteness = conjectureCopulaPoliteness(first.pos);
  if (firstPoliteness !== null) {
    return reasonCopulaConjectureShell(tokens, start, start + 1, firstPoliteness, false);
  }
  const next = nextContentTokenIndex(tokens, start + 1, tokens.length);
  const nextToken = next === null ? undefined : tokens[next];
  if (next === null || nextToken === undefined || !isPastAuxiliaryPos(nextToken.pos)) {
    return null;
  }
  if (isVolitionalInflection(nextToken.pos)) {
    return reasonCopulaConjectureShell(
      tokens,
      start,
      next + 1,
      reasonCopulaTokenPoliteness(first) ? "polite" : "plain",
      true,
    );
  }
  if (isPastAuxConditionalForm(nextToken.pos)) {
    return null;
  }
  const after = nextContentTokenIndex(tokens, next + 1, tokens.length);
  const afterToken = after === null ? undefined : tokens[after];
  const afterPoliteness = afterToken === undefined ? null : conjectureCopulaPoliteness(afterToken.pos);
  if (after === null || afterToken === undefined || afterPoliteness === null || !isBasicCopulaAuxToken(afterToken)) {
    return null;
  }
  return reasonCopulaConjectureShell(tokens, start, after + 1, afterPoliteness, true);
}

function reasonCopulaConjectureShell(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
  politeness: "plain" | "polite",
  past: boolean,
): ReasonCopulaShellMatch {
  const polite = politeness === "polite";
  return {
    start,
    endExclusive,
    surface: markerSurface(tokens, start, endExclusive),
    payload: {
      negative: false,
      polite,
      past,
      connective: false,
      additiveMo: false,
      conditionalNara: false,
      conjecture: { polite },
      sfp: null,
    },
  };
}

function reasonCopulaNegativeConjecture(
  negativeHead: ClauseToken | undefined,
  auxTokens: readonly ClauseToken[],
): StructuralReasonCopulaPayload["conjecture"] | undefined {
  let conjecture: StructuralReasonCopulaPayload["conjecture"] =
    negativeHead !== undefined && isVolitionalInflection(negativeHead.pos)
      ? { polite: false }
      : null;
  for (const token of auxTokens) {
    const conjecturePoliteness = conjectureCopulaPoliteness(token.pos);
    if (conjecturePoliteness !== null) {
      if (conjecture !== null) return undefined;
      conjecture = { polite: conjecturePoliteness === "polite" };
      continue;
    }
    if (!isReasonCopulaNegativeShellAuxiliary(token.pos)) return undefined;
  }
  return conjecture;
}

interface ReasonCopulaTerminalSfpMatch {
  readonly markerSpan: StructuralRelationMarkerSpan;
  readonly sfp: StructuralReasonCopulaSfp;
}

const REASON_COPULA_REALIZABLE_SFP_EFFECTS: ReadonlySet<string> =
  new Set<StructuralReasonCopulaSfpEffect>(["ne", "na_excl", "jan", "yone_confirm", "explanatory"]);

function isRealizableReasonCopulaSfpEffect(effect: SfpEffect): effect is StructuralReasonCopulaSfpEffect {
  return REASON_COPULA_REALIZABLE_SFP_EFFECTS.has(effect);
}

function reasonCopulaTerminalSfpAt(
  tokens: readonly ClauseToken[],
  index: number | null,
  payload: StructuralReasonCopulaPayload,
): ReasonCopulaTerminalSfpMatch | null {
  if (index === null || tokens[index] === undefined) {
    return null;
  }
  if (payload.negative || payload.connective) {
    return null;
  }
  const cursor = new TokenCursor(tokens as readonly RuntimeHaruToken[], index, tokens.length);
  const detected = detectSfpWithNode(cursor, 助動詞, true);
  if (detected === null || cursor.pos <= index) {
    return null;
  }
  const effect = detected.node.effect;
  if (effect !== null && !isRealizableReasonCopulaSfpEffect(effect)) {
    return null;
  }
  return {
    markerSpan: {
      start: index,
      endExclusive: cursor.pos,
      surface: markerSurface(tokens, index, cursor.pos),
      role: "terminal_sfp",
    },
    sfp: { effect, surface: detected.node.surface },
  };
}

function quoteMarkerSpanForHostlessReasonCopula(
  tokens: readonly ClauseToken[],
  index: number | null,
): StructuralRelationMarkerSpan | null {
  const token = index === null ? undefined : tokens[index];
  if (index === null || token === undefined) {
    return null;
  }
  if (token.surface !== "と" && token.surface !== "って") {
    return null;
  }
  return {
    start: index,
    endExclusive: index + 1,
    surface: token.surface,
    role: "quotative_marker",
  };
}

function hostlessReasonCopulaCanEndBefore(token: ClauseToken | undefined): boolean {
  return token === undefined || isClausePunctuationToken(token);
}

function isStrictReasonKaraToken(token: ClauseToken | undefined): token is ClauseToken {
  return token !== undefined &&
    (token.surface === "から" || token.dictionaryForm === "から") &&
    (token.pos & POS01) === 助詞_接続助詞;
}

function isBasicCopulaAuxToken(token: ClauseToken | undefined): token is ClauseToken {
  if (token === undefined || (token.pos & POS0) !== 助動詞) {
    return false;
  }
  const pos4 = token.pos & POS4;
  return pos4 === 助動詞_ダ ||
    pos4 === 助動詞_デス ||
    token.dictionaryForm === "だ" ||
    token.dictionaryForm === "です";
}

function isCopulaDaRenyouToken(token: ClauseToken): boolean {
  return token.surface === "で" &&
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_);
}

function hasStrictReasonBoundary(
  tokens: readonly ClauseToken[],
  markerStart: number,
  markerEndExclusive: number,
  sourceClauseEndExclusive: number,
): boolean {
  if (markerStart >= sourceClauseEndExclusive) {
    return new TokenCursor(tokens, sourceClauseEndExclusive, markerStart).current() === undefined;
  }
  const c = new TokenCursor(tokens, markerEndExclusive, sourceClauseEndExclusive);
  while (c.current()) {
    const token = c.current()!;
    if (isClausePunctuationToken(token)) {
      return true;
    }
    return false;
  }
  return markerEndExclusive === sourceClauseEndExclusive;
}

export function hasStrictReasonEvidence(
  tokens: readonly ClauseToken[],
  sourceClause: Clause,
  markerStart: number,
  markerEndExclusive: number,
  contentMap: ContentMap,
): boolean {
  return hasStrictReasonBoundary(tokens, markerStart, markerEndExclusive, sourceClause.end) &&
    hasStrictReasonSource(tokens, sourceClause, markerStart, contentMap);
}

function hasReasonCleftEvidence(
  layout: ClauseLayout,
  tokens: readonly ClauseToken[],
  contentMap: ContentMap,
  sourceClause: Clause,
  markerStart: number,
  markerEndExclusive: number,
): boolean {
  return hasStrictReasonBoundary(tokens, markerStart, markerEndExclusive, sourceClause.end) &&
    hasReasonCleftSource(layout, tokens, contentMap, markerStart);
}

function hasStrictReasonSource(
  tokens: readonly ClauseToken[],
  sourceClause: Clause,
  markerStart: number,
  contentMap: ContentMap,
): boolean {
  const primaryPredicate = sourceClause.primaryPredicate;
  if (primaryPredicate === null || primaryPredicate >= markerStart) {
    return false;
  }
  const sourceSpan = contentMap.get(primaryPredicate);
  if (sourceSpan?.koreanPos === 형용사) {
    return true;
  }
  return precedingTokenOpensStrictReason(tokens, markerStart - 1, sourceClause.start);
}

function hasReasonCleftSource(
  layout: ClauseLayout,
  tokens: readonly ClauseToken[],
  contentMap: ContentMap,
  markerStart: number,
): boolean {
  const occurrence = layout.predicateOccurrenceBefore(tokens, contentMap, markerStart);
  if (occurrence === undefined || occurrence.predicateIdx >= markerStart) {
    return false;
  }
  const closure = tokens[occurrence.closureIdx];
  return closure !== undefined && isClauseClosingInflection(closure.pos);
}
