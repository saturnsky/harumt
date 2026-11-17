import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { POS0, POS1, POS01, 助動詞語幹, 助詞_副助詞, 動詞, 名詞 } from "../../../../../types/pos.js";
import { caseParticleMarkerRelationForToken, topicFocusMarkerRelationForToken } from "../../../boundary/marker.js";
import {
  type OpSource,
  type PostverbAuxiliaryOp,
  type PostverbAuxiliaryPayload,
  type PostverbHedgeFocus
} from "../grammar.js";
import { isTeAuxActivationAccepted } from "../postverb-auxiliary-parser.js";
import { srcSlice } from "../source.js";
import { EPISTEMIC_HEDGE_CARRIERS } from "../epistemic-hedge-carrier-table.js";
import { isAdnominalCopulaToken, isLikenessModalAdnominalTailEnd } from "../classifiers/tokens.js";
import { createPostverbAuxiliaryOp } from "../op-builders.js";

export function buildEpistemicHedgePostverbOp(
  source: OpSource,
  spec: (typeof EPISTEMIC_HEDGE_CARRIERS)[number],
  projection: NonNullable<PostverbAuxiliaryPayload["hedgeProjection"]>,
  focus: PostverbHedgeFocus | null,
  potential: boolean
): PostverbAuxiliaryOp {
  return createPostverbAuxiliaryOp({

    auxiliary: {
      kind: "epistemic_hedge",
      hedgePrefixKind: spec.prefixKind,
      hedgeProjection: projection,
      hedgeTailLemma: spec.tailLemma,
      hedgeTailKoreanPos: spec.tailKoreanPos,
      hedgeTailIrregular: spec.tailIrregular ?? null,
      ...(focus === null ? {} : { hedgeFocus: focus }),
      ...(potential ? { hedgePotential: true } : {})
    },
    source
  });
}

export interface EpistemicHedgeCarrierShape {
  readonly spec: (typeof EPISTEMIC_HEDGE_CARRIERS)[number];
  readonly focus: PostverbHedgeFocus | null;
  readonly potential: boolean;
  readonly consumedAfterNoun: number;
}

export function matchEpistemicHedgeCarrierShapeAtHead(
  tokens: readonly RuntimeHaruToken[],
  nounIdx: number
): EpistemicHedgeCarrierShape | null {
  const noun = tokens[nounIdx];
  if (noun === undefined || (noun.pos & POS0) !== 名詞) {
    return null;
  }
  const form = noun.dictionaryForm || noun.surface;
  const likenessPrefix = isLikenessModalAdnominalTailEnd(tokens, nounIdx - 1);
  for (const spec of EPISTEMIC_HEDGE_CARRIERS) {
    if (spec.nounDf !== form) {
      continue;
    }
    if (spec.requiresLikenessPrefix === true && !likenessPrefix) {
      continue;
    }
    const shape = matchCarrierFrameSlots(tokens, nounIdx, spec);
    if (shape !== null) {
      return shape;
    }
  }
  return null;
}

function matchCarrierFrameSlots(
  tokens: readonly RuntimeHaruToken[],
  nounIdx: number,
  spec: (typeof EPISTEMIC_HEDGE_CARRIERS)[number]
): EpistemicHedgeCarrierShape | null {
  let cursor = nounIdx + 1;
  const caseRelation = caseParticleMarkerRelationForToken(tokens[cursor], cursor, {
    acceptedSurfaces: spec.caseParticles,
    consumers: ["tail_boundary_readiness"]
  });
  const hasCase = caseRelation !== null;
  if (hasCase) {
    cursor += 1;
  }
  const focusRelation = topicFocusMarkerRelationForToken(tokens[cursor], cursor, {
    consumers: ["tail_boundary_readiness"]
  });
  const focus: PostverbHedgeFocus | null = focusRelation === null ? null : focusRelation.focusKind;
  if (focusRelation !== null) {
    cursor += 1;
  }
  if (spec.focusPlacement === "replaces_case") {
    if (hasCase && focus !== null) {
      return null;
    }
    if (!hasCase && focus === null && !spec.allowsCaseOmission) {
      return null;
    }
  } else if (!hasCase) {
    return null;
  }
  const predicate = tokens[cursor];
  if (predicate === undefined || (predicate.pos & POS0) !== 動詞) {
    return null;
  }
  const potential = predicate.dictionaryForm === spec.potentialPredicate;
  if (
    (predicate.dictionaryForm !== spec.predicate && !potential) ||
    !isTeAuxActivationAccepted(predicate, tokens[cursor + 1])
  ) {
    return null;
  }
  return { spec, focus, potential, consumedAfterNoun: cursor + 1 - (nounIdx + 1) };
}

export function matchEpistemicHedgePostverbAuxiliary(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly op: PostverbAuxiliaryOp; readonly consumed: number } | null {
  let nounPos = pos;
  let projection: PostverbAuxiliaryPayload["hedgeProjection"] = "attributive_like";
  let requireQuotativeCarrier = false;

  if (isSouNaHedgeProjectionStart(tokens, pos)) {
    nounPos = pos + 2;
    projection = "sou_appearance";
  } else if (isBareTteHedgeProjectionStart(tokens, pos)) {
    nounPos = pos + 1;
    projection = "quotative_attributive";
    requireQuotativeCarrier = true;
  } else if (tokens[pos] !== undefined && isAdnominalCopulaToken(tokens[pos])) {
    nounPos = pos + 1;
  }

  const shape = matchEpistemicHedgeCarrierShapeAtHead(tokens, nounPos);
  if (shape === null) {
    return null;
  }
  if (requireQuotativeCarrier && shape.spec.acceptsQuotative !== true) {
    return null;
  }

  const consumed = nounPos + 1 + shape.consumedAfterNoun - pos;
  return {
    op: buildEpistemicHedgePostverbOp(
      srcSlice(tokens, pos, consumed),
      shape.spec,
      projection,
      shape.focus,
      shape.potential
    ),
    consumed
  };
}

function isSouNaHedgeProjectionStart(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const sou = tokens[pos];
  const na = tokens[pos + 1];
  return sou !== undefined &&
    sou.surface === "そう" &&
    (sou.pos & POS1) === 助動詞語幹 &&
    na !== undefined &&
    isAdnominalCopulaToken(na);
}

function isBareTteHedgeProjectionStart(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const tte = tokens[pos];
  return tte !== undefined &&
    tte.surface === "って" &&
    (tte.pos & POS01) === 助詞_副助詞;
}
