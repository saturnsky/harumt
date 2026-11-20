import { nextNonSpaceIndex, previousNonSpaceIndex, utteranceClosedForAttributiveProjection, type UtteranceClosureRunEvidence } from "../clause-layout/index.js";
import { punctuatedAttributiveTargetAnchor } from "../clause-layout/nominal-anchors.js";
import type { Clause, ClauseLayout } from "../clause-layout/final-layout.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import type { PunctuatedAttributiveTargetClause } from "../clause-layout/nominal-anchor-evidence.js";
import { isClauseEvidenceTransparentPunctuation, isClauseHardTerminalPunctuationToken, isClauseOpeningPunctuationToken } from "../clause-layout/punctuation.js";
import { TokenCursor } from "../token-cursor.js";
import { IU_LEXEME_FORMS, NOMINAL_EXEMPLIFICATION_QUOTE_MARKERS } from "../head-tail/data/quoted-reporting-sets.js";
import { tokenMatchesConnectiveKind } from "../head-tail/tail/connective-span-scanner.js";
import type { ContentMap } from "../particles/index.js";
import { isNominalLike, POS01, POS0, pos0in, POS5A, 形容詞0, 助動詞, 動詞, 補助記号, 連体形_, 非自立可能, 終止形_, isPastAuxiliaryPos } from "../../types/pos.js";
import { isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../types/render-plan.js";
import { tailRootClosesWithCopulaAttributive } from "../head-tail/tail/predicate-root/inspect.js";
import type { SfpEffect } from "../head-tail/tail/predicate-root/grammar.js";
import type { StructuralRelationNode, StructuralRelation, StructuralRelationMarkerSpan, StructuralNominalExemplificationPayload, BuildStructuralRelationGraphOptions } from "./types.js";
import { predicateAnchor, nounPhraseAnchor } from "./relation-coordinates.js";
import { renderPlanTerminalSfp } from "./quote-relation-enrichment.js";

function punctuatedAttributiveTargetClauses(
  layout: ClauseLayout
): readonly PunctuatedAttributiveTargetClause[] {
  return layout.clauses.map((clause) => ({
    start: clause.start,
    end: clause.end,
    kind: clause.kind,
    parentIdx: clause.parentIdx,
    predicates: clause.predicates,
    particleIndices: clause.particleIndices,
    adverbialAdjunctIndices: clause.predicates.flatMap((predicateIdx) =>
      [...layout.adverbialAdjunctsOf(predicateIdx)]
    ),
  }));
}

export function collectPunctuatedAttributiveModifierRelations(
  options: BuildStructuralRelationGraphOptions,
  _nodes: readonly StructuralRelationNode[],
  quoteRelations: readonly StructuralRelation[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const { tokens, layout, contentMap, lookups } = options;
  for (let clauseIndex = 0; clauseIndex < layout.clauses.length - 1; clauseIndex += 1) {
    const sourceClause = layout.clauses[clauseIndex];
    const targetClause = layout.clauses[clauseIndex + 1];
    if (sourceClause === undefined || targetClause === undefined) {
      continue;
    }
    if (sourceClause.end !== targetClause.start || sourceClause.terminatedBy !== "punctuation") {
      continue;
    }
    const markerSpan = punctuationMarkerSpanAtClauseEnd(tokens, sourceClause);
    if (markerSpan === null) {
      continue;
    }
    const sourcePredicate = punctuatedAttributiveSourcePredicate(contentMap, sourceClause, markerSpan.start);
    if (sourcePredicate === null || !contentMap.has(sourcePredicate)) {
      continue;
    }
    if (!sourceClauseCanProjectPunctuatedAttributive(
      tokens,
      sourceClause,
      sourcePredicate,
      markerSpan.start,
      contentMap.get(sourcePredicate)?.renderPlan ?? null,
      {
        closureRun: layout.utteranceClosureRunAt(markerSpan.start) ?? null,
        sfpEffect: renderPlanTerminalSfp(contentMap.get(sourcePredicate)?.renderPlan ?? null)?.effect ?? null,
        closingEffects: lookups.SFP_UTTERANCE_CLOSING_EFFECTS
      }
    )) {
      continue;
    }
    if (targetClause.leadingConnectiveIdx !== null || targetClause.leadingQuoteMarkerIdx !== null) {
      continue;
    }
    const exemplification = nominalExemplificationCarrierEvidence(options, quoteRelations, sourceClause, sourcePredicate, markerSpan);
    const target = punctuatedAttributiveTargetAnchor(
      tokens,
      punctuatedAttributiveTargetClauses(layout),
      clauseIndex + 1,
      exemplification === null ? "salient_nominal" : "source_required_head"
    );
    if (target === null) {
      continue;
    }
    relations.push({
      kind: "punctuated_attributive_modifier",
      source: predicateAnchor(sourcePredicate, clauseIndex),
      target: nounPhraseAnchor(target),
      markerSpans: [markerSpan],
      ...(exemplification === null ? {} : {
        candidateSuppressibleTokenSpans: [
          { ...exemplification.quoteMarkerSpan, reason: "relation_marker" },
          ...(exemplification.exemplificationMarkerSpan === null
            ? []
            : [{ ...exemplification.exemplificationMarkerSpan, reason: "relation_marker" }]),
        ],
        nominalExemplification: exemplification,
      }),
      projection: {
        sourceForm: "attributive",
        targetSlot: "noun_modifier",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      provenance: "structural_relation_owner",
    });
  }
  return relations;
}

function nominalExemplificationCarrierEvidence(
  options: BuildStructuralRelationGraphOptions,
  quoteRelations: readonly StructuralRelation[],
  sourceClause: Clause,
  sourcePredicate: number,
  pauseMarkerSpan: StructuralRelationMarkerSpan,
): StructuralNominalExemplificationPayload | null {
  const { tokens, layout } = options;
  const quote = quoteRelations.find((relation) =>
    relation.quote !== undefined && relation.quote.hostMatch.hostIdx === sourcePredicate
  )?.quote;
  if (
    quote === undefined ||
    !IU_LEXEME_FORMS.has(quote.hostMatch.hostForm) ||
    !NOMINAL_EXEMPLIFICATION_QUOTE_MARKERS.has(quote.markerBaseSurface)
  ) {
    return null;
  }
  const ownsEventArgument = layout.argumentRolesOf(sourcePredicate).some(({ particleIdx }) =>
    !(quote.markerSpan.start <= particleIdx && particleIdx < quote.markerSpan.endExclusive) &&
    !(quote.contentSpan.start <= particleIdx && particleIdx < quote.contentSpan.endExclusive)
  );
  if (ownsEventArgument || layout.adverbialAdjunctsOf(sourcePredicate).length > 0) {
    return null;
  }
  const pastIdx = nextNonSpaceIndex(tokens, sourcePredicate + 1, sourceClause.end);
  const pastToken = pastIdx === null ? undefined : tokens[pastIdx];
  if (
    pastIdx === null || pastToken === undefined || !isPastAuxiliaryPos(pastToken.pos) ||
    nextNonSpaceIndex(tokens, pastIdx + 1, sourceClause.end) !== pauseMarkerSpan.start
  ) {
    return null;
  }
  let lastIdx = quote.contentSpan.endExclusive - 1;
  while (lastIdx >= quote.contentSpan.start) {
    const token = tokens[lastIdx];
    const closesQuote = layout.quoteSpans.some(([opening, closingIdx]) =>
      closingIdx === lastIdx && opening >= quote.contentSpan.start
    );
    if (
      token === undefined ||
      !(closesQuote || (
        (token.pos & POS0) === 補助記号 &&
        !isClauseHardTerminalPunctuationToken(token) &&
        !isClauseOpeningPunctuationToken(token)
      ))
    ) {
      break;
    }
    lastIdx -= 1;
  }
  const lastToken = tokens[lastIdx];
  if (lastToken === undefined || lastIdx < quote.contentSpan.start) {
    return null;
  }
  const exemplificationMarker = tokenMatchesConnectiveKind(lastToken, "exemplification") ? lastIdx : null;
  const headIdx = exemplificationMarker === null ? lastIdx : lastIdx - 1;
  const headToken = tokens[headIdx];
  if (
    headToken === undefined ||
    headIdx < quote.contentSpan.start ||
    !isNominalLike(headToken) ||
    layout.clauses.some((clause) => clause.predicates.includes(headIdx))
  ) {
    return null;
  }
  return {
    contentSpan: { start: quote.contentSpan.start, endExclusive: quote.contentSpan.endExclusive },
    quoteMarkerSpan: { start: quote.markerSpan.start, endExclusive: quote.markerSpan.endExclusive },
    hostIdx: quote.hostMatch.hostIdx,
    exemplificationMarkerSpan: exemplificationMarker === null
      ? null
      : { start: exemplificationMarker, endExclusive: exemplificationMarker + 1 },
  };
}

function punctuationMarkerSpanAtClauseEnd(
  tokens: readonly ClauseToken[],
  clause: Clause,
): StructuralRelationMarkerSpan | null {
  for (let index = clause.end - 1; index >= clause.start; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (!isClauseEvidenceTransparentPunctuation(token)) {
      return null;
    }
    return {
      start: index,
      endExclusive: index + 1,
      surface: token.surface,
      role: "punctuated_attributive_marker",
    };
  }
  return null;
}

function sourceClauseCanProjectPunctuatedAttributive(
  tokens: readonly ClauseToken[],
  clause: Clause,
  predicateIdx: number,
  markerStart: number,
  sourcePlan: RenderPlan | null,
  closure: {
    readonly closureRun: UtteranceClosureRunEvidence | null;
    readonly sfpEffect: SfpEffect | null;
    readonly closingEffects: ReadonlySet<string>;
  },
): boolean {
  const predicate = tokens[predicateIdx];
  if (predicate === undefined) {
    return false;
  }
  if (utteranceClosedForAttributiveProjection(
    closure.closureRun,
    closure.sfpEffect,
    closure.closingEffects
  )) {
    return false;
  }
  const last = previousNonSpaceIndex(tokens, markerStart, clause.start);
  const token = last === null ? undefined : tokens[last];
  if (token === undefined) {
    return false;
  }
  const predicatePos0 = predicate.pos & POS0;
  const pos5a = token.pos & POS5A;
  if (predicatePos0 === 動詞 || sourceClauseHasVerbPredicateTail(tokens, predicateIdx, markerStart)) {
    return pos5a === 終止形_ || pos5a === 連体形_;
  }
  if (
    predicatePos0 === 形容詞0 &&
    (last === predicateIdx || sourceClauseHasAdjectivePredicateTail(tokens, predicateIdx, markerStart))
  ) {
    return pos5a === 終止形_ || pos5a === 連体形_;
  }
  if (
    isPredicateHeadTailChainRenderPlan(sourcePlan) &&
    tailRootClosesWithCopulaAttributive(sourcePlan.realization.root)
  ) {
    return pos5a === 連体形_;
  }
  return false;
}

function punctuatedAttributiveSourcePredicate(
  contentMap: ContentMap,
  clause: Clause,
  markerStart: number,
): number | null {
  for (let index = clause.predicates.length - 1; index >= 0; index -= 1) {
    const predicateIdx = clause.predicates[index];
    if (predicateIdx !== undefined && predicateIdx < markerStart && contentMap.has(predicateIdx)) {
      return predicateIdx;
    }
  }
  return null;
}

function sourceClauseHasVerbPredicateTail(
  tokens: readonly ClauseToken[],
  predicateIdx: number,
  markerStart: number,
): boolean {
  const c = new TokenCursor(tokens, predicateIdx + 1, markerStart);
  while (c.current()) {
    const token = c.current()!;
    if (pos0in(token.pos, (1 << 補助記号))) {
      c.advance();
      continue;
    }
    if ((token.pos & POS0) === 動詞) {
      return true;
    }
    c.advance();
  }
  return false;
}

function sourceClauseHasAdjectivePredicateTail(
  tokens: readonly ClauseToken[],
  predicateIdx: number,
  markerStart: number,
): boolean {
  let sawTailToken = false;
  const c = new TokenCursor(tokens, predicateIdx + 1, markerStart);
  while (c.current()) {
    const token = c.current()!;
    if ((token.pos & POS0) === 助動詞 && token.dictionaryForm === "た") {
      sawTailToken = true;
      c.advance();
      continue;
    }
    if ((token.pos & POS01) === (形容詞0 | 非自立可能) && token.dictionaryForm === "ない") {
      sawTailToken = true;
      c.advance();
      continue;
    }
    return false;
  }
  return sawTailToken;
}
