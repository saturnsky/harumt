import { nextNonSpaceIndex, type ClauseLayout, type ClauseToken } from "../clause-layout/index.js";
import { isClauseHardTerminalPunctuationToken } from "../clause-layout/punctuation.js";
import type { LookupTables } from "../lookup-tables.js";
import { isVerbLemma } from "../matchers.js";
import { secondaryParticleCanonical } from "../particles/secondary-particle.js";
import {
  POS0,
  POS1,
  POS5A,
  isSahenCapableNominal,
  助詞,
  助動詞,
  動詞,
  名詞,
  格助詞,
  係助詞,
  終止形_,
  連体形_,
  連用形_,
  未然形_,
  仮定形_,
} from "../../types/pos.js";
import type {
  StructuralAnchor,
  StructuralRelation,
  StructuralRelationGraph,
  StructuralRelationMarkerSpan,
  StructuralRelationTokenSpan,
  StructuralSourcePredicateOperatorKind,
} from "./types.js";

export type SourcePredicateOperatorContentMap = ReadonlyMap<number, unknown>;

export function buildSourcePredicateOperatorEvidenceGraph(options: {
  readonly tokens: readonly ClauseToken[];
  readonly layout: ClauseLayout;
  readonly contentMap: SourcePredicateOperatorContentMap;
  readonly lookups: LookupTables;
}): StructuralRelationGraph {
  return {
    nodes: [],
    relations: collectSourcePredicateOperatorRelations(options),
    diagnostics: [],
  };
}

export function collectSourcePredicateOperatorRelations(options: {
  readonly tokens: readonly ClauseToken[];
  readonly layout: ClauseLayout;
  readonly contentMap: SourcePredicateOperatorContentMap;
  readonly lookups: LookupTables;
}): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  for (const [sourceIdx] of options.contentMap) {
    const start = sourceIdx + 1;
    const potential = matchPotentialKotoGaDekiruAfterSource(options, sourceIdx, start);
    if (potential !== null) {
      relations.push(sourcePredicateOperatorRelation(options, sourceIdx, potential));
    }
    const sahenOperator = matchSahenVerbalOperatorAfterSource(options, sourceIdx, start);
    if (sahenOperator !== null) {
      relations.push(sourcePredicateOperatorRelation(options, sourceIdx, sahenOperator));
    }
  }
  return relations;
}

export function sourcePredicateOperatorEvidenceAt(
  graph: StructuralRelationGraph | null | undefined,
  sourceIdx: number,
  operatorKinds: ReadonlySet<StructuralSourcePredicateOperatorKind>
): boolean {
  if (graph === null || graph === undefined) {
    return false;
  }
  return graph.relations.some((relation) =>
    relation.kind === "source_predicate_operator" &&
    relation.sourcePredicateOperator?.sourcePredicateIdx === sourceIdx &&
    operatorKinds.has(relation.sourcePredicateOperator.operatorKind)
  );
}

interface SourcePredicateOperatorMatch {
  readonly operatorKind: StructuralSourcePredicateOperatorKind;
  readonly markerStart: number;
  readonly markerEndExclusive: number;
  readonly supportIdx: number | null;
  readonly operatorIdx: number;
  readonly markerSurface: string;
}

function matchPotentialKotoGaDekiruAfterSource(
  options: {
    readonly tokens: readonly ClauseToken[];
    readonly layout: ClauseLayout;
    readonly lookups: LookupTables;
  },
  sourceIdx: number,
  start: number
): SourcePredicateOperatorMatch | null {
  const { tokens, lookups } = options;
  const firstIdx = nextNonSpaceIndex(tokens, start, tokens.length);
  if (firstIdx === null) {
    return null;
  }
  const first = tokens[firstIdx];
  if (first === undefined) {
    return null;
  }
  const supportIdx = isSahenSupportSuruToken(first) ? firstIdx : null;
  const kotoStart = supportIdx === null
    ? firstIdx
    : skipSimplePredicateAuxBeforeKoto(tokens, supportIdx + 1);
  const kotoIdx = nextNonSpaceIndex(tokens, kotoStart, tokens.length);
  const koto = kotoIdx === null ? undefined : tokens[kotoIdx];
  if (kotoIdx === null || koto === undefined || !isKotoNounToken(koto)) {
    return null;
  }

  let scan = nextNonSpaceIndex(tokens, kotoIdx + 1, tokens.length);
  const focusIdx = scan;
  const focus = focusIdx === null ? undefined : tokens[focusIdx];
  const focusCanonical = secondaryParticleCanonical(focus);
  if (focusCanonical !== null && lookups.KOTO_DEKIRU_FOCUS_PARTICLES.has(focusCanonical)) {
    scan = nextNonSpaceIndex(tokens, focusIdx! + 1, tokens.length);
  }
  const particleIdx = scan;
  const particle = particleIdx === null ? undefined : tokens[particleIdx];
  if (particleIdx === null || particle === undefined || !isPotentialKotoDekiruParticleToken(particle)) {
    return null;
  }
  const dekiruIdx = nextNonSpaceIndex(tokens, particleIdx + 1, tokens.length);
  const dekiru = dekiruIdx === null ? undefined : tokens[dekiruIdx];
  if (dekiruIdx === null || dekiru === undefined || !isPotentialDekiruToken(dekiru)) {
    return null;
  }
  if (!isPotentialDekiruInflection(dekiru)) {
    return null;
  }
  const markerStart = supportIdx ?? kotoIdx;
  if (rangeHasHardTerminalPunctuation(tokens, sourceIdx + 1, dekiruIdx)) {
    return null;
  }
  return {
    operatorKind: "potential_koto_ga_dekiru",
    markerStart,
    markerEndExclusive: dekiruIdx + 1,
    supportIdx,
    operatorIdx: dekiruIdx,
    markerSurface: surfaceOf(tokens, markerStart, dekiruIdx + 1),
  };
}

function matchSahenVerbalOperatorAfterSource(
  options: {
    readonly tokens: readonly ClauseToken[];
    readonly layout: ClauseLayout;
  },
  sourceIdx: number,
  start: number
): SourcePredicateOperatorMatch | null {
  const { tokens } = options;
  const source = tokens[sourceIdx];
  if (source === undefined || !isSahenCapableNominal(source)) {
    return null;
  }
  const supportIdx = nextNonSpaceIndex(tokens, start, tokens.length);
  const support = supportIdx === null ? undefined : tokens[supportIdx];
  if (supportIdx === null || support === undefined || !isSahenSupportSuruToken(support)) {
    return null;
  }
  const operatorIdx = nextNonSpaceIndex(tokens, supportIdx + 1, tokens.length);
  const operator = operatorIdx === null ? undefined : tokens[operatorIdx];
  if (operatorIdx === null || operator === undefined) {
    return null;
  }
  const operatorKind = isCausativeAuxToken(operator)
    ? "sahen_causative"
    : isTeConnectiveToken(operator)
      ? "sahen_te_connective"
      : null;
  if (operatorKind === null) {
    return null;
  }
  if (rangeHasHardTerminalPunctuation(tokens, sourceIdx + 1, operatorIdx)) {
    return null;
  }
  return {
    operatorKind,
    markerStart: supportIdx,
    markerEndExclusive: operatorIdx + 1,
    supportIdx,
    operatorIdx,
    markerSurface: surfaceOf(tokens, supportIdx, operatorIdx + 1),
  };
}

function sourcePredicateOperatorRelation(
  options: {
    readonly tokens: readonly ClauseToken[];
    readonly layout: ClauseLayout;
  },
  sourceIdx: number,
  match: SourcePredicateOperatorMatch
): StructuralRelation {
  const sourceClauseIndex = options.layout.clauseIndexOfToken(sourceIdx);
  const markerSpan: StructuralRelationMarkerSpan = {
    start: match.markerStart,
    endExclusive: match.markerEndExclusive,
    surface: match.markerSurface,
    role: "source_predicate_operator_marker",
  };
  return {
    kind: "source_predicate_operator",
    source: spanAnchor(sourceIdx, sourceIdx + 1, sourceClauseIndex),
    target: spanAnchor(match.markerStart, match.markerEndExclusive, sourceClauseIndex),
    markerSpans: [markerSpan],
    projection: { sourceForm: "terminal" },
    confidence: "strict",
    renderEnabledByDefault: false,
    sourcePredicateOperator: {
      operatorKind: match.operatorKind,
      sourcePredicateIdx: sourceIdx,
      supportIdx: match.supportIdx,
      operatorIdx: match.operatorIdx,
    },
    provenance: "structural_relation_owner",
  };
}

function skipSimplePredicateAuxBeforeKoto(tokens: readonly ClauseToken[], start: number): number {
  let scan = start;
  while (true) {
    const tokenIdx = nextNonSpaceIndex(tokens, scan, tokens.length);
    const token = tokenIdx === null ? undefined : tokens[tokenIdx];
    if (tokenIdx === null || token === undefined || (token.pos & POS0) !== 助動詞) {
      return scan;
    }
    scan = tokenIdx + 1;
  }
}

function isKotoNounToken(token: ClauseToken): boolean {
  return (token.pos & POS0) === 名詞 && (token.surface === "こと" || token.surface === "事");
}

function isPotentialKotoDekiruParticleToken(token: ClauseToken): boolean {
  if ((token.pos & POS0) !== 助詞) {
    return false;
  }
  const pos1 = token.pos & POS1;
  return (token.surface === "が" && pos1 === 格助詞) ||
    (token.surface === "の" && pos1 === 格助詞) ||
    (token.surface === "は" && pos1 === 係助詞) ||
    (token.surface === "も" && pos1 === 係助詞);
}

function isPotentialDekiruToken(token: ClauseToken): boolean {
  return (token.pos & POS0) === 動詞 && isVerbLemma(token, "できる", "出来る");
}

function isPotentialDekiruInflection(token: ClauseToken): boolean {
  const pos5A = token.pos & POS5A;
  return pos5A === 終止形_ ||
    pos5A === 連体形_ ||
    pos5A === 連用形_ ||
    pos5A === 未然形_ ||
    pos5A === 仮定形_;
}

function isSahenSupportSuruToken(token: ClauseToken): boolean {
  return (token.pos & POS0) === 動詞 &&
    (token.dictionaryForm === "する" || token.dictionaryForm === "為る");
}

function isCausativeAuxToken(token: ClauseToken): boolean {
  return (token.pos & POS0) === 助動詞 &&
    (token.dictionaryForm === "せる" || token.dictionaryForm === "させる");
}

function isTeConnectiveToken(token: ClauseToken): boolean {
  return (token.pos & POS0) === 助詞 &&
    (token.surface === "て" || token.surface === "で");
}

function rangeHasHardTerminalPunctuation(tokens: readonly ClauseToken[], start: number, endInclusive: number): boolean {
  for (let tokenIdx = start; tokenIdx <= endInclusive; tokenIdx += 1) {
    if (isClauseHardTerminalPunctuationToken(tokens[tokenIdx])) {
      return true;
    }
  }
  return false;
}

function spanAnchor(start: number, endExclusive: number, clauseIndex: number | null): StructuralAnchor {
  return {
    kind: "span",
    span: tokenSpan(start, endExclusive),
    clauseId: clauseIndex === null || clauseIndex < 0 ? null : `clause:${clauseIndex}`,
  };
}

function tokenSpan(start: number, endExclusive: number): StructuralRelationTokenSpan {
  return { start, endExclusive };
}

function surfaceOf(tokens: readonly ClauseToken[], start: number, endExclusive: number): string {
  return tokens.slice(start, endExclusive).map((token) => token.surface).join("");
}
