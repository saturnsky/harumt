import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { buildProtoLayout } from "../clause-layout/index.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { isWeakPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import { TokenCursor } from "../token-cursor.js";


import { isLexicalPureNaAdjStem, isTariNaAdjStem } from "../../types/pos.js";
import { quoteHostMatchAfterMarker } from "../quote/host-taxonomy.js";
import { tokaTteCompositeQuoteCandidateAt } from "../head-tail/boundary/quote-marker.js";
import { kaOwnershipKindBeforeAcknowledgmentAt } from "../head-tail/boundary/ka-ownership.js";
import { morphSurface } from "../../types/token.js";
import { isKana } from "../../utils/char-class.js";

export function adverbialToCapableKeijoujiHost(token: { readonly pos: number; readonly surface: string } | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if (isTariNaAdjStem(token)) {
    return true;
  }
  return isKanaAbabMimeticKeijoujiHost(token);
}

export function isKanaAbabMimeticKeijoujiHost(
  token: { readonly pos: number; readonly surface: string } | undefined
): boolean {
  if (token === undefined) {
    return false;
  }
  return isLexicalPureNaAdjStem(token) && isReduplicatedSurface(morphSurface(token));
}

function isReduplicatedSurface(surface: string): boolean {
  const chars = [...surface];
  if (chars.length < 4 || chars.length % 2 !== 0) {
    return false;
  }
  const half = chars.length / 2;
  for (let i = 0; i < chars.length; i += 1) {
    if (!isKana(chars[i]!)) {
      return false;
    }
  }
  for (let i = 0; i < half; i += 1) {
    if (chars[i] !== chars[i + half]) {
      return false;
    }
  }
  return true;
}


export interface TariKeijoujiAdverbialToEvidence {
  readonly previousIdx: number;
  readonly markerIdx: number;
  readonly followingPredicateIdx: number;
}

export function tariKeijoujiAdverbialToEvidence(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: {
    readonly followingPredicateIdx?: number | null;
    readonly followingPredicateIdxIsProjectionEvidence?: boolean;
    readonly allowProtoFollowingPredicateEvidence?: boolean;
    readonly allowBuildProtoFollowingPredicateEvidence?: boolean;
    readonly lookups: LookupTables;
  }
): TariKeijoujiAdverbialToEvidence | null {
  const { tokens, pos: markerIdx, end: limit } = cursor;
  if (markerIdx < 0 || markerIdx >= limit) {
    return null;
  }
  const marker = tokens[markerIdx];
  if (caseParticleMarkerRelationForToken(marker, markerIdx, {
    acceptedSurfaces: ["と"],
    consumers: ["connective_helpers"]
  }) === null) {
    return null;
  }
  const previousIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (previousIdx === null) {
    return null;
  }
  const previous = tokens[previousIdx];
  if (previous === undefined || !adverbialToCapableKeijoujiHost(previous)) {
    return null;
  }
  if (compositeQuoteOrListingMarkerHeadAt(cursor, options.lookups)) {
    return null;
  }
  const nextIdx = nextNonSpaceNonWeakPunctuationTokenIndex(cursor.fork(markerIdx + 1, limit));
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (
    next?.dictionaryForm === "なる" ||
    next?.dictionaryForm === "する" ||
    next?.dictionaryForm === "だ" ||
    next?.dictionaryForm === "です"
  ) {
    return null;
  }
  if (
    nextIdx !== null &&
    !isTariNaAdjStem(previous) &&
    quoteHostMatchAfterMarker(cursor.fork(markerIdx, limit, markerIdx), options.lookups, {
      searchEnd: Math.min(nextIdx + 2, limit)
    }) !== null
  ) {
    return null;
  }
  const suppliedFollowingPredicateIdx = options.followingPredicateIdxIsProjectionEvidence === true
    ? options.followingPredicateIdx ?? null
    : null;
  const followingPredicateIdx = suppliedFollowingPredicateIdx ??
    (options.allowProtoFollowingPredicateEvidence === true
      ? protoFollowingPredicateIndex(cursor, {
        allowBuildProto: options.allowBuildProtoFollowingPredicateEvidence === true,
        lookups: options.lookups
      })
      : null);
  if (followingPredicateIdx == null || followingPredicateIdx <= markerIdx || followingPredicateIdx >= limit) {
    return null;
  }
  const predicateIdx: number = followingPredicateIdx;
  return { previousIdx, markerIdx, followingPredicateIdx: predicateIdx };
}

function compositeQuoteOrListingMarkerHeadAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const { tokens, pos: markerIdx } = cursor;
  if (tokaTteCompositeQuoteCandidateAt(tokens, markerIdx, {
    consumers: ["connective_helpers"]
  }) !== null) {
    return true;
  }
  const kaIdx = nextNonSpaceIndex(tokens, markerIdx + 1);
  return kaIdx !== null &&
    kaOwnershipKindBeforeAcknowledgmentAt(tokens, kaIdx, lookups) === "toka_listing";
}

function protoFollowingPredicateIndex(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: { readonly allowBuildProto: boolean; readonly lookups: LookupTables }
): number | null {
  const { tokens, pos: markerIdx, end: limit } = cursor;
  const proto = activeProtoLayout() ??
    (options.allowBuildProto ? buildProtoLayout(tokens, options.lookups) : null);
  return proto?.followingPredicateEvidenceIndexAfter(tokens, markerIdx, {
    limit,
    includeAuxiliary: false
  }) ?? null;
}

function nextNonSpaceNonWeakPunctuationTokenIndex(
  cursor: TokenCursor<RuntimeHaruToken>
): number | null {
  for (let i = cursor.pos; i < cursor.end; i += 1) {
    const token = cursor.tokens[i];
    if (token === undefined || isWeakPunctuationToken(token)) {
      continue;
    }
    return i;
  }
  return null;
}
