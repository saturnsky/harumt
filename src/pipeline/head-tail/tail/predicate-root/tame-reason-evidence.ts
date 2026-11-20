import type { RuntimeHaruToken } from "../../../../types/token.js";
import {
  POS0,
  POS1,
  POS2,
  POS4,
  isAdjectivalDerivationalSuffix,
  isRareruAuxiliaryToken,
  サ変可能,
  助動詞_タ,
  名詞,
  形容詞0,
  非自立可能
} from "../../../../types/pos.js";
import type { LookupTables } from "../../../lookup-tables.js";
import { previousNonSpaceIndex } from "../../../clause-layout/trivia.js";
import { caseParticleMarkerRelationForToken } from "../../boundary/marker.js";
import { projectionOpIsNegation } from "../../head/capability.js";
import type { AuxOpNode, TailRoot } from "./grammar.js";
import { auxOpsInTailNode, firstAuxLayer } from "./inspect.js";
import {
  isAdnominalCopulaToken,
  isNaiOrNuToken
} from "./classifiers/tokens.js";

export type TameReasonNegationPolicy =
  | "strict_negation_op"
  | "projection_negation";

export function tailOpsPreferTameReason(options: {
  readonly ops: readonly AuxOpNode[];
  readonly tokens: readonly RuntimeHaruToken[];
  readonly tameIndex: number;
  readonly lookups: LookupTables;
  readonly stemLemma: string | undefined;
  readonly negationPolicy: TameReasonNegationPolicy;
  readonly adnominal?: boolean;
}): boolean {
  if (options.ops.some((op) =>
    tameReasonOpEvidence(op, options.negationPolicy)
  )) {
    return true;
  }

  const prevIdx = previousNonSpaceIndex(options.tokens, options.tameIndex);
  const prev = prevIdx === null ? undefined : options.tokens[prevIdx];
  const prevLemma = prev?.dictionaryForm || prev?.surface;
  if (prev !== undefined) {
    const prevPos4 = prev.pos & POS4;
    if (prevPos4 === 助動詞_タ || isNaiOrNuToken(prev)) {
      return true;
    }
    if (isAdnominalCopulaToken(prev)) {
      return true;
    }
    if ((prev.pos & POS0) === 形容詞0 && (prev.pos & POS1) !== 非自立可能) {
      return true;
    }
    if (isAdjectivalDerivationalSuffix(prev)) {
      return true;
    }
    if (
      isRareruAuxiliaryToken(prev) &&
      options.adnominal !== true &&
      !tameTakesNi(options.tokens, options.tameIndex)
    ) {
      return true;
    }
  }
  if (prevLemma !== undefined && options.lookups.TAME_REASON_PREDICATES.has(prevLemma)) {
    return true;
  }
  if (
    prevLemma !== undefined &&
    benefactivePotentialReasonVerbForms.has(prevLemma)
  ) {
    return true;
  }
  if (prevLemma === "する") {
    const suruNoun = previousSahenNounBefore(options.tokens, options.tameIndex);
    if (suruNoun !== null && options.lookups.TAME_REASON_SURU_NOUNS.has(suruNoun)) {
      return true;
    }
  }

  return options.stemLemma !== undefined &&
    options.lookups.TAME_REASON_PREDICATES.has(options.stemLemma);
}

function tameTakesNi(tokens: readonly RuntimeHaruToken[], tameIndex: number): boolean {
  return caseParticleMarkerRelationForToken(tokens[tameIndex + 1], tameIndex + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_multi_clause"]
  }) !== null;
}

function tameReasonOpEvidence(op: AuxOpNode, negationPolicy: TameReasonNegationPolicy): boolean {
  return (negationPolicy === "projection_negation" ? projectionOpIsNegation(op) : op.kind === "negation") ||
    (op.kind === "tense" && op.tense === "past") ||
    (op.kind === "idiom" && op.idiom === "potential_koto_ga_dekiru") ||
    (op.kind === "voice" && op.voice === "potential") ||
    (op.kind === "aspect" && benefactivePotentialAspectKinds.has(op.aspect));
}

const benefactivePotentialAspectKinds = new Set([
  "te_moraeru",
  "te_itadakeru"
]);

const benefactivePotentialReasonVerbForms = new Set([
  "もらえる",
  "いただける",
  "頂ける",
  "下さる",
  "くださる"
]);

function previousSahenNounBefore(tokens: readonly RuntimeHaruToken[], pos: number): string | null {
  const suruIdx = previousNonSpaceIndex(tokens, pos);
  if (suruIdx === null) {
    return null;
  }
  const suru = tokens[suruIdx];
  if ((suru?.dictionaryForm || suru?.surface) !== "する") {
    return null;
  }
  if (suruIdx <= 0) {
    return null;
  }
  const nounIdx = previousNonSpaceIndex(tokens, suruIdx);
  const token = nounIdx === null ? undefined : tokens[nounIdx];
  if (token !== undefined && (token.pos & (POS0 | POS2)) === (名詞 | サ変可能)) {
    return token.dictionaryForm || token.surface;
  }
  return null;
}

export function tailPredicateHostPrefersTameReason(options: {
  readonly root: TailRoot;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly tameIndex: number;
  readonly lookups: LookupTables;
  readonly adnominal?: boolean;
}): boolean {
  const ops = auxOpsInTailNode(options.root.tail);
  const layer = firstAuxLayer(options.root.tail);
  const stemLemma = layer?.stem.kind === "candidateSet" ? undefined : layer?.stem.lemma;
  return tailOpsPreferTameReason({
    ops,
    tokens: options.tokens,
    tameIndex: options.tameIndex,
    lookups: options.lookups,
    stemLemma,
    negationPolicy: "projection_negation",
    ...(options.adnominal === undefined ? {} : { adnominal: options.adnominal })
  });
}
