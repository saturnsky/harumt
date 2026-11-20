
import {
  type RuntimeHaruToken,
  splitBoundaryRuntimeStateForPieces,
  rewriteRuntimeTokenSurface
} from "../../types/token.js";
import { SEPARATION_BREAKS_MORPHEME_CHAIN, separatedAs } from "../clause-layout/trivia.js";
import type { LookupTables } from "../lookup-tables.js";
import { POS01, 形容詞0, 形容詞4, 連用形_一般, 非自立可能, 動詞_非自立可能 } from "../../types/pos.js";
import { isFusedNegativeStateChangeVerbToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { dewaScopeBridgeRelationAt } from "../head-tail/boundary/marker.js";

export function expandCopulaFocusFusedNegativeStateChange(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  const fusedIndices = new Set<number>();
  for (let index = 0; index < tokens.length; index += 1) {
    const bridge = dewaScopeBridgeRelationAt(tokens, index);
    if (bridge === null) {
      continue;
    }
    const body = tokens[bridge.span.endExclusive];
    if (
      body !== undefined &&
      !separatedAs(tokens, bridge.span.endExclusive, SEPARATION_BREAKS_MORPHEME_CHAIN) &&
      isFusedNegativeStateChangeVerbToken(body, lookups) &&
      body.surface.startsWith(FUSED_NEGATIVE_RENYOU_SURFACE) &&
      body.surface.length > FUSED_NEGATIVE_RENYOU_SURFACE.length
    ) {
      fusedIndices.add(bridge.span.endExclusive);
    }
  }
  for (const [index, token] of tokens.entries()) {
    if (!fusedIndices.has(index)) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(...splitFusedNegativeStateChangeToken(token));
  }
  return dirty ? result : [...tokens];
}

function splitFusedNegativeStateChangeToken(token: RuntimeHaruToken): readonly RuntimeHaruToken[] {
  const stateChangeLemma = (token.dictionaryForm || token.surface)
    .slice(FUSED_NEGATIVE_RENYOU_SURFACE.length);
  const stateChange = rewriteRuntimeTokenSurface(token, {
    kind: "remove_prefix",
    prefix: FUSED_NEGATIVE_RENYOU_SURFACE
  });
  const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(stateChange);
  const negationPiece: Record<string, unknown> = {
    ...head,
    surface: FUSED_NEGATIVE_RENYOU_SURFACE,
    dictionaryForm: FUSED_NEGATIVE_RENYOU_LEMMA,
    reading: FUSED_NEGATIVE_RENYOU_READING,
    dictionaryFormReading: FUSED_NEGATIVE_RENYOU_LEMMA_READING,
    pos: 形容詞0 | 非自立可能 | 形容詞4 | 連用形_一般,
    dictionaryId: 0,
    syntheticReason: "copula_focus_fused_negative_state_change:naku"
  };
  delete negationPiece.longVowelReduction;
  delete negationPiece.normalizedForm;
  const stateChangePiece: Record<string, unknown> = {
    ...inner,
    ...tail,
    dictionaryForm: stateChangeLemma,
    ...(token.reading !== undefined && token.reading.length > FUSED_NEGATIVE_RENYOU_READING.length &&
      token.reading.startsWith(FUSED_NEGATIVE_RENYOU_READING)
      ? { reading: token.reading.slice(FUSED_NEGATIVE_RENYOU_READING.length) }
      : {}),
    ...(token.dictionaryFormReading !== undefined &&
      token.dictionaryFormReading.startsWith(FUSED_NEGATIVE_RENYOU_READING)
      ? { dictionaryFormReading: token.dictionaryFormReading.slice(FUSED_NEGATIVE_RENYOU_READING.length) }
      : {}),
    pos: (token.pos & ~POS01) | 動詞_非自立可能,
    dictionaryId: 0,
    syntheticReason: "copula_focus_fused_negative_state_change:naru"
  };
  delete stateChangePiece.normalizedForm;
  return [
    negationPiece as unknown as RuntimeHaruToken,
    stateChangePiece as unknown as RuntimeHaruToken
  ];
}

const FUSED_NEGATIVE_RENYOU_SURFACE = "なく";
const FUSED_NEGATIVE_RENYOU_READING = "ナク";
const FUSED_NEGATIVE_RENYOU_LEMMA = "ない";
const FUSED_NEGATIVE_RENYOU_LEMMA_READING = "ナイ";
