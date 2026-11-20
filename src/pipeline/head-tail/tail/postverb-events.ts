
import type { LookupTables } from "../../lookup-tables.js";
import {
  caseParticleMarkerRelationForToken
} from "../boundary/marker.js";
import { hasWeakPunctuationRelation } from "../boundary/punctuation.js";
import type { CaseParticleMarkerSurface } from "../boundary/relation.js";
import { nextNonSpaceIndex } from "../../clause-layout/trivia.js";

import { POS0, POS01, 助詞, 助詞_接続助詞, 助動詞_ジャ, 助動詞_ダ, 助動詞_デス, 助動詞_ヤ, 副詞, 補助記号, NOMINAL_BITS, pos0in, isNominalLike } from "../../../types/pos.js";

export type LexicalTailAbsorptionKind =
  | "embedded_juda"
  | "honorific_jusida"
  | "recipient_side_humble"
  | "request_absorption"
  | "causative_drop";

export interface PostVerbToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
  readonly reading?: string;
  readonly dictionaryFormReading?: string;
}

export interface BenefactiveContext {
  readonly recipientSideHumble?: boolean;
  readonly recipient_side_humble?: boolean;
}

export interface LexicalTailAbsorption {
  readonly kind: LexicalTailAbsorptionKind;
  readonly mainLemma?: string | null;
  readonly tailFamily?: string | null;
  readonly recipientSide?: boolean;
  readonly dropFirstCausativeAux?: boolean;
  readonly source?: string;
}
export const CONNECTIVE_SURFACES = new Set(["て", "で", "まして"]);
export const NODA_COPULA_POS4 = new Set([助動詞_ダ, 助動詞_デス, 助動詞_ジャ, 助動詞_ヤ]);

interface PostVerbTranslation {
  readonly korean: string;
  readonly koreanPos?: number;
  readonly dropFirstCausativeAux?: boolean;
  readonly senseFrame?: unknown;
  readonly senseFrames?: readonly unknown[];
}

interface PostVerbEntry {
  readonly dictionaryForm?: string;
  readonly dictionary_form?: string;
  readonly senses?: readonly PostVerbTranslation[];
}


function isPostVerbCaseParticle(
  tokens: readonly PostVerbToken[],
  index: number,
  surface: CaseParticleMarkerSurface,
  acceptedParticleSubtypes?: readonly string[]
): boolean {
  return isPostVerbCaseParticleToken(tokens[index], index, surface, acceptedParticleSubtypes);
}

function isPostVerbCaseParticleToken(
  token: PostVerbToken | undefined,
  index: number,
  surface: CaseParticleMarkerSurface,
  acceptedParticleSubtypes?: readonly string[]
): boolean {
  return caseParticleMarkerRelationForToken(token, index, {
    acceptedSurfaces: [surface],
    ...(acceptedParticleSubtypes === undefined ? {} : { acceptedParticleSubtypes }),
    consumers: ["postverb_chain"]
  }) !== null;
}

export function isConnector(token: PostVerbToken): boolean {
  return CONNECTIVE_SURFACES.has(token.surface) && (token.pos & POS01) === 助詞_接続助詞;
}

export function lexicalTailAbsorptionsFromEntry(
  entry: PostVerbEntry | null | undefined,
  koreanLemma: string,
  options: {
    readonly tailRole?: "benefactive" | "request" | null;
    readonly tailFamily?: string | null;
    readonly benefactiveContext?: BenefactiveContext | null;
  } = {}
): readonly LexicalTailAbsorption[] {
  const translation = selectedTranslationForLemma(entry, koreanLemma);
  if (translation === undefined) {
    return [];
  }
  const tailRole = options.tailRole ?? null;
  const tailFamily = options.tailFamily ?? null;
  const benefactiveContext = options.benefactiveContext ?? null;
  const absorptions: LexicalTailAbsorption[] = [];

  if (translation.dropFirstCausativeAux === true) {
    const requestTail = senseChainCondition(translation, "requestTail") ?? senseChainCondition(translation, "request_tail");
    const benefactiveTail = senseChainCondition(translation, "benefactiveTail") ?? senseChainCondition(translation, "benefactive_tail");
    const blocked = (tailRole === "request" && requestTail === false)
      || (tailRole === "benefactive" && benefactiveTail === false)
      || (tailRole === null && (requestTail === false || benefactiveTail === false));
    if (!blocked) {
      absorptions.push({
        kind: "causative_drop",
        mainLemma: koreanLemma,
        tailFamily,
        dropFirstCausativeAux: true,
        source: "selected_translation"
      });
    }
  }

  if (tailRole === "benefactive" && koreanLemma.endsWith("주다")) {
    const honorificFamilies = new Set(["te_itadaku", "te_itadaku_de", "te_itadakeru", "te_itadakeru_de", "te_kudasaru", "te_kudasaru_de"]);
    absorptions.push({
      kind: honorificFamilies.has(tailFamily ?? "") ? "honorific_jusida" : "embedded_juda",
      mainLemma: koreanLemma,
      tailFamily,
      source: "selected_translation"
    });
  }

  if (tailRole === "benefactive" && (benefactiveContext?.recipientSideHumble ?? benefactiveContext?.recipient_side_humble) === true) {
    absorptions.push({
      kind: "recipient_side_humble",
      mainLemma: koreanLemma,
      tailFamily,
      recipientSide: true,
      source: "selected_translation"
    });
  }

  if (tailRole === "request" && (koreanLemma.endsWith("주다") || koreanLemma.endsWith("드리다"))) {
    absorptions.push({
      kind: "request_absorption",
      mainLemma: koreanLemma,
      tailFamily,
      source: "selected_translation"
    });
  }

  return absorptions;
}

export function lexicalTailAbsorptionsDropCausative(absorptions: readonly LexicalTailAbsorption[]): boolean {
  return absorptions.some((absorption) => absorption.dropFirstCausativeAux === true);
}

export function nextAfterWeakBoundary(tokens: readonly PostVerbToken[], cursor: number, end = tokens.length): number | null {
  let index = (nextNonSpaceIndex(tokens, cursor, end) ?? end);
  if (
    index < end &&
    hasWeakPunctuationRelation(tokens[index], index, ["postverb_chain"])
  ) {
    index = (nextNonSpaceIndex(tokens, index + 1, end) ?? end);
  }
  return index < end ? index : null;
}

export function findTeEvaluationFollowerIndex(tokens: readonly PostVerbToken[], start: number, end: number, lookups: LookupTables): number | undefined {
  let cursor = nextAfterWeakBoundary(tokens, start, end);
  while (cursor !== null && cursor < end) {
    const token = tokens[cursor];
    if (token === undefined) {
      return undefined;
    }
    const surface = token.surface;
    if (lookups.TE_EVALUATION_FOLLOWERS.has(token.dictionaryForm || token.surface)) {
      return cursor;
    }
    if ((token.pos & POS0) === 補助記号) {
      if (hasWeakPunctuationRelation(token, cursor, ["postverb_chain"])) {
        cursor = (nextNonSpaceIndex(tokens, cursor + 1, end) ?? end);
        continue;
      }
      return undefined;
    }
    if ((token.pos & POS0) === 副詞) {
      cursor = nextAfterWeakBoundary(tokens, cursor + 1, end);
      continue;
    }
    if (pos0in(token.pos, NOMINAL_BITS)) {
      const particleIdx = (nextNonSpaceIndex(tokens, cursor + 1, end) ?? end);
      const particle = tokens[particleIdx];
      if (particle !== undefined && (particle.pos & POS0) === 助詞 && ["は", "も", "が", "なら", "でも"].includes(particle.surface)) {
        cursor = nextAfterWeakBoundary(tokens, particleIdx + 1, end);
        continue;
      }
      if (isPostVerbCaseParticleToken(particle, particleIdx, "に")) {
        const afterParticle = nextAfterWeakBoundary(tokens, particleIdx + 1, end);
        if (afterParticle !== null && afterParticle < end && isEvaluationOrAdverbForPostVerb(tokens[afterParticle], lookups)) {
          cursor = afterParticle;
          continue;
        }
      }
      let chunkEnd = nextAfterWeakBoundary(tokens, cursor + 1, end);
      while (chunkEnd !== null && chunkEnd < end && isWeakEvaluationPhraseToken(tokens[chunkEnd])) {
        chunkEnd = nextAfterWeakBoundary(tokens, chunkEnd + 1, end);
      }
      if (chunkEnd !== null && chunkEnd < end) {
        if (isEvaluationOrAdverbForPostVerb(tokens[chunkEnd], lookups)) {
          cursor = chunkEnd;
          continue;
        }
        if ((tokens[chunkEnd]!.pos & POS0) === 助詞 && ["は", "も", "が"].includes(tokens[chunkEnd]?.surface ?? "")) {
          cursor = nextAfterWeakBoundary(tokens, chunkEnd + 1, end);
          continue;
        }
        if (isPostVerbCaseParticle(tokens, chunkEnd, "に")) {
          const afterParticle = nextAfterWeakBoundary(tokens, chunkEnd + 1, end);
          if (afterParticle !== null && isEvaluationOrAdverbForPostVerb(tokens[afterParticle], lookups)) {
            cursor = afterParticle;
            continue;
          }
        }
      }
      const nextIdx = nextAfterWeakBoundary(tokens, cursor + 1, end);
      if (nextIdx !== null && isEvaluationOrAdverbForPostVerb(tokens[nextIdx], lookups)) {
        cursor = nextIdx;
        continue;
      }
      return undefined;
    }
    if ((token.pos & POS0) === 助詞 && ["は", "も", "が"].includes(surface)) {
      cursor = nextAfterWeakBoundary(tokens, cursor + 1, end);
      continue;
    }
    return undefined;
  }
  return undefined;
}

function isEvaluationOrAdverbForPostVerb(token: PostVerbToken | undefined, lookups: LookupTables): boolean {
  return token !== undefined && (lookups.TE_EVALUATION_FOLLOWERS.has(token.dictionaryForm || token.surface) || (token.pos & POS0) === 副詞);
}

function isWeakEvaluationPhraseToken(token: PostVerbToken | undefined): boolean {
  return token !== undefined && isNominalLike(token);
}


function selectedTranslationForLemma(entry: PostVerbEntry | null | undefined, koreanLemma: string): PostVerbTranslation | undefined {
  return (entry?.senses ?? []).find((translation) => translation.korean === koreanLemma);
}

function senseFrames(translation: PostVerbTranslation | undefined): readonly unknown[] {
  if (translation === undefined) {
    return [];
  }
  if (Array.isArray(translation.senseFrames)) {
    return translation.senseFrames;
  }
  return [translation.senseFrame].filter((frame) => frame !== undefined && frame !== null);
}

function senseChainCondition(translation: PostVerbTranslation | undefined, key: string): boolean | undefined {
  for (const frame of senseFrames(translation)) {
    if (typeof frame !== "object" || frame === null || Array.isArray(frame)) {
      continue;
    }
    const chain = (frame as { readonly chainConditions?: Record<string, unknown>; readonly chain_conditions?: Record<string, unknown> }).chainConditions ??
      (frame as { readonly chain_conditions?: Record<string, unknown> }).chain_conditions;
    const value = chain?.[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}
