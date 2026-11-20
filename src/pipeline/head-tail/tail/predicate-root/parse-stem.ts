import type { RuntimeHaruToken } from "../../../../types/token.js";
import { previousNonSpaceIndex } from "../../../clause-layout/trivia.js";
import type { AuxOpNode, OpSource, StemMood, StemNode } from "./grammar.js";
import type { ParseInput, StemInput } from "./parse-input.js";
import { stemSupportsProjectionCategory } from "./inspect.js";
import { POS0, isIAdjectivePredicateToken, isVerbPredicateToken, isVolitionalInflection, 接頭辞 } from "../../../../types/pos.js";
import { sourceIndexForInputPosition } from "./parse-coordinates.js";

export function precedingPrefixFormForStem(input: ParseInput): string | null {
  const tokens = input.contextTokens ?? input.tokens;
  const stemIdx = sourceIndexForInputPosition(input, input.start);
  const prefixIdx = previousNonSpaceIndex(tokens, stemIdx, 0);
  const prefix = prefixIdx === null ? undefined : tokens[prefixIdx];
  return prefix !== undefined && (prefix.pos & POS0) === 接頭辞
    ? (prefix.dictionaryForm || prefix.surface)
    : null;
}

export function inflectionCarriesVolitionalSpeechAct(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && isVerbPredicateToken(token) && isVolitionalInflection(token.pos);
}

export function previousOpsHaveExperiencePastAttributive(ops: readonly AuxOpNode[]): boolean {
  const last = ops.length > 0 ? ops[ops.length - 1] : undefined;
  if (last?.kind === "tense" && last.tense === "past") {
    return true;
  }
  if (last?.kind === "negation" && last.chainPast) {
    return true;
  }
  return false;
}

export function isAdjLikeStemNode(stem: StemNode): boolean {
  return stemSupportsProjectionCategory(stem, "adjectival_predicate");
}

export function isVerbLikeStemNode(stem: StemNode): boolean {
  return stemSupportsProjectionCategory(stem, "verbal_predicate");
}

export function isNounLikeStemNode(stem: StemNode): boolean {
  return stemSupportsProjectionCategory(stem, "nominal");
}

export function materializeStemMood(stem: StemNode): StemNode {
  const stemMood = inflectionStemMood(stem.source.tokens[stem.conjugationAnchor]);
  return stemMood === undefined ? stem : { ...stem, stemMood };
}

export function inflectionStemMood(sourceToken: RuntimeHaruToken | undefined): StemMood | undefined {
  if (sourceToken === undefined || !isVolitionalInflection(sourceToken.pos)) {
    return undefined;
  }
  if (inflectionCarriesVolitionalSpeechAct(sourceToken)) {
    return "volitional";
  }
  if (isIAdjectivePredicateToken(sourceToken)) {
    return "conjectural";
  }
  return undefined;
}

export function assertStemAnchorBounds(
  source: OpSource,
  conjugationAnchor: number,
  semanticAnchors: readonly number[]
): void {
  const finalLen = source.tokens.length;
  if (conjugationAnchor < 0 || conjugationAnchor >= finalLen) {
    throw new Error(
      `relocateRoot: conjugationAnchor ${conjugationAnchor} out of bounds [0, ${finalLen}) — anchor invariant 위반`
    );
  }
  for (const idx of semanticAnchors) {
    if (idx < 0 || idx >= finalLen) {
      throw new Error(
        `relocateRoot: semanticAnchors index ${idx} out of bounds [0, ${finalLen}) — anchor invariant 위반`
      );
    }
  }
}

export function opLastSourceToken(op: AuxOpNode): RuntimeHaruToken | undefined {
  const src = op.source.tokens;
  return src.length > 0 ? src[src.length - 1] : undefined;
}

export function buildStemNode(
  stem: StemInput,
  sourceToken: RuntimeHaruToken,
  stemPos: number,
  headHypothesis: ParseInput["headHypothesis"]
): StemNode {
  const source: OpSource = { tokens: [sourceToken], tokenIndices: [stemPos] };
  const conjugationAnchor = 0;
  const semanticAnchors: readonly number[] = [0];
  if (stem.kind === "candidateSet") {
    const candidateHeadHypothesis = stem.headHypothesis ?? headHypothesis;
    return {
      kind: "candidateSet",
      candidates: stem.candidates,
      ...(candidateHeadHypothesis === undefined ? {} : { headHypothesis: candidateHeadHypothesis }),
      source,
      conjugationAnchor,
      semanticAnchors,
      ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
      ...(stem.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: stem.shortNegationPolicy }),
      ...(stem.absorbedPassiveAux === true ? { absorbedPassiveAux: true as const } : {}),
      ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
      ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
      ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
    };
  }
  if (stem.kind === "verb") {
    return {
      kind: "verb",
      lemma: stem.lemma,
      conj: stem.conj ?? "godan",
      irregular: stem.irregular,
      source,
      conjugationAnchor,
      semanticAnchors,
      ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
      ...(stem.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: stem.shortNegationPolicy }),
      ...(stem.absorbedPassiveAux === true ? { absorbedPassiveAux: true as const } : {}),
      ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
      ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
      ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
    };
  }
  if (stem.kind === "noun") {
    return {
      kind: "noun",
      lemma: stem.lemma,
      sahen: stem.sahen ?? false,
      source,
      conjugationAnchor,
      semanticAnchors,
      ...(stem.numericBase === undefined ? {} : { numericBase: stem.numericBase }),
      ...(stem.pronominalNoHeadBase === undefined ? {} : { pronominalNoHeadBase: stem.pronominalNoHeadBase }),
      ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
      ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
      ...(stem.nominalTargetForVerbalSource === true
        ? { nominalTargetForVerbalSource: true as const }
        : {}),
      ...(stem.interjection === undefined ? {} : { interjection: stem.interjection }),
      ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
      ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
    };
  }
  if (stem.kind === "adverb") {
    return {
      kind: "adverb",
      lemma: stem.lemma,
      source,
      conjugationAnchor,
      semanticAnchors,
      ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
      ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
      ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
      ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
    };
  }
  return {
    kind: "adj",
    lemma: stem.lemma,
    irregular: stem.irregular,
    source,
    conjugationAnchor,
    semanticAnchors,
    ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
    ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
    ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
    ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
  };
}
