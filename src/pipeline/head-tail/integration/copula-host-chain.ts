import type { RuntimeHaruToken } from "../../../types/token.js";
import type { LookupTables } from "../../lookup-tables.js";
import { 名詞_普通名詞 } from "../../../types/pos.js";
import { parseTail } from "../tail/predicate-root/parser.js";
import type { AuxLayerNode, AuxOpNode, OpSource, SourcePredicateShape, TailRoot } from "../tail/predicate-root/grammar.js";
import { firstAuxLayer } from "../tail/predicate-root/inspect.js";
import { probeProductionDispatch } from "../tail/predicate-root/production-registry.js";
import { cachedQuoteBindingForContentRoot } from "../../structural-relation/quote.js";

export interface CopulaHostChainInput {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly limit: number;
  readonly copulaStart: number;
  readonly chainEndExclusive: number;
  readonly stemSpan: { readonly start: number; readonly endExclusive: number };
  readonly hostHeadIdx: number;
  readonly sourcePredicateShape: SourcePredicateShape;
  readonly syntheticReason: string;
  readonly lookups: LookupTables;
  readonly acceptLeadingCopula?: (op: AuxOpNode) => boolean;
}

export interface CopulaHostChain {
  readonly consumed: number;
  readonly root: TailRoot;
  readonly layer: AuxLayerNode;
  readonly contentEnd: number;
  readonly familyId: string;
}

export function tryBuildCopulaHostChain(input: CopulaHostChainInput): CopulaHostChain | null {
  const { tokens, copulaStart, stemSpan } = input;
  const limit = Math.min(input.chainEndExclusive, input.limit);
  if (copulaStart >= limit || stemSpan.endExclusive > copulaStart) {
    return null;
  }
  const stemTokens = tokens.slice(stemSpan.start, stemSpan.endExclusive);
  if (stemTokens.length === 0) {
    return null;
  }
  const stemSourceOverride: OpSource = {
    tokens: stemTokens,
    tokenIndices: rangeIndices(stemSpan.start, stemSpan.endExclusive)
  };
  const syntheticStem = syntheticHostStemToken(stemTokens, input.syntheticReason);
  const parseSlice = [syntheticStem, ...tokens.slice(copulaStart, limit)];
  const parsed = parseTail({
    tokens: parseSlice,
    start: 0,
    stem: {
      kind: "noun",
      lemma: syntheticStem.surface,
      sourcePredicateShape: input.sourcePredicateShape
    },
    lookups: input.lookups,
    contextTokens: tokens,
    sourceIndexMap: [input.hostHeadIdx, ...rangeIndices(copulaStart, limit)],
    stemSourceOverride
  });
  if (!parsed.ok || parsed.consumed <= 1 || copulaStart + (parsed.consumed - 1) !== limit) {
    return null;
  }
  const layer = firstAuxLayer(parsed.root.tail);
  if (layer === null) {
    return null;
  }
  const leadingCopula = layer.ops[0];
  if (leadingCopula === undefined || leadingCopula.kind !== "copula") {
    return null;
  }
  if (input.acceptLeadingCopula !== undefined && !input.acceptLeadingCopula(leadingCopula)) {
    return null;
  }
  const consumed = parsed.consumed - 1;
  const contentEnd = copulaStart + consumed - 1;
  const root: TailRoot = {
    ...parsed.root,
    quoteBinding: cachedQuoteBindingForContentRoot(tokens, input.hostHeadIdx, contentEnd)
  };
  const dispatch = probeProductionDispatch(root, { intake: { site: "committed_render", partial: false } });
  if (dispatch.kind !== "registry") {
    return null;
  }
  return { consumed, root, layer, contentEnd, familyId: dispatch.match.familyId };
}

function syntheticHostStemToken(
  stemTokens: readonly RuntimeHaruToken[],
  syntheticReason: string
): RuntimeHaruToken {
  const surface = stemTokens.map((token) => token.surface).join("");
  return {
    surface,
    dictionaryForm: surface,
    reading: "",
    dictionaryFormReading: "",
    pos: 名詞_普通名詞,
    dictionaryId: 0,
    syntheticReason
  };
}

export function rangeIndices(start: number, endExclusive: number): readonly number[] {
  const indices: number[] = [];
  for (let idx = start; idx < endExclusive; idx += 1) {
    indices.push(idx);
  }
  return indices;
}
