import type { IrregularType } from "../../generator/conjugator.js";
import type { MatcherToken } from "../matchers.js";
import {
  getReferentIndexBeforeParticle,
  getReferentTokenBeforeParticle,
  isAnimateReferentToken,
  isPersonByContext,
  PredicateArgument,
  PredicateArgumentView
} from "./helpers.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import type { LookupTables } from "../lookup-tables.js";


import { isNaAdjCapable, isVerbRenyouPredicateToken, POS0, 助詞, 接尾辞, 동사 } from "../../types/pos.js";
export const HonorificLevel = {
  NONE: "none",
  RESPECT: "respect"
} as const;

export type HonorificLevel = typeof HonorificLevel[keyof typeof HonorificLevel];

export type HonorificToken = MatcherToken;

export class BenefactiveContext {
  readonly patternId: string | null;
  readonly needsBenefactivePivot: boolean;
  readonly agentParticleIdx: number | null;
  readonly recipientParticleIdx: number | null;
  readonly honorificLevel: HonorificLevel;
  readonly recipientSideHumble: boolean;
  readonly causativeAgentPolicy: "benefactive_agent_subject" | "lexical_argument_preferred" | null;

  constructor(options: {
    readonly patternId?: string | null;
    readonly needsBenefactivePivot?: boolean;
    readonly agentParticleIdx?: number | null;
    readonly recipientParticleIdx?: number | null;
    readonly honorificLevel?: HonorificLevel;
    readonly recipientSideHumble?: boolean;
    readonly causativeAgentPolicy?: "benefactive_agent_subject" | "lexical_argument_preferred" | null;
  } = {}) {
    this.patternId = options.patternId ?? null;
    this.needsBenefactivePivot = options.needsBenefactivePivot ?? false;
    this.agentParticleIdx = options.agentParticleIdx ?? null;
    this.recipientParticleIdx = options.recipientParticleIdx ?? null;
    this.honorificLevel = options.honorificLevel ?? HonorificLevel.NONE;
    this.recipientSideHumble = options.recipientSideHumble ?? false;
    this.causativeAgentPolicy = options.causativeAgentPolicy ?? null;
    Object.freeze(this);
  }
}

const BEN_MORAU = new Set(["te_morau", "te_morau_de"]);
const BEN_ITADAKU = new Set(["te_itadaku", "te_itadaku_de"]);
const BEN_MORAERU = new Set(["te_moraeru", "te_moraeru_de"]);
const BEN_ITADAKERU = new Set(["te_itadakeru", "te_itadakeru_de"]);
const BEN_KUDASARU = new Set(["te_kudasaru", "te_kudasaru_de"]);
const RECIPIENT_NI_BENEFACTIVE_VERBS = new Set(["見せる"]);

export function buildBenefactiveContext(
  _tokens: readonly HonorificToken[],
  _predicateStart: number,
  patternId: string | null,
  _lookups: LookupTables
): BenefactiveContext {
  if (patternId === null) {
    return new BenefactiveContext();
  }

  if (!isBenefactivePattern(patternId)) {
    return new BenefactiveContext({ patternId });
  }

  return new BenefactiveContext({
    patternId,
    needsBenefactivePivot: benefactivePatternNeedsPivot(patternId),
    honorificLevel: intrinsicBenefactiveHonorificLevel(patternId)
  });
}

export function hydrateBenefactiveContextFromLayout(
  tokens: readonly HonorificToken[],
  predicateStart: number,
  patternId: string | null,
  lookups: LookupTables,
  options: {
    readonly layout: ClauseLayout;
    readonly connectiveRoles?: ReadonlyMap<number, string> | null;
    readonly includeBorrowed?: boolean;
  }
): BenefactiveContext {
  const base = buildBenefactiveContext(tokens, predicateStart, patternId, lookups);
  if (patternId === null || !isBenefactivePattern(patternId)) {
    return base;
  }

  const view = new PredicateArgumentView(tokens, predicateStart, {
    lookups,
    layout: options.layout,
    connectiveRoles: options.connectiveRoles ?? null
  });
  const args = view.arguments({ includeBorrowed: options.includeBorrowed ?? false });
  let agentParticleIdx = findBenefactiveAgentParticleIdx(args, tokens, lookups);
  const recipientNiIdx = findOwnedParticleIdxForSurface(args, "に");
  let recipientSideHumble: boolean;
  if (
    recipientNiIdx !== null &&
    (BEN_ITADAKU.has(patternId) || BEN_ITADAKERU.has(patternId)) &&
    RECIPIENT_NI_BENEFACTIVE_VERBS.has(tokenAt(tokens, predicateStart).dictionaryForm)
  ) {
    if (agentParticleIdx === recipientNiIdx) {
      agentParticleIdx = null;
    }
    recipientSideHumble = true;
  } else {
    recipientSideHumble = false;
  }
  if (agentParticleIdx !== null) {
    const referent = getReferentTokenBeforeParticle(tokens, agentParticleIdx, lookups);
    if (referent !== null && isFirstPersonReferent(referent, lookups)) {
      agentParticleIdx = null;
    }
  }

  const recipientParticleIdx = base.needsBenefactivePivot && agentParticleIdx !== null
    ? findFirstPersonTopicParticleIdx(args, lookups)
    : null;

  let honorificLevel: HonorificLevel;
  if (BEN_ITADAKU.has(patternId) || BEN_ITADAKERU.has(patternId) || BEN_KUDASARU.has(patternId)) {
    honorificLevel = HonorificLevel.RESPECT;
  } else if (agentParticleIdx !== null) {
    const referent = getReferentTokenBeforeParticle(tokens, agentParticleIdx, lookups);
    honorificLevel = referent !== null && isRespectReferent(referent, lookups) ? HonorificLevel.RESPECT : HonorificLevel.NONE;
  } else {
    honorificLevel = HonorificLevel.NONE;
  }

  return new BenefactiveContext({
    patternId,
    needsBenefactivePivot: base.needsBenefactivePivot,
    agentParticleIdx,
    recipientParticleIdx,
    honorificLevel,
    recipientSideHumble
  });
}

export function resolveBenefactiveTail(
  patternId: string,
  tailLemma: string | null | undefined,
  tailIrregular: IrregularType | null | undefined,
  tailKoreanPos: number,
  benefactive: BenefactiveContext | null | undefined
): readonly [tailLemma: string | null, tailIrregular: IrregularType | null, tailKoreanPos: number] {
  if (tailLemma == null) {
    return [tailLemma ?? null, tailIrregular ?? null, tailKoreanPos];
  }
  if (benefactive == null) {
    return [tailLemma, tailIrregular ?? null, tailKoreanPos];
  }

  if (isBenefactivePattern(patternId)) {
    const resolved = benefactive.honorificLevel === HonorificLevel.RESPECT ? "주시다" : "주다";
    return [resolved, null, 동사];
  }

  return [tailLemma, tailIrregular ?? null, tailKoreanPos];
}

function findBenefactiveAgentParticleIdx(
  args: readonly PredicateArgument[],
  tokens: readonly HonorificToken[],
  lookups: LookupTables
): number | null {
  const niIdx = findAgentParticleIdxForSurface(args, tokens, "に", lookups);
  if (niIdx !== null) {
    return niIdx;
  }
  return findAgentParticleIdxForSurface(args, tokens, "から", lookups);
}

function findAgentParticleIdxForSurface(
  args: readonly PredicateArgument[],
  tokens: readonly HonorificToken[],
  surface: string,
  lookups: LookupTables
): number | null {
  const candidates = [...args]
    .filter((arg) => !arg.borrowed && arg.particle.surface === surface && (arg.particle.pos & POS0) === 助詞)
    .sort((left, right) => right.particleIdx - left.particleIdx);
  for (const arg of candidates) {
    const idx = arg.particleIdx;
    const referent = arg.referent ?? getReferentTokenBeforeParticle(tokens, idx, lookups);
    if (referent === null) {
      continue;
    }
    if (isAnimateReferentToken(referent, lookups) || isPersonByContext(tokens, idx, lookups)) {
      return idx;
    }
  }
  return null;
}

function findOwnedParticleIdxForSurface(args: readonly PredicateArgument[], surface: string): number | null {
  return [...args]
    .filter((arg) => !arg.borrowed && arg.particle.surface === surface && (arg.particle.pos & POS0) === 助詞)
    .sort((left, right) => right.particleIdx - left.particleIdx)[0]?.particleIdx ?? null;
}

function findFirstPersonTopicParticleIdx(args: readonly PredicateArgument[], lookups: LookupTables): number | null {
  const candidates = [...args]
    .filter((arg) => !arg.borrowed && (arg.particle.surface === "は" || arg.particle.surface === "も") && (arg.particle.pos & POS0) === 助詞)
    .sort((left, right) => right.particleIdx - left.particleIdx);
  for (const arg of candidates) {
    const referent = arg.referent;
    if (referent !== null && isFirstPersonReferent(referent, lookups)) {
      return arg.particleIdx;
    }
  }
  return null;
}

function isFirstPersonReferent(token: HonorificToken, lookups: LookupTables): boolean {
  const forms = new Set([token.dictionaryForm, token.surface]);
  return [...forms].some((form) => lookups.HONORIFIC_FIRST_PERSON_PRONOUNS.has(form));
}

function isRespectReferent(token: HonorificToken, lookups: LookupTables): boolean {
  if (isFirstPersonReferent(token, lookups)) {
    return false;
  }

  const forms = new Set([token.dictionaryForm, token.surface]);
  if (
    isNaAdjCapable(token) ||
    [...forms].some((form) =>
      [...lookups.HONORIFIC_NON_HONORIFIC_YOU_SUFFIX_LEXEMES].some((lexeme) => form.endsWith(lexeme))
    ) ||
    [token.reading, token.dictionaryFormReading].some((reading) =>
      typeof reading === "string" &&
      [...lookups.HONORIFIC_NON_HONORIFIC_YOU_READING_SUFFIXES].some((suffix) => reading.endsWith(suffix))
    )
  ) {
    return false;
  }
  if ([...forms].some((form) => lookups.HONORIFIC_RESPECT_TITLES.has(form))) {
    return true;
  }
  return [...forms].some((form) =>
    [...lookups.HONORIFIC_RESPECT_SUFFIXES].some((suffix) => form.endsWith(suffix))
  );
}

export function isRespectReferentToken(token: HonorificToken | null, lookups: LookupTables): boolean {
  if (token === null) {
    return false;
  }
  return isRespectReferent(token, lookups);
}

export function isRespectReferentBeforeParticle(
  tokens: readonly HonorificToken[],
  particleIdx: number,
  lookups: LookupTables
): boolean {
  const referentIdx = getReferentIndexBeforeParticle(tokens, particleIdx, lookups);
  if (referentIdx === null) return false;
  const referent = tokens[referentIdx];
  if (referent === undefined) return false;
  const previous = tokens[referentIdx - 1];
  const productiveRenyouSama =
    (referent.pos & POS0) === 接尾辞 &&
    [referent.dictionaryForm, referent.surface].some((form) => lookups.HONORIFIC_RESPECT_SUFFIXES.has(form)) &&
    previous !== undefined && isVerbRenyouPredicateToken(previous);
  return !productiveRenyouSama && isRespectReferent(referent, lookups);
}

export function hasRespectSubjectSignal(
  subjects: readonly PredicateArgument[],
  tokens: readonly HonorificToken[],
  lookups: LookupTables
): boolean {
  return subjects.some(({ particleIdx }) => isRespectReferentBeforeParticle(tokens, particleIdx, lookups));
}

function isBenefactivePattern(patternId: string): boolean {
  return (
    BEN_MORAU.has(patternId) ||
    BEN_ITADAKU.has(patternId) ||
    BEN_MORAERU.has(patternId) ||
    BEN_ITADAKERU.has(patternId) ||
    BEN_KUDASARU.has(patternId)
  );
}

function benefactivePatternNeedsPivot(patternId: string): boolean {
  return BEN_MORAU.has(patternId) ||
    BEN_ITADAKU.has(patternId) ||
    BEN_MORAERU.has(patternId) ||
    BEN_ITADAKERU.has(patternId);
}

function intrinsicBenefactiveHonorificLevel(patternId: string): HonorificLevel {
  return BEN_ITADAKU.has(patternId) || BEN_ITADAKERU.has(patternId) || BEN_KUDASARU.has(patternId)
    ? HonorificLevel.RESPECT
    : HonorificLevel.NONE;
}

function tokenAt(tokens: readonly HonorificToken[], idx: number): HonorificToken {
  const resolvedIdx = idx < 0 ? tokens.length + idx : idx;
  const token = tokens[resolvedIdx];
  if (token === undefined) {
    throw new RangeError("list index out of range");
  }
  return token;
}
