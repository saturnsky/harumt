
import type { LookupTables } from "../lookup-tables.js";
import { isClauseSpaceOrAdverbToken, previousTransparentEvidenceIndex } from "../clause-layout/trivia.js";
import { caseParticleMarkerRelationForToken, nominalLinkMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { getReferentTokenBeforeParticle } from "./helpers.js";

import { POS0, POS01, POS4, 記号, 助詞_格助詞, 助詞_係助詞, 助詞_副助詞, 助動詞, 助動詞_ダ, 接尾辞, 補助記号, 名詞 } from "../../types/pos.js";
export interface DekiruToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

export class DekiruReferentMatch {
  constructor(
    readonly referent: DekiruToken | null,
    readonly bareCompound: boolean,
    readonly markerIdx: number | null = null
  ) { }
}

const _dekiruAllBucketNounsCache = new WeakMap<LookupTables, ReadonlySet<string>>();
function getDekiruAllBucketNouns(lookups: LookupTables): ReadonlySet<string> {
  let cached = _dekiruAllBucketNounsCache.get(lookups);
  if (cached === undefined) {
    cached = new Set([
      ...lookups.DEKIRU_ABILITY_NOUNS,
      ...lookups.DEKIRU_POSSIBILITY_NOUNS,
      ...lookups.DEKIRU_COMPLETION_STRONG_NOUNS,
      ...lookups.DEKIRU_COMPLETION_DO_NOUNS,
      ...lookups.DEKIRU_COMPLETION_AMBIGUOUS_NOUNS,
      ...lookups.DEKIRU_EMERGENCE_NOUNS
    ]);
    _dekiruAllBucketNounsCache.set(lookups, cached);
  }
  return cached;
}

function findBareCompoundReferentToken(
  tokens: readonly DekiruToken[],
  predIdx: number,
  options: { readonly scanStart: number; readonly lookups: LookupTables }
): DekiruToken | null {
  const index = predIdx - 1;
  if (index < options.scanStart) {
    return null;
  }
  const token = tokens[index];
  const pos0 = (token?.pos ?? 0) & POS0;
  if (token === undefined || pos0 !== 名詞) {
    return null;
  }
  const form = token.dictionaryForm || token.surface;
  if (!getDekiruAllBucketNouns(options.lookups).has(form)) {
    return null;
  }
  return token;
}

export function findDekiruReferent(
  tokens: readonly DekiruToken[],
  predIdx: number,
  options: {
    readonly scanStart: number;
    readonly lookups: LookupTables;
    readonly gaNoConverted?: (particleIdx: number) => boolean;
  }
): DekiruReferentMatch {
  if (predIdx <= options.scanStart) {
    return new DekiruReferentMatch(null, false);
  }
  let particlePos: number | null = null;
  let topicMarker = false;
  let index = predIdx - 1;
  while (index >= options.scanStart) {
    const evidence = previousTransparentEvidenceIndex(tokens, index + 1, {
      lowerBoundInclusive: options.scanStart,
      isTransparentToken: isClauseSpaceOrAdverbToken
    });
    if (evidence === null) {
      break;
    }
    index = evidence.index;
    const token = tokens[index];
    const tpos = token?.pos ?? 0;
    const tpos0 = tpos & POS0;
    const tpos01 = tpos & POS01;
    const tpos4 = tpos & POS4;
    if (tpos0 === 補助記号 || tpos0 === 記号) {
      break;
    }
    if (tpos01 === 助詞_格助詞 && token?.surface === "が") {
      particlePos = index;
      break;
    }
    if (tpos01 === 助詞_格助詞 && token?.surface === "の") {
      if (options.gaNoConverted !== undefined && !options.gaNoConverted(index)) {
        break;
      }
      particlePos = index;
      break;
    }
    if (tpos01 === 助詞_係助詞 && (token?.surface === "は" || token?.surface === "も")) {
      particlePos = index;
      topicMarker = true;
      break;
    }
    if (tpos0 === 助動詞 && token?.dictionaryForm === "だ" && tpos4 === 助動詞_ダ && token.surface === "なら") {
      particlePos = index;
      topicMarker = true;
      break;
    }
    break;
  }

  if (particlePos === null) {
    const bare = findBareCompoundReferentToken(tokens, predIdx, options);
    return new DekiruReferentMatch(bare, bare !== null);
  }
  if (topicMarker && isObliqueCaseChain(tokens, particlePos, options.lookups)) {
    return new DekiruReferentMatch(null, false);
  }
  const referent = getReferentTokenBeforeParticle(tokens, particlePos, options.lookups);
  return new DekiruReferentMatch(referent, false, referent === null ? null : particlePos);
}

function isObliqueCaseChain(tokens: readonly DekiruToken[], particlePos: number, lookups: LookupTables): boolean {
  let index = particlePos - 1;
  while (index >= 0) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    if (isPluralSuffixToken(token, lookups)) {
      index -= 1;
      continue;
    }
    const tpos01 = token.pos & POS01;
    if (tpos01 === 助詞_副助詞) {
      index -= 1;
      continue;
    }
    return caseParticleMarkerRelationForToken(token, index, {
      consumers: ["predicate_helpers"]
    }) !== null &&
      nominalLinkMarkerRelationForToken(token, index, {
        consumers: ["predicate_helpers"]
      }) === null;
  }
  return false;
}

function isPluralSuffixToken(token: DekiruToken, lookups: LookupTables): boolean {
  return (token.pos & POS0) === 接尾辞 && lookups.PLURAL_SUFFIXES.has(token.dictionaryForm);
}
