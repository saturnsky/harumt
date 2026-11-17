import type { RenderPlan } from "../../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { ParsedTailRoot, TailRoot, VerbConjType } from "../tail/predicate-root/grammar.js";
import type { StemInput } from "../tail/predicate-root/parse-input.js";
import { parseTail } from "../tail/predicate-root/parser.js";
import type { LookupTables } from "../../lookup-tables.js";
import { isTameHead } from "../../lookup-tables.js";
import { auxHasNegation, collectAuxTokens } from "../../matchers.js";
import { TokenCursor } from "../../token-cursor.js";
import {
  caseParticleMarkerRelationForToken,
  nominalizerAdversativeConnectiveRelationAt,
  nominalizerReasonConnectiveRelationAt,
  predicateNominalizerRelationForToken,
  registeredClauseConnectiveRelationForToken
} from "../boundary/marker.js";
import {
  SEMANTIC_CARRIER_PREDICATES,
  type SemanticCarrierPredicateRealizationSpec,
  type SemanticCarrierPredicateSpec
} from "./semantic-carrier-predicate-table.js";
import { POS0, POS4, is五段, is上一段, is下一段, カ行変格, サ行変格, 助詞, 動詞, 名詞, 補助記号, 동사, 형용사 } from "../../../types/pos.js";
import { createTenseOp } from "../tail/predicate-root/op-builders.js";
import { cachedQuoteBindingForContentRoot } from "../../structural-relation/quote.js";

export type SemanticCarrierPredicateTailKind = "connective" | "tame" | "nominal_ga" | "terminal";

export interface SemanticCarrierPredicateDispatchResult {
  readonly koreanPos: typeof 동사 | typeof 형용사;
  readonly renderPlan: RenderPlan;
  readonly rule: string;
  readonly traceDetail: {
    readonly spec_id: string;
    readonly polarity: "affirmative" | "negative";
    readonly tail_kind: SemanticCarrierPredicateTailKind;
  };
}

export function tryBuildSemanticCarrierPredicateDispatchCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): SemanticCarrierPredicateDispatchResult | null {
  for (const spec of SEMANTIC_CARRIER_PREDICATES) {
    const result = cursor.tx(c => tryBuildSemanticCarrierPredicateForSpec(c, spec, lookups));
    if (result !== null) {
      return result;
    }
  }
  return null;
}

function tryBuildSemanticCarrierPredicateForSpec(
  cursor: TokenCursor<RuntimeHaruToken>,
  spec: SemanticCarrierPredicateSpec,
  lookups: LookupTables
): SemanticCarrierPredicateDispatchResult | null {
  const { tokens, pos: index, end: limit } = cursor;
  const carrier = tokens[index];
  if (carrier === undefined || index + 2 >= limit || !matchesCarrier(spec, carrier)) {
    return null;
  }
  const particle = tokens[index + 1];
  if (
    caseParticleMarkerRelationForToken(particle, index + 1, {
      acceptedSurfaces: [spec.particle],
      consumers: ["semantic_carrier_predicate"]
    }) === null
  ) {
    return null;
  }
  const predicate = tokens[index + 2];
  if (predicate === undefined || (predicate.pos & POS0) !== 動詞 || !spec.predicateForms.includes(predicate.dictionaryForm)) {
    return null;
  }

  cursor.advance(3);
  const auxTokens = collectAuxTokens(cursor) as readonly RuntimeHaruToken[];
  const negative = auxHasNegation(auxTokens);
  const realization = negative ? spec.negative : spec.affirmative;
  let tailKind: SemanticCarrierPredicateTailKind;
  let rootEndExclusive = cursor.pos;

  if (matchSemanticCarrierPredicateConnective(cursor, auxTokens)) {
    rootEndExclusive = cursor.pos;
    tailKind = "connective";
  } else if (cursor.pos < limit && isTameHead(tokens[cursor.pos])) {
    cursor.advance();
    tailKind = "tame";
  } else {
    if (matchNominalGaTail(cursor)) {
      tailKind = "nominal_ga";
    } else {
      if (cursor.pos < limit && ((tokens[cursor.pos]?.pos ?? 0) & POS0) !== 補助記号) {
        return null;
      }
      tailKind = "terminal";
    }
  }

  const polarity = negative ? "negative" : "affirmative";
  const root = buildSemanticCarrierPredicateRoot({
    spec,
    tokens,
    predicateIndex: index + 2,
    rootEndExclusive,
    realization,
    absorbNegativeAux: polarity === "negative" && realization.absorbNegativeAux === true,
    predicate
  }, lookups);
  if (root === null) {
    return null;
  }
  return {
    koreanPos: realization.koreanPos,
    rule: `semantic_carrier_predicate:${spec.id}`,
    traceDetail: {
      spec_id: spec.id,
      polarity,
      tail_kind: tailKind
    },
    renderPlan: buildSemanticCarrierPredicateRenderPlan({
      spec,
      realization,
      carrier,
      polarity,
      tailKind,
      root
    })
  };
}

function matchesCarrier(spec: SemanticCarrierPredicateSpec, token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 名詞 &&
    (
      spec.carrierReadings.includes(token.reading) ||
      spec.carrierForms.includes(token.surface) ||
      spec.carrierForms.includes(token.dictionaryForm)
    );
}

function matchSemanticCarrierPredicateConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  auxTokens: readonly RuntimeHaruToken[]
): boolean {
  void auxTokens;
  const { tokens, pos, end: limit } = cursor;
  const registered = registeredClauseConnectiveRelationForToken(tokens[pos], pos, {
    consumers: ["semantic_carrier_predicate"]
  });
  if (registered !== null && registered.span.endExclusive <= limit) {
    cursor.advance(registered.span.endExclusive - pos);
    return true;
  }
  const reason = nominalizerReasonConnectiveRelationAt(tokens, pos, {
    consumers: ["semantic_carrier_predicate"]
  });
  if (reason !== null && reason.span.endExclusive <= limit) {
    cursor.advance(reason.span.endExclusive - pos);
    return true;
  }
  const adversative = nominalizerAdversativeConnectiveRelationAt(tokens, pos, {
    consumers: ["semantic_carrier_predicate"]
  });
  if (adversative !== null && adversative.span.endExclusive <= limit) {
    cursor.advance(adversative.span.endExclusive - pos);
    return true;
  }
  return false;
}

function matchNominalGaTail(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const { tokens, pos, end: limit } = cursor;
  if (pos + 1 >= limit) {
    return false;
  }
  const no = tokens[pos];
  const ga = tokens[pos + 1];
  if (predicateNominalizerRelationForToken(no, pos, {
    requirement: "strict_particle",
    consumers: ["semantic_carrier_predicate"]
  })?.nominalizerKind === "no" &&
    ga?.surface === "が" &&
    (ga.pos & POS0) === 助詞) {
    cursor.advance(2);
    return true;
  }
  return false;
}

function buildSemanticCarrierPredicateRenderPlan(options: {
  readonly spec: SemanticCarrierPredicateSpec;
  readonly realization: SemanticCarrierPredicateRealizationSpec;
  readonly carrier: RuntimeHaruToken;
  readonly polarity: "affirmative" | "negative";
  readonly tailKind: SemanticCarrierPredicateTailKind;
  readonly root: TailRoot;
}): RenderPlan {
  return {
    kind: "semanticCarrierPredicate",
    specId: options.spec.id,
    carrierToken: options.carrier,
    polarity: options.polarity,
    prefix: options.realization.prefix,
    koreanPos: options.realization.koreanPos,
    tailKind: options.tailKind,
    root: options.root
  };
}

function buildSemanticCarrierPredicateRoot(options: {
  readonly spec: SemanticCarrierPredicateSpec;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly predicateIndex: number;
  readonly rootEndExclusive: number;
  readonly realization: SemanticCarrierPredicateRealizationSpec;
  readonly absorbNegativeAux: boolean;
  readonly predicate: RuntimeHaruToken;
}, lookups: LookupTables): TailRoot | null {
  const parseTokens = options.tokens.slice(options.predicateIndex, options.rootEndExclusive);
  if (parseTokens.length === 0) {
    return null;
  }
  const stemKind = options.realization.koreanPos === 형용사 ? "adj" : "verb";
  const stem: StemInput = {
    kind: stemKind,
    lemma: options.realization.lemma,
    irregular: options.realization.irregular,
    ...(stemKind === "verb" ? { conj: mapConjType(options.predicate.pos & POS4) } : {}),
    commitment: options.absorbNegativeAux ? "suppletive_negation" : "resolved_sense",
    sourcePredicateShape: "verb"
  };
  const parsed = parseTail({
    tokens: parseTokens,
    start: 0,
    stem,
    lookups,
    streamStart: options.predicateIndex
  });
  if (!parsed.ok || parsed.consumed !== parseTokens.length) {
    return null;
  }
  const stagedRoot = options.absorbNegativeAux
    ? removeFirstSemanticCarrierNegation(parsed.root)
    : parsed.root;
  return {
    ...stagedRoot,
    quoteBinding: cachedQuoteBindingForContentRoot(
      options.tokens,
      options.predicateIndex,
      options.rootEndExclusive - 1,
    ),
  };
}

function removeFirstSemanticCarrierNegation(root: ParsedTailRoot): ParsedTailRoot {
  const removed = removeFirstSemanticCarrierNegationFromTail(root.tail);
  return removed.changed ? { ...root, tail: removed.node } : root;
}

function removeFirstSemanticCarrierNegationFromTail(
  node: TailRoot["tail"]
): { readonly node: TailRoot["tail"]; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = removeFirstSemanticCarrierNegationFromTail(node.inner);
    if (inner.changed) {
      return { node: { ...node, inner: inner.node as typeof node.inner }, changed: true };
    }
    const outer = removeFirstSemanticCarrierNegationFromTail(node.outer);
    return outer.changed
      ? { node: { ...node, outer: outer.node }, changed: true }
      : { node, changed: false };
  }
  const negationIndex = node.ops.findIndex((op) => op.kind === "negation");
  if (negationIndex < 0) {
    return { node, changed: false };
  }
  const negation = node.ops[negationIndex];
  if (negation?.kind !== "negation") {
    return { node, changed: false };
  }
  const ops = node.ops.filter((_, index) => index !== negationIndex);
  if (negation.chainPast && !ops.some((op) => op.kind === "tense" && op.tense === "past")) {
    ops.splice(negationIndex, 0, createTenseOp({

      source: negation.source,
      tense: "past"
    }));
  }
  return { node: { ...node, ops }, changed: true };
}

function mapConjType(jpConj: number): VerbConjType {
  if (jpConj === 0) {
    return "irregular";
  }
  if (is五段(jpConj)) {
    return "godan";
  }
  if (is上一段(jpConj) || is下一段(jpConj)) {
    return "ichidan";
  }
  if (jpConj === サ行変格) {
    return "sahen";
  }
  if (jpConj === カ行変格) {
    return "kahen";
  }
  return "irregular";
}
